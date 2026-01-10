
import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Verifica se o identificador é um LID (Linked ID) do WhatsApp.
     */
    isLid: (id: string) => {
        if (!id) return false;
        const clean = id.split('@')[0].replace(/\D/g, '');
        // LIDs de dispositivos pareados costumam ser muito longos (15+ dígitos)
        return clean.length > 13;
    },

    /**
     * Normaliza um número para formato E.164 brasileiro
     */
    normalizeNumber: (phone: string) => {
        if (!phone) return '';
        let clean = phone.split('@')[0].replace(/\D/g, '');
        if (clean.length >= 10 && clean.length <= 11 && !clean.startsWith('55')) {
            clean = '55' + clean;
        }
        return clean;
    },

    /**
     * Busca informações do contato no CRM
     */
    findContactInCrm: async (identifier: string, pushName?: string) => {
        const cleanId = identifier.split('@')[0];
        
        // 1. Se parece um número real, busca por variações de 9º dígito
        if (!whatsappService.isLid(cleanId) && cleanId.length <= 13) {
            const normalized = whatsappService.normalizeNumber(cleanId);
            const ddd = normalized.slice(2, 4);
            const rest = normalized.slice(4);
            const variations = [normalized];
            
            if (normalized.length === 13 && rest.startsWith('9')) variations.push('55' + ddd + rest.slice(1));
            else if (normalized.length === 12) variations.push('55' + ddd + '9' + rest);

            const { data: contact } = await appBackend.client
                .from('crm_deals')
                .select('contact_name, company_name, phone, email')
                .or(`phone.in.(${variations.map(v => `"${v}"`).join(',')})`)
                .maybeSingle();
            
            if (contact) return { name: contact.company_name || contact.contact_name, phone: contact.phone, role: 'Cliente/Lead', detail: contact.email };
        }

        // 2. Tenta pelo nome do perfil (PushName)
        if (pushName && pushName.length > 2) {
            const { data: contactByPush } = await appBackend.client
                .from('crm_deals')
                .select('contact_name, company_name, phone, email')
                .or(`contact_name.ilike.%${pushName}%,company_name.ilike.%${pushName}%`)
                .limit(1)
                .maybeSingle();
            
            if (contactByPush) return { 
                name: contactByPush.company_name || contactByPush.contact_name, 
                phone: contactByPush.phone, 
                role: 'CRM Match', 
                detail: contactByPush.email 
            };
        }

        return null;
    },

    /**
     * Garante a criação ou retorno de um chat unificado
     */
    getOrCreateChat: async (waId: string, pushName: string, actualNumberFromWebhook?: string) => {
        const cleanId = waId.split('@')[0];
        
        // 1. Já existe esse ID EXATO?
        const { data: existingChat } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', cleanId)
            .maybeSingle();

        if (existingChat) {
            // Se o chat existe mas não tem o telefone real salvo, tentamos buscar no CRM para preencher
            if (!existingChat.contact_phone || whatsappService.isLid(existingChat.contact_phone)) {
                const contact = await whatsappService.findContactInCrm(actualNumberFromWebhook || cleanId, pushName);
                if (contact?.phone) {
                    await appBackend.client.from('crm_whatsapp_chats').update({ 
                        contact_phone: whatsappService.normalizeNumber(contact.phone),
                        contact_name: contact.name 
                    }).eq('id', existingChat.id);
                }
            }
            return existingChat;
        }

        // 2. Se for um LID, tenta buscar um chat antigo pelo TELEFONE REAL ou CRM
        const contact = await whatsappService.findContactInCrm(actualNumberFromWebhook || cleanId, pushName);
        const finalPhone = contact?.phone ? whatsappService.normalizeNumber(contact.phone) : (whatsappService.isLid(cleanId) ? null : cleanId);

        if (finalPhone) {
            const { data: oldChatByPhone } = await appBackend.client
                .from('crm_whatsapp_chats')
                .select('*')
                .eq('contact_phone', finalPhone)
                .maybeSingle();

            if (oldChatByPhone) {
                // UNIFICAÇÃO: Atualiza o wa_id (LID) do chat que já tem o telefone real
                const { data: merged } = await appBackend.client
                    .from('crm_whatsapp_chats')
                    .update({ 
                        wa_id: cleanId, 
                        contact_name: contact?.name || oldChatByPhone.contact_name || pushName
                    })
                    .eq('id', oldChatByPhone.id)
                    .select()
                    .single();
                
                return merged;
            }
        }

        // 3. Novo contato
        const { data: newChat, error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .insert([{
                wa_id: cleanId,
                contact_name: contact?.name || pushName || cleanId,
                contact_phone: finalPhone,
                status: 'open',
                last_message: 'Iniciando...'
            }])
            .select()
            .single();
        
        if (error) throw error;
        return newChat;
    },

    /**
     * Envio robusto: Se wa_id for LID, tenta o contact_phone. 
     * Se falhar, tenta buscar o telefone no CRM em tempo real antes de desistir.
     */
    sendTextMessage: async (chat: any, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        if (!config) throw new Error("WhatsApp não configurado.");

        let target = chat.contact_phone;
        
        // Se não temos o telefone real salvo ou se o salvo parece ser um LID
        if (!target || whatsappService.isLid(target)) {
            // Última tentativa: Buscar no CRM antes de enviar
            const contact = await whatsappService.findContactInCrm(chat.wa_id, chat.contact_name);
            if (contact?.phone) {
                target = whatsappService.normalizeNumber(contact.phone);
                // Salva para as próximas vezes
                await appBackend.client.from('crm_whatsapp_chats').update({ contact_phone: target }).eq('id', chat.id);
            } else {
                // Se não achou no CRM e o ID original é um LID, a Evolution vai dar erro
                if (whatsappService.isLid(chat.wa_id)) {
                    throw new Error("Não foi possível localizar o número de telefone real para este ID de dispositivo (LID).");
                }
                target = chat.wa_id;
            }
        }

        const baseUrl = config.instanceUrl.replace(/\/$/, "");
        const url = `${baseUrl}/message/sendText/${config.instanceName.trim()}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': config.apiKey.trim(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                number: target,
                options: { delay: 1000, presence: "composing" },
                text: text
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Erro na API Evolution");
        return data;
    },

    syncMessage: async (chatId: string, text: string, senderType: 'user' | 'agent' | 'system', waMessageId?: string) => {
        const { data, error } = await appBackend.client
            .from('crm_whatsapp_messages')
            .insert([{
                chat_id: chatId,
                text,
                sender_type: senderType,
                wa_message_id: waMessageId,
                status: 'sent'
            }])
            .select()
            .single();
        
        if (error) throw error;

        await appBackend.client
            .from('crm_whatsapp_chats')
            .update({ last_message: text, updated_at: new Date().toISOString() })
            .eq('id', chatId);

        return data;
    }
};

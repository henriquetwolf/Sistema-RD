
import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Verifica se o identificador é um LID (Linked ID) do WhatsApp.
     * LIDs geralmente têm mais de 13 dígitos e começam com identificadores técnicos.
     */
    isLid: (id: string) => {
        const clean = id.split('@')[0].replace(/\D/g, '');
        return clean.length > 13;
    },

    /**
     * Normaliza um número para formato E.164 brasileiro (55 + DDD + Numero)
     */
    normalizeNumber: (phone: string) => {
        if (!phone) return '';
        let clean = phone.split('@')[0].replace(/\D/g, '');
        
        // Se for número brasileiro (sem DDI) e tiver 10 ou 11 dígitos, adiciona o 55
        if (clean.length >= 10 && clean.length <= 11 && !clean.startsWith('55')) {
            clean = '55' + clean;
        }
        return clean;
    },

    /**
     * Gera variações de números brasileiros para busca (com e sem o 9º dígito)
     */
    getPhoneVariations: (phone: string) => {
        const normalized = whatsappService.normalizeNumber(phone);
        if (!normalized || whatsappService.isLid(normalized) || normalized.length < 10) return [normalized];
        
        const variations = [normalized];
        if (normalized.startsWith('55') && (normalized.length === 12 || normalized.length === 13)) {
            const ddd = normalized.slice(2, 4);
            const rest = normalized.slice(4);

            if (normalized.length === 13 && rest.startsWith('9')) {
                // Tem o 9, gera a versão sem o 9
                variations.push('55' + ddd + rest.slice(1));
            } else if (normalized.length === 12) {
                // Não tem o 9, gera a versão com o 9
                variations.push('55' + ddd + '9' + rest);
            }
        }
        return variations;
    },

    /**
     * Busca informações do contato no CRM
     */
    findContactInCrm: async (identifier: string, pushName?: string) => {
        const cleanId = identifier.split('@')[0];
        
        // Se parece um número real, busca por variações
        if (!whatsappService.isLid(cleanId) && cleanId.length <= 13) {
            const variations = whatsappService.getPhoneVariations(cleanId);
            const { data: contact } = await appBackend.client
                .from('crm_deals')
                .select('contact_name, company_name, phone, email')
                .or(`phone.in.(${variations.map(v => `"${v}"`).join(',')})`)
                .maybeSingle();
            
            if (contact) return { name: contact.company_name || contact.contact_name, phone: contact.phone, role: 'Cliente/Lead', detail: contact.email };
        }

        // Se for um LID ou não achou pelo número, tenta pelo nome do perfil
        if (pushName && pushName.length > 2) {
            const { data: contactByPush } = await appBackend.client
                .from('crm_deals')
                .select('contact_name, company_name, phone')
                .or(`contact_name.ilike.%${pushName}%,company_name.ilike.%${pushName}%`)
                .limit(1)
                .maybeSingle();
            
            if (contactByPush) return { name: contactByPush.company_name || contactByPush.contact_name, phone: contactByPush.phone, role: 'CRM Match', detail: 'Identificado via Nome' };
        }

        return null;
    },

    /**
     * Garante a criação ou retorno de um chat unificado
     */
    getOrCreateChat: async (waId: string, pushName: string, actualNumber?: string) => {
        const cleanId = waId.split('@')[0];
        const normalizedActual = actualNumber ? whatsappService.normalizeNumber(actualNumber) : null;

        // 1. Já existe esse ID EXATO?
        const { data: existingChat } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', cleanId)
            .maybeSingle();

        if (existingChat) {
            // Se o chat existe mas o telefone real está vazio, atualiza se tivermos agora
            if (!existingChat.contact_phone && normalizedActual && !whatsappService.isLid(normalizedActual)) {
                await appBackend.client.from('crm_whatsapp_chats').update({ contact_phone: normalizedActual }).eq('id', existingChat.id);
            }
            return existingChat;
        }

        // 2. É um LID? Tenta buscar chat antigo pelo TELEFONE REAL extraído ou CRM
        const contact = await whatsappService.findContactInCrm(normalizedActual || cleanId, pushName);
        const finalPhone = normalizedActual || contact?.phone || (!whatsappService.isLid(cleanId) ? cleanId : '');

        if (finalPhone && !whatsappService.isLid(finalPhone)) {
            const variations = whatsappService.getPhoneVariations(finalPhone);
            const { data: oldChatByPhone } = await appBackend.client
                .from('crm_whatsapp_chats')
                .select('*')
                .or(`wa_id.in.(${variations.map(v => `"${v}"`).join(',')}),contact_phone.in.(${variations.map(v => `"${v}"`).join(',')})`)
                .maybeSingle();

            if (oldChatByPhone) {
                // UNIFICAÇÃO: O contato mudou de ID técnico (LID) mas o telefone é o mesmo.
                const { data: merged } = await appBackend.client
                    .from('crm_whatsapp_chats')
                    .update({ 
                        wa_id: cleanId, 
                        contact_phone: oldChatByPhone.contact_phone || finalPhone,
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
     * Envio priorizando sempre o MSISDN (Telefone) estável
     */
    sendTextMessage: async (chat: any, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        if (!config) throw new Error("WhatsApp não configurado.");

        // Se o wa_id for um LID (longo), usamos o contact_phone (5551...) para garantir entrega
        const target = whatsappService.isLid(chat.wa_id) ? (chat.contact_phone || chat.wa_id) : chat.wa_id;

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

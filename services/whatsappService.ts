
import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Normaliza um número ou ID de WhatsApp para busca.
     */
    normalizeNumber: (phone: string) => {
        if (!phone) return '';
        // Remove @s.whatsapp.net e caracteres não numéricos
        let clean = phone.split('@')[0].replace(/\D/g, '');
        
        // Se for número brasileiro e tiver 10 ou 11 dígitos, garante o 55
        if (clean.length >= 10 && clean.length <= 11 && !clean.startsWith('55')) {
            clean = '55' + clean;
        }
        return clean;
    },

    /**
     * Gera variações de números brasileiros (9º dígito).
     */
    getPhoneVariations: (phone: string) => {
        const normalized = whatsappService.normalizeNumber(phone);
        if (!normalized || normalized.length < 10) return [normalized];
        
        const variations = [normalized];
        // Se for Brasil (55)
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
     * Busca informações detalhadas do contato no CRM de forma agressiva.
     */
    findContactInCrm: async (identifier: string, pushName?: string) => {
        const cleanId = identifier.split('@')[0];
        
        // 1. Se o ID parece um número de telefone, busca por variações
        if (cleanId.length <= 13) {
            const variations = whatsappService.getPhoneVariations(cleanId);
            const { data: contact } = await appBackend.client
                .from('crm_deals')
                .select('contact_name, company_name, phone, email')
                .or(`phone.in.(${variations.map(v => `"${v}"`).join(',')})`)
                .maybeSingle();
            
            if (contact) return { name: contact.company_name || contact.contact_name, phone: contact.phone };
        }

        // 2. Se for um LID ou não achou pelo número, tenta pelo PushName (Nome do WhatsApp)
        if (pushName && pushName.length > 2) {
            const { data: contactByPush } = await appBackend.client
                .from('crm_deals')
                .select('contact_name, company_name, phone')
                .or(`contact_name.ilike.%${pushName}%,company_name.ilike.%${pushName}%`)
                .limit(1)
                .maybeSingle();
            
            if (contactByPush) return { name: contactByPush.company_name || contactByPush.contact_name, phone: contactByPush.phone };
        }

        return null;
    },

    /**
     * getOrCreateChat: Gerencia a dualidade LID vs Telefone.
     * @param waId O ID que veio no remoteJid (ex: 5083... ou 5551...)
     * @param pushName Nome do perfil do WhatsApp
     * @param actualNumber Opcional: O número real extraído do campo 'sender' do webhook
     */
    getOrCreateChat: async (waId: string, pushName: string, actualNumber?: string) => {
        const cleanId = waId.split('@')[0];
        const normalizedActual = actualNumber ? whatsappService.normalizeNumber(actualNumber) : null;

        // 1. Busca se já existe um chat com este ID EXATO (LID ou Telefone)
        const { data: existingChat } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', cleanId)
            .maybeSingle();

        if (existingChat) {
            // Se o chat existe mas o contact_phone está vazio e temos o actualNumber, atualiza
            if (!existingChat.contact_phone && normalizedActual) {
                await appBackend.client.from('crm_whatsapp_chats').update({ contact_phone: normalizedActual }).eq('id', existingChat.id);
            }
            return existingChat;
        }

        // 2. Se for um LID, tenta encontrar um chat antigo que tenha o TELEFONE REAL deste contato
        const contact = await whatsappService.findContactInCrm(normalizedActual || cleanId, pushName);
        const finalPhone = normalizedActual || contact?.phone || (cleanId.length <= 13 ? cleanId : '');

        if (finalPhone) {
            const variations = whatsappService.getPhoneVariations(finalPhone);
            const { data: oldChatByPhone } = await appBackend.client
                .from('crm_whatsapp_chats')
                .select('*')
                .in('wa_id', variations)
                .maybeSingle();

            if (oldChatByPhone) {
                // UNIFICAÇÃO: O contato mandou mensagem de um novo ID (LID).
                // Atualizamos o wa_id do chat antigo para o novo LID, mas mantemos o contact_phone para envios.
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

        // 3. Se for realmente um contato novo, cria o registro
        const { data: newChat, error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .insert([{
                wa_id: cleanId,
                contact_name: contact?.name || pushName || cleanId,
                contact_phone: finalPhone,
                status: 'open',
                last_message: 'Chat iniciado'
            }])
            .select()
            .single();
        
        if (error) throw error;
        return newChat;
    },

    /**
     * Envia mensagem priorizando o número de telefone real.
     */
    sendTextMessage: async (chat: any, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        if (!config) throw new Error("WhatsApp não configurado.");

        // Lógica de Destino: Se wa_id é técnico (LID), usa o contact_phone (MSISDN).
        const isLid = chat.wa_id.length > 13;
        const target = (isLid && chat.contact_phone) ? chat.contact_phone : chat.wa_id;

        const baseUrl = config.instanceUrl.replace(/\/$/, "");
        const url = `${baseUrl}/message/sendText/${config.instanceName.trim()}`;

        try {
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
            if (!response.ok) {
                // Tenta fallback para o ID original caso o telefone formatado falhe
                if (target !== chat.wa_id) {
                    const fallbackRes = await fetch(url, {
                        method: 'POST',
                        headers: { 'apikey': config.apiKey.trim(), 'Content-Type': 'application/json' },
                        body: JSON.stringify({ number: chat.wa_id, text: text })
                    });
                    const fallbackData = await fallbackRes.json();
                    if (fallbackRes.ok) return fallbackData;
                }
                throw new Error(data.message || "Erro na API Evolution");
            }
            return data;
        } catch (error: any) {
            throw error;
        }
    },

    /**
     * Sincroniza mensagem no histórico local.
     */
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


import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Verifica se o identificador é um LID (Linked ID) técnico do WhatsApp.
     */
    isLid: (id: string) => {
        if (!id) return false;
        const clean = id.split('@')[0].split(':')[0].replace(/\D/g, '');
        return clean.length > 13;
    },

    /**
     * Tenta extrair o número de telefone real de uma string suja
     */
    extractActualNumber: (raw: string) => {
        if (!raw) return null;
        const partBeforeAt = raw.split('@')[0];
        const cleanNumber = partBeforeAt.split(':')[0].replace(/\D/g, '');
        if (cleanNumber.length >= 10 && cleanNumber.length <= 13) {
            return cleanNumber;
        }
        return null;
    },

    /**
     * Zera o contador de mensagens não lidas de um chat
     */
    markAsRead: async (chatId: string) => {
        const { error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .update({ unread_count: 0 })
            .eq('id', chatId);
        if (error) console.error("Erro ao limpar notificações:", error);
        return !error;
    },

    /**
     * Atualiza a etapa (status) do atendimento
     */
    updateChatStatus: async (chatId: string, status: 'open' | 'pending' | 'waiting' | 'closed') => {
        const { error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', chatId);
        if (error) throw error;
        return true;
    },

    /**
     * Busca informações do contato no CRM
     */
    findContactInCrm: async (identifier: string, pushName?: string) => {
        const actualNum = whatsappService.extractActualNumber(identifier);
        
        if (actualNum) {
            const last8 = actualNum.slice(-8);
            const { data: contactByPhone } = await appBackend.client
                .from('crm_deals')
                .select('id, contact_name, company_name, phone, email, stage')
                .ilike('phone', `%${last8}%`)
                .maybeSingle();
            
            if (contactByPhone) return { 
                name: contactByPhone.company_name || contactByPhone.contact_name, 
                phone: contactByPhone.phone, 
                role: contactByPhone.stage === 'closed' ? 'Aluno Matriculado' : 'Lead CRM',
                email: contactByPhone.email,
                dealId: contactByPhone.id
            };
        }

        if (pushName && pushName.length > 2) {
            const { data: contactByName } = await appBackend.client
                .from('crm_deals')
                .select('id, contact_name, company_name, phone, email, stage')
                .or(`contact_name.ilike."%${pushName}%",company_name.ilike."%${pushName}%"`)
                .limit(1)
                .maybeSingle();
            
            if (contactByName) return { 
                name: contactByName.company_name || contactByName.contact_name, 
                phone: contactByName.phone, 
                role: contactByName.stage === 'closed' ? 'Aluno (Match Nome)' : 'Lead (Match Nome)',
                email: contactByName.email,
                dealId: contactByName.id
            };
        }
        return null;
    },

    /**
     * Associa manualmente um wa_id (LID) a um telefone real e nome
     */
    associateLidWithPhone: async (chatId: string, phone: string, name: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        const { error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .update({ 
                contact_phone: cleanPhone,
                contact_name: name,
                updated_at: new Date().toISOString()
            })
            .eq('id', chatId);
        
        if (error) throw error;
        return true;
    },

    /**
     * Cria ou recupera um chat unificado
     */
    getOrCreateChat: async (waId: string, pushName: string) => {
        const cleanId = waId.split('@')[0];
        const { data: existingChat } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', cleanId)
            .maybeSingle();

        if (existingChat) {
            if (!existingChat.contact_phone || whatsappService.isLid(existingChat.contact_phone)) {
                const contact = await whatsappService.findContactInCrm(waId, pushName);
                if (contact?.phone) {
                    const cleanPhone = contact.phone.replace(/\D/g, '');
                    await appBackend.client.from('crm_whatsapp_chats').update({ 
                        contact_phone: cleanPhone,
                        contact_name: contact.name 
                    }).eq('id', existingChat.id);
                    existingChat.contact_phone = cleanPhone;
                    existingChat.contact_name = contact.name;
                }
            }
            return existingChat;
        }

        const contact = await whatsappService.findContactInCrm(waId, pushName);
        const finalPhone = contact?.phone ? contact.phone.replace(/\D/g, '') : whatsappService.extractActualNumber(waId);

        const { data: newChat, error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .insert([{
                wa_id: cleanId,
                contact_name: contact?.name || pushName || cleanId,
                contact_phone: finalPhone,
                status: 'open',
                last_message: 'Início do atendimento'
            }])
            .select()
            .single();
        
        if (error) throw error;
        return newChat;
    },

    sendTextMessage: async (chat: any, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        if (!config) throw new Error("WhatsApp não configurado.");
        const target = chat.contact_phone && !whatsappService.isLid(chat.contact_phone) 
            ? chat.contact_phone 
            : chat.wa_id;

        const baseUrl = config.instanceUrl.replace(/\/$/, "");
        const url = `${baseUrl}/message/sendText/${config.instanceName.trim()}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'apikey': config.apiKey.trim(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: target, options: { delay: 1200, presence: "composing" }, text: text })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Erro na API Evolution");
        return data;
    },

    syncMessage: async (chatId: string, text: string, senderType: 'user' | 'agent' | 'system', waMessageId?: string) => {
        const { data, error } = await appBackend.client
            .from('crm_whatsapp_messages')
            .insert([{ chat_id: chatId, text, sender_type: senderType, wa_message_id: waMessageId, status: 'sent' }])
            .select().single();
        if (error) throw error;

        await appBackend.client
            .from('crm_whatsapp_chats')
            .update({ last_message: text, updated_at: new Date().toISOString() })
            .eq('id', chatId);
        return data;
    }
};

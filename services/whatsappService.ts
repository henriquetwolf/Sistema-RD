
import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Verifica se o identificador é um LID (Linked ID) técnico do WhatsApp.
     */
    isLid: (id: string) => {
        if (!id) return false;
        const clean = id.split('@')[0].split(':')[0].replace(/\D/g, '');
        // LIDs técnicos geralmente têm mais de 15 dígitos
        return clean.length > 13;
    },

    /**
     * Tenta extrair o número de telefone real de uma string suja
     */
    extractActualNumber: (raw: string) => {
        if (!raw) return null;
        const partBeforeAt = raw.split('@')[0];
        const cleanNumber = partBeforeAt.split(':')[0].replace(/\D/g, '');
        
        // Se for um número de telefone brasileiro válido (12 ou 13 dígitos: 55 + DDD + Numero)
        if (cleanNumber.length >= 10 && cleanNumber.length <= 13) {
            return cleanNumber;
        }
        return null;
    },

    /**
     * Busca informações do contato no CRM de forma exaustiva (Número ou Nome)
     */
    findContactInCrm: async (identifier: string, pushName?: string) => {
        // 1. TENTA PELO NÚMERO (Se o ID não for LID)
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

        // 2. TENTA PELO NOME (Crucial para desmascarar LIDs)
        // Se o Evolution enviou o pushName, procuramos ele no CRM
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
     * Cria ou recupera um chat unificado, forçando a descoberta do número real
     */
    getOrCreateChat: async (waId: string, pushName: string) => {
        const cleanId = waId.split('@')[0];
        
        // 1. Verifica se já existe o chat
        const { data: existingChat } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', cleanId)
            .maybeSingle();

        if (existingChat) {
            // Se o chat existe mas está sem o telefone real, tenta vincular agora
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

        // 2. Chat novo: Busca no CRM para tentar "desmascarar" o ID técnico imediatamente
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

    /**
     * Envio de Mensagem: Prioriza o número real (contact_phone)
     */
    sendTextMessage: async (chat: any, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        if (!config) throw new Error("WhatsApp não configurado.");

        // Evolution API identifica melhor o número real
        const target = chat.contact_phone && !whatsappService.isLid(chat.contact_phone) 
            ? chat.contact_phone 
            : chat.wa_id;

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
                options: { delay: 1200, presence: "composing" },
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

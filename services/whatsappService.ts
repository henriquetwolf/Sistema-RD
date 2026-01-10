
import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Verifica se o identificador é um LID (Linked ID) do WhatsApp.
     */
    isLid: (id: string) => {
        if (!id) return false;
        const clean = id.split('@')[0].split(':')[0].replace(/\D/g, '');
        // LIDs costumam ter 15+ dígitos e começam com padrões diferentes de DDI
        return clean.length > 13;
    },

    /**
     * Tenta extrair o número de telefone real de uma string suja (incluindo multi-device)
     */
    extractActualNumber: (raw: string) => {
        if (!raw) return null;
        // Remove @s.whatsapp.net e pega a parte antes do : (se houver :1, :2 de multidevice)
        const partBeforeAt = raw.split('@')[0];
        const cleanNumber = partBeforeAt.split(':')[0].replace(/\D/g, '');
        
        // Se for um número de telefone válido (DDI 55 + DDD + Numero = 12 ou 13 dígitos)
        if (cleanNumber.length >= 10 && cleanNumber.length <= 13) {
            return cleanNumber;
        }
        return null;
    },

    /**
     * Busca informações do contato no CRM de forma exaustiva
     */
    findContactInCrm: async (identifier: string, pushName?: string) => {
        // 1. Tenta extrair número real do ID técnico
        const actualNum = whatsappService.extractActualNumber(identifier);
        
        if (actualNum) {
            // Busca no CRM pelo número (tentando match flexível com o final do número)
            const last8 = actualNum.slice(-8);
            const { data: contact } = await appBackend.client
                .from('crm_deals')
                .select('id, contact_name, company_name, phone, email, stage')
                .ilike('phone', `%${last8}%`)
                .maybeSingle();
            
            if (contact) return { 
                name: contact.company_name || contact.contact_name, 
                phone: contact.phone, 
                role: contact.stage === 'closed' ? 'Aluno Matriculado' : 'Lead CRM',
                email: contact.email,
                dealId: contact.id
            };
        }

        // 2. Se for um LID ou não achou por número, tenta pelo Nome do Perfil (pushName)
        if (pushName && pushName.length > 3) {
            const { data: contactByPush } = await appBackend.client
                .from('crm_deals')
                .select('id, contact_name, company_name, phone, email, stage')
                .or(`contact_name.ilike.${pushName},company_name.ilike.${pushName}`)
                .limit(1)
                .maybeSingle();
            
            if (contactByPush) return { 
                name: contactByPush.company_name || contactByPush.contact_name, 
                phone: contactByPush.phone, 
                role: contactByPush.stage === 'closed' ? 'Aluno (Match p/ Nome)' : 'Lead (Match p/ Nome)',
                email: contactByPush.email,
                dealId: contactByPush.id
            };
        }

        return null;
    },

    /**
     * Cria ou recupera um chat unificado, tentando vincular ao CRM
     */
    getOrCreateChat: async (waId: string, pushName: string) => {
        const cleanId = waId.split('@')[0];
        
        // 1. Verifica se já existe o chat no banco pelo wa_id técnico
        const { data: existingChat } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', cleanId)
            .maybeSingle();

        if (existingChat) {
            // Se o chat existe mas não tem telefone real, tenta buscar no CRM agora
            if (!existingChat.contact_phone) {
                const contact = await whatsappService.findContactInCrm(waId, pushName);
                if (contact?.phone) {
                    const cleanPhone = contact.phone.replace(/\D/g, '');
                    await appBackend.client.from('crm_whatsapp_chats').update({ contact_phone: cleanPhone }).eq('id', existingChat.id);
                    existingChat.contact_phone = cleanPhone;
                }
            }
            return existingChat;
        }

        // 2. Chat novo: Busca no CRM para tentar "desmascarar" o ID técnico
        const contact = await whatsappService.findContactInCrm(waId, pushName);
        const finalPhone = contact?.phone ? contact.phone.replace(/\D/g, '') : whatsappService.extractActualNumber(waId);

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

    sendTextMessage: async (chat: any, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        if (!config) throw new Error("WhatsApp não configurado.");

        // PRIORIDADE: Enviar para o número real se disponível, senão ID técnico
        const target = chat.contact_phone || chat.wa_id;

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


import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Verifica se o identificador é um LID (Linked ID) técnico do WhatsApp.
     */
    isLid: (id: string) => {
        if (!id) return false;
        const clean = id.split('@')[0].split(':')[0].replace(/\D/g, '');
        // LIDs técnicos geralmente têm mais de 15 dígitos e não seguem o padrão DDI 55
        return clean.length > 13;
    },

    /**
     * Tenta extrair o número de telefone real de uma string suja (incluindo multi-device :1, :2)
     */
    extractActualNumber: (raw: string) => {
        if (!raw) return null;
        // Pega apenas a parte antes do @ e remove sufixos de multidevice (:1, :2...)
        const partBeforeAt = raw.split('@')[0];
        const cleanNumber = partBeforeAt.split(':')[0].replace(/\D/g, '');
        
        // Se for um número de telefone brasileiro válido (12 ou 13 dígitos)
        if (cleanNumber.length >= 10 && cleanNumber.length <= 13) {
            return cleanNumber;
        }
        return null;
    },

    /**
     * Busca informações do contato no CRM de forma exaustiva (Número ou Nome)
     */
    findContactInCrm: async (identifier: string, pushName?: string) => {
        // 1. TENTA PELO NÚMERO (Extraindo do ID se possível)
        const actualNum = whatsappService.extractActualNumber(identifier);
        
        if (actualNum) {
            // Busca no CRM ignorando formatação do campo phone
            // Pegamos os últimos 8 dígitos para um match mais flexível (ignora DDD/DDI)
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

        // 2. TENTA PELO NOME DO PERFIL (PushName)
        // Crucial para LIDs onde o número não está no ID
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
     * Cria ou recupera um chat, forçando a unificação entre wa_id (técnico) e contact_phone (real)
     */
    getOrCreateChat: async (waId: string, pushName: string) => {
        const cleanId = waId.split('@')[0];
        
        // 1. Verifica se já existe o chat pelo wa_id técnico
        const { data: existingChat } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', cleanId)
            .maybeSingle();

        if (existingChat) {
            // Se o chat existe mas está sem o telefone real (comum em LIDs), tenta vincular agora
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

        // 2. Chat novo: Busca no CRM para tentar identificar quem é o dono desse ID
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
     * Envio de Mensagem: Prioriza sempre o número real
     */
    sendTextMessage: async (chat: any, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        if (!config) throw new Error("WhatsApp não configurado.");

        // A Evolution API aceita tanto o número quanto o JID, 
        // mas o número puro (contact_phone) é mais estável para envios.
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

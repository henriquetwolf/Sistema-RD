
import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Normaliza um número ou ID de WhatsApp.
     */
    normalizeNumber: (phone: string) => {
        if (!phone) return '';
        let clean = phone.split('@')[0].replace(/\D/g, '');
        if (clean.length === 10 || clean.length === 11) {
            clean = '55' + clean;
        }
        return clean;
    },

    /**
     * Gera variações de números brasileiros (9º dígito).
     */
    getPhoneVariations: (phone: string) => {
        const normalized = whatsappService.normalizeNumber(phone);
        const variations = [normalized];

        if (normalized.startsWith('55') && (normalized.length === 12 || normalized.length === 13)) {
            const ddd = normalized.slice(2, 4);
            const rest = normalized.slice(4);
            if (normalized.length === 13 && rest.startsWith('9')) {
                variations.push('55' + ddd + rest.slice(1));
            } else if (normalized.length === 12) {
                variations.push('55' + ddd + '9' + rest);
            }
        }
        return variations;
    },

    /**
     * Busca informações detalhadas do contato no CRM.
     */
    findContactInCrm: async (identifier: string) => {
        const cleanId = identifier.split('@')[0].replace(/\D/g, '');
        const variations = whatsappService.getPhoneVariations(cleanId);
        
        // 1. Busca em Alunos/Leads (crm_deals)
        const { data: deal } = await appBackend.client
            .from('crm_deals')
            .select('id, contact_name, company_name, phone, email')
            .or(`phone.in.(${variations.map(v => `"${v}"`).join(',')}),email.ilike.%${identifier}%`)
            .maybeSingle();
        
        if (deal) return { name: deal.company_name || deal.contact_name, phone: deal.phone };

        // 2. Busca em Instrutores
        const { data: teacher } = await appBackend.client
            .from('crm_teachers')
            .select('full_name, phone')
            .in('phone', variations)
            .maybeSingle();
            
        if (teacher) return { name: teacher.full_name, phone: teacher.phone };

        return null;
    },

    /**
     * getOrCreateChat: Resolve o problema de IDs estáveis (LIDs).
     * Garante que o wa_id seja o identificador da conversa, mas o contact_phone seja o número real para envios.
     */
    getOrCreateChat: async (waId: string, pushName: string) => {
        const cleanId = waId.split('@')[0];

        // 1. Tenta buscar pelo ID exato que veio da API (LID ou Telefone)
        const { data: existingChat } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', cleanId)
            .maybeSingle();

        if (existingChat) return existingChat;

        // 2. Se não achou pelo ID, busca no CRM para ver se esse ID pertence a alguém conhecido
        const contact = await whatsappService.findContactInCrm(cleanId);
        
        if (contact) {
            // Se achamos o contato (ex: Henrique), verificamos se já existe um chat com o TELEFONE dele
            const phoneVariations = whatsappService.getPhoneVariations(contact.phone || '');
            const { data: chatByPhone } = await appBackend.client
                .from('crm_whatsapp_chats')
                .select('*')
                .in('wa_id', phoneVariations)
                .maybeSingle();

            if (chatByPhone) {
                // ATUALIZAÇÃO/MERGE: Se já tínhamos um chat pelo telefone, mas agora ele respondeu via LID,
                // atualizamos o chat antigo com o novo LID (wa_id) para que as próximas mensagens caiam aqui.
                // Mantemos o contact_phone intacto para os envios da API.
                const { data: merged } = await appBackend.client
                    .from('crm_whatsapp_chats')
                    .update({ 
                        wa_id: cleanId, // Atualiza para o ID técnico novo
                        contact_name: contact.name,
                        contact_phone: contact.phone || chatByPhone.contact_phone 
                    })
                    .eq('id', chatByPhone.id)
                    .select()
                    .single();
                
                return merged;
            }
        }

        // 3. Se for realmente novo, cria.
        const finalName = contact?.name || pushName || cleanId;
        const { data: newChat, error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .insert([{
                wa_id: cleanId,
                contact_name: finalName,
                contact_phone: contact?.phone || (cleanId.length <= 13 ? cleanId : ''), // Só usa o ID como telefone se parecer um número
                last_message: 'Iniciado',
                status: 'open'
            }])
            .select()
            .single();
        
        if (error) throw error;
        return newChat;
    },

    /**
     * Envia mensagem de texto.
     * CORREÇÃO: Prioriza o contact_phone se o wa_id for um LID.
     */
    sendTextMessage: async (chat: any, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        if (!config) throw new Error("WhatsApp não configurado.");

        // Se wa_id for um LID (muito longo), e tivermos o telefone real, usamos o telefone real para a API.
        const waIdIsLid = chat.wa_id.length > 13;
        const targetNumber = (waIdIsLid && chat.contact_phone) ? chat.contact_phone : chat.wa_id;

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
                    number: targetNumber, // Envia para o MSISDN real
                    options: { delay: 1000, presence: "composing" },
                    text: text
                })
            });

            const data = await response.json();
            if (!response.ok) {
                // Se falhou enviando para o número, tenta uma última vez para o wa_id original
                if (targetNumber !== chat.wa_id) {
                    return await whatsappService.retryWithOriginalId(chat.wa_id, text, config);
                }
                throw new Error(data.message || "Erro na API Evolution");
            }
            return data;
        } catch (error: any) {
            throw error;
        }
    },

    /**
     * Fallback caso o envio pelo número real falhe.
     */
    retryWithOriginalId: async (waId: string, text: string, config: any) => {
        const baseUrl = config.instanceUrl.replace(/\/$/, "");
        const url = `${baseUrl}/message/sendText/${config.instanceName.trim()}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'apikey': config.apiKey.trim(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: waId, text: text })
        });
        return await response.json();
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
            .update({ 
                last_message: text, 
                updated_at: new Date().toISOString() 
            })
            .eq('id', chatId);

        return data;
    }
};

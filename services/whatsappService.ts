
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
     * Gera as variações possíveis de um número brasileiro (com e sem o 9).
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
     * Tenta encontrar um contato no CRM por qualquer identificador (ID, Telefone, Email).
     */
    findContactInCrm: async (identifier: string) => {
        const variations = whatsappService.getPhoneVariations(identifier);
        
        // Busca em Alunos/Leads
        const { data: deal } = await appBackend.client
            .from('crm_deals')
            .select('id, company_name, contact_name, phone')
            .or(`phone.in.(${variations.map(v => `"${v}"`).join(',')}),id.eq.${identifier}`)
            .maybeSingle();
        if (deal) return { name: deal.company_name || deal.contact_name, phone: deal.phone };

        // Busca em Instrutores
        const { data: teacher } = await appBackend.client
            .from('crm_teachers')
            .select('full_name, phone')
            .or(`phone.in.(${variations.map(v => `"${v}"`).join(',')}),id.eq.${identifier}`)
            .maybeSingle();
        if (teacher) return { name: teacher.full_name, phone: teacher.phone };

        return null;
    },

    /**
     * Busca ou cria um chat, garantindo que LIDs e Números de Telefone sejam unificados.
     */
    getOrCreateChat: async (waId: string, pushName: string) => {
        // 1. Tenta buscar o chat pelo ID exato que veio (pode ser o LID 5083...)
        const { data: chatById } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', waId)
            .maybeSingle();

        if (chatById) return chatById;

        // 2. Se não achou pelo ID, tenta resolver quem é essa pessoa pelo CRM
        const contact = await whatsappService.findContactInCrm(waId);
        
        if (contact) {
            // Se encontramos o contato no CRM (ex: Henrique), 
            // verificamos se já existe um chat aberto com o TELEFONE dele
            const phoneVariations = whatsappService.getPhoneVariations(contact.phone || '');
            const { data: chatByPhone } = await appBackend.client
                .from('crm_whatsapp_chats')
                .select('*')
                .in('wa_id', phoneVariations)
                .maybeSingle();

            if (chatByPhone) {
                // IMPORTANTE: Se achou um chat pelo telefone, atualizamos o wa_id dele 
                // para o novo ID técnico (LID) que o WhatsApp está usando agora.
                // Isso "funde" as duas identidades.
                const { data: updatedChat } = await appBackend.client
                    .from('crm_whatsapp_chats')
                    .update({ wa_id: waId, contact_name: contact.name })
                    .eq('id', chatByPhone.id)
                    .select()
                    .single();
                return updatedChat;
            }
        }

        // 3. Se realmente for um contato novo, cria o chat
        const finalName = contact?.name || pushName || waId;
        const { data: newChat, error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .insert([{
                wa_id: waId,
                contact_name: finalName,
                contact_phone: contact?.phone || waId,
                last_message: 'Conversa iniciada',
                status: 'open'
            }])
            .select()
            .single();
        
        if (error) throw error;
        return newChat;
    },

    /**
     * Envia uma mensagem de texto.
     */
    sendTextMessage: async (to: string, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        if (!config) throw new Error("WhatsApp não configurado.");

        // Remove caracteres especiais se for número, mas mantém se for ID técnico
        const target = to.includes('@') ? to.split('@')[0] : to;

        // Evolution API
        const baseUrl = config.instanceUrl.replace(/\/$/, "");
        const url = `${baseUrl}/message/sendText/${config.instanceName.trim()}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'apikey': config.apiKey.trim(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number: target,
                    options: { delay: 1000, presence: "composing" },
                    text: text
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Erro Evolution");
            return data;
        } catch (error: any) { throw error; }
    },

    /**
     * Sincroniza mensagem enviada ou recebida.
     */
    syncMessage: async (chatId: string, text: string, senderType: 'user' | 'agent' | 'system', waMessageId?: string) => {
        const { data, error } = await appBackend.client
            .from('crm_whatsapp_messages')
            .insert([{ chat_id: chatId, text, sender_type: senderType, wa_message_id: waMessageId, status: 'sent' }])
            .select().single();
        
        if (error) throw error;

        // Atualiza timestamp para subir na lista
        await appBackend.client
            .from('crm_whatsapp_chats')
            .update({ last_message: text, updated_at: new Date().toISOString() })
            .eq('id', chatId);

        return data;
    }
};


import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Normaliza um número ou ID de WhatsApp.
     */
    normalizeNumber: (phone: string) => {
        if (!phone) return '';
        // Remove sufixos de JID e caracteres não numéricos
        let clean = phone.split('@')[0].replace(/\D/g, '');
        
        // Adiciona DDI Brasil se faltar em números de 10/11 dígitos
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

        // Lógica específica para números brasileiros (DDI 55)
        if (normalized.startsWith('55') && (normalized.length === 12 || normalized.length === 13)) {
            const ddd = normalized.slice(2, 4);
            const rest = normalized.slice(4);

            if (normalized.length === 13 && rest.startsWith('9')) {
                // Tem o 9, gera sem o 9
                variations.push('55' + ddd + rest.slice(1));
            } else if (normalized.length === 12) {
                // Não tem o 9, gera com o 9
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
        
        // 1. Tenta buscar em Alunos/Deals
        const { data: deal } = await appBackend.client
            .from('crm_deals')
            .select('id, contact_name, company_name, phone, email, product_name')
            .or(`phone.in.(${variations.map(v => `"${v}"`).join(',')}),id.eq.${identifier}`)
            .maybeSingle();
        
        if (deal) {
            return {
                name: deal.company_name || deal.contact_name,
                phone: deal.phone,
                email: deal.email,
                role: 'Aluno/Lead',
                detail: deal.product_name
            };
        }

        // 2. Tenta buscar em Instrutores
        const { data: teacher } = await appBackend.client
            .from('crm_teachers')
            .select('id, full_name, phone, email, teacher_level')
            .or(`phone.in.(${variations.map(v => `"${v}"`).join(',')}),id.eq.${identifier}`)
            .maybeSingle();
            
        if (teacher) {
            return {
                name: teacher.full_name,
                phone: teacher.phone,
                email: teacher.email,
                role: 'Instrutor',
                detail: teacher.teacher_level
            };
        }

        return null;
    },

    /**
     * Gerencia a criação ou unificação de chats (MSISDN vs LID).
     */
    getOrCreateChat: async (waId: string, pushName: string) => {
        const cleanId = waId.split('@')[0];

        // 1. Tenta buscar o chat pelo ID exato recebido (LID ou MSISDN)
        const { data: existingChatById } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', cleanId)
            .maybeSingle();

        if (existingChatById) return existingChatById;

        // 2. Se não achou, tenta identificar quem é a pessoa via CRM
        const contact = await whatsappService.findContactInCrm(cleanId);
        
        if (contact) {
            // Verifica se já temos um chat aberto com o TELEFONE conhecido deste contato
            const phoneVariations = whatsappService.getPhoneVariations(contact.phone || '');
            const { data: existingChatByPhone } = await appBackend.client
                .from('crm_whatsapp_chats')
                .select('*')
                .in('wa_id', phoneVariations)
                .maybeSingle();

            if (existingChatByPhone) {
                // UNIFICAÇÃO: Atualiza o ID do chat antigo para o novo ID técnico (LID)
                // Assim o histórico é preservado e a duplicidade resolvida.
                const { data: updatedChat } = await appBackend.client
                    .from('crm_whatsapp_chats')
                    .update({ 
                        wa_id: cleanId, 
                        contact_name: contact.name,
                        last_message: '[Identidade Vinculada]'
                    })
                    .eq('id', existingChatByPhone.id)
                    .select()
                    .single();
                
                return updatedChat;
            }
        }

        // 3. Se for realmente um contato novo, cria o chat
        const finalName = contact?.name || pushName || cleanId;
        const { data: newChat, error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .insert([{
                wa_id: cleanId,
                contact_name: finalName,
                contact_phone: contact?.phone || cleanId,
                last_message: 'Início do atendimento',
                status: 'open'
            }])
            .select()
            .single();
        
        if (error) throw error;
        return newChat;
    },

    /**
     * Envia mensagem de texto via Evolution API.
     */
    sendTextMessage: async (to: string, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        if (!config) throw new Error("WhatsApp não configurado.");

        const target = to.includes('@') ? to.split('@')[0] : to;
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
            if (!response.ok) throw new Error(data.message || "Erro API");
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

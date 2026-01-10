
import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Normaliza um número ou ID de WhatsApp.
     */
    normalizeNumber: (phone: string) => {
        if (!phone) return '';
        // Remove sufixos comuns de JID e caracteres não numéricos
        let clean = phone.split('@')[0].replace(/\D/g, '');
        
        // Se for um número de telefone brasileiro padrão (10 ou 11 dígitos sem DDI)
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

        // Só aplica lógica de 9º dígito se parecer um número de telefone (tamanho 12 ou 13)
        // IDs técnicos (LIDs) geralmente são maiores e não começam com 55 ou seguem o padrão MSISDN
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
        // Se for um ID técnico (LID), ele não terá variações de 9º dígito
        const variations = whatsappService.getPhoneVariations(identifier);
        
        // 1. Busca em Alunos/Leads (crm_deals)
        const { data: deal } = await appBackend.client
            .from('crm_deals')
            .select('id, company_name, contact_name, phone')
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
     * Busca ou cria um chat, garantindo que LIDs e Números de Telefone sejam unificados.
     * Esta é a função chave para resolver o erro do número "estranho".
     */
    getOrCreateChat: async (waId: string, pushName: string) => {
        const cleanId = waId.split('@')[0];

        // 1. Tenta buscar o chat pelo ID exato que veio da API (LID ou Telefone)
        const { data: existingChatById } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', cleanId)
            .maybeSingle();

        if (existingChatById) return existingChatById;

        // 2. Se não achou pelo ID, vamos tentar resolver quem é essa pessoa pelo CRM
        const contact = await whatsappService.findContactInCrm(cleanId);
        
        if (contact) {
            // Se encontramos o contato no CRM (ex: Henrique), 
            // verificamos se já existe um chat aberto com o TELEFONE real dele
            const phoneVariations = whatsappService.getPhoneVariations(contact.phone || '');
            const { data: existingChatByPhone } = await appBackend.client
                .from('crm_whatsapp_chats')
                .select('*')
                .in('wa_id', phoneVariations)
                .maybeSingle();

            if (existingChatByPhone) {
                // UNIFICAÇÃO: Se já existe um chat pelo telefone, mas agora ele respondeu com um LID,
                // atualizamos o chat existente para usar o novo ID técnico (wa_id).
                // Isso mantém o histórico na mesma tela e evita duplicidade.
                const { data: mergedChat } = await appBackend.client
                    .from('crm_whatsapp_chats')
                    .update({ 
                        wa_id: cleanId, 
                        contact_name: contact.name,
                        last_message: 'ID Atualizado pelo sistema'
                    })
                    .eq('id', existingChatByPhone.id)
                    .select()
                    .single();
                
                return mergedChat;
            }
        }

        // 3. Se realmente for um contato novo sem chat prévio, cria um novo
        const finalName = contact?.name || pushName || cleanId;
        const { data: newChat, error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .insert([{
                wa_id: cleanId,
                contact_name: finalName,
                contact_phone: contact?.phone || cleanId,
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
        if (!config) throw new Error("WhatsApp não configurado. Vá em Configurações.");

        // target pode ser um ID técnico (5083...) ou um número (5551...)
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
                    options: { delay: 1200, presence: "composing" },
                    text: text
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Erro na API Evolution");
            return data;
        } catch (error: any) {
            throw error;
        }
    },

    /**
     * Sincroniza uma mensagem enviada/recebida no banco de dados local.
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

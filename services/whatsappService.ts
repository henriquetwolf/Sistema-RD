
import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Normaliza um número ou ID de WhatsApp.
     */
    normalizeNumber: (phone: string) => {
        if (!phone) return '';
        // Remove sufixos de JID (@s.whatsapp.net, @g.us) e caracteres não numéricos
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

        // Só aplica lógica de 9º dígito se parecer um número de telefone (DDI 55 + tamanho 12 ou 13)
        // LIDs (IDs técnicos como 508...) costumam ser maiores e não seguem este padrão
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
     * Tenta encontrar um contato no CRM por qualquer identificador (ID, Telefone, Email).
     */
    findContactInCrm: async (identifier: string) => {
        const variations = whatsappService.getPhoneVariations(identifier);
        
        // 1. Busca em Alunos/Deals (crm_deals)
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
     * Resolve o problema de receber respostas com IDs técnicos diferentes do número enviado.
     */
    getOrCreateChat: async (waId: string, pushName: string) => {
        const cleanId = waId.split('@')[0];

        // 1. Tenta buscar o chat pelo ID exato que veio (LID ou Telefone)
        const { data: existingChatById } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', cleanId)
            .maybeSingle();

        if (existingChatById) return existingChatById;

        // 2. Se não achou pelo ID, tenta descobrir quem é a pessoa via CRM
        const contact = await whatsappService.findContactInCrm(cleanId);
        
        if (contact) {
            // Verificamos se já existe um chat aberto com o TELEFONE real deste contato
            const phoneVariations = whatsappService.getPhoneVariations(contact.phone || '');
            const { data: existingChatByPhone } = await appBackend.client
                .from('crm_whatsapp_chats')
                .select('*')
                .in('wa_id', phoneVariations)
                .maybeSingle();

            if (existingChatByPhone) {
                // UNIFICAÇÃO: Se já existe um chat pelo telefone, mas agora ele respondeu com um LID,
                // atualizamos o chat antigo para o novo wa_id técnico.
                const { data: mergedChat } = await appBackend.client
                    .from('crm_whatsapp_chats')
                    .update({ 
                        wa_id: cleanId, 
                        contact_name: contact.name,
                        last_message: 'Identidade unificada pelo sistema'
                    })
                    .eq('id', existingChatByPhone.id)
                    .select()
                    .single();
                
                return mergedChat;
            }
        }

        // 3. Se for um contato novo sem histórico nenhum, cria o chat
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
     * Sincroniza mensagem no banco de dados.
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

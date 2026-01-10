
import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Normaliza um número de WhatsApp para o formato canônico.
     * Trata o problema do 9º dígito no Brasil e remove sufixos de JID.
     */
    normalizeNumber: (phone: string) => {
        if (!phone) return '';
        // 1. Remove @s.whatsapp.net, @g.us e qualquer caractere não numérico
        let clean = phone.split('@')[0].replace(/\D/g, '');
        
        // 2. Se não tem DDI mas tem DDD (10 ou 11 dígitos), assume Brasil (55)
        if (clean.length === 10 || clean.length === 11) {
            clean = '55' + clean;
        }

        return clean;
    },

    /**
     * Gera as variações possíveis de um número brasileiro para busca (com e sem o 9)
     */
    getPhoneVariations: (phone: string) => {
        const normalized = whatsappService.normalizeNumber(phone);
        const variations = [normalized];

        // Se for Brasil (DDI 55) e tiver o tamanho esperado (12 ou 13 dígitos)
        if (normalized.startsWith('55') && (normalized.length === 12 || normalized.length === 13)) {
            const ddd = normalized.slice(2, 4);
            const rest = normalized.slice(4);

            if (normalized.length === 13 && rest.startsWith('9')) {
                // Tem o 9, adiciona a versão sem o 9 (ex: 55119... -> 5511...)
                variations.push('55' + ddd + rest.slice(1));
            } else if (normalized.length === 12) {
                // Não tem o 9, adiciona a versão com o 9 (ex: 5511... -> 55119...)
                variations.push('55' + ddd + '9' + rest);
            }
        }
        return variations;
    },

    /**
     * Tenta encontrar o nome de um contato em outras tabelas do sistema
     */
    resolveContactName: async (phoneOrId: string) => {
        const variations = whatsappService.getPhoneVariations(phoneOrId);
        
        // 1. Tenta buscar em Alunos (Deals)
        const { data: student } = await appBackend.client
            .from('crm_deals')
            .select('company_name, contact_name')
            .or(`email.ilike.%${phoneOrId}%,phone.in.(${variations.map(v => `"${v}"`).join(',')}),cpf.ilike.%${phoneOrId}%`)
            .maybeSingle();
        
        if (student) return student.company_name || student.contact_name;

        // 2. Tenta buscar em Professores
        const { data: teacher } = await appBackend.client
            .from('crm_teachers')
            .select('full_name')
            .in('phone', variations)
            .maybeSingle();

        if (teacher) return teacher.full_name;

        // 3. Tenta buscar em Colaboradores
        const { data: collab } = await appBackend.client
            .from('crm_collaborators')
            .select('full_name')
            .or(`phone.in.(${variations.map(v => `"${v}"`).join(',')}),cellphone.in.(${variations.map(v => `"${v}"`).join(',')})`)
            .maybeSingle();

        if (collab) return collab.full_name;

        return null;
    },

    /**
     * Envia uma mensagem de texto
     */
    sendTextMessage: async (to: string, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        if (!config) throw new Error("WhatsApp não configurado. Vá em Configurações.");

        // Importante: to pode ser um ID de chat (ex: 508...) ou um número
        const cleanNumber = to.includes('@') ? to.split('@')[0] : to;

        // --- MODO TWILIO ---
        if (config.mode === 'twilio') {
            try {
                const auth = btoa(`${config.twilioAccountSid}:${config.twilioAuthToken}`);
                const twilioTo = `whatsapp:+${cleanNumber.replace(/\D/g, '')}`;
                const body = new URLSearchParams();
                body.append('To', twilioTo);
                body.append('From', config.twilioFromNumber);
                body.append('Body', text);

                const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`, {
                    method: 'POST',
                    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: body
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || "Erro Twilio");
                return data;
            } catch (e: any) { throw new Error(e.message); }
        }

        // --- MODO EVOLUTION API ---
        const baseUrl = config.instanceUrl.replace(/\/$/, "");
        const url = `${baseUrl}/message/sendText/${config.instanceName.trim()}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'apikey': config.apiKey.trim(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number: cleanNumber, // Mantemos o ID como veio da API
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
     * Sincroniza mensagem no banco
     */
    syncMessage: async (chatId: string, text: string, senderType: 'user' | 'agent' | 'system', waMessageId?: string) => {
        const { data, error } = await appBackend.client
            .from('crm_whatsapp_messages')
            .insert([{ chat_id: chatId, text, sender_type: senderType, wa_message_id: waMessageId, status: 'sent' }])
            .select().single();
        
        if (error) throw error;

        await appBackend.client.from('crm_whatsapp_chats').update({ last_message: text, updated_at: new Date().toISOString() }).eq('id', chatId);
        return data;
    },

    /**
     * Cria ou busca um chat
     */
    getOrCreateChat: async (phone: string, name: string) => {
        const variations = whatsappService.getPhoneVariations(phone);
        
        // 1. Busca por ID exato ou Variações
        const { data: existing } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .in('wa_id', [phone, ...variations])
            .maybeSingle();

        if (existing) return existing;

        // 2. Se não achou, tenta ver se já existe um chat com o mesmo NOME em Alunos/Professores
        // (Isso ajuda se o ID do WA mudar mas o contato for o mesmo)
        const resolvedName = await whatsappService.resolveContactName(phone) || name;

        const { data: newChat, error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .insert([{
                wa_id: phone,
                contact_name: resolvedName,
                contact_phone: phone,
                last_message: 'Conversa iniciada',
                status: 'open'
            }])
            .select().single();
        
        if (error) throw error;
        return newChat;
    }
};

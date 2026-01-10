
import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Normaliza um número de WhatsApp para o formato padrão do banco (sem JID e tratando o 9º dígito BR)
     */
    normalizeNumber: (jid: string) => {
        // Remove @s.whatsapp.net ou @g.us
        let clean = jid.split('@')[0].replace(/\D/g, '');
        
        // Tratamento especial para Brasil (55)
        // Se o número tem 13 dígitos (55 + DDD + 9 + 8 dígitos), tentamos normalizar
        // Nota: O ID interno do WhatsApp muitas vezes ignora o 9º dígito para contas antigas.
        return clean;
    },

    /**
     * Retorna as configurações atuais do WhatsApp
     */
    getConfig: async () => {
        return await appBackend.getWhatsAppConfig() || { mode: 'evolution', isConnected: false };
    },

    /**
     * Envia uma mensagem de texto (Detecta automaticamente o modo: Evolution ou Twilio)
     */
    sendTextMessage: async (to: string, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        
        if (!config) throw new Error("WhatsApp não configurado. Vá em Configurações.");

        // Normalizamos o número de destino para garantir consistência
        const cleanNumber = to.replace(/\D/g, '');

        // --- MODO TWILIO ---
        if (config.mode === 'twilio') {
            if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioFromNumber) {
                throw new Error("Configurações do Twilio incompletas.");
            }
            
            try {
                const auth = btoa(`${config.twilioAccountSid}:${config.twilioAuthToken}`);
                const twilioTo = `whatsapp:+${cleanNumber}`;
                
                const body = new URLSearchParams();
                body.append('To', twilioTo);
                body.append('From', config.twilioFromNumber);
                body.append('Body', text);

                const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: body
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.message || "Erro na API do Twilio");
                return data;
            } catch (e: any) {
                throw new Error(e.message || "Não foi possível conectar ao Twilio.");
            }
        }

        // --- MODO EVOLUTION API ---
        if (!config.instanceUrl || !config.instanceName || !config.apiKey) {
            throw new Error("Configurações da Evolution API incompletas.");
        }

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
                    number: cleanNumber,
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
     * Sincroniza uma mensagem enviada/recebida no banco de dados local
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

        // Atualiza o último texto e timestamp do chat para subir na lista
        await appBackend.client
            .from('crm_whatsapp_chats')
            .update({ 
                last_message: text, 
                updated_at: new Date().toISOString() 
            })
            .eq('id', chatId);

        return data;
    },

    /**
     * Cria ou busca um chat por número de telefone com suporte a variação de 9º dígito
     */
    getOrCreateChat: async (phone: string, name: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        
        // 1. Tenta busca exata
        let { data: existing } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', cleanPhone)
            .maybeSingle();
        
        // 2. Se for número brasileiro e não achou, tenta a variação do 9º dígito
        if (!existing && cleanPhone.startsWith('55') && (cleanPhone.length === 12 || cleanPhone.length === 13)) {
            const isWithNine = cleanPhone.length === 13;
            const variation = isWithNine 
                ? cleanPhone.slice(0, 4) + cleanPhone.slice(5) // Remove o 9
                : cleanPhone.slice(0, 4) + '9' + cleanPhone.slice(4); // Adiciona o 9

            const { data: fuzzyMatch } = await appBackend.client
                .from('crm_whatsapp_chats')
                .select('*')
                .eq('wa_id', variation)
                .maybeSingle();
            
            if (fuzzyMatch) existing = fuzzyMatch;
        }

        if (existing) return existing;

        // 3. Se realmente não existe, cria um novo
        const { data: newChat, error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .insert([{
                wa_id: cleanPhone,
                contact_name: name,
                contact_phone: phone,
                last_message: 'Conversa iniciada',
                status: 'open'
            }])
            .select()
            .single();
        
        if (error) throw error;
        return newChat;
    }
};

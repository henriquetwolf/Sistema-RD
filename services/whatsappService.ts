
import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Retorna as configurações atuais do WhatsApp
     */
    getConfig: async () => {
        return await appBackend.getWhatsAppConfig() || { mode: 'evolution' };
    },

    /**
     * Envia uma mensagem de texto (Detecta automaticamente o modo: Evolution ou Direct)
     */
    sendTextMessage: async (to: string, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        
        if (!config) throw new Error("WhatsApp não configurado.");

        if (config.mode === 'direct') {
            // No modo Direct, aqui o app dispararia para o seu serviço interno bailey/wppconnect
            // Por enquanto, simulamos o sucesso da operação local
            console.log("Enviando via VOLL Direct para:", to);
            return { key: { id: 'direct_' + Date.now() }, status: 'sent' };
        }

        // Modo Evolution (Original)
        if (!config.instanceUrl || !config.instanceName || !config.apiKey) {
            throw new Error("Configurações da Evolution API incompletas.");
        }

        const baseUrl = config.instanceUrl.replace(/\/$/, "");
        const url = `${baseUrl}/message/sendText/${config.instanceName.trim()}`;
        const cleanNumber = to.replace(/\D/g, '');

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
            if (!response.ok) throw new Error(data.message || "Erro na API");
            return data;
        } catch (error: any) {
            throw error;
        }
    },

    /**
     * Sincroniza uma mensagem enviada/recebida no banco de dados local
     */
    syncMessage: async (chatId: string, text: string, senderType: 'user' | 'agent', waMessageId?: string) => {
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
    },

    /**
     * Cria ou busca um chat por número de telefone
     */
    getOrCreateChat: async (phone: string, name: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        const { data: existing } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', cleanPhone)
            .maybeSingle();
        
        if (existing) return existing;

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

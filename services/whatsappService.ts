
import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Envia uma mensagem de texto real via Evolution API
     */
    sendTextMessage: async (to: string, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        
        if (!config || !config.instanceUrl || !config.instanceName || !config.apiKey) {
            throw new Error("Configurações da Evolution API incompletas. Vá em Atendimento > Configurações e preencha a URL, Instância e API Key.");
        }

        // Formata a URL: Remove barras extras e garante o endpoint correto
        const baseUrl = config.instanceUrl.replace(/\/$/, "");
        const url = `${baseUrl}/message/sendText/${config.instanceName.trim()}`;
        
        // Limpar número: A Evolution API geralmente prefere o número com código do país e sem caracteres especiais
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
                    options: {
                        delay: 1200,
                        presence: "composing",
                        linkPreview: false
                    },
                    text: text
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || "Erro na Evolution API");
            }

            return data;
        } catch (error: any) {
            console.error("Evolution API Error:", error);
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

        // Atualizar última mensagem no chat
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
        
        // Tenta buscar existente
        const { data: existing } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', cleanPhone)
            .single();
        
        if (existing) return existing;

        // Cria novo
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

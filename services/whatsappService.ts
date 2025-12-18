
import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Envia uma mensagem de texto real via WhatsApp Cloud API
     */
    sendTextMessage: async (to: string, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        
        if (!config || !config.accessToken || !config.phoneNumberId) {
            throw new Error("Configurações incompletas. Vá em Atendimento > Engrenagem e preencha o Token e o Phone Number ID.");
        }

        const url = `https://graph.facebook.com/v21.0/${config.phoneNumberId.trim()}/messages`;
        
        // Limpar número e garantir formato internacional (apenas números)
        const cleanNumber = to.replace(/\D/g, '');
        const token = config.accessToken.trim();

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: cleanNumber,
                    type: "text",
                    text: { body: text }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Erros específicos da Meta
                if (data.error?.code === 190) {
                    throw new Error("Token de Acesso inválido ou expirado. Gere um novo Token Permanente no Painel da Meta.");
                }
                if (data.error?.message?.includes("parse")) {
                    throw new Error("O Token salvo tem caracteres inválidos ou espaços. Copie o Token novamente e salve nas configurações.");
                }
                throw new Error(data.error?.message || "Erro na API da Meta");
            }

            return data;
        } catch (error: any) {
            console.error("WhatsApp API Error:", error);
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

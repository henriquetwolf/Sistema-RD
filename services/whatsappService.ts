
import { appBackend } from './appBackend';

export const whatsappService = {
    /**
     * Verifica se o identificador é um LID (Linked ID) do WhatsApp.
     */
    isLid: (id: string) => {
        if (!id) return false;
        const clean = id.split('@')[0].replace(/\D/g, '');
        // LIDs técnicos costumam ter 15+ dígitos
        return clean.length > 13;
    },

    /**
     * Normaliza um número para formato E.164 brasileiro
     */
    normalizeNumber: (phone: string) => {
        if (!phone) return '';
        let clean = phone.split('@')[0].replace(/\D/g, '');
        if (clean.length >= 10 && clean.length <= 11 && !clean.startsWith('55')) {
            clean = '55' + clean;
        }
        return clean;
    },

    /**
     * Tenta extrair o número de telefone real de uma string suja ou LID
     */
    extractActualNumber: (raw: string) => {
        if (!raw) return null;
        const parts = raw.split(':'); // LIDs as vezes vem como 5551...:12@s.whatsapp.net
        const clean = parts[0].split('@')[0].replace(/\D/g, '');
        return clean.length <= 13 ? clean : null;
    },

    /**
     * Busca informações do contato no CRM
     */
    findContactInCrm: async (identifier: string, pushName?: string) => {
        const cleanId = identifier.split('@')[0];
        
        // 1. Tenta pelo ID se ele parecer um número real
        const actualNum = whatsappService.extractActualNumber(identifier);
        if (actualNum) {
            const { data: contact } = await appBackend.client
                .from('crm_deals')
                .select('contact_name, company_name, phone, email')
                .ilike('phone', `%${actualNum.slice(-8)}%`) // Busca pelos últimos 8 dígitos (flexível)
                .maybeSingle();
            
            if (contact) return { name: contact.company_name || contact.contact_name, phone: contact.phone, role: 'Cliente/Lead', detail: contact.email };
        }

        // 2. Tenta pelo Nome do Perfil (muito útil para LIDs)
        if (pushName && pushName.length > 2) {
            const { data: contactByPush } = await appBackend.client
                .from('crm_deals')
                .select('contact_name, company_name, phone, email')
                .or(`contact_name.ilike.%${pushName}%,company_name.ilike.%${pushName}%`)
                .limit(1)
                .maybeSingle();
            
            if (contactByPush) return { 
                name: contactByPush.company_name || contactByPush.contact_name, 
                phone: contactByPush.phone, 
                role: 'CRM Match', 
                detail: contactByPush.email 
            };
        }

        return null;
    },

    /**
     * Cria ou recupera um chat unificado
     */
    getOrCreateChat: async (waId: string, pushName: string) => {
        const cleanId = waId.split('@')[0];
        
        // 1. Busca por wa_id (LID ou Telefone)
        const { data: existingChat } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', cleanId)
            .maybeSingle();

        if (existingChat) return existingChat;

        // 2. Se for novo, tenta identificar no CRM para pegar o telefone real
        const contact = await whatsappService.findContactInCrm(waId, pushName);
        const finalPhone = contact?.phone ? contact.phone.replace(/\D/g, '') : (whatsappService.isLid(cleanId) ? null : cleanId);

        const { data: newChat, error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .insert([{
                wa_id: cleanId,
                contact_name: contact?.name || pushName || cleanId,
                contact_phone: finalPhone,
                status: 'open',
                last_message: 'Iniciando...'
            }])
            .select()
            .single();
        
        if (error) throw error;
        return newChat;
    },

    /**
     * Envio de Mensagem: Tenta o telefone real primeiro (contact_phone)
     * Evolution API aceita o número real mesmo que o chat tenha começado via LID.
     */
    sendTextMessage: async (chat: any, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        if (!config) throw new Error("WhatsApp não configurado.");

        // PRIORIDADE: Número Real (contact_phone) > wa_id
        const target = chat.contact_phone || chat.wa_id;

        const baseUrl = config.instanceUrl.replace(/\/$/, "");
        const url = `${baseUrl}/message/sendText/${config.instanceName.trim()}`;

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
    },

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


import { appBackend } from './appBackend';
import { AttendanceTag } from '../types';

export const whatsappService = {
    /**
     * Verifica se o identificador é um LID (Linked ID) técnico do WhatsApp.
     */
    isLid: (id: string) => {
        if (!id) return false;
        const clean = id.split('@')[0].split(':')[0].replace(/\D/g, '');
        return clean.length > 13;
    },

    /**
     * Tenta extrair o número de telefone real de uma string suja
     */
    extractActualNumber: (raw: string) => {
        if (!raw) return null;
        const partBeforeAt = raw.split('@')[0];
        const cleanNumber = partBeforeAt.split(':')[0].replace(/\D/g, '');
        if (cleanNumber.length >= 10 && cleanNumber.length <= 13) {
            return cleanNumber;
        }
        return null;
    },

    /**
     * Zera o contador de mensagens não lidas de um chat
     */
    markAsRead: async (chatId: string) => {
        const { error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .update({ unread_count: 0 })
            .eq('id', chatId);
        if (error) console.error("Erro ao limpar notificações:", error);
        return !error;
    },

    /**
     * Busca tags de atendimento
     */
    getTags: async (): Promise<AttendanceTag[]> => {
        const { data, error } = await appBackend.client
            .from('crm_attendance_tags')
            .select('*')
            .order('name');
        if (error) throw error;
        return (data || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            color: t.color,
            createdAt: t.created_at
        }));
    },

    /**
     * Salva ou atualiza uma tag
     */
    saveTag: async (tag: Partial<AttendanceTag>) => {
        const payload = {
            name: tag.name,
            color: tag.color
        };
        const { error } = tag.id 
            ? await appBackend.client.from('crm_attendance_tags').update(payload).eq('id', tag.id)
            : await appBackend.client.from('crm_attendance_tags').insert([payload]);
        
        if (error) throw error;
        return true;
    },

    /**
     * Exclui uma tag
     */
    deleteTag: async (id: string) => {
        const { error } = await appBackend.client
            .from('crm_attendance_tags')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    /**
     * Exclui um chat/atendimento permanentemente
     */
    deleteChat: async (chatId: string) => {
        const { error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .delete()
            .eq('id', chatId);
        if (error) throw error;
        return true;
    },

    /**
     * Atualiza a tag de um chat
     */
    updateChatTag: async (chatId: string, tag: string | null) => {
        const { error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .update({ 
                tag: tag, 
                updated_at: new Date().toISOString()
            })
            .eq('id', chatId);
        if (error) throw error;
        return true;
    },

    /**
     * Atualiza a etapa (status legado) do atendimento
     */
    updateChatStatus: async (chatId: string, status: 'open' | 'pending' | 'waiting' | 'closed') => {
        const { error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', chatId);
        if (error) throw error;
        return true;
    },

    /**
     * Identifica um contato em qualquer tabela do sistema (V38 - Otimizado)
     */
    identifyContactGlobally: async (identifier: string, pushName?: string) => {
        const actualNum = whatsappService.extractActualNumber(identifier);
        if (!actualNum) return null;

        const last8 = actualNum.slice(-8);

        const { data: collab } = await appBackend.client
            .from('crm_collaborators')
            .select('id, full_name, email, phone, cellphone')
            .or(`phone.ilike.%${last8}%,cellphone.ilike.%${last8}%`)
            .maybeSingle();
        if (collab) return {
            id: collab.id,
            name: collab.full_name,
            type: 'collaborator',
            label: 'Equipe VOLL (RH)',
            color: 'text-blue-600 bg-blue-50 border-blue-100',
            tab: 'hr'
        };

        const { data: franchise } = await appBackend.client
            .from('crm_franchises')
            .select('id, franchisee_name, phone')
            .ilike('phone', `%${last8}%`)
            .maybeSingle();
        if (franchise) return { 
            id: franchise.id, 
            name: franchise.franchisee_name, 
            type: 'franchise', 
            label: 'Franqueado',
            color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
            tab: 'franchises'
        };

        const { data: deal } = await appBackend.client
            .from('crm_deals')
            .select('id, contact_name, company_name, phone, stage')
            .ilike('phone', `%${last8}%`)
            .maybeSingle();
        if (deal) return { 
            id: deal.id, 
            name: deal.company_name || deal.contact_name, 
            type: 'student', 
            label: deal.stage === 'closed' ? 'Aluno' : 'Lead',
            color: 'text-purple-600 bg-purple-50 border-purple-100',
            tab: 'students'
        };

        const { data: teacher } = await appBackend.client
            .from('crm_teachers')
            .select('id, full_name, phone')
            .ilike('phone', `%${last8}%`)
            .maybeSingle();
        if (teacher) return { 
            id: teacher.id, 
            name: teacher.full_name, 
            type: 'teacher', 
            label: 'Professor',
            color: 'text-orange-600 bg-orange-50 border-orange-100',
            tab: 'teachers'
        };

        const { data: studio } = await appBackend.client
            .from('crm_partner_studios')
            .select('id, fantasy_name, phone')
            .ilike('phone', `%${last8}%`)
            .maybeSingle();
        if (studio) return { 
            id: studio.id, 
            name: studio.fantasy_name, 
            type: 'studio', 
            label: 'Studio Parceiro',
            color: 'text-teal-600 bg-teal-50 border-teal-100',
            tab: 'partner_studios'
        };

        return null;
    },

    associateLidWithPhone: async (chatId: string, phone: string, name: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        const { error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .update({ 
                contact_phone: cleanPhone,
                contact_name: name,
                updated_at: new Date().toISOString()
            })
            .eq('id', chatId);
        
        if (error) throw error;
        return true;
    },

    getOrCreateChat: async (waId: string, pushName: string) => {
        const cleanId = waId.split('@')[0];
        const { data: existingChat } = await appBackend.client
            .from('crm_whatsapp_chats')
            .select('*')
            .eq('wa_id', cleanId)
            .maybeSingle();

        if (existingChat) {
            return existingChat;
        }

        const contact = await whatsappService.identifyContactGlobally(waId, pushName);
        const finalPhone = contact?.id ? contact.id : whatsappService.extractActualNumber(waId);

        const { data: newChat, error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .insert([{
                wa_id: cleanId,
                contact_name: contact?.name || pushName || cleanId,
                contact_phone: finalPhone,
                status: 'open',
                last_message: 'Início do atendimento'
            }])
            .select()
            .single();
        
        if (error) throw error;
        return newChat;
    },

    sendTextMessage: async (chat: any, text: string) => {
        const config = await appBackend.getWhatsAppConfig();
        if (!config) throw new Error("WhatsApp não configurado.");
        const target = chat.contact_phone && !whatsappService.isLid(chat.contact_phone) 
            ? chat.contact_phone 
            : chat.wa_id;

        const baseUrl = config.instanceUrl.replace(/\/$/, "");
        const url = `${baseUrl}/message/sendText/${config.instanceName.trim()}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'apikey': config.apiKey.trim(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: target, options: { delay: 1200, presence: "composing" }, text: text })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Erro na API Evolution");
        return data;
    },

    syncMessage: async (chatId: string, text: string, senderType: 'user' | 'agent' | 'system', waMessageId?: string) => {
        const { data, error } = await appBackend.client
            .from('crm_whatsapp_messages')
            .insert([{ chat_id: chatId, text, sender_type: senderType, wa_message_id: waMessageId, status: 'sent' }])
            .select().single();
        if (error) throw error;

        const { data: chat } = await appBackend.client.from('crm_whatsapp_chats').select('status').eq('id', chatId).single();
        
        const updates: any = { last_message: text, updated_at: new Date().toISOString() };
        
        if (chat?.status === 'open' && senderType === 'agent') {
            updates.status = 'pending';
        }

        await appBackend.client
            .from('crm_whatsapp_chats')
            .update(updates)
            .eq('id', chatId);
        return data;
    }
};

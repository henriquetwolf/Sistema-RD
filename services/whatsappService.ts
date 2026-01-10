
import { appBackend } from './appBackend';
import { AttendanceFunnel } from '../types';

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
     * Busca funis de atendimento
     */
    getFunnels: async (): Promise<AttendanceFunnel[]> => {
        const { data, error } = await appBackend.client
            .from('crm_attendance_funnels')
            .select('*')
            .order('name');
        if (error) throw error;
        return (data || []).map((f: any) => ({
            id: f.id,
            name: f.name,
            stages: f.stages || []
        }));
    },

    /**
     * Salva ou atualiza um funil de atendimento
     */
    saveFunnel: async (funnel: AttendanceFunnel) => {
        const { error } = await appBackend.client
            .from('crm_attendance_funnels')
            .upsert({
                id: funnel.id || undefined,
                name: funnel.name,
                stages: funnel.stages
            });
        if (error) throw error;
        return true;
    },

    /**
     * Exclui um funil
     */
    deleteFunnel: async (id: string) => {
        const { error } = await appBackend.client
            .from('crm_attendance_funnels')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    /**
     * Atualiza o funil e etapa de um chat
     */
    moveChat: async (chatId: string, funnelId: string, stageId: string) => {
        const { error } = await appBackend.client
            .from('crm_whatsapp_chats')
            .update({ 
                funnel_id: funnelId, 
                stage_id: stageId,
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

        // 1. Prioridade RH: Buscar em Colaboradores
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

        // 2. Buscar em Franqueados
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

        // 3. Buscar em Alunos / Leads
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

        // 4. Buscar em Professores
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

        // 5. Buscar em Studios Parceiros
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

    /**
     * Associa manualmente um wa_id (LID) a um telefone real e nome
     */
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

    /**
     * Cria ou recupera um chat unificado
     */
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


import { createClient, Session } from '@supabase/supabase-js';
import { 
  SavedPreset, FormModel, SurveyModel, FormAnswer, Contract, ContractFolder, 
  CertificateModel, EventModel, Workshop, EventRegistration, 
  EventBlock, Role, Banner, PartnerStudio, InstructorLevel, InventoryRecord, 
  SyncJob, ActivityLog, CollaboratorSession, BillingNegotiation, FormFolder, 
  CourseInfo, TeacherNews, SupportTicket, SupportMessage, SupportStatus, WAConfig
} from '../types';

export interface CompanySetting {
  id: string;
  legalName: string;
  cnpj: string;
  webhookUrl?: string;
  productTypes?: string[];
  productIds?: string[];
}

export interface PipelineStage {
  id: string;
  title: string;
  color?: string;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
}

export interface WebhookTrigger {
  id: string;
  pipelineName: string;
  stageId: string;
  payloadJson?: string;
}

const APP_URL = (import.meta as any).env?.VITE_APP_SUPABASE_URL;
const APP_KEY = (import.meta as any).env?.VITE_APP_SUPABASE_ANON_KEY;

const isConfigured = !!APP_URL && !!APP_KEY;

const supabase = createClient(
  APP_URL || 'https://placeholder.supabase.co', 
  APP_KEY || 'placeholder'
);

export const appBackend = {
  isLocalMode: !isConfigured,
  client: supabase,

  auth: {
    signIn: async (email: string, password: string) => {
      if (!isConfigured) return { data: { user: { id: 'admin', email: 'admin@voll.com' }, session: {} }, error: null };
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    signOut: async () => isConfigured && await supabase.auth.signOut(),
    getSession: async () => isConfigured ? (await supabase.auth.getSession()).data.session : null,
    onAuthStateChange: (callback: (session: Session | null) => void) => {
      if (!isConfigured) return { data: { subscription: { unsubscribe: () => {} } } };
      return supabase.auth.onAuthStateChange((_event, session) => callback(session));
    }
  },

  // --- SISTEMA DE SUPORTE (TICKETS) ---
  getTickets: async (filters?: { status?: string; senderType?: string; senderId?: string }): Promise<SupportTicket[]> => {
      if (!isConfigured) return [];
      let query = supabase.from('crm_support_tickets').select('*').order('updated_at', { ascending: false });
      
      if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters?.senderType && filters.senderType !== 'all') query = query.eq('sender_type', filters.senderType);
      if (filters?.senderId) query = query.eq('sender_id', filters.senderId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((d: any) => ({
          id: d.id, title: d.title, description: d.description, category: d.category,
          priority: d.priority, status: d.status, senderId: d.sender_id,
          senderName: d.sender_name, senderType: d.sender_type, assignedTo: d.assigned_to,
          createdAt: d.created_at, updatedAt: d.updated_at
      }));
  },

  createTicket: async (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<SupportTicket> => {
      if (!isConfigured) throw new Error("Database not configured");
      const payload = {
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          status: 'open',
          sender_id: ticket.senderId,
          sender_name: ticket.senderName,
          sender_type: ticket.senderType
      };
      const { data, error } = await supabase.from('crm_support_tickets').insert([payload]).select().single();
      if (error) throw error;

      // Adiciona a primeira mensagem (descrição do ticket)
      await appBackend.addSupportMessage({
          ticketId: data.id,
          senderId: ticket.senderId,
          senderName: ticket.senderName,
          senderType: 'user',
          content: ticket.description
      });

      return {
          id: data.id, title: data.title, description: data.description, category: data.category,
          priority: data.priority, status: data.status, senderId: data.sender_id,
          senderName: data.sender_name, senderType: data.sender_type,
          createdAt: data.created_at, updatedAt: data.updated_at
      };
  },

  updateTicketStatus: async (id: string, status: SupportStatus): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
  },

  getTicketMessages: async (ticketId: string): Promise<SupportMessage[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((m: any) => ({
          id: m.id, ticketId: m.ticket_id, senderId: m.sender_id, senderName: m.sender_name,
          senderType: m.sender_type, content: m.content, attachments: m.attachments,
          createdAt: m.created_at
      }));
  },

  addSupportMessage: async (msg: Omit<SupportMessage, 'id' | 'createdAt'>): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_support_messages').insert([{
          ticket_id: msg.ticketId, sender_id: msg.senderId, sender_name: msg.senderName,
          sender_type: msg.senderType, content: msg.content, attachments: msg.attachments
      }]);
      if (error) throw error;

      // Ao enviar mensagem, se for admin, marca como "waiting" (esperando resposta do user) ou "in_progress"
      // Se for user enviando, marca como "open" ou "in_progress" se já estiver sendo atendido
      await supabase.from('crm_support_tickets').update({ updated_at: new Date().toISOString() }).eq('id', msg.ticketId);
  },

  // --- MÉTODOS EXISTENTES ---
  getAppLogo: async () => await appBackend.getAppSetting('app_logo_url'),
  saveAppLogo: async (u: string) => await appBackend.saveAppSetting('app_logo_url', u),
  getAppSetting: async (k: string) => isConfigured ? (await supabase.from('app_settings').select('value').eq('key', k).maybeSingle()).data?.value : null,
  saveAppSetting: async (k: string, v: any) => isConfigured && await supabase.from('app_settings').upsert({ key: k, value: v }),
  logActivity: async (log: any) => isConfigured && await supabase.from('crm_activity_logs').insert([log]),
  getSyncJobs: async () => isConfigured ? (await supabase.from('crm_sync_jobs').select('*')).data : [],
  getPresets: async () => isConfigured ? (await supabase.from('app_presets').select('*')).data : [],
  savePreset: async (p: any) => isConfigured && (await supabase.from('app_presets').insert(p).select().single()).data,
  deletePreset: async (id: string) => isConfigured && await supabase.from('app_presets').delete().eq('id', id),
  getRoles: async () => isConfigured ? (await supabase.from('crm_roles').select('*')).data : [],
  getBanners: async (a: string) => isConfigured ? (await supabase.from('app_banners').select('*').eq('target_audience', a)).data : [],
  getCompanies: async () => isConfigured ? (await supabase.from('crm_companies').select('*')).data : [],
  getInstructorLevels: async () => isConfigured ? (await supabase.from('crm_instructor_levels').select('*')).data : [],
  getPartnerStudios: async () => isConfigured ? (await supabase.from('crm_partner_studios').select('*')).data : [],
  getTeacherNews: async () => isConfigured ? (await supabase.from('crm_teacher_news').select('*')).data : [],
  getFormFolders: async () => isConfigured ? (await supabase.from('crm_form_folders').select('*')).data : [],
  getForms: async () => isConfigured ? (await supabase.from('crm_forms').select('*')).data : [],
  getFormById: async (id: string) => isConfigured ? (await supabase.from('crm_forms').select('*').eq('id', id).maybeSingle()).data : null,
  getSurveys: async () => isConfigured ? (await supabase.from('crm_surveys').select('*')).data : [],
  getEligibleSurveysForStudent: async (id: string) => isConfigured ? (await supabase.from('crm_surveys').select('*').order('created_at', { ascending: false })).data : [],
  getContracts: async () => isConfigured ? (await supabase.from('app_contracts').select('*')).data : [],
  getFolders: async () => isConfigured ? (await supabase.from('app_contract_folders').select('*')).data : [],
  getInventory: async () => isConfigured ? (await supabase.from('crm_inventory').select('*')).data : [],
  getInventorySecurityMargin: async () => 5,
  getCourseInfos: async () => isConfigured ? (await supabase.from('crm_course_info').select('*')).data : [],
  saveSyncJob: async (j: any) => isConfigured && await supabase.from('crm_sync_jobs').upsert(j),
  deleteSyncJob: async (id: string) => isConfigured && await supabase.from('crm_sync_jobs').delete().eq('id', id),
  updateJobStatus: async (id: string, s: string, l: string, m: string) => isConfigured && await supabase.from('crm_sync_jobs').update({ status: s, last_sync: l, last_message: m }).eq('id', id),
  saveSupportMessage: async (m: any) => isConfigured && await supabase.from('crm_support_messages').insert([m]),

  /* Added missing methods */
  getContractById: async (id: string): Promise<Contract | null> => {
      if (!isConfigured) return null;
      const { data, error } = await supabase.from('app_contracts').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
  },

  getPipelines: async (): Promise<Pipeline[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_pipelines').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data || [];
  },

  getWebhookTriggers: async (): Promise<WebhookTrigger[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_webhook_triggers').select('*');
      if (error) throw error;
      return data || [];
  },

  savePipeline: async (p: Pipeline) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_pipelines').upsert(p);
      if (error) throw error;
  },

  deletePipeline: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_pipelines').delete().eq('id', id);
      if (error) throw error;
  },

  saveTeacherNews: async (n: any) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_teacher_news').upsert(n);
      if (error) throw error;
  },

  deleteTeacherNews: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_teacher_news').delete().eq('id', id);
      if (error) throw error;
  },

  submitForm: async (formId: string, answers: FormAnswer[], isLeadCapture: boolean, studentId?: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_form_submissions').insert([{
          form_id: formId,
          answers: answers,
          student_id: studentId
      }]);
      if (error) throw error;
      
      const { data: form } = await supabase.from('crm_forms').select('submissionsCount').eq('id', formId).single();
      await supabase.from('crm_forms').update({ submissionsCount: (form?.submissionsCount || 0) + 1 }).eq('id', formId);
  },

  saveFormFolder: async (f: FormFolder) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_form_folders').upsert(f);
      if (error) throw error;
  },

  deleteFormFolder: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_form_folders').delete().eq('id', id);
      if (error) throw error;
  },

  saveForm: async (f: FormModel) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_forms').upsert(f);
      if (error) throw error;
  },

  getFormSubmissions: async (formId: string) => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_form_submissions').select('*').eq('form_id', formId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
  },

  deleteForm: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_forms').delete().eq('id', id);
      if (error) throw error;
  },

  signContract: async (contractId: string, signerId: string, signatureData: string) => {
      if (!isConfigured) return;
      const { data: contract } = await supabase.from('app_contracts').select('*').eq('id', contractId).single();
      if (!contract) throw new Error("Contract not found");
      
      const updatedSigners = contract.signers.map((s: any) => 
          s.id === signerId ? { ...s, status: 'signed', signatureData, signedAt: new Date().toISOString() } : s
      );

      const allSigned = updatedSigners.every((s: any) => s.status === 'signed');

      const { error } = await supabase.from('app_contracts').update({
          signers: updatedSigners,
          status: allSigned ? 'signed' : 'sent'
      }).eq('id', contractId);
      if (error) throw error;
  },

  saveFolder: async (f: ContractFolder) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('app_contract_folders').upsert(f);
      if (error) throw error;
  },

  deleteFolder: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('app_contract_folders').delete().eq('id', id);
      if (error) throw error;
  },

  saveContract: async (c: Contract) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('app_contracts').upsert(c);
      if (error) throw error;
  },

  deleteContract: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('app_contracts').delete().eq('id', id);
      if (error) throw error;
  },

  issueCertificate: async (studentDealId: string, templateId: string): Promise<string> => {
      if (!isConfigured) return '';
      const hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const { error } = await supabase.from('crm_student_certificates').insert([{
          student_deal_id: studentDealId,
          certificate_id: templateId,
          hash: hash,
          issued_at: new Date().toISOString()
      }]);
      if (error) throw error;
      return hash;
  },

  getCertificates: async (): Promise<CertificateModel[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_certificates').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
  },

  deleteCertificate: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_certificates').delete().eq('id', id);
      if (error) throw error;
  },

  saveCertificate: async (c: CertificateModel) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_certificates').upsert(c);
      if (error) throw error;
  },

  getStudentCertificate: async (hash: string) => {
      if (!isConfigured) return null;
      const { data: certInfo, error } = await supabase.from('crm_student_certificates').select('*, crm_deals(contact_name, course_city), crm_certificates(*)').eq('hash', hash).single();
      if (error) throw error;
      return {
          studentName: certInfo.crm_deals.contact_name,
          studentCity: certInfo.crm_deals.course_city || 'VOLL',
          template: certInfo.crm_certificates,
          issuedAt: certInfo.issued_at
      };
  },

  deleteStudentCertificate: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_student_certificates').delete().eq('id', id);
      if (error) throw error;
  },

  getEvents: async (): Promise<EventModel[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_events').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
  },

  getWorkshops: async (eventId: string): Promise<Workshop[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_workshops').select('*').eq('event_id', eventId);
      if (error) throw error;
      return data || [];
  },

  getBlocks: async (eventId: string): Promise<EventBlock[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_event_blocks').select('*').eq('event_id', eventId);
      if (error) throw error;
      return data || [];
  },

  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_event_registrations').select('*').eq('event_id', eventId);
      if (error) throw error;
      return data || [];
  },

  saveEvent: async (e: EventModel) => {
      if (!isConfigured) return e;
      const { data, error } = await supabase.from('crm_events').upsert(e).select().single();
      if (error) throw error;
      return data;
  },

  deleteEvent: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_events').delete().eq('id', id);
      if (error) throw error;
  },

  saveBlock: async (b: EventBlock) => {
      if (!isConfigured) return b;
      const { data, error } = await supabase.from('crm_event_blocks').upsert(b).select().single();
      if (error) throw error;
      return data;
  },

  deleteBlock: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_event_blocks').delete().eq('id', id);
      if (error) throw error;
  },

  saveWorkshop: async (w: Workshop) => {
      if (!isConfigured) return w;
      const { data, error } = await supabase.from('crm_workshops').upsert(w).select().single();
      if (error) throw error;
      return data;
  },

  deleteWorkshop: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_workshops').delete().eq('id', id);
      if (error) throw error;
  },

  getWhatsAppConfig: async () => {
      return await appBackend.getAppSetting('whatsapp_config');
  },

  saveWhatsAppConfig: async (config: WAConfig) => {
      await appBackend.saveAppSetting('whatsapp_config', config);
  },

  savePartnerStudio: async (s: PartnerStudio) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_partner_studios').upsert(s);
      if (error) throw error;
  },

  deletePartnerStudio: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_partner_studios').delete().eq('id', id);
      if (error) throw error;
  },

  saveInventoryRecord: async (r: InventoryRecord) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_inventory').upsert(r);
      if (error) throw error;
  },

  deleteInventoryRecord: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_inventory').delete().eq('id', id);
      if (error) throw error;
  },

  saveSurvey: async (s: SurveyModel) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_surveys').upsert(s);
      if (error) throw error;
  },

  getBillingNegotiations: async (): Promise<BillingNegotiation[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_billing_negotiations').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
  },

  saveBillingNegotiation: async (n: Partial<BillingNegotiation>) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_billing_negotiations').upsert(n);
      if (error) throw error;
  },

  deleteBillingNegotiation: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_billing_negotiations').delete().eq('id', id);
      if (error) throw error;
  },
};

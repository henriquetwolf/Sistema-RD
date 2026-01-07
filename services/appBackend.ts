
import { createClient, Session } from '@supabase/supabase-js';
import { SavedPreset, FormModel, SurveyModel, FormAnswer, Contract, ContractFolder, CertificateModel, StudentCertificate, EventModel, Workshop, EventRegistration, EventBlock, Role, Banner, PartnerStudio, InstructorLevel, InventoryRecord, SyncJob, ActivityLog, CollaboratorSession, BillingNegotiation, FormFolder, CourseInfo, TeacherNews, Broadcast, Ticket, TicketMessage } from '../types';

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
      if (!isConfigured) return { data: { user: { email }, session: {} }, error: null };
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    signOut: async () => { if (isConfigured) await supabase.auth.signOut(); else window.location.reload(); },
    getSession: async () => isConfigured ? (await supabase.auth.getSession()).data.session : null,
    onAuthStateChange: (callback: (session: Session | null) => void) => {
      if (!isConfigured) return { data: { subscription: { unsubscribe: () => {} } } };
      return supabase.auth.onAuthStateChange((_event, session) => callback(session));
    }
  },

  // --- SUPORTE / TICKETS ---
  getTickets: async (filters?: { senderId?: string; status?: string; senderType?: string }): Promise<Ticket[]> => {
      if (!isConfigured) return [];
      let query = supabase.from('crm_tickets').select('*').order('updated_at', { ascending: false });
      
      if (filters?.senderId) query = query.eq('sender_id', filters.senderId);
      if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters?.senderType && filters.senderType !== 'all') query = query.eq('sender_type', filters.senderType);
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((d: any) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          status: d.status,
          priority: d.priority,
          senderId: d.sender_id,
          senderName: d.sender_name,
          senderType: d.sender_type,
          createdAt: d.created_at,
          updatedAt: d.updated_at
      }));
  },

  createTicket: async (ticket: Partial<Ticket>, firstMessage: string): Promise<Ticket> => {
      if (!isConfigured) throw new Error("Backend não configurado.");
      
      const { data, error } = await supabase.from('crm_tickets').insert([{
          title: ticket.title,
          category: ticket.category || 'Geral',
          status: 'open',
          priority: ticket.priority || 'medium',
          sender_id: ticket.senderId,
          sender_name: ticket.senderName,
          sender_type: ticket.senderType
      }]).select().single();
      
      if (error) throw error;

      // Adiciona a primeira mensagem (descrição)
      await supabase.from('crm_ticket_messages').insert([{
          ticket_id: data.id,
          content: firstMessage,
          sender_name: ticket.senderName,
          sender_type: 'user'
      }]);

      return {
          id: data.id,
          title: data.title,
          category: data.category,
          status: data.status,
          priority: data.priority,
          senderId: data.sender_id,
          senderName: data.sender_name,
          senderType: data.sender_type,
          createdAt: data.created_at,
          updatedAt: data.updated_at
      };
  },

  getTicketMessages: async (ticketId: string): Promise<TicketMessage[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase
          .from('crm_ticket_messages')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []).map((d: any) => ({
          id: d.id,
          ticketId: d.ticket_id,
          content: d.content,
          senderName: d.sender_name,
          senderType: d.sender_type,
          createdAt: d.created_at
      }));
  },

  addTicketMessage: async (ticketId: string, content: string, senderName: string, senderType: 'agent' | 'user'): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_ticket_messages').insert([{
          ticket_id: ticketId,
          content,
          sender_name: senderName,
          sender_type: senderType
      }]);
      if (error) throw error;

      // Atualiza o updatedAt do ticket para ele subir na lista do admin
      await supabase.from('crm_tickets').update({ updated_at: new Date().toISOString() }).eq('id', ticketId);
  },

  updateTicketStatus: async (ticketId: string, status: Ticket['status']): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', ticketId);
      if (error) throw error;
  },

  // --- LOGGING ---
  /* Fix for: Property 'logActivity' does not exist on type ... */
  logActivity: async (log: Partial<ActivityLog>) => {
      if (!isConfigured) return;
      await supabase.from('app_activity_logs').insert([{
          user_name: log.userName || 'System',
          action: log.action,
          module: log.module,
          details: log.details,
          record_id: log.recordId
      }]);
  },

  // --- EXISTING METHODS ---
  getAppSetting: async (k: string) => isConfigured ? (await supabase.from('app_settings').select('value').eq('key', k).maybeSingle()).data?.value : null,
  saveAppSetting: async (k: string, v: any) => isConfigured && await supabase.from('app_settings').upsert({ key: k, value: v }),
  getAppLogo: async () => await appBackend.getAppSetting('app_logo_url'),
  saveAppLogo: async (u: string) => await appBackend.saveAppSetting('app_logo_url', u),
  getInventorySecurityMargin: async () => Number(await appBackend.getAppSetting('inventory_security_margin') || 5),
  saveInventorySecurityMargin: async (v: number) => await appBackend.saveAppSetting('inventory_security_margin', v),
  getWhatsAppConfig: async () => await appBackend.getAppSetting('whatsapp_config'),
  saveWhatsAppConfig: async (c: any) => await appBackend.saveAppSetting('whatsapp_config', c),
  
  // --- SYNC JOBS ---
  getSyncJobs: async () => isConfigured ? (await supabase.from('crm_sync_jobs').select('*')).data : [],
  saveSyncJob: async (j: any) => isConfigured && await supabase.from('crm_sync_jobs').upsert(j),
  /* Fix for: Property 'updateJobStatus' does not exist on type ... */
  updateJobStatus: async (id: string, status: string, lastSync: string, lastMessage: string) => {
      if (!isConfigured) return;
      await supabase.from('crm_sync_jobs').update({ status, last_sync: lastSync, last_message: lastMessage }).eq('id', id);
  },
  /* Fix for: Property 'deleteSyncJob' does not exist on type ... */
  deleteSyncJob: async (id: string) => isConfigured && await supabase.from('crm_sync_jobs').delete().eq('id', id),

  // --- PRESETS ---
  getPresets: async () => isConfigured ? (await supabase.from('app_presets').select('*')).data : [],
  savePreset: async (p: any) => isConfigured && (await supabase.from('app_presets').insert(p).select().single()).data,
  /* Fix for: Property 'deletePreset' does not exist on type ... */
  deletePreset: async (id: string) => isConfigured && await supabase.from('app_presets').delete().eq('id', id),

  // --- CRM & PIPELINES ---
  /* Fix for: Property 'getPipelines' does not exist on type ... */
  getPipelines: async (): Promise<Pipeline[]> => isConfigured ? (await supabase.from('crm_pipelines').select('*')).data : [],
  /* Fix for: Property 'savePipeline' does not exist on type ... */
  savePipeline: async (p: Pipeline) => isConfigured && await supabase.from('crm_pipelines').upsert(p),
  /* Fix for: Property 'deletePipeline' does not exist on type ... */
  deletePipeline: async (id: string) => isConfigured && await supabase.from('crm_pipelines').delete().eq('id', id),
  /* Fix for: Property 'getWebhookTriggers' does not exist on type ... */
  getWebhookTriggers: async (): Promise<WebhookTrigger[]> => isConfigured ? (await supabase.from('crm_webhook_triggers').select('*')).data : [],

  getRoles: async () => isConfigured ? (await supabase.from('crm_roles').select('*')).data : [],
  saveRole: async (r: any) => isConfigured && await supabase.from('crm_roles').upsert(r),
  getBanners: async (a: any) => isConfigured ? (await supabase.from('app_banners').select('*').eq('target_audience', a)).data : [],
  saveBanner: async (b: any) => isConfigured && await supabase.from('app_banners').upsert(b),
  getCompanies: async (): Promise<CompanySetting[]> => isConfigured ? (await supabase.from('crm_companies').select('*')).data : [],
  saveCompany: async (c: any) => isConfigured && await supabase.from('crm_companies').upsert(c),
  getInstructorLevels: async () => isConfigured ? (await supabase.from('crm_instructor_levels').select('*')).data : [],
  saveInstructorLevel: async (l: any) => isConfigured && await supabase.from('crm_instructor_levels').upsert(l),
  
  // --- PARTNER STUDIOS ---
  getPartnerStudios: async () => isConfigured ? (await supabase.from('crm_partner_studios').select('*')).data : [],
  savePartnerStudio: async (s: any) => isConfigured && await supabase.from('crm_partner_studios').upsert(s),
  /* Fix for: Property 'deletePartnerStudio' does not exist on type ... */
  deletePartnerStudio: async (id: string) => isConfigured && await supabase.from('crm_partner_studios').delete().eq('id', id),

  // --- TEACHER NEWS ---
  getTeacherNews: async () => isConfigured ? (await supabase.from('crm_teacher_news').select('*')).data : [],
  saveTeacherNews: async (n: any) => isConfigured && await supabase.from('crm_teacher_news').upsert(n),
  /* Fix for: Property 'deleteTeacherNews' does not exist on type ... */
  deleteTeacherNews: async (id: string) => isConfigured && await supabase.from('crm_teacher_news').delete().eq('id', id),

  // --- FORMS & SURVEYS ---
  getForms: async () => isConfigured ? (await supabase.from('crm_forms').select('*')).data : [],
  /* Fix for: Property 'getFormById' does not exist on type ... */
  getFormById: async (id: string) => isConfigured ? (await supabase.from('crm_forms').select('*').eq('id', id).maybeSingle()).data : null,
  saveForm: async (f: any) => isConfigured && await supabase.from('crm_forms').upsert(f),
  /* Fix for: Property 'deleteForm' does not exist on type ... */
  deleteForm: async (id: string) => isConfigured && await supabase.from('crm_forms').delete().eq('id', id),
  getFormFolders: async () => isConfigured ? (await supabase.from('crm_form_folders').select('*')).data : [],
  saveFormFolder: async (f: any) => isConfigured && await supabase.from('crm_form_folders').upsert(f),
  /* Fix for: Property 'deleteFormFolder' does not exist on type ... */
  deleteFormFolder: async (id: string) => isConfigured && await supabase.from('crm_form_folders').delete().eq('id', id),
  getSurveys: async () => isConfigured ? (await supabase.from('crm_surveys').select('*')).data : [],
  saveSurvey: async (s: any) => isConfigured && await supabase.from('crm_surveys').upsert(s),
  getEligibleSurveysForStudent: async (sid: string) => isConfigured ? (await supabase.from('crm_surveys').select('*').eq('is_active', true)).data : [],
  submitForm: async (fid: string, ans: any, lead: boolean, sid?: string) => isConfigured && await supabase.from('crm_form_submissions').insert([{ form_id: fid, answers: ans, student_id: sid }]),
  getFormSubmissions: async (fid: string) => isConfigured ? (await supabase.from('crm_form_submissions').select('*').eq('form_id', fid)).data : [],
  
  // --- CONTRACTS ---
  getFolders: async () => isConfigured ? (await supabase.from('app_contract_folders').select('*')).data : [],
  saveFolder: async (f: any) => isConfigured && await supabase.from('app_contract_folders').upsert(f),
  /* Fix for: Property 'deleteFolder' does not exist on type ... */
  deleteFolder: async (id: string) => isConfigured && await supabase.from('app_contract_folders').delete().eq('id', id),
  getContracts: async () => isConfigured ? (await supabase.from('app_contracts').select('*')).data : [],
  getContractById: async (id: string) => isConfigured ? (await supabase.from('app_contracts').select('*').eq('id', id).maybeSingle()).data : null,
  saveContract: async (c: any) => isConfigured && await supabase.from('app_contracts').upsert(c),
  /* Fix for: Property 'deleteContract' does not exist on type ... */
  deleteContract: async (id: string) => isConfigured && await supabase.from('app_contracts').delete().eq('id', id),
  signContract: async (cid: string, sid: string, sig: string) => isConfigured && await supabase.from('app_contracts').update({ signers: sig }).eq('id', cid),
  
  // --- CERTIFICATES ---
  getCertificates: async () => isConfigured ? (await supabase.from('crm_certificates').select('*')).data : [],
  saveCertificate: async (c: any) => isConfigured && await supabase.from('crm_certificates').upsert(c),
  /* Fix for: Property 'deleteCertificate' does not exist on type ... */
  deleteCertificate: async (id: string) => isConfigured && await supabase.from('crm_certificates').delete().eq('id', id),
  issueCertificate: async (sid: string, tid: string) => isConfigured && (await supabase.from('crm_student_certificates').insert([{ student_deal_id: sid, certificate_template_id: tid, hash: 'h' }])).data,
  getStudentCertificate: async (h: string) => isConfigured ? (await supabase.from('crm_student_certificates').select('*').eq('hash', h).single()).data : null,
  /* Fix for: Property 'deleteStudentCertificate' does not exist on type ... */
  deleteStudentCertificate: async (id: string) => isConfigured && await supabase.from('crm_student_certificates').delete().eq('id', id),

  // --- EVENTS ---
  getEvents: async () => isConfigured ? (await supabase.from('crm_events').select('*')).data : [],
  saveEvent: async (e: any) => isConfigured && (await supabase.from('crm_events').upsert(e).select().single()).data,
  /* Fix for: Property 'deleteEvent' does not exist on type ... */
  deleteEvent: async (id: string) => isConfigured && await supabase.from('crm_events').delete().eq('id', id),
  getBlocks: async (eid: string) => isConfigured ? (await supabase.from('crm_event_blocks').select('*').eq('event_id', eid)).data : [],
  saveBlock: async (b: any) => isConfigured && (await supabase.from('crm_event_blocks').upsert(b).select().single()).data,
  /* Fix for: Property 'deleteBlock' does not exist on type ... */
  deleteBlock: async (id: string) => isConfigured && await supabase.from('crm_event_blocks').delete().eq('id', id),
  getWorkshops: async (eid: string) => isConfigured ? (await supabase.from('crm_workshops').select('*').eq('event_id', eid)).data : [],
  saveWorkshop: async (w: any) => isConfigured && (await supabase.from('crm_workshops').upsert(w).select().single()).data,
  /* Fix for: Property 'deleteWorkshop' does not exist on type ... */
  deleteWorkshop: async (id: string) => isConfigured && await supabase.from('crm_workshops').delete().eq('id', id),
  getEventRegistrations: async (eid: string) => isConfigured ? (await supabase.from('crm_event_registrations').select('*').eq('event_id', eid)).data : [],
  saveEventRegistrations: async (eid: string, sid: string, sn: string, se: string, wids: string[]) => isConfigured && await supabase.from('crm_event_registrations').insert(wids.map(w => ({ event_id: eid, workshop_id: w, student_id: sid }))),
  
  // --- INVENTORY ---
  getInventory: async () => isConfigured ? (await supabase.from('crm_inventory').select('*')).data : [],
  saveInventoryRecord: async (r: any) => isConfigured && await supabase.from('crm_inventory').upsert(r),
  /* Fix for: Property 'deleteInventoryRecord' does not exist on type ... */
  deleteInventoryRecord: async (id: string) => isConfigured && await supabase.from('crm_inventory').delete().eq('id', id),
  
  // --- BILLING NEGOTIATIONS ---
  /* Fix for: Property 'getBillingNegotiations' does not exist on type ... */
  getBillingNegotiations: async (): Promise<BillingNegotiation[]> => isConfigured ? (await supabase.from('crm_billing_negotiations').select('*')).data : [],
  /* Fix for: Property 'saveBillingNegotiation' does not exist on type ... */
  saveBillingNegotiation: async (n: any) => isConfigured && await supabase.from('crm_billing_negotiations').upsert(n),
  /* Fix for: Property 'deleteBillingNegotiation' does not exist on type ... */
  deleteBillingNegotiation: async (id: string) => isConfigured && await supabase.from('crm_billing_negotiations').delete().eq('id', id),

  getCourseInfos: async () => isConfigured ? (await supabase.from('crm_course_info').select('*')).data : [],
  saveCourseInfo: async (i: any) => isConfigured && await supabase.from('crm_course_info').upsert(i)
};

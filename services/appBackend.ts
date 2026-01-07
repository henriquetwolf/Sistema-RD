
import { createClient, Session } from '@supabase/supabase-js';
import { SavedPreset, FormModel, SurveyModel, FormAnswer, Contract, ContractFolder, CertificateModel, StudentCertificate, EventModel, Workshop, EventRegistration, EventBlock, Role, Banner, PartnerStudio, InstructorLevel, InventoryRecord, SyncJob, ActivityLog, CollaboratorSession, BillingNegotiation, FormFolder, CourseInfo, TeacherNews, Broadcast, Ticket, TicketMessage } from '../types';

const APP_URL = (import.meta as any).env?.VITE_APP_SUPABASE_URL;
const APP_KEY = (import.meta as any).env?.VITE_APP_SUPABASE_ANON_KEY;

const isConfigured = !!APP_URL && !!APP_KEY;

const supabase = createClient(
  APP_URL || 'https://placeholder.supabase.co', 
  APP_KEY || 'placeholder'
);

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

export interface CompanySetting {
  id: string;
  legalName: string;
  cnpj: string;
  webhookUrl?: string;
  productTypes?: string[];
  productIds?: string[];
}

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
  getTickets: async (filters?: { senderId?: string; status?: string }): Promise<Ticket[]> => {
      if (!isConfigured) return [];
      let query = supabase.from('crm_tickets').select('*').order('updated_at', { ascending: false });
      if (filters?.senderId) query = query.eq('sender_id', filters.senderId);
      if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((d: any) => ({
          id: d.id, title: d.title, category: d.category, status: d.status, priority: d.priority,
          senderId: d.sender_id, senderName: d.sender_name, senderType: d.sender_type,
          createdAt: d.created_at, updatedAt: d.updated_at
      }));
  },

  createTicket: async (ticket: Partial<Ticket>, firstMessage: string): Promise<Ticket> => {
      if (!isConfigured) throw new Error("Backend não configurado.");
      const { data, error } = await supabase.from('crm_tickets').insert([{
          title: ticket.title, category: ticket.category || 'Geral', status: 'open', priority: ticket.priority || 'medium',
          sender_id: ticket.senderId, sender_name: ticket.senderName, sender_type: ticket.senderType
      }]).select().single();
      
      if (error) throw error;

      await supabase.from('crm_ticket_messages').insert([{
          ticket_id: data.id, content: firstMessage, sender_name: ticket.senderName, sender_type: 'user'
      }]);

      return {
          id: data.id, title: data.title, category: data.category, status: data.status, priority: data.priority,
          senderId: data.sender_id, senderName: data.sender_name, senderType: data.sender_type,
          createdAt: data.created_at, updatedAt: data.updated_at
      };
  },

  getTicketMessages: async (ticketId: string): Promise<TicketMessage[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((d: any) => ({
          id: d.id, ticketId: d.ticket_id, content: d.content, senderName: d.sender_name, senderType: d.sender_type, createdAt: d.created_at
      }));
  },

  addTicketMessage: async (ticketId: string, content: string, senderName: string, senderType: 'agent' | 'user'): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_ticket_messages').insert([{
          ticket_id: ticketId, content, sender_name: senderName, sender_type: senderType
      }]);
      if (error) throw error;

      await supabase.from('crm_tickets').update({ updated_at: new Date().toISOString() }).eq('id', ticketId);
  },

  updateTicketStatus: async (ticketId: string, status: Ticket['status']): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', ticketId);
      if (error) throw error;
  },

  // --- LOGS ---
  logActivity: async (log: Omit<ActivityLog, 'id' | 'createdAt' | 'userName'>): Promise<void> => {
      if (!isConfigured) return;
      let userName = 'Sistema';
      const savedCollab = sessionStorage.getItem('collaborator_session');
      if (savedCollab) userName = JSON.parse(savedCollab).name;
      else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) userName = user.email || 'Admin';
      }
      await supabase.from('crm_activity_logs').insert([{ user_name: userName, action: log.action, module: log.module, details: log.details, record_id: log.recordId }]);
  },

  getActivityLogs: async (limit = 100): Promise<ActivityLog[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_activity_logs').select('*').order('created_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return (data || []).map(d => ({ id: d.id, userName: d.user_name, action: d.action as any, module: d.module, details: d.details, recordId: d.record_id, createdAt: d.created_at }));
  },

  // --- BROADCASTS ---
  getBroadcasts: async (group?: string): Promise<Broadcast[]> => {
      if (!isConfigured) return [];
      let query = supabase.from('crm_broadcasts').select('*').order('created_at', { ascending: false });
      if (group) query = query.eq('target_group', group);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((d: any) => ({ id: d.id, title: d.title, content: d.content, imageUrl: d.image_url, targetGroup: d.target_group, targetFilter: d.target_filter, senderName: d.sender_name, createdAt: d.created_at }));
  },

  saveBroadcast: async (broadcast: Partial<Broadcast>): Promise<void> => {
      if (!isConfigured) return;
      const { data: { user } } = await supabase.auth.getUser();
      let senderName = user?.email || 'Admin';
      const savedCollab = sessionStorage.getItem('collaborator_session');
      if (savedCollab) senderName = JSON.parse(savedCollab).name;
      const { error } = await supabase.from('crm_broadcasts').insert([{ title: broadcast.title, content: broadcast.content, image_url: broadcast.imageUrl || null, target_group: broadcast.targetGroup, target_filter: broadcast.targetFilter || null, sender_name: senderName }]);
      if (error) throw error;
  },

  deleteBroadcast: async (id: string): Promise<void> => { if (isConfigured) await supabase.from('crm_broadcasts').delete().eq('id', id); },

  // --- BILLING ---
  getBillingNegotiations: async () => isConfigured ? (await supabase.from('crm_billing_negotiations').select('*').order('created_at', { ascending: false })).data : [],
  saveBillingNegotiation: async (n: any) => isConfigured && await supabase.from('crm_billing_negotiations').upsert(n),
  deleteBillingNegotiation: async (id: string) => isConfigured && await supabase.from('crm_billing_negotiations').delete().eq('id', id),

  // --- PIPELINES ---
  getPipelines: async () => isConfigured ? (await supabase.from('crm_pipelines').select('*')).data : [],
  savePipeline: async (p: any) => isConfigured && await supabase.from('crm_pipelines').upsert(p),
  deletePipeline: async (id: string) => isConfigured && await supabase.from('crm_pipelines').delete().eq('id', id),

  // --- WEBHOOKS ---
  getWebhookTriggers: async () => isConfigured ? (await supabase.from('crm_webhook_triggers').select('*')).data : [],
  saveWebhookTrigger: async (t: any) => isConfigured && await supabase.from('crm_webhook_triggers').upsert(t),
  deleteWebhookTrigger: async (id: string) => isConfigured && await supabase.from('crm_webhook_triggers').delete().eq('id', id),

  // --- SYNC JOBS ---
  getSyncJobs: async () => isConfigured ? (await supabase.from('crm_sync_jobs').select('*')).data : [],
  saveSyncJob: async (j: any) => isConfigured && await supabase.from('crm_sync_jobs').upsert(j),
  updateJobStatus: async (id: string, status: string, lastSync: string, lastMessage: string) => 
    isConfigured && await supabase.from('crm_sync_jobs').update({ status, last_sync: lastSync, last_message: lastMessage }).eq('id', id),
  deleteSyncJob: async (id: string) => isConfigured && await supabase.from('crm_sync_jobs').delete().eq('id', id),

  // --- PRESETS ---
  getPresets: async () => isConfigured ? (await supabase.from('app_presets').select('*')).data : [],
  savePreset: async (p: any) => isConfigured && (await supabase.from('app_presets').insert(p).select().single()).data,
  deletePreset: async (id: string) => isConfigured && await supabase.from('app_presets').delete().eq('id', id),

  // --- APP SETTINGS ---
  getAppSetting: async (k: string) => isConfigured ? (await supabase.from('app_settings').select('value').eq('key', k).maybeSingle()).data?.value : null,
  saveAppSetting: async (k: string, v: any) => isConfigured && await supabase.from('app_settings').upsert({ key: k, value: v }),
  getAppLogo: async () => await appBackend.getAppSetting('app_logo_url'),
  saveAppLogo: async (u: string) => await appBackend.saveAppSetting('app_logo_url', u),
  getInventorySecurityMargin: async () => Number(await appBackend.getAppSetting('inventory_security_margin') || 5),
  saveInventorySecurityMargin: async (v: number) => await appBackend.saveAppSetting('inventory_security_margin', v),
  getWhatsAppConfig: async () => await appBackend.getAppSetting('whatsapp_config'),
  saveWhatsAppConfig: async (c: any) => await appBackend.saveAppSetting('whatsapp_config', c),

  // --- COMPANIES ---
  getCompanies: async () => isConfigured ? (await supabase.from('crm_companies').select('*')).data : [],
  saveCompany: async (c: any) => isConfigured && await supabase.from('crm_companies').upsert(c),
  deleteCompany: async (id: string) => isConfigured && await supabase.from('crm_companies').delete().eq('id', id),

  // --- ROLES ---
  getRoles: async () => isConfigured ? (await supabase.from('crm_roles').select('*')).data : [],
  saveRole: async (r: any) => isConfigured && await supabase.from('crm_roles').upsert(r),
  deleteRole: async (id: string) => isConfigured && await supabase.from('crm_roles').delete().eq('id', id),

  // --- BANNERS ---
  getBanners: async (a: any) => isConfigured ? (await supabase.from('app_banners').select('*').eq('target_audience', a)).data : [],
  saveBanner: async (b: any) => isConfigured && await supabase.from('app_banners').upsert(b),
  deleteBanner: async (id: string) => isConfigured && await supabase.from('app_banners').delete().eq('id', id),

  // --- PARTNER STUDIOS ---
  getPartnerStudios: async () => isConfigured ? (await supabase.from('crm_partner_studios').select('*')).data : [],
  savePartnerStudio: async (s: any) => isConfigured && await supabase.from('crm_partner_studios').upsert(s),
  deletePartnerStudio: async (id: string) => isConfigured && await supabase.from('crm_partner_studios').delete().eq('id', id),

  // --- INSTRUCTOR LEVELS ---
  getInstructorLevels: async () => isConfigured ? (await supabase.from('crm_instructor_levels').select('*')).data : [],
  saveInstructorLevel: async (l: any) => isConfigured && await supabase.from('crm_instructor_levels').upsert(l),
  deleteInstructorLevel: async (id: string) => isConfigured && await supabase.from('crm_instructor_levels').delete().eq('id', id),

  // --- TEACHER NEWS ---
  getTeacherNews: async () => isConfigured ? (await supabase.from('crm_teacher_news').select('*').order('created_at', { ascending: false })).data : [],
  saveTeacherNews: async (n: any) => isConfigured && await supabase.from('crm_teacher_news').upsert(n),
  deleteTeacherNews: async (id: string) => isConfigured && await supabase.from('crm_teacher_news').delete().eq('id', id),

  // --- FORMS ---
  getForms: async () => isConfigured ? (await supabase.from('crm_forms').select('*').order('created_at', { ascending: false })).data : [],
  saveForm: async (f: any) => isConfigured && await supabase.from('crm_forms').upsert(f),
  deleteForm: async (id: string) => isConfigured && await supabase.from('crm_forms').delete().eq('id', id),
  getFormById: async (id: string) => isConfigured ? (await supabase.from('crm_forms').select('*').eq('id', id).maybeSingle()).data : null,
  getFormFolders: async () => isConfigured ? (await supabase.from('crm_form_folders').select('*')).data : [],
  saveFormFolder: async (f: any) => isConfigured && await supabase.from('crm_form_folders').upsert(f),
  deleteFormFolder: async (id: string) => isConfigured && await supabase.from('crm_form_folders').delete().eq('id', id),

  // --- SURVEYS ---
  getSurveys: async () => isConfigured ? (await supabase.from('crm_surveys').select('*')).data : [],
  saveSurvey: async (s: any) => isConfigured && await supabase.from('crm_surveys').upsert(s),
  getEligibleSurveysForStudent: async (sid: string) => isConfigured ? (await supabase.from('crm_surveys').select('*').eq('is_active', true)).data : [],
  submitForm: async (fid: string, ans: any, lead: boolean, sid?: string) => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_form_submissions').insert([{ form_id: fid, answers: ans, student_id: sid }]);
    if (error) throw error;
  },
  getFormSubmissions: async (fid: string) => isConfigured ? (await supabase.from('crm_form_submissions').select('*').eq('form_id', fid)).data : [],

  // --- CONTRACTS ---
  getFolders: async () => isConfigured ? (await supabase.from('app_contract_folders').select('*')).data : [],
  saveFolder: async (f: any) => isConfigured && await supabase.from('app_contract_folders').upsert(f),
  deleteFolder: async (id: string) => isConfigured && await supabase.from('app_contract_folders').delete().eq('id', id),
  getContracts: async () => isConfigured ? (await supabase.from('app_contracts').select('*')).data : [],
  getContractById: async (id: string) => isConfigured ? (await supabase.from('app_contracts').select('*').eq('id', id).maybeSingle()).data : null,
  saveContract: async (c: any) => isConfigured && await supabase.from('app_contracts').upsert(c),
  deleteContract: async (id: string) => isConfigured && await supabase.from('app_contracts').delete().eq('id', id),
  signContract: async (cid: string, sid: string, signature: string) => {
    if (!isConfigured) return;
    const { data: contract } = await supabase.from('app_contracts').select('signers').eq('id', cid).single();
    const signers = (contract?.signers || []).map((s: any) => s.id === sid ? { ...s, status: 'signed', signatureData: signature, signedAt: new Date().toISOString() } : s);
    const allSigned = signers.every((s: any) => s.status === 'signed');
    await supabase.from('app_contracts').update({ signers, status: allSigned ? 'signed' : 'sent' }).eq('id', cid);
  },

  // --- CERTIFICATES ---
  getCertificates: async () => isConfigured ? (await supabase.from('crm_certificates').select('*')).data : [],
  saveCertificate: async (c: any) => isConfigured && await supabase.from('crm_certificates').upsert(c),
  deleteCertificate: async (id: string) => isConfigured && await supabase.from('crm_certificates').delete().eq('id', id),
  issueCertificate: async (sid: string, tid: string) => {
    if (!isConfigured) throw new Error("Backend not configured.");
    const hash = crypto.randomUUID();
    await supabase.from('crm_student_certificates').insert([{ student_deal_id: sid, certificate_template_id: tid, hash, issued_at: new Date().toISOString() }]);
    return hash;
  },
  getStudentCertificate: async (h: string) => {
    if (!isConfigured) return null;
    const { data: cert } = await supabase.from('crm_student_certificates').select('*').eq('hash', h).maybeSingle();
    if (!cert) return null;
    const { data: deal } = await supabase.from('crm_deals').select('company_name, contact_name, course_city').eq('id', cert.student_deal_id).single();
    const { data: template } = await supabase.from('crm_certificates').select('*').eq('id', cert.certificate_template_id).single();
    return {
      studentName: deal?.company_name || deal?.contact_name || 'Aluno',
      studentCity: deal?.course_city || 'Local',
      template,
      issuedAt: cert.issued_at
    };
  },
  deleteStudentCertificate: async (id: string) => isConfigured && await supabase.from('crm_student_certificates').delete().eq('id', id),

  // --- EVENTS ---
  getEvents: async () => isConfigured ? (await supabase.from('crm_events').select('*')).data : [],
  saveEvent: async (e: any) => isConfigured ? (await supabase.from('crm_events').upsert(e).select().single()).data : null,
  deleteEvent: async (id: string) => isConfigured && await supabase.from('crm_events').delete().eq('id', id),
  getBlocks: async (eid: string) => isConfigured ? (await supabase.from('crm_event_blocks').select('*').eq('event_id', eid)).data : [],
  saveBlock: async (b: any) => isConfigured ? (await supabase.from('crm_event_blocks').upsert(b).select().single()).data : null,
  deleteBlock: async (id: string) => isConfigured && await supabase.from('crm_event_blocks').delete().eq('id', id),
  getWorkshops: async (eid: string) => isConfigured ? (await supabase.from('crm_workshops').select('*').eq('event_id', eid)).data : [],
  saveWorkshop: async (w: any) => isConfigured ? (await supabase.from('crm_workshops').upsert(w).select().single()).data : null,
  deleteWorkshop: async (id: string) => isConfigured && await supabase.from('crm_workshops').delete().eq('id', id),
  getEventRegistrations: async (eid: string) => isConfigured ? (await supabase.from('crm_event_registrations').select('*').eq('event_id', eid)).data : [],
  saveEventRegistrations: async (eid: string, sid: string, sn: string, se: string, wids: string[]) => {
    if (!isConfigured) return;
    await supabase.from('crm_event_registrations').delete().eq('event_id', eid).eq('student_id', sid);
    if (wids.length > 0) {
      await supabase.from('crm_event_registrations').insert(wids.map(w => ({ event_id: eid, workshop_id: w, student_id: sid, student_name: sn, student_email: se })));
    }
  },

  // --- INVENTORY ---
  getInventory: async () => isConfigured ? (await supabase.from('crm_inventory').select('*')).data : [],
  saveInventoryRecord: async (r: any) => isConfigured && await supabase.from('crm_inventory').upsert(r),
  deleteInventoryRecord: async (id: string) => isConfigured && await supabase.from('crm_inventory').delete().eq('id', id),

  // --- COURSE INFO ---
  getCourseInfos: async () => isConfigured ? (await supabase.from('crm_course_info').select('*')).data : [],
  saveCourseInfo: async (i: any) => isConfigured && await supabase.from('crm_course_info').upsert(i),
  deleteCourseInfo: async (id: string) => isConfigured && await supabase.from('crm_course_info').delete().eq('id', id)
};

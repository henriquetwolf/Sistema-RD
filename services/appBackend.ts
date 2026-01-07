
import { createClient, Session } from '@supabase/supabase-js';
import { SavedPreset, FormModel, SurveyModel, FormAnswer, Contract, ContractFolder, CertificateModel, StudentCertificate, EventModel, Workshop, EventRegistration, EventBlock, Role, Banner, PartnerStudio, InstructorLevel, InventoryRecord, SyncJob, ActivityLog, CollaboratorSession, BillingNegotiation, FormFolder, CourseInfo, TeacherNews, SupportTicket, TicketMessage } from '../types';

// Interfaces added to fix missing type errors
export interface PipelineStage {
  id: string;
  title: string;
  color: string;
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
  payloadJson: string;
  createdAt: string;
}

export interface CompanySetting {
  id?: string;
  legalName: string;
  cnpj: string;
  webhookUrl: string;
  productTypes: string[];
  productIds: string[];
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
    signOut: async () => {
      if (!isConfigured) {
        window.location.reload(); 
        return;
      }
      await supabase.auth.signOut();
    },
    getSession: async () => {
      if (!isConfigured) return null;
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    onAuthStateChange: (callback: (session: Session | null) => void) => {
      if (!isConfigured) return { data: { subscription: { unsubscribe: () => {} } } };
      return supabase.auth.onAuthStateChange((_event, session) => callback(session));
    }
  },

  // --- SUPORTE / CHAMADOS ---

  getSupportTickets: async (userId?: string, userType?: string): Promise<SupportTicket[]> => {
      if (!isConfigured) return [];
      let query = supabase.from('crm_support_tickets').select('*').order('updated_at', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      if (userType) query = query.eq('user_type', userType);
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(d => ({
          id: d.id, userId: d.user_id, userName: d.user_name, userEmail: d.user_email, userType: d.user_type,
          subject: d.subject, category: d.category, status: d.status, createdAt: d.created_at, updatedAt: d.updated_at, lastMessage: d.last_message
      }));
  },

  getTicketMessages: async (ticketId: string): Promise<TicketMessage[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(d => ({
          id: d.id, ticketId: d.ticket_id, senderName: d.sender_name, senderType: d.sender_type, text: d.text, createdAt: d.created_at
      }));
  },

  saveSupportTicket: async (ticket: Partial<SupportTicket>): Promise<SupportTicket> => {
      if (!isConfigured) throw new Error("Backend not configured");
      const payload = {
          user_id: ticket.userId, user_name: ticket.userName, user_email: ticket.userEmail, user_type: ticket.userType,
          subject: ticket.subject, category: ticket.category, status: ticket.status || 'open', updated_at: new Date().toISOString()
      };
      const { data, error } = await supabase.from('crm_support_tickets').upsert([payload]).select().single();
      if (error) throw error;
      return {
          id: data.id, userId: data.user_id, userName: data.user_name, userEmail: data.user_email, userType: data.user_type,
          subject: data.subject, category: data.category, status: data.status, createdAt: data.created_at, updatedAt: data.updated_at
      };
  },

  addTicketMessage: async (msg: Omit<TicketMessage, 'id' | 'createdAt'>): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_support_messages').insert([{
          ticket_id: msg.ticketId, sender_name: msg.senderName, sender_type: msg.senderType, text: msg.text
      }]);
      if (error) throw error;
      await supabase.from('crm_support_tickets').update({ last_message: msg.text, updated_at: new Date().toISOString() }).eq('id', msg.ticketId);
  },

  updateTicketStatus: async (ticketId: string, status: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', ticketId);
      if (error) throw error;
  },

  // (Manter os métodos existentes...)
  logActivity: async (log: Omit<ActivityLog, 'id' | 'createdAt' | 'userName'>): Promise<void> => {
      if (!isConfigured) return;
      let userName = 'Sistema';
      const savedCollab = sessionStorage.getItem('collaborator_session');
      if (savedCollab) {
          const collab = JSON.parse(savedCollab) as CollaboratorSession;
          userName = collab.name;
      } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) userName = user.email || 'Admin';
      }
      await supabase.from('crm_activity_logs').insert([{ user_name: userName, action: log.action, module: log.module, details: log.details, record_id: log.recordId }]);
  },
  getActivityLogs: async (limit = 100): Promise<ActivityLog[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_activity_logs').select('*').order('created_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return (data || []).map(d => ({ id: d.id, userName: d.user_name, action: d.action as any, module: d.module, details: d.details, recordId: d.record_id, createdAt: d.created_at }));
  },
  getBillingNegotiations: async (): Promise<BillingNegotiation[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_billing_negotiations').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({ id: row.id, openInstallments: row.open_installments, totalNegotiatedValue: row.total_negotiated_value, totalInstallments: row.total_installments, dueDate: row.due_date, responsibleAgent: row.responsible_agent, identifier_code: row.identifier_code, fullName: row.full_name, product_name: row.product_name, original_value: row.original_value, payment_method: row.payment_method, observations: row.observations, status: row.status, team: row.team, voucher_link_1: row.voucher_link_1, test_date: row.test_date, voucher_link_2: row.voucher_link_2, voucher_link_3: row.voucher_link_3, boletos_link: row.boletos_link, negotiation_reference: row.negotiation_reference, attachments: row.attachments, createdAt: row.created_at }));
  },
  saveBillingNegotiation: async (negotiation: Partial<BillingNegotiation>): Promise<void> => {
    if (!isConfigured) return;
    const payload = { open_installments: negotiation.openInstallments, total_negotiated_value: negotiation.totalNegotiatedValue, total_installments: negotiation.totalInstallments, due_date: negotiation.dueDate, responsible_agent: negotiation.responsibleAgent, identifier_code: negotiation.identifierCode, full_name: negotiation.fullName, product_name: negotiation.productName, original_value: negotiation.originalValue, payment_method: negotiation.paymentMethod, observations: negotiation.observations, status: negotiation.status, team: negotiation.team, voucher_link_1: negotiation.voucherLink1, test_date: negotiation.testDate, voucher_link_2: negotiation.voucherLink2, voucher_link_3: negotiation.voucherLink3, boletos_link: negotiation.boletosLink, negotiation_reference: negotiation.negotiationReference, attachments: negotiation.attachments };
    if (negotiation.id) await supabase.from('crm_billing_negotiations').update(payload).eq('id', negotiation.id);
    else await supabase.from('crm_billing_negotiations').insert([{ ...payload, id: crypto.randomUUID() }]);
  },
  deleteBillingNegotiation: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_billing_negotiations').delete().eq('id', id);
  },
  getPipelines: async (): Promise<Pipeline[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_pipelines').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  savePipeline: async (pipeline: Pipeline): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_pipelines').upsert({ id: pipeline.id || undefined, name: pipeline.name, stages: pipeline.stages });
  },
  deletePipeline: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_pipelines').delete().eq('id', id);
  },
  getWebhookTriggers: async (): Promise<WebhookTrigger[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_webhook_triggers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((t: any) => ({ id: t.id, pipelineName: t.pipeline_name, stageId: t.stage_id, payloadJson: t.payload_json, createdAt: t.created_at }));
  },
  saveWebhookTrigger: async (trigger: Partial<WebhookTrigger>): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_webhook_triggers').upsert({ id: trigger.id || undefined, pipeline_name: trigger.pipelineName, stage_id: trigger.stageId, payload_json: trigger.payloadJson });
  },
  deleteWebhookTrigger: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_webhook_triggers').delete().eq('id', id);
  },
  getSyncJobs: async (): Promise<SyncJob[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_sync_jobs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({ id: row.id, name: row.name, sheet_url: row.sheet_url, config: row.config, lastSync: row.last_sync, status: row.status, lastMessage: row.last_message, active: row.active, intervalMinutes: row.interval_minutes, createdBy: row.created_by_name, createdAt: row.created_at }));
  },
  saveSyncJob: async (job: SyncJob): Promise<void> => {
    if (!isConfigured) return;
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { id: job.id, user_id: user?.id, name: job.name, sheet_url: job.sheetUrl, config: job.config, active: job.active, interval_minutes: job.intervalMinutes, last_sync: job.lastSync, status: job.status, last_message: job.lastMessage, created_by_name: job.createdBy, created_at: job.createdAt };
    await supabase.from('crm_sync_jobs').upsert(payload);
  },
  updateJobStatus: async (jobId: string, status: string, lastSync: string | null, message: string | null): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_sync_jobs').update({ status, last_sync: lastSync, last_message: message }).eq('id', jobId);
  },
  deleteSyncJob: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_sync_jobs').delete().eq('id', id);
  },
  getPresets: async (): Promise<SavedPreset[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('app_presets').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({ id: row.id, name: row.name, url: row.project_url, key: row.api_key, tableName: row.target_table_name, primaryKey: row.target_primary_key || '', intervalMinutes: row.interval_minutes || 5, createdByName: row.created_by_name || '' }));
  },
  savePreset: async (preset: Omit<SavedPreset, 'id'>): Promise<SavedPreset> => {
    if (!isConfigured) throw new Error("Backend not configured.");
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { user_id: user?.id, name: preset.name, project_url: preset.url, api_key: preset.key, target_table_name: preset.target_table_name, target_primary_key: preset.primaryKey || null, interval_minutes: preset.intervalMinutes || 5, created_by_name: preset.createdByName || null };
    const { data, error = null } = await supabase.from('app_presets').insert([payload]).select().single();
    if (error) throw error;
    return { id: data.id, name: data.name, url: data.project_url, key: data.api_key, tableName: data.target_table_name, primaryKey: data.target_primary_key || '', intervalMinutes: data.interval_minutes || 5, createdByName: data.created_by_name || '' };
  },
  deletePreset: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('app_presets').delete().eq('id', id);
  },
  getAppSetting: async (key: string): Promise<any | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('app_settings').select('value').eq('key', key).single();
    return data ? data.value : null;
  },
  saveAppSetting: async (key: string, value: any): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() });
  },
  getAppLogo: async (): Promise<string | null> => { return await appBackend.getAppSetting('app_logo_url'); },
  saveAppLogo: async (url: string) => { await appBackend.saveAppSetting('app_logo_url', url); },
  getInventorySecurityMargin: async (): Promise<number> => { const val = await appBackend.getAppSetting('inventory_security_margin'); return val !== null ? parseInt(val) : 5; },
  saveInventorySecurityMargin: async (val: number) => { await appBackend.saveAppSetting('inventory_security_margin', val); },
  getWhatsAppConfig: async (): Promise<any | null> => { return await appBackend.getAppSetting('whatsapp_config'); },
  saveWhatsAppConfig: async (config: any): Promise<void> => { await appBackend.saveAppSetting('whatsapp_config', config); },
  getCompanies: async (): Promise<CompanySetting[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_companies').select('*').order('created_at', { ascending: true });
      return (data || []).map((c: any) => ({ id: c.id, legalName: c.legal_name, cnpj: c.cnpj, webhookUrl: c.webhook_url, productTypes: c.product_types || [], productIds: c.product_ids || [] }));
  },
  saveCompany: async (company: CompanySetting): Promise<void> => {
      if (!isConfigured) return;
      const payload = { id: company.id || undefined, legal_name: company.legalName, cnpj: company.cnpj, webhook_url: company.webhookUrl, product_types: company.productTypes, product_ids: company.productIds };
      await supabase.from('crm_companies').upsert(payload);
  },
  deleteCompany: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_companies').delete().eq('id', id);
  },
  getRoles: async (): Promise<Role[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_roles').select('*').order('name', { ascending: true });
    return (data || []).map((r: any) => ({ id: r.id, name: r.name, permissions: r.permissions || {}, created_at: r.created_at }));
  },
  saveRole: async (role: Role): Promise<void> => {
    if (!isConfigured) return;
    const payload = { name: role.name, permissions: role.permissions };
    if (role.id) await supabase.from('crm_roles').update(payload).eq('id', role.id);
    else await supabase.from('crm_roles').insert([payload]);
  },
  deleteRole: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_roles').delete().eq('id', id);
  },
  getBanners: async (audience?: 'student' | 'instructor'): Promise<Banner[]> => {
    if (!isConfigured) return [];
    let query = supabase.from('app_banners').select('*').order('created_at', { ascending: false });
    if (audience) query = query.eq('target_audience', audience);
    const { data } = await query;
    return (data || []).map((b: any) => ({ id: b.id, title: b.title, imageUrl: b.image_url, linkUrl: b.link_url, targetAudience: b.target_audience, active: b.active }));
  },
  saveBanner: async (banner: Banner): Promise<void> => {
    if (!isConfigured) return;
    const payload = { title: banner.title, image_url: banner.imageUrl, link_url: banner.linkUrl, target_audience: banner.targetAudience, active: banner.active };
    if (banner.id) await supabase.from('app_banners').update(payload).eq('id', banner.id);
    else await supabase.from('app_banners').insert([payload]);
  },
  deleteBanner: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('app_banners').delete().eq('id', id);
  },
  getPartnerStudios: async (): Promise<PartnerStudio[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_partner_studios').select('*').order('fantasy_name', { ascending: true });
    return (data || []).map((d: any) => ({ id: d.id, status: d.status || 'active', responsibleName: d.responsible_name, cpf: d.cpf, phone: d.phone, email: d.email, password: d.password || '', secondContactName: d.second_contact_name, secondContactPhone: d.second_contact_phone, fantasyName: d.fantasy_name, legalName: d.legal_name, cnpj: d.cnpj, studioPhone: d.studio_phone, address: d.address, city: d.city, state: d.state, country: d.country, sizeM2: d.size_m2, studentCapacity: d.student_capacity, rentValue: d.rent_value, methodology: d.methodology, studioType: d.studio_type, nameOnSite: d.name_on_site, bank: d.bank, agency: d.agency, account: d.account, beneficiary: d.beneficiary, pixKey: d.pix_key, hasReformer: d.has_reformer, qtyReformer: d.qty_reformer, hasLadderBarrel: d.has_ladder_barrel, qtyLadderBarrel: d.qty_ladder_barrel, hasChair: d.has_chair, qtyChair: d.qty_chair, hasCadillac: d.has_cadillac, qty_cadillac: d.qtyCadillac, has_chairs_for_course: d.hasChairsForCourse, has_tv: d.hasTv, max_kits_capacity: d.maxKitsCapacity, attachments: d.attachments }));
  },
  savePartnerStudio: async (studio: PartnerStudio): Promise<void> => {
    if (!isConfigured) return;
    const payload = { status: studio.status, responsible_name: studio.responsibleName, cpf: studio.cpf, phone: studio.phone, email: studio.email, password: studio.password, second_contact_name: studio.secondContactName, second_contact_phone: studio.secondContactPhone, fantasy_name: studio.fantasyName, legal_name: studio.legalName, cnpj: studio.cnpj, studio_phone: studio.studioPhone, address: studio.address, city: studio.city, state: studio.state, country: studio.country, size_m2: studio.sizeM2, student_capacity: studio.studentCapacity, rent_value: studio.rentValue, methodology: studio.methodology, studio_type: studio.studioType, name_on_site: studio.nameOnSite, bank: studio.bank, agency: studio.agency, account: studio.account, beneficiary: studio.beneficiary, pix_key: studio.pixKey, has_reformer: studio.hasReformer, qty_reformer: studio.qtyReformer, has_ladder_barrel: studio.hasLadderBarrel, qty_ladder_barrel: studio.qtyLadderBarrel, has_chair: studio.hasChair, qty_chair: studio.qtyChair, has_cadillac: studio.hasCadillac, qty_cadillac: studio.qtyCadillac, has_chairs_for_course: studio.hasChairsForCourse, has_tv: studio.hasTv, max_kits_capacity: studio.maxKitsCapacity, attachments: studio.attachments };
    if (studio.id) await supabase.from('crm_partner_studios').update(payload).eq('id', studio.id);
    else await supabase.from('crm_partner_studios').insert([payload]);
  },
  deletePartnerStudio: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_partner_studios').delete().eq('id', id);
  },
  getInstructorLevels: async (): Promise<InstructorLevel[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_instructor_levels').select('*').order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, honorarium: Number(d.honorarium || 0), observations: d.observations || '', createdAt: d.created_at }));
  },
  saveInstructorLevel: async (level: InstructorLevel): Promise<void> => {
    if (!isConfigured) return;
    const payload = { name: level.name, honorarium: level.honorarium, observations: level.observations };
    if (level.id) await supabase.from('crm_instructor_levels').update(payload).eq('id', level.id);
    else await supabase.from('crm_instructor_levels').insert([payload]);
  },
  deleteInstructorLevel: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_instructor_levels').delete().eq('id', id);
  },
  getTeacherNews: async (): Promise<TeacherNews[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_teacher_news').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, title: d.title, content: d.content, imageUrl: d.image_url, createdAt: d.created_at }));
  },
  saveTeacherNews: async (news: Partial<TeacherNews>): Promise<void> => {
    if (!isConfigured) return;
    const payload = { title: news.title, content: news.content, image_url: news.imageUrl };
    if (news.id) await supabase.from('crm_teacher_news').update(payload).eq('id', news.id);
    else await supabase.from('crm_teacher_news').insert([{ ...payload, id: crypto.randomUUID() }]);
  },
  deleteTeacherNews: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_teacher_news').delete().eq('id', id);
  },
  saveForm: async (form: FormModel): Promise<void> => {
      if (!isConfigured) return;
      const payload = { id: form.id || undefined, title: form.title, description: form.description, campaign: form.campaign || null, is_lead_capture: form.isLeadCapture, questions: form.questions, style: form.style, team_id: form.teamId || null, distribution_mode: form.distributionMode || 'fixed', fixed_owner_id: form.fixedOwnerId || null, target_pipeline: form.targetPipeline || 'Padrão', target_stage: form.targetStage || 'new', submissions_count: form.submissionsCount || 0, folder_id: form.folderId || null };
      await supabase.from('crm_forms').upsert(payload);
  },
  getForms: async (): Promise<FormModel[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_forms').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({ id: d.id, title: d.title, description: d.description, campaign: d.campaign, isLeadCapture: d.isLeadCapture, teamId: d.team_id, distributionMode: d.distribution_mode, fixedOwnerId: d.fixed_owner_id, targetPipeline: d.target_pipeline, targetStage: d.target_stage, questions: d.questions || [], style: d.style || {}, createdAt: d.created_at, submissionsCount: d.submissions_count || 0, folderId: d.folder_id }));
  },
  getFormFolders: async (): Promise<FormFolder[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_form_folders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, createdAt: d.created_at }));
  },
  saveFormFolder: async (folder: FormFolder): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_form_folders').upsert({ id: folder.id, name: folder.name });
  },
  deleteFormFolder: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_form_folders').delete().eq('id', id);
  },
  saveSurvey: async (survey: SurveyModel): Promise<void> => {
      if (!isConfigured) return;
      const payload = { id: survey.id || undefined, title: survey.title, description: survey.description, is_lead_capture: survey.isLeadCapture, questions: survey.questions, style: survey.style, target_type: survey.targetType, target_product_type: survey.targetProductType || null, target_product_name: survey.targetProductName || null, only_if_finished: survey.onlyIfFinished, is_active: survey.isActive, submissions_count: survey.submissionsCount || 0 };
      await supabase.from('crm_surveys').upsert(payload);
  },
  getSurveys: async (): Promise<SurveyModel[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_surveys').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({ id: d.id, title: d.title, description: d.description, isLeadCapture: d.isLeadCapture, questions: d.questions || [], style: d.style || {}, targetType: d.target_type, targetProductType: d.target_product_type, targetProductName: d.target_product_name, onlyIfFinished: d.only_if_finished, isActive: d.is_active, createdAt: d.created_at, submissionsCount: d.submissions_count || 0 }));
  },
  getEligibleSurveysForStudent: async (studentDealId: string): Promise<SurveyModel[]> => {
      if (!isConfigured) return [];
      const { data: deal } = await supabase.from('crm_deals').select('*').eq('id', studentDealId).single();
      if (!deal) return [];
      const { data: surveys } = await supabase.from('crm_surveys').select('*').eq('is_active', true);
      if (!surveys || surveys.length === 0) return [];
      const { data: answered } = await supabase.from('crm_form_submissions').select('form_id').eq('student_id', studentDealId);
      const answeredIds = new Set((answered || []).map(a => a.form_id));
      const eligible = surveys.filter((survey: any) => {
          if (answeredIds.has(survey.id)) return false;
          let matchesProduct = false;
          if (survey.target_type === 'all') matchesProduct = true;
          else {
              const typeMatch = survey.target_type === 'product_type' && deal.product_type === survey.target_product_type;
              const specificMatch = survey.target_type === 'specific_product' && deal.product_name === survey.target_product_name;
              matchesProduct = typeMatch || specificMatch;
          }
          if (!matchesProduct) return false;
          if (survey.only_if_finished) { if (deal.product_type === 'Presencial') return deal.stage === 'closed'; return true; }
          return true;
      });
      return eligible.map((d: any) => ({ id: d.id, title: d.title, description: d.description, isLeadCapture: d.isLeadCapture, questions: d.questions || [], style: d.style || {}, targetType: d.target_type, targetProductType: d.target_product_type, targetProductName: d.target_product_name, onlyIfFinished: d.only_if_finished, isActive: d.is_active, createdAt: d.created_at, submissionsCount: d.submissions_count || 0 }));
  },
  getFormById: async (id: string): Promise<FormModel | null> => {
      if (!isConfigured) return null;
      const { data: form } = await supabase.from('crm_forms').select('*').eq('id', id).maybeSingle();
      if (form) return { id: form.id, title: form.title, description: form.description, campaign: form.campaign, isLeadCapture: form.isLeadCapture, teamId: form.team_id, distributionMode: form.distribution_mode, fixedOwnerId: form.fixed_owner_id || null, targetPipeline: form.targetPipeline, targetStage: form.targetStage, questions: form.questions || [], style: form.style || {}, createdAt: form.created_at, submissionsCount: form.submissions_count || 0, folderId: form.folder_id };
      const { data: survey } = await supabase.from('crm_surveys').select('*').eq('id', id).maybeSingle();
      if (survey) return { id: survey.id, title: survey.title, description: survey.description, isLeadCapture: survey.isLeadCapture, questions: survey.questions || [], style: survey.style || {}, createdAt: survey.created_at, submissionsCount: survey.submissions_count || 0 };
      return null;
  },
  deleteForm: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_forms').delete().eq('id', id);
      await supabase.from('crm_surveys').delete().eq('id', id);
  },
  submitForm: async (formId: string, answers: FormAnswer[], isLeadCapture: boolean, studentId?: string): Promise<void> => {
      const form = await appBackend.getFormById(formId);
      if (!form) throw new Error("Formulário não encontrado");
      if (isConfigured) {
          const cleanStudentId = (studentId && typeof studentId === 'string' && studentId.trim() !== '') ? studentId : null;
          await supabase.from('crm_form_submissions').insert([{ form_id: formId, answers: answers, student_id: cleanStudentId }]);
          await supabase.from('crm_surveys').update({ submissions_count: (form.submissionsCount || 0) + 1 }).eq('id', formId);
          await supabase.from('crm_forms').update({ submissions_count: (form.submissionsCount || 0) + 1 }).eq('id', formId);
      }
      if (isLeadCapture && isConfigured) {
          const dealPayload: any = { title: `Lead: ${form.title}`, status: 'warm', pipeline: (form as any).targetPipeline || 'Padrão', stage: (form as any).targetStage || 'new', deal_number: Math.floor(Math.random() * 1000000), source: form.title, campaign: (form as any).campaign || '', created_at: new Date().toISOString() };
          answers.forEach(ans => { const question = form.questions.find(q => q.id === ans.questionId); if (question && question.crmMapping) dealPayload[question.crmMapping] = ans.value; });
          await supabase.from('crm_deals').insert([dealPayload]);
      }
  },
  getFormSubmissions: async (formId: string): Promise<any[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_form_submissions').select('*').eq('form_id', formId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
  },
  getFolders: async (): Promise<ContractFolder[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('app_contract_folders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({ id: d.id, name: d.name, createdAt: d.created_at }));
  },
  saveFolder: async (folder: ContractFolder): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('app_contract_folders').upsert({ id: folder.id, name: folder.name });
  },
  deleteFolder: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('app_contract_folders').delete().eq('id', id);
  },
  getContracts: async (): Promise<Contract[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('app_contracts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({ id: d.id, title: d.title, content: d.content, city: d.city, contractDate: d.contract_date, status: d.status, folderId: d.folder_id, signers: d.signers || [], createdAt: d.created_at }));
  },
  getContractById: async (id: string): Promise<Contract | null> => {
      if (!isConfigured) return null;
      const { data, error = null } = await supabase.from('app_contracts').select('*').eq('id', id).maybeSingle();
      if (error || !data) return null;
      return { id: data.id, title: data.title, content: data.content, city: data.city, contractDate: data.contract_date, status: data.status, folderId: data.folder_id, signers: data.signers || [], createdAt: data.created_at };
  },
  saveContract: async (contract: Contract): Promise<void> => {
      if (!isConfigured) return;
      const payload = { id: contract.id, title: contract.title, content: contract.content, city: contract.city, contract_date: contract.contractDate, status: contract.status, folder_id: contract.folderId || null, signers: contract.signers };
      await supabase.from('app_contracts').upsert(payload);
  },
  deleteContract: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('app_contracts').delete().eq('id', id);
  },
  signContract: async (contractId: string, signerId: string, signatureBase64: string): Promise<void> => {
      const contract = await appBackend.getContractById(contractId);
      if (!contract) throw new Error("Contrato não encontrado");
      const signerIdx = contract.signers.findIndex(s => s.id === signerId);
      if (signerIdx === -1) throw new Error("Signatário não encontrado");
      contract.signers[signerIdx].status = 'signed';
      contract.signers[signerIdx].signatureData = signatureBase64;
      contract.signers[signerIdx].signedAt = new Date().toISOString();
      if (contract.signers.every(s => s.status === 'signed')) contract.status = 'signed';
      await appBackend.saveContract(contract);
  },
  getCertificates: async (): Promise<CertificateModel[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_certificates').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, title: d.title, backgroundData: d.background_base_64, backBackgroundData: d.back_background_base_64, linkedProductId: d.linked_product_id, bodyText: d.body_text, layoutConfig: d.layout_config, createdAt: d.created_at }));
  },
  saveCertificate: async (cert: CertificateModel): Promise<void> => {
    if (!isConfigured) return;
    const payload = { id: cert.id || undefined, title: cert.title, background_base_64: cert.backgroundData, back_background_base_64: cert.backBackgroundData, linked_product_id: cert.linkedProductId, body_text: cert.bodyText, layout_config: cert.layoutConfig };
    await supabase.from('crm_certificates').upsert(payload);
  },
  deleteCertificate: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_certificates').delete().eq('id', id);
  },
  issueCertificate: async (studentDealId: string, certificateTemplateId: string): Promise<string> => {
    if (!isConfigured) throw new Error("Backend not configured");
    const hash = crypto.randomUUID();
    await supabase.from('crm_student_certificates').insert([{ student_deal_id: studentDealId, certificate_template_id: certificateTemplateId, hash: hash, issued_at: new Date().toISOString() }]);
    return hash;
  },
  getStudentCertificate: async (hash: string): Promise<any> => {
    if (!isConfigured) return null;
    const { data: certData } = await supabase.from('crm_student_certificates').select('*').eq('hash', hash).maybeSingle();
    if (!certData) return null;
    const { data: dealData } = await supabase.from('crm_deals').select('contact_name, company_name, course_city').eq('id', (certData as any).student_deal_id).single();
    const { data: templateData } = await supabase.from('crm_certificates').select('*').eq('id', (certData as any).certificate_template_id).single();
    if (!dealData || !templateData) return null;
    return { id: (certData as any).id, studentDealId: (certData as any).student_deal_id, certificateTemplateId: (certData as any).certificate_template_id, hash: (certData as any).hash, issuedAt: (certData as any).issued_at, studentName: (dealData as any).company_name || (dealData as any).contact_name, studentCity: (dealData as any).course_city || 'Local', template: { id: (templateData as any).id, title: (templateData as any).title, backgroundData: (templateData as any).background_base_64, backBackgroundData: (templateData as any).back_background_base_64, linkedProductId: (templateData as any).linked_product_id, bodyText: (templateData as any).body_text, layoutConfig: (templateData as any).layout_config, createdAt: (templateData as any).created_at } };
  },
  deleteStudentCertificate: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_student_certificates').delete().eq('id', id);
  },
  getEvents: async (): Promise<EventModel[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_events').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, description: d.description, location: d.location, dates: d.dates || [], createdAt: d.created_at, registrationOpen: d.registration_open || false }));
  },
  saveEvent: async (event: EventModel): Promise<EventModel> => {
    if (!isConfigured) throw new Error("Backend not configured");
    const payload = { id: event.id, name: event.name, description: event.description, location: event.location, dates: event.dates, registration_open: event.registrationOpen };
    const { data, error = null } = await supabase.from('crm_events').upsert(payload).select().single();
    if (error) throw error;
    return { id: data.id, name: data.name, description: data.description, location: data.location, dates: data.dates || [], createdAt: data.created_at, registrationOpen: data.registration_open || false };
  },
  deleteEvent: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_events').delete().eq('id', id);
  },
  getBlocks: async (eventId: string): Promise<EventBlock[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_event_blocks').select('*').eq('event_id', eventId).order('title', { ascending: true });
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, eventId: d.event_id, date: d.date, title: d.title, maxSelections: d.max_selections }));
  },
  saveBlock: async (block: EventBlock): Promise<EventBlock> => {
      if (!isConfigured) throw new Error("Backend not configured");
      const payload = { id: block.id, event_id: block.eventId, date: block.date, title: block.title, max_selections: block.maxSelections };
      const { data, error = null } = await supabase.from('crm_event_blocks').upsert(payload).select().single();
      if (error) throw error;
      return { id: data.id, eventId: data.event_id, date: data.date, title: data.title, maxSelections: data.max_selections };
  },
  deleteBlock: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_event_blocks').delete().eq('id', id);
  },
  getWorkshops: async (eventId: string): Promise<Workshop[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_workshops').select('*').eq('event_id', eventId).order('date', { ascending: true }).order('time', { ascending: true });
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, eventId: d.event_id, blockId: d.block_id, title: d.title, description: d.description, speaker: d.speaker, date: d.date, time: d.time, spots: d.spots }));
  },
  saveWorkshop: async (workshop: Workshop): Promise<Workshop> => {
    if (!isConfigured) throw new Error("Backend not configured");
    const payload = { id: workshop.id, event_id: workshop.eventId, block_id: workshop.blockId || null, title: workshop.title, description: workshop.description, speaker: workshop.speaker, date: workshop.date, time: workshop.time, spots: workshop.spots };
    const { data, error = null } = await supabase.from('crm_workshops').upsert(payload).select().single();
    if (error) throw error;
    return { id: data.id, eventId: data.event_id, blockId: data.block_id, title: data.title, description: data.description, speaker: data.speaker, date: data.date, time: data.time, spots: data.spots };
  },
  deleteWorkshop: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_workshops').delete().eq('id', id);
  },
  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_event_registrations').select('*').eq('event_id', eventId);
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, eventId: d.event_id, workshopId: d.workshop_id, studentId: d.student_id, studentName: d.student_name, studentEmail: d.student_email, registeredAt: d.created_at }));
  },
  saveEventRegistrations: async (eventId: string, studentId: string, studentName: string, studentEmail: string, workshopIds: string[]): Promise<void> => {
    if (!isConfigured) throw new Error("Backend not configured");
    await supabase.from('crm_event_registrations').delete().eq('event_id', eventId).eq('student_id', studentId);
    if (workshopIds.length > 0) {
      const payload = workshopIds.map(wId => ({ event_id: eventId, workshop_id: wId, student_id: studentId, student_name: studentName, student_email: studentEmail }));
      await supabase.from('crm_event_registrations').insert(payload);
    }
  },
  getInventory: async (): Promise<InventoryRecord[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_inventory').select('*').order('registration_date', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, type: d.type, itemApostilaNova: d.item_apostila_nova, itemApostilaClassico: d.item_apostila_classico, itemSacochila: d.item_sacochila, itemLapis: d.item_lapis, registrationDate: d.registration_date, studioId: d.studio_id, trackingCode: d.tracking_code, observations: d.observations, conferenceDate: d.conference_date, attachments: d.attachments, createdAt: d.created_at }));
  },
  saveInventoryRecord: async (record: InventoryRecord): Promise<void> => {
    if (!isConfigured) return;
    const payload = { type: record.type, item_apostila_nova: record.itemApostilaNova, item_apostila_classico: record.itemApostilaClassico, item_sacochila: record.itemSacochila, item_lapis: record.itemLapis, registration_date: record.registrationDate, studio_id: record.studioId || null, tracking_code: record.trackingCode, observations: record.observations, conference_date: record.conferenceDate || null, attachments: record.attachments };
    if (record.id) await supabase.from('crm_inventory').update(payload).eq('id', record.id);
    else await supabase.from('crm_inventory').insert([payload]);
  },
  deleteInventoryRecord: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_inventory').delete().eq('id', id);
  },
  getCourseInfos: async (): Promise<CourseInfo[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_course_info').select('*').order('course_name', { ascending: true });
      if (error) throw error;
      return (data || []).map((d: any) => ({ id: d.id, courseName: d.course_name, details: d.details || '', materials: d.materials || '', requirements: d.requirements || '', updatedAt: d.updated_at }));
  },
  saveCourseInfo: async (info: Partial<CourseInfo>): Promise<void> => {
      if (!isConfigured) return;
      const payload = { course_name: info.courseName, details: info.details, materials: info.materials, requirements: info.requirements, updated_at: new Date().toISOString() };
      if (info.id) await supabase.from('crm_course_info').update(payload).eq('id', info.id);
      else await supabase.from('crm_course_info').insert([{ ...payload, id: crypto.randomUUID() }]);
  },
  deleteCourseInfo: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_course_info').delete().eq('id', id);
  }
};

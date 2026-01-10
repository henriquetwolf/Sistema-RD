import { createClient, Session } from '@supabase/supabase-js';
import { 
  SavedPreset, FormModel, SurveyModel, FormAnswer, Contract, ContractFolder, 
  CertificateModel, StudentCertificate, EventModel, Workshop, EventRegistration, 
  EventBlock, Role, Banner, PartnerStudio, InstructorLevel, InventoryRecord, 
  SyncJob, ActivityLog, CollaboratorSession, BillingNegotiation, FormFolder, 
  CourseInfo, TeacherNews, SupportTicket, SupportMessage, 
  CompanySetting, Pipeline, WebhookTrigger, SupportTag, Product, CourseModule, CourseLesson
} from '../types';

export type { CompanySetting, Pipeline, WebhookTrigger };
export type PipelineStage = { id: string; title: string; color?: string; };

const APP_URL = (import.meta as any).env?.VITE_APP_SUPABASE_URL;
const APP_KEY = (import.meta as any).env?.VITE_APP_SUPABASE_ANON_KEY;

const isConfigured = !!APP_URL && !!APP_KEY;

const TABLE_NAME = 'crm_presets';

const supabase = createClient(
  APP_URL || 'https://placeholder.supabase.co', 
  APP_KEY || 'placeholder'
);

const MOCK_SESSION = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'local-user',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'local@admin.com',
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: new Date().toISOString(),
  }
};

const generateInternalDealNumber = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return Number(`${yyyy}${mm}${dd}${hh}${min}${random}`);
};

export const appBackend = {
  isLocalMode: !isConfigured,
  client: supabase,

  auth: {
    signIn: async (email: string, password: string) => {
      if (!isConfigured) {
        return { data: { user: MOCK_SESSION.user, session: MOCK_SESSION }, error: null };
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    signOut: async () => {
      if (!isConfigured) {
        window.location.reload(); 
        return;
      }
      await supabase.signOut();
    },
    getSession: async () => {
      if (!isConfigured) return MOCK_SESSION as unknown as Session;
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    onAuthStateChange: (callback: (session: Session | null) => void) => {
      if (!isConfigured) {
          callback(MOCK_SESSION as unknown as Session);
          return { data: { subscription: { unsubscribe: () => {} } } };
      }
      return supabase.auth.onAuthStateChange((_event, session) => callback(session));
    }
  },

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
      await supabase.from('crm_activity_logs').insert([{
          user_name: userName,
          action: log.action,
          module: log.module,
          details: log.details,
          record_id: log.recordId
      }]);
  },

  getActivityLogs: async (limit = 100): Promise<ActivityLog[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase
          .from('crm_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
      if (error) throw error;
      return (data || []).map(d => ({
          id: d.id, userName: d.user_name, action: d.action as any, module: d.module, details: d.details, recordId: d.record_id, createdAt: d.created_at
      }));
  },

  // --- ONLINE COURSES CONTENT ---
  getCourseModules: async (courseId: string): Promise<CourseModule[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_course_modules').select('*').eq('course_id', courseId).order('order', { ascending: true });
      if (error) throw error;
      return data.map((d: any) => ({ id: d.id, courseId: d.course_id, title: d.title, order: d.order }));
  },

  getCourseLessons: async (moduleId: string): Promise<CourseLesson[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_course_lessons').select('*').eq('module_id', moduleId).order('order', { ascending: true });
      if (error) throw error;
      return data.map((d: any) => ({ id: d.id, moduleId: d.module_id, title: d.title, description: d.description, video_url: d.video_url, order: d.order }));
  },

  saveCourseModule: async (module: Partial<CourseModule>): Promise<void> => {
      if (!isConfigured) return;
      const payload = { course_id: module.courseId, title: module.title, order: module.order };
      if (module.id) {
          await supabase.from('crm_course_modules').update(payload).eq('id', module.id);
      } else {
          await supabase.from('crm_course_modules').insert([{ ...payload, id: crypto.randomUUID() }]);
      }
  },

  deleteCourseModule: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_course_modules').delete().eq('id', id);
  },

  saveCourseLesson: async (lesson: Partial<CourseLesson>): Promise<void> => {
      if (!isConfigured) return;
      const payload = { module_id: lesson.moduleId, title: lesson.title, description: lesson.description, video_url: lesson.videoUrl, order: lesson.order };
      if (lesson.id) {
          await supabase.from('crm_course_lessons').update(payload).eq('id', lesson.id);
      } else {
          await supabase.from('crm_course_lessons').insert([{ ...payload, id: crypto.randomUUID() }]);
      }
  },

  deleteCourseLesson: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_course_lessons').delete().eq('id', id);
  },

  // --- STUDENT COURSE ACCESS AND PROGRESS ---
  getStudentCourseAccess: async (studentId: string): Promise<string[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_student_course_access').select('course_id').eq('student_id', studentId);
      if (error) return [];
      return data.map(d => d.course_id);
  },

  grantCourseAccess: async (studentId: string, courseId: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_student_course_access').upsert({ student_id: studentId, course_id: courseId, unlocked_at: new Date().toISOString() });
  },

  revokeCourseAccess: async (studentId: string, courseId: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_student_course_access').delete().match({ student_id: studentId, course_id: courseId });
  },

  getLessonProgress: async (studentId: string): Promise<string[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_lesson_progress').select('lesson_id').eq('student_id', studentId);
      if (error) return [];
      return (data || []).map(d => d.lesson_id);
  },

  toggleLessonProgress: async (studentId: string, lessonId: string, completed: boolean): Promise<void> => {
      if (!isConfigured) return;
      if (completed) {
          await supabase.from('crm_lesson_progress').upsert({ student_id: studentId, lesson_id: lessonId, completed_at: new Date().toISOString() });
      } else {
          await supabase.from('crm_lesson_progress').delete().match({ student_id: studentId, lesson_id: lessonId });
      }
  },

  // --- SUPORTE INTERNO ---
  getSupportTickets: async (): Promise<SupportTicket[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_support_tickets').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((t: any) => ({
      id: t.id, senderId: t.sender_id, senderName: t.sender_name, senderEmail: t.sender_email, senderRole: t.sender_role,
      targetId: t.target_id, targetName: t.target_name, targetEmail: t.target_email, targetRole: t.target_role,
      subject: t.subject, message: t.message, tag: t.tag, status: t.status, response: t.response, createdAt: t.created_at, updatedAt: t.updated_at,
      assignedId: t.assigned_id, assignedName: t.assigned_name
    }));
  },

  getSupportTicketsBySender: async (id: string): Promise<SupportTicket[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_support_tickets')
        .select('*')
        .or(`sender_id.eq.${id},target_id.eq.${id}`)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map((t: any) => ({
      id: t.id, senderId: t.sender_id, senderName: t.sender_name, senderEmail: t.sender_email, senderRole: t.sender_role,
      targetId: t.target_id, targetName: t.target_name, targetEmail: t.target_email, targetRole: t.target_role,
      subject: t.subject, message: t.message, tag: t.tag, status: t.status, response: t.response, createdAt: t.created_at, updatedAt: t.updated_at,
      assignedId: t.assigned_id, assignedName: t.assigned_name
    }));
  },

  getSupportTicketMessages: async (ticketId: string): Promise<SupportMessage[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((m: any) => ({
          id: m.id, ticketId: m.ticket_id, senderId: m.sender_id, senderName: m.sender_name, senderRole: m.sender_role,
          content: m.content, createdAt: m.created_at, attachmentUrl: m.attachment_url, attachmentName: m.attachment_name
      }));
  },

  saveSupportTicket: async (ticket: Partial<SupportTicket>): Promise<void> => {
    if (!isConfigured) return;
    const payload: any = {
      sender_id: ticket.senderId,
      sender_name: ticket.senderName,
      sender_email: ticket.senderEmail,
      sender_role: ticket.senderRole,
      target_id: ticket.targetId,
      target_name: ticket.targetName,
      target_email: ticket.targetEmail,
      target_role: ticket.targetRole,
      subject: ticket.subject,
      message: ticket.message,
      tag: ticket.tag,
      status: ticket.status || 'open',
      response: ticket.response,
      assigned_id: ticket.assignedId,
      assigned_name: ticket.assignedName,
      updated_at: new Date().toISOString()
    };

    if (ticket.id) {
        payload.id = ticket.id;
        const { error } = await supabase.from('crm_support_tickets').upsert(payload);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('crm_support_tickets').insert([{ 
            ...payload, 
            id: crypto.randomUUID(), 
            created_at: new Date().toISOString() 
        }]);
        if (error) throw error;
    }
  },

  addSupportMessage: async (msg: Omit<SupportMessage, 'id' | 'createdAt'>): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_support_messages').insert([{
          id: crypto.randomUUID(),
          ticket_id: (msg as any).ticketId,
          sender_id: msg.senderId,
          sender_name: msg.senderName,
          sender_role: msg.senderRole,
          content: msg.content,
          attachment_url: (msg as any).attachmentUrl,
          attachment_name: (msg as any).attachmentName,
          created_at: new Date().toISOString()
      }]);
      if (error) throw error;

      const updates: any = { updated_at: new Date().toISOString() };
      if (msg.senderRole === 'admin') updates.status = 'pending';
      else updates.status = 'open';
      
      await supabase.from('crm_support_tickets').update(updates).eq('id', (msg as any).ticketId);
  },

  deleteSupportTicket: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_support_tickets').delete().eq('id', id);
    if (error) throw error;
  },

  getSupportTags: async (role?: SupportTag['role']): Promise<SupportTag[]> => {
    if (!isConfigured) return [];
    let query = supabase.from('crm_support_tags').select('*').order('name');
    if (role && role !== 'all') {
      query = query.or(`role.eq.${role},role.eq.all`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((d: any) => ({
        id: d.id,
        role: d.role,
        name: d.name,
        createdAt: d.created_at
    }));
  },

  saveSupportTag: async (tag: Partial<SupportTag>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        role: tag.role,
        name: tag.name
    };
    if (tag.id) {
        const { error } = await supabase.from('crm_support_tags').update(payload).eq('id', tag.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('crm_support_tags').insert([{ ...payload, id: crypto.randomUUID() }]);
        if (error) throw error;
    }
  },

  deleteSupportTag: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_support_tags').delete().eq('id', id);
    if (error) throw error;
  },

  getBillingNegotiations: async (): Promise<BillingNegotiation[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_billing_negotiations').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id, openInstallments: row.open_installments, totalNegotiatedValue: row.total_negotiated_value, totalInstallments: row.total_installments,
      dueDate: row.due_date, responsibleAgent: row.responsible_agent, identifierCode: row.identifier_code, fullName: row.full_name,
      productName: row.product_name, originalValue: row.original_value, paymentMethod: row.payment_method, observations: row.observations,
      status: row.status, team: row.team, voucherLink1: row.voucher_link_1, testDate: row.test_date, voucherLink2: row.voucher_link_2,
      voucherLink3: row.voucher_link_3, boletosLink: row.boletos_link, negotiationReference: row.negotiation_reference, attachments: row.attachments, createdAt: row.created_at
    }));
  },

  saveBillingNegotiation: async (negotiation: Partial<BillingNegotiation>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      open_installments: negotiation.openInstallments, total_negotiated_value: negotiation.totalNegotiatedValue, total_installments: negotiation.totalInstallments,
      due_date: negotiation.dueDate, responsible_agent: negotiation.responsibleAgent, identifier_code: negotiation.identifierCode,
      full_name: negotiation.fullName, product_name: negotiation.productName, original_value: negotiation.originalValue,
      payment_method: negotiation.paymentMethod, observations: negotiation.observations, status: negotiation.status, team: negotiation.team,
      voucher_link_1: negotiation.voucherLink1, test_date: negotiation.testDate, voucher_link_2: negotiation.voucherLink2,
      voucher_link_3: negotiation.voucherLink3, boletos_link: negotiation.boletosLink, negotiation_reference: negotiation.negotiationReference, attachments: negotiation.attachments
    };
    if (negotiation.id) {
        const { error } = await supabase.from('crm_billing_negotiations').update(payload).eq('id', negotiation.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('crm_billing_negotiations').insert([{ ...payload, id: crypto.randomUUID() }]);
        if (error) throw error;
    }
  },

  deleteBillingNegotiation: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_billing_negotiations').delete().eq('id', id);
      if (error) throw error;
  },

  getPipelines: async (): Promise<Pipeline[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_pipelines').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((p: any) => ({ id: p.id, name: p.name, stages: p.stages || [] }));
  },

  savePipeline: async (pipeline: Pipeline): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_pipelines').upsert({ id: pipeline.id || undefined, name: pipeline.name, stages: pipeline.stages });
    if (error) throw error;
  },

  deletePipeline: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_pipelines').delete().eq('id', id);
    if (error) throw error;
  },

  getWebhookTriggers: async (): Promise<WebhookTrigger[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_webhook_triggers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((t: any) => ({ id: t.id, pipelineName: t.pipeline_name, stageId: t.stage_id, payloadJson: t.payload_json, createdAt: t.created_at }));
  },

  saveWebhookTrigger: async (trigger: Partial<WebhookTrigger>): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_webhook_triggers').upsert({ id: trigger.id || undefined, pipeline_name: trigger.pipelineName, stage_id: trigger.stageId, payload_json: trigger.payloadJson });
      if (error) throw error;
  },

  deleteWebhookTrigger: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_webhook_triggers').delete().eq('id', id);
      if (error) throw error;
  },

  getSyncJobs: async (): Promise<SyncJob[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_sync_jobs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id, name: row.name, sheetUrl: row.sheet_url, config: row.config, lastSync: row.last_sync, status: row.status, lastMessage: row.last_message, active: row.active, intervalMinutes: row.interval_minutes, createdBy: row.created_by_name, createdAt: row.created_at
    }));
  },

  saveSyncJob: async (job: SyncJob): Promise<void> => {
    if (!isConfigured) return;
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      id: job.id, user_id: user?.id, name: job.name, sheet_url: job.sheetUrl, config: job.config, active: job.active,
      interval_minutes: job.intervalMinutes, last_sync: job.lastSync, status: job.status, last_message: job.lastMessage,
      created_by_name: job.createdBy, created_at: job.createdAt
    };
    const { error } = await supabase.from('crm_sync_jobs').upsert(payload);
    if (error) throw error;
  },

  updateJobStatus: async (jobId: string, status: string, lastSync: string | null, message: string | null): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_sync_jobs').update({ status, last_sync: lastSync, last_message: message }).eq('id', jobId);
    if (error) throw error;
  },

  deleteSyncJob: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_sync_jobs').delete().eq('id', id);
    if (error) throw error;
  },

  getPresets: async (): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from(TABLE_NAME).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id, name: row.name, url: row.project_url, key: row.api_key, tableName: row.target_table_name, primaryKey: row.target_primary_key || '', intervalMinutes: row.interval_minutes || 5, createdByName: row.created_by_name || ''
    }));
  },

  savePreset: async (preset: Omit<any, 'id'>): Promise<any> => {
    if (!isConfigured) throw new Error("Backend not configured.");
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { user_id: user?.id, name: preset.name, project_url: preset.url, api_key: preset.key, target_table_name: preset.tableName, target_primary_key: preset.primaryKey || null, interval_minutes: preset.interval_minutes || 5, created_by_name: preset.createdByName || null };
    const { data, error = null } = await supabase.from(TABLE_NAME).insert([payload]).select().single();
    if (error) throw error;
    return {
      id: data.id, name: data.name, url: data.project_url, key: data.api_key, tableName: data.target_table_name, primaryKey: data.target_primary_key || '', intervalMinutes: data.interval_minutes || 5, createdByName: data.created_by_name || ''
    };
  },

  deletePreset: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
    if (error) throw error;
  },

  getAppSetting: async (key: string): Promise<any | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
    return data ? data.value : null;
  },

  saveAppSetting: async (key: string, value: any): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
  },

  getAppLogo: async (): Promise<string | null> => await appBackend.getAppSetting('app_logo_url'),
  saveAppLogo: async (url: string) => await appBackend.saveAppSetting('app_logo_url', url),
  getInventorySecurityMargin: async (): Promise<number> => {
    const val = await appBackend.getAppSetting('inventory_security_margin');
    return val !== null ? parseInt(val) : 5;
  },
  saveInventorySecurityMargin: async (val: number) => await appBackend.saveAppSetting('inventory_security_margin', val),
  getWhatsAppConfig: async (): Promise<any | null> => await appBackend.getAppSetting('whatsapp_config'),
  saveWhatsAppConfig: async (config: any) => await appBackend.saveAppSetting('whatsapp_config', config),

  getCompanies: async (): Promise<CompanySetting[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_companies').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((c: any) => ({ id: c.id, legalName: c.legal_name, cnpj: c.cnpj, webhookUrl: c.webhook_url, productTypes: c.product_types || [], productIds: c.product_ids || [] }));
  },

  saveCompany: async (company: Partial<CompanySetting>): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_companies').upsert({ 
          id: company.id || undefined, 
          legal_name: company.legalName, 
          cnpj: company.cnpj, 
          webhook_url: company.webhookUrl, 
          product_types: company.productTypes, 
          product_ids: company.productIds 
      });
      if (error) throw error;
  },

  deleteCompany: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_companies').delete().eq('id', id);
      if (error) throw error;
  },

  getRoles: async (): Promise<Role[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_roles').select('*').order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map((r: any) => ({ id: r.id, name: r.name, permissions: r.permissions || {}, created_at: r.created_at }));
  },

  saveRole: async (role: Role): Promise<void> => {
    if (!isConfigured) return;
    const payload = { name: role.name, permissions: role.permissions };
    if (role.id) {
        const { error } = await supabase.from('crm_roles').update(payload).eq('id', role.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('crm_roles').insert([payload]);
        if (error) throw error;
    }
  },

  deleteRole: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_roles').delete().eq('id', id);
      if (error) throw error;
  },

  getBanners: async (audience?: 'student' | 'instructor'): Promise<Banner[]> => {
    if (!isConfigured) return [];
    let query = supabase.from('app_banners').select('*').order('created_at', { ascending: false });
    if (audience) query = query.eq('target_audience', audience);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((b: any) => ({ id: b.id, title: b.title, imageUrl: b.image_url, link_url: b.link_url, targetAudience: b.target_audience, active: b.active }));
  },

  saveBanner: async (banner: Banner): Promise<void> => {
    if (!isConfigured) return;
    const payload = { title: banner.title, image_url: banner.imageUrl, link_url: banner.linkUrl, target_audience: banner.targetAudience, active: banner.active };
    if (banner.id) {
        const { error } = await supabase.from('app_banners').update(payload).eq('id', banner.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('app_banners').insert([payload]);
        if (error) throw error;
    }
  },

  deleteBanner: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('app_banners').delete().eq('id', id);
    if (error) throw error;
  },

  getPartnerStudios: async (): Promise<PartnerStudio[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_partner_studios').select('*').order('fantasy_name', { ascending: true });
    if (error) throw error;
    return (data || []).map((d: any) => ({
      id: d.id, 
      status: d.status || 'active', 
      responsibleName: d.responsible_name, 
      cpf: d.cpf, 
      phone: d.phone, 
      email: d.email, 
      password: d.password || '', 
      secondContactName: d.second_contact_name, 
      secondContactPhone: d.second_contact_phone, 
      fantasyName: d.fantasy_name, 
      legalName: d.legal_name, 
      cnpj: d.cnpj, 
      studioPhone: d.studio_phone, 
      address: d.address, 
      city: d.city, 
      state: d.state, 
      country: d.country, 
      sizeM2: d.size_m2, 
      studentCapacity: d.student_capacity, 
      rentValue: d.rent_value, 
      methodology: d.methodology, 
      studioType: d.studio_type, 
      nameOnSite: d.name_on_site, 
      bank: d.bank, 
      agency: d.agency, 
      account: d.account, 
      beneficiary: d.beneficiary, 
      pixKey: d.pix_key, 
      hasReformer: d.has_reformer, 
      qtyReformer: d.qty_reformer, 
      hasLadderBarrel: d.has_ladder_barrel, 
      qtyLadderBarrel: d.qty_ladder_barrel, 
      hasChair: d.has_chair, 
      qtyChair: d.qty_chair, 
      hasCadillac: d.has_cadillac, 
      qtyCadillac: d.qty_cadillac, 
      hasChairsForCourse: d.has_chairs_for_course, 
      hasTv: d.has_tv, 
      maxKitsCapacity: d.max_kits_capacity, 
      attachments: d.attachments
    }));
  },

  savePartnerStudio: async (studio: PartnerStudio): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      status: studio.status, responsible_name: studio.responsibleName, cpf: studio.cpf, phone: studio.phone, email: studio.email, password: studio.password, second_contact_name: studio.secondContactName, second_contact_phone: studio.secondContactPhone, fantasy_name: studio.fantasyName, legal_name: studio.legalName, cnpj: studio.cnpj, studio_phone: studio.studioPhone, address: studio.address, city: studio.city, state: studio.state, country: studio.country, size_m2: studio.sizeM2, student_capacity: studio.studentCapacity, rent_value: studio.rentValue, methodology: studio.methodology, studio_type: studio.studioType, 
      name_on_site: studio.nameOnSite, bank: studio.bank, agency: studio.agency, account: studio.account, beneficiary: studio.beneficiary, pix_key: studio.pixKey, has_reformer: studio.hasReformer, qty_reformer: studio.qtyReformer, has_ladder_barrel: studio.hasLadderBarrel, 
      qty_ladder_barrel: studio.qtyLadderBarrel, 
      has_chair: studio.hasChair, 
      qty_chair: studio.qtyChair, 
      has_cadillac: studio.hasCadillac, 
      qty_cadillac: studio.qtyCadillac, 
      has_chairs_for_course: studio.hasChairsForCourse, has_tv: studio.hasTv, max_kits_capacity: studio.maxKitsCapacity, attachments: studio.attachments
    };
    if (studio.id) {
        const { error } = await supabase.from('crm_partner_studios').update(payload).eq('id', studio.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('crm_partner_studios').insert([payload]);
        if (error) throw error;
    }
  },

  deletePartnerStudio: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_partner_studios').delete().eq('id', id);
    if (error) throw error;
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
    if (level.id) {
        const { error } = await supabase.from('crm_instructor_levels').update(payload).eq('id', level.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('crm_instructor_levels').insert([payload]);
        if (error) throw error;
    }
  },

  deleteInstructorLevel: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_instructor_levels').delete().eq('id', id);
    if (error) throw error;
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
    if (news.id) {
        const { error } = await supabase.from('crm_teacher_news').update(payload).eq('id', news.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('crm_teacher_news').insert([{ ...payload, id: crypto.randomUUID() }]);
        if (error) throw error;
    }
  },

  deleteTeacherNews: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_teacher_news').delete().eq('id', id);
    if (error) throw error;
  },

  getFormFolders: async (): Promise<FormFolder[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_form_folders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, createdAt: d.created_at }));
  },

  saveFormFolder: async (folder: FormFolder): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_form_folders').upsert({ id: folder.id, name: folder.name });
    if (error) throw error;
  },

  deleteFormFolder: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_form_folders').delete().eq('id', id);
    if (error) throw error;
  },

  getFormById: async (id: string): Promise<FormModel | SurveyModel | null> => {
    if (!isConfigured) return null;
    const { data: form } = await supabase.from('crm_forms').select('*').eq('id', id).maybeSingle();
    if (form) return { 
        id: form.id, title: form.title, description: form.description, campaign: form.campaign, isLeadCapture: form.is_lead_capture, teamId: form.team_id, 
        distributionMode: form.distribution_mode, fixedOwnerId: form.fixed_owner_id || null, targetPipeline: form.target_pipeline, targetStage: form.target_stage,
        questions: form.questions || [], style: form.style || {}, createdAt: form.created_at, submissionsCount: form.submissions_count || 0, folderId: form.folder_id
    };
    const { data: survey } = await supabase.from('crm_surveys').select('*').eq('id', id).maybeSingle();
    if (survey) return { 
        id: survey.id, title: survey.title, description: survey.description, isLeadCapture: survey.is_lead_capture, questions: survey.questions || [], 
        style: survey.style || {}, targetType: survey.target_type, targetProductType: survey.target_product_type, targetProductName: survey.target_product_name,
        onlyIfFinished: survey.only_if_finished, isActive: survey.is_active, createdAt: survey.created_at, submissionsCount: survey.submissions_count || 0 
    };
    return null;
  },

  saveForm: async (form: FormModel): Promise<void> => {
      if (!isConfigured) return;
      const payload = { 
          id: form.id || undefined, title: form.title, description: form.description, campaign: form.campaign || null, is_lead_capture: form.isLeadCapture, 
          questions: form.questions, style: form.style, team_id: form.teamId || null, 
          distribution_mode: form.distribution_mode, 
          fixed_owner_id: form.fixedOwnerId || null, 
          target_pipeline: form.targetPipeline || 'Padrão', 
          target_stage: form.targetStage || 'new',
          submissions_count: form.submissionsCount || 0, folder_id: form.folderId || null
      };
      const { error } = await supabase.from('crm_forms').upsert(payload);
      if (error) throw error;
  },

  getForms: async (): Promise<FormModel[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_forms').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({ 
          id: d.id, title: d.title, description: d.description, campaign: d.campaign, isLeadCapture: d.is_lead_capture, teamId: d.team_id, 
          distributionMode: d.distribution_mode, fixedOwnerId: d.fixed_owner_id || null, targetPipeline: d.target_pipeline, targetStage: d.target_stage,
          questions: d.questions || [], style: d.style || {}, createdAt: d.created_at, submissionsCount: d.submissions_count || 0, folderId: d.folder_id
      }));
  },

  /* FIXED: Corrected property names to match SurveyModel interface (targetType instead of target_type, etc.) */
  saveSurvey: async (survey: SurveyModel): Promise<void> => {
      if (!isConfigured) return;
      const payload = { 
          id: survey.id || undefined, title: survey.title, description: survey.description, is_lead_capture: survey.isLeadCapture, questions: survey.questions, 
          style: survey.style, target_type: survey.targetType, target_product_type: survey.targetProductType || null, target_product_name: survey.targetProductName || null,
          only_if_finished: survey.onlyIfFinished, is_active: survey.isActive, submissions_count: survey.submissionsCount || 0 
      };
      const { error } = await supabase.from('crm_surveys').upsert(payload);
      if (error) throw error;
  },

  getSurveys: async (): Promise<SurveyModel[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_surveys').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({ 
          id: d.id, title: d.title, description: d.description, isLeadCapture: d.is_lead_capture, questions: d.questions || [], style: d.style || {}, 
          targetType: d.target_type, targetProductType: d.target_product_type, targetProductName: d.target_product_name, onlyIfFinished: d.only_if_finished,
          isActive: d.is_active, createdAt: d.created_at, submissionsCount: d.submissions_count || 0 
      }));
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
          if (survey.only_if_finished) {
              if (deal.product_type === 'Presencial') return deal.stage === 'closed';
              return true; 
          }
          return true;
      });
      return eligible.map((d: any) => ({
          id: d.id, title: d.title, description: d.description, isLeadCapture: d.is_lead_capture, questions: d.questions || [], style: d.style || {}, 
          targetType: d.target_type, targetProductType: d.target_product_type, targetProductName: d.target_product_name, onlyIfFinished: d.only_if_finished,
          isActive: d.is_active, createdAt: d.created_at, submissionsCount: d.submissions_count || 0
      }));
  },

  deleteForm: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_forms').delete().eq('id', id);
      await supabase.from('crm_surveys').delete().eq('id', id);
  },

  submitForm: async (formId: string, answers: FormAnswer[], isLeadCapture: boolean, studentId?: string): Promise<void> => {
      const formResource = await appBackend.getFormById(formId);
      if (!formResource) throw new Error("Formulário não encontrado.");
      
      const form = formResource as FormModel;

      if (isConfigured) {
          const cleanStudentId = (studentId && typeof studentId === 'string' && studentId.trim() !== '') ? studentId : null;
          
          const { error } = await supabase.from('crm_form_submissions').insert([{ form_id: formId, answers: answers, student_id: cleanStudentId }]);
          if (error) throw error;
          
          if (isLeadCapture) {
              const dealPayload: any = {
                  deal_number: generateInternalDealNumber(),
                  title: form.title || "Novo Lead via Formulário",
                  stage: form.targetStage || 'new',
                  pipeline: form.targetPipeline || 'Padrão',
                  campaign: form.campaign || 'Webform',
                  status: 'warm',
                  created_at: new Date().toISOString()
              };

              form.questions.forEach(q => {
                  const ans = answers.find(a => a.questionId === q.id);
                  if (ans && q.crmMapping) {
                      const value = ans.value;
                      
                      if (q.crmMapping === 'value') {
                          dealPayload[q.crmMapping] = parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
                      } else {
                          dealPayload[q.crmMapping] = value;
                      }

                      if (q.crmMapping === 'contact_name') {
                          dealPayload.title = value;
                          if (!dealPayload.company_name) dealPayload.company_name = value;
                      }
                      
                      if (q.company_name === 'company_name' && dealPayload.title === form.title) {
                          dealPayload.title = value;
                      }
                  }
              });

              if (form.distributionMode === 'fixed' && form.fixedOwnerId) {
                  dealPayload.owner_id = form.fixedOwnerId;
              } else if (form.distributionMode === 'round-robin' && form.teamId) {
                  const { data: teamData } = await supabase.from('crm_teams').select('members').eq('id', form.teamId).single();
                  if (teamData?.members?.length > 0) {
                      const randomIndex = Math.floor(Math.random() * teamData.members.length);
                      dealPayload.owner_id = teamData.members[randomIndex];
                  }
              }

              await supabase.from('crm_deals').insert([dealPayload]);
          }

          await supabase.from('crm_surveys').update({ submissions_count: (form.submissionsCount || 0) + 1 }).eq('id', formId);
          await supabase.from('crm_forms').update({ submissions_count: (form.submissionsCount || 0) + 1 }).eq('id', formId);
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
      const { error } = await supabase.from('app_contract_folders').upsert({ id: folder.id, name: folder.name });
      if (error) throw error;
  },

  deleteFolder: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('app_contract_folders').delete().eq('id', id);
      if (error) throw error;
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
      const { error } = await supabase.from('app_contracts').upsert({ id: contract.id, title: contract.title, content: contract.content, city: contract.city, contract_date: contract.contractDate, status: contract.status, folder_id: contract.folderId || null, signers: contract.signers });
      if (error) throw error;
  },

  deleteContract: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('app_contracts').delete().eq('id', id);
      if (error) throw error;
  },

  signContract: async (contractId: string, signerId: string, signatureBase64: string): Promise<void> => {
      const contract = await appBackend.getContractById(contractId);
      if (!contract) throw new Error("Contrato não encontrado.");
      const signerIdx = contract.signers.findIndex(s => s.id === signerId);
      if (signerIdx === -1) throw new Error("Signatário não encontrado.");
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
    return (data || []).map((d: any) => ({ 
      id: d.id, 
      title: d.title, 
      backgroundData: d.background_base_64, 
      backBackgroundData: d.back_background_base_64, 
      linkedProductId: d.linked_product_id, 
      bodyText: d.body_text, 
      layoutConfig: d.layout_config, 
      createdAt: d.created_at 
    }));
  },

  saveCertificate: async (cert: CertificateModel): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_certificates').upsert({ 
      id: cert.id || undefined, 
      title: cert.title, 
      background_base_64: cert.backgroundData, 
      back_background_base_64: cert.backBackgroundData, 
      linked_product_id: cert.linkedProductId, 
      body_text: cert.bodyText, 
      layout_config: cert.layoutConfig 
    });
    if (error) throw error;
  },

  deleteCertificate: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_certificates').delete().eq('id', id);
    if (error) throw error;
  },

  getEvents: async (): Promise<EventModel[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_events').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, description: d.description, location: d.location, dates: d.dates || [], createdAt: d.created_at, registrationOpen: d.registration_open || false }));
  },

  saveEvent: async (event: EventModel): Promise<EventModel> => {
    if (!isConfigured) throw new Error("Backend not configured");
    const { data, error = null } = await supabase.from('crm_events').upsert({ id: event.id, name: event.name, description: event.description, location: event.location, dates: event.dates, registration_open: event.registrationOpen }).select().single();
    if (error) throw error;
    return { id: data.id, name: data.name, description: data.description, location: data.location, dates: data.dates || [], createdAt: data.created_at, registrationOpen: data.registration_open || false };
  },

  deleteEvent: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_events').delete().eq('id', id);
    if (error) throw error;
  },

  getInventory: async (): Promise<InventoryRecord[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_inventory').select('*').order('registration_date', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, type: d.type, itemApostilaNova: d.item_apostila_nova, itemApostilaClassico: d.item_apostila_classico, itemSacochila: d.item_sacochila, itemLapis: d.item_lapis, registrationDate: d.registration_date, studioId: d.studio_id, trackingCode: d.tracking_code, observations: d.observations, conferenceDate: d.conference_date, attachments: d.attachments, createdAt: d.created_at }));
  },

  getCourseInfos: async (): Promise<CourseInfo[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_course_info').select('*').order('course_name', { ascending: true });
      if (error) throw error;
      return (data || []).map((d: any) => ({ id: d.id, courseName: d.course_name, details: d.details || '', materials: d.materials || '', requirements: d.requirements || '', updatedAt: d.updated_at }));
  },

  saveCourseInfo: async (info: Partial<CourseInfo>): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_course_info').upsert({
          id: info.id || undefined,
          course_name: info.courseName,
          details: info.details,
          materials: info.materials,
          requirements: info.requirements,
          updated_at: new Date().toISOString()
      });
      if (error) throw error;
  },

  deleteCourseInfo: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_course_info').delete().eq('id', id);
      if (error) throw error;
  },

  issueCertificate: async (studentDealId: string, templateId: string): Promise<string> => {
      if (!isConfigured) return 'mock-hash';
      const hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const { error } = await supabase.from('crm_student_certificates').insert([{
          student_deal_id: studentDealId,
          certificate_template_id: templateId,
          hash: hash,
          issued_at: new Date().toISOString()
      }]);
      if (error) throw error;
      return hash;
  },

  getStudentCertificate: async (hash: string): Promise<{ studentName: string; studentCity: string; template: CertificateModel; issuedAt: string; } | null> => {
      if (!isConfigured) return null;
      const { data: cert, error } = await supabase.from('crm_student_certificates').select('*, crm_deals(company_name, contact_name, course_city), crm_certificates(*)').eq('hash', hash).maybeSingle();
      if (error || !cert) return null;
      
      const templateData = cert.crm_certificates;
      const dealData = cert.crm_deals;

      return {
          studentName: dealData.company_name || dealData.contact_name,
          studentCity: dealData.course_city || 'Voll Pilates',
          issuedAt: cert.issued_at,
          template: {
              id: templateData.id,
              title: templateData.title,
              backgroundData: templateData.background_base_64,
              backBackgroundData: templateData.back_background_base_64,
              linkedProductId: templateData.linked_product_id,
              bodyText: templateData.body_text,
              layoutConfig: templateData.layout_config,
              createdAt: templateData.created_at
          }
      };
  },

  deleteStudentCertificate: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_student_certificates').delete().eq('id', id);
      if (error) throw error;
  },

  getWorkshops: async (eventId: string): Promise<Workshop[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_event_workshops').select('*').eq('event_id', eventId).order('date').order('time');
      if (error) throw error;
      return (data || []).map((w: any) => ({
          id: w.id, eventId: w.event_id, blockId: w.block_id, title: w.title, description: w.description, speaker: w.speaker, date: w.date, time: w.time, spots: w.spots
      }));
  },

  getBlocks: async (eventId: string): Promise<EventBlock[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_event_blocks').select('*').eq('event_id', eventId).order('date').order('title');
      if (error) throw error;
      return (data || []).map((b: any) => ({
          id: b.id, eventId: b.event_id, date: b.date, title: b.title, maxSelections: b.max_selections
      }));
  },

  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_event_registrations').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({
          id: r.id, eventId: r.event_id, workshopId: r.workshop_id, studentId: r.student_id, studentName: r.student_name, studentEmail: r.student_email, registeredAt: r.created_at
      }));
  },

  saveBlock: async (block: EventBlock): Promise<EventBlock> => {
      if (!isConfigured) throw new Error("Backend not configured");
      const { data, error } = await supabase.from('crm_event_blocks').upsert({
          id: block.id || undefined,
          event_id: block.eventId,
          date: block.date,
          title: block.title,
          max_selections: block.maxSelections
      }).select().single();
      if (error) throw error;
      return { id: data.id, eventId: data.event_id, date: data.date, title: data.title, maxSelections: data.max_selections };
  },

  deleteBlock: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_event_blocks').delete().eq('id', id);
      if (error) throw error;
  },

  saveWorkshop: async (workshop: Workshop): Promise<Workshop> => {
      if (!isConfigured) throw new Error("Backend not configured");
      const { data, error = null } = await supabase.from('crm_event_workshops').upsert({
          id: workshop.id || undefined,
          event_id: workshop.eventId,
          block_id: workshop.blockId,
          title: workshop.title,
          description: workshop.description,
          speaker: workshop.speaker,
          date: workshop.date,
          time: workshop.time,
          spots: workshop.spots
      }).select().single();
      if (error) throw error;
      return { 
          id: data.id, eventId: data.event_id, blockId: data.block_id, 
          title: data.title, description: data.description, speaker: data.speaker, 
          date: data.date, time: data.time, spots: data.spots 
      };
  },

  deleteWorkshop: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error = null } = await supabase.from('crm_event_workshops').delete().eq('id', id);
      if (error) throw error;
  },

  saveInventoryRecord: async (record: InventoryRecord): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_inventory').upsert({
          id: record.id || undefined,
          type: record.type,
          item_apostila_nova: record.itemApostilaNova,
          item_apostila_classico: record.itemApostilaClassico,
          item_sacochila: record.itemSacochila,
          item_lapis: record.itemLapis,
          registration_date: record.registrationDate,
          studio_id: record.studioId,
          tracking_code: record.trackingCode,
          observations: record.observations,
          conference_date: record.conferenceDate,
          attachments: record.attachments
      });
      if (error) throw error;
  },

  deleteInventoryRecord: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_inventory').delete().eq('id', id);
      if (error) throw error;
  }
};
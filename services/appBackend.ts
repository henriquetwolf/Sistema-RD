
import { createClient, Session } from '@supabase/supabase-js';
import { 
  SavedPreset, FormModel, SurveyModel, FormAnswer, Contract, ContractFolder, 
  CertificateModel, StudentCertificate, EventModel, Workshop, EventRegistration, 
  EventBlock, Role, Banner, PartnerStudio, InstructorLevel, InventoryRecord, 
  SyncJob, ActivityLog, CollaboratorSession, BillingNegotiation, FormFolder, 
  CourseInfo, TeacherNews, SupportTicket, SupportMessage, 
  CompanySetting, Pipeline, WebhookTrigger, SupportTag, OnlineCourse, CourseModule, CourseLesson, StudentCourseAccess, StudentLessonProgress
} from '../types';

/**
 * Exporting types required by other components
 */
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

// Helper interno para gerar número de negócio
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
      await supabase.auth.signOut();
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

  // --- PRESETS ---
  /* Fixes property not found errors in ConfigPanel.tsx */
  getPresets: async (): Promise<SavedPreset[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_presets').select('*').order('name');
    if (error) throw error;
    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      url: p.url,
      key: p.key,
      tableName: p.table_name,
      primaryKey: p.primary_key,
      intervalMinutes: p.interval_minutes,
      createdByName: p.created_by_name
    }));
  },
  savePreset: async (preset: Partial<SavedPreset>): Promise<SavedPreset> => {
    if (!isConfigured) throw new Error("Backend not configured");
    const payload = {
      name: preset.name,
      url: preset.url,
      key: preset.key,
      table_name: preset.tableName,
      primary_key: preset.primaryKey,
      interval_minutes: preset.intervalMinutes,
      created_by_name: preset.createdByName
    };
    const { data, error } = await supabase.from('crm_presets').insert([payload]).select().single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      url: data.url,
      key: data.key,
      tableName: data.table_name,
      primaryKey: data.primary_key,
      intervalMinutes: data.interval_minutes,
      createdByName: data.created_by_name
    };
  },
  deletePreset: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_presets').delete().eq('id', id);
    if (error) throw error;
  },

  // --- SETTINGS (LOGO & MARGIN) ---
  /* Fixes property not found errors in App.tsx and SettingsManager.tsx */
  getAppLogo: async (): Promise<string | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('crm_settings').select('value').eq('key', 'app_logo').maybeSingle();
    return data?.value || null;
  },
  saveAppLogo: async (logo: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_settings').upsert({ key: 'app_logo', value: logo });
  },
  getInventorySecurityMargin: async (): Promise<number> => {
    if (!isConfigured) return 5;
    const { data } = await supabase.from('crm_settings').select('value').eq('key', 'inventory_security_margin').maybeSingle();
    return data ? parseInt(data.value) : 5;
  },
  saveInventorySecurityMargin: async (margin: number): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_settings').upsert({ key: 'inventory_security_margin', value: String(margin) });
  },

  // --- FORMS & SURVEYS ---
  /* Fixes property not found errors in App.tsx, FormsManager.tsx, SurveyManager.tsx */
  getForms: async (): Promise<FormModel[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_forms').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((f: any) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      campaign: f.campaign,
      isLeadCapture: f.is_lead_capture,
      teamId: f.team_id,
      distributionMode: f.distribution_mode,
      fixedOwnerId: f.fixed_owner_id,
      targetPipeline: f.target_pipeline,
      targetStage: f.target_stage,
      questions: f.questions || [],
      style: f.style,
      createdAt: f.created_at,
      submissionsCount: f.submissions_count || 0,
      folderId: f.folder_id
    }));
  },
  getSurveys: async (): Promise<SurveyModel[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_surveys').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((f: any) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      isLeadCapture: f.is_lead_capture,
      questions: f.questions || [],
      style: f.style,
      createdAt: f.created_at,
      submissionsCount: f.submissions_count || 0,
      targetType: f.target_type,
      targetProductType: f.target_product_type,
      targetProductName: f.target_product_name,
      onlyIfFinished: f.only_if_finished,
      isActive: f.is_active,
      folderId: f.folder_id
    }));
  },
  getFormById: async (id: string): Promise<FormModel | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('crm_forms').select('*').eq('id', id).maybeSingle();
    if (!data) {
        const { data: surveyData } = await supabase.from('crm_surveys').select('*').eq('id', id).maybeSingle();
        if (surveyData) return { ...surveyData, isLeadCapture: false } as any;
        return null;
    }
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      campaign: data.campaign,
      isLeadCapture: data.is_lead_capture,
      teamId: data.team_id,
      distributionMode: data.distribution_mode,
      fixedOwnerId: data.fixed_owner_id,
      targetPipeline: data.target_pipeline,
      targetStage: data.target_stage,
      questions: data.questions || [],
      style: data.style,
      createdAt: data.created_at,
      submissionsCount: data.submissions_count || 0,
      folderId: data.folder_id
    };
  },
  saveForm: async (form: FormModel): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      title: form.title,
      description: form.description,
      campaign: form.campaign,
      is_lead_capture: form.isLeadCapture,
      team_id: form.teamId,
      distribution_mode: form.distributionMode,
      fixed_owner_id: form.fixedOwnerId,
      target_pipeline: form.targetPipeline,
      target_stage: form.targetStage,
      questions: form.questions,
      style: form.style,
      folder_id: form.folderId
    };
    if (form.id && form.id.length > 10) {
        await supabase.from('crm_forms').update(payload).eq('id', form.id);
    } else {
        await supabase.from('crm_forms').insert([{ ...payload, id: form.id || crypto.randomUUID() }]);
    }
  },
  saveSurvey: async (survey: SurveyModel): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      title: survey.title,
      description: survey.description,
      questions: survey.questions,
      style: survey.style,
      target_type: survey.targetType,
      target_product_type: survey.targetProductType,
      target_product_name: survey.targetProductName,
      only_if_finished: survey.onlyIfFinished,
      is_active: survey.isActive,
      folder_id: survey.folderId
    };
    if (survey.id && survey.id.length > 10) {
        await supabase.from('crm_surveys').update(payload).eq('id', survey.id);
    } else {
        await supabase.from('crm_surveys').insert([{ ...payload, id: survey.id || crypto.randomUUID() }]);
    }
  },
  deleteForm: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_forms').delete().eq('id', id);
    await supabase.from('crm_surveys').delete().eq('id', id);
  },
  getFormFolders: async (): Promise<FormFolder[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_form_folders').select('*').order('name');
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
  submitForm: async (formId: string, answers: FormAnswer[], isLeadCapture: boolean, studentId?: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_form_submissions').insert([{
          form_id: formId,
          answers: answers,
          student_id: studentId
      }]);
      if (error) throw error;
      await supabase.rpc('increment_form_submissions', { f_id: formId });
      if (isLeadCapture) {
          const { data: form } = await supabase.from('crm_forms').select('*').eq('id', formId).single();
          if (form) {
              const dealData: any = {
                  title: `Lead via ${form.title}`,
                  pipeline: form.target_pipeline || 'Padrão',
                  stage: form.target_stage || 'new',
                  campaign: form.campaign,
                  source: 'Formulário Online',
                  owner_id: form.fixed_owner_id,
                  deal_number: generateInternalDealNumber()
              };
              answers.forEach(ans => {
                  const question = (form.questions as any[]).find(q => q.id === ans.questionId);
                  if (question && question.crmMapping) {
                      dealData[question.crmMapping] = ans.value;
                  }
              });
              if (form.distribution_mode === 'round-robin' && form.team_id) {
                  const { data: team } = await supabase.from('crm_teams').select('members').eq('id', form.team_id).single();
                  if (team && team.members && team.members.length > 0) {
                      dealData.owner_id = team.members[Math.floor(Math.random() * team.members.length)];
                  }
              }
              await supabase.from('crm_deals').insert([dealData]);
          }
      }
  },
  getFormSubmissions: async (formId: string): Promise<any[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_form_submissions').select('*').eq('form_id', formId).order('created_at', { ascending: false });
      return data || [];
  },

  // --- SYNC JOBS ---
  /* Fixes property not found errors in App.tsx */
  getSyncJobs: async (): Promise<SyncJob[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_sync_jobs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((j: any) => ({
      id: j.id,
      name: j.name,
      sheetUrl: j.sheet_url,
      config: j.config,
      lastSync: j.last_sync,
      status: j.status,
      lastMessage: j.last_message,
      active: j.active,
      intervalMinutes: j.interval_minutes,
      createdBy: j.created_by,
      createdAt: j.created_at
    }));
  },
  saveSyncJob: async (job: SyncJob): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      id: job.id,
      name: job.name,
      sheet_url: job.sheetUrl,
      config: job.config,
      last_sync: job.lastSync,
      status: job.status,
      last_message: job.lastMessage,
      active: job.active,
      interval_minutes: job.intervalMinutes,
      created_by: job.createdBy
    };
    await supabase.from('crm_sync_jobs').upsert(payload);
  },
  deleteSyncJob: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_sync_jobs').delete().eq('id', id);
  },
  updateJobStatus: async (id: string, status: string, lastSync: string, lastMessage: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_sync_jobs').update({ status, last_sync: lastSync, last_message: lastMessage }).eq('id', id);
  },

  // --- PIPELINES ---
  /* Fixes property not found errors in CrmBoard.tsx, FormsManager.tsx, SettingsManager.tsx */
  getPipelines: async (): Promise<Pipeline[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_pipelines').select('*').order('name');
    if (error) throw error;
    return data || [];
  },
  savePipeline: async (pipeline: Pipeline): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_pipelines').upsert(pipeline);
  },
  deletePipeline: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_pipelines').delete().eq('id', id);
  },

  // --- COMPANIES ---
  /* Fixes property not found errors in CrmBoard.tsx, SettingsManager.tsx */
  getCompanies: async (): Promise<CompanySetting[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_companies').select('*').order('legal_name');
    if (error) throw error;
    return (data || []).map((c: any) => ({
      id: c.id,
      legalName: c.legal_name,
      cnpj: c.cnpj,
      webhookUrl: c.webhook_url,
      productTypes: c.product_types || [],
      productIds: c.product_ids || []
    }));
  },
  saveCompany: async (company: CompanySetting): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      legal_name: company.legalName,
      cnpj: company.cnpj,
      webhook_url: company.webhookUrl,
      product_types: company.productTypes,
      product_ids: company.productIds
    };
    if (company.id) {
        await supabase.from('crm_companies').update(payload).eq('id', company.id);
    } else {
        await supabase.from('crm_companies').insert([payload]);
    }
  },
  deleteCompany: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_companies').delete().eq('id', id);
  },

  // --- WEBHOOK TRIGGERS ---
  /* Fixes property not found errors in CrmBoard.tsx, SettingsManager.tsx */
  getWebhookTriggers: async (): Promise<WebhookTrigger[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_webhook_triggers').select('*');
    return (data || []).map((t: any) => ({
      id: t.id,
      pipelineName: t.pipeline_name,
      stageId: t.stage_id,
      payloadJson: t.payload_json,
      createdAt: t.created_at
    }));
  },
  saveWebhookTrigger: async (trigger: Partial<WebhookTrigger>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      pipeline_name: trigger.pipelineName,
      stage_id: trigger.stageId,
      payload_json: trigger.payloadJson
    };
    if (trigger.id) {
        await supabase.from('crm_webhook_triggers').update(payload).eq('id', trigger.id);
    } else {
        await supabase.from('crm_webhook_triggers').insert([payload]);
    }
  },
  deleteWebhookTrigger: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_webhook_triggers').delete().eq('id', id);
  },

  // --- SUPPORT ---
  /* Fixes property not found errors across support components */
  saveSupportTicket: async (ticket: Partial<SupportTicket>): Promise<SupportTicket> => {
    if (!isConfigured) throw new Error("Backend not configured");
    const payload = {
      id: ticket.id || crypto.randomUUID(),
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
      status: ticket.status,
      assigned_id: ticket.assignedId,
      assigned_name: ticket.assignedName,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('crm_support_tickets').upsert(payload).select().single();
    if (error) throw error;
    return {
      id: data.id, senderId: data.sender_id, senderName: data.sender_name, senderEmail: data.sender_email, senderRole: data.sender_role,
      targetId: data.target_id, targetName: data.target_name, targetEmail: data.target_email, targetRole: data.target_role,
      subject: data.subject, message: data.message, tag: data.tag, status: data.status,
      assignedId: data.assigned_id, assignedName: data.assigned_name, createdAt: data.created_at, updatedAt: data.updated_at
    };
  },
  getSupportTickets: async (): Promise<SupportTicket[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_support_tickets').select('*').order('created_at', { ascending: false });
    return (data || []).map((t: any) => ({
      id: t.id, senderId: t.sender_id, senderName: t.sender_name, senderEmail: t.sender_email, senderRole: t.sender_role,
      targetId: t.target_id, targetName: t.target_name, targetEmail: t.target_email, targetRole: t.target_role,
      subject: t.subject, message: t.message, tag: t.tag, status: t.status,
      assignedId: t.assigned_id, assignedName: t.assigned_name, createdAt: t.created_at, updatedAt: t.updated_at
    }));
  },
  getSupportTicketsBySender: async (senderId: string): Promise<SupportTicket[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_support_tickets').select('*').or(`sender_id.eq.${senderId},target_id.eq.${senderId}`).order('created_at', { ascending: false });
    return (data || []).map((t: any) => ({
      id: t.id, senderId: t.sender_id, senderName: t.sender_name, senderEmail: t.sender_email, senderRole: t.sender_role,
      targetId: t.target_id, targetName: t.target_name, targetEmail: t.target_email, targetRole: t.target_role,
      subject: t.subject, message: t.message, tag: t.tag, status: t.status,
      assignedId: t.assigned_id, assignedName: t.assigned_name, createdAt: t.created_at, updatedAt: t.updated_at
    }));
  },
  getSupportTicketMessages: async (ticketId: string): Promise<SupportMessage[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      return (data || []).map((m: any) => ({
          id: m.id, ticketId: m.ticket_id, senderId: m.sender_id, senderName: m.sender_name, senderRole: m.sender_role,
          content: m.content, attachmentUrl: m.attachment_url, attachmentName: m.attachment_name, createdAt: m.created_at
      }));
  },
  addSupportMessage: async (msg: Partial<SupportMessage>): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_support_messages').insert([{
          ticket_id: msg.ticketId,
          sender_id: msg.senderId,
          sender_name: msg.senderName,
          sender_role: msg.senderRole,
          content: msg.content,
          attachment_url: msg.attachmentUrl,
          attachment_name: msg.attachmentName
      }]);
  },
  deleteSupportTicket: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_support_tickets').delete().eq('id', id);
  },
  getSupportTags: async (role?: 'student' | 'instructor' | 'studio'): Promise<SupportTag[]> => {
      if (!isConfigured) return [];
      let query = supabase.from('crm_support_tags').select('*').order('name');
      if (role) query = query.or(`role.eq.${role},role.eq.all`);
      const { data } = await query;
      return (data || []).map((t: any) => ({ id: t.id, name: t.name, role: t.role, createdAt: t.created_at }));
  },
  saveSupportTag: async (tag: Partial<SupportTag>): Promise<void> => {
      if (!isConfigured) return;
      const payload = { name: tag.name, role: tag.role };
      if (tag.id) await supabase.from('crm_support_tags').update(payload).eq('id', tag.id);
      else await supabase.from('crm_support_tags').insert([payload]);
  },
  deleteSupportTag: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_support_tags').delete().eq('id', id);
  },

  // --- ROLES ---
  /* Fixes property not found errors in CollaboratorsManager.tsx, SettingsManager.tsx */
  getRoles: async (): Promise<Role[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_roles').select('*').order('name');
    return data || [];
  },
  saveRole: async (role: Role): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_roles').upsert(role);
  },
  deleteRole: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_roles').delete().eq('id', id);
  },

  // --- PARTNER STUDIOS ---
  /* Fixes property not found errors in ClassesManager.tsx, InventoryManager.tsx, PartnerStudioArea.tsx, PartnerStudiosManager.tsx */
  getPartnerStudios: async (): Promise<PartnerStudio[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_partner_studios').select('*').order('fantasy_name');
    return (data || []).map((d: any) => ({
      id: d.id, status: d.status, responsibleName: d.responsible_name, cpf: d.cpf, phone: d.phone, email: d.email, password: d.password,
      secondContactName: d.second_contact_name, secondContactPhone: d.second_contact_phone, fantasyName: d.fantasy_name, legalName: d.legal_name,
      cnpj: d.cnpj, studioPhone: d.studio_phone, address: d.address, city: d.city, state: d.state, country: d.country,
      sizeM2: d.size_m2, studentCapacity: d.student_capacity, rentValue: d.rent_value, methodology: d.methodology,
      studioType: d.studio_type, nameOnSite: d.name_on_site, bank: d.bank, agency: d.agency, account: d.account,
      beneficiary: d.beneficiary, pixKey: d.pix_key, hasReformer: !!d.has_reformer, qtyReformer: d.qty_reformer || 0,
      hasLadderBarrel: !!d.has_ladder_barrel, qtyLadderBarrel: d.qty_ladder_barrel || 0, hasChair: !!d.has_chair, qtyChair: d.qty_chair || 0,
      hasCadillac: !!d.has_cadillac, qtyCadillac: d.qty_cadillac || 0, hasChairsForCourse: !!d.has_chairs_for_course,
      hasTv: !!d.has_tv, maxKitsCapacity: d.max_kits_capacity, attachments: d.attachments
    }));
  },
  savePartnerStudio: async (studio: PartnerStudio): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      status: studio.status, responsible_name: studio.responsibleName, cpf: studio.cpf, phone: studio.phone, email: studio.email, password: studio.password,
      second_contact_name: studio.secondContactName, second_contact_phone: studio.secondContactPhone, fantasy_name: studio.fantasyName,
      legal_name: studio.legalName, cnpj: studio.cnpj, studio_phone: studio.studioPhone, address: studio.address, city: studio.city,
      state: studio.state, country: studio.country, size_m2: studio.sizeM2, student_capacity: studio.studentCapacity, rent_value: studio.rentValue,
      methodology: studio.methodology, studio_type: studio.studioType, name_on_site: studio.nameOnSite, bank: studio.bank, agency: studio.agency,
      account: studio.account, beneficiary: studio.beneficiary, pix_key: studio.pixKey, has_reformer: studio.hasReformer, qty_reformer: studio.qtyReformer,
      has_ladder_barrel: studio.hasLadderBarrel, qty_ladder_barrel: studio.qtyLadderBarrel, has_chair: studio.hasChair, qty_chair: studio.qtyChair,
      has_cadillac: studio.hasCadillac, qty_cadillac: studio.qtyCadillac, has_chairs_for_course: studio.hasChairsForCourse,
      has_tv: studio.hasTv, max_kits_capacity: studio.maxKitsCapacity, attachments: studio.attachments
    };
    if (studio.id) await supabase.from('crm_partner_studios').update(payload).eq('id', studio.id);
    else await supabase.from('crm_partner_studios').insert([payload]);
  },
  deletePartnerStudio: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_partner_studios').delete().eq('id', id);
  },

  // --- INSTRUCTOR LEVELS ---
  /* Fixes property not found errors in TeachersManager.tsx, SettingsManager.tsx */
  getInstructorLevels: async (): Promise<InstructorLevel[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_instructor_levels').select('*').order('name');
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, honorarium: d.honorarium, observations: d.observations, createdAt: d.created_at }));
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

  // --- BANNERS ---
  /* Fixes property not found errors in SettingsManager.tsx, InstructorArea.tsx, StudentArea.tsx */
  getBanners: async (audience?: 'student' | 'instructor'): Promise<Banner[]> => {
    if (!isConfigured) return [];
    let query = supabase.from('crm_banners').select('*').order('created_at', { ascending: false });
    if (audience) query = query.eq('target_audience', audience).eq('active', true);
    const { data } = await query;
    return (data || []).map((d: any) => ({ id: d.id, title: d.title, imageUrl: d.image_url, linkUrl: d.link_url, targetAudience: d.target_audience, active: d.active, createdAt: d.created_at }));
  },
  saveBanner: async (banner: Banner): Promise<void> => {
    if (!isConfigured) return;
    const payload = { title: banner.title, image_url: banner.imageUrl, link_url: banner.linkUrl, target_audience: banner.targetAudience, active: banner.active };
    if (banner.id) await supabase.from('crm_banners').update(payload).eq('id', banner.id);
    else await supabase.from('crm_banners').insert([payload]);
  },
  deleteBanner: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_banners').delete().eq('id', id);
  },

  // --- TEACHER NEWS ---
  /* Fixes property not found errors in TeachersManager.tsx, InstructorArea.tsx */
  getTeacherNews: async (): Promise<TeacherNews[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_teacher_news').select('*').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({ id: d.id, title: d.title, content: d.content, imageUrl: d.image_url, createdAt: d.created_at }));
  },
  saveTeacherNews: async (news: Partial<TeacherNews>): Promise<void> => {
    if (!isConfigured) return;
    const payload = { title: news.title, content: news.content, image_url: news.imageUrl };
    if (news.id) await supabase.from('crm_teacher_news').update(payload).eq('id', news.id);
    else await supabase.from('crm_teacher_news').insert([payload]);
  },
  deleteTeacherNews: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_teacher_news').delete().eq('id', id);
  },

  // --- INVENTORY ---
  /* Fixes property not found errors in SettingsManager.tsx, InventoryManager.tsx, PartnerStudioArea.tsx */
  getInventory: async (): Promise<InventoryRecord[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_inventory').select('*').order('registration_date', { ascending: false });
    return (data || []).map((d: any) => ({
      id: d.id, type: d.type, itemApostilaNova: d.item_apostila_nova, itemApostilaClassico: d.item_apostila_classico,
      itemSacochila: d.item_sacochila, itemLapis: d.item_lapis, registrationDate: d.registration_date,
      studioId: d.studio_id, trackingCode: d.tracking_code, observations: d.observations, conferenceDate: d.conference_date,
      attachments: d.attachments, createdAt: d.created_at
    }));
  },
  saveInventoryRecord: async (record: InventoryRecord): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      type: record.type, item_apostila_nova: record.itemApostilaNova, item_apostila_classico: record.itemApostilaClassico,
      item_sacochila: record.itemSacochila, item_lapis: record.itemLapis, registration_date: record.registrationDate,
      studio_id: record.studioId || null, tracking_code: record.trackingCode, observations: record.observations,
      conference_date: record.conferenceDate || null, attachments: record.attachments
    };
    if (record.id) await supabase.from('crm_inventory').update(payload).eq('id', record.id);
    else await supabase.from('crm_inventory').insert([payload]);
  },
  deleteInventoryRecord: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_inventory').delete().eq('id', id);
  },

  // --- BILLING NEGOTIATIONS ---
  /* Fixes property not found errors in BillingManager.tsx */
  getBillingNegotiations: async (): Promise<BillingNegotiation[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_billing_negotiations').select('*').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({
      id: d.id, openInstallments: d.open_installments, totalNegotiatedValue: d.total_negotiated_value, totalInstallments: d.total_installments,
      dueDate: d.due_date, responsibleAgent: d.responsible_agent, identifierCode: d.identifier_code, fullName: d.full_name,
      productName: d.product_name, originalValue: d.original_value, paymentMethod: d.payment_method, observations: d.observations,
      status: d.status, team: d.team, voucher_link_1: d.voucherLink1, test_date: d.testDate, voucher_link_2: d.voucherLink2,
      voucher_link_3: d.voucherLink3, boletos_link: d.boletosLink, negotiation_reference: d.negotiationReference,
      attachments: d.attachments, createdAt: d.created_at
    }));
  },
  saveBillingNegotiation: async (neg: Partial<BillingNegotiation>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      open_installments: neg.openInstallments, total_negotiated_value: neg.totalNegotiatedValue, total_installments: neg.totalInstallments,
      due_date: neg.dueDate || null, responsible_agent: neg.responsibleAgent, identifier_code: neg.identifierCode, full_name: neg.fullName,
      product_name: neg.productName, original_value: neg.originalValue, payment_method: neg.paymentMethod, observations: neg.observations,
      status: neg.status, team: neg.team, voucher_link_1: neg.voucherLink1, test_date: neg.testDate, voucher_link_2: neg.voucherLink2,
      voucher_link_3: neg.voucherLink3, boletos_link: neg.boletosLink, negotiation_reference: neg.negotiationReference, attachments: neg.attachments
    };
    if (neg.id) await supabase.from('crm_billing_negotiations').update(payload).eq('id', neg.id);
    else await supabase.from('crm_billing_negotiations').insert([payload]);
  },
  deleteBillingNegotiation: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_billing_negotiations').delete().eq('id', id);
  },

  // --- CONTRACTS ---
  /* Fixes property not found errors in App.tsx, ContractsManager.tsx, InstructorArea.tsx, ContractSigning.tsx */
  getContracts: async (): Promise<Contract[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_contracts').select('*').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({
      id: d.id, title: d.title, content: d.content, city: d.city, contractDate: d.contract_date,
      status: d.status, folderId: d.folder_id, signers: d.signers || [], createdAt: d.created_at
    }));
  },
  getContractById: async (id: string): Promise<Contract | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('crm_contracts').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    return {
      id: data.id, title: data.title, content: data.content, city: data.city, contractDate: data.contract_date,
      status: data.status, folderId: data.folder_id, signers: data.signers || [], createdAt: data.created_at
    };
  },
  saveContract: async (contract: Contract): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      id: contract.id, title: contract.title, content: contract.content, city: contract.city,
      contract_date: contract.contractDate, status: contract.status, folder_id: contract.folderId, signers: contract.signers
    };
    await supabase.from('crm_contracts').upsert(payload);
  },
  deleteContract: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_contracts').delete().eq('id', id);
  },
  signContract: async (contractId: string, signerId: string, signatureData: string): Promise<void> => {
      if (!isConfigured) return;
      const { data: contract } = await supabase.from('crm_contracts').select('signers').eq('id', contractId).single();
      if (!contract) return;
      const updatedSigners = (contract.signers as any[]).map(s => {
          if (s.id === signerId) {
              return { ...s, status: 'signed', signatureData, signedAt: new Date().toISOString() };
          }
          return s;
      });
      const allSigned = updatedSigners.every(s => s.status === 'signed');
      await supabase.from('crm_contracts').update({ 
          signers: updatedSigners, 
          status: allSigned ? 'signed' : 'sent' 
      }).eq('id', contractId);
  },
  getFolders: async (): Promise<ContractFolder[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_contract_folders').select('*').order('name');
      return (data || []).map((d: any) => ({ id: d.id, name: d.name, createdAt: d.created_at }));
  },
  saveFolder: async (folder: ContractFolder): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_contract_folders').upsert({ id: folder.id, name: folder.name });
  },
  deleteFolder: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_contract_folders').delete().eq('id', id);
  },

  // --- CERTIFICATES ---
  /* Fixes property not found errors in ProductsManager.tsx, CertificatesManager.tsx, CertificateViewer.tsx, ClassStudentsViewer.tsx, StudentsManager.tsx, StudentArea.tsx */
  getCertificates: async (): Promise<CertificateModel[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_certificates').select('*').order('created_at', { ascending: false });
      return (data || []).map((d: any) => ({
          id: d.id, title: d.title, backgroundData: d.background_data, backBackgroundData: d.back_background_data,
          linkedProductId: d.linked_product_id, bodyText: d.body_text, layoutConfig: d.layout_config, createdAt: d.created_at
      }));
  },
  saveCertificate: async (cert: CertificateModel): Promise<void> => {
      if (!isConfigured) return;
      const payload = {
          id: cert.id, title: cert.title, background_data: cert.backgroundData, back_background_data: cert.backBackgroundData,
          linked_product_id: cert.linkedProductId, body_text: cert.bodyText, layout_config: cert.layoutConfig
      };
      await supabase.from('crm_certificates').upsert(payload);
  },
  deleteCertificate: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_certificates').delete().eq('id', id);
  },
  issueCertificate: async (studentDealId: string, templateId: string): Promise<string> => {
      if (!isConfigured) return 'mock-hash';
      const hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await supabase.from('crm_student_certificates').insert([{
          student_deal_id: studentDealId,
          certificate_template_id: templateId,
          hash: hash,
          issued_at: new Date().toISOString()
      }]);
      return hash;
  },
  getStudentCertificate: async (hash: string): Promise<any> => {
      if (!isConfigured) return null;
      const { data: cert } = await supabase.from('crm_student_certificates').select('*, crm_deals(company_name, contact_name, course_city), crm_certificates(*)').eq('hash', hash).single();
      if (!cert) return null;
      const d = cert.crm_deals;
      const t = cert.crm_certificates;
      return {
          studentName: d.company_name || d.contact_name,
          studentCity: d.course_city || 'Sede VOLL',
          template: {
              id: t.id, title: t.title, backgroundData: t.background_data, backBackgroundData: t.back_background_data,
              linkedProductId: t.linked_product_id, bodyText: t.body_text, layoutConfig: t.layout_config
          },
          issuedAt: cert.issued_at
      };
  },

  // --- WHATSAPP CONFIG ---
  /* Fixes property not found errors in WhatsAppInbox.tsx */
  getWhatsAppConfig: async (): Promise<any> => {
      if (!isConfigured) return null;
      const { data } = await supabase.from('crm_whatsapp_config').select('*').limit(1).maybeSingle();
      if (!data) return null;
      return {
          instanceUrl: data.instance_url,
          instanceName: data.instance_name,
          apiKey: data.api_key,
          pairingNumber: data.pairing_number,
          mode: data.mode
      };
  },
  saveWhatsAppConfig: async (config: any): Promise<void> => {
      if (!isConfigured) return;
      const payload = {
          instance_url: config.instanceUrl,
          instance_name: config.instanceName,
          api_key: config.apiKey,
          pairing_number: config.pairingNumber,
          mode: config.mode || 'evolution'
      };
      const { data: existing } = await supabase.from('crm_whatsapp_config').select('id').limit(1).maybeSingle();
      if (existing) {
          await supabase.from('crm_whatsapp_config').update(payload).eq('id', existing.id);
      } else {
          await supabase.from('crm_whatsapp_config').insert([payload]);
      }
  },

  // --- COURSE INFO ---
  /* Fixes property not found errors in SettingsManager.tsx */
  getCourseInfos: async (): Promise<CourseInfo[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_course_infos').select('*').order('course_name');
      return (data || []).map((d: any) => ({
          id: d.id, courseName: d.course_name, details: d.details, materials: d.materials, requirements: d.requirements, updatedAt: d.updated_at
      }));
  },
  saveCourseInfo: async (info: Partial<CourseInfo>): Promise<void> => {
      if (!isConfigured) return;
      const payload = { course_name: info.courseName, details: info.details, materials: info.materials, requirements: info.requirements, updated_at: new Date().toISOString() };
      if (info.id) await supabase.from('crm_course_infos').update(payload).eq('id', info.id);
      else await supabase.from('crm_course_infos').insert([payload]);
  },
  deleteCourseInfo: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_course_infos').delete().eq('id', id);
  },

  // --- EVENTS ---
  /* Fixes property not found errors in EventsManager.tsx */
  getEvents: async (): Promise<EventModel[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_events').select('*').order('created_at', { ascending: false });
      return (data || []).map((d: any) => ({
          id: d.id, name: d.name, description: d.description, location: d.location, dates: d.dates || [], createdAt: d.created_at, registrationOpen: d.registration_open
      }));
  },
  saveEvent: async (evt: EventModel): Promise<EventModel> => {
      if (!isConfigured) throw new Error("Backend not configured");
      const payload = { name: evt.name, description: evt.description, location: evt.location, dates: evt.dates, registration_open: evt.registrationOpen };
      const { data, error } = evt.id && evt.id.length > 10 
          ? await supabase.from('crm_events').update(payload).eq('id', evt.id).select().single()
          : await supabase.from('crm_events').insert([payload]).select().single();
      if (error) throw error;
      return { id: data.id, name: data.name, description: data.description, location: data.location, dates: data.dates || [], createdAt: data.created_at, registrationOpen: data.registration_open };
  },
  deleteEvent: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_events').delete().eq('id', id);
  },
  getWorkshops: async (eventId: string): Promise<Workshop[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_event_workshops').select('*').eq('event_id', eventId).order('date').order('time');
      return (data || []).map((d: any) => ({
          id: d.id, eventId: d.event_id, blockId: d.block_id, title: d.title, description: d.description, speaker: d.speaker, date: d.date, time: d.time, spots: d.spots
      }));
  },
  saveWorkshop: async (ws: Workshop): Promise<Workshop> => {
      if (!isConfigured) throw new Error("Backend not configured");
      const payload = {
          event_id: ws.eventId, block_id: ws.blockId, title: ws.title, description: ws.description, speaker: ws.speaker, date: ws.date, time: ws.time, spots: ws.spots
      };
      const { data, error } = ws.id 
          ? await supabase.from('crm_event_workshops').update(payload).eq('id', ws.id).select().single()
          : await supabase.from('crm_event_workshops').insert([payload]).select().single();
      if (error) throw error;
      return { id: data.id, eventId: data.event_id, blockId: data.block_id, title: data.title, description: data.description, speaker: data.speaker, date: data.date, time: data.time, spots: data.spots };
  },
  deleteWorkshop: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_event_workshops').delete().eq('id', id);
  },
  getBlocks: async (eventId: string): Promise<EventBlock[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_event_blocks').select('*').eq('event_id', eventId).order('date').order('title');
      return (data || []).map((d: any) => ({
          id: d.id, eventId: d.event_id, date: d.date, title: d.title, maxSelections: d.max_selections
      }));
  },
  saveBlock: async (block: EventBlock): Promise<EventBlock> => {
      if (!isConfigured) throw new Error("Backend not configured");
      const payload = { event_id: block.eventId, date: block.date, title: block.title, max_selections: block.maxSelections };
      const { data, error } = block.id 
          ? await supabase.from('crm_event_blocks').update(payload).eq('id', block.id).select().single()
          : await supabase.from('crm_event_blocks').insert([payload]).select().single();
      if (error) throw error;
      return { id: data.id, eventId: data.event_id, date: data.date, title: data.title, maxSelections: data.max_selections };
  },
  deleteBlock: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_event_blocks').delete().eq('id', id);
  },
  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_event_registrations').select('*').eq('event_id', eventId).order('registered_at', { ascending: false });
      return (data || []).map((d: any) => ({
          id: d.id, eventId: d.event_id, workshopId: d.workshop_id, studentId: d.student_id, studentName: d.student_name, studentEmail: d.student_email, registeredAt: d.registered_at
      }));
  },

  // --- ONLINE COURSES ---

  getOnlineCourses: async (): Promise<OnlineCourse[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_online_courses').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          price: d.price,
          paymentLink: d.payment_link,
          imageUrl: d.image_url,
          certificateTemplateId: d.certificate_template_id,
          createdAt: d.created_at
      }));
  },

  saveOnlineCourse: async (course: Partial<OnlineCourse>): Promise<OnlineCourse> => {
      if (!isConfigured) throw new Error("Backend not configured");
      const payload = {
          title: course.title,
          description: course.description,
          price: course.price,
          payment_link: course.paymentLink,
          image_url: course.imageUrl,
          certificate_template_id: course.certificateTemplateId || null
      };

      if (course.id) {
          const { data, error } = await supabase.from('crm_online_courses').update(payload).eq('id', course.id).select().single();
          if (error) throw error;
          return { id: data.id, title: data.title, description: data.description, price: data.price, paymentLink: data.payment_link, imageUrl: data.image_url, certificateTemplateId: data.certificate_template_id, createdAt: data.created_at };
      } else {
          const { data, error } = await supabase.from('crm_online_courses').insert([payload]).select().single();
          if (error) throw error;
          return { id: data.id, title: data.title, description: data.description, price: data.price, paymentLink: data.payment_link, imageUrl: data.image_url, certificateTemplateId: data.certificate_template_id, createdAt: data.created_at };
      }
  },

  deleteOnlineCourse: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_online_courses').delete().eq('id', id);
      if (error) throw error;
  },

  getCourseModules: async (courseId: string): Promise<CourseModule[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_course_modules').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
      if (error) throw error;
      return (data || []).map((d: any) => ({ id: d.id, courseId: d.course_id, title: d.title, orderIndex: d.order_index }));
  },

  saveCourseModule: async (mod: Partial<CourseModule>): Promise<void> => {
      if (!isConfigured) return;
      const payload = { course_id: mod.courseId, title: mod.title, order_index: mod.orderIndex };
      if (mod.id) {
          const { error } = await supabase.from('crm_course_modules').update(payload).eq('id', mod.id);
          if (error) throw error;
      } else {
          const { error } = await supabase.from('crm_course_modules').insert([payload]);
          if (error) throw error;
      }
  },

  deleteCourseModule: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_course_modules').delete().eq('id', id);
  },

  getModuleLessons: async (moduleId: string): Promise<CourseLesson[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_course_lessons').select('*').eq('module_id', moduleId).order('order_index', { ascending: true });
      if (error) throw error;
      return (data || []).map((d: any) => ({ 
          id: d.id, 
          moduleId: d.module_id, 
          title: d.title, 
          description: d.description, 
          videoUrl: d.video_url, 
          materials: d.materials || [], 
          orderIndex: d.order_index 
      }));
  },

  saveCourseLesson: async (lesson: Partial<CourseLesson>): Promise<void> => {
      if (!isConfigured) return;
      const payload = { 
          module_id: lesson.moduleId, 
          title: lesson.title, 
          description: lesson.description, 
          video_url: lesson.videoUrl, 
          materials: lesson.materials || [], 
          order_index: lesson.orderIndex 
      };
      if (lesson.id) {
          const { error } = await supabase.from('crm_course_lessons').update(payload).eq('id', lesson.id);
          if (error) throw error;
      } else {
          const { error } = await supabase.from('crm_course_lessons').insert([payload]);
          if (error) throw error;
      }
  },

  deleteCourseLesson: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_course_lessons').delete().eq('id', id);
  },

  getStudentCourseAccess: async (studentDealId: string): Promise<string[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_student_course_access').select('course_id').eq('student_deal_id', studentDealId);
      return (data || []).map(d => d.course_id);
  },

  grantCourseAccess: async (studentDealId: string, courseId: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_student_course_access').upsert({ 
          student_deal_id: studentDealId, 
          course_id: courseId,
          unlocked_at: new Date().toISOString()
      });
  },

  revokeCourseAccess: async (studentDealId: string, courseId: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_student_course_access').delete().eq('student_deal_id', studentDealId).eq('course_id', courseId);
  },

  getStudentLessonProgress: async (studentDealId: string): Promise<string[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_student_lesson_progress').select('lesson_id').eq('student_deal_id', studentDealId);
      return (data || []).map(d => d.lesson_id);
  },

  toggleLessonProgress: async (studentDealId: string, lessonId: string, completed: boolean): Promise<void> => {
      if (!isConfigured) return;
      if (completed) {
          await supabase.from('crm_student_lesson_progress').upsert({ 
              student_deal_id: studentDealId, 
              lesson_id: lessonId,
              completed_at: new Date().toISOString()
          });
      } else {
          await supabase.from('crm_student_lesson_progress').delete().eq('student_deal_id', studentDealId).eq('lesson_id', lessonId);
      }
  }
};


import { createClient, Session } from '@supabase/supabase-js';
import { 
  SavedPreset, FormModel, SurveyModel, FormAnswer, Contract, ContractFolder, 
  ContractSigner,
  CertificateModel, StudentCertificate, ExternalCertificate, EventModel, Workshop, EventRegistration, 
  EventBlock, Role, Banner, PartnerStudio, InstructorLevel, InventoryRecord, 
  SyncJob, ActivityLog, CollaboratorSession, BillingNegotiation, FormFolder, 
  CourseInfo, TeacherNews, SupportTicket, SupportMessage, 
  CompanySetting, Pipeline, WebhookTrigger, SupportTag, OnlineCourse, CourseModule, CourseLesson, StudentCourseAccess, StudentLessonProgress,
  WAAutomationRule, WAAutomationLog, PipelineStage, LandingPage
} from '../types';

export type { CompanySetting, Pipeline, WebhookTrigger, PipelineStage };

const APP_URL = (import.meta as any).env?.VITE_APP_SUPABASE_URL;
const APP_KEY = (import.meta as any).env?.VITE_APP_SUPABASE_ANON_KEY;
const PRESETS_TABLE = 'crm_presets';

const isConfigured = !!APP_URL && !!APP_KEY;

const supabase = createClient(
  APP_URL || 'https://placeholder.supabase.co', 
  APP_KEY || 'placeholder'
);

const MOCK_SESSION = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'border',
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

const generateDealNumber = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return Number(`${yyyy}${mm}${dd}${hh}${min}${random}`);
};

export const slugify = (text: string) => {
    if (!text) return Math.random().toString(36).substring(7);
    return text.toString().toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
};

export const appBackend = {
  isLocalMode: !isConfigured,
  client: supabase,

  auth: {
    signIn: async (email: string, password: string) => {
      if (!isConfigured) return { data: { user: MOCK_SESSION.user as any, session: MOCK_SESSION as any }, error: null };
      return await supabase.auth.signInWithPassword({ email, password });
    },
    signOut: async () => {
      if (!isConfigured) { window.location.reload(); return; }
      await supabase.auth.signOut();
    },
    getSession: async () => {
      if (!isConfigured) return MOCK_SESSION as unknown as Session;
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    onAuthStateChange: (callback: (session: Session | null) => void) => {
      if (!isConfigured) { callback(MOCK_SESSION as unknown as Session); return { data: { subscription: { unsubscribe: () => {} } } }; }
      return supabase.auth.onAuthStateChange((_event, session) => callback(session));
    }
  },

  logActivity: async (log: Omit<ActivityLog, 'id' | 'createdAt' | 'userName'>): Promise<void> => {
      if (!isConfigured) return;
      let userName = 'Sistema';
      try {
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
              record_id: (log as any).recordId
          }]);
      } catch (e) {}
  },

  getActivityLogs: async (limit = 100): Promise<ActivityLog[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_activity_logs').select('*').order('created_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return (data || []).map((item: any) => ({
          id: item.id, userName: item.user_name, action: item.action as any, module: item.module, details: item.details, recordId: item.record_id, createdAt: item.created_at
      }));
  },

  getFormById: async (id: string): Promise<FormModel | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('crm_forms').select('*, crm_form_submissions(count)').eq('id', id).maybeSingle();
    if (!data) return null;
    return {
      id: data.id, 
      title: data.title || 'Sem título', 
      description: data.description || '', 
      campaign: data.campaign || '', 
      isLeadCapture: !!data.is_lead_capture, 
      distributionMode: data.distribution_mode || 'fixed', 
      fixedOwnerId: data.fixed_owner_id, 
      teamId: data.team_id, 
      targetPipeline: data.target_pipeline, 
      targetStage: data.target_stage, 
      questions: data.questions || [], 
      style: data.style || {}, 
      createdAt: data.created_at, 
      submissionsCount: data.crm_form_submissions?.[0]?.count || 0, 
      folderId: data.folder_id
    };
  },

  getForms: async (): Promise<FormModel[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_forms').select('*, crm_form_submissions(count)').eq('type', 'form').order('created_at', { ascending: false });
    return (data || []).map((item: any) => ({
      id: item.id, 
      title: item.title || 'Sem título', 
      description: item.description || '', 
      campaign: item.campaign || '', 
      isLeadCapture: !!item.is_lead_capture, 
      distributionMode: item.distribution_mode || 'fixed', 
      fixedOwnerId: item.fixed_owner_id, 
      teamId: item.team_id, 
      targetPipeline: item.target_pipeline, 
      targetStage: item.target_stage, 
      questions: item.questions || [], 
      style: item.style || {}, 
      createdAt: item.created_at, 
      submissionsCount: item.crm_form_submissions?.[0]?.count || 0, 
      folderId: item.folder_id
    }));
  },

  getSurveys: async (): Promise<SurveyModel[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_forms').select('*, crm_form_submissions(count)').eq('type', 'survey').order('created_at', { ascending: false });
    return (data || []).map((item: any) => ({
      id: item.id, 
      title: item.title || 'Sem título', 
      description: item.description || '', 
      campaign: item.campaign || '', 
      isLeadCapture: !!item.is_lead_capture, 
      distributionMode: item.distribution_mode || 'fixed', 
      fixedOwnerId: item.fixed_owner_id, 
      teamId: item.team_id, 
      targetPipeline: item.target_pipeline, 
      targetStage: item.target_stage, 
      questions: item.questions || [], 
      style: item.style || {}, 
      createdAt: item.created_at, 
      submissionsCount: item.crm_form_submissions?.[0]?.count || 0, 
      folderId: item.folder_id,
      targetAudience: item.target_audience || 'all', 
      targetType: item.target_type || 'all', 
      targetProductType: item.target_product_type, 
      targetProductName: item.target_product_name, 
      onlyIfFinished: !!item.only_if_finished, 
      isActive: item.is_active !== false
    }));
  },

  saveForm: async (form: FormModel): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_forms').upsert({
      id: (form.id && form.id.trim() !== '') ? form.id : crypto.randomUUID(),
      title: form.title, 
      description: form.description || null, 
      campaign: form.campaign || null, 
      is_lead_capture: !!form.isLeadCapture, 
      distribution_mode: form.distribution_mode || 'fixed', 
      fixed_owner_id: form.fixed_owner_id || null, 
      team_id: form.team_id || null, 
      target_pipeline: form.target_pipeline || null, 
      target_stage: form.target_stage || null, 
      questions: form.questions || [], 
      style: form.style || {}, 
      folder_id: form.folderId || null, 
      created_at: form.createdAt || new Date().toISOString(), 
      type: 'form'
    });
    if (error) throw error;
  },

  saveSurvey: async (survey: SurveyModel): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_forms').upsert({
      id: (survey.id && survey.id.trim() !== '') ? survey.id : crypto.randomUUID(),
      title: survey.title, 
      description: survey.description || null, 
      campaign: survey.campaign || null, 
      is_lead_capture: !!survey.isLeadCapture, 
      distribution_mode: survey.distributionMode || 'fixed', 
      fixed_owner_id: survey.fixedOwnerId || null, 
      team_id: survey.teamId || null, 
      target_pipeline: survey.targetPipeline || null, 
      target_stage: survey.targetStage || null, 
      questions: survey.questions || [], 
      style: survey.style || {}, 
      folder_id: survey.folderId || null, 
      target_audience: survey.targetAudience || 'all', 
      target_type: survey.targetType || 'all', 
      target_product_type: survey.targetProductType || null, 
      target_product_name: survey.targetProductName || null, 
      only_if_finished: !!survey.onlyIfFinished, 
      is_active: survey.isActive !== false, 
      type: 'survey', 
      created_at: survey.createdAt || new Date().toISOString()
    });
    if (error) throw error;
  },

  deleteForm: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    try {
        await supabase.from('crm_form_counters').delete().eq('form_id', id);
        await supabase.from('crm_form_submissions').delete().eq('form_id', id);
    } catch (e) {}
    const { error } = await supabase.from('crm_forms').delete().eq('id', id);
    if (error) throw error;
  },

  getFormFolders: async (type: 'form' | 'survey' = 'form'): Promise<FormFolder[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_form_folders').select('*').eq('type', type).order('name');
    return (data || []).map((item: any) => ({ id: item.id, name: item.name || 'Sem nome', createdAt: item.created_at }));
  },

  saveFormFolder: async (folder: FormFolder, type: 'form' | 'survey'): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_form_folders').upsert({ id: folder.id, name: folder.name, type, created_at: folder.createdAt });
  },

  deleteFormFolder: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_form_folders').delete().eq('id', id);
  },

  submitForm: async (formId: string, answers: FormAnswer[], isLeadCapture: boolean, studentId?: string): Promise<void> => {
    if (!isConfigured) return;
    const { error: subError } = await supabase.from('crm_form_submissions').insert([{ form_id: formId, answers, student_id: studentId }]);
    if (subError) throw subError;
    if (isLeadCapture) {
        try {
            const { data: form } = await supabase.from('crm_forms').select('*').eq('id', formId).single();
            if (!form) return;
            const dealPayload: any = { deal_number: generateDealNumber(), pipeline: form.target_pipeline || 'Padrão', stage: form.target_stage || 'new', status: 'hot', created_at: new Date().toISOString(), source: 'Formulário Online', campaign: form.campaign || '' };
            const questions = form.questions || [];
            answers.forEach(ans => { const q = questions.find((quest: any) => quest.id === ans.questionId); if (q && q.crmMapping) dealPayload[q.crmMapping] = ans.value; });
            if (!dealPayload.company_name) dealPayload.company_name = dealPayload.contact_name;
            dealPayload.title = dealPayload.company_name || `Lead via ${form.title}`;
            let finalOwnerId = form.fixed_owner_id;
            if (form.distribution_mode === 'round-robin' && form.team_id) {
                const { data: team } = await supabase.from('crm_teams').select('members').eq('id', form.team_id).single();
                if (team?.members?.length > 0) {
                    let nextIdx = ((form.last_assigned_index || 0) + 1) % team.members.length;
                    finalOwnerId = team.members[nextIdx];
                    await supabase.from('crm_forms').update({ last_assigned_index: nextIdx }).eq('id', formId);
                }
            }
            dealPayload.owner_id = finalOwnerId;
            await supabase.from('crm_deals').insert([dealPayload]);
        } catch (crmErr) { console.error(crmErr); }
    }
  },

  getFormSubmissions: async (formId: string): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_form_submissions').select('*').eq('form_id', formId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  getInstructorLevels: async (): Promise<InstructorLevel[]> => {
    if (!isConfigured) return [{ id: '1', name: 'Mestre', honorarium: 1500 }, { id: '2', name: 'Sênior', honorarium: 1200 }];
    const { data, error = null } = await supabase.from('crm_teacher_levels').select('*').order('name');
    if (error) throw error;
    return (data || []).map((item: any) => ({ id: item.id, name: item.name || 'Sem nível', honorarium: Number(item.honorarium || 0), observations: item.observations }));
  },

  saveInstructorLevel: async (level: Partial<InstructorLevel>): Promise<void> => {
    if (!isConfigured) return;
    const payload: any = { name: level.name, honorarium: Number(level.honorarium || 0), observations: level.observations };
    if (level.id) payload.id = level.id;
    const { error } = await supabase.from('crm_teacher_levels').upsert(payload);
    if (error) throw error;
  },

  deleteInstructorLevel: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_teacher_levels').delete().eq('id', id);
  },

  getRoles: async (): Promise<Role[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_roles').select('*').order('name');
    return (data || []).map((item: any) => ({ id: item.id, name: item.name || 'Sem cargo', permissions: item.permissions || {} }));
  },

  saveRole: async (role: Role): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_roles').upsert({ id: role.id || crypto.randomUUID(), name: role.name, permissions: role.permissions });
  },

  deleteRole: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_roles').delete().eq('id', id);
  },

  getBanners: async (audience: 'student' | 'instructor'): Promise<Banner[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_banners').select('*').eq('target_audience', audience).eq('active', true).order('created_at', { ascending: false });
    return (data || []).map((item: any) => ({ id: item.id, title: item.title || '', imageUrl: item.image_url || '', linkUrl: item.link_url || '', targetAudience: item.target_audience, active: !!item.active, createdAt: item.created_at }));
  },

  saveBanner: async (banner: Banner): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_banners').upsert({ id: banner.id || crypto.randomUUID(), title: banner.title, image_url: banner.imageUrl, link_url: banner.linkUrl, target_audience: banner.targetAudience, active: banner.active, created_at: banner.createdAt || new Date().toISOString() });
  },

  deleteBanner: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_banners').delete().eq('id', id);
  },

  getCompanies: async (): Promise<CompanySetting[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_companies').select('*').order('legal_name');
    return (data || []).map((item: any) => ({ 
      id: item.id, 
      legalName: item.legal_name || 'Sem nome', 
      cnpj: item.cnpj || '', 
      webhookUrl: item.webhook_url || '', 
      productTypes: item.product_types || [], 
      productIds: item.product_ids || [] 
    }));
  },

  saveCompany: async (company: CompanySetting): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_companies').upsert({ id: company.id || crypto.randomUUID(), legal_name: company.legalName, cnpj: company.cnpj, webhook_url: company.webhookUrl, product_types: company.productTypes, product_ids: company.productIds });
  },

  deleteCompany: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_companies').delete().eq('id', id);
  },

  getWebhookTriggers: async (): Promise<WebhookTrigger[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_webhook_triggers').select('*').order('created_at', { ascending: false });
    return (data || []).map((item: any) => ({ id: item.id, pipelineName: item.pipeline_name, stageId: item.stage_id, payload_json: item.payload_json, createdAt: item.created_at }));
  },

  saveWebhookTrigger: async (trigger: Partial<WebhookTrigger>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_webhook_triggers').upsert({ id: trigger.id || crypto.randomUUID(), pipeline_name: trigger.pipelineName, stage_id: trigger.stageId, payload_json: trigger.payloadJson, created_at: trigger.createdAt || new Date().toISOString() });
  },

  deleteWebhookTrigger: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_webhook_triggers').delete().eq('id', id);
  },

  getCourseInfos: async (): Promise<CourseInfo[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_course_info').select('*').order('course_name');
    return (data || []).map((item: any) => ({ id: item.id, courseName: item.course_name || 'Sem curso', details: item.details || '', materials: item.materials || '', requirements: item.requirements || '', updatedAt: item.updated_at }));
  },

  saveCourseInfo: async (info: Partial<CourseInfo>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_course_info').upsert({ id: info.id || crypto.randomUUID(), course_name: info.courseName, details: info.details, materials: info.materials, requirements: info.requirements, updated_at: new Date().toISOString() });
  },

  deleteCourseInfo: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_course_info').delete().eq('id', id);
  },

  getSupportTags: async (role?: 'student' | 'instructor' | 'studio' | 'admin' | 'all'): Promise<SupportTag[]> => {
    if (!isConfigured) return [];
    let query = supabase.from('crm_support_tags').select('*').order('name');
    if (role && role !== 'all') query = query.or(`role.eq.${role},role.eq.all`);
    const { data } = await query;
    return (data || []).map((item: any) => ({ id: item.id, name: item.name || 'Sem tag', role: item.role || 'all', createdAt: item.created_at }));
  },

  saveSupportTag: async (tag: Partial<SupportTag>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_support_tags').upsert({ id: tag.id || crypto.randomUUID(), name: tag.name, role: tag.role, created_at: tag.createdAt || new Date().toISOString() });
  },

  deleteSupportTag: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_support_tags').delete().eq('id', id);
  },

  getPipelines: async (): Promise<Pipeline[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_pipelines').select('*').order('name');
    return (data || []).map((item: any) => ({ id: item.id, name: item.name || 'Sem nome', stages: item.stages || [] }));
  },

  savePipeline: async (pipeline: Pipeline): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_pipelines').upsert({ id: pipeline.id, name: pipeline.name, stages: pipeline.stages });
  },

  deletePipeline: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_pipelines').delete().eq('id', id);
  },

  getAppLogo: async (): Promise<string | null> => {
    const local = localStorage.getItem('crm_app_logo');
    if (local) return local;
    if (!isConfigured) return null;
    try {
        const { data } = await supabase.from('crm_settings').select('value').eq('key', 'app_logo').maybeSingle();
        return data?.value || null;
    } catch (e) { return null; }
  },

  saveAppLogo: async (url: string): Promise<void> => {
    localStorage.setItem('crm_app_logo', url);
    if (!isConfigured) return;
    await supabase.from('crm_settings').upsert({ key: 'app_logo', value: url }, { onConflict: 'key' });
  },

  getInventorySecurityMargin: async (): Promise<number> => {
    const local = localStorage.getItem('crm_inventory_margin');
    if (local) return parseInt(local);
    if (!isConfigured) return 5;
    try {
        const { data } = await supabase.from('crm_settings').select('value').eq('key', 'inventory_security_margin').maybeSingle();
        return data ? parseInt(data.value) : 5;
    } catch (e) { return 5; }
  },

  saveInventorySecurityMargin: async (margin: number): Promise<void> => {
    localStorage.setItem('crm_inventory_margin', margin.toString());
    if (!isConfigured) return;
    await supabase.from('crm_settings').upsert({ key: 'inventory_security_margin', value: margin.toString() }, { onConflict: 'key' });
  },

  getWhatsAppConfig: async (): Promise<any | null> => {
    const local = localStorage.getItem('crm_whatsapp_config');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) { return null; }
    }
    if (!isConfigured) return null;
    try {
        const { data } = await supabase.from('crm_settings').select('value').eq('key', 'whatsapp_config').maybeSingle();
        if (data?.value) {
          try {
            return JSON.parse(data.value);
          } catch (e) { return null; }
        }
    } catch (e) { return null; }
    return null;
  },

  saveWhatsAppConfig: async (config: any): Promise<void> => {
    localStorage.setItem('crm_whatsapp_config', JSON.stringify(config));
    if (!isConfigured) return;
    await supabase.from('crm_settings').upsert({ key: 'whatsapp_config', value: JSON.stringify(config) }, { onConflict: 'key' });
  },

  getSyncJobs: async (): Promise<SyncJob[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_sync_jobs').select('*').order('created_at', { ascending: false });
    return (data || []).map((j: any) => ({ id: j.id, name: j.name || 'Sincronização', sheetUrl: j.sheet_url || '', config: j.config || {}, lastSync: j.last_sync, status: j.status || 'idle', lastMessage: j.last_message || '', active: !!j.active, intervalMinutes: j.interval_minutes || 5, createdBy: j.created_by, createdAt: j.created_at }));
  },

  saveSyncJob: async (job: SyncJob): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_sync_jobs').upsert({ id: job.id, name: job.name, sheet_url: job.sheetUrl, config: job.config, last_sync: job.lastSync, status: job.status, last_message: job.lastMessage, active: job.active, interval_minutes: job.intervalMinutes, created_by: job.createdBy, created_at: job.createdAt });
  },

  updateJobStatus: async (id: string, status: string, lastSync: string | null, lastMessage: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_sync_jobs').update({ status, last_sync: lastSync, last_message: lastMessage }).eq('id', id);
  },

  deleteSyncJob: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_sync_jobs').delete().eq('id', id);
  },

  getLandingPages: async (): Promise<LandingPage[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_landing_pages').select('*').order('created_at', { ascending: false });
    return (data || []).map((item: any) => ({
      id: item.id,
      title: item.title || item.name || 'Sem título',
      productName: item.product_name || '',
      slug: item.domain || '',
      content: item.content || {},
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      isActive: item.is_active !== false,
      theme: item.theme || 'modern'
    }));
  },

  getLandingPageById: async (id: string): Promise<LandingPage | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('crm_landing_pages').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      title: data.title || data.name || 'Sem título',
      productName: data.product_name || '',
      slug: data.domain || '',
      content: data.content || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isActive: data.is_active !== false,
      theme: data.theme || 'modern'
    };
  },

  saveLandingPage: async (lp: LandingPage): Promise<void> => {
    if (!isConfigured) return;
    
    // TRATAMENTO: Isolar o payload e garantir que o ID não seja enviado como string vazia
    const isNew = !lp.id || (typeof lp.id === 'string' && lp.id.trim() === '');
    
    const payload: any = {
      title: lp.title || 'Nova Página',
      domain: lp.slug || slugify(lp.title), // CORREÇÃO: Enviando para a coluna domain correta
      product_name: lp.productName || null,
      content: lp.content || {},
      is_active: lp.isActive !== false,
      theme: lp.theme || 'modern',
      updated_at: new Date().toISOString()
    };
    
    try {
        if (isNew) {
            payload.created_at = new Date().toISOString();
            const { error } = await supabase.from('crm_landing_pages').insert([payload]);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('crm_landing_pages').update(payload).eq('id', lp.id);
            if (error) throw error;
        }
    } catch (err: any) {
        console.error("Erro fatal ao salvar Landing Page no Supabase:", err);
        throw err;
    }
  },

  deleteLandingPage: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_landing_pages').delete().eq('id', id);
    if (error) throw error;
  },

  getPresets: async (): Promise<SavedPreset[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from(PRESETS_TABLE).select('*').order('name');
    return (data || []).map((item: any) => ({ id: item.id, name: item.name || 'Preset', url: item.url || '', key: item.key || '', tableName: item.table_name || '', primaryKey: item.primary_key || '', intervalMinutes: item.interval_minutes || 5, createdByName: item.created_by_name }));
  },

  savePreset: async (preset: Partial<SavedPreset>): Promise<SavedPreset> => {
    if (!isConfigured) throw new Error("Supabase não configurado");
    const payload = { id: preset.id || crypto.randomUUID(), name: preset.name, url: preset.url, key: preset.key, table_name: preset.tableName, primary_key: preset.primaryKey, interval_minutes: preset.intervalMinutes, created_by_name: preset.createdByName };
    const { data, error } = await supabase.from(PRESETS_TABLE).upsert(payload).select().single();
    if (error) throw error;
    // Fix: interval_minutes should be intervalMinutes to match SavedPreset interface
    return { id: data.id, name: data.name, url: data.url, key: data.key, tableName: data.table_name, primaryKey: data.primary_key, intervalMinutes: data.interval_minutes, createdByName: data.created_by_name };
  },

  // Added missing deletePreset method
  deletePreset: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from(PRESETS_TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  // Added missing getContractById method
  getContractById: async (id: string): Promise<Contract | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('crm_contracts').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      title: data.title || '',
      content: data.content || '',
      city: data.city || '',
      contractDate: data.contract_date || '',
      status: data.status as any,
      folderId: data.folder_id,
      signers: data.signers || [],
      createdAt: data.created_at
    };
  },

  // Added missing logWAAutomation method
  logWAAutomation: async (log: Omit<WAAutomationLog, 'id' | 'createdAt'>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_wa_automation_logs').insert([{
      rule_name: log.ruleName,
      student_name: log.studentName,
      phone: log.phone,
      message: log.message
    }]);
  },

  // Added missing saveSupportTicket method
  saveSupportTicket: async (ticket: Partial<SupportTicket>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: ticket.id || crypto.randomUUID(),
        sender_id: ticket.senderId,
        sender_name: ticket.senderName,
        sender_email: ticket.senderEmail,
        sender_role: ticket.senderRole,
        target_id: ticket.targetId || null,
        target_name: ticket.targetName || null,
        target_email: ticket.targetEmail || null,
        target_role: ticket.targetRole || null,
        subject: ticket.subject,
        message: ticket.message,
        tag: ticket.tag,
        status: ticket.status || 'open',
        assigned_id: ticket.assignedId || null,
        assigned_name: ticket.assignedName || null,
        created_at: ticket.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('crm_support_tickets').upsert(payload);
    if (error) throw error;
  },

  // Added missing getPartnerStudios method
  getPartnerStudios: async (): Promise<PartnerStudio[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_partner_studios').select('*').order('fantasy_name');
    return (data || []).map((s: any) => ({
        id: s.id,
        status: s.status,
        responsibleName: s.responsible_name,
        cpf: s.cpf,
        phone: s.phone,
        email: s.email,
        password: s.password,
        secondContactName: s.second_contact_name,
        secondContactPhone: s.second_contact_phone,
        fantasyName: s.fantasy_name,
        legalName: s.legal_name,
        cnpj: s.cnpj,
        studioPhone: s.studio_phone,
        address: s.address,
        city: s.city,
        state: s.state,
        country: s.country,
        sizeM2: s.size_m2,
        studentCapacity: s.student_capacity,
        rentValue: s.rent_value,
        methodology: s.methodology,
        studioType: s.studio_type,
        nameOnSite: s.name_on_site,
        bank: s.bank,
        agency: s.agency,
        account: s.account,
        beneficiary: s.beneficiary,
        pixKey: s.pix_key,
        hasReformer: !!s.has_reformer,
        qtyReformer: s.qty_reformer,
        hasLadderBarrel: !!s.has_ladder_barrel,
        qtyLadderBarrel: s.qty_ladder_barrel,
        hasChair: !!s.has_chair,
        qtyChair: s.qty_chair,
        hasCadillac: !!s.has_cadillac,
        qtyCadillac: s.qty_cadillac,
        hasChairsForCourse: !!s.has_chairs_for_course,
        hasTv: !!s.has_tv,
        maxKitsCapacity: s.max_kits_capacity,
        attachments: s.attachments
    }));
  },

  // Added missing savePartnerStudio method
  savePartnerStudio: async (studio: PartnerStudio): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: studio.id || crypto.randomUUID(),
        status: studio.status,
        responsible_name: studio.responsibleName,
        cpf: studio.cpf,
        phone: studio.phone,
        email: studio.email,
        password: studio.password,
        second_contact_name: studio.secondContactName,
        second_contact_phone: studio.secondContactPhone,
        fantasy_name: studio.fantasyName,
        legal_name: studio.legalName,
        cnpj: studio.cnpj,
        studio_phone: studio.studioPhone,
        address: studio.address,
        city: studio.city,
        state: studio.state,
        country: studio.country,
        size_m2: studio.sizeM2,
        student_capacity: studio.studentCapacity,
        rent_value: studio.rentValue,
        methodology: studio.methodology,
        studio_type: studio.studioType,
        name_on_site: studio.nameOnSite,
        bank: studio.bank,
        agency: studio.agency,
        account: studio.account,
        beneficiary: studio.beneficiary,
        pix_key: studio.pixKey,
        has_reformer: !!studio.hasReformer,
        qty_reformer: studio.qtyReformer,
        has_ladder_barrel: !!studio.hasLadderBarrel,
        qty_ladder_barrel: studio.qtyLadderBarrel,
        has_chair: !!studio.hasChair,
        qty_chair: studio.qtyChair,
        has_cadillac: !!studio.hasCadillac,
        qty_cadillac: studio.qtyCadillac,
        has_chairs_for_course: !!studio.hasChairsForCourse,
        has_tv: !!studio.hasTv,
        max_kits_capacity: studio.maxKitsCapacity,
        attachments: studio.attachments
    };
    const { error } = await supabase.from('crm_partner_studios').upsert(payload);
    if (error) throw error;
  },

  // Added missing deletePartnerStudio method
  deletePartnerStudio: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_partner_studios').delete().eq('id', id);
  },

  // Added missing getTeacherNews method
  getTeacherNews: async (): Promise<TeacherNews[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_teacher_news').select('*').order('created_at', { ascending: false });
    return (data || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        imageUrl: n.image_url,
        createdAt: n.created_at
    }));
  },

  // Added missing saveTeacherNews method
  saveTeacherNews: async (news: Partial<TeacherNews>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: news.id || crypto.randomUUID(),
        title: news.title,
        content: news.content,
        image_url: news.imageUrl,
        created_at: news.createdAt || new Date().toISOString()
    };
    const { error } = await supabase.from('crm_teacher_news').upsert(payload);
    if (error) throw error;
  },

  // Added missing deleteTeacherNews method
  deleteTeacherNews: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_teacher_news').delete().eq('id', id);
  },

  // Added missing signContract method
  signContract: async (contractId: string, signerId: string, signatureData: string): Promise<void> => {
    if (!isConfigured) return;
    const { data: contract } = await supabase.from('crm_contracts').select('signers, status').eq('id', contractId).single();
    if (!contract) throw new Error("Contrato não encontrado");

    const signers = (contract.signers || []) as ContractSigner[];
    const updatedSigners = signers.map(s => 
        s.id === signerId ? { ...s, status: 'signed' as const, signatureData, signedAt: new Date().toISOString() } : s
    );

    const allSigned = updatedSigners.every(s => s.status === 'signed');

    const { error } = await supabase.from('crm_contracts').update({
        signers: updatedSigners,
        status: allSigned ? 'signed' : 'sent',
        updated_at: new Date().toISOString()
    }).eq('id', contractId);

    if (error) throw error;
  },

  // Added missing getContracts method
  getContracts: async (): Promise<Contract[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_contracts').select('*').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({
      id: d.id,
      title: d.title || '',
      content: d.content || '',
      city: d.city || '',
      contractDate: d.contract_date || '',
      status: d.status as any,
      folderId: d.folder_id,
      signers: d.signers || [],
      createdAt: d.created_at
    }));
  },

  // Added missing getContractFolders method
  getContractFolders: async (): Promise<ContractFolder[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_contract_folders').select('*').order('name');
    return (data || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        createdAt: f.created_at
    }));
  },

  // Added missing saveContract method
  saveContract: async (contract: Contract): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: contract.id || crypto.randomUUID(),
        title: contract.title,
        content: contract.content,
        city: contract.city,
        contract_date: contract.contractDate,
        status: contract.status,
        folder_id: contract.folderId,
        signers: contract.signers,
        created_at: contract.createdAt || new Date().toISOString()
    };
    const { error } = await supabase.from('crm_contracts').upsert(payload);
    if (error) throw error;
  },

  // Added missing sendContractEmailSimulation method
  sendContractEmailSimulation: async (email: string, name: string, title: string): Promise<void> => {
      console.log(`[SIMULAÇÃO] Enviando e-mail de contrato para ${name} (${email}): ${title}`);
      return Promise.resolve();
  },

  // Added missing saveContractFolder method
  saveContractFolder: async (folder: ContractFolder): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_contract_folders').upsert({
        id: folder.id || crypto.randomUUID(),
        name: folder.name,
        created_at: folder.createdAt || new Date().toISOString()
    });
  },

  // Added missing deleteContractFolder method
  deleteContractFolder: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_contract_folders').delete().eq('id', id);
  },

  // Added missing deleteContract method
  deleteContract: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_contracts').delete().eq('id', id);
  },

  // Added missing issueCertificate method
  issueCertificate: async (studentDealId: string, templateId: string): Promise<string> => {
    if (!isConfigured) return 'mock-hash';
    const hash = crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();
    const { error } = await supabase.from('crm_student_certificates').insert([{
        student_deal_id: studentDealId,
        certificate_template_id: templateId,
        hash: hash,
        issued_at: new Date().toISOString()
    }]);
    if (error) throw error;
    return hash;
  },

  // Added missing getOnlineCourses method
  getOnlineCourses: async (): Promise<OnlineCourse[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_online_courses').select('*').order('title');
    return (data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        price: Number(c.price || 0),
        paymentLink: c.payment_link,
        imageUrl: c.image_url,
        certificateTemplateId: c.certificate_template_id,
        createdAt: c.created_at
    }));
  },

  // Added missing saveOnlineCourse method
  saveOnlineCourse: async (course: Partial<OnlineCourse>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: course.id || crypto.randomUUID(),
        title: course.title,
        description: course.description,
        price: course.price,
        payment_link: course.paymentLink,
        image_url: course.imageUrl,
        certificate_template_id: course.certificateTemplateId || null,
        created_at: course.createdAt || new Date().toISOString()
    };
    const { error } = await supabase.from('crm_online_courses').upsert(payload);
    if (error) throw error;
  },

  // Added missing getCertificates method
  getCertificates: async (): Promise<CertificateModel[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_certificates').select('*').order('title');
    return (data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        backgroundData: c.background_data,
        backBackgroundData: c.back_background_data,
        linkedProductId: c.linked_product_id,
        bodyText: c.body_text,
        layoutConfig: c.layout_config,
        createdAt: c.created_at
    }));
  },

  // Added missing saveCertificate method
  saveCertificate: async (cert: CertificateModel): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: cert.id || crypto.randomUUID(),
        title: cert.title,
        background_data: cert.backgroundData,
        back_background_data: cert.backBackgroundData,
        linked_product_id: cert.linkedProductId,
        body_text: cert.bodyText,
        layout_config: cert.layoutConfig,
        created_at: cert.createdAt || new Date().toISOString()
    };
    const { error } = await supabase.from('crm_certificates').upsert(payload);
    if (error) throw error;
  },

  // Added missing deleteCertificate method
  deleteCertificate: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_certificates').delete().eq('id', id);
  },

  // Added missing getCourseModules method
  getCourseModules: async (courseId: string): Promise<CourseModule[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_course_modules').select('*').eq('course_id', courseId).order('order_index');
    return (data || []).map((m: any) => ({
        id: m.id,
        courseId: m.course_id,
        title: m.title,
        orderIndex: m.order_index
    }));
  },

  // Added missing saveCourseModule method
  saveCourseModule: async (mod: Partial<CourseModule>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: mod.id || crypto.randomUUID(),
        course_id: mod.courseId,
        title: mod.title,
        order_index: mod.orderIndex
    };
    const { error } = await supabase.from('crm_course_modules').upsert(payload);
    if (error) throw error;
  },

  // Added missing deleteCourseModule method
  deleteCourseModule: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_course_modules').delete().eq('id', id);
  },

  // Added missing getModuleLessons method
  getModuleLessons: async (moduleId: string): Promise<CourseLesson[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_course_lessons').select('*').eq('module_id', moduleId).order('order_index');
    return (data || []).map((l: any) => ({
        id: l.id,
        moduleId: l.module_id,
        title: l.title,
        description: l.description,
        videoUrl: l.video_url,
        materials: l.materials || [],
        orderIndex: l.order_index
    }));
  },

  // Added missing saveCourseLesson method
  saveCourseLesson: async (lesson: Partial<CourseLesson>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: lesson.id || crypto.randomUUID(),
        module_id: lesson.moduleId,
        title: lesson.title,
        description: lesson.description,
        video_url: lesson.videoUrl,
        materials: lesson.materials || [],
        order_index: lesson.orderIndex
    };
    const { error } = await supabase.from('crm_course_lessons').upsert(payload);
    if (error) throw error;
  },

  // Added missing deleteCourseLesson method
  deleteCourseLesson: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_course_lessons').delete().eq('id', id);
  },

  // Added missing getPendingContractsByEmail method
  getPendingContractsByEmail: async (email: string): Promise<Contract[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_contracts').select('*').eq('status', 'sent');
    const filtered = (data || []).filter((c: any) => 
        (c.signers || []).some((s: any) => s.email.toLowerCase() === email.toLowerCase() && s.status === 'pending')
    );
    return filtered.map((d: any) => ({
      id: d.id,
      title: d.title || '',
      content: d.content || '',
      city: d.city || '',
      contractDate: d.contract_date || '',
      status: d.status as any,
      folderId: d.folder_id,
      signers: d.signers || [],
      createdAt: d.created_at
    }));
  },

  // Added missing getSupportTicketsBySender method
  getSupportTicketsBySender: async (senderId: string): Promise<SupportTicket[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_support_tickets').select('*').or(`sender_id.eq.${senderId},target_id.eq.${senderId}`).order('updated_at', { ascending: false });
    return (data || []).map((item: any) => ({
      id: item.id, senderId: item.sender_id, senderName: item.sender_name, senderEmail: item.sender_email, senderRole: item.sender_role,
      targetId: item.target_id, targetName: item.target_name, targetEmail: item.target_email, targetRole: item.target_role,
      subject: item.subject, message: item.message, tag: item.tag, status: item.status, assignedId: item.assigned_id, assignedName: item.assigned_name,
      createdAt: item.created_at, updatedAt: item.updated_at
    }));
  },

  // Added missing getSupportTickets method
  getSupportTickets: async (): Promise<SupportTicket[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_support_tickets').select('*').order('updated_at', { ascending: false });
    return (data || []).map((item: any) => ({
      id: item.id, senderId: item.sender_id, senderName: item.sender_name, senderEmail: item.sender_email, senderRole: item.sender_role,
      targetId: item.target_id, targetName: item.target_name, targetEmail: item.target_email, targetRole: item.target_role,
      subject: item.subject, message: item.message, tag: item.tag, status: item.status, assignedId: item.assigned_id, assignedName: item.assigned_name,
      createdAt: item.created_at, updatedAt: item.updated_at
    }));
  },

  // Added missing getSupportTicketMessages method
  getSupportTicketMessages: async (ticketId: string): Promise<SupportMessage[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    return (data || []).map((item: any) => ({
      id: item.id, ticketId: item.ticket_id, senderId: item.sender_id, senderName: item.sender_name, senderRole: item.sender_role, content: item.content, attachmentUrl: item.attachment_url, attachmentName: item.attachment_name, createdAt: item.created_at
    }));
  },

  // Added missing addSupportMessage method
  addSupportMessage: async (message: Partial<SupportMessage>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_support_messages').insert([{
        ticket_id: message.ticketId,
        sender_id: message.senderId,
        sender_name: message.senderName,
        sender_role: message.senderRole,
        content: message.content,
        attachment_url: message.attachmentUrl,
        attachment_name: message.attachmentName
    }]);
  },

  // Added missing deleteSupportTicket method
  deleteSupportTicket: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_support_messages').delete().eq('ticket_id', id);
    await supabase.from('crm_support_tickets').delete().eq('id', id);
  },

  // Added missing getStudentCertificate method
  getStudentCertificate: async (hash: string): Promise<any> => {
    if (!isConfigured) return null;
    const { data, error } = await supabase.from('crm_student_certificates').select('*, crm_certificates(*), crm_deals(company_name, contact_name, course_city)').eq('hash', hash).single();
    if (error || !data) return null;
    return {
        studentName: data.crm_deals?.company_name || data.crm_deals?.contact_name || 'Aluno',
        studentCity: data.crm_deals?.course_city || 'Brasil',
        template: {
            id: data.crm_certificates.id,
            title: data.crm_certificates.title,
            backgroundData: data.crm_certificates.background_data,
            backBackgroundData: data.crm_certificates.back_background_data,
            bodyText: data.crm_certificates.body_text,
            layoutConfig: data.crm_certificates.layout_config
        },
        issuedAt: data.issued_at
    };
  },

  // Added missing getExternalCertificates method
  getExternalCertificates: async (studentId: string): Promise<ExternalCertificate[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_external_certificates').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
    return (data || []).map((c: any) => ({
        id: c.id,
        student_id: c.student_id,
        course_name: c.course_name,
        completion_date: c.completion_date,
        file_url: c.file_url,
        file_name: c.file_name,
        created_at: c.created_at
    }));
  },

  // Added missing saveExternalCertificate method
  saveExternalCertificate: async (cert: Partial<ExternalCertificate>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_external_certificates').insert([cert]);
  },

  // Added missing getWorkshops method
  getWorkshops: async (eventId: string): Promise<Workshop[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_event_workshops').select('*').eq('event_id', eventId).order('time');
    return (data || []).map((w: any) => ({
        id: w.id, eventId: w.event_id, blockId: w.block_id, title: w.title, description: w.description, speaker: w.speaker, date: w.date, time: w.time, spots: w.spots
    }));
  },

  // Added missing saveWorkshop method
  saveWorkshop: async (workshop: Partial<Workshop>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: workshop.id || crypto.randomUUID(),
        event_id: workshop.eventId,
        block_id: workshop.blockId,
        title: workshop.title,
        description: workshop.description,
        speaker: workshop.speaker,
        date: workshop.date,
        time: workshop.time,
        spots: workshop.spots
    };
    await supabase.from('crm_event_workshops').upsert(payload);
  },

  // Added missing deleteWorkshop method
  deleteWorkshop: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_event_workshops').delete().eq('id', id);
  },

  // Added missing getBlocks method
  getBlocks: async (eventId: string): Promise<EventBlock[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_event_blocks').select('*').eq('event_id', eventId).order('date');
    return (data || []).map((b: any) => ({
        id: b.id, eventId: b.event_id, date: b.date, title: b.title, maxSelections: b.max_selections
    }));
  },

  // Added missing saveBlock method
  saveBlock: async (block: Partial<EventBlock>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: block.id || crypto.randomUUID(),
        event_id: block.eventId,
        date: block.date,
        title: block.title,
        max_selections: block.maxSelections
    };
    await supabase.from('crm_event_blocks').upsert(payload);
  },

  // Added missing deleteBlock method
  deleteBlock: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_event_workshops').delete().eq('block_id', id);
    await supabase.from('crm_event_blocks').delete().eq('id', id);
  },

  // Added missing getEvents method
  getEvents: async (): Promise<EventModel[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_events').select('*').order('created_at', { ascending: false });
    return (data || []).map((e: any) => ({
        id: e.id, name: e.name, description: e.description, location: e.location, dates: e.dates || [], registrationOpen: !!e.registration_open, createdAt: e.created_at
    }));
  },

  // Added missing saveEvent method
  saveEvent: async (event: Partial<EventModel>): Promise<EventModel> => {
    if (!isConfigured) throw new Error("Not configured");
    const payload = {
        id: event.id || crypto.randomUUID(),
        name: event.name,
        description: event.description,
        location: event.location,
        dates: event.dates,
        registration_open: !!event.registrationOpen,
        created_at: event.createdAt || new Date().toISOString()
    };
    const { data, error } = await supabase.from('crm_events').upsert(payload).select().single();
    if (error) throw error;
    return {
        id: data.id, name: data.name, description: data.description, location: data.location, dates: data.dates || [], registrationOpen: !!data.registration_open, createdAt: data.created_at
    };
  },

  // Added missing deleteEvent method
  deleteEvent: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_event_workshops').delete().eq('event_id', id);
    await supabase.from('crm_event_blocks').delete().eq('event_id', id);
    await supabase.from('crm_events').delete().eq('id', id);
  },

  // Added missing getEventRegistrations method
  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_event_registrations').select('*').eq('event_id', eventId);
    return (data || []).map((r: any) => ({
        id: r.id, eventId: r.event_id, workshopId: r.workshop_id, studentId: r.student_id, studentName: r.student_name, studentEmail: r.student_email, registeredAt: r.created_at, locked: !!r.locked
    }));
  },

  // Added missing getStudentCourseAccess method
  getStudentCourseAccess: async (studentDealId: string): Promise<string[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_student_course_access').select('course_id').eq('student_deal_id', studentDealId);
    return (data || []).map((a: any) => a.course_id);
  },

  // Added missing getStudentLessonProgress method
  getStudentLessonProgress: async (studentDealId: string): Promise<string[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_student_lesson_progress').select('lesson_id').eq('student_deal_id', studentDealId);
    return (data || []).map((p: any) => p.lesson_id);
  },

  // Added missing toggleLessonProgress method
  toggleLessonProgress: async (studentDealId: string, lessonId: string, completed: boolean): Promise<void> => {
    if (!isConfigured) return;
    if (completed) {
        await supabase.from('crm_student_lesson_progress').upsert({ student_deal_id: studentDealId, lesson_id: lessonId, completed_at: new Date().toISOString() });
    } else {
        await supabase.from('crm_student_lesson_progress').delete().eq('student_deal_id', studentDealId).eq('lesson_id', lessonId);
    }
  },

  // Added missing getInventory method
  getInventory: async (): Promise<InventoryRecord[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_inventory').select('*').order('registration_date', { ascending: false });
    return (data || []).map((r: any) => ({
        id: r.id, type: r.type, itemApostilaNova: r.item_apostila_nova, itemApostilaClassico: r.item_apostila_classico, itemSacochila: r.item_sacochila, itemLapis: r.item_lapis, registrationDate: r.registration_date, studioId: r.studio_id, trackingCode: r.tracking_code, observations: r.observations, conferenceDate: r.conference_date, attachments: r.attachments
    }));
  },

  // Added missing saveInventoryRecord method
  saveInventoryRecord: async (record: InventoryRecord): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: record.id || crypto.randomUUID(),
        type: record.type,
        item__apostila_nova: record.itemApostilaNova,
        item__apostila_classico: record.itemApostilaClassico,
        item_sacochila: record.itemSacochila,
        item_lapis: record.itemLapis,
        registration_date: record.registrationDate,
        studio_id: record.studioId || null,
        tracking_code: record.trackingCode,
        observations: record.observations,
        conference_date: record.conferenceDate || null,
        attachments: record.attachments
    };
    await supabase.from('crm_inventory').upsert(payload);
  },

  // Added missing deleteInventoryRecord method
  deleteInventoryRecord: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_inventory').delete().eq('id', id);
  },

  // Added missing getBillingNegotiations method
  getBillingNegotiations: async (): Promise<BillingNegotiation[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_billing_negotiations').select('*').order('created_at', { ascending: false });
    return (data || []).map((n: any) => ({
        id: n.id, openInstallments: n.open_installments, totalNegotiatedValue: n.total_negotiated_value, totalInstallments: n.total_installments, dueDate: n.due_date, responsibleAgent: n.responsible_agent, identifierCode: n.identifier_code, fullName: n.full_name, productName: n.product_name, originalValue: n.original_value, paymentMethod: n.payment_method, observations: n.observations, status: n.status, team: n.team, voucherLink1: n.voucher_link_1, testDate: n.test_date, voucherLink2: n.voucher_link_2, voucherLink3: n.voucher_link_3, boletosLink: n.boletos_link, negotiationReference: n.negotiation_reference, attachments: n.attachments, createdAt: n.created_at
    }));
  },

  // Added missing saveBillingNegotiation method
  saveBillingNegotiation: async (neg: Partial<BillingNegotiation>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: neg.id || crypto.randomUUID(),
        open_installments: neg.openInstallments,
        total_negotiated_value: neg.totalNegotiatedValue,
        total_installments: neg.totalInstallments,
        due_date: neg.dueDate,
        responsible_agent: neg.responsibleAgent,
        identifier_code: neg.identifier_code,
        full_name: neg.fullName,
        product_name: neg.product_name,
        original_value: neg.original_value,
        payment_method: neg.payment_method,
        observations: neg.observations,
        status: neg.status,
        team: neg.team,
        voucher_link_1: neg.voucherLink1,
        test_date: neg.testDate,
        voucher_link_2: neg.voucherLink2,
        voucher_link_3: neg.voucherLink3,
        boletos_link: neg.boletosLink,
        negotiation_reference: neg.negotiation_reference,
        attachments: neg.attachments,
        created_at: neg.createdAt || new Date().toISOString()
    };
    await supabase.from('crm_billing_negotiations').upsert(payload);
  },

  // Added missing deleteBillingNegotiation method
  deleteBillingNegotiation: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_billing_negotiations').delete().eq('id', id);
  },

  // Added missing getWAAutomationRules method
  getWAAutomationRules: async (): Promise<WAAutomationRule[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_wa_automations').select('*').order('created_at', { ascending: false });
    return (data || []).map((r: any) => ({
        id: r.id, name: r.name, triggerType: r.trigger_type, pipelineName: r.pipeline_name, stageId: r.stage_id, productType: r.product_type, productId: r.product_id, messageTemplate: r.message_template, isActive: !!r.is_active, createdAt: r.created_at
    }));
  },

  // Added missing saveWAAutomationRule method
  saveWAAutomationRule: async (rule: WAAutomationRule): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: rule.id || crypto.randomUUID(),
        name: rule.name,
        trigger_type: rule.triggerType,
        pipeline_name: rule.pipelineName,
        stage_id: rule.stageId,
        product_type: rule.productType,
        product_id: rule.productId,
        message_template: rule.messageTemplate,
        is_active: !!rule.isActive,
        created_at: rule.createdAt || new Date().toISOString()
    };
    await supabase.from('crm_wa_automations').upsert(payload);
  },

  // Added missing deleteWAAutomationRule method
  deleteWAAutomationRule: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_wa_automations').delete().eq('id', id);
  },

  // Added missing getWAAutomationLogs method
  getWAAutomationLogs: async (): Promise<WAAutomationLog[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_wa_automation_logs').select('*').order('created_at', { ascending: false });
    return (data || []).map((l: any) => ({
        id: l.id, ruleName: l.rule_name, studentName: l.student_name, phone: l.phone, message: l.message, createdAt: l.created_at
    }));
  }
};

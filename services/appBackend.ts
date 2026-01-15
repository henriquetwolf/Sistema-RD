
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
      title: data.title, 
      description: data.description, 
      campaign: data.campaign, 
      isLeadCapture: data.is_lead_capture, 
      distributionMode: data.distribution_mode, 
      fixedOwnerId: data.fixed_owner_id, 
      teamId: data.team_id, 
      targetPipeline: data.target_pipeline, 
      targetStage: data.target_stage, 
      questions: data.questions, 
      style: data.style, 
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
      title: item.title, 
      description: item.description, 
      campaign: item.campaign, 
      isLeadCapture: item.is_lead_capture, 
      distributionMode: item.distribution_mode, 
      fixedOwnerId: item.fixed_owner_id, 
      teamId: item.team_id, 
      targetPipeline: item.target_pipeline, 
      targetStage: item.target_stage, 
      questions: item.questions, 
      style: item.style, 
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
      title: item.title, 
      description: item.description, 
      campaign: item.campaign, 
      isLeadCapture: item.is_lead_capture, 
      distributionMode: item.distribution_mode, 
      fixedOwnerId: item.fixed_owner_id, 
      teamId: item.team_id, 
      targetPipeline: item.target_pipeline, 
      targetStage: item.target_stage, 
      questions: item.questions, 
      style: item.style, 
      createdAt: item.created_at, 
      submissionsCount: item.crm_form_submissions?.[0]?.count || 0, 
      folderId: item.folder_id,
      targetAudience: item.target_audience || 'all', 
      targetType: item.target_type || 'all', 
      targetProductType: item.target_product_type, 
      targetProductName: item.target_product_name, 
      onlyIfFinished: item.only_if_finished || false, 
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
      distribution_mode: form.distributionMode || 'fixed', 
      fixed_owner_id: form.fixedOwnerId || null, 
      team_id: form.teamId || null, 
      target_pipeline: form.targetPipeline || null, 
      target_stage: form.targetStage || null, 
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
    await supabase.from('crm_form_counters').delete().eq('form_id', id);
    await supabase.from('crm_form_submissions').delete().eq('form_id', id);
    const { error } = await supabase.from('crm_forms').delete().eq('id', id);
    if (error) throw error;
  },

  getFormFolders: async (type: 'form' | 'survey' = 'form'): Promise<FormFolder[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_form_folders').select('*').eq('type', type).order('name');
    return (data || []).map((item: any) => ({ id: item.id, name: item.name, createdAt: item.created_at }));
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
    const { data, error } = await supabase.from('crm_teacher_levels').select('*').order('name');
    if (error) throw error;
    return (data || []).map((item: any) => ({ id: item.id, name: item.name, honorarium: Number(item.honorarium || 0), observations: item.observations }));
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
    return (data || []).map((item: any) => ({ id: item.id, name: item.name, permissions: item.permissions || {} }));
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
    return (data || []).map((item: any) => ({ id: item.id, title: item.title, imageUrl: item.image_url, linkUrl: item.link_url, targetAudience: item.target_audience, active: item.active, createdAt: item.created_at }));
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
      legalName: item.legal_name, 
      cnpj: item.cnpj, 
      webhookUrl: item.webhook_url, 
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
    return (data || []).map((item: any) => ({ id: item.id, pipelineName: item.pipeline_name, stageId: item.stage_id, payloadJson: item.payload_json, createdAt: item.created_at }));
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
    return (data || []).map((item: any) => ({ id: item.id, courseName: item.course_name, details: item.details, materials: item.materials, requirements: item.requirements, updatedAt: item.updated_at }));
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
    return (data || []).map((item: any) => ({ id: item.id, name: item.name, role: item.role, createdAt: item.created_at }));
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
    return (data || []).map((item: any) => ({ id: item.id, name: item.name, stages: item.stages }));
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
    const { data } = await supabase.from('crm_settings').select('value').eq('key', 'app_logo').maybeSingle();
    return data?.value || null;
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
    const { data } = await supabase.from('crm_settings').select('value').eq('key', 'inventory_security_margin').maybeSingle();
    return data ? parseInt(data.value) : 5;
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
      } catch (e) {
        return null;
      }
    }
    if (!isConfigured) return null;
    const { data } = await supabase.from('crm_settings').select('value').eq('key', 'whatsapp_config').maybeSingle();
    if (data?.value) {
      try {
        return JSON.parse(data.value);
      } catch (e) {
        return null;
      }
    }
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
    return (data || []).map((j: any) => ({ id: j.id, name: j.name, sheetUrl: j.sheet_url, config: j.config, lastSync: j.last_sync, status: j.status, lastMessage: j.last_message, active: j.active, intervalMinutes: j.interval_minutes, createdBy: j.created_by, createdAt: j.created_at }));
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

  getPresets: async (): Promise<SavedPreset[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from(PRESETS_TABLE).select('*').order('name');
    return (data || []).map((item: any) => ({ id: item.id, name: item.name, url: item.url, key: item.key, tableName: item.table_name, primaryKey: item.primary_key, intervalMinutes: item.interval_minutes, createdByName: item.created_by_name }));
  },

  savePreset: async (preset: Partial<SavedPreset>): Promise<SavedPreset> => {
    if (!isConfigured) throw new Error("Supabase não configurado");
    // Fix: Access primaryKey instead of primary_key on preset (Partial<SavedPreset>)
    const payload = { id: preset.id || crypto.randomUUID(), name: preset.name, url: preset.url, key: preset.key, table_name: preset.tableName, primary_key: preset.primaryKey, interval_minutes: preset.intervalMinutes, created_by_name: preset.createdByName };
    const { data, error } = await supabase.from(PRESETS_TABLE).upsert(payload).select().single();
    if (error) throw error;
    // Fix: Map data.interval_minutes to intervalMinutes and data.primary_key to primaryKey in the returned object to match SavedPreset interface
    return { id: data.id, name: data.name, url: data.url, key: data.key, tableName: data.table_name, primaryKey: data.primary_key, intervalMinutes: data.interval_minutes, createdByName: data.created_by_name };
  },

  deletePreset: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from(PRESETS_TABLE).delete().eq('id', id);
  },

  getContracts: async (): Promise<Contract[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_contracts').select('*').order('created_at', { ascending: false });
    return (data || []).map((item: any) => ({ id: item.id, title: item.title, content: item.content, city: item.city, contractDate: item.contract_date, status: item.status, folderId: item.folder_id, signers: item.signers, createdAt: item.created_at }));
  },

  getContractById: async (id: string): Promise<Contract | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('crm_contracts').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    return { id: data.id, createdAt: data.created_at, status: data.status, title: data.title, content: data.content, city: data.city, contractDate: data.contract_date, signers: data.signers, folderId: data.folder_id };
  },

  saveContract: async (contract: Contract): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_contracts').upsert({ id: contract.id, title: contract.title, content: contract.content, city: contract.city, contract_date: contract.contractDate, status: contract.status, folder_id: contract.folderId, signers: contract.signers, created_at: contract.createdAt });
  },

  deleteContract: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_contracts').delete().eq('id', id);
  },

  signContract: async (contractId: string, signerId: string, signatureData: string): Promise<void> => {
    if (!isConfigured) return;
    const { data: contract } = await supabase.from('crm_contracts').select('signers').eq('id', contractId).single();
    if (!contract) throw new Error("Contrato não encontrado");
    const signers = (contract.signers as ContractSigner[]).map(s => { if (s.id === signerId) return { ...s, status: 'signed' as const, signatureData, signedAt: new Date().toISOString() }; return s; });
    const allSigned = signers.every(s => s.status === 'signed');
    await supabase.from('crm_contracts').update({ signers, status: allSigned ? 'signed' : 'sent' }).eq('id', contractId);
  },

  getPendingContractsByEmail: async (email: string): Promise<Contract[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_contracts').select('*').eq('status', 'sent');
    return (data || []).map((item: any) => ({ id: item.id, title: item.title, content: item.content, city: item.city, contractDate: item.contract_date, status: item.status, folderId: item.folder_id, signers: item.signers, createdAt: item.created_at })).filter((c: Contract) => c.signers.some(s => s.email.toLowerCase() === email.toLowerCase() && s.status === 'pending'));
  },

  getContractFolders: async (): Promise<ContractFolder[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_contract_folders').select('*').order('name');
    return (data || []).map((item: any) => ({ id: item.id, name: item.name, createdAt: item.created_at }));
  },

  saveContractFolder: async (folder: ContractFolder): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_contract_folders').upsert({ id: folder.id, name: folder.name, created_at: folder.createdAt });
  },

  deleteContractFolder: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_contract_folders').delete().eq('id', id);
  },

  sendContractEmailSimulation: async (email: string, name: string, title: string): Promise<void> => { console.log(`Email simulado: ${name} (${email}) - ${title}`); return Promise.resolve(); },

  getSupportTickets: async (): Promise<SupportTicket[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_support_tickets').select('*').order('updated_at', { ascending: false });
    return (data || []).map((item: any) => ({ id: item.id, senderId: item.sender_id, senderName: item.sender_name, senderEmail: item.sender_email, senderRole: item.sender_role, targetId: item.target_id, targetName: item.target_name, targetEmail: item.target_email, targetRole: item.target_role, subject: item.subject, message: item.message, tag: item.tag, status: item.status, response: item.response, assignedId: item.assigned_id, assignedName: item.assigned_name, createdAt: item.created_at, updatedAt: item.updated_at }));
  },

  getSupportTicketsBySender: async (senderId: string): Promise<SupportTicket[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_support_tickets').select('*').or(`sender_id.eq.${senderId},target_id.eq.${senderId}`).order('updated_at', { ascending: false });
    return (data || []).map((item: any) => ({ id: item.id, senderId: item.sender_id, senderName: item.sender_name, senderEmail: item.sender_email, senderRole: item.sender_role, targetId: item.target_id, targetName: item.target_name, targetEmail: item.target_email, targetRole: item.target_role, subject: item.subject, message: item.message, tag: item.tag, status: item.status, response: item.response, assignedId: item.assigned_id, assignedName: item.assigned_name, createdAt: item.created_at, updatedAt: item.updated_at }));
  },

  getSupportTicketMessages: async (ticketId: string): Promise<SupportMessage[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    return (data || []).map((item: any) => ({ id: item.id, ticketId: item.ticket_id, senderId: item.sender_id, senderName: item.sender_name, senderRole: item.sender_role, content: item.content, attachmentUrl: item.attachment_url, attachmentName: item.attachment_name, createdAt: item.created_at }));
  },

  saveSupportTicket: async (ticket: Partial<SupportTicket>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_support_tickets').upsert({ id: ticket.id || crypto.randomUUID(), sender_id: ticket.senderId, sender_name: ticket.senderName, sender_email: ticket.senderEmail, sender_role: ticket.senderRole, target_id: ticket.targetId, target_name: ticket.targetName, target_email: ticket.targetEmail, target_role: ticket.targetRole, subject: ticket.subject, message: ticket.message, tag: ticket.tag, status: ticket.status, response: ticket.response, assigned_id: ticket.assignedId, assigned_name: ticket.assignedName, updated_at: ticket.updatedAt || new Date().toISOString() });
  },

  deleteSupportTicket: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_support_tickets').delete().eq('id', id);
  },

  addSupportMessage: async (msg: Partial<SupportMessage>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_support_messages').insert([{ id: crypto.randomUUID(), ticket_id: (msg as any).ticketId, sender_id: (msg as any).senderId, sender_name: (msg as any).senderName, sender_role: (msg as any).senderRole, content: msg.content, attachment_url: (msg as any).attachmentUrl, attachment_name: (msg as any).attachmentName }]);
  },

  getPartnerStudios: async (): Promise<PartnerStudio[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_partner_studios').select('*').order('fantasy_name');
    return (data || []).map((item: any) => ({ 
      id: item.id, 
      status: item.status, 
      responsibleName: item.responsible_name, 
      cpf: item.cpf, 
      phone: item.phone, 
      email: item.email, 
      password: item.password, 
      secondContactName: item.second_contact_name, 
      secondContactPhone: item.second_contact_phone, 
      fantasyName: item.fantasy_name, 
      legalName: item.legal_name, 
      cnpj: item.cnpj, 
      studioPhone: item.studio_phone, 
      address: item.address, 
      city: item.city, 
      state: item.state, 
      country: item.country, 
      sizeM2: item.size_m2, 
      studentCapacity: item.student_capacity, 
      rentValue: item.rent_value, 
      methodology: item.methodology, 
      studioType: item.studio_type, 
      nameOnSite: item.name_on_site, 
      bank: item.bank, 
      agency: item.agency, 
      account: item.account, 
      beneficiary: item.beneficiary, 
      pixKey: item.pix_key, 
      hasReformer: !!item.has_reformer, 
      qtyReformer: item.qty_reformer, 
      hasLadderBarrel: !!item.has_ladder_barrel, 
      qtyLadderBarrel: item.qty_ladder_barrel, 
      hasChair: !!item.has_chair, 
      qtyChair: item.qty_chair, 
      hasCadillac: !!item.has_cadillac, 
      qtyCadillac: item.qty_cadillac, 
      hasChairsForCourse: !!item.has_chairs_for_course, 
      hasTv: !!item.has_tv, 
      maxKitsCapacity: item.max_kits_capacity, 
      attachments: item.attachments 
    }));
  },

  savePartnerStudio: async (studio: PartnerStudio): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_partner_studios').upsert({ 
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
      has_reformer: studio.hasReformer, 
      qty_reformer: studio.qtyReformer, 
      has_ladder_barrel: studio.hasLadderBarrel, 
      qty_ladder_barrel: studio.qtyLadderBarrel, 
      has_chair: studio.hasChair, 
      qty_chair: studio.qtyChair, 
      has_cadillac: studio.hasCadillac, 
      qty_cadillac: studio.qtyCadillac, 
      has_chairs_for_course: studio.hasChairsForCourse, 
      has_tv: studio.hasTv, 
      max_kits_capacity: studio.maxKitsCapacity, 
      attachments: studio.attachments 
    });
  },

  deletePartnerStudio: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_partner_studios').delete().eq('id', id);
  },

  getTeacherNews: async (): Promise<TeacherNews[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_teacher_news').select('*').order('created_at', { ascending: false });
    return (data || []).map((item: any) => ({ id: item.id, title: item.title, content: item.content, imageUrl: item.image_url, createdAt: item.created_at }));
  },

  saveTeacherNews: async (news: Partial<TeacherNews>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_teacher_news').upsert({ id: news.id || crypto.randomUUID(), title: news.title, content: news.content, image_url: news.imageUrl, created_at: news.createdAt || new Date().toISOString() });
  },

  deleteTeacherNews: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_teacher_news').delete().eq('id', id);
  },

  getCertificates: async (): Promise<CertificateModel[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_certificates').select('*').order('created_at', { ascending: false });
    return (data || []).map((item: any) => ({ id: item.id, title: item.title, backgroundData: item.background_data, backBackgroundData: item.back_background_data, linkedProductId: item.linked_product_id, bodyText: item.body_text, layoutConfig: item.layout_config, createdAt: item.created_at }));
  },

  saveCertificate: async (cert: CertificateModel): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_certificates').upsert({ id: cert.id, title: cert.title, background_data: cert.backgroundData, backBackgroundData: cert.backBackgroundData, linked_product_id: cert.linkedProductId, body_text: cert.bodyText, layout_config: cert.layoutConfig, created_at: cert.createdAt });
  },

  deleteCertificate: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_certificates').delete().eq('id', id);
  },

  issueCertificate: async (studentDealId: string, templateId: string): Promise<string> => {
    if (!isConfigured) throw new Error("Banco não configurado");
    const hash = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
    await supabase.from('crm_student_certificates').insert([{ student_deal_id: studentDealId, certificate_template_id: templateId, hash: hash, issued_at: new Date().toISOString() }]);
    return hash;
  },

  getStudentCertificate: async (hash: string): Promise<any> => {
    if (!isConfigured) return null;
    const { data: issuedCert } = await supabase.from('crm_student_certificates').select('*, crm_certificates(*), crm_deals(contact_name, company_name, course_city)').eq('hash', hash).maybeSingle();
    if (!issuedCert) return null;
    return { studentName: issuedCert.crm_deals.company_name || issuedCert.crm_deals.contact_name, studentCity: issuedCert.crm_deals.course_city || 'VOLL Pilates', template: { id: issuedCert.crm_certificates.id, title: issuedCert.crm_certificates.title, backgroundData: issuedCert.crm_certificates.background_data, backBackgroundData: issuedCert.crm_certificates.back_background_data, bodyText: issuedCert.crm_certificates.body_text, layoutConfig: issuedCert.crm_certificates.layout_config }, issuedAt: issuedCert.issued_at };
  },

  saveExternalCertificate: async (cert: Omit<ExternalCertificate, 'id' | 'created_at'>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_external_certificates').insert([{
        id: crypto.randomUUID(),
        student_id: cert.student_id,
        course_name: cert.course_name,
        completion_date: cert.completion_date,
        file_url: cert.file_url,
        file_name: cert.file_name,
        created_at: new Date().toISOString()
    }]);
  },

  getExternalCertificates: async (studentId: string): Promise<ExternalCertificate[]> => {
    if (!isConfigured) return [];
    const { data = null } = await supabase.from('crm_external_certificates').select('*').eq('student_id', studentId).order('completion_date', { ascending: false });
    return (data || []).map((item: any) => ({
        id: item.id,
        student_id: item.student_id,
        course_name: item.course_name,
        completion_date: item.completion_date,
        file_url: item.file_url,
        file_name: item.file_name,
        created_at: item.created_at
    }));
  },

  getOnlineCourses: async (): Promise<OnlineCourse[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_online_courses').select('*').order('created_at', { ascending: false });
    return (data || []).map((item: any) => ({ 
      id: item.id, 
      title: item.title, 
      description: item.description, 
      price: item.price, 
      paymentLink: item.payment_link,
      imageUrl: item.image_url,
      certificateTemplateId: item.certificate_template_id,
      createdAt: item.created_at 
    }));
  },

  saveOnlineCourse: async (course: Partial<OnlineCourse>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_online_courses').upsert({ 
      id: course.id || crypto.randomUUID(), 
      title: course.title, 
      description: course.description, 
      price: course.price, 
      payment_link: course.paymentLink, 
      image_url: course.imageUrl, 
      certificate_template_id: course.certificateTemplateId || null, 
      created_at: course.createdAt || new Date().toISOString() 
    }, { onConflict: 'title' });
  },

  getCourseModules: async (courseId: string): Promise<CourseModule[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_course_modules').select('*').eq('course_id', courseId).order('order_index');
    return (data || []).map((item: any) => ({ id: item.id, courseId: item.course_id, title: item.title, orderIndex: item.order_index }));
  },

  saveCourseModule: async (mod: Partial<CourseModule>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_course_modules').upsert({ id: mod.id || crypto.randomUUID(), course_id: mod.courseId, title: mod.title, order_index: mod.orderIndex });
  },

  deleteCourseModule: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_course_modules').delete().eq('id', id);
  },

  getModuleLessons: async (moduleId: string): Promise<CourseLesson[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_course_lessons').select('*').eq('module_id', moduleId).order('order_index');
    return (data || []).map((item: any) => ({ id: item.id, moduleId: item.module_id, title: item.title, description: item.description, videoUrl: item.video_url, materials: item.materials || [], orderIndex: item.order_index }));
  },

  saveCourseLesson: async (lesson: Partial<CourseLesson>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_course_lessons').upsert({ id: lesson.id || crypto.randomUUID(), module_id: lesson.moduleId, title: lesson.title, description: lesson.description, video_url: lesson.videoUrl, materials: lesson.materials, order_index: lesson.orderIndex });
  },

  deleteCourseLesson: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_course_lessons').delete().eq('id', id);
  },

  getStudentCourseAccess: async (studentDealId: string): Promise<string[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_student_course_access').select('course_id').eq('student_deal_id', studentDealId);
    return (data || []).map(item => item.course_id);
  },

  getStudentLessonProgress: async (studentDealId: string): Promise<string[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_student_lesson_progress').select('lesson_id').eq('student_deal_id', studentDealId);
    return (data || []).map(item => item.lesson_id);
  },

  toggleLessonProgress: async (studentDealId: string, lessonId: string, completed: boolean): Promise<void> => {
    if (!isConfigured) return;
    if (completed) await supabase.from('crm_student_lesson_progress').upsert({ student_deal_id: studentDealId, lesson_id: lessonId, completed_at: new Date().toISOString() });
    else await supabase.from('crm_student_lesson_progress').delete().eq('student_deal_id', studentDealId).eq('lesson_id', lessonId);
  },

  getEvents: async (): Promise<EventModel[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_events').select('*').order('created_at', { ascending: false });
    return (data || []).map((item: any) => ({ id: item.id, name: item.name, description: item.description, location: item.location, dates: item.dates || [], createdAt: item.created_at, registrationOpen: item.registration_open }));
  },

  saveEvent: async (event: EventModel): Promise<EventModel> => {
    if (!isConfigured) throw new Error("Banco não configurado");
    const payload = { id: event.id || crypto.randomUUID(), name: event.name, description: event.description, location: event.location, dates: event.dates, created_at: event.createdAt || new Date().toISOString(), registration_open: event.registrationOpen };
    const { data, error } = await supabase.from('crm_events').upsert(payload).select().single();
    if (error) throw error;
    return { id: data.id, name: data.name, description: data.description, location: data.location, dates: data.dates || [], createdAt: data.created_at, registrationOpen: data.registration_open };
  },

  deleteEvent: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_events').delete().eq('id', id);
  },

  getBlocks: async (eventId: string): Promise<EventBlock[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_event_blocks').select('*').eq('event_id', eventId).order('date');
    return (data || []).map((item: any) => ({ id: item.id, eventId: item.event_id, date: item.date, title: item.title, maxSelections: item.max_selections }));
  },

  saveBlock: async (block: EventBlock): Promise<EventBlock> => {
    if (!isConfigured) throw new Error("Not configured");
    const { data, error } = await supabase.from('crm_event_blocks').upsert({ id: block.id, event_id: block.eventId, date: block.date, title: block.title, max_selections: block.maxSelections }).select().single();
    if (error) throw error;
    return { id: data.id, eventId: data.event_id, date: data.date, title: data.title, maxSelections: data.max_selections };
  },

  deleteBlock: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_event_blocks').delete().eq('id', id);
  },

  getWorkshops: async (eventId: string): Promise<Workshop[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_workshops').select('*').eq('event_id', eventId).order('date');
    return (data || []).map((item: any) => ({ id: item.id, eventId: item.event_id, blockId: item.block_id, title: item.title, description: item.description, speaker: item.speaker, date: item.date, time: item.time, spots: item.spots }));
  },

  saveWorkshop: async (ws: Workshop): Promise<Workshop> => {
    if (!isConfigured) throw new Error("Not configured");
    const { data, error = null } = await supabase.from('crm_workshops').upsert({ id: ws.id, event_id: ws.eventId, block_id: ws.blockId, title: ws.title, description: ws.description, speaker: ws.speaker, date: ws.date, time: ws.time, spots: ws.spots }).select().single();
    if (error) throw error;
    return { id: data.id, eventId: data.event_id, blockId: data.block_id, title: data.title, description: data.description, speaker: data.speaker, date: data.date, time: data.time, spots: data.spots };
  },

  deleteWorkshop: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_workshops').delete().eq('id', id);
  },

  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_event_registrations').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    return (data || []).map((item: any) => ({ id: item.id, eventId: item.event_id, workshopId: item.workshop_id, studentId: item.student_id, studentName: item.student_name, studentEmail: item.student_email, registeredAt: item.created_at, locked: item.locked }));
  },

  getWAAutomationRules: async (): Promise<WAAutomationRule[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_wa_automations').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => ({ 
        id: d.id, 
        name: d.name, 
        triggerType: d.trigger_type, 
        pipelineName: d.pipeline_name,
        stageId: d.stage_id,
        productType: d.product_type,
        productId: d.product_id,
        messageTemplate: d.message_template,
        isActive: d.is_active, 
        createdAt: d.created_at 
    }));
  },

  saveWAAutomationRule: async (rule: Partial<WAAutomationRule>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_wa_automations').upsert({ id: rule.id || crypto.randomUUID(), name: rule.name, trigger_type: rule.triggerType, pipeline_name: rule.pipelineName, stage_id: rule.stageId, product_type: rule.productType, product_id: rule.productId, message_template: rule.messageTemplate, is_active: rule.isActive, created_at: rule.createdAt || new Date().toISOString() });
  },

  deleteWAAutomationRule: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_wa_automations').delete().eq('id', id);
  },

  getWAAutomationLogs: async (): Promise<WAAutomationLog[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_wa_automation_logs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, ruleName: d.rule_name, studentName: d.student_name, phone: d.phone, message: d.message, createdAt: d.created_at }));
  },

  logWAAutomation: async (log: Omit<WAAutomationLog, 'id' | 'createdAt'>): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_wa_automation_logs').insert([{ rule_name: log.ruleName, student_name: log.studentName, phone: log.phone, message: log.message }]);
  },

  getInventory: async (): Promise<InventoryRecord[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_inventory').select('*').order('registration_date', { ascending: false });
    return (data || []).map((item: any) => ({ id: item.id, type: item.type, itemApostilaNova: item.item_apostila_nova, itemApostilaClassico: item.item_apostila_classico, itemSacochila: item.item_sacochila, itemLapis: item.item_lapis, registrationDate: item.registration_date, studioId: item.studio_id, trackingCode: item.tracking_code, observations: item.observations, conferenceDate: item.conference_date, attachments: item.attachments, createdAt: item.created_at }));
  },

  saveInventoryRecord: async (record: InventoryRecord): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_inventory').upsert({ id: record.id || crypto.randomUUID(), type: record.type, item_apostila_nova: record.itemApostilaNova, item_apostila_classico: record.itemApostilaClassico, item_sacochila: record.itemSacochila, item_lapis: record.itemLapis, registration_date: record.registrationDate, studio_id: record.studioId || null, tracking_code: record.trackingCode, observations: record.observations, conference_date: record.conferenceDate || null, attachments: record.attachments, created_at: record.createdAt || new Date().toISOString() });
  },

  deleteInventoryRecord: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_inventory').delete().eq('id', id);
  },

  getBillingNegotiations: async (): Promise<BillingNegotiation[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_billing_negotiations').select('*').order('created_at', { ascending: false });
    return (data || []).map((item: any) => ({ id: item.id, openInstallments: item.open_installments, totalNegotiatedValue: item.total_negotiated_value, totalInstallments: item.total_installments, due_date: item.due_date, responsible_agent: item.responsible_agent, identifier_code: item.identifier_code, full_name: item.full_name, product_name: item.product_name, original_value: item.original_value, payment_method: item.payment_method, observations: item.observations, status: item.status, team: item.team, voucher_link_1: item.voucher_link_1, test_date: item.test_date, voucher_link_2: item.voucher_link_2, voucher_link_3: item.voucher_link_3, boletos_link: item.boletos_link, negotiation_reference: item.negotiation_reference, attachments: item.attachments, createdAt: item.created_at }));
  },

  saveBillingNegotiation: async (neg: Partial<BillingNegotiation>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_billing_negotiations').upsert({ 
        id: neg.id || crypto.randomUUID(), 
        open_installments: neg.open_installments, 
        total_negotiated_value: neg.total_negotiated_value, 
        total_installments: neg.total_installments, 
        due_date: neg.due_date, 
        responsible_agent: neg.responsible_agent, 
        identifier_code: neg.identifier_code, 
        full_name: neg.full_name, 
        product_name: neg.product_name, 
        original_value: neg.original_value, 
        payment_method: neg.payment_method, 
        observations: neg.observations, 
        status: neg.status, 
        team: neg.team, 
        voucher_link_1: neg.voucher_link_1, 
        test_date: neg.test_date, 
        voucher_link_2: neg.voucher_link_2, 
        voucher_link_3: neg.voucher_link_3, 
        boletos_link: neg.boletos_link, 
        negotiation_reference: neg.negotiation_reference, 
        attachments: neg.attachments, 
        created_at: neg.createdAt || new Date().toISOString() 
    });
  },

  deleteBillingNegotiation: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_billing_negotiations').delete().eq('id', id);
  },

  getLandingPages: async (): Promise<LandingPage[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_landing_pages').select('*').order('created_at', { ascending: false });
    return (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      productName: item.product_name,
      content: item.content,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      isActive: item.is_active,
      theme: item.theme
    }));
  },

  getLandingPageById: async (id: string): Promise<LandingPage | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('crm_landing_pages').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      title: data.title,
      productName: data.product_name,
      content: data.content,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isActive: data.is_active,
      theme: data.theme
    };
  },

  saveLandingPage: async (lp: LandingPage): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      id: lp.id || crypto.randomUUID(),
      title: lp.title,
      product_name: lp.productName,
      content: lp.content,
      created_at: lp.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: lp.isActive !== false,
      theme: lp.theme || 'modern'
    };
    const { error } = await supabase.from('crm_landing_pages').upsert(payload);
    if (error) throw error;
  },

  deleteLandingPage: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_landing_pages').delete().eq('id', id);
    if (error) throw error;
  }
};

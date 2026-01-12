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

export const appBackend = {
  isLocalMode: !isConfigured,
  client: supabase,

  auth: {
    signIn: async (email: string, password: string) => {
      if (!isConfigured) {
        return { data: { user: MOCK_SESSION.user as any, session: MOCK_SESSION as any }, error: null };
      }
      return await supabase.auth.signInWithPassword({ email, password });
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
      return (data || []).map((d: any) => ({
          id: d.id, userName: d.user_name, action: d.action as any, module: d.module, details: d.details, recordId: d.record_id, createdAt: d.created_at
      }));
  },

  // --- FORMS & SURVEYS ---

  getForms: async (): Promise<FormModel[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_forms').select('*').eq('type', 'form').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({
      id: d.id, 
      title: d.title, 
      description: d.description, 
      campaign: d.campaign, 
      isLeadCapture: d.is_lead_capture, 
      distributionMode: d.distribution_mode, 
      fixedOwnerId: d.fixed_owner_id, 
      teamId: d.team_id, 
      targetPipeline: d.target_pipeline, 
      targetStage: d.target_stage, 
      questions: d.questions, 
      style: d.style, 
      createdAt: d.created_at, 
      submissionsCount: d.submissions_count || 0, 
      folderId: d.folder_id
    }));
  },

  getSurveys: async (): Promise<SurveyModel[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_forms').select('*').eq('type', 'survey').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({
      id: d.id, 
      title: d.title, 
      description: d.description, 
      campaign: d.campaign, 
      isLeadCapture: d.is_lead_capture, 
      distributionMode: d.distribution_mode, 
      fixedOwnerId: d.fixed_owner_id, 
      teamId: d.team_id, 
      targetPipeline: d.target_pipeline, 
      targetStage: d.target_stage, 
      questions: d.questions, 
      style: d.style, 
      createdAt: d.created_at, 
      submissionsCount: d.submissions_count || 0, 
      folderId: d.folder_id,
      targetType: d.target_type || 'all',
      targetProductType: d.target_product_type,
      targetProductName: d.target_product_name,
      onlyIfFinished: d.only_if_finished || false,
      isActive: d.is_active !== false
    }));
  },

  saveForm: async (form: FormModel): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      id: (form.id && form.id.length > 10) ? form.id : crypto.randomUUID(),
      title: form.title, 
      description: form.description, 
      campaign: form.campaign, 
      is_lead_capture: form.isLeadCapture, 
      distribution_mode: form.distributionMode, 
      fixed_owner_id: form.fixedOwnerId || null, 
      team_id: form.teamId || null, 
      target_pipeline: form.targetPipeline, 
      target_stage: form.targetStage, 
      questions: form.questions, 
      style: form.style, 
      folder_id: form.folderId || null,
      created_at: form.createdAt || new Date().toISOString(),
      type: 'form'
    };
    await supabase.from('crm_forms').upsert(payload, { onConflict: 'id' });
  },

  saveSurvey: async (survey: SurveyModel): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      id: (survey.id && survey.id.length > 10) ? survey.id : crypto.randomUUID(),
      title: survey.title, 
      description: survey.description, 
      campaign: survey.campaign, 
      is_lead_capture: survey.isLeadCapture, 
      distribution_mode: survey.distributionMode, 
      fixed_owner_id: survey.fixedOwnerId || null, 
      team_id: survey.teamId || null, 
      target_pipeline: survey.targetPipeline, 
      target_stage: survey.targetStage, 
      questions: survey.questions, 
      style: survey.style, 
      folder_id: survey.folderId || null, 
      target_type: survey.targetType, 
      target_product_type: survey.targetProductType, 
      target_product_name: survey.targetProductName, 
      only_if_finished: survey.onlyIfFinished, 
      is_active: survey.isActive,
      created_at: survey.createdAt || new Date().toISOString(),
      type: 'survey'
    };
    await supabase.from('crm_forms').upsert(payload, { onConflict: 'id' });
  },

  deleteForm: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_forms').delete().eq('id', id);
  },

  getFormFolders: async (type: 'form' | 'survey' = 'form'): Promise<FormFolder[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_form_folders').select('*').eq('type', type).order('name');
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, createdAt: d.created_at }));
  },

  saveFormFolder: async (folder: FormFolder, type: 'form' | 'survey' = 'form'): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_form_folders').upsert({ id: folder.id, name: folder.name, type: type });
  },

  deleteFormFolder: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_form_folders').delete().eq('id', id);
  },

  getFormById: async (id: string): Promise<FormModel | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('crm_forms').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    return {
      id: data.id, title: data.title, description: data.description, campaign: data.campaign, isLeadCapture: data.is_lead_capture, distributionMode: data.distribution_mode, fixedOwnerId: data.fixed_owner_id, teamId: data.team_id, targetPipeline: data.target_pipeline, targetStage: data.target_stage, questions: data.questions, style: data.style, createdAt: data.created_at, submissionsCount: data.submissions_count || 0, folderId: data.folder_id
    } as any;
  },

  submitForm: async (formId: string, answers: FormAnswer[], isLeadCapture: boolean, studentId?: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_form_submissions').insert([{ form_id: formId, answers, student_id: studentId }]);
    if (error) throw error;
    await supabase.rpc('increment_form_submissions', { form_id_val: formId });
  },

  getFormSubmissions: async (formId: string): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_form_submissions').select('*').eq('form_id', formId).order('created_at', { ascending: false });
    return data || [];
  },

  // --- OUTROS MÉTODOS ---

  getInstructorLevels: async (): Promise<InstructorLevel[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_teacher_levels').select('*').order('name');
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, honorarium: d.honorarium, observations: d.observations }));
  },

  saveInstructorLevel: async (level: InstructorLevel): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_teacher_levels').upsert({ id: level.id, name: level.name, honorarium: level.honorarium, observations: level.observations });
  },

  deleteInstructorLevel: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_teacher_levels').delete().eq('id', id);
  },

  getRoles: async (): Promise<Role[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_roles').select('*').order('name');
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, permissions: d.permissions || {} }));
  },

  saveRole: async (role: Role): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_roles').upsert({ id: role.id, name: role.name, permissions: role.permissions });
  },

  deleteRole: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_roles').delete().eq('id', id);
  },

  getBanners: async (audience: 'student' | 'instructor'): Promise<Banner[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_banners').select('*').eq('target_audience', audience).eq('active', true).order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({ id: d.id, title: d.title, imageUrl: d.image_url, linkUrl: d.link_url, targetAudience: d.target_audience, active: d.active, createdAt: d.created_at }));
  },

  saveBanner: async (banner: Banner): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_banners').upsert({ id: banner.id, title: banner.title, image_url: banner.imageUrl, link_url: banner.linkUrl, target_audience: banner.targetAudience, active: banner.active });
  },

  deleteBanner: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_banners').delete().eq('id', id);
  },

  getCompanies: async (): Promise<CompanySetting[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_companies').select('*').order('legal_name');
    return (data || []).map((d: any) => ({ id: d.id, legalName: d.legal_name, cnpj: d.cnpj, webhookUrl: d.webhook_url, productTypes: d.product_types || [], productIds: d.product_ids || [] }));
  },

  saveCompany: async (company: CompanySetting): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_companies').upsert({ id: company.id, legal_name: company.legalName, cnpj: company.cnpj, webhook_url: company.webhookUrl, product_types: company.productTypes, product_ids: company.productIds });
  },

  deleteCompany: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_companies').delete().eq('id', id);
  },

  getWebhookTriggers: async (): Promise<WebhookTrigger[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_webhook_triggers').select('*').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({ id: d.id, pipelineName: d.pipeline_name, stageId: d.stage_id, payloadJson: d.payload_json, createdAt: d.created_at }));
  },

  saveWebhookTrigger: async (trigger: Partial<WebhookTrigger>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_webhook_triggers').upsert({ id: trigger.id, pipeline_name: trigger.pipelineName, stage_id: trigger.stageId, payload_json: trigger.payloadJson });
  },

  deleteWebhookTrigger: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_webhook_triggers').delete().eq('id', id);
  },

  getCourseInfos: async (): Promise<CourseInfo[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_course_info').select('*').order('course_name');
    return (data || []).map((d: any) => ({ id: d.id, courseName: d.course_name, details: d.details, materials: d.materials, requirements: d.requirements, updatedAt: d.updated_at }));
  },

  saveCourseInfo: async (info: Partial<CourseInfo>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_course_info').upsert({ id: info.id, course_name: info.courseName, details: info.details, materials: info.materials, requirements: info.requirements });
  },

  deleteCourseInfo: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_course_info').delete().eq('id', id);
  },

  // FIXED: Updated to accept an optional role to filter tags
  getSupportTags: async (role?: 'student' | 'instructor' | 'studio' | 'admin' | 'all'): Promise<SupportTag[]> => {
    if (!isConfigured) return [];
    let query = supabase.from('crm_support_tags').select('*').order('name');
    if (role && role !== 'all') {
        query = query.or(`role.eq.${role},role.eq.all`);
    }
    const { data } = await query;
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, role: d.role, createdAt: d.created_at }));
  },

  saveSupportTag: async (tag: Partial<SupportTag>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_support_tags').upsert({ id: tag.id, name: tag.name, role: tag.role });
  },

  deleteSupportTag: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_support_tags').delete().eq('id', id);
  },

  getPipelines: async (): Promise<Pipeline[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_pipelines').select('*').order('name');
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, stages: d.stages }));
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

  getSyncJobs: async (): Promise<SyncJob[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_sync_jobs').select('*').order('created_at', { ascending: false });
    return (data || []).map((j: any) => ({
      id: j.id, name: j.name, sheetUrl: j.sheet_url, config: j.config, lastSync: j.last_sync, status: j.status, lastMessage: j.last_message, active: j.active, intervalMinutes: j.interval_minutes, createdBy: j.created_by, createdAt: j.created_at
    }));
  },

  saveSyncJob: async (job: SyncJob): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_sync_jobs').upsert({
      id: job.id, name: job.name, sheet_url: job.sheetUrl, config: job.config, last_sync: job.lastSync, status: job.status, last_message: job.lastMessage, active: job.active, interval_minutes: job.intervalMinutes, created_by: job.createdBy, created_at: job.createdAt
    });
  },

  deleteSyncJob: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_sync_jobs').delete().eq('id', id);
  },

  updateJobStatus: async (id: string, status: string, lastSync: string, lastMessage: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_sync_jobs').update({ status, last_sync: lastSync, last_message: lastMessage }).eq('id', id);
  },

  /**
   * ADDED MISSING METHODS TO RESOLVE TYPESCRIPT ERRORS
   */

  // PRESETS
  getPresets: async (): Promise<SavedPreset[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from(TABLE_NAME).select('*').order('name');
    return (data || []).map((d: any) => ({
        id: d.id, name: d.name, url: d.url, key: d.key, tableName: d.table_name,
        primaryKey: d.primary_key, intervalMinutes: d.interval_minutes, createdByName: d.created_by_name
    }));
  },

  savePreset: async (preset: Partial<SavedPreset>): Promise<SavedPreset> => {
    if (!isConfigured) throw new Error("Supabase não configurado");
    const payload = {
        id: preset.id || crypto.randomUUID(),
        name: preset.name,
        url: preset.url,
        key: preset.key,
        table_name: preset.tableName,
        primary_key: preset.primaryKey,
        interval_minutes: preset.intervalMinutes,
        created_by_name: preset.createdByName
    };
    const { data, error } = await supabase.from(TABLE_NAME).upsert(payload).select().single();
    if (error) throw error;
    return {
        id: data.id, name: data.name, url: data.url, key: data.key, tableName: data.table_name,
        primaryKey: data.primary_key, intervalMinutes: data.interval_minutes, createdByName: data.created_by_name
    };
  },

  deletePreset: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from(TABLE_NAME).delete().eq('id', id);
  },

  // CONTRACTS
  getContracts: async (): Promise<Contract[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_contracts').select('*').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({
        id: d.id, title: d.title, content: d.content, city: d.city, contractDate: d.contract_date,
        status: d.status, folderId: d.folder_id, signers: d.signers, createdAt: d.created_at
    }));
  },

  getContractById: async (id: string): Promise<Contract | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('crm_contracts').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    return {
        id: data.id, title: data.title, content: data.content, city: data.city, contractDate: data.contract_date,
        status: data.status, folderId: data.folder_id, signers: data.signers, createdAt: data.created_at
    };
  },

  saveContract: async (contract: Contract): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: contract.id,
        title: contract.title,
        content: contract.content,
        city: contract.city,
        contract_date: contract.contractDate,
        status: contract.status,
        folder_id: contract.folderId || null,
        signers: contract.signers,
        created_at: contract.createdAt
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
    if (!contract) throw new Error("Contrato não encontrado");
    
    const signers = (contract.signers as ContractSigner[]).map(s => {
        if (s.id === signerId) {
            return { ...s, status: 'signed', signatureData, signedAt: new Date().toISOString() };
        }
        return s;
    });

    const allSigned = signers.every(s => s.status === 'signed');
    await supabase.from('crm_contracts').update({ 
        signers, 
        status: allSigned ? 'signed' : 'sent' 
    }).eq('id', contractId);
  },

  getPendingContractsByEmail: async (email: string): Promise<Contract[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_contracts').select('*').eq('status', 'sent');
    return (data || [])
        .map((d: any) => ({
            id: d.id, title: d.title, content: d.content, city: d.city, contractDate: d.contract_date,
            status: d.status, folderId: d.folder_id, signers: d.signers, createdAt: d.created_at
        }))
        .filter((c: Contract) => c.signers.some(s => s.email.toLowerCase() === email.toLowerCase() && s.status === 'pending'));
  },

  sendContractEmailSimulation: async (email: string, name: string, title: string): Promise<void> => {
      console.log(`[SIMULAÇÃO] Enviando e-mail de contrato para ${name} (${email}) - Título: ${title}`);
  },

  // CONTRACT FOLDERS
  getFolders: async (): Promise<ContractFolder[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_contract_folders').select('*').order('name');
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, createdAt: d.created_at }));
  },

  saveFolder: async (folder: ContractFolder): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_contract_folders').upsert({ id: folder.id, name: folder.name, created_at: folder.createdAt });
  },

  deleteFolder: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_contract_folders').delete().eq('id', id);
  },

  // SUPPORT
  getSupportTickets: async (): Promise<SupportTicket[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_support_tickets').select('*').order('updated_at', { ascending: false });
    return (data || []).map((d: any) => ({
        id: d.id, senderId: d.sender_id, senderName: d.sender_name, senderEmail: d.sender_email, senderRole: d.sender_role,
        targetId: d.target_id, targetName: d.target_name, targetEmail: d.target_email, targetRole: d.target_role,
        subject: d.subject, message: d.message, tag: d.tag, status: d.status, response: d.response,
        assignedId: d.assigned_id, assignedName: d.assigned_name, createdAt: d.created_at, updatedAt: d.updated_at
    }));
  },

  getSupportTicketsBySender: async (senderId: string): Promise<SupportTicket[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_support_tickets').select('*').or(`sender_id.eq.${senderId},target_id.eq.${senderId}`).order('updated_at', { ascending: false });
    return (data || []).map((d: any) => ({
        id: d.id, senderId: d.sender_id, senderName: d.sender_name, senderEmail: d.sender_email, senderRole: d.sender_role,
        targetId: d.target_id, targetName: d.target_name, targetEmail: d.target_email, targetRole: d.target_role,
        subject: d.subject, message: d.message, tag: d.tag, status: d.status, response: d.response,
        assignedId: d.assigned_id, assignedName: d.assigned_name, createdAt: d.created_at, updatedAt: d.updated_at
    }));
  },

  getSupportTicketMessages: async (ticketId: string): Promise<SupportMessage[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    return (data || []).map((d: any) => ({
        id: d.id, ticketId: d.ticket_id, senderId: d.sender_id, senderName: d.sender_name, senderRole: d.sender_role,
        content: d.content, attachmentUrl: d.attachment_url, attachmentName: d.attachment_name, createdAt: d.created_at
    }));
  },

  saveSupportTicket: async (ticket: Partial<SupportTicket>): Promise<void> => {
    if (!isConfigured) return;
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
        response: ticket.response,
        assigned_id: ticket.assignedId,
        assigned_name: ticket.assignedName,
        updated_at: ticket.updatedAt || new Date().toISOString()
    };
    await supabase.from('crm_support_tickets').upsert(payload);
  },

  deleteSupportTicket: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_support_tickets').delete().eq('id', id);
  },

  addSupportMessage: async (msg: Partial<SupportMessage>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: crypto.randomUUID(),
        ticket_id: msg.ticketId,
        sender_id: msg.senderId,
        sender_name: msg.senderName,
        sender_role: msg.senderRole,
        content: msg.content,
        attachment_url: msg.attachmentUrl,
        attachment_name: msg.attachmentName
    };
    await supabase.from('crm_support_messages').insert([payload]);
  },

  // PARTNER STUDIOS
  getPartnerStudios: async (): Promise<PartnerStudio[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_partner_studios').select('*').order('fantasy_name');
    return (data || []).map((d: any) => ({
        id: d.id, status: d.status, responsibleName: d.responsible_name, cpf: d.cpf, phone: d.phone, email: d.email,
        password: d.password, secondContactName: d.second_contact_name, secondContactPhone: d.second_contact_phone,
        fantasyName: d.fantasy_name, legalName: d.legal_name, cnpj: d.cnpj, studioPhone: d.studio_phone,
        address: d.address, city: d.city, state: d.state, country: d.country, sizeM2: d.size_m2,
        studentCapacity: d.student_capacity, rentValue: d.rent_value, methodology: d.methodology,
        studioType: d.studio_type, nameOnSite: d.name_on_site, bank: d.bank, agency: d.agency,
        account: d.account, beneficiary: d.beneficiary, pixKey: d.pix_key, hasReformer: !!d.has_reformer,
        qtyReformer: d.qty_reformer, hasLadderBarrel: !!d.has_ladder_barrel, qtyLadderBarrel: d.qty_ladder_barrel,
        hasChair: !!d.has_chair, qtyChair: d.qty_chair, hasCadillac: !!d.has_cadillac, qtyCadillac: d.qty_cadillac,
        hasChairsForCourse: !!d.has_chairs_for_course, hasTv: !!d.has_tv, maxKitsCapacity: d.max_kits_capacity,
        attachments: d.attachments
    }));
  },

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
    };
    await supabase.from('crm_partner_studios').upsert(payload);
  },

  deletePartnerStudio: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_partner_studios').delete().eq('id', id);
  },

  // TEACHER NEWS
  getTeacherNews: async (): Promise<TeacherNews[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_teacher_news').select('*').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({
        id: d.id, title: d.title, content: d.content, imageUrl: d.image_url, createdAt: d.created_at
    }));
  },

  saveTeacherNews: async (news: Partial<TeacherNews>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: news.id || crypto.randomUUID(),
        title: news.title,
        content: news.content,
        image_url: news.imageUrl,
        created_at: news.createdAt || new Date().toISOString()
    };
    await supabase.from('crm_teacher_news').upsert(payload);
  },

  deleteTeacherNews: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_teacher_news').delete().eq('id', id);
  },

  // CERTIFICATES
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
        id: cert.id,
        title: cert.title,
        background_data: cert.backgroundData,
        back_background_data: cert.backBackgroundData,
        linked_product_id: cert.linkedProductId,
        body_text: cert.bodyText,
        layout_config: cert.layoutConfig,
        created_at: cert.createdAt
    };
    await supabase.from('crm_certificates').upsert(payload);
  },

  deleteCertificate: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_certificates').delete().eq('id', id);
  },

  issueCertificate: async (studentDealId: string, templateId: string): Promise<string> => {
    if (!isConfigured) throw new Error("Banco não configurado");
    const hash = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    
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
    const { data: issuedCert } = await supabase
        .from('crm_student_certificates')
        .select('*, crm_certificates(*), crm_deals(contact_name, company_name, course_city)')
        .eq('hash', hash)
        .maybeSingle();
    
    if (!issuedCert) return null;

    return {
        studentName: issuedCert.crm_deals.company_name || issuedCert.crm_deals.contact_name,
        studentCity: issuedCert.crm_deals.course_city || 'VOLL Pilates',
        template: {
            id: issuedCert.crm_certificates.id,
            title: issuedCert.crm_certificates.title,
            backgroundData: issuedCert.crm_certificates.background_data,
            backBackgroundData: issuedCert.crm_certificates.back_background_data,
            bodyText: issuedCert.crm_certificates.body_text,
            layoutConfig: issuedCert.crm_certificates.layout_config
        },
        issuedAt: issuedCert.issued_at
    };
  },

  // ONLINE COURSES & PROGRESS
  getOnlineCourses: async (): Promise<OnlineCourse[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_online_courses').select('*').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({
        id: d.id, title: d.title, description: d.description, price: d.price, paymentLink: d.payment_link,
        imageUrl: d.image_url, certificateTemplateId: d.certificate_template_id, createdAt: d.created_at
    }));
  },

  saveOnlineCourse: async (course: Partial<OnlineCourse>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: course.id || crypto.randomUUID(),
        title: course.title,
        description: course.description,
        price: course.price,
        payment_link: course.paymentLink,
        image_url: course.imageUrl,
        certificate_template_id: course.certificateTemplateId,
        created_at: course.createdAt || new Date().toISOString()
    };
    await supabase.from('crm_online_courses').upsert(payload);
  },

  getCourseModules: async (courseId: string): Promise<CourseModule[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_course_modules').select('*').eq('course_id', courseId).order('order_index');
    return (data || []).map((d: any) => ({ id: d.id, courseId: d.course_id, title: d.title, orderIndex: d.order_index }));
  },

  saveCourseModule: async (mod: Partial<CourseModule>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: mod.id || crypto.randomUUID(),
        course_id: mod.courseId,
        title: mod.title,
        order_index: mod.orderIndex
    };
    await supabase.from('crm_course_modules').upsert(payload);
  },

  deleteCourseModule: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_course_modules').delete().eq('id', id);
  },

  getModuleLessons: async (moduleId: string): Promise<CourseLesson[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_course_lessons').select('*').eq('module_id', moduleId).order('order_index');
    return (data || []).map((d: any) => ({
        id: d.id, moduleId: d.module_id, title: d.title, description: d.description,
        videoUrl: d.video_url, materials: d.materials || [], orderIndex: d.order_index
    }));
  },

  saveCourseLesson: async (lesson: Partial<CourseLesson>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: lesson.id || crypto.randomUUID(),
        module_id: lesson.moduleId,
        title: lesson.title,
        description: lesson.description,
        video_url: lesson.videoUrl,
        materials: lesson.materials,
        order_index: lesson.orderIndex
    };
    await supabase.from('crm_course_lessons').upsert(payload);
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

  getStudentLessonProgress: async (studentDealId: string): Promise<string[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_student_lesson_progress').select('lesson_id').eq('student_deal_id', studentDealId);
    return (data || []).map(d => d.lesson_id);
  },

  toggleLessonProgress: async (studentDealId: string, lessonId: string, completed: boolean): Promise<void> => {
    if (!isConfigured) return;
    if (completed) {
        await supabase.from('crm_student_lesson_progress').upsert({ student_deal_id: studentDealId, lesson_id: lessonId, completed_at: new Date().toISOString() });
    } else {
        await supabase.from('crm_student_lesson_progress').delete().eq('student_deal_id', studentDealId).eq('lesson_id', lessonId);
    }
  },

  // EVENTS
  getEvents: async (): Promise<EventModel[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_events').select('*').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({
        id: d.id, name: d.name, description: d.description, location: d.location, dates: d.dates || [],
        createdAt: d.created_at, registrationOpen: d.registration_open
    }));
  },

  saveEvent: async (event: EventModel): Promise<EventModel> => {
    if (!isConfigured) throw new Error("Banco não configurado");
    const payload = {
        id: event.id || crypto.randomUUID(),
        name: event.name,
        description: event.description,
        location: event.location,
        dates: event.dates,
        created_at: event.createdAt || new Date().toISOString(),
        registration_open: event.registrationOpen
    };
    const { data, error } = await supabase.from('crm_events').upsert(payload).select().single();
    if (error) throw error;
    return {
        id: data.id, name: data.name, description: data.description, location: data.location, dates: data.dates || [],
        createdAt: data.created_at, registrationOpen: data.registration_open
    };
  },

  deleteEvent: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_events').delete().eq('id', id);
  },

  getBlocks: async (eventId: string): Promise<EventBlock[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_event_blocks').select('*').eq('event_id', eventId).order('date');
    return (data || []).map((d: any) => ({ id: d.id, eventId: d.event_id, date: d.date, title: d.title, maxSelections: d.max_selections }));
  },

  saveBlock: async (block: EventBlock): Promise<EventBlock> => {
    if (!isConfigured) throw new Error("Banco não configurado");
    const payload = {
        id: block.id || crypto.randomUUID(),
        event_id: block.eventId,
        date: block.date,
        title: block.title,
        max_selections: block.maxSelections
    };
    const { data, error } = await supabase.from('crm_event_blocks').upsert(payload).select().single();
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
    return (data || []).map((d: any) => ({
        id: d.id, eventId: d.event_id, blockId: d.block_id, title: d.title, description: d.description,
        speaker: d.speaker, date: d.date, time: d.time, spots: d.spots
    }));
  },

  saveWorkshop: async (workshop: Workshop): Promise<Workshop> => {
    if (!isConfigured) throw new Error("Banco não configurado");
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
    const { data, error } = await supabase.from('crm_workshops').upsert(payload).select().single();
    if (error) throw error;
    return {
        id: data.id, eventId: data.event_id, blockId: data.block_id, title: data.title, description: data.description,
        speaker: data.speaker, date: data.date, time: data.time, spots: data.spots
    };
  },

  deleteWorkshop: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_workshops').delete().eq('id', id);
  },

  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_event_registrations').select('*').eq('event_id', eventId).order('registered_at', { ascending: false });
    return (data || []).map((d: any) => ({
        id: d.id, eventId: d.event_id, workshopId: d.workshop_id, studentId: d.student_id,
        studentName: d.student_name, studentEmail: d.student_email, registeredAt: d.registered_at
    }));
  },

  // WHATSAPP CONFIG
  getWhatsAppConfig: async (): Promise<any> => {
    const local = localStorage.getItem('crm_whatsapp_config');
    if (local) return JSON.parse(local);
    if (!isConfigured) return null;
    const { data } = await supabase.from('crm_settings').select('value').eq('key', 'whatsapp_config').maybeSingle();
    return data ? JSON.parse(data.value) : null;
  },

  saveWhatsAppConfig: async (config: any): Promise<void> => {
    localStorage.setItem('crm_whatsapp_config', JSON.stringify(config));
    if (!isConfigured) return;
    await supabase.from('crm_settings').upsert({ key: 'whatsapp_config', value: JSON.stringify(config) }, { onConflict: 'key' });
  },

  // INVENTORY
  getInventory: async (): Promise<InventoryRecord[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_inventory').select('*').order('registration_date', { ascending: false });
    return (data || []).map((d: any) => ({
        id: d.id, type: d.type, itemApostilaNova: d.item_apostila_nova, itemApostilaClassico: d.item_apostila_classico,
        itemSacochila: d.item_sacochila, itemLapis: d.item_lapis, registrationDate: d.registration_date,
        studioId: d.studio_id, trackingCode: d.tracking_code, observations: d.observations,
        conferenceDate: d.conference_date, attachments: d.attachments, createdAt: d.created_at
    }));
  },

  saveInventoryRecord: async (record: InventoryRecord): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: record.id || crypto.randomUUID(),
        type: record.type,
        item_apostila_nova: record.itemApostilaNova,
        item_apostila_classico: record.itemApostilaClassico,
        item_sacochila: record.itemSacochila,
        item_lapis: record.itemLapis,
        registration_date: record.registrationDate,
        studio_id: record.studioId || null,
        tracking_code: record.trackingCode,
        observations: record.observations,
        conference_date: record.conferenceDate || null,
        attachments: record.attachments,
        created_at: record.createdAt || new Date().toISOString()
    };
    await supabase.from('crm_inventory').upsert(payload);
  },

  deleteInventoryRecord: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_inventory').delete().eq('id', id);
  },

  // BILLING
  getBillingNegotiations: async (): Promise<BillingNegotiation[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_billing_negotiations').select('*').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({
        id: d.id, openInstallments: d.open_installments, totalNegotiatedValue: d.total_negotiated_value,
        totalInstallments: d.total_installments, dueDate: d.due_date, responsibleAgent: d.responsible_agent,
        identifierCode: d.identifier_code, fullName: d.full_name, productName: d.product_name,
        originalValue: d.original_value, paymentMethod: d.payment_method, observations: d.observations,
        status: d.status, team: d.team, voucherLink1: d.voucher_link_1, testDate: d.test_date,
        voucherLink2: d.voucher_link_2, voucherLink3: d.voucher_link_3, boletosLink: d.boletos_link,
        negotiationReference: d.negotiation_reference, attachments: d.attachments, createdAt: d.created_at
    }));
  },

  saveBillingNegotiation: async (neg: Partial<BillingNegotiation>): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
        id: neg.id || crypto.randomUUID(),
        open_installments: neg.openInstallments,
        total_negotiated_value: neg.totalNegotiatedValue,
        total_installments: neg.totalInstallments,
        due_date: neg.dueDate || null,
        responsible_agent: neg.responsibleAgent,
        identifier_code: neg.identifierCode,
        full_name: neg.fullName,
        product_name: neg.productName,
        original_value: neg.originalValue,
        payment_method: neg.paymentMethod,
        observations: neg.observations,
        status: neg.status,
        team: neg.team,
        voucher_link_1: neg.voucherLink1,
        test_date: neg.testDate,
        voucher_link_2: neg.voucherLink2,
        voucher_link_3: neg.voucherLink3,
        boletos_link: neg.boletosLink,
        negotiation_reference: neg.negotiationReference,
        attachments: neg.attachments,
        created_at: neg.createdAt || new Date().toISOString()
    };
    await supabase.from('crm_billing_negotiations').upsert(payload);
  },

  deleteBillingNegotiation: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_billing_negotiations').delete().eq('id', id);
  }
};
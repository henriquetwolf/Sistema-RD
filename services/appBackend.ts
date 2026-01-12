
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

  // --- PRESETS ---

  getPresets: async (): Promise<SavedPreset[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from(TABLE_NAME).select('*').order('name');
    return (data || []).map((d: any) => ({
      id: d.id, 
      name: d.name, 
      url: d.url, 
      key: d.key, 
      tableName: d.table_name, 
      primaryKey: d.primary_key, 
      intervalMinutes: d.interval_minutes, 
      createdByName: d.created_by_name
    }));
  },

  savePreset: async (preset: Partial<SavedPreset>): Promise<SavedPreset> => {
    if (!isConfigured) throw new Error("Backend not configured");
    const payload = {
      name: preset.name, url: preset.url, key: preset.key, table_name: preset.tableName, primary_key: preset.primaryKey, interval_minutes: preset.intervalMinutes, created_by_name: preset.createdByName
    };
    if (preset.id) {
      const { data, error } = await supabase.from(TABLE_NAME).update(payload).eq('id', preset.id).select().single();
      if (error) throw error;
      return { id: data.id, name: data.name, url: data.url, key: data.key, tableName: data.table_name, primaryKey: data.primary_key, intervalMinutes: data.interval_minutes, createdByName: data.created_by_name };
    } else {
      const { data, error = null } = await supabase.from(TABLE_NAME).insert([payload]).select().single();
      if (error) throw error;
      return { id: data.id, name: data.name, url: data.url, key: data.key, tableName: data.table_name, primaryKey: data.primary_key, intervalMinutes: data.interval_minutes, createdByName: data.created_by_name };
    }
  },

  deletePreset: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from(TABLE_NAME).delete().eq('id', id);
  },

  // --- ONLINE COURSES ---

  getOnlineCourses: async (): Promise<OnlineCourse[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_online_courses').select('*').order('created_at', { ascending: false });
      if (error) return [];
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
      const payload: any = {
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
          const { data, error = null } = await supabase.from('crm_online_courses').insert([payload]).select().single();
          if (error) throw error;
          return { id: data.id, title: data.title, description: data.description, price: data.price, paymentLink: data.payment_link, imageUrl: data.image_url, certificateTemplateId: data.certificate_template_id, createdAt: data.created_at };
      }
  },

  deleteOnlineCourse: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_online_courses').delete().eq('id', id);
  },

  getCourseModules: async (courseId: string): Promise<CourseModule[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_course_modules').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
      if (error) throw error;
      return (data || []).map((d: any) => ({ id: d.id, courseId: d.course_id, title: d.title, orderIndex: d.order_index }));
  },

  saveCourseModule: async (mod: Partial<CourseModule>): Promise<void> => {
      if (!isConfigured) return;
      const payload = { 
          course_id: mod.courseId, 
          title: mod.title, 
          order_index: mod.orderIndex ?? 0 
      };
      if (mod.id) await supabase.from('crm_course_modules').update(payload).eq('id', mod.id);
      else await supabase.from('crm_course_modules').insert([payload]);
  },

  deleteCourseModule: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_course_modules').delete().eq('id', id);
  },

  getModuleLessons: async (moduleId: string): Promise<CourseLesson[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_course_lessons').select('*').eq('module_id', moduleId).order('order_index', { ascending: true });
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
          order_index: lesson.orderIndex ?? 0 
      };
      if (lesson.id) await supabase.from('crm_course_lessons').update(payload).eq('id', lesson.id);
      else await supabase.from('crm_course_lessons').insert([payload]);
  },

  deleteCourseLesson: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_course_lessons').delete().eq('id', id);
  },

  getStudentCourseAccess: async (studentDealId: string): Promise<string[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_student_course_access').select('course_id').eq('student_deal_id', studentDealId);
      return (data || []).map((d: any) => d.course_id);
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
  },

  getStudentLessonProgress: async (studentDealId: string): Promise<string[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_student_lesson_progress').select('lesson_id').eq('student_deal_id', studentDealId);
      return (data || []).map((d: any) => d.lesson_id);
  },

  // --- FORMS & SURVEYS (Data Separation V58) ---

  getForms: async (): Promise<FormModel[]> => {
    if (!isConfigured) return [];
    // Filtro estrito pelo tipo 'form'
    const { data } = await supabase.from('crm_forms').select('*').eq('type', 'form').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({
      id: d.id, title: d.title, description: d.description, campaign: d.campaign, isLeadCapture: d.is_lead_capture, distributionMode: d.distribution_mode, fixedOwnerId: d.fixed_owner_id, teamId: d.team_id, targetPipeline: d.target_pipeline, targetStage: d.target_stage, questions: d.questions, style: d.style, createdAt: d.created_at, submissionsCount: d.submissions_count || 0, folderId: d.folder_id
    }));
  },

  getSurveys: async (): Promise<SurveyModel[]> => {
    if (!isConfigured) return [];
    // Filtro estrito pelo tipo 'survey'
    const { data } = await supabase.from('crm_forms').select('*').eq('type', 'survey').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({
      id: d.id, title: d.title, description: d.description, campaign: d.campaign, isLeadCapture: d.is_lead_capture, distributionMode: d.distribution_mode, fixedOwnerId: d.fixed_owner_id, teamId: d.team_id, targetPipeline: d.target_pipeline, targetStage: d.target_stage, questions: d.questions, style: d.style, createdAt: d.created_at, submissionsCount: d.submissions_count || 0, folderId: d.folder_id, targetType: d.target_type || 'all', targetProductType: d.target_product_type, targetProductName: d.target_product_name, onlyIfFinished: d.only_if_finished || false, isActive: d.is_active !== false
    }));
  },

  getFormById: async (id: string): Promise<FormModel | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('crm_forms').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    return {
      /* FIXED: Changed 'd' to 'data' to resolve reference error */
      id: data.id, title: data.title, description: data.description, campaign: data.campaign, isLeadCapture: data.is_lead_capture, distributionMode: data.distribution_mode, fixedOwnerId: data.fixed_owner_id, teamId: data.team_id, targetPipeline: data.target_pipeline, targetStage: data.target_stage, questions: data.questions, style: data.style, createdAt: data.created_at, submissionsCount: data.submissions_count || 0, folderId: data.folder_id
    } as any;
  },

  saveForm: async (form: FormModel): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      id: (form.id && form.id.length > 10) ? form.id : crypto.randomUUID(),
      title: form.title, description: form.description, campaign: form.campaign, is_lead_capture: form.isLeadCapture, distribution_mode: form.distributionMode, fixed_owner_id: form.fixedOwnerId || null, team_id: form.team_id || null, target_pipeline: form.targetPipeline, target_stage: form.targetStage, questions: form.questions, style: form.style, folder_id: form.folderId || null,
      created_at: form.createdAt || new Date().toISOString(),
      type: 'form' // Força tipo formulário
    };
    await supabase.from('crm_forms').upsert(payload, { onConflict: 'id' });
  },

  saveSurvey: async (survey: SurveyModel): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      id: (survey.id && survey.id.length > 10) ? survey.id : crypto.randomUUID(),
      title: survey.title, description: survey.description, campaign: survey.campaign, is_lead_capture: survey.isLeadCapture, distribution_mode: survey.distributionMode, fixed_owner_id: survey.fixedOwnerId || null, team_id: survey.team_id || null, target_pipeline: survey.targetPipeline, target_stage: survey.targetStage, questions: survey.questions, style: survey.style, folder_id: survey.folderId || null, target_type: survey.targetType, target_product_type: survey.targetProductType, target_product_name: survey.targetProductName, only_if_finished: survey.onlyIfFinished, is_active: survey.isActive,
      created_at: survey.createdAt || new Date().toISOString(),
      type: 'survey' // Força tipo pesquisa
    };
    await supabase.from('crm_forms').upsert(payload, { onConflict: 'id' });
  },

  deleteForm: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    // O ON DELETE CASCADE no banco garantirá que as submissions apaguem juntas
    const { error } = await supabase.from('crm_forms').delete().eq('id', id);
    if (error) {
        console.error("Erro ao excluir do Supabase:", error);
        throw error;
    }
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

  // --- OUTROS MÓDULOS ---

  getContracts: async (): Promise<Contract[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_contracts').select('*').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({
      id: d.id, title: d.title, content: d.content, city: d.city, contractDate: d.contract_date, status: d.status, folderId: d.folder_id, signers: d.signers || [], createdAt: d.created_at
    }));
  },

  getContractById: async (id: string): Promise<Contract | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('crm_contracts').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    return {
      id: data.id, title: data.title, content: data.content, city: data.city, contractDate: data.contract_date, status: data.status, folderId: data.folder_id, signers: data.signers || [], createdAt: data.created_at
    };
  },

  saveContract: async (contract: Contract): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      id: contract.id, title: contract.title, content: contract.content, city: contract.city, contract_date: contract.contractDate, status: contract.status, folder_id: contract.folderId || null, signers: contract.signers || [], created_at: contract.createdAt || new Date().toISOString()
    };
    await supabase.from('crm_contracts').upsert(payload, { onConflict: 'id' });
  },

  deleteContract: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_contracts').delete().eq('id', id);
  },

  getPendingContractsByEmail: async (email: string): Promise<Contract[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_contracts').select('*').eq('status', 'sent');
      return (data || []).filter((c: any) => 
        c.signers.some((s: any) => s.email.toLowerCase() === email.toLowerCase() && s.status === 'pending')
      ).map((d: any) => ({
        id: d.id, title: d.title, content: d.content, city: d.city, contractDate: d.contract_date, status: d.status, folderId: d.folder_id, signers: d.signers || [], createdAt: d.created_at
      }));
  },

  signContract: async (contractId: string, signerId: string, signatureData: string): Promise<void> => {
      if (!isConfigured) return;
      const { data: contract } = await supabase.from('crm_contracts').select('*').eq('id', contractId).single();
      if (!contract) return;
      const signers = contract.signers.map((s: any) => 
        s.id === signerId ? { ...s, status: 'signed', signatureData, signedAt: new Date().toISOString() } : s
      );
      const allSigned = signers.every((s: any) => s.status === 'signed');
      await supabase.from('crm_contracts').update({ 
        signers, 
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

  sendContractEmailSimulation: async (email: string, name: string, title: string) => {
      console.log(`[SIMULAÇÃO] Enviando convite de assinatura para ${name} (${email}) - Contrato: ${title}`);
  },

  getSupportTags: async (role?: 'student' | 'instructor' | 'studio' | 'all'): Promise<SupportTag[]> => {
    if (!isConfigured) return [];
    let query = supabase.from('crm_support_tags').select('*').order('name');
    if (role) query = query.or(`role.eq.${role},role.eq.all`);
    const { data } = await query;
    return (data || []).map((d: any) => ({ id: d.id, role: d.role, name: d.name, createdAt: d.created_at }));
  },

  getCertificates: async (): Promise<CertificateModel[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_certificates').select('*').order('created_at', { ascending: false });
      return (data || []).map((d: any) => ({
          id: d.id, title: d.title, backgroundData: d.background_data, backBackgroundData: d.back_background_data, linkedProductId: d.linked_product_id, bodyText: d.body_text, layoutConfig: d.layout_config, createdAt: d.created_at
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
      created_at: cert.createdAt || new Date().toISOString()
    };
    await supabase.from('crm_certificates').upsert(payload, { onConflict: 'id' });
  },

  deleteCertificate: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_certificates').delete().eq('id', id);
  },

  getStudentCertificate: async (hash: string): Promise<any | null> => {
    if (!isConfigured) return null;
    const { data: issued } = await supabase.from('crm_student_certificates').select('*').eq('hash', hash).maybeSingle();
    if (!issued) return null;
    const { data: template } = await supabase.from('crm_certificates').select('*').eq('id', issued.certificate_template_id).single();
    const { data: deal } = await supabase.from('crm_deals').select('contact_name, course_city').eq('id', issued.student_deal_id).single();
    
    return {
        studentName: deal?.contact_name || 'Aluno',
        studentCity: deal?.course_city || 'Cidade',
        template: {
            id: template.id,
            title: template.title,
            backgroundData: template.background_data,
            backBackgroundData: template.back_background_data,
            bodyText: template.body_text,
            layoutConfig: template.layout_config
        },
        issuedAt: issued.issued_at
    };
  },

  issueCertificate: async (studentDealId: string, templateId: string): Promise<string> => {
    if (!isConfigured) return "mock-hash";
    const hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await supabase.from('crm_student_certificates').insert([{
        student_deal_id: studentDealId,
        certificate_template_id: templateId,
        hash,
        issued_at: new Date().toISOString()
    }]);
    return hash;
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
          created_by: job.createdBy,
          created_at: job.createdAt
      };
      await supabase.from('crm_sync_jobs').upsert(payload, { onConflict: 'id' });
  },

  deleteSyncJob: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_sync_jobs').delete().eq('id', id);
  },

  updateJobStatus: async (id: string, status: string, lastSync: string, lastMessage: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_sync_jobs').update({ status, last_sync: lastSync, last_message: lastMessage }).eq('id', id);
  },

  // --- CRM PIPELINES ---
  getPipelines: async (): Promise<Pipeline[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_pipelines').select('*').order('name');
      return (data || []).map((d: any) => ({ id: d.id, name: d.name, stages: d.stages }));
  },

  savePipeline: async (pipeline: Pipeline): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_pipelines').upsert({ id: pipeline.id, name: pipeline.name, stages: pipeline.stages }, { onConflict: 'id' });
  },

  deletePipeline: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_pipelines').delete().eq('id', id);
  },

  getCompanies: async (): Promise<CompanySetting[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_companies').select('*').order('legal_name');
      return (data || []).map((d: any) => ({ id: d.id, legalName: d.legal_name, cnpj: d.cnpj, webhookUrl: d.webhook_url, productTypes: d.product_types || [], productIds: d.product_ids || [] }));
  },

  getWebhookTriggers: async (): Promise<WebhookTrigger[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_webhook_triggers').select('*').order('created_at', { ascending: false });
      return (data || []).map((d: any) => ({ id: d.id, pipelineName: d.pipeline_name, stageId: d.stage_id, payloadJson: d.payload_json, createdAt: d.created_at }));
  },

  // --- SUPPORT TICKETS ---
  getSupportTickets: async (): Promise<SupportTicket[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_support_tickets').select('*').order('created_at', { ascending: false });
      return (data || []).map((d: any) => ({
          id: d.id, senderId: d.sender_id, senderName: d.sender_name, senderEmail: d.sender_email, senderRole: d.sender_role,
          targetId: d.target_id, targetName: d.target_name, targetEmail: d.target_email, targetRole: d.target_role,
          subject: d.subject, message: d.message, tag: d.tag, status: d.status, response: d.response,
          assignedId: d.assigned_id, assignedName: d.assigned_name, createdAt: d.created_at, updatedAt: d.updated_at
      }));
  },

  getSupportTicketsBySender: async (senderId: string): Promise<SupportTicket[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_support_tickets').select('*').or(`sender_id.eq.${senderId},target_id.eq.${senderId}`).order('created_at', { ascending: false });
      return (data || []).map((d: any) => ({
          id: d.id, senderId: d.sender_id, senderName: d.sender_name, senderEmail: d.sender_email, senderRole: d.sender_role,
          targetId: d.target_id, targetName: d.target_name, targetEmail: d.target_email, targetRole: d.target_role,
          subject: d.subject, message: d.message, tag: d.tag, status: d.status, response: d.response,
          assignedId: d.assigned_id, assignedName: d.assigned_name, createdAt: d.created_at, updatedAt: d.updated_at
      }));
  },

  saveSupportTicket: async (ticket: Partial<SupportTicket>): Promise<void> => {
      if (!isConfigured) return;
      const payload = {
          id: ticket.id || crypto.randomUUID(),
          sender_id: ticket.senderId, sender_name: ticket.senderName, sender_email: ticket.senderEmail, sender_role: ticket.senderRole,
          target_id: ticket.targetId, target_name: ticket.targetName, target_email: ticket.targetEmail, target_role: ticket.targetRole,
          subject: ticket.subject, message: ticket.message, tag: ticket.tag, status: ticket.status || 'open',
          assigned_id: ticket.assignedId, assigned_name: ticket.assignedName,
          updated_at: new Date().toISOString()
      };
      await supabase.from('crm_support_tickets').upsert(payload, { onConflict: 'id' });
  },

  deleteSupportTicket: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_support_tickets').delete().eq('id', id);
  },

  getSupportTicketMessages: async (ticketId: string): Promise<SupportMessage[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      return (data || []).map((d: any) => ({
          id: d.id, ticketId: d.ticket_id, senderId: d.sender_id, senderName: d.sender_name, senderRole: d.sender_role,
          content: d.content, attachmentUrl: d.attachment_url, attachmentName: d.attachment_name, createdAt: d.created_at
      }));
  },

  addSupportMessage: async (msg: Partial<SupportMessage>): Promise<void> => {
      if (!isConfigured) return;
      const payload = {
          ticket_id: msg.ticketId, sender_id: msg.senderId, sender_name: msg.senderName, sender_role: msg.senderRole,
          content: msg.content, attachment_url: msg.attachmentUrl, attachment_name: msg.attachmentName
      };
      await supabase.from('crm_support_messages').insert([payload]);
  },

  // --- ROLES & PERMISSIONS ---
  getRoles: async (): Promise<Role[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_roles').select('*').order('name');
      return (data || []).map((d: any) => ({ id: d.id, name: d.name, permissions: d.permissions || {} }));
  },

  // --- PARTNER STUDIOS ---
  getPartnerStudios: async (): Promise<PartnerStudio[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_partner_studios').select('*').order('fantasy_name');
      return (data || []).map((d: any) => ({
          id: d.id, status: d.status, responsibleName: d.responsible_name, cpf: d.cpf, phone: d.phone, email: d.email,
          secondContactName: d.second_contact_name, secondContactPhone: d.second_contact_phone, fantasyName: d.fantasy_name,
          legalName: d.legal_name, cnpj: d.cnpj, studioPhone: d.studio_phone, address: d.address, city: d.city, state: d.state,
          country: d.country, sizeM2: d.size_m2, studentCapacity: d.student_capacity, rentValue: d.rent_value,
          methodology: d.methodology, studioType: d.studio_type, nameOnSite: d.name_on_site, bank: d.bank, agency: d.agency,
          account: d.account, beneficiary: d.beneficiary, pixKey: d.pix_key, hasReformer: !!d.has_reformer,
          qtyReformer: d.qty_reformer || 0, hasLadderBarrel: !!d.has_ladder_barrel, qtyLadderBarrel: d.qty_ladder_barrel || 0,
          hasChair: !!d.has_chair, qtyChair: d.qty_chair || 0, hasCadillac: !!d.has_cadillac, qtyCadillac: d.qty_cadillac || 0,
          hasChairsForCourse: !!d.has_chairs_for_course, hasTv: !!d.has_tv, maxKitsCapacity: d.max_kits_capacity,
          attachments: d.attachments, password: d.password
      }));
  },

  savePartnerStudio: async (studio: PartnerStudio): Promise<void> => {
      if (!isConfigured) return;
      const payload = {
          id: studio.id || crypto.randomUUID(), status: studio.status, responsible_name: studio.responsibleName, cpf: studio.cpf,
          phone: studio.phone, email: studio.email, second_contact_name: studio.secondContactName, second_contact_phone: studio.secondContactPhone,
          fantasy_name: studio.fantasyName, legal_name: studio.legalName, cnpj: studio.cnpj, studio_phone: studio.studioPhone,
          address: studio.address, city: studio.city, state: studio.state, country: studio.country, size_m2: studio.sizeM2,
          student_capacity: studio.studentCapacity, rent_value: studio.rentValue, methodology: studio.methodology,
          studio_type: studio.studioType, name_on_site: studio.nameOnSite, bank: studio.bank, agency: studio.agency,
          account: studio.account, beneficiary: studio.beneficiary, pix_key: studio.pixKey, has_reformer: studio.hasReformer,
          qty_reformer: studio.qtyReformer, has_ladder_barrel: studio.hasLadderBarrel, qty_ladder_barrel: studio.qtyLadderBarrel,
          has_chair: studio.hasChair, qty_chair: studio.qtyChair, has_cadillac: studio.hasCadillac, qty_cadillac: studio.qtyCadillac,
          has_chairs_for_course: studio.hasChairsForCourse, has_tv: studio.hasTv, max_kits_capacity: studio.maxKitsCapacity,
          attachments: studio.attachments, password: studio.password
      };
      await supabase.from('crm_partner_studios').upsert(payload, { onConflict: 'id' });
  },

  deletePartnerStudio: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_partner_studios').delete().eq('id', id);
  },

  // --- INSTRUCTOR LEVELS ---
  getInstructorLevels: async (): Promise<InstructorLevel[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_teacher_levels').select('*').order('name');
      return (data || []).map((d: any) => ({ id: d.id, name: d.name, honorarium: d.honorarium, observations: d.observations }));
  },

  // --- TEACHER NEWS ---
  getTeacherNews: async (): Promise<TeacherNews[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_teacher_news').select('*').order('created_at', { ascending: false });
      return (data || []).map((d: any) => ({ id: d.id, title: d.title, content: d.content, imageUrl: d.image_url, createdAt: d.created_at }));
  },

  saveTeacherNews: async (news: Partial<TeacherNews>): Promise<void> => {
      if (!isConfigured) return;
      const payload = {
          title: news.title, content: news.content, image_url: news.imageUrl
      };
      if (news.id) await supabase.from('crm_teacher_news').update(payload).eq('id', news.id);
      else await supabase.from('crm_teacher_news').insert([payload]);
  },

  deleteTeacherNews: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_teacher_news').delete().eq('id', id);
  },

  // --- BANNERS ---
  getBanners: async (target: 'student' | 'instructor'): Promise<Banner[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_banners').select('*').eq('target_audience', target).eq('active', true).order('created_at', { ascending: false });
      return (data || []).map((d: any) => ({ id: d.id, title: d.title, imageUrl: d.image_url, linkUrl: d.link_url, targetAudience: d.target_audience, active: d.active, createdAt: d.created_at }));
  },

  // --- EVENTS ---
  getEvents: async (): Promise<EventModel[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_events').select('*').order('created_at', { ascending: false });
      return (data || []).map((d: any) => ({ id: d.id, name: d.name, description: d.description, location: d.location, dates: d.dates || [], registrationOpen: d.registration_open, createdAt: d.created_at }));
  },

  saveEvent: async (evt: EventModel): Promise<EventModel> => {
      if (!isConfigured) throw new Error("Backend not configured");
      const payload = {
          id: evt.id || crypto.randomUUID(), name: evt.name, description: evt.description, location: evt.location, dates: evt.dates, registration_open: evt.registrationOpen, created_at: evt.createdAt || new Date().toISOString()
      };
      const { data, error } = await supabase.from('crm_events').upsert(payload, { onConflict: 'id' }).select().single();
      if (error) throw error;
      return { id: data.id, name: data.name, description: data.description, location: data.location, dates: data.dates || [], registrationOpen: data.registration_open, createdAt: data.created_at };
  },

  deleteEvent: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_events').delete().eq('id', id);
  },

  getWorkshops: async (eventId: string): Promise<Workshop[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_workshops').select('*').eq('event_id', eventId).order('date').order('time');
      return (data || []).map((d: any) => ({ id: d.id, eventId: d.event_id, blockId: d.block_id, title: d.title, description: d.description, speaker: d.speaker, date: d.date, time: d.time, spots: d.spots }));
  },

  saveWorkshop: async (w: Workshop): Promise<Workshop> => {
      if (!isConfigured) throw new Error("Backend not configured");
      const payload = {
          id: w.id || crypto.randomUUID(), event_id: w.eventId, block_id: w.blockId, title: w.title, description: w.description, speaker: w.speaker, date: w.date, time: w.time, spots: w.spots
      };
      const { data, error } = await supabase.from('crm_workshops').upsert(payload, { onConflict: 'id' }).select().single();
      if (error) throw error;
      return { id: data.id, eventId: data.event_id, blockId: data.block_id, title: data.title, description: data.description, speaker: data.speaker, date: data.date, time: data.time, spots: data.spots };
  },

  deleteWorkshop: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_workshops').delete().eq('id', id);
  },

  getBlocks: async (eventId: string): Promise<EventBlock[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_event_blocks').select('*').eq('event_id', eventId).order('date').order('title');
      return (data || []).map((d: any) => ({ id: d.id, eventId: d.event_id, date: d.date, title: d.title, maxSelections: d.max_selections }));
  },

  saveBlock: async (b: EventBlock): Promise<EventBlock> => {
      if (!isConfigured) throw new Error("Backend not configured");
      const payload = {
          id: b.id || crypto.randomUUID(), event_id: b.eventId, date: b.date, title: b.title, max_selections: b.maxSelections
      };
      const { data, error } = await supabase.from('crm_event_blocks').upsert(payload, { onConflict: 'id' }).select().single();
      if (error) throw error;
      return { id: data.id, eventId: data.event_id, date: data.date, title: data.title, maxSelections: data.max_selections };
  },

  deleteBlock: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_event_blocks').delete().eq('id', id);
  },

  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_event_registrations').select('*').eq('event_id', eventId);
      return (data || []).map((d: any) => ({ id: d.id, eventId: d.event_id, workshopId: d.workshop_id, studentId: d.student_id, studentName: d.student_name, studentEmail: d.student_email, registeredAt: d.registered_at }));
  },

  // --- WHATSAPP CONFIG ---
  getWhatsAppConfig: async (): Promise<any | null> => {
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

  // --- INVENTORY ---
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

  saveInventoryRecord: async (rec: InventoryRecord): Promise<void> => {
      if (!isConfigured) return;
      const payload = {
          id: rec.id || crypto.randomUUID(), type: rec.type, item_apostila_nova: rec.itemApostilaNova,
          item_apostila_classico: rec.itemApostilaClassico, item_sacochila: rec.itemSacochila,
          item_lapis: rec.itemLapis, registration_date: rec.registrationDate, studio_id: rec.studioId || null,
          tracking_code: rec.trackingCode, observations: rec.observations,
          conference_date: rec.conferenceDate || null, attachments: rec.attachments
      };
      await supabase.from('crm_inventory').upsert(payload, { onConflict: 'id' });
  },

  deleteInventoryRecord: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_inventory').delete().eq('id', id);
  },

  // --- BILLING NEGOTIATIONS ---
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
          id: neg.id || crypto.randomUUID(), open_installments: neg.openInstallments, total_negotiated_value: neg.totalNegotiatedValue,
          total_installments: neg.totalInstallments, due_date: neg.dueDate, responsible_agent: neg.responsibleAgent,
          identifier_code: neg.identifierCode, full_name: neg.fullName, product_name: neg.productName,
          original_value: neg.originalValue, payment_method: neg.paymentMethod, observations: neg.observations,
          status: neg.status, team: neg.team, voucher_link_1: neg.voucherLink1, test_date: neg.testDate,
          voucher_link_2: neg.voucherLink2, voucher_link_3: neg.voucherLink3, boletos_link: neg.boletosLink,
          negotiation_reference: neg.negotiationReference, attachments: neg.attachments,
          created_at: neg.createdAt || new Date().toISOString()
      };
      await supabase.from('crm_billing_negotiations').upsert(payload, { onConflict: 'id' });
  },

  deleteBillingNegotiation: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_billing_negotiations').delete().eq('id', id);
  },

  getSyncJobs: async (): Promise<SyncJob[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_sync_jobs').select('*').order('created_at', { ascending: false });
    return (data || []).map((j: any) => ({
      id: j.id, name: j.name, sheetUrl: j.sheet_url, config: j.config, lastSync: j.last_sync, status: j.status, lastMessage: j.last_message, active: j.active, intervalMinutes: j.interval_minutes, createdBy: j.created_by, createdAt: j.created_at
    }));
  }
};

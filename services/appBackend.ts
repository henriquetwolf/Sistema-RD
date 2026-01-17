
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  AutomationFlow, SavedPreset, SyncJob, FormModel, Contract, 
  LandingPage, Role, Banner, InstructorLevel, CourseInfo, SupportTag,
  ActivityLog, SurveyModel, FormFolder, BillingNegotiation, SupportTicket,
  SupportMessage, WAAutomationRule, WAAutomationLog, OnlineCourse,
  CourseModule, CourseLesson, EventModel, Workshop, EventRegistration,
  EventBlock, ExternalCertificate, InventoryRecord, PartnerStudio,
  // Fix: Added missing type imports for TeacherNews and CertificateModel
  TeacherNews, CertificateModel, ContractFolder
} from '../types';

// Read from process.env (defined in vite.config.ts)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Defensive initialization
const isConfigured = !!supabaseUrl && !!supabaseKey;

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseKey)
  : (new Proxy({}, {
      get: () => {
        // Only throw if someone tries to use a method on the unconfigured client
        return () => { throw new Error("Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ao seu ambiente."); };
      }
    }) as SupabaseClient);

export interface CompanySetting {
    id: string;
    legalName: string;
    cnpj: string;
    webhookUrl: string;
    productTypes: string[];
    productIds: string[];
}

export interface Pipeline {
    id: string;
    name: string;
    stages: PipelineStage[];
}

export interface PipelineStage {
    id: string;
    title: string;
    color: string;
}

export interface WebhookTrigger {
    id: string;
    pipelineName: string;
    stageId: string;
    payloadJson?: string;
}

export const appBackend = {
    client: supabase,
    auth: {
        getSession: async () => isConfigured ? (await supabase.auth.getSession()).data.session : null,
        onAuthStateChange: (callback: (session: any) => void) => {
            if (!isConfigured) return { data: { subscription: { unsubscribe: () => {} } } };
            return supabase.auth.onAuthStateChange((_event, session) => callback(session));
        },
        signIn: async (email: string, pass: string) => {
            if (!isConfigured) throw new Error("Database not configured");
            return await supabase.auth.signInWithPassword({ email, password: pass });
        },
        signOut: async () => isConfigured && await supabase.auth.signOut(),
    },

    // Automation
    getAutomationFlows: async (): Promise<AutomationFlow[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_automation_flows').select('*').order('created_at', { ascending: false });
        return (data || []).map((f: any) => ({
            id: f.id,
            name: f.name,
            description: f.description,
            formId: f.form_id,
            isActive: f.is_active,
            nodes: f.nodes || [],
            createdAt: f.created_at,
            updatedAt: f.updated_at
        }));
    },
    saveAutomationFlow: async (flow: AutomationFlow): Promise<void> => {
        if (!isConfigured) return;
        const { error } = await supabase.from('crm_automation_flows').upsert({
            id: flow.id || crypto.randomUUID(),
            name: flow.name,
            description: flow.description,
            form_id: flow.formId,
            is_active: flow.isActive,
            nodes: flow.nodes,
            updated_at: new Date().toISOString()
        });
        if (error) throw error;
    },
    deleteAutomationFlow: async (id: string): Promise<void> => {
        if (!isConfigured) return;
        const { error } = await supabase.from('crm_automation_flows').delete().eq('id', id);
        if (error) throw error;
    },

    // Presets
    getPresets: async (): Promise<SavedPreset[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_presets').select('*').order('name');
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
        if (!isConfigured) throw new Error("Not configured");
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
        const { data, error } = await supabase.from('crm_presets').upsert(payload).select().single();
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
    deletePreset: async (id: string) => {
        if (!isConfigured) return;
        const { error } = await supabase.from('crm_presets').delete().eq('id', id);
        if (error) throw error;
    },

    // App Visuals
    getAppLogo: async () => {
        if (!isConfigured) return null;
        const { data } = await supabase.from('crm_settings').select('value').eq('key', 'app_logo').maybeSingle();
        return data?.value || null;
    },
    saveAppLogo: async (url: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_settings').upsert({ key: 'app_logo', value: url });
    },

    // Forms
    getForms: async (): Promise<FormModel[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_forms').select('*, crm_form_submissions(count)').order('created_at', { ascending: false });
        return (data || []).map((f: any) => ({
            ...f,
            folderId: f.folder_id,
            submissionsCount: f.crm_form_submissions?.[0]?.count || 0,
            isLeadCapture: f.is_lead_capture,
            distributionMode: f.distribution_mode,
            targetPipeline: f.target_pipeline,
            targetStage: f.target_stage
        }));
    },
    getFormById: async (id: string): Promise<FormModel | null> => {
        if (!isConfigured) return null;
        const { data } = await supabase.from('crm_forms').select('*').eq('id', id).maybeSingle();
        return data;
    },
    saveForm: async (form: FormModel) => {
        if (!isConfigured) return;
        const { error } = await supabase.from('crm_forms').upsert({
            ...form,
            folder_id: form.folderId,
            is_lead_capture: form.isLeadCapture,
            distribution_mode: form.distributionMode,
            target_pipeline: form.targetPipeline,
            target_stage: form.targetStage
        });
        if (error) throw error;
    },
    deleteForm: async (id: string) => {
        if (!isConfigured) return;
        const { error } = await supabase.from('crm_forms').delete().eq('id', id);
        if (error) throw error;
    },
    getFormSubmissions: async (formId: string) => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_form_submissions').select('*').eq('form_id', formId).order('created_at', { ascending: false });
        return data;
    },
    submitForm: async (formId: string, answers: any[], isLeadCapture: boolean, studentId?: string) => {
        if (!isConfigured) throw new Error("Not configured");
        const { error } = await supabase.from('crm_form_submissions').insert({
            form_id: formId,
            answers,
            student_id: studentId,
            is_lead_capture: isLeadCapture
        });
        if (error) throw error;
    },

    // Contracts
    getContracts: async (): Promise<Contract[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_contracts').select('*').order('created_at', { ascending: false });
        return (data || []).map((c: any) => ({ ...c, folderId: c.folder_id }));
    },
    getContractById: async (id: string): Promise<Contract | null> => {
        if (!isConfigured) return null;
        const { data } = await supabase.from('crm_contracts').select('*').eq('id', id).maybeSingle();
        return data;
    },
    saveContract: async (contract: Contract) => {
        if (!isConfigured) return;
        const { error } = await supabase.from('crm_contracts').upsert({ ...contract, folder_id: contract.folderId });
        if (error) throw error;
    },
    deleteContract: async (id: string) => {
        if (!isConfigured) return;
        const { error } = await supabase.from('crm_contracts').delete().eq('id', id);
        if (error) throw error;
    },
    signContract: async (contractId: string, signerId: string, signatureData: string) => {
        if (!isConfigured) return;
        const { data: contract } = await supabase.from('crm_contracts').select('signers').eq('id', contractId).single();
        if (!contract) return;
        const signers = contract.signers.map((s: any) => s.id === signerId ? { ...s, status: 'signed', signatureData, signedAt: new Date().toISOString() } : s);
        const allSigned = signers.every((s: any) => s.status === 'signed');
        await supabase.from('crm_contracts').update({ signers, status: allSigned ? 'signed' : 'sent' }).eq('id', contractId);
    },
    getPendingContractsByEmail: async (email: string) => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_contracts').select('*');
        return (data || []).filter((c: any) => c.signers.some((s: any) => s.email.toLowerCase() === email.toLowerCase() && s.status === 'pending'));
    },
    sendContractEmailSimulation: async (email: string, name: string, title: string) => {
        console.log(`[SIMULATION] Email sent to ${name} (${email}) for contract: ${title}`);
    },

    // Fix: Added missing Contract Folder management methods
    getContractFolders: async (): Promise<ContractFolder[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_contract_folders').select('*').order('name');
        return data || [];
    },
    saveContractFolder: async (folder: Partial<ContractFolder>) => {
        if (!isConfigured) return;
        await supabase.from('crm_contract_folders').upsert(folder);
    },
    deleteContractFolder: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_contract_folders').delete().eq('id', id);
    },

    // Landing Pages
    getLandingPages: async (): Promise<LandingPage[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_landing_pages').select('*').order('created_at', { ascending: false });
        return data || [];
    },
    getLandingPageById: async (id: string): Promise<LandingPage | null> => {
        if (!isConfigured) return null;
        const { data } = await supabase.from('crm_landing_pages').select('*').eq('id', id).maybeSingle();
        return data;
    },
    saveLandingPage: async (page: LandingPage) => {
        if (!isConfigured) return;
        const { error } = await supabase.from('crm_landing_pages').upsert(page);
        if (error) throw error;
    },
    deleteLandingPage: async (id: string) => {
        if (!isConfigured) return;
        const { error } = await supabase.from('crm_landing_pages').delete().eq('id', id);
        if (error) throw error;
    },

    // Sync Jobs
    getSyncJobs: async (): Promise<SyncJob[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_sync_jobs').select('*').order('created_at', { ascending: false });
        return (data || []).map((j: any) => ({
            ...j,
            sheetUrl: j.sheet_url,
            lastSync: j.last_sync,
            lastMessage: j.last_message,
            intervalMinutes: j.interval_minutes,
            createdBy: j.created_by,
            createdAt: j.created_at
        }));
    },
    saveSyncJob: async (job: SyncJob) => {
        if (!isConfigured) return;
        const { error } = await supabase.from('crm_sync_jobs').upsert({
            ...job,
            sheet_url: job.sheetUrl,
            last_sync: job.lastSync,
            last_message: job.lastMessage,
            interval_minutes: job.intervalMinutes,
            created_by: job.createdBy,
            created_at: job.createdAt
        });
        if (error) throw error;
    },
    updateJobStatus: async (id: string, status: string, lastSync: string, lastMessage: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_sync_jobs').update({ status, last_sync: lastSync, last_message: lastMessage }).eq('id', id);
    },
    deleteSyncJob: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_sync_jobs').delete().eq('id', id);
    },

    // Activity Logs
    getActivityLogs: async (limit = 100): Promise<ActivityLog[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_activity_logs').select('*').order('created_at', { ascending: false }).limit(limit);
        return (data || []).map((l: any) => ({
            id: l.id,
            userName: l.user_name,
            action: l.action,
            module: l.module,
            details: l.details,
            createdAt: l.created_at
        }));
    },
    logActivity: async (activity: Partial<ActivityLog> & { recordId?: string }) => {
        if (!isConfigured) return;
        const savedSession = sessionStorage.getItem('collaborator_session');
        const user = savedSession ? JSON.parse(savedSession) : { name: 'Admin' };
        await supabase.from('crm_activity_logs').insert({
            user_name: user.name,
            action: activity.action,
            module: activity.module,
            details: activity.details,
            record_id: activity.recordId
        });
    },

    // Pipelines
    getPipelines: async (): Promise<Pipeline[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_pipelines').select('*').order('name');
        return data || [];
    },
    savePipeline: async (pipeline: Pipeline) => {
        if (!isConfigured) return;
        await supabase.from('crm_pipelines').upsert(pipeline);
    },
    deletePipeline: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_pipelines').delete().eq('id', id);
    },

    // Companies & Webhooks
    getCompanies: async (): Promise<CompanySetting[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_companies').select('*').order('legal_name');
        return (data || []).map((c: any) => ({
            id: c.id,
            legalName: c.legal_name,
            cnpj: c.cnpj,
            webhookUrl: c.webhook_url,
            productTypes: c.product_types || [],
            productIds: c.product_ids || []
        }));
    },
    saveCompany: async (company: CompanySetting) => {
        if (!isConfigured) return;
        await supabase.from('crm_companies').upsert({
            id: company.id || crypto.randomUUID(),
            legal_name: company.legalName,
            cnpj: company.cnpj,
            webhook_url: company.webhookUrl,
            product_types: company.productTypes,
            product_ids: company.productIds
        });
    },
    deleteCompany: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_companies').delete().eq('id', id);
    },
    getWebhookTriggers: async (): Promise<WebhookTrigger[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_webhook_triggers').select('*');
        return (data || []).map((t: any) => ({
            id: t.id,
            pipelineName: t.pipeline_name,
            stageId: t.stage_id,
            payloadJson: t.payload_json
        }));
    },
    saveWebhookTrigger: async (trigger: Partial<WebhookTrigger>) => {
        if (!isConfigured) return;
        await supabase.from('crm_webhook_triggers').upsert({
            id: trigger.id || crypto.randomUUID(),
            pipeline_name: trigger.pipelineName,
            stage_id: trigger.stageId,
            payload_json: trigger.payloadJson
        });
    },
    deleteWebhookTrigger: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_webhook_triggers').delete().eq('id', id);
    },

    // Roles
    getRoles: async (): Promise<Role[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_roles').select('*').order('name');
        return data || [];
    },
    saveRole: async (role: Role) => {
        if (!isConfigured) return;
        await supabase.from('crm_roles').upsert(role);
    },
    deleteRole: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_roles').delete().eq('id', id);
    },

    // Teacher News
    getTeacherNews: async (): Promise<TeacherNews[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_teacher_news').select('*').order('created_at', { ascending: false });
        return (data || []).map((n: any) => ({ ...n, imageUrl: n.image_url, createdAt: n.created_at }));
    },
    saveTeacherNews: async (news: Partial<TeacherNews>) => {
        if (!isConfigured) return;
        await supabase.from('crm_teacher_news').upsert({ ...news, image_url: news.imageUrl, created_at: news.createdAt || new Date().toISOString() });
    },
    deleteTeacherNews: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_teacher_news').delete().eq('id', id);
    },

    // Instructor Levels
    getInstructorLevels: async (): Promise<InstructorLevel[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_instructor_levels').select('*').order('name');
        return data || [];
    },
    saveInstructorLevel: async (level: Partial<InstructorLevel>) => {
        if (!isConfigured) return;
        await supabase.from('crm_instructor_levels').upsert(level);
    },
    deleteInstructorLevel: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_instructor_levels').delete().eq('id', id);
    },

    // Certificates
    getCertificates: async (): Promise<CertificateModel[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_certificates').select('*').order('created_at', { ascending: false });
        return (data || []).map((c: any) => ({
            ...c,
            backgroundData: c.background_data,
            backBackgroundData: c.back_background_data,
            linkedProductId: c.linked_product_id,
            bodyText: c.body_text,
            layoutConfig: c.layout_config,
            createdAt: c.created_at
        }));
    },
    saveCertificate: async (cert: CertificateModel) => {
        if (!isConfigured) return;
        await supabase.from('crm_certificates').upsert({
            ...cert,
            background_data: cert.backgroundData,
            back_background_data: cert.backBackgroundData,
            linked_product_id: cert.linkedProductId,
            body_text: cert.bodyText,
            layout_config: cert.layoutConfig
        });
    },
    deleteCertificate: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_certificates').delete().eq('id', id);
    },
    issueCertificate: async (studentDealId: string, templateId: string) => {
        if (!isConfigured) throw new Error("Not configured");
        const hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await supabase.from('crm_student_certificates').insert({
            student_deal_id: studentDealId,
            certificate_template_id: templateId,
            hash,
            issued_at: new Date().toISOString()
        });
        return hash;
    },
    getStudentCertificate: async (hash: string) => {
        if (!isConfigured) return null;
        const { data, error } = await supabase.from('crm_student_certificates').select('*, crm_certificates(*), crm_deals(contact_name, company_name, course_city)').eq('hash', hash).single();
        if (error || !data) return null;
        return {
            studentName: data.crm_deals.company_name || data.crm_deals.contact_name,
            studentCity: data.crm_deals.course_city || 'São Paulo',
            template: {
                ...data.crm_certificates,
                layoutConfig: data.crm_certificates.layout_config,
                bodyText: data.crm_certificates.body_text,
                backgroundData: data.crm_certificates.background_data,
                backBackgroundData: data.crm_certificates.back_background_data
            },
            issuedAt: data.issued_at
        };
    },

    // Online Courses
    getOnlineCourses: async (): Promise<OnlineCourse[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_online_courses').select('*').order('title');
        return (data || []).map((c: any) => ({
            ...c,
            paymentLink: c.payment_link,
            imageUrl: c.image_url,
            certificateTemplateId: c.certificate_template_id
        }));
    },
    saveOnlineCourse: async (course: Partial<OnlineCourse>) => {
        if (!isConfigured) return;
        await supabase.from('crm_online_courses').upsert({
            ...course,
            payment_link: course.paymentLink,
            image_url: course.imageUrl,
            certificate_template_id: course.certificateTemplateId
        });
    },
    getCourseModules: async (courseId: string): Promise<CourseModule[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_course_modules').select('*').eq('course_id', courseId).order('order_index');
        return (data || []).map((m: any) => ({ ...m, courseId: m.course_id, orderIndex: m.order_index }));
    },
    saveCourseModule: async (mod: Partial<CourseModule>) => {
        if (!isConfigured) return;
        await supabase.from('crm_course_modules').upsert({ ...mod, course_id: mod.courseId, order_index: mod.orderIndex });
    },
    deleteCourseModule: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_course_modules').delete().eq('id', id);
    },
    getModuleLessons: async (moduleId: string): Promise<CourseLesson[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_course_lessons').select('*').eq('module_id', moduleId).order('order_index');
        return (data || []).map((l: any) => ({ ...l, moduleId: l.module_id, videoUrl: l.video_url, orderIndex: l.order_index }));
    },
    saveCourseLesson: async (lesson: Partial<CourseLesson>) => {
        if (!isConfigured) return;
        await supabase.from('crm_course_lessons').upsert({ ...lesson, module_id: lesson.moduleId, video_url: lesson.videoUrl, order_index: lesson.orderIndex });
    },
    deleteCourseLesson: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_course_lessons').delete().eq('id', id);
    },
    getStudentCourseAccess: async (dealId: string) => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_student_course_access').select('course_id').eq('student_deal_id', dealId);
        return (data || []).map((a: any) => a.course_id);
    },
    getStudentLessonProgress: async (dealId: string) => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_student_lesson_progress').select('lesson_id').eq('student_deal_id', dealId).eq('completed', true);
        return (data || []).map((p: any) => p.lesson_id);
    },
    toggleLessonProgress: async (dealId: string, lessonId: string, completed: boolean) => {
        if (!isConfigured) return;
        await supabase.from('crm_student_lesson_progress').upsert({ student_deal_id: dealId, lesson_id: lessonId, completed });
    },

    // Events
    getEvents: async (): Promise<EventModel[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_events').select('*').order('created_at', { ascending: false });
        return (data || []).map((e: any) => ({ ...e, registrationOpen: e.registration_open, createdAt: e.created_at }));
    },
    saveEvent: async (evt: EventModel) => {
        if (!isConfigured) throw new Error("Not configured");
        const { data, error } = await supabase.from('crm_events').upsert({
            ...evt,
            registration_open: evt.registrationOpen,
            created_at: evt.createdAt
        }).select().single();
        if (error) throw error;
        return { ...data, registrationOpen: data.registration_open, createdAt: data.created_at };
    },
    deleteEvent: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_events').delete().eq('id', id);
    },
    getBlocks: async (eventId: string): Promise<EventBlock[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_event_blocks').select('*').eq('event_id', eventId).order('date');
        return (data || []).map((b: any) => ({ ...b, eventId: b.event_id, maxSelections: b.max_selections }));
    },
    saveBlock: async (block: Partial<EventBlock>) => {
        if (!isConfigured) throw new Error("Not configured");
        const { data, error } = await supabase.from('crm_event_blocks').upsert({
            ...block,
            event_id: block.eventId,
            max_selections: block.maxSelections
        }).select().single();
        if (error) throw error;
        return { ...data, eventId: data.event_id, maxSelections: data.max_selections };
    },
    deleteBlock: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_event_blocks').delete().eq('id', id);
    },
    getWorkshops: async (eventId: string): Promise<Workshop[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_event_workshops').select('*').eq('event_id', eventId).order('time');
        return (data || []).map((w: any) => ({ ...w, eventId: w.event_id, blockId: w.block_id }));
    },
    saveWorkshop: async (workshop: Partial<Workshop>) => {
        if (!isConfigured) throw new Error("Not configured");
        const { data, error } = await supabase.from('crm_event_workshops').upsert({
            ...workshop,
            event_id: workshop.eventId,
            block_id: workshop.blockId
        }).select().single();
        if (error) throw error;
        return { ...data, eventId: data.event_id, blockId: data.block_id };
    },
    deleteWorkshop: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_event_workshops').delete().eq('id', id);
    },
    getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_event_registrations').select('*').eq('event_id', eventId);
        return (data || []).map((r: any) => ({
            ...r,
            eventId: r.event_id,
            workshopId: r.workshop_id,
            studentId: r.student_id,
            studentName: r.student_name,
            studentEmail: r.student_email,
            registeredAt: r.created_at
        }));
    },

    // Banners
    getBanners: async (audience: 'student' | 'instructor'): Promise<Banner[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_banners').select('*').eq('target_audience', audience).order('created_at', { ascending: false });
        return (data || []).map((b: any) => ({
            ...b,
            linkUrl: b.link_url,
            imageUrl: b.image_url,
            targetAudience: b.target_audience
        }));
    },
    saveBanner: async (banner: Banner) => {
        if (!isConfigured) return;
        await supabase.from('crm_banners').upsert({
            ...banner,
            link_url: banner.linkUrl,
            image_url: banner.imageUrl,
            target_audience: banner.targetAudience
        });
    },
    deleteBanner: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_banners').delete().eq('id', id);
    },

    // Inventory
    getInventory: async (): Promise<InventoryRecord[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_inventory').select('*').order('registration_date', { ascending: false });
        return (data || []).map((r: any) => ({
            ...r,
            itemApostilaNova: r.item_apostila_nova,
            itemApostilaClassico: r.item_apostila_classico,
            itemSacochila: r.item_sacochila,
            itemLapis: r.item_lapis,
            registrationDate: r.registration_date,
            studioId: r.studio_id,
            trackingCode: r.tracking_code,
            conferenceDate: r.conference_date
        }));
    },
    saveInventoryRecord: async (record: InventoryRecord) => {
        if (!isConfigured) return;
        await supabase.from('crm_inventory').upsert({
            ...record,
            item__apostila_nova: record.itemApostilaNova,
            item__apostila_classico: record.itemApostilaClassico,
            item__sacochila: record.itemSacochila,
            item__lapis: record.itemLapis,
            registration_date: record.registrationDate,
            studio_id: record.studioId,
            tracking_code: record.trackingCode,
            conference_date: record.conferenceDate
        });
    },
    deleteInventoryRecord: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_inventory').delete().eq('id', id);
    },
    getInventorySecurityMargin: async () => {
        if (!isConfigured) return 5;
        const { data } = await supabase.from('crm_settings').select('value').eq('key', 'inventory_margin').maybeSingle();
        return parseInt(data?.value || '5');
    },
    saveInventorySecurityMargin: async (val: number) => {
        if (!isConfigured) return;
        await supabase.from('crm_settings').upsert({ key: 'inventory_margin', value: String(val) });
    },

    // Partner Studios
    getPartnerStudios: async (): Promise<PartnerStudio[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_partner_studios').select('*').order('fantasy_name');
        return (data || []).map((s: any) => ({
            ...s,
            responsibleName: s.responsible_name,
            secondContactName: s.second_contact_name,
            secondContactPhone: s.second_contact_phone,
            fantasyName: s.fantasy_name,
            legalName: s.legal_name,
            studioPhone: s.studio_phone,
            sizeM2: s.size_m2,
            studentCapacity: s.student_capacity,
            rentValue: s.rent_value,
            studioType: s.studio_type,
            nameOnSite: s.name_on_site,
            qty_reformer: s.qty_reformer,
            qty_ladder_barrel: s.qty_ladder_barrel,
            qty_chair: s.qty_chair,
            qty_cadillac: s.qty_cadillac,
            has_chairs_for_course: s.has_chairs_for_course,
            has_tv: s.has_tv,
            max_kits_capacity: s.max_kits_capacity
        }));
    },
    savePartnerStudio: async (studio: PartnerStudio) => {
        if (!isConfigured) return;
        await supabase.from('partner_studios').upsert({
            ...studio,
            responsible_name: studio.responsibleName,
            second_contact_name: studio.secondContactName,
            second_contact_phone: studio.secondContactPhone,
            fantasy_name: studio.fantasyName,
            legal_name: studio.legalName,
            studio_phone: studio.studioPhone,
            size_m2: studio.sizeM2,
            student_capacity: studio.studentCapacity,
            rent_value: studio.rentValue,
            studio_type: studio.studioType,
            name_on_site: studio.nameOnSite,
            qty_reformer: studio.qtyReformer,
            qty_ladder_barrel: studio.qtyLadderBarrel,
            qty_chair: studio.qtyChair,
            qty_cadillac: studio.qtyCadillac,
            has_chairs_for_course: studio.hasChairsForCourse,
            has_tv: studio.hasTv,
            max_kits_capacity: studio.maxKitsCapacity
        });
    },
    deletePartnerStudio: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_partner_studios').delete().eq('id', id);
    },

    // Surveys & Folders
    getSurveys: async (): Promise<SurveyModel[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_forms').select('*, crm_form_submissions(count)').eq('type', 'survey').order('created_at', { ascending: false });
        return (data || []).map((s: any) => ({
            ...s,
            folderId: s.folder_id,
            submissionsCount: s.crm_form_submissions?.[0]?.count || 0,
            targetAudience: s.target_audience,
            targetType: s.target_type,
            targetProductType: s.target_product_type,
            targetProductName: s.target_product_name,
            onlyIfFinished: s.only_if_finished,
            isActive: s.is_active
        }));
    },
    saveSurvey: async (survey: SurveyModel) => {
        if (!isConfigured) return;
        await supabase.from('crm_forms').upsert({
            ...survey,
            type: 'survey',
            folder_id: survey.folderId,
            target_audience: survey.targetAudience,
            target_type: survey.targetType,
            target_product_type: survey.targetProductType,
            target_product_name: survey.targetProductName,
            only_if_finished: survey.onlyIfFinished,
            is_active: survey.isActive
        });
    },
    getFormFolders: async (type: 'form' | 'survey'): Promise<FormFolder[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_form_folders').select('*').eq('type', type).order('name');
        return data || [];
    },
    saveFormFolder: async (folder: FormFolder, type: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_form_folders').upsert({ ...folder, type });
    },
    deleteFormFolder: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_form_folders').delete().eq('id', id);
    },

    // Billing
    getBillingNegotiations: async (): Promise<BillingNegotiation[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_billing_negotiations').select('*').order('created_at', { ascending: false });
        return (data || []).map((n: any) => ({
            ...n,
            fullName: n.full_name,
            identifierCode: n.identifier_code,
            productName: n.product_name,
            originalValue: n.original_value,
            totalNegotiatedValue: n.total_negotiated_value,
            totalInstallments: n.total_installments,
            openInstallments: n.open_installments,
            paymentMethod: n.payment_method,
            dueDate: n.due_date,
            responsibleAgent: n.responsible_agent,
            negotiationReference: n.negotiation_reference,
            voucher_link_1: n.voucher_link_1,
            voucher_link_2: n.voucher_link_2,
            voucher_link_3: n.voucher_link_3,
            boletos_link: n.boletos_link,
            testDate: n.test_date,
            createdAt: n.created_at
        }));
    },
    saveBillingNegotiation: async (neg: Partial<BillingNegotiation>) => {
        if (!isConfigured) return;
        await supabase.from('crm_billing_negotiations').upsert({
            ...neg,
            full_name: neg.fullName,
            identifier_code: neg.identifierCode,
            product_name: neg.productName,
            original_value: neg.originalValue,
            total_negotiated_value: neg.totalNegotiatedValue,
            total_installments: neg.totalInstallments,
            open_installments: neg.openInstallments,
            payment_method: neg.paymentMethod,
            due_date: neg.dueDate,
            responsible_agent: neg.responsibleAgent,
            negotiation_reference: neg.negotiationReference,
            voucher_link_1: neg.voucherLink1,
            voucher_link_2: neg.voucherLink2,
            voucher_link_3: neg.voucherLink3,
            boletos_link: neg.boletosLink,
            test_date: neg.testDate,
            created_at: neg.createdAt
        });
    },
    deleteBillingNegotiation: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_billing_negotiations').delete().eq('id', id);
    },

    // Support
    getSupportTickets: async (): Promise<SupportTicket[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_support_tickets').select('*').order('updated_at', { ascending: false });
        return (data || []).map((t: any) => ({
            ...t,
            senderId: t.sender_id,
            senderName: t.sender_name,
            senderEmail: t.sender_email,
            senderRole: t.sender_role,
            targetId: t.target_id,
            targetName: t.target_name,
            targetEmail: t.target_email,
            targetRole: t.target_role,
            assignedId: t.assigned_id,
            assignedName: t.assigned_name,
            createdAt: t.created_at,
            updatedAt: t.updated_at
        }));
    },
    getSupportTicketsBySender: async (senderId: string) => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_support_tickets').select('*').or(`sender_id.eq.${senderId},target_id.eq.${senderId}`).order('updated_at', { ascending: false });
        return (data || []).map((t: any) => ({
            ...t,
            senderId: t.sender_id,
            senderName: t.sender_name,
            senderEmail: t.sender_email,
            senderRole: t.sender_role,
            targetId: t.target_id,
            targetName: t.target_name,
            targetEmail: t.target_email,
            targetRole: t.target_role,
            assignedId: t.assigned_id,
            assignedName: t.assigned_name,
            createdAt: t.created_at,
            updatedAt: t.updated_at
        }));
    },
    saveSupportTicket: async (ticket: Partial<SupportTicket>) => {
        if (!isConfigured) return;
        await supabase.from('crm_support_tickets').upsert({
            ...ticket,
            sender_id: ticket.senderId,
            sender_name: ticket.senderName,
            sender_email: ticket.senderEmail,
            sender_role: ticket.senderRole,
            target_id: ticket.targetId,
            target_name: ticket.targetName,
            target_email: ticket.targetEmail,
            target_role: ticket.targetRole,
            assigned_id: ticket.assignedId,
            assigned_name: ticket.assignedName,
            updated_at: new Date().toISOString()
        });
    },
    deleteSupportTicket: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_support_tickets').delete().eq('id', id);
    },
    getSupportTicketMessages: async (ticketId: string): Promise<SupportMessage[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
        return (data || []).map((m: any) => ({
            ...m,
            ticketId: m.ticket_id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            senderRole: m.sender_role,
            attachment_url: m.attachment_url,
            attachment_name: m.attachment_name,
            createdAt: m.created_at
        }));
    },
    addSupportMessage: async (msg: SupportMessage) => {
        if (!isConfigured) return;
        await supabase.from('crm_support_messages').insert({
            ticket_id: msg.ticketId,
            sender_id: msg.senderId,
            sender_name: msg.senderName,
            sender_role: msg.senderRole,
            content: msg.content,
            attachment_url: msg.attachmentUrl,
            attachment_name: msg.attachmentName
        });
    },
    getSupportTags: async (role?: string): Promise<SupportTag[]> => {
        if (!isConfigured) return [];
        let query = supabase.from('crm_support_tags').select('*');
        if (role) query = query.or(`role.eq.all,role.eq.${role}`);
        const { data } = await query.order('name');
        return data || [];
    },
    saveSupportTag: async (tag: Partial<SupportTag>) => {
        if (!isConfigured) return;
        await supabase.from('crm_support_tags').upsert(tag);
    },
    deleteSupportTag: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_support_tags').delete().eq('id', id);
    },

    // WhatsApp
    getWhatsAppConfig: async () => {
        if (!isConfigured) return null;
        const { data } = await supabase.from('crm_settings').select('value').eq('key', 'wa_config').maybeSingle();
        return data ? JSON.parse(data.value) : null;
    },
    saveWhatsAppConfig: async (config: any) => {
        if (!isConfigured) return;
        await supabase.from('crm_settings').upsert({ key: 'wa_config', value: JSON.stringify(config) });
    },
    getWAAutomationRules: async (): Promise<WAAutomationRule[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_wa_automations').select('*').order('created_at', { ascending: false });
        return (data || []).map((r: any) => ({
            ...r,
            triggerType: r.trigger_type,
            pipelineName: r.pipeline_name,
            stageId: r.stage_id,
            productType: r.product_type,
            productId: r.product_id,
            messageTemplate: r.message_template,
            isActive: r.is_active,
            createdAt: r.created_at
        }));
    },
    saveWAAutomationRule: async (rule: WAAutomationRule) => {
        if (!isConfigured) return;
        await supabase.from('crm_wa_automations').upsert({
            ...rule,
            trigger_type: rule.triggerType,
            pipeline_name: rule.pipelineName,
            stage_id: rule.stageId,
            product_type: rule.productType,
            product_id: rule.productId,
            message_template: rule.messageTemplate,
            is_active: rule.isActive
        });
    },
    deleteWAAutomationRule: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_wa_automations').delete().eq('id', id);
    },
    getWAAutomationLogs: async (): Promise<WAAutomationLog[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_wa_logs').select('*').order('created_at', { ascending: false });
        return (data || []).map((l: any) => ({
            ...l,
            ruleName: l.rule_name,
            studentName: l.student_name,
            createdAt: l.created_at
        }));
    },
    logWAAutomation: async (log: Partial<WAAutomationLog>) => {
        if (!isConfigured) return;
        await supabase.from('crm_wa_logs').insert({
            rule_name: log.ruleName,
            student_name: log.studentName,
            phone: log.phone,
            message: log.message
        });
    },

    // Course Infos
    getCourseInfos: async (): Promise<CourseInfo[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_course_portal_infos').select('*').order('course_name');
        return (data || []).map((i: any) => ({ ...i, courseName: i.course_name }));
    },
    saveCourseInfo: async (info: Partial<CourseInfo>) => {
        if (!isConfigured) return;
        await supabase.from('crm_course_portal_infos').upsert({ ...info, course_name: info.courseName });
    },
    deleteCourseInfo: async (id: string) => {
        if (!isConfigured) return;
        await supabase.from('crm_course_portal_infos').delete().eq('id', id);
    },

    // External Certificates
    getExternalCertificates: async (studentId: string): Promise<ExternalCertificate[]> => {
        if (!isConfigured) return [];
        const { data } = await supabase.from('crm_external_certificates').select('*').eq('student_id', studentId).order('completion_date', { ascending: false });
        return data || [];
    },
    saveExternalCertificate: async (cert: Partial<ExternalCertificate>) => {
        if (!isConfigured) return;
        await supabase.from('crm_external_certificates').upsert(cert);
    },

    // Utils
    slugify: (text: string) => slugify(text)
};

export const slugify = (text: string) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
};

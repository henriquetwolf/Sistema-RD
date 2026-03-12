import { createClient, Session } from '@supabase/supabase-js';
import { 
  SavedPreset, FormModel, SurveyModel, FormAnswer, Contract, ContractFolder, 
  ContractSigner,
  CertificateModel, StudentCertificate, ExternalCertificate, EventModel, Workshop, EventRegistration, 
  EventBlock, Role, Banner, PartnerStudio, InstructorLevel, InventoryRecord, 
  SyncJob, ActivityLog, CollaboratorSession, BillingNegotiation, FormFolder, 
  CourseInfo, TeacherNews, SupportTicket, SupportMessage, 
  CompanySetting, Pipeline, WebhookTrigger, SupportTag, OnlineCourse, CourseModule, CourseLesson, StudentCourseAccess, StudentLessonProgress,
  WAAutomationRule, WAAutomationLog, PipelineStage, LandingPage, AutomationFlow, EmailConfig,
  ContaAzulProductMapping, FranchisePresentationSection,
  StudioDigitalEquipment, StudioDigitalExercise,
  FranchiseMeetingAvailability, FranchiseMeetingBlockedDate, FranchiseMeetingBooking, FranchiseMeetingSettings,
  Apostila, ApostilaAnnotation, ApostilaProgress,
  CourseClosing, CourseClosingExpense, CourseClosingHistory,
  CourseRental, CourseRentalReceipt,
  GamificationSetting, GamificationLevel, GamificationPointRule, GamificationBadge,
  GamificationStudentBadge, GamificationStreak, GamificationChallenge,
  GamificationChallengeProgress, GamificationReward, GamificationRewardClaim,
  GamificationStudentPoints, GamificationNotificationSetting,
  GamificationSummary, GamificationAwardResult, GamificationClaimResult,
  GamificationLeaderboardEntry, GamificationContentUnlock
} from '../types';
import { whatsappService } from './whatsappService';
import { brevoService } from './brevoService';

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
    onAuthStateChange: (callback: (session: Session | null) => void) => {
      if (!isConfigured) { callback(MOCK_SESSION as unknown as Session); return { data: { subscription: { unsubscribe: () => {} } } }; }
      return supabase.auth.onAuthStateChange((_event, session) => callback(session));
    },
    getSession: async () => {
      if (!isConfigured) return MOCK_SESSION as unknown as Session;
      const { data } = await supabase.auth.getSession();
      return data.session;
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
      createdAt: data.created_at, 
      submissionsCount: item.crm_form_submissions?.[0]?.count || 0, 
      folderId: item.folder_id
    }));
  },

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
      id: (flow.id && flow.id.trim() !== '') ? flow.id : crypto.randomUUID(),
      name: flow.name || 'Fluxo sem nome',
      description: flow.description || null,
      form_id: (flow.formId && flow.formId.trim() !== '') ? flow.formId : null,
      is_active: !!flow.isActive,
      nodes: flow.nodes || [],
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
  },

  deleteAutomationFlow: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_automation_flows').delete().eq('id', id);
    if (error) throw error;
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
      createdAt: data.created_at, 
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

  sendEmailViaSendGrid: async (to: string, subject: string, body: string): Promise<boolean> => {
      const config = await appBackend.getEmailConfig();
      if (!config || !config.apiKey || !config.senderEmail) {
          console.warn("[EMAIL] Configurações de e-mail incompletas.");
          return false;
      }

      const result = await brevoService.sendEmail(
          config.apiKey,
          config.senderEmail,
          config.senderName || 'VOLL Pilates',
          { to, subject, htmlContent: body }
      );

      return result.success;
  },

  sendTestEmail: async (testRecipient: string): Promise<{ success: boolean; error?: string }> => {
      const config = await appBackend.getEmailConfig();
      if (!config || !config.apiKey || !config.senderEmail) {
          return { success: false, error: 'Configurações de e-mail incompletas. Salve a chave e o sender primeiro.' };
      }
      const result = await brevoService.sendTestEmail(
          config.apiKey,
          config.senderEmail,
          config.senderName || 'VOLL Pilates',
          testRecipient
      );
      return result;
  },

  sendFranchiseEmail: async (to: string, subject: string, body: string): Promise<boolean> => {
      const settings = await appBackend.getFranchiseMeetingSettings();
      let apiKey = settings.brevo_api_key;
      let senderEmail = settings.brevo_sender_email;
      let senderName = settings.brevo_sender_name || 'VOLL Pilates';

      if (!apiKey || !senderEmail) {
          const generalConfig = await appBackend.getEmailConfig();
          if (!generalConfig || !generalConfig.apiKey || !generalConfig.senderEmail) {
              console.warn("[FRANCHISE EMAIL] Nenhuma configuração de e-mail disponível (franquia nem geral).");
              return false;
          }
          apiKey = generalConfig.apiKey;
          senderEmail = generalConfig.senderEmail;
          senderName = generalConfig.senderName || 'VOLL Pilates';
      }

      const result = await brevoService.sendEmail(apiKey, senderEmail, senderName, { to, subject, htmlContent: body });
      return result.success;
  },

  sendFranchiseTestEmail: async (testRecipient: string): Promise<{ success: boolean; error?: string }> => {
      const settings = await appBackend.getFranchiseMeetingSettings();
      let apiKey = settings.brevo_api_key;
      let senderEmail = settings.brevo_sender_email;
      let senderName = settings.brevo_sender_name || 'VOLL Pilates';

      if (!apiKey || !senderEmail) {
          return { success: false, error: 'Configuração de e-mail da franquia incompleta. Preencha a chave API e o e-mail remetente, ou configure o e-mail geral do sistema.' };
      }

      const result = await brevoService.sendTestEmail(apiKey, senderEmail, senderName, testRecipient);
      return result;
  },

  /**
   * Executa a lógica de automação de fluxo associada a uma submissão.
   * Otimizado para suportar esperas assíncronas e progressão contínua de nós.
   */
  runFlowInstance: async (flow: AutomationFlow, answers: FormAnswer[]) => {
      const triggerNode = flow.nodes.find(n => n.type === 'trigger');
      if (!triggerNode || !triggerNode.nextId) {
          console.debug("[FLOW] Gatilho sem conexão ou fim prematuro.");
          return;
      }

      // Variáveis para interpolação (fallback mais robusto para nomes compostos)
      const nameAns = answers.find(a => {
          const t = a.questionTitle.toLowerCase();
          return t === 'nome' || t === 'nome completo' || t.includes('nome');
      })?.value || 'Cliente';
      
      const emailAns = answers.find(a => {
          const t = a.questionTitle.toLowerCase();
          return t === 'email' || t === 'e-mail' || t.includes('email');
      })?.value || '---';

      const replaceVars = (str: string) => {
          if (!str) return '';
          // Uso de função como segundo parâmetro do replace previne problemas com caracteres especiais ($&) no nome
          return str
              .replace(/\{\{nome_cliente\}\}/gi, () => nameAns)
              .replace(/\{\{email\}\}/gi, () => emailAns);
      };

      console.log(`[AUTOMATION] Iniciando fluxo: ${flow.name}`);

      let currentId: string | null = triggerNode.nextId;

      while (currentId) {
          const node = flow.nodes.find(n => n.id === currentId);
          if (!node) break;

          // Próximo passo padrão (atualizado ao final do ciclo)
          let nextIdToSet: string | null = node.nextId || null;

          try {
              switch (node.type) {
                  case 'whatsapp':
                      let waPhone = answers.find(a => a.questionId === node.config?.phoneFieldId)?.value;
                      if (!waPhone) {
                          waPhone = answers.find(a => a.questionTitle.toLowerCase().includes('telefone') || a.questionTitle.toLowerCase().includes('whatsapp'))?.value;
                      }

                      if (waPhone) {
                          const cleanDigits = String(waPhone).replace(/\D/g, '');
                          const text = replaceVars(node.config?.message || '');
                          
                          console.log(`[AUTOMATION] Disparando WhatsApp p/ ${cleanDigits}`);
                          await whatsappService.sendTextMessage({ wa_id: cleanDigits, contact_phone: cleanDigits }, text);
                          await appBackend.logWAAutomation({ ruleName: `FLUXO: ${flow.name}`, studentName: nameAns, phone: cleanDigits, message: text });
                      }
                      break;

                  case 'email':
                      let targetEmail = answers.find(a => a.questionId === node.config?.emailFieldId)?.value;
                      if (!targetEmail) {
                          targetEmail = answers.find(a => a.questionTitle.toLowerCase().includes('email'))?.value;
                      }
                      
                      if (targetEmail) {
                          const subject = replaceVars(node.config?.subject || '');
                          const body = replaceVars(node.config?.body || '');
                          await appBackend.sendEmailViaSendGrid(targetEmail, subject, body);
                      }
                      break;

                  case 'wait':
                      const d = parseInt(node.config?.days) || 0;
                      const h = parseInt(node.config?.hours) || 0;
                      const m = parseInt(node.config?.minutes) || 0;
                      const ms = ((d * 1440) + (h * 60) + m) * 60000;
                      
                      if (ms > 0) {
                          console.log(`[AUTOMATION] Aguardando ${ms}ms (${m} min)...`);
                          await new Promise(resolve => setTimeout(resolve, ms));
                          console.log(`[AUTOMATION] Retomando fluxo após espera.`);
                      }
                      break;

                  case 'condition':
                      // Lógica de ramificação (mock simplificado)
                      nextIdToSet = answers.length > 0 ? (node.yesId || null) : (node.noId || null);
                      break;

                  case 'sms':
                      let smsPhone = answers.find(a => a.questionId === node.config?.phoneFieldId)?.value;
                      if (!smsPhone) {
                          smsPhone = answers.find(a => a.questionTitle.toLowerCase().includes('telefone') || a.questionTitle.toLowerCase().includes('celular'))?.value;
                      }

                      if (smsPhone) {
                          const cleanSmsDigits = String(smsPhone).replace(/\D/g, '');
                          const smsText = replaceVars(node.config?.message || '');
                          if (smsText) {
                              const smsConfig = await appBackend.getEmailConfig();
                              if (smsConfig?.apiKey) {
                                  const formattedPhone = cleanSmsDigits.startsWith('+') ? cleanSmsDigits : `+55${cleanSmsDigits}`;
                                  await brevoService.sendSms(smsConfig.apiKey, { to: formattedPhone, content: smsText, sender: 'VOLL' });
                                  console.log(`[AUTOMATION] SMS disparado p/ ${cleanSmsDigits}`);
                              }
                          }
                      }
                      break;

                  case 'crm_action':
                      break;
              }
          } catch (err) {
              console.error(`[AUTOMATION ERROR] Falha no nó ${node.id} (${node.type}):`, err);
          }

          // Atualiza o cursor para a próxima iteração
          currentId = nextIdToSet;
      }
      console.log(`[AUTOMATION] Fluxo ${flow.name} finalizado.`);
  },

  submitForm: async (formId: string, answers: FormAnswer[], isLeadCapture: boolean, studentId?: string): Promise<void> => {
    if (!isConfigured) return;
    const { error: subError } = await supabase.from('crm_form_submissions').insert([{ form_id: formId, answers, student_id: studentId }]);
    if (subError) throw subError;

    if (isLeadCapture) {
        try {
            const { data: form } = await supabase.from('crm_forms').select('*').eq('id', formId).single();
            if (form) {
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
                const { data: formDeal } = await supabase.from('crm_deals').insert([dealPayload]).select().single();
                appBackend.executeMarketingCrmAutomations('deal_created', formDeal || dealPayload);
            }
        } catch (crmErr) { console.error(crmErr); }
    }

    // Disparo Assíncrono de Fluxos de Automação
    try {
        const { data: activeFlows } = await supabase.from('crm_automation_flows').select('*').eq('form_id', formId).eq('is_active', true);
        if (activeFlows && activeFlows.length > 0) {
            for (const flowData of activeFlows) {
                const flow: AutomationFlow = { id: flowData.id, name: flowData.name, description: flowData.description, formId: flowData.form_id, isActive: flowData.is_active, nodes: flowData.nodes || [], createdAt: flowData.created_at, updatedAt: flowData.updated_at };
                // Executa o fluxo em background
                appBackend.runFlowInstance(flow, answers);
            }
        }
    } catch (flowErr) { console.error(flowErr); }
  },

  getFormSubmissions: async (formId: string): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_form_submissions').select('*').eq('form_id', formId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  getInstructorLevels: async (): Promise<InstructorLevel[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from('crm_teacher_levels').select('*').order('name');
    if (error) throw error;
    return (data || []).map((item: any) => ({ id: item.id, name: item.name || 'Sem nível', honorarium: Number(item.honorarium || 0), observations: item.observations }));
  },

  saveInstructorLevel: async (level: Partial<InstructorLevel>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_teacher_levels').upsert({ id: level.id || crypto.randomUUID(), name: level.name, honorarium: Number(level.honorarium || 0), observations: level.observations });
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
    return (data || []).map((item: any) => ({ id: item.id, legalName: item.legal_name || 'Sem nome', cnpj: item.cnpj || '', webhookUrl: item.webhook_url || '', productTypes: item.product_types || [], productIds: item.product_ids || [] }));
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
    return (data || []).map((item: any) => ({ id: item.id, courseName: item.course_name || 'Sem curso', details: item.details || '', materials: item.materials || '', requirements: item.requirements || '', updatedAt: item.updated_at }));
  },

  saveCourseInfo: async (info: Partial<CourseInfo>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_course_info').upsert({ id: info.id || crypto.randomUUID(), course_name: info.courseName, details: info.details, materials: info.materials, requirements: info.requirements, updatedAt: new Date().toISOString() });
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

  getFranchisePresentation: async (): Promise<FranchisePresentationSection[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_franchise_presentation').select('*').order('order_index', { ascending: true });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      section_key: row.section_key || '',
      title: row.title || '',
      content: row.content || '',
      order_index: row.order_index ?? 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  saveFranchisePresentation: async (sections: FranchisePresentationSection[]): Promise<void> => {
    if (!isConfigured) return;
    for (const s of sections) {
      await supabase.from('crm_franchise_presentation').upsert({
        id: s.id,
        section_key: s.section_key,
        title: s.title,
        content: s.content,
        order_index: s.order_index,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'section_key' });
    }
  },

  createFranchiseLead: async (dealData: { contact_name?: string; email?: string; phone?: string; cpf?: string; [key: string]: any }): Promise<string> => {
    if (!isConfigured) throw new Error('Backend não configurado');
    const pipelines = await supabase.from('crm_pipelines').select('*').eq('name', 'Franquia').maybeSingle();
    const pipeline = pipelines.data;
    const firstStageId = pipeline?.stages?.[0]?.id ?? 'novo_lead';
    const dealPayload = {
      deal_number: generateDealNumber(),
      pipeline: 'Franquia',
      stage: firstStageId,
      status: 'hot',
      source: 'Área do Aluno - Apresentação Franquia',
      product_type: 'Franquia',
      product_name: 'Franquia VOLL Studios',
      contact_name: dealData.contact_name || '',
      company_name: dealData.contact_name || '',
      email: dealData.email || '',
      phone: dealData.phone || '',
      cpf: dealData.cpf ? String(dealData.cpf).replace(/\D/g, '') : null,
      title: (dealData.contact_name || 'Lead Franquia') + ' - Franquia VOLL',
      observation: dealData.observation || '[Interesse registrado via Área do Aluno - Apresentação Franquia.]',
      created_at: new Date().toISOString(),
      ...dealData,
    };
    const { data, error } = await supabase.from('crm_deals').insert([dealPayload]).select('id').single();
    if (error) throw error;
    return data?.id ?? '';
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
    if (local) { try { return JSON.parse(local); } catch (e) { return null; } }
    if (!isConfigured) return null;
    try {
        const { data } = await supabase.from('crm_settings').select('value').eq('key', 'whatsapp_config').maybeSingle();
        if (data?.value) return JSON.parse(data.value);
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
    const { data, error = null } = await supabase.from('crm_sync_jobs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((j: any) => ({ id: j.id, name: j.name || 'Sincronização', sheet_url: j.sheet_url || '', config: j.config || {}, lastSync: j.last_sync, status: j.status || 'idle', lastMessage: j.last_message || '', active: !!j.active, intervalMinutes: j.interval_minutes || 5, createdBy: j.created_by, createdAt: j.created_at }));
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
    return (data || []).map((item: any) => ({ id: item.id, title: item.title || item.name || 'Sem título', productName: item.product_name || '', slug: item.domain || '', content: item.content || {}, createdAt: item.created_at, updatedAt: item.updated_at, isActive: item.is_active !== false, theme: item.theme || 'modern' }));
  },

  getLandingPageById: async (id: string): Promise<LandingPage | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('crm_landing_pages').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    return { id: data.id, title: data.title || data.name || 'Sem título', productName: data.product_name || '', slug: data.domain || '', content: data.content || {}, createdAt: data.created_at, updatedAt: data.updated_at, isActive: data.is_active !== false, theme: data.theme || 'modern' };
  },

  saveLandingPage: async (lp: LandingPage): Promise<void> => {
    if (!isConfigured) return;
    const isNew = !lp.id || (typeof lp.id === 'string' && lp.id.trim() === '');
    const payload: any = { title: lp.title || 'Nova Página', domain: lp.slug || slugify(lp.title), product_name: lp.productName || null, content: lp.content || {}, is_active: lp.isActive !== false, theme: lp.theme || 'modern', updated_at: new Date().toISOString() };
    if (isNew) { payload.created_at = new Date().toISOString(); await supabase.from('crm_landing_pages').insert([payload]); }
    else await supabase.from('crm_landing_pages').update(payload).eq('id', lp.id);
  },

  deleteLandingPage: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_landing_pages').delete().eq('id', id);
  },

  getPresets: async (): Promise<SavedPreset[]> => {
    if (!isConfigured) return [];
    const { data, error = null } = await supabase.from(PRESETS_TABLE).select('*').order('name');
    if (error) throw error;
    return (data || []).map((item: any) => ({ id: item.id, name: item.name || 'Preset', url: item.url || '', key: item.key || '', tableName: item.table_name || '', primaryKey: item.primary_key || '', intervalMinutes: item.interval_minutes || 5, createdByName: item.created_by_name }));
  },

  savePreset: async (preset: Partial<SavedPreset>): Promise<SavedPreset> => {
    if (!isConfigured) throw new Error("Supabase não configurado");
    const payload = { id: preset.id || crypto.randomUUID(), name: preset.name, url: preset.url, key: preset.key, table_name: preset.tableName, primary_key: preset.primaryKey, interval_minutes: preset.intervalMinutes, created_by_name: preset.createdByName };
    const { data, error } = await supabase.from(PRESETS_TABLE).upsert(payload).select().single();
    if (error) throw error;
    return { id: data.id, name: data.name, url: data.url, key: data.key, tableName: data.table_name, primaryKey: data.primary_key, intervalMinutes: data.interval_minutes, createdByName: data.created_by_name };
  },

  deletePreset: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from(PRESETS_TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  getContractById: async (id: string): Promise<Contract | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('crm_contracts').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    return { id: data.id, title: data.title || '', content: data.content || '', city: data.city || '', contractDate: data.contract_date || '', status: data.status as any, folderId: data.folder_id, signers: data.signers || [], createdAt: data.created_at };
  },

  logWAAutomation: async (log: Omit<WAAutomationLog, 'id' | 'createdAt'>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_wa_automation_logs').insert([{ rule_name: log.ruleName, student_name: log.studentName, phone: log.phone, message: log.message }]);
  },

  saveSupportTicket: async (ticket: Partial<SupportTicket>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_support_tickets').upsert({ id: ticket.id || crypto.randomUUID(), sender_id: ticket.senderId, sender_name: ticket.senderName, sender_email: ticket.senderEmail, sender_role: ticket.senderRole, target_id: ticket.targetId || null, target_name: ticket.targetName || null, target_email: ticket.targetEmail || null, target_role: ticket.targetRole || null, subject: ticket.subject, message: ticket.message, tag: ticket.tag, status: ticket.status || 'open', assigned_id: ticket.assignedId || null, assigned_name: ticket.assignedName || null, created_at: ticket.createdAt || new Date().toISOString(), updated_at: new Date().toISOString() });
  },

  getPartnerStudios: async (): Promise<PartnerStudio[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_partner_studios').select('*').order('fantasy_name');
    const normalizeStatus = (s: string) => (s === 'Ativo' || s === 'active') ? 'active' : 'inactive';
    return (data || []).map((s: any) => ({ id: s.id, status: normalizeStatus(s.status), responsibleName: s.responsible_name, cpf: s.cpf, phone: s.phone, email: s.email, password: s.password, secondContactName: s.second_contact_name, secondContactPhone: s.second_contact_phone, fantasyName: s.fantasy_name, legalName: s.legal_name, cnpj: s.cnpj, studioPhone: s.studio_phone, address: s.address, city: s.city, state: s.state, country: s.country, sizeM2: s.size_m2, studentCapacity: s.student_capacity, rentValue: s.rent_value, methodology: s.methodology, studioType: s.studio_type, nameOnSite: s.name_on_site, bank: s.bank, agency: s.agency, account: s.account, beneficiary: s.beneficiary, pixKey: s.pix_key, hasReformer: !!s.has_reformer, qtyReformer: s.qty_reformer, hasLadderBarrel: !!s.has_ladder_barrel, qtyLadderBarrel: s.qty_ladder_barrel, hasChair: !!s.has_chair, qtyChair: s.qty_chair, hasCadillac: !!s.has_cadillac, qtyCadillac: s.qty_cadillac, hasChairsForCourse: !!s.has_chairs_for_course, hasTv: !!s.has_tv, maxKitsCapacity: s.max_kits_capacity, attachments: s.attachments }));
  },

  savePartnerStudio: async (studio: PartnerStudio): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_partner_studios').upsert({ id: studio.id || crypto.randomUUID(), status: studio.status, responsible_name: studio.responsibleName, cpf: studio.cpf, phone: studio.phone, email: studio.email, password: studio.password, second_contact_name: studio.secondContactName, second_contact_phone: studio.secondContactPhone, fantasy_name: studio.fantasyName, legal_name: studio.legalName, cnpj: studio.cnpj, studio_phone: studio.studioPhone, address: studio.address, city: studio.city, state: studio.state, country: studio.country, size_m2: studio.sizeM2, student_capacity: studio.studentCapacity, rent_value: studio.rentValue, methodology: studio.methodology, studio_type: studio.studioType, name_on_site: studio.nameOnSite, bank: studio.bank, agency: studio.agency, account: studio.account, beneficiary: studio.beneficiary, pix_key: studio.pixKey, has_reformer: !!studio.hasReformer, qty_reformer: studio.qtyReformer, has_ladder_barrel: !!studio.hasLadderBarrel, qty_ladder_barrel: studio.qtyLadderBarrel, has_chair: !!studio.hasChair, qty_chair: studio.qtyChair, has_cadillac: !!studio.hasCadillac, qty_cadillac: studio.qtyCadillac, has_chairs_for_course: !!studio.hasChairsForCourse, has_tv: !!studio.hasTv, max_kits_capacity: studio.maxKitsCapacity, attachments: studio.attachments });
    if (error) throw error;
  },

  deletePartnerStudio: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_partner_studios').delete().eq('id', id);
  },

  getTeacherNews: async (): Promise<TeacherNews[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_teacher_news').select('*').order('created_at', { ascending: false });
    return (data || []).map((n: any) => ({ id: n.id, title: n.title, content: n.content, imageUrl: n.image_url, createdAt: n.created_at }));
  },

  saveTeacherNews: async (news: Partial<TeacherNews>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_teacher_news').upsert({ id: news.id || crypto.randomUUID(), title: news.title, content: news.content, image_url: news.imageUrl, created_at: news.createdAt || new Date().toISOString() });
  },

  deleteTeacherNews: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_teacher_news').delete().eq('id', id);
  },

  signContract: async (contractId: string, signerId: string, signatureData: string): Promise<void> => {
    if (!isConfigured) return;
    const { data: contract } = await supabase.from('crm_contracts').select('signers, status').eq('id', contractId).single();
    if (!contract) throw new Error("Contrato não encontrado");
    const signers = (contract.signers || []) as ContractSigner[];
    const updatedSigners = signers.map(s => s.id === signerId ? { ...s, status: 'signed' as const, signatureData, signedAt: new Date().toISOString() } : s);
    const allSigned = updatedSigners.every(s => s.status === 'signed');
    await supabase.from('crm_contracts').update({ signers: updatedSigners, status: allSigned ? 'signed' : 'sent', updated_at: new Date().toISOString() }).eq('id', contractId);
  },

  getContracts: async (): Promise<Contract[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_contracts').select('*').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({ id: d.id, title: d.title || '', content: d.content || '', city: d.city || '', contractDate: d.contract_date || '', status: d.status as any, folderId: d.folder_id, signers: d.signers || [], createdAt: d.created_at }));
  },

  getContractFolders: async (): Promise<ContractFolder[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_contract_folders').select('*').order('name');
    return (data || []).map((f: any) => ({ id: f.id, name: f.name, createdAt: f.created_at }));
  },

  saveContract: async (contract: Contract): Promise<void> => {
    if (!isConfigured) return;
    // FIX: Changed contract.contract_date to contract.contractDate to match Contract type
    await supabase.from('crm_contracts').upsert({ id: contract.id || crypto.randomUUID(), title: contract.title, content: contract.content, city: contract.city, contract_date: contract.contractDate, status: contract.status, folder_id: contract.folderId, signers: contract.signers, created_at: contract.createdAt || new Date().toISOString() });
  },

  sendContractEmailSimulation: async (email: string, name: string, title: string): Promise<void> => {
      console.log(`[SIMULAÇÃO] Enviando e-mail de contrato para ${name} (${email}): ${title}`);
      return Promise.resolve();
  },

  saveContractFolder: async (folder: ContractFolder): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_contract_folders').upsert({ id: folder.id || crypto.randomUUID(), name: folder.name, created_at: folder.createdAt || new Date().toISOString() });
  },

  deleteContractFolder: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_contract_folders').delete().eq('id', id);
  },

  deleteContract: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_contracts').delete().eq('id', id);
  },

  issueCertificate: async (studentDealId: string, templateId: string): Promise<string> => {
    if (!isConfigured) return 'mock-hash';
    const hash = crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();
    await supabase.from('crm_student_certificates').insert([{ student_deal_id: studentDealId, certificate_template_id: templateId, hash: hash, issued_at: new Date().toISOString() }]);
    return hash;
  },

  getOnlineCourses: async (): Promise<OnlineCourse[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_online_courses').select('*').order('title');
    return (data || []).map((c: any) => ({ id: c.id, title: c.title, description: c.description, price: Number(c.price || 0), payment_link: c.payment_link, imageUrl: c.image_url, certificateTemplateId: c.certificate_template_id, createdAt: c.created_at }));
  },

  saveOnlineCourse: async (course: Partial<OnlineCourse>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_online_courses').upsert({ id: course.id || crypto.randomUUID(), title: course.title, description: course.description, price: course.price, payment_link: course.paymentLink, image_url: course.imageUrl, certificate_template_id: course.certificateTemplateId || null, created_at: course.createdAt || new Date().toISOString() });
  },

  getCertificates: async (): Promise<CertificateModel[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_certificates').select('*').order('title');
    return (data || []).map((c: any) => ({ id: c.id, title: c.title, background_data: c.background_data, back_background_data: c.back_background_data, linked_product_id: c.linked_product_id, body_text: c.body_text, layout_config: c.layout_config, createdAt: c.created_at }));
  },

  saveCertificate: async (cert: CertificateModel): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_certificates').upsert({ id: cert.id || crypto.randomUUID(), title: cert.title, background_data: cert.backgroundData, back_background_data: cert.backBackgroundData, linked_product_id: cert.linkedProductId, body_text: cert.bodyText, layout_config: cert.layoutConfig, created_at: cert.createdAt || new Date().toISOString() });
  },

  deleteCertificate: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_certificates').delete().eq('id', id);
  },

  getCourseModules: async (courseId: string): Promise<CourseModule[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_course_modules').select('*').eq('course_id', courseId).order('order_index');
    return (data || []).map((m: any) => ({ id: m.id, courseId: m.course_id, title: m.title, orderIndex: m.order_index }));
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
    return (data || []).map((l: any) => ({ id: l.id, moduleId: l.module_id, title: l.title, description: l.description, video_url: l.video_url, materials: l.materials || [], orderIndex: l.order_index }));
  },

  saveCourseLesson: async (lesson: Partial<CourseLesson>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_course_lessons').upsert({ id: lesson.id || crypto.randomUUID(), module_id: lesson.moduleId, title: lesson.title, description: lesson.description, video_url: lesson.videoUrl, materials: lesson.materials || [], order_index: lesson.orderIndex });
  },

  deleteCourseLesson: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_course_lessons').delete().eq('id', id);
  },

  getPendingContractsByEmail: async (email: string): Promise<Contract[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_contracts').select('*').eq('status', 'sent');
    return (data || []).filter((c: any) => c.signers?.some((s: any) => s.email.toLowerCase() === email.toLowerCase() && s.status === 'pending')).map((d: any) => ({ id: d.id, title: d.title || '', content: d.content || '', city: d.city || '', contractDate: d.contract_date || '', status: d.status as any, folderId: d.folder_id, signers: d.signers || [], createdAt: d.created_at }));
  },

  getSupportTicketsBySender: async (senderId: string): Promise<SupportTicket[]> => {
    if (!isConfigured) return [];
    // Retorna chamados onde o usuário é REMETENTE ou DESTINATÁRIO (ex.: chamados iniciados pelo admin para este usuário)
    const { data, error } = await supabase
      .from('crm_support_tickets')
      .select('*')
      .or(`sender_id.eq.${senderId},target_id.eq.${senderId}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((t: any) => ({ id: t.id, senderId: t.sender_id, senderName: t.sender_name, senderEmail: t.sender_email, senderRole: t.sender_role, targetId: t.target_id, targetName: t.target_name, targetEmail: t.target_email, targetRole: t.target_role, subject: t.subject, message: t.message, tag: t.tag, status: t.status, response: t.response, assignedId: t.assigned_id, assignedName: t.assigned_name, createdAt: t.created_at, updatedAt: t.updated_at }));
  },

  getSupportTicketMessages: async (ticketId: string): Promise<SupportMessage[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      return (data || []).map((m: any) => ({ id: m.id, ticketId: m.ticket_id, senderId: m.sender_id, senderName: m.sender_name, senderRole: m.sender_role, content: m.content, attachment_url: m.attachment_url, attachment_name: m.attachment_name, createdAt: m.created_at }));
  },

  addSupportMessage: async (msg: Partial<SupportMessage>): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_support_messages').insert([{ ticket_id: (msg as any).ticketId, sender_id: (msg as any).senderId, sender_name: (msg as any).senderName, sender_role: (msg as any).senderRole, content: (msg as any).content, attachment_url: (msg as any).attachmentUrl, attachment_name: (msg as any).attachmentName }]);
  },

  getStudentCertificate: async (hash: string): Promise<any | null> => {
      if (!isConfigured) return null;
      const { data: cert } = await supabase.from('crm_student_certificates').select('*, crm_deals(company_name, contact_name, course_city), crm_certificates(*)').eq('hash', hash).maybeSingle();
      if (!cert) return null;
      return { studentName: cert.crm_deals?.company_name || cert.crm_deals?.contact_name || 'Aluno', studentCity: cert.crm_deals?.course_city || 'Brasil', template: { id: cert.crm_certificates.id, title: cert.crm_certificates.title, background_data: cert.crm_certificates.background_data, back_background_data: cert.crm_certificates.back_background_data, linked_product_id: cert.crm_certificates.linked_product_id, body_text: cert.crm_certificates.body_text, layout_config: cert.crm_certificates.layout_config, createdAt: cert.crm_certificates.created_at }, issuedAt: cert.issued_at };
  },

  getExternalCertificates: async (studentId: string): Promise<ExternalCertificate[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_external_certificates').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
      return (data || []).map((c: any) => ({ id: c.id, student_id: c.student_id, course_name: c.course_name, completion_date: c.completion_date, file_url: c.file_url, file_name: c.file_name, created_at: c.created_at }));
  },

  saveExternalCertificate: async (cert: any): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_external_certificates').insert([cert]);
  },

  getEvents: async (): Promise<EventModel[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_events').select('*').order('created_at', { ascending: false });
      return (data || []).map((e: any) => ({ id: e.id, name: e.name, description: e.description, location: e.location, dates: e.dates || [], registrationOpen: !!e.registration_open, createdAt: e.created_at }));
  },

  saveEvent: async (evt: EventModel): Promise<EventModel> => {
      if (!isConfigured) return evt;
      const { data, error } = await supabase.from('crm_events').upsert({ id: evt.id || crypto.randomUUID(), name: evt.name, description: evt.description, location: evt.location, dates: evt.dates, registration_open: evt.registrationOpen, created_at: evt.createdAt || new Date().toISOString() }).select().single();
      if (error) throw error;
      return { id: data.id, name: data.name, description: data.description, location: data.location, dates: data.dates, registrationOpen: !!data.registration_open, createdAt: data.created_at };
  },

  deleteEvent: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_events').delete().eq('id', id);
  },

  getBlocks: async (eventId: string): Promise<EventBlock[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_event_blocks').select('*').eq('event_id', eventId).order('date');
      return (data || []).map((b: any) => ({ id: b.id, eventId: b.event_id, date: b.date, title: b.title, maxSelections: b.max_selections }));
  },

  saveBlock: async (block: EventBlock): Promise<EventBlock> => {
      if (!isConfigured) return block;
      const { data, error = null } = await supabase.from('crm_event_blocks').upsert({ id: block.id || crypto.randomUUID(), event_id: block.eventId, date: block.date, title: block.title, max_selections: block.maxSelections }).select().single();
      if (error) throw error;
      return { id: data.id, eventId: data.event_id, date: data.date, title: data.title, maxSelections: data.max_selections };
  },

  deleteBlock: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_event_blocks').delete().eq('id', id);
  },

  getWorkshops: async (eventId: string): Promise<Workshop[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_event_workshops').select('*').eq('event_id', eventId).order('time');
      return (data || []).map((w: any) => ({ id: w.id, eventId: w.event_id, blockId: w.block_id, title: w.title, description: w.description, speaker: w.speaker, date: w.date, time: w.time, spots: w.spots }));
  },

  saveWorkshop: async (ws: Workshop): Promise<Workshop> => {
      if (!isConfigured) return ws;
      const { data, error = null } = await supabase.from('crm_event_workshops').upsert({ id: ws.id || crypto.randomUUID(), event_id: ws.eventId, block_id: ws.blockId, title: ws.title, description: ws.description, speaker: ws.speaker, date: ws.date, time: ws.time, spots: ws.spots }).select().single();
      if (error) throw error;
      return { id: data.id, eventId: data.event_id, blockId: data.block_id, title: data.title, description: data.description, speaker: data.speaker, date: data.date, time: data.time, spots: data.spots };
  },

  deleteWorkshop: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_event_workshops').delete().eq('id', id);
  },

  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_event_registrations').select('*').eq('event_id', eventId);
      return (data || []).map((r: any) => ({ id: r.id, eventId: r.event_id, workshopId: r.workshop_id, studentId: r.student_id, studentName: r.student_name, studentEmail: r.student_email, registeredAt: r.created_at, locked: !!r.locked }));
  },

  getStudentCourseAccess: async (studentDealId: string): Promise<string[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_student_course_access').select('course_id').eq('student_deal_id', studentDealId);
      return (data || []).map((a: any) => a.course_id);
  },

  getStudentLessonProgress: async (studentDealId: string): Promise<string[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_student_lesson_progress').select('lesson_id').eq('student_deal_id', studentDealId);
      return (data || []).map((p: any) => p.lesson_id);
  },

  toggleLessonProgress: async (studentDealId: string, lessonId: string, completed: boolean): Promise<void> => {
      if (!isConfigured) return;
      if (completed) await supabase.from('crm_student_lesson_progress').upsert([{ student_deal_id: studentDealId, lesson_id: lessonId, completed_at: new Date().toISOString() }]);
      else await supabase.from('crm_student_lesson_progress').delete().eq('student_deal_id', studentDealId).eq('lesson_id', lessonId);
  },

  getInventory: async (): Promise<InventoryRecord[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_inventory').select('*').order('registration_date', { ascending: false });
      if (error) throw error;
      return (data || []).map((i: any) => ({ id: i.id, type: i.type, itemApostilaNova: i.item_apostila_nova, itemApostilaClassico: i.item_apostila_classico, itemSacochila: i.item_sacochila, itemLapis: i.item_lapis, registrationDate: i.registration_date, studio_id: i.studio_id, tracking_code: i.tracking_code, observations: i.observations, conference_date: i.conference_date || null, attachments: i.attachments, createdAt: i.created_at }));
  },

  saveInventoryRecord: async (rec: InventoryRecord): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_inventory').upsert({ id: rec.id || crypto.randomUUID(), type: rec.type, item_apostila_nova: rec.itemApostilaNova, item_apostila_classico: rec.itemApostilaClassico, item_sacochila: rec.itemSacochila, item_lapis: rec.itemLapis, registration_date: rec.registrationDate, studio_id: rec.studioId || null, tracking_code: rec.trackingCode, observations: rec.observations, conference_date: rec.conferenceDate || null, attachments: rec.attachments });
  },

  deleteInventoryRecord: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_inventory').delete().eq('id', id);
  },

  getBillingNegotiations: async (): Promise<BillingNegotiation[]> => {
      if (!isConfigured) return [];
      const { data, error = null } = await supabase.from('crm_billing_negotiations').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((n: any) => ({ id: n.id, openInstallments: n.open_installments, totalNegotiatedValue: n.total_negotiated_value, totalInstallments: n.total_installments, dueDate: n.due_date, responsible_agent: n.responsible_agent, identifier_code: n.identifier_code, full_name: n.full_name, product_name: n.product_name, original_value: n.original_value, payment_method: n.payment_method, observations: n.observations, status: n.status, team: n.team, voucher_link_1: n.voucher_link_1, test_date: n.test_date, voucher_link_2: n.voucher_link_2, voucher_link_3: n.voucher_link_3, boletos_link: n.boletos_link, negotiation_reference: n.negotiation_reference, attachments: n.attachments, createdAt: n.created_at }));
  },

  saveBillingNegotiation: async (neg: Partial<BillingNegotiation>): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_billing_negotiations').upsert({ id: neg.id || crypto.randomUUID(), open_installments: neg.openInstallments, total_negotiated_value: neg.totalNegotiatedValue, total_installments: neg.totalInstallments, due_date: neg.dueDate, responsible_agent: neg.responsibleAgent, identifier_code: neg.identifierCode, full_name: neg.fullName, product_name: neg.productName, original_value: neg.originalValue, payment_method: neg.paymentMethod, observations: neg.observations, status: neg.status, team: neg.team, voucher_link_1: neg.voucherLink1, test_date: neg.testDate, voucher_link_2: neg.voucherLink2, voucher_link_3: neg.voucherLink3, boletos_link: neg.boletosLink, negotiation_reference: neg.negotiationReference, attachments: neg.attachments, created_at: neg.createdAt || new Date().toISOString() });
  },

  deleteBillingNegotiation: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_billing_negotiations').delete().eq('id', id);
  },

  getSupportTickets: async (): Promise<SupportTicket[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_support_tickets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((t: any) => ({ id: t.id, senderId: t.sender_id, senderName: t.sender_name, senderEmail: t.sender_email, senderRole: t.sender_role, targetId: t.target_id, targetName: t.target_name, targetEmail: t.target_email, targetRole: t.target_role, subject: t.subject, message: t.message, tag: t.tag, status: t.status, response: t.response, assignedId: t.assigned_id, assignedName: t.assigned_name, createdAt: t.created_at, updatedAt: t.updated_at }));
  },

  deleteSupportTicket: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      await supabase.from('crm_support_messages').delete().eq('ticket_id', id);
      await supabase.from('crm_support_tickets').delete().eq('id', id);
  },

  getWAAutomationRules: async (): Promise<WAAutomationRule[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_wa_automations').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({ id: r.id, name: r.name, triggerType: r.trigger_type, pipelineName: r.pipeline_name, stageId: r.stage_id, productType: r.product_type, productId: r.product_id, messageTemplate: r.message_template, isActive: !!r.is_active, createdAt: r.created_at }));
  },

  saveWAAutomationRule: async (rule: WAAutomationRule): Promise<void> => {
      if (!isConfigured) return;
      // FIX: Changed rule.message_template to rule.messageTemplate to match WAAutomationRule type
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
      return (data || []).map((l: any) => ({ id: l.id, ruleName: l.rule_name, studentName: l.student_name, phone: l.phone, message: l.message, createdAt: l.created_at }));
  },

  getEmailConfig: async (): Promise<EmailConfig | null> => {
    const local = localStorage.getItem('crm_email_config');
    if (local) { try { const c = JSON.parse(local); return { ...c, provider: c.provider || 'brevo' }; } catch (e) { return null; } }
    if (!isConfigured) return null;
    try {
        const { data } = await supabase.from('crm_settings').select('value').eq('key', 'email_config').maybeSingle();
        if (data?.value) { const c = JSON.parse(data.value); return { ...c, provider: c.provider || 'brevo' }; }
    } catch (e) { return null; }
    return null;
  },

  saveEmailConfig: async (config: EmailConfig): Promise<void> => {
    const toSave = { ...config, provider: config.provider || 'brevo' };
    localStorage.setItem('crm_email_config', JSON.stringify(toSave));
    if (!isConfigured) return;
    await supabase.from('crm_settings').upsert({ key: 'email_config', value: JSON.stringify(toSave) }, { onConflict: 'key' });
  },

  // ── Conta Azul Product Mapping ─────────────────────────────

  getContaAzulProductMappings: async (): Promise<ContaAzulProductMapping[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase
      .from('crm_conta_azul_product_mapping')
      .select('*')
      .order('item_name');
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id,
      itemType: r.item_type,
      itemId: r.item_id,
      itemName: r.item_name,
      contaAzulCategoryId: r.conta_azul_category_id,
      splitMode: r.split_mode,
      productPercentage: Number(r.product_percentage || 0),
      servicePercentage: Number(r.service_percentage || 100),
      contaAzulServiceName: r.conta_azul_service_name,
      contaAzulServiceId: r.conta_azul_service_id,
      contaAzulProductName: r.conta_azul_product_name,
      contaAzulProductId: r.conta_azul_product_id,
      billingCompanyName: r.billing_company_name,
      billingCnpj: r.billing_cnpj,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  saveContaAzulProductMapping: async (mapping: Partial<ContaAzulProductMapping>): Promise<void> => {
    if (!isConfigured) return;
    const payload: any = {
      item_type: mapping.itemType,
      item_id: mapping.itemId || null,
      item_name: mapping.itemName,
      conta_azul_category_id: mapping.contaAzulCategoryId || null,
      split_mode: mapping.splitMode || 'all_service',
      product_percentage: mapping.productPercentage ?? 0,
      service_percentage: mapping.servicePercentage ?? 100,
      conta_azul_service_name: mapping.contaAzulServiceName || null,
      conta_azul_service_id: mapping.contaAzulServiceId || null,
      conta_azul_product_name: mapping.contaAzulProductName || null,
      conta_azul_product_id: mapping.contaAzulProductId || null,
      billing_company_name: mapping.billingCompanyName || null,
      billing_cnpj: mapping.billingCnpj || null,
      updated_at: new Date().toISOString(),
    };
    if (mapping.id) {
      await supabase.from('crm_conta_azul_product_mapping').update(payload).eq('id', mapping.id);
    } else {
      payload.id = crypto.randomUUID();
      await supabase.from('crm_conta_azul_product_mapping').insert([payload]);
    }
  },

  deleteContaAzulProductMapping: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_conta_azul_product_mapping').delete().eq('id', id);
  },

  // ── Sistema Unificado de Usuário (Multi-Papéis via CPF) ──

  getUserProfile: async (userId: string) => {
    if (!isConfigured) return null;
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return data;
  },

  getUserRoles: async (userId: string) => {
    if (!isConfigured) return [];
    const { data } = await supabase
      .from('user_roles')
      .select('*, crm_roles(name, permissions)')
      .eq('user_id', userId)
      .eq('is_active', true);
    return (data || []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      role: r.role,
      permission_role_id: r.permission_role_id,
      is_active: r.is_active,
      permission_role_name: r.crm_roles?.name || null,
      permissions: r.crm_roles?.permissions || {},
    }));
  },

  refreshMyRoles: async () => {
    if (!isConfigured) return [];
    const { data } = await supabase.rpc('refresh_my_roles');
    return data || [];
  },

  getEntityDataByCpf: async (role: string, cpf: string) => {
    if (!isConfigured) return null;
    const clean = cpf.replace(/\D/g, '');
    const formatted = clean.length === 11
      ? `${clean.slice(0,3)}.${clean.slice(3,6)}.${clean.slice(6,9)}-${clean.slice(9,11)}`
      : clean;
    let table = '';
    let cpfField = 'cpf';

    switch (role) {
      case 'instructor': table = 'crm_teachers'; break;
      case 'student': table = 'crm_alunos'; break;
      case 'collaborator': table = 'crm_collaborators'; break;
      case 'partner_studio': table = 'crm_partner_studios'; break;
      case 'franchisee': table = 'crm_franchises'; break;
      default: return null;
    }

    const { data } = await supabase
      .from(table)
      .select('*')
      .or(`${cpfField}.eq.${clean},${cpfField}.eq.${formatted}`)
      .maybeSingle();

    if (!data) {
      const { data: fuzzy } = await supabase
        .from(table)
        .select('*')
        .or(`${cpfField}.ilike.%${clean}%,${cpfField}.ilike.%${formatted}%`)
        .limit(1)
        .maybeSingle();
      return fuzzy;
    }
    return data;
  },

  lookupCpfGlobal: async (cpf: string) => {
    if (!isConfigured) return null;
    const { data, error } = await supabase.rpc('lookup_cpf_global', { p_cpf: cpf });
    if (error) { console.error('lookup_cpf_global error:', error); return null; }
    return data;
  },

  lookupContaAzulByCpfAndName: async (cpf: string, names: string[], linkedDocuments?: string[]) => {
    if (!isConfigured) return { receber: [], pagar: [] };
    const cleanDoc = cpf.replace(/\D/g, '');
    const validNames = names.filter(n => n && n.trim());

    const allDocs = new Set<string>();
    if (cleanDoc.length >= 11) allDocs.add(cleanDoc);
    (linkedDocuments || []).forEach(d => {
      const clean = d.replace(/\D/g, '');
      if (clean.length >= 11) allDocs.add(clean);
    });

    const formatVariants = (doc: string): string[] => {
      const variants = [doc];
      if (doc.length === 11) {
        variants.push(`${doc.slice(0,3)}.${doc.slice(3,6)}.${doc.slice(6,9)}-${doc.slice(9)}`);
      } else if (doc.length === 14) {
        variants.push(`${doc.slice(0,2)}.${doc.slice(2,5)}.${doc.slice(5,8)}/${doc.slice(8,12)}-${doc.slice(12)}`);
      }
      return variants;
    };

    const queries: Promise<any>[] = [];

    if (allDocs.size > 0) {
      const allVariants: string[] = [];
      allDocs.forEach(d => allVariants.push(...formatVariants(d)));
      queries.push(
        supabase.from('conta_azul_contas_receber')
          .select('*').in('contato_cpf', allVariants)
          .order('data_vencimento', { ascending: false }),
        supabase.from('conta_azul_contas_pagar')
          .select('*').in('contato_cpf', allVariants)
          .order('data_vencimento', { ascending: false }),
      );
    } else {
      queries.push(Promise.resolve({ data: [] }), Promise.resolve({ data: [] }));
    }

    if (validNames.length > 0) {
      const lowerNames = validNames.map(n => n.trim());
      queries.push(
        supabase.from('conta_azul_contas_receber')
          .select('*').in('contato_nome', lowerNames)
          .order('data_vencimento', { ascending: false }),
        supabase.from('conta_azul_contas_pagar')
          .select('*').in('fornecedor_nome', lowerNames)
          .order('data_vencimento', { ascending: false }),
      );
    } else {
      queries.push(Promise.resolve({ data: [] }), Promise.resolve({ data: [] }));
    }

    const [receberByDoc, pagarByDoc, receberByName, pagarByName] = await Promise.all(queries);

    const dedup = (arr: any[]) => {
      const seen = new Set<string>();
      return arr.filter(item => {
        const key = item.id_conta_azul || `${item.descricao}|${item.valor}|${item.data_vencimento}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    return {
      receber: dedup([...(receberByDoc.data || []), ...(receberByName.data || [])]),
      pagar: dedup([...(pagarByDoc.data || []), ...(pagarByName.data || [])]),
    };
  },

  // ── Studio Digital ────────────────────────────────────────

  getStudioDigitalEquipments: async (onlyActive?: boolean): Promise<StudioDigitalEquipment[]> => {
    if (!isConfigured) return [];
    let q = supabase.from('studio_digital_equipments').select('*').order('sort_order');
    if (onlyActive) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) console.error('[StudioDigital] Erro ao buscar equipamentos:', error);
    return (data || []) as StudioDigitalEquipment[];
  },

  getStudioDigitalEquipmentBySlug: async (slug: string): Promise<StudioDigitalEquipment | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('studio_digital_equipments').select('*').eq('slug', slug).maybeSingle();
    return data as StudioDigitalEquipment | null;
  },

  upsertStudioDigitalEquipment: async (eq: Partial<StudioDigitalEquipment>): Promise<void> => {
    if (!isConfigured) return;
    const slug = eq.slug || slugify(eq.name || '');
    const payload = {
      id: eq.id || crypto.randomUUID(),
      name: eq.name,
      slug,
      description: eq.description || '',
      partner_name: eq.partner_name || 'Equipilates',
      image_url: eq.image_url || '',
      is_active: eq.is_active ?? true,
      sort_order: eq.sort_order ?? 0,
    };
    const { error } = await supabase.from('studio_digital_equipments').upsert(payload, { onConflict: 'slug' });
    if (error) console.error('[StudioDigital] Erro ao salvar equipamento:', error);
  },

  toggleStudioDigitalEquipmentActive: async (id: string, isActive: boolean): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('studio_digital_equipments').update({ is_active: isActive }).eq('id', id);
  },

  getStudioDigitalExercises: async (equipmentId: string, onlyActive?: boolean): Promise<StudioDigitalExercise[]> => {
    if (!isConfigured) return [];
    let q = supabase.from('studio_digital_exercises').select('*').eq('equipment_id', equipmentId).order('sort_order');
    if (onlyActive) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) console.error('[StudioDigital] Erro ao buscar exercícios:', error);
    return (data || []) as StudioDigitalExercise[];
  },

  saveStudioDigitalExercise: async (exercise: Partial<StudioDigitalExercise> & { equipment_id: string; name: string; video_url: string }): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('studio_digital_exercises').upsert({
      id: exercise.id || crypto.randomUUID(),
      equipment_id: exercise.equipment_id,
      name: exercise.name,
      description: exercise.description || '',
      video_url: exercise.video_url,
      thumbnail_url: exercise.thumbnail_url || '',
      is_active: exercise.is_active ?? true,
      sort_order: exercise.sort_order ?? 999,
    });
    if (error) console.error('[StudioDigital] Erro ao salvar exercício:', error);
  },

  removeStudioDigitalExercise: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('studio_digital_exercises').delete().eq('id', id);
  },

  toggleStudioDigitalExerciseActive: async (id: string, isActive: boolean): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('studio_digital_exercises').update({ is_active: isActive }).eq('id', id);
  },

  updateStudioDigitalExerciseOrder: async (exercises: { id: string; sort_order: number }[]): Promise<void> => {
    if (!isConfigured) return;
    for (const ex of exercises) {
      await supabase.from('studio_digital_exercises').update({ sort_order: ex.sort_order }).eq('id', ex.id);
    }
  },

  // =========================================================================
  // VOLL Marketing
  // =========================================================================

  // --- Leads ---
  getMarketingLeads: async (filters?: { search?: string; lifecycle?: string; tags?: string[]; minScore?: number }): Promise<any[]> => {
    if (!isConfigured) return [];
    let q = supabase.from('marketing_leads').select('*').order('created_at', { ascending: false });
    if (filters?.search) q = q.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
    if (filters?.lifecycle) q = q.eq('lifecycle_stage', filters.lifecycle);
    if (filters?.minScore) q = q.gte('score', filters.minScore);
    const { data, error } = await q;
    if (error) console.error('[Marketing] Erro ao buscar leads:', error);
    return data || [];
  },

  getMarketingLeadById: async (id: string): Promise<any | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('marketing_leads').select('*').eq('id', id).single();
    return data;
  },

  saveMarketingLead: async (lead: any): Promise<any | null> => {
    if (!isConfigured) return null;
    const payload = { ...lead, id: lead.id || crypto.randomUUID() };
    const { data, error } = await supabase.from('marketing_leads').upsert(payload).select().single();
    if (error) console.error('[Marketing] Erro ao salvar lead:', error);
    return data;
  },

  deleteMarketingLead: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_leads').delete().eq('id', id);
  },

  // --- Lead Events ---
  getLeadEvents: async (leadId: string): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_lead_events').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
    return data || [];
  },

  logLeadEvent: async (leadId: string, eventType: string, eventData: any = {}, source: string = ''): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_lead_events').insert({ lead_id: leadId, event_type: eventType, event_data: eventData, source });
    await supabase.from('marketing_leads').update({ last_activity_at: new Date().toISOString() }).eq('id', leadId);
  },

  // --- Lead Scoring Rules ---
  getScoringRules: async (): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_lead_scoring_rules').select('*').order('created_at');
    return data || [];
  },

  saveScoringRule: async (rule: any): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_lead_scoring_rules').upsert({ ...rule, id: rule.id || crypto.randomUUID() });
  },

  deleteScoringRule: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_lead_scoring_rules').delete().eq('id', id);
  },

  calculateLeadScore: async (leadId: string): Promise<number> => {
    if (!isConfigured) return 0;
    const [leadRes, rulesRes, eventsRes] = await Promise.all([
      supabase.from('marketing_leads').select('*').eq('id', leadId).single(),
      supabase.from('marketing_lead_scoring_rules').select('*').eq('is_active', true),
      supabase.from('marketing_lead_events').select('*').eq('lead_id', leadId),
    ]);
    const lead = leadRes.data;
    const rules = rulesRes.data || [];
    const events = eventsRes.data || [];
    if (!lead) return 0;
    let score = 0;
    for (const rule of rules) {
      if (rule.rule_type === 'profile') {
        const val = (lead as any)[rule.field_or_event] || '';
        if (rule.operator === 'equals' && val === rule.value) score += rule.points;
        if (rule.operator === 'contains' && val.includes(rule.value)) score += rule.points;
        if (rule.operator === 'not_empty' && val) score += rule.points;
      } else if (rule.rule_type === 'behavior') {
        const count = events.filter((e: any) => e.event_type === rule.field_or_event).length;
        if (count > 0) score += rule.points * count;
      }
    }
    await supabase.from('marketing_leads').update({ score }).eq('id', leadId);
    return score;
  },

  // --- Segments ---
  getMarketingSegments: async (): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_segments').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  saveMarketingSegment: async (segment: any): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_segments').upsert({ ...segment, id: segment.id || crypto.randomUUID() });
  },

  deleteMarketingSegment: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_segments').delete().eq('id', id);
  },

  evaluateSegment: async (segmentId: string): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data: seg } = await supabase.from('marketing_segments').select('*').eq('id', segmentId).single();
    if (!seg) return [];
    if (seg.segment_type === 'static') {
      if (!seg.static_lead_ids?.length) return [];
      const { data } = await supabase.from('marketing_leads').select('*').in('id', seg.static_lead_ids);
      return data || [];
    }
    const { data: allLeads } = await supabase.from('marketing_leads').select('*');
    return allLeads || [];
  },

  // --- Email Templates ---
  getEmailTemplates: async (): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_email_templates').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  saveEmailTemplate: async (tpl: any): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_email_templates').upsert({ ...tpl, id: tpl.id || crypto.randomUUID() });
  },

  deleteEmailTemplate: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_email_templates').delete().eq('id', id);
  },

  // --- Email Campaigns ---
  getEmailCampaigns: async (): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_email_campaigns').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  saveEmailCampaign: async (campaign: any): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_email_campaigns').upsert({ ...campaign, id: campaign.id || crypto.randomUUID() });
  },

  deleteEmailCampaign: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_email_campaigns').delete().eq('id', id);
  },

  // --- Marketing Automations ---
  getMarketingAutomations: async (): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_automations').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  saveMarketingAutomation: async (auto: any): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_automations').upsert({ ...auto, id: auto.id || crypto.randomUUID() });
  },

  deleteMarketingAutomation: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_automations').delete().eq('id', id);
  },

  getAutomationSteps: async (automationId: string): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_automation_steps').select('*').eq('automation_id', automationId).order('sort_order');
    return data || [];
  },

  saveAutomationStep: async (step: any): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_automation_steps').upsert({ ...step, id: step.id || crypto.randomUUID() });
  },

  deleteAutomationStep: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_automation_steps').delete().eq('id', id);
  },

  getAutomationExecutions: async (automationId: string): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_automation_executions').select('*').eq('automation_id', automationId).order('started_at', { ascending: false });
    return data || [];
  },

  getAutomationLogs: async (executionId: string): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_automation_logs').select('*').eq('execution_id', executionId).order('created_at');
    return data || [];
  },

  // --- Pop-ups ---
  getMarketingPopups: async (): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('marketing_popups').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    // Mapeia colunas do banco (stats_views, stats_conversions) para o que o frontend espera (views, conversions)
    return (data || []).map((row: any) => ({
      ...row,
      views: row.stats_views ?? row.views ?? 0,
      conversions: row.stats_conversions ?? row.conversions ?? 0,
    }));
  },

  saveMarketingPopup: async (popup: any): Promise<void> => {
    if (!isConfigured) return;
    const { views, conversions, ...rest } = popup;
    const row = {
      ...rest,
      id: popup.id || crypto.randomUUID(),
      stats_views: views ?? rest.stats_views ?? 0,
      stats_conversions: conversions ?? rest.stats_conversions ?? 0,
    };
    const { error } = await supabase.from('marketing_popups').upsert(row);
    if (error) throw error;
  },

  deleteMarketingPopup: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_popups').delete().eq('id', id);
  },

  // --- WhatsApp Buttons ---
  getMarketingWAButtons: async (): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_wa_buttons').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  saveMarketingWAButton: async (btn: any): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_wa_buttons').upsert({ ...btn, id: btn.id || crypto.randomUUID() });
  },

  deleteMarketingWAButton: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_wa_buttons').delete().eq('id', id);
  },

  // --- Link Bio ---
  getMarketingLinkBios: async (): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_link_bio').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  saveMarketingLinkBio: async (bio: any): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_link_bio').upsert({ ...bio, id: bio.id || crypto.randomUUID() });
  },

  deleteMarketingLinkBio: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_link_bio').delete().eq('id', id);
  },

  getLinkBioItems: async (bioId: string): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_link_bio_items').select('*').eq('bio_id', bioId).order('sort_order');
    return data || [];
  },

  saveLinkBioItem: async (item: any): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_link_bio_items').upsert({ ...item, id: item.id || crypto.randomUUID() });
  },

  deleteLinkBioItem: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_link_bio_items').delete().eq('id', id);
  },

  // --- Social Posts ---
  getSocialPosts: async (): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_social_posts').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  saveSocialPost: async (post: any): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_social_posts').upsert({ ...post, id: post.id || crypto.randomUUID() });
  },

  deleteSocialPost: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_social_posts').delete().eq('id', id);
  },

  // --- SMS Campaigns ---
  getSmsCampaigns: async (): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_sms_campaigns').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  saveSmsCampaign: async (c: any): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_sms_campaigns').upsert({ ...c, id: c.id || crypto.randomUUID() });
  },

  deleteSmsCampaign: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_sms_campaigns').delete().eq('id', id);
  },

  // --- Push Campaigns ---
  getPushCampaigns: async (): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_push_campaigns').select('*').order('created_at', { ascending: false });
    return (data || []).map((r: any) => ({
      ...r,
      stats: { sent: r.stats_sent || 0, displayed: r.stats_displayed || 0, clicked: r.stats_clicked || 0 },
    }));
  },

  savePushCampaign: async (c: any): Promise<void> => {
    if (!isConfigured) return;
    const row: any = {
      id: c.id || crypto.randomUUID(),
      name: c.name,
      title: c.title,
      body: c.body,
      icon_url: c.icon_url || '',
      click_url: c.click_url || '',
      segment_id: c.segment_id || null,
      status: c.status || 'draft',
      scheduled_at: c.scheduled_at || null,
    };
    if (c.stats) {
      row.stats_sent = c.stats.sent || 0;
      row.stats_displayed = c.stats.displayed || 0;
      row.stats_clicked = c.stats.clicked || 0;
    }
    await supabase.from('marketing_push_campaigns').upsert(row);
  },

  sendPushCampaign: async (campaign: any): Promise<{ success: boolean; native?: any; web?: any; error?: string }> => {
    if (!isConfigured) return { success: false, error: 'Not configured' };
    try {
      const pushBody = {
        title: campaign.title,
        body: campaign.body,
        image_url: campaign.icon_url || undefined,
        data: { url: campaign.click_url || '/' },
      };

      // Send to both students and instructors
      const [studentRes, instructorRes] = await Promise.all([
        supabase.functions.invoke('push-notify', {
          body: { ...pushBody, action: 'send-to-topic', user_type: 'student' },
        }),
        supabase.functions.invoke('push-notify', {
          body: { ...pushBody, action: 'send-to-topic', user_type: 'instructor' },
        }),
      ]);

      const sData = studentRes.data || {};
      const iData = instructorRes.data || {};

      const totalNative = (sData.native?.sent || 0) + (iData.native?.sent || 0);
      const totalWeb = (sData.web?.sent || 0) + (iData.web?.sent || 0);
      const totalSent = totalNative + totalWeb;

      await supabase.from('marketing_push_campaigns').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        stats_sent: totalSent,
      }).eq('id', campaign.id);

      return {
        success: true,
        native: { sent: totalNative },
        web: { sent: totalWeb },
      };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro ao enviar' };
    }
  },

  deletePushCampaign: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_push_campaigns').delete().eq('id', id);
  },

  // --- A/B Tests ---
  getAbTests: async (): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_ab_tests').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  saveAbTest: async (test: any): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_ab_tests').upsert({ ...test, id: test.id || crypto.randomUUID() });
  },

  // --- CRM Integration Config ---
  getCrmIntegrationConfig: async (): Promise<any | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('marketing_crm_integration_config').select('*').limit(1).single();
    return data;
  },

  saveCrmIntegrationConfig: async (config: any): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('marketing_crm_integration_config').upsert(config);
  },

  // --- CRM Sync ---
  getCrmSyncLogs: async (limit: number = 50): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_crm_sync_log').select('*').order('created_at', { ascending: false }).limit(limit);
    return data || [];
  },

  passLeadToCrm: async (leadId: string): Promise<boolean> => {
    if (!isConfigured) return false;
    const [leadRes, configRes] = await Promise.all([
      supabase.from('marketing_leads').select('*').eq('id', leadId).single(),
      supabase.from('marketing_crm_integration_config').select('*').limit(1).single(),
    ]);
    const lead = leadRes.data;
    const config = configRes.data;
    if (!lead || !config) return false;
    const mapping = config.field_mapping || {};
    const dealPayload: any = {
      id: crypto.randomUUID(),
      title: `Lead Marketing: ${lead.name}`,
      contact_name: lead[mapping.name ? 'name' : 'name'] || lead.name,
      company_name: lead.company || '',
      email: lead.email || '',
      phone: lead.phone || '',
      cpf: lead.cpf || '',
      value: 0,
      pipeline: config.target_pipeline || 'Padrão',
      stage: config.target_stage || 'novo_lead',
      source: 'VOLL Marketing',
      campaign: lead.campaign || '',
      status: 'warm',
      product_type: '',
      product_name: '',
      course_city: lead.city || '',
      course_state: lead.state || '',
      owner: config.fixed_owner_id || '',
      tasks: [],
    };
    const { error, data: insertedDeal } = await supabase.from('crm_deals').insert(dealPayload).select().single();
    if (error) { console.error('[Marketing] Erro ao criar deal:', error); return false; }
    await supabase.from('marketing_leads').update({ crm_deal_id: dealPayload.id, lifecycle_stage: 'opportunity' }).eq('id', leadId);
    await supabase.from('marketing_crm_sync_log').insert({ direction: 'marketing_to_crm', lead_id: leadId, deal_id: dealPayload.id, action: 'create_deal', details: dealPayload });
    appBackend.executeMarketingCrmAutomations('deal_created', insertedDeal || dealPayload);
    return true;
  },

  syncCrmEventToLead: async (dealId: string, eventType: string, eventData: any = {}): Promise<void> => {
    if (!isConfigured) return;
    const { data: leads } = await supabase.from('marketing_leads').select('id').eq('crm_deal_id', dealId);
    if (!leads?.length) return;
    for (const lead of leads) {
      await supabase.from('marketing_lead_events').insert({ lead_id: lead.id, event_type: `crm_${eventType}`, event_data: eventData, source: 'crm' });
      if (eventType === 'deal_won') {
        await supabase.from('marketing_leads').update({ lifecycle_stage: 'customer', tags: supabase.rpc ? undefined : undefined }).eq('id', lead.id);
      }
    }
    await supabase.from('marketing_crm_sync_log').insert({ direction: 'crm_to_marketing', lead_id: leads[0].id, deal_id: dealId, action: eventType, details: eventData });
  },

  getLeadTimeline: async (leadId: string): Promise<any[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('marketing_lead_events').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(100);
    return data || [];
  },

  /**
   * Executa automações de marketing que possuem gatilho de evento CRM.
   * Chamado ao criar/atualizar deals no CRM.
   */
  executeMarketingCrmAutomations: async (crmEventType: string, deal: any): Promise<void> => {
    if (!isConfigured) return;
    try {
      const { data: automations } = await supabase
        .from('marketing_automations')
        .select('*')
        .eq('trigger_type', 'crm_event')
        .eq('status', 'active');

      if (!automations || automations.length === 0) return;

      for (const auto of automations) {
        const triggerConfig = auto.trigger_config || {};
        if (triggerConfig.crm_event_type && triggerConfig.crm_event_type !== crmEventType) continue;

        console.log(`[MKT-AUTO] Disparando automação "${auto.name}" para evento "${crmEventType}"`);

        const { data: steps } = await supabase
          .from('marketing_automation_steps')
          .select('*')
          .eq('automation_id', auto.id)
          .order('sort_order');

        if (!steps || steps.length === 0) continue;

        let leadId: string | null = null;
        const { data: linkedLeads } = await supabase.from('marketing_leads').select('id').eq('crm_deal_id', deal.id).limit(1);
        if (linkedLeads && linkedLeads.length > 0) {
          leadId = linkedLeads[0].id;
        } else {
          const newLeadId = crypto.randomUUID();
          const { error: leadErr } = await supabase.from('marketing_leads').insert({
            id: newLeadId,
            email: deal.email || `crm-${deal.id}@placeholder.local`,
            name: deal.company_name || deal.contact_name || deal.title || 'Lead CRM',
            phone: deal.phone || '',
            crm_deal_id: deal.id,
            source: 'crm_automation',
            lifecycle_stage: 'lead',
          });
          if (!leadErr) leadId = newLeadId;
        }

        const executionId = crypto.randomUUID();
        if (leadId) {
          await supabase.from('marketing_automation_executions').insert({
            id: executionId,
            automation_id: auto.id,
            lead_id: leadId,
            current_step_id: steps[0].id,
            status: 'running',
          });
        }

        const clientName = deal.company_name || deal.contact_name || deal.title || 'Cliente';
        const clientEmail = deal.email || '';
        const clientPhone = (deal.phone || deal.contact_phone || deal.cellphone || '').replace(/\D/g, '');
        const productName = deal.product_name || '';

        const replaceVars = (str: string) => {
          if (!str) return '';
          return str
            .replace(/\{\{nome\}\}/gi, () => clientName)
            .replace(/\{\{nome_cliente\}\}/gi, () => clientName)
            .replace(/\{\{email\}\}/gi, () => clientEmail)
            .replace(/\{\{telefone\}\}/gi, () => clientPhone)
            .replace(/\{\{curso\}\}/gi, () => productName)
            .replace(/\{\{produto\}\}/gi, () => productName);
        };

        let completedAll = true;

        for (const step of steps) {
          if (step.step_type === 'trigger') continue;

          try {
            switch (step.action_type) {
              case 'send_whatsapp': {
                if (!clientPhone) {
                  console.warn(`[MKT-AUTO] Sem telefone para enviar WhatsApp na automação "${auto.name}"`);
                  break;
                }
                const message = replaceVars(step.config?.message || '');
                if (!message) break;
                await whatsappService.sendTextMessage(
                  { wa_id: clientPhone, contact_phone: clientPhone },
                  message
                );
                await appBackend.logWAAutomation({
                  ruleName: `MKT: ${auto.name}`,
                  studentName: clientName,
                  phone: clientPhone,
                  message,
                });
                console.log(`[MKT-AUTO] WhatsApp enviado para ${clientName} (${clientPhone})`);
                break;
              }
              case 'send_email': {
                if (!clientEmail) break;
                let subject = replaceVars(step.config?.subject || '');
                let body = replaceVars(step.config?.body || '');

                if ((!subject || !body) && step.config?.template_id) {
                  const { data: tpl } = await supabase
                    .from('marketing_email_templates')
                    .select('subject, html_content')
                    .eq('id', step.config.template_id)
                    .single();
                  if (tpl) {
                    if (!subject) subject = replaceVars(tpl.subject || '');
                    if (!body) body = replaceVars(tpl.html_content || '');
                  }
                }

                if (!subject) subject = step.config?.template_name || 'Notificação VOLL';

                if (subject && body) {
                  await appBackend.sendEmailViaSendGrid(clientEmail, subject, body);
                  console.log(`[MKT-AUTO] Email enviado para ${clientEmail}`);
                } else {
                  console.warn(`[MKT-AUTO] Email sem conteúdo para automação "${auto.name}" (subject="${subject}", body vazio=${!body})`);
                }
                break;
              }
              case 'send_sms': {
                if (!clientPhone) {
                  console.warn(`[MKT-AUTO] Sem telefone para enviar SMS na automação "${auto.name}"`);
                  break;
                }
                const smsMessage = replaceVars(step.config?.message || '');
                if (!smsMessage) break;
                const emailConfig = await appBackend.getEmailConfig();
                if (emailConfig?.apiKey) {
                  const smsResult = await brevoService.sendSms(emailConfig.apiKey, {
                    to: clientPhone.startsWith('+') ? clientPhone : `+55${clientPhone}`,
                    content: smsMessage,
                    sender: step.config?.sender || 'VOLL',
                  });
                  if (smsResult.success) {
                    console.log(`[MKT-AUTO] SMS enviado para ${clientPhone}`);
                  } else {
                    console.error(`[MKT-AUTO] Falha ao enviar SMS: ${smsResult.error}`);
                  }
                } else {
                  console.warn('[MKT-AUTO] Brevo API key não configurada para SMS');
                }
                break;
              }
              case 'wait_time': {
                const d = parseInt(step.config?.days) || 0;
                const h = parseInt(step.config?.hours) || 0;
                const m = parseInt(step.config?.minutes) || 0;
                const ms = ((d * 1440) + (h * 60) + m) * 60000;
                if (ms > 0) {
                  console.log(`[MKT-AUTO] Aguardando ${m}min ${h}h ${d}d...`);
                  await new Promise(resolve => setTimeout(resolve, ms));
                }
                break;
              }
              case 'add_tag':
              case 'remove_tag':
              case 'update_field':
              case 'send_notification':
                console.log(`[MKT-AUTO] Ação "${step.action_type}" registrada (sem efeito colateral direto no deal).`);
                break;
              default:
                console.log(`[MKT-AUTO] Tipo de ação desconhecido: "${step.action_type}"`);
            }

            if (leadId) {
              await supabase.from('marketing_automation_logs').insert({
                execution_id: executionId,
                step_id: step.id,
                action: step.action_type,
                details: { deal_id: deal.id, client: clientName },
                status: 'success',
              });
            }
          } catch (stepErr: any) {
            console.error(`[MKT-AUTO] Erro no passo "${step.action_type}":`, stepErr);
            completedAll = false;
            if (leadId) {
              await supabase.from('marketing_automation_logs').insert({
                execution_id: executionId,
                step_id: step.id,
                action: step.action_type,
                details: { error: stepErr.message, deal_id: deal.id },
                status: 'error',
              });
            }
          }
        }

        if (leadId) {
          await supabase.from('marketing_automation_executions').update({
            status: completedAll ? 'completed' : 'failed',
            completed_at: new Date().toISOString(),
          }).eq('id', executionId);
        }

        await supabase.from('marketing_automations').update({
          stats_entered: (auto.stats_entered || 0) + 1,
          stats_completed: completedAll ? (auto.stats_completed || 0) + 1 : (auto.stats_completed || 0),
        }).eq('id', auto.id);
      }
    } catch (err) {
      console.error('[MKT-AUTO] Erro fatal ao executar automações de marketing CRM:', err);
    }
  },

  // ── Franchise Meeting Scheduling ────────────────────────────

  getFranchiseMeetingAvailability: async (): Promise<FranchiseMeetingAvailability[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('franchise_meeting_availability').select('*').order('day_of_week');
    if (error) throw error;
    return data || [];
  },

  saveFranchiseMeetingAvailability: async (items: FranchiseMeetingAvailability[]): Promise<void> => {
    if (!isConfigured) return;
    for (const item of items) {
      await supabase.from('franchise_meeting_availability').upsert({
        id: item.id,
        day_of_week: item.day_of_week,
        start_time: item.start_time,
        end_time: item.end_time,
        slot_duration_minutes: item.slot_duration_minutes,
        is_active: item.is_active,
        updated_at: new Date().toISOString(),
      });
    }
  },

  getFranchiseMeetingBlockedDates: async (): Promise<FranchiseMeetingBlockedDate[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('franchise_meeting_blocked_dates').select('*').order('blocked_date');
    return data || [];
  },

  addFranchiseMeetingBlockedDate: async (date: string, reason: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('franchise_meeting_blocked_dates').upsert({ blocked_date: date, reason }, { onConflict: 'blocked_date' });
  },

  removeFranchiseMeetingBlockedDate: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('franchise_meeting_blocked_dates').delete().eq('id', id);
  },

  getFranchiseMeetingSettings: async (): Promise<FranchiseMeetingSettings> => {
    const defaults: FranchiseMeetingSettings = { advance_days: 30, max_bookings_per_student: 1, admin_email: '', admin_phone: '', meeting_title: 'Reunião Franquia VOLL Studios', meeting_description: 'Reunião de apresentação da Franquia VOLL Studios', brevo_api_key: '', brevo_sender_email: '', brevo_sender_name: '' };
    if (!isConfigured) return defaults;
    const { data } = await supabase.from('crm_settings').select('value').eq('key', 'franchise_meeting_config').maybeSingle();
    if (data?.value) {
      try { return { ...defaults, ...JSON.parse(data.value) }; } catch { return defaults; }
    }
    return defaults;
  },

  saveFranchiseMeetingSettings: async (settings: FranchiseMeetingSettings): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_settings').upsert({ key: 'franchise_meeting_config', value: JSON.stringify(settings) }, { onConflict: 'key' });
  },

  getFranchiseMeetingBookings: async (filters?: { status?: string; from?: string; to?: string }): Promise<FranchiseMeetingBooking[]> => {
    if (!isConfigured) return [];
    let query = supabase.from('franchise_meeting_bookings').select('*').order('meeting_start', { ascending: false });
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.from) query = query.gte('meeting_date', filters.from);
    if (filters?.to) query = query.lte('meeting_date', filters.to);
    const { data } = await query;
    return data || [];
  },

  getStudentFranchiseMeetings: async (cpf: string): Promise<FranchiseMeetingBooking[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('franchise_meeting_bookings').select('*').eq('student_cpf', cpf.replace(/\D/g, '')).order('meeting_start', { ascending: false });
    return data || [];
  },

  bookFranchiseMeeting: async (payload: {
    student_cpf: string; student_name: string; student_email: string; student_phone: string;
    meeting_date: string; start_time: string; end_time: string;
  }): Promise<{ booking: FranchiseMeetingBooking; meet_link: string; google_configured: boolean; google_error?: string }> => {
    if (!isConfigured) throw new Error('Backend não configurado');
    const { data, error } = await supabase.functions.invoke('google-meet', {
      body: { action: 'create-meeting', ...payload },
    });
    if (error) {
      // Extract real error message from Edge Function response
      try {
        const body = typeof error === 'object' && 'context' in error ? await (error as any).context?.json?.() : null;
        if (body?.error) throw new Error(body.error);
      } catch (parseErr: any) {
        if (parseErr.message && parseErr.message !== error.message) throw parseErr;
      }
      throw new Error(data?.error || error.message || 'Erro ao agendar reunião.');
    }
    if (data?.error) throw new Error(data.error);
    return data;
  },

  cancelFranchiseMeeting: async (bookingId: string): Promise<void> => {
    if (!isConfigured) return;
    const { data, error } = await supabase.functions.invoke('google-meet', {
      body: { action: 'cancel-meeting', booking_id: bookingId },
    });
    if (error) {
      try {
        const body = typeof error === 'object' && 'context' in error ? await (error as any).context?.json?.() : null;
        if (body?.error) throw new Error(body.error);
      } catch (parseErr: any) {
        if (parseErr.message && parseErr.message !== error.message) throw parseErr;
      }
      throw new Error(data?.error || error.message || 'Erro ao cancelar reunião.');
    }
    if (data?.error) throw new Error(data.error);
  },

  updateFranchiseMeetingBooking: async (id: string, updates: Partial<FranchiseMeetingBooking>): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('franchise_meeting_bookings').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
  },

  // ── Apostila Digital ─────────────────────────────────────────

  getApostilas: async (onlyActive?: boolean): Promise<Apostila[]> => {
    if (!isConfigured) return [];
    let q = supabase.from('crm_apostilas').select('*').order('created_at', { ascending: false });
    if (onlyActive) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) console.error('[Apostila] Erro ao buscar apostilas:', error);
    return (data || []) as Apostila[];
  },

  getApostilaAnnotations: async (apostilaId: string, studentCpf: string): Promise<ApostilaAnnotation[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase
      .from('crm_apostila_annotations')
      .select('*')
      .eq('apostila_id', apostilaId)
      .eq('student_cpf', studentCpf)
      .order('page_number');
    if (error) console.error('[Apostila] Erro ao buscar anotações:', error);
    return (data || []) as ApostilaAnnotation[];
  },

  saveApostilaAnnotation: async (annotation: {
    apostila_id: string;
    student_cpf: string;
    page_number: number;
    fabric_json: any;
    bookmarked?: boolean;
  }): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_apostila_annotations').upsert({
      apostila_id: annotation.apostila_id,
      student_cpf: annotation.student_cpf,
      page_number: annotation.page_number,
      fabric_json: annotation.fabric_json,
      bookmarked: annotation.bookmarked ?? false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'apostila_id,student_cpf,page_number' });
    if (error) console.error('[Apostila] Erro ao salvar anotação:', error);
  },

  toggleApostilaBookmark: async (apostilaId: string, studentCpf: string, pageNumber: number, bookmarked: boolean): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_apostila_annotations').upsert({
      apostila_id: apostilaId,
      student_cpf: studentCpf,
      page_number: pageNumber,
      bookmarked,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'apostila_id,student_cpf,page_number' });
    if (error) console.error('[Apostila] Erro ao alternar favorito:', error);
  },

  getApostilaProgress: async (apostilaId: string, studentCpf: string): Promise<ApostilaProgress | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase
      .from('crm_apostila_progress')
      .select('*')
      .eq('apostila_id', apostilaId)
      .eq('student_cpf', studentCpf)
      .maybeSingle();
    return data as ApostilaProgress | null;
  },

  saveApostilaProgress: async (progress: {
    apostila_id: string;
    student_cpf: string;
    last_page: number;
    pages_visited: number[];
  }): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_apostila_progress').upsert({
      apostila_id: progress.apostila_id,
      student_cpf: progress.student_cpf,
      last_page: progress.last_page,
      pages_visited: progress.pages_visited,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'apostila_id,student_cpf' });
    if (error) console.error('[Apostila] Erro ao salvar progresso:', error);
  },

  uploadApostilaPdf: async (file: File): Promise<string> => {
    if (!isConfigured) throw new Error('Supabase não configurado.');
    const ext = file.name.split('.').pop() || 'pdf';
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('apostilas').upload(path, file, {
      contentType: 'application/pdf',
      upsert: false,
    });
    if (error) throw new Error(`Erro no upload: ${error.message}`);
    const { data: urlData } = supabase.storage.from('apostilas').getPublicUrl(path);
    return urlData.publicUrl;
  },

  deleteApostilaPdf: async (pdfUrl: string): Promise<void> => {
    if (!isConfigured) return;
    try {
      const url = new URL(pdfUrl);
      const parts = url.pathname.split('/apostilas/');
      if (parts.length > 1) {
        await supabase.storage.from('apostilas').remove([parts[1]]);
      }
    } catch { /* ignore cleanup errors */ }
  },

  upsertApostila: async (apostila: Partial<Apostila> & { title: string; pdf_url: string }): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_apostilas').upsert({
      id: apostila.id || crypto.randomUUID(),
      title: apostila.title,
      description: apostila.description || '',
      pdf_url: apostila.pdf_url,
      total_pages: apostila.total_pages || 0,
      course_id: apostila.course_id || null,
      is_active: apostila.is_active ?? true,
    });
    if (error) throw new Error(`Erro ao salvar apostila: ${error.message}`);
  },

  deleteApostila: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { data: apostila } = await supabase.from('crm_apostilas').select('pdf_url').eq('id', id).maybeSingle();
    await supabase.from('crm_apostila_annotations').delete().eq('apostila_id', id);
    await supabase.from('crm_apostila_progress').delete().eq('apostila_id', id);
    const { error } = await supabase.from('crm_apostilas').delete().eq('id', id);
    if (error) console.error('[Apostila] Erro ao excluir apostila:', error);
    if (apostila?.pdf_url) await appBackend.deleteApostilaPdf(apostila.pdf_url);
  },

  toggleApostilaActive: async (id: string, isActive: boolean): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('crm_apostilas').update({ is_active: isActive }).eq('id', id);
  },

  getApostilaAccessList: async (): Promise<{ student_cpf: string; student_name: string; granted_at: string }[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_apostila_access').select('*').order('student_name');
    return (data || []) as any[];
  },

  checkApostilaAccess: async (studentCpf: string): Promise<boolean> => {
    if (!isConfigured) return false;
    const clean = studentCpf.replace(/\D/g, '');
    const { data } = await supabase.from('crm_apostila_access').select('id').eq('student_cpf', clean).maybeSingle();
    return !!data;
  },

  grantApostilaAccess: async (studentCpf: string, studentName: string): Promise<void> => {
    if (!isConfigured) return;
    const clean = studentCpf.replace(/\D/g, '');
    await supabase.from('crm_apostila_access').upsert({ student_cpf: clean, student_name: studentName, granted_at: new Date().toISOString() }, { onConflict: 'student_cpf' });
  },

  revokeApostilaAccess: async (studentCpf: string): Promise<void> => {
    if (!isConfigured) return;
    const clean = studentCpf.replace(/\D/g, '');
    await supabase.from('crm_apostila_access').delete().eq('student_cpf', clean);
  },

  // ── Fechamento de Curso ─────────────────────────────────────

  uploadClosingReceipt: async (file: File): Promise<string> => {
    if (!isConfigured) throw new Error('Supabase não configurado.');
    const ext = file.name.split('.').pop() || 'pdf';
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('course-closings').upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (error) throw new Error(`Erro no upload: ${error.message}`);
    const { data: urlData } = supabase.storage.from('course-closings').getPublicUrl(path);
    return urlData.publicUrl;
  },

  submitCourseClosing: async (
    closing: Omit<CourseClosing, 'id' | 'created_at' | 'updated_at' | 'expenses'>,
    expenses: Omit<CourseClosingExpense, 'id' | 'closing_id' | 'created_at'>[]
  ): Promise<string> => {
    if (!isConfigured) throw new Error('Supabase não configurado.');
    const closingId = crypto.randomUUID();
    const { error: cErr } = await supabase.from('crm_course_closings').insert({
      id: closingId,
      ...closing,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (cErr) throw new Error(`Erro ao salvar fechamento: ${cErr.message}`);

    if (expenses.length > 0) {
      const rows = expenses.map(e => ({
        id: crypto.randomUUID(),
        closing_id: closingId,
        category: e.category,
        amount: e.amount,
        receipt_url: e.receipt_url,
        observation: e.observation,
        created_at: new Date().toISOString(),
      }));
      const { error: eErr } = await supabase.from('crm_course_closing_expenses').insert(rows);
      if (eErr) throw new Error(`Erro ao salvar despesas: ${eErr.message}`);
    }
    return closingId;
  },

  fetchCourseClosings: async (): Promise<CourseClosing[]> => {
    if (!isConfigured) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase
      .from('crm_course_closings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Erro ao buscar fechamentos: ${error.message}`);
    return data || [];
  },

  fetchCourseClosingExpenses: async (closingId: string): Promise<CourseClosingExpense[]> => {
    if (!isConfigured) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase
      .from('crm_course_closing_expenses')
      .select('*')
      .eq('closing_id', closingId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Erro ao buscar despesas: ${error.message}`);
    return data || [];
  },

  fetchInstructorClosings: async (instructorId: string): Promise<CourseClosing[]> => {
    if (!isConfigured) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase
      .from('crm_course_closings')
      .select('*')
      .eq('instructor_id', instructorId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Erro ao buscar fechamentos do instrutor: ${error.message}`);
    return data || [];
  },

  updateCourseClosingStatus: async (id: string, status: string, adminNotes: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_course_closings').update({
      status,
      admin_notes: adminNotes,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw new Error(`Erro ao atualizar status: ${error.message}`);
  },

  updateCourseClosing: async (
    id: string,
    closing: Partial<Omit<CourseClosing, 'id' | 'created_at' | 'expenses'>>,
    expenses: Omit<CourseClosingExpense, 'id' | 'closing_id' | 'created_at'>[]
  ): Promise<void> => {
    if (!isConfigured) throw new Error('Supabase não configurado.');

    // Salvar snapshot do estado atual no histórico antes de atualizar
    const { data: currentClosing } = await supabase
      .from('crm_course_closings').select('*').eq('id', id).single();
    const { data: currentExpenses } = await supabase
      .from('crm_course_closing_expenses').select('*').eq('closing_id', id).order('created_at');

    if (currentClosing) {
      const { count } = await supabase
        .from('crm_course_closing_history')
        .select('*', { count: 'exact', head: true })
        .eq('closing_id', id);
      const version = (count || 0) + 1;

      await supabase.from('crm_course_closing_history').insert({
        id: crypto.randomUUID(),
        closing_id: id,
        version,
        snapshot: currentClosing,
        expenses_snapshot: currentExpenses || [],
        edited_at: new Date().toISOString(),
        reason: currentClosing.admin_notes || 'Edição pelo instrutor',
      });
    }

    const { error: cErr } = await supabase.from('crm_course_closings').update({
      ...closing,
      status: 'pendente',
      admin_notes: '',
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (cErr) throw new Error(`Erro ao atualizar fechamento: ${cErr.message}`);

    await supabase.from('crm_course_closing_expenses').delete().eq('closing_id', id);

    if (expenses.length > 0) {
      const rows = expenses.map(e => ({
        id: crypto.randomUUID(),
        closing_id: id,
        category: e.category,
        amount: e.amount,
        receipt_url: e.receipt_url,
        observation: e.observation,
        created_at: new Date().toISOString(),
      }));
      const { error: eErr } = await supabase.from('crm_course_closing_expenses').insert(rows);
      if (eErr) throw new Error(`Erro ao salvar despesas: ${eErr.message}`);
    }
  },

  fetchCourseClosingHistory: async (closingId: string): Promise<CourseClosingHistory[]> => {
    if (!isConfigured) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase
      .from('crm_course_closing_history')
      .select('*')
      .eq('closing_id', closingId)
      .order('version', { ascending: false });
    if (error) throw new Error(`Erro ao buscar histórico: ${error.message}`);
    return data || [];
  },

  // ── Aluguel de Curso ─────────────────────────────────────

  uploadRentalReceipt: async (file: File): Promise<string> => {
    if (!isConfigured) throw new Error('Supabase não configurado.');
    const ext = file.name.split('.').pop() || 'pdf';
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('course-rentals').upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (error) throw new Error(`Erro no upload: ${error.message}`);
    const { data: urlData } = supabase.storage.from('course-rentals').getPublicUrl(path);
    return urlData.publicUrl;
  },

  submitCourseRental: async (
    rental: Omit<CourseRental, 'id' | 'created_at' | 'updated_at' | 'receipts'>,
    receiptUrls: string[]
  ): Promise<string> => {
    if (!isConfigured) throw new Error('Supabase não configurado.');
    const rentalId = crypto.randomUUID();
    const { error: rErr } = await supabase.from('crm_course_rentals').insert({
      id: rentalId,
      ...rental,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (rErr) throw new Error(`Erro ao salvar aluguel: ${rErr.message}`);

    if (receiptUrls.length > 0) {
      const rows = receiptUrls.map(url => ({
        id: crypto.randomUUID(),
        rental_id: rentalId,
        receipt_url: url,
        created_at: new Date().toISOString(),
      }));
      const { error: rcErr } = await supabase.from('crm_course_rental_receipts').insert(rows);
      if (rcErr) throw new Error(`Erro ao salvar comprovantes: ${rcErr.message}`);
    }
    return rentalId;
  },

  fetchCourseRentals: async (): Promise<CourseRental[]> => {
    if (!isConfigured) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase
      .from('crm_course_rentals')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Erro ao buscar aluguéis: ${error.message}`);
    return data || [];
  },

  fetchCourseRentalReceipts: async (rentalId: string): Promise<CourseRentalReceipt[]> => {
    if (!isConfigured) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase
      .from('crm_course_rental_receipts')
      .select('*')
      .eq('rental_id', rentalId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Erro ao buscar comprovantes: ${error.message}`);
    return data || [];
  },

  fetchStudioRentals: async (studioId: string): Promise<CourseRental[]> => {
    if (!isConfigured) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase
      .from('crm_course_rentals')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Erro ao buscar aluguéis do studio: ${error.message}`);
    return data || [];
  },

  updateCourseRentalStatus: async (id: string, status: string, adminNotes: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_course_rentals').update({
      status,
      admin_notes: adminNotes,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw new Error(`Erro ao atualizar status: ${error.message}`);
  },

  // ── Gamificação (VOLLs) ───────────────────────────────────

  getGamificationSettings: async (): Promise<GamificationSetting[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('gamification_settings').select('*');
    if (error) { console.error('getGamificationSettings error:', error); return []; }
    return data || [];
  },

  getGamificationSettingValue: async (key: string): Promise<any> => {
    if (!isConfigured) return null;
    const { data, error } = await supabase.from('gamification_settings').select('value').eq('key', key).maybeSingle();
    if (error) { console.error('getGamificationSettingValue error:', error); return null; }
    return data?.value ?? null;
  },

  saveGamificationSetting: async (key: string, value: any): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('gamification_settings').upsert({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() }, { onConflict: 'key' }).throwOnError();
  },

  getGamificationLevels: async (): Promise<GamificationLevel[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('gamification_levels').select('*').order('level_number');
    if (error) { console.error('getGamificationLevels error:', error); return []; }
    return data || [];
  },

  saveGamificationLevel: async (level: Partial<GamificationLevel>): Promise<void> => {
    if (!isConfigured) return;
    const cleanLevel = { ...level };
    delete (cleanLevel as any).created_at;
    if (!cleanLevel.id) delete (cleanLevel as any).id;
    if (cleanLevel.id) {
      await supabase.from('gamification_levels').update(cleanLevel).eq('id', cleanLevel.id).throwOnError();
    } else {
      await supabase.from('gamification_levels').insert([cleanLevel]).throwOnError();
    }
  },

  deleteGamificationLevel: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('gamification_levels').delete().eq('id', id).throwOnError();
  },

  getGamificationPointRules: async (): Promise<GamificationPointRule[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('gamification_point_rules').select('*').order('action_type');
    if (error) { console.error('getGamificationPointRules error:', error); return []; }
    return data || [];
  },

  saveGamificationPointRule: async (rule: Partial<GamificationPointRule>): Promise<void> => {
    if (!isConfigured) return;
    const clean = { ...rule };
    delete (clean as any).created_at;
    if (!clean.id) delete (clean as any).id;
    if (clean.id) {
      await supabase.from('gamification_point_rules').update(clean).eq('id', clean.id).throwOnError();
    } else {
      await supabase.from('gamification_point_rules').insert([clean]).throwOnError();
    }
  },

  deleteGamificationPointRule: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('gamification_point_rules').delete().eq('id', id).throwOnError();
  },

  getGamificationBadges: async (): Promise<GamificationBadge[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('gamification_badges').select('*').order('sort_order');
    if (error) { console.error('getGamificationBadges error:', error); return []; }
    return data || [];
  },

  saveGamificationBadge: async (badge: Partial<GamificationBadge>): Promise<void> => {
    if (!isConfigured) return;
    const clean = { ...badge };
    delete (clean as any).created_at;
    if (!clean.id) delete (clean as any).id;
    if (clean.id) {
      await supabase.from('gamification_badges').update(clean).eq('id', clean.id).throwOnError();
    } else {
      await supabase.from('gamification_badges').insert([clean]).throwOnError();
    }
  },

  deleteGamificationBadge: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('gamification_badges').delete().eq('id', id).throwOnError();
  },

  getGamificationChallenges: async (): Promise<GamificationChallenge[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('gamification_challenges').select('*').order('sort_order');
    if (error) { console.error('getGamificationChallenges error:', error); return []; }
    return data || [];
  },

  saveGamificationChallenge: async (challenge: Partial<GamificationChallenge>): Promise<void> => {
    if (!isConfigured) return;
    const clean = { ...challenge };
    delete (clean as any).created_at;
    if (!clean.id) delete (clean as any).id;
    if (clean.id) {
      await supabase.from('gamification_challenges').update(clean).eq('id', clean.id).throwOnError();
    } else {
      await supabase.from('gamification_challenges').insert([clean]).throwOnError();
    }
  },

  deleteGamificationChallenge: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('gamification_challenges').delete().eq('id', id).throwOnError();
  },

  getGamificationRewards: async (): Promise<GamificationReward[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('gamification_rewards').select('*').order('sort_order');
    if (error) { console.error('getGamificationRewards error:', error); return []; }
    return data || [];
  },

  saveGamificationReward: async (reward: Partial<GamificationReward>): Promise<void> => {
    if (!isConfigured) return;
    const clean = { ...reward };
    delete (clean as any).created_at;
    if (!clean.id) delete (clean as any).id;
    if (clean.id) {
      await supabase.from('gamification_rewards').update(clean).eq('id', clean.id).throwOnError();
    } else {
      await supabase.from('gamification_rewards').insert([clean]).throwOnError();
    }
  },

  deleteGamificationReward: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('gamification_rewards').delete().eq('id', id).throwOnError();
  },

  getGamificationNotificationSettings: async (): Promise<GamificationNotificationSetting[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('gamification_notification_settings').select('*').order('notification_type');
    if (error) { console.error('getGamificationNotificationSettings error:', error); return []; }
    return data || [];
  },

  saveGamificationNotificationSetting: async (setting: Partial<GamificationNotificationSetting>): Promise<void> => {
    if (!isConfigured) return;
    if (setting.id) {
      await supabase.from('gamification_notification_settings').update({ ...setting, updated_at: new Date().toISOString() }).eq('id', setting.id);
    }
  },

  // ── Gamificação – Motor (Aluno) ───────────────────────────

  getStudentVollsBalance: async (studentCpf: string): Promise<number> => {
    if (!isConfigured) return 0;
    const { data } = await supabase.from('gamification_student_points').select('volls').eq('student_cpf', studentCpf);
    return (data || []).reduce((sum: number, r: any) => sum + (r.volls || 0), 0);
  },

  getStudentVolls: async (studentCpf: string): Promise<{ balance: number; level: GamificationLevel | null }> => {
    if (!isConfigured) return { balance: 0, level: null };
    const [balRes, levelsRes] = await Promise.all([
      supabase.from('gamification_student_points').select('volls').eq('student_cpf', studentCpf),
      supabase.from('gamification_levels').select('*').order('level_number'),
    ]);
    const balance = (balRes.data || []).reduce((sum: number, r: any) => sum + (r.volls || 0), 0);
    const levels = levelsRes.data || [];
    const level = levels.filter((l: any) => balance >= l.min_volls && balance <= l.max_volls)[0] || levels[0] || null;
    return { balance, level };
  },

  getStudentBadges: async (studentCpf: string): Promise<GamificationStudentBadge[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('gamification_student_badges').select('*, gamification_badges(*)').eq('student_cpf', studentCpf).order('earned_at', { ascending: false });
    return data || [];
  },

  getStudentStreak: async (studentCpf: string): Promise<GamificationStreak | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('gamification_streaks').select('*').eq('student_cpf', studentCpf).maybeSingle();
    return data;
  },

  updateStreak: async (studentCpf: string): Promise<GamificationStreak> => {
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase.from('gamification_streaks').select('*').eq('student_cpf', studentCpf).maybeSingle();

    if (!existing) {
      const newStreak = { student_cpf: studentCpf, current_streak: 1, longest_streak: 1, last_activity_date: today, streak_started_at: today };
      const { data } = await supabase.from('gamification_streaks').insert([newStreak]).select().single();
      return data;
    }

    if (existing.last_activity_date === today) return existing;

    const lastDate = new Date(existing.last_activity_date);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    let newCurrent = 1;
    let newStarted = today;
    if (diffDays === 1) {
      newCurrent = existing.current_streak + 1;
      newStarted = existing.streak_started_at;
    }

    const newLongest = Math.max(existing.longest_streak, newCurrent);
    const { data } = await supabase.from('gamification_streaks').update({
      current_streak: newCurrent,
      longest_streak: newLongest,
      last_activity_date: today,
      streak_started_at: newStarted,
    }).eq('id', existing.id).select().single();
    return data;
  },

  awardVolls: async (studentCpf: string, actionType: string, referenceId?: string, referenceType?: string): Promise<GamificationAwardResult> => {
    const fail: GamificationAwardResult = { success: false, volls_gained: 0, new_balance: 0 };
    if (!isConfigured) return fail;

    const enabled = await appBackend.getGamificationSettingValue('gamification_enabled');
    if (enabled === false) return fail;

    const { data: rule } = await supabase.from('gamification_point_rules').select('*').eq('action_type', actionType).eq('is_active', true).maybeSingle();
    if (!rule) return fail;

    if (rule.max_per_day) {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const { data: todayPoints } = await supabase.from('gamification_student_points')
        .select('volls').eq('student_cpf', studentCpf).eq('action_type', actionType)
        .gte('earned_at', todayStart.toISOString());
      const todayTotal = (todayPoints || []).reduce((s: number, r: any) => s + r.volls, 0);
      if (todayTotal >= rule.max_per_day) return fail;
    }

    const dailyCap = await appBackend.getGamificationSettingValue('daily_volls_cap');
    if (dailyCap) {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const { data: allToday } = await supabase.from('gamification_student_points')
        .select('volls').eq('student_cpf', studentCpf)
        .gte('earned_at', todayStart.toISOString());
      const allTodayTotal = (allToday || []).reduce((s: number, r: any) => s + Math.max(0, r.volls), 0);
      if (allTodayTotal >= dailyCap) return fail;
    }

    const [levelsRes] = await Promise.all([
      supabase.from('gamification_levels').select('*').order('level_number'),
    ]);
    const levels = levelsRes.data || [];
    const oldBalance = await appBackend.getStudentVollsBalance(studentCpf);
    const oldLevel = levels.filter((l: any) => oldBalance >= l.min_volls && oldBalance <= l.max_volls)[0] || null;

    await supabase.from('gamification_student_points').insert([{
      student_cpf: studentCpf, rule_id: rule.id, action_type: actionType,
      volls: rule.volls, reference_id: referenceId || null, reference_type: referenceType || null,
      description: rule.description,
    }]);

    const newBalance = oldBalance + rule.volls;
    const newLevel = levels.filter((l: any) => newBalance >= l.min_volls && newBalance <= l.max_volls)[0] || null;
    const levelUp = oldLevel && newLevel && oldLevel.level_number < newLevel.level_number ? { old_level: oldLevel, new_level: newLevel } : null;

    const badgeResult = await appBackend.checkAndAwardBadges(studentCpf);

    return {
      success: true,
      volls_gained: rule.volls,
      new_balance: newBalance,
      new_badge: badgeResult,
      level_up: levelUp,
    };
  },

  checkAndAwardBadges: async (studentCpf: string): Promise<GamificationBadge | null> => {
    if (!isConfigured) return null;

    const [badgesRes, earnedRes, pointsRes, streakRes] = await Promise.all([
      supabase.from('gamification_badges').select('*').eq('is_active', true).eq('criteria_type', 'auto'),
      supabase.from('gamification_student_badges').select('badge_id').eq('student_cpf', studentCpf),
      supabase.from('gamification_student_points').select('action_type, volls').eq('student_cpf', studentCpf),
      supabase.from('gamification_streaks').select('*').eq('student_cpf', studentCpf).maybeSingle(),
    ]);

    const allBadges = badgesRes.data || [];
    const earnedIds = new Set((earnedRes.data || []).map((b: any) => b.badge_id));
    const points = pointsRes.data || [];
    const streak = streakRes.data;

    const actionCounts: Record<string, number> = {};
    let totalVolls = 0;
    for (const p of points) {
      actionCounts[p.action_type] = (actionCounts[p.action_type] || 0) + 1;
      totalVolls += Math.max(0, p.volls);
    }

    let newBadge: GamificationBadge | null = null;

    for (const badge of allBadges) {
      if (earnedIds.has(badge.id)) continue;
      const cfg = badge.criteria_config as any;
      if (!cfg?.action || !cfg?.count) continue;

      let met = false;
      if (cfg.action === 'streak') {
        met = (streak?.current_streak || 0) >= cfg.count;
      } else if (cfg.action === 'total_volls') {
        met = totalVolls >= cfg.count;
      } else if (cfg.action === 'reward_claimed') {
        const { count: claimCount } = await supabase.from('gamification_reward_claims').select('id', { count: 'exact', head: true }).eq('student_cpf', studentCpf);
        met = (claimCount || 0) >= cfg.count;
      } else {
        met = (actionCounts[cfg.action] || 0) >= cfg.count;
      }

      if (met) {
        await supabase.from('gamification_student_badges').upsert({ student_cpf: studentCpf, badge_id: badge.id }, { onConflict: 'student_cpf,badge_id', ignoreDuplicates: true });
        if (!newBadge) newBadge = badge;
      }
    }

    return newBadge;
  },

  grantBadgeManually: async (studentCpf: string, badgeId: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('gamification_student_badges').upsert({ student_cpf: studentCpf, badge_id: badgeId }, { onConflict: 'student_cpf,badge_id', ignoreDuplicates: true });
  },

  adjustStudentVolls: async (studentCpf: string, volls: number, description: string): Promise<void> => {
    if (!isConfigured) return;
    await supabase.from('gamification_student_points').insert([{
      student_cpf: studentCpf, action_type: 'admin_adjustment', volls, description,
    }]);
  },

  getLeaderboard: async (period?: 'weekly' | 'monthly' | 'all', limit: number = 20): Promise<GamificationLeaderboardEntry[]> => {
    if (!isConfigured) return [];

    let query = supabase.from('gamification_student_points').select('student_cpf, volls, earned_at');
    if (period === 'weekly') {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte('earned_at', weekAgo.toISOString());
    } else if (period === 'monthly') {
      const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
      query = query.gte('earned_at', monthAgo.toISOString());
    }

    const { data: pointsData } = await query;
    const cpfTotals: Record<string, number> = {};
    for (const p of (pointsData || [])) {
      cpfTotals[p.student_cpf] = (cpfTotals[p.student_cpf] || 0) + (p.volls || 0);
    }

    const sorted = Object.entries(cpfTotals).sort((a, b) => b[1] - a[1]).slice(0, limit);
    const cpfs = sorted.map(s => s[0]);
    if (!cpfs.length) return [];

    const [alunosRes, levelsRes, badgesRes] = await Promise.all([
      supabase.from('crm_alunos').select('cpf, full_name').in('cpf', cpfs),
      supabase.from('gamification_levels').select('*').order('level_number'),
      supabase.from('gamification_student_badges').select('student_cpf').in('student_cpf', cpfs),
    ]);

    const nameMap: Record<string, string> = {};
    for (const a of (alunosRes.data || [])) nameMap[a.cpf] = a.full_name;

    const levels = levelsRes.data || [];
    const badgeCounts: Record<string, number> = {};
    for (const b of (badgesRes.data || [])) badgeCounts[b.student_cpf] = (badgeCounts[b.student_cpf] || 0) + 1;

    return sorted.map(([cpf, total], i) => ({
      student_cpf: cpf,
      student_name: nameMap[cpf] || cpf,
      total_volls: total,
      level: levels.filter(l => total >= l.min_volls && total <= l.max_volls)[0] || null,
      badges_count: badgeCounts[cpf] || 0,
      position: i + 1,
    }));
  },

  getActiveChallenges: async (studentCpf: string): Promise<(GamificationChallengeProgress & { gamification_challenges: GamificationChallenge })[]> => {
    if (!isConfigured) return [];
    const { data: challenges } = await supabase.from('gamification_challenges').select('*').eq('is_active', true);
    if (!challenges?.length) return [];

    const challengeIds = challenges.map(c => c.id);
    const { data: progress } = await supabase.from('gamification_challenge_progress').select('*').eq('student_cpf', studentCpf).in('challenge_id', challengeIds);
    const progressMap: Record<string, any> = {};
    for (const p of (progress || [])) progressMap[p.challenge_id] = p;

    return challenges.map(ch => {
      const p = progressMap[ch.id];
      const target = (ch.criteria_config as any)?.count || 1;
      return {
        id: p?.id || '',
        student_cpf: studentCpf,
        challenge_id: ch.id,
        current_progress: p?.current_progress || 0,
        target_progress: target,
        completed_at: p?.completed_at || null,
        claimed: p?.claimed || false,
        gamification_challenges: ch,
      };
    });
  },

  updateChallengeProgress: async (studentCpf: string, actionType: string): Promise<void> => {
    if (!isConfigured) return;
    const { data: challenges } = await supabase.from('gamification_challenges').select('*').eq('is_active', true);
    if (!challenges?.length) return;

    for (const ch of challenges) {
      const cfg = ch.criteria_config as any;
      if (cfg?.action !== actionType) continue;

      const target = cfg.count || 1;
      const { data: existing } = await supabase.from('gamification_challenge_progress')
        .select('*').eq('student_cpf', studentCpf).eq('challenge_id', ch.id).maybeSingle();

      if (existing?.completed_at) continue;

      const newProgress = (existing?.current_progress || 0) + 1;
      const completedAt = newProgress >= target ? new Date().toISOString() : null;

      await supabase.from('gamification_challenge_progress').upsert({
        student_cpf: studentCpf, challenge_id: ch.id,
        current_progress: newProgress, target_progress: target, completed_at: completedAt,
        ...(existing ? { id: existing.id } : {}),
      }, { onConflict: 'student_cpf,challenge_id' });
    }
  },

  claimChallengeReward: async (studentCpf: string, challengeId: string): Promise<boolean> => {
    if (!isConfigured) return false;
    const { data: progress } = await supabase.from('gamification_challenge_progress')
      .select('*').eq('student_cpf', studentCpf).eq('challenge_id', challengeId).maybeSingle();
    if (!progress || !progress.completed_at || progress.claimed) return false;

    const { data: challenge } = await supabase.from('gamification_challenges').select('*').eq('id', challengeId).maybeSingle();
    if (!challenge) return false;

    await supabase.from('gamification_challenge_progress').update({ claimed: true }).eq('id', progress.id);

    if (challenge.reward_volls > 0) {
      await supabase.from('gamification_student_points').insert([{
        student_cpf: studentCpf, action_type: 'challenge_reward', volls: challenge.reward_volls,
        reference_id: challengeId, reference_type: 'challenge', description: `Bônus desafio: ${challenge.title}`,
      }]);
    }

    if (challenge.reward_badge_id) {
      await appBackend.grantBadgeManually(studentCpf, challenge.reward_badge_id);
    }

    return true;
  },

  getRewardsCatalog: async (): Promise<GamificationReward[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('gamification_rewards').select('*').eq('is_active', true).order('sort_order');
    return data || [];
  },

  claimReward: async (studentCpf: string, rewardId: string): Promise<GamificationClaimResult> => {
    if (!isConfigured) return { success: false, new_balance: 0, reward_details: null, error: 'Não configurado' };

    const [balanceRes, rewardRes] = await Promise.all([
      appBackend.getStudentVollsBalance(studentCpf),
      supabase.from('gamification_rewards').select('*').eq('id', rewardId).maybeSingle(),
    ]);

    const balance = balanceRes;
    const reward = rewardRes.data as GamificationReward | null;
    if (!reward) return { success: false, new_balance: balance, reward_details: null, error: 'Recompensa não encontrada' };
    if (!reward.is_active) return { success: false, new_balance: balance, reward_details: null, error: 'Recompensa indisponível' };
    if (balance < reward.cost_volls) return { success: false, new_balance: balance, reward_details: null, error: `Saldo insuficiente. Faltam ${reward.cost_volls - balance} VOLLs.` };
    if (reward.stock !== null && reward.stock <= 0) return { success: false, new_balance: balance, reward_details: null, error: 'Recompensa esgotada' };

    await supabase.from('gamification_student_points').insert([{
      student_cpf: studentCpf, action_type: 'reward_redemption', volls: -reward.cost_volls,
      reference_id: rewardId, reference_type: 'reward', description: `Resgate: ${reward.name}`,
    }]);

    if (reward.stock !== null) {
      await supabase.from('gamification_rewards').update({ stock: reward.stock - 1 }).eq('id', rewardId);
    }

    const benefitData: Record<string, any> = {};
    const config = reward.reward_config as any;

    if (reward.reward_type === 'discount' && config?.discount_percent) {
      const couponCode = `VOLL${Date.now().toString(36).toUpperCase()}`;
      const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
      try {
        await supabase.from('pagbank_coupons').insert([{
          code: couponCode, description: `Gamificação: ${reward.name}`,
          discount_type: 'percentage', discount_value: config.discount_percent,
          min_amount: 0, max_uses: 1, current_uses: 0, is_active: true,
          valid_until: expiresAt.toISOString(),
          course_id: config.course_id || null,
        }]);
        benefitData.coupon_code = couponCode;
        benefitData.expires_at = expiresAt.toISOString();
      } catch (e) { console.error('Coupon creation error:', e); }
    }

    if (reward.reward_type === 'content_unlock' && config?.content_type && config?.content_id) {
      await supabase.from('gamification_content_unlocks').upsert({
        student_cpf: studentCpf, content_type: config.content_type, content_id: config.content_id,
      }, { onConflict: 'student_cpf,content_type,content_id', ignoreDuplicates: true });
      benefitData.content_type = config.content_type;
      benefitData.content_id = config.content_id;
    }

    if (reward.reward_type === 'badge' && config?.badge_id) {
      await appBackend.grantBadgeManually(studentCpf, config.badge_id);
      benefitData.badge_id = config.badge_id;
    }

    const expiresAt = reward.reward_type === 'discount' ? benefitData.expires_at : null;
    const { data: claim } = await supabase.from('gamification_reward_claims').insert([{
      student_cpf: studentCpf, reward_id: rewardId, volls_spent: reward.cost_volls,
      status: 'active', expires_at: expiresAt, benefit_data: benefitData,
    }]).select('*, gamification_rewards(*)').single();

    await appBackend.updateChallengeProgress(studentCpf, 'reward_claimed');
    await appBackend.checkAndAwardBadges(studentCpf);

    const newBalance = balance - reward.cost_volls;
    return { success: true, new_balance: newBalance, reward_details: claim };
  },

  getStudentRewards: async (studentCpf: string, status?: string): Promise<GamificationRewardClaim[]> => {
    if (!isConfigured) return [];
    let query = supabase.from('gamification_reward_claims').select('*, gamification_rewards(*)').eq('student_cpf', studentCpf);
    if (status) query = query.eq('status', status);
    const { data } = await query.order('claimed_at', { ascending: false });
    return data || [];
  },

  getStudentVollsStatement: async (studentCpf: string, options?: { limit?: number; offset?: number; actionFilter?: string; dateFrom?: string; dateTo?: string }): Promise<{ transactions: GamificationStudentPoints[]; total: number }> => {
    if (!isConfigured) return { transactions: [], total: 0 };
    let query = supabase.from('gamification_student_points').select('*', { count: 'exact' }).eq('student_cpf', studentCpf);
    if (options?.actionFilter && options.actionFilter !== 'all') {
      if (options.actionFilter === 'earned') query = query.gt('volls', 0);
      else if (options.actionFilter === 'spent') query = query.lt('volls', 0);
    }
    if (options?.dateFrom) query = query.gte('earned_at', options.dateFrom);
    if (options?.dateTo) query = query.lte('earned_at', options.dateTo);
    const { data, count } = await query.order('earned_at', { ascending: false }).range(options?.offset || 0, (options?.offset || 0) + (options?.limit || 20) - 1);
    return { transactions: data || [], total: count || 0 };
  },

  getStudentGamificationSummary: async (studentCpf: string): Promise<GamificationSummary> => {
    if (!isConfigured) return { balance: 0, total_earned: 0, total_spent: 0, level: null, next_level: null, streak: null, recent_badges: [], active_challenges_count: 0, currency_name: 'VOLLs' };

    const [vollsRes, levelsRes, streakRes, badgesRes, challengesRes, settingsRes] = await Promise.all([
      supabase.from('gamification_student_points').select('volls').eq('student_cpf', studentCpf),
      supabase.from('gamification_levels').select('*').order('level_number'),
      supabase.from('gamification_streaks').select('*').eq('student_cpf', studentCpf).maybeSingle(),
      supabase.from('gamification_student_badges').select('*, gamification_badges(*)').eq('student_cpf', studentCpf).order('earned_at', { ascending: false }).limit(5),
      supabase.from('gamification_challenges').select('id').eq('is_active', true),
      supabase.from('gamification_settings').select('value').eq('key', 'currency_name').maybeSingle(),
    ]);

    const points = vollsRes.data || [];
    let totalEarned = 0, totalSpent = 0;
    for (const p of points) {
      if (p.volls > 0) totalEarned += p.volls;
      else totalSpent += Math.abs(p.volls);
    }
    const balance = totalEarned - totalSpent;

    const levels = levelsRes.data || [];
    const level = levels.filter(l => balance >= l.min_volls && balance <= l.max_volls)[0] || levels[0] || null;
    const nextLevel = level ? levels.find(l => l.level_number === level.level_number + 1) || null : null;

    const currencyRaw = settingsRes.data?.value;
    const currencyName = typeof currencyRaw === 'string' ? currencyRaw.replace(/"/g, '') : 'VOLLs';

    return {
      balance, total_earned: totalEarned, total_spent: totalSpent,
      level, next_level: nextLevel,
      streak: streakRes.data || null,
      recent_badges: badgesRes.data || [],
      active_challenges_count: (challengesRes.data || []).length,
      currency_name: currencyName,
    };
  },

  getGamificationDashboard: async (): Promise<Record<string, any>> => {
    if (!isConfigured) return {};
    const [pointsRes, badgesRes, claimsRes, streaksRes] = await Promise.all([
      supabase.from('gamification_student_points').select('volls, student_cpf, earned_at'),
      supabase.from('gamification_student_badges').select('id, student_cpf'),
      supabase.from('gamification_reward_claims').select('id, volls_spent'),
      supabase.from('gamification_streaks').select('student_cpf, current_streak'),
    ]);

    const points = pointsRes.data || [];
    const uniqueStudents = new Set(points.map(p => p.student_cpf));
    const totalDistributed = points.filter(p => p.volls > 0).reduce((s, p) => s + p.volls, 0);
    const totalSpent = points.filter(p => p.volls < 0).reduce((s, p) => s + Math.abs(p.volls), 0);

    return {
      total_students: uniqueStudents.size,
      total_volls_distributed: totalDistributed,
      total_volls_spent: totalSpent,
      total_badges_earned: (badgesRes.data || []).length,
      total_rewards_claimed: (claimsRes.data || []).length,
      active_streaks: (streaksRes.data || []).filter(s => s.current_streak > 0).length,
    };
  },
};
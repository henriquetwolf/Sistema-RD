
import { createClient, Session } from '@supabase/supabase-js';
import { 
  SavedPreset, FormModel, SurveyModel, FormAnswer, Contract, ContractFolder, 
  CertificateModel, StudentCertificate, EventModel, Workshop, EventRegistration, 
  EventBlock, Role, Banner, PartnerStudio, InstructorLevel, InventoryRecord, 
  SyncJob, ActivityLog, CollaboratorSession, BillingNegotiation, FormFolder, 
  CourseInfo, TeacherNews, SupportTicket, SupportMessage, SupportStatus 
} from '../types';

export interface CompanySetting {
  id: string;
  cnpj: string;
  legalName: string;
  webhookUrl: string;
  productTypes: string[];
  productIds: string[];
}

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
      if (!isConfigured) return { data: { user: { id: 'admin', email: 'admin@voll.com' }, session: {} }, error: null };
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    signOut: async () => isConfigured && await supabase.auth.signOut(),
    getSession: async () => isConfigured ? (await supabase.auth.getSession()).data.session : null,
    onAuthStateChange: (callback: (session: Session | null) => void) => {
      if (!isConfigured) return { data: { subscription: { unsubscribe: () => {} } } };
      return supabase.auth.onAuthStateChange((_event, session) => callback(session));
    }
  },

  // --- SISTEMA DE SUPORTE (TICKETS) ---
  getTickets: async (filters?: { status?: string; senderType?: string; senderId?: string }): Promise<SupportTicket[]> => {
      if (!isConfigured) return [];
      let query = supabase.from('crm_support_tickets').select('*').order('updated_at', { ascending: false });
      
      if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters?.senderType && filters.senderType !== 'all') query = query.eq('sender_type', filters.senderType);
      if (filters?.senderId) query = query.eq('sender_id', filters.senderId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((d: any) => ({
          id: d.id, title: d.title, description: d.description, category: d.category,
          priority: d.priority, status: d.status, senderId: d.sender_id,
          senderName: d.sender_name, senderType: d.sender_type, assignedTo: d.assigned_to,
          createdAt: d.created_at, updatedAt: d.updated_at
      }));
  },

  getTicketById: async (id: string): Promise<SupportTicket | null> => {
      if (!isConfigured) return null;
      const { data, error } = await supabase.from('crm_support_tickets').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
          id: data.id, title: data.title, description: data.description, category: data.category,
          priority: data.priority, status: data.status, senderId: data.sender_id,
          senderName: data.sender_name, senderType: data.sender_type, assignedTo: data.assigned_to,
          createdAt: data.created_at, updatedAt: data.updated_at
      };
  },

  createTicket: async (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<SupportTicket> => {
      if (!isConfigured) throw new Error("Database not configured");
      const payload = {
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          status: 'open',
          sender_id: ticket.senderId,
          sender_name: ticket.senderName,
          sender_type: ticket.senderType
      };
      const { data, error } = await supabase.from('crm_support_tickets').insert([payload]).select().single();
      if (error) throw error;

      // Adiciona a primeira mensagem (descrição do ticket)
      await appBackend.addSupportMessage({
          ticketId: data.id,
          senderId: ticket.senderId,
          senderName: ticket.senderName,
          senderType: 'user',
          content: ticket.description
      });

      return {
          id: data.id, title: data.title, description: data.description, category: data.category,
          priority: data.priority, status: data.status, senderId: data.sender_id,
          senderName: data.sender_name, senderType: data.sender_type,
          createdAt: data.created_at, updatedAt: data.updated_at
      };
  },

  updateTicketStatus: async (id: string, status: SupportStatus): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
  },

  getTicketMessages: async (ticketId: string): Promise<SupportMessage[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((m: any) => ({
          id: m.id, ticketId: m.ticket_id, senderId: m.sender_id, senderName: m.sender_name,
          senderType: m.sender_type, content: m.content, attachments: m.attachments,
          createdAt: m.created_at
      }));
  },

  addSupportMessage: async (msg: Omit<SupportMessage, 'id' | 'createdAt'>): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_support_messages').insert([{
          ticket_id: msg.ticketId, sender_id: msg.senderId, sender_name: msg.senderName,
          sender_type: msg.senderType, content: msg.content, attachments: msg.attachments
      }]);
      if (error) throw error;

      // Ao enviar mensagem, se for admin, marca como "waiting" (esperando resposta do user) ou "in_progress"
      // Se for user enviando, marca como "open" ou "in_progress" se já estiver sendo atendido
      await supabase.from('crm_support_tickets').update({ updated_at: new Date().toISOString() }).eq('id', msg.ticketId);
  },

  // --- MÉTODOS EXISTENTES E NOVOS ---
  getAppLogo: async () => await appBackend.getAppSetting('app_logo_url'),
  saveAppLogo: async (u: string) => await appBackend.saveAppSetting('app_logo_url', u),
  getAppSetting: async (k: string) => isConfigured ? (await supabase.from('app_settings').select('value').eq('key', k).maybeSingle()).data?.value : null,
  saveAppSetting: async (k: string, v: any) => isConfigured && await supabase.from('app_settings').upsert({ key: k, value: v }),
  logActivity: async (log: any) => isConfigured && await supabase.from('crm_activity_logs').insert([log]),
  getSyncJobs: async () => isConfigured ? (await supabase.from('crm_sync_jobs').select('*')).data : [],
  getPresets: async () => isConfigured ? (await supabase.from('app_presets').select('*')).data : [],
  savePreset: async (p: any) => isConfigured && (await supabase.from('app_presets').insert(p).select().single()).data,
  deletePreset: async (id: string) => isConfigured && await supabase.from('app_presets').delete().eq('id', id),
  getRoles: async () => isConfigured ? (await supabase.from('crm_roles').select('*')).data : [],
  getBanners: async (a: string) => isConfigured ? (await supabase.from('app_banners').select('*').eq('target_audience', a)).data : [],
  getCompanies: async (): Promise<CompanySetting[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_companies').select('*');
      if (error) throw error;
      return (data || []).map((d: any) => ({
          id: d.id, cnpj: d.cnpj, legalName: d.legal_name, webhookUrl: d.webhook_url,
          productTypes: d.product_types || [], productIds: d.product_ids || []
      }));
  },
  getInstructorLevels: async () => isConfigured ? (await supabase.from('crm_instructor_levels').select('*')).data : [],
  getPartnerStudios: async () => isConfigured ? (await supabase.from('crm_partner_studios').select('*')).data : [],
  getTeacherNews: async () => isConfigured ? (await supabase.from('crm_teacher_news').select('*')).data : [],
  getFormFolders: async () => isConfigured ? (await supabase.from('crm_form_folders').select('*')).data : [],
  getForms: async () => isConfigured ? (await supabase.from('crm_forms').select('*')).data : [],
  getFormById: async (id: string) => isConfigured ? (await supabase.from('crm_forms').select('*').eq('id', id).maybeSingle()).data : null,
  getSurveys: async () => isConfigured ? (await supabase.from('crm_surveys').select('*')).data : [],
  getEligibleSurveysForStudent: async (id: string) => isConfigured ? (await supabase.from('crm_surveys').select('*')).data : [],
  getContracts: async () => isConfigured ? (await supabase.from('app_contracts').select('*')).data : [],
  getFolders: async () => isConfigured ? (await supabase.from('app_contract_folders').select('*')).data : [],
  getInventory: async () => isConfigured ? (await supabase.from('crm_inventory').select('*')).data : [],
  getInventorySecurityMargin: async () => 5,
  getCourseInfos: async () => isConfigured ? (await supabase.from('crm_course_info').select('*')).data : [],
  saveSyncJob: async (j: any) => isConfigured && await supabase.from('crm_sync_jobs').upsert(j),
  deleteSyncJob: async (id: string) => isConfigured && await supabase.from('crm_sync_jobs').delete().eq('id', id),
  updateJobStatus: async (id: string, s: string, l: string, m: string) => isConfigured && await supabase.from('crm_sync_jobs').update({ status: s, last_sync: l, last_message: m }).eq('id', id),
  saveSupportMessage: async (m: any) => isConfigured && await supabase.from('crm_support_messages').insert([m]),

  /* FIX: Added missing methods below */

  getContractById: async (id: string): Promise<Contract | null> => {
      if (!isConfigured) return null;
      const { data, error } = await supabase.from('app_contracts').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
  },
  saveContract: async (c: Contract) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('app_contracts').upsert(c);
      if (error) throw error;
  },
  deleteContract: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('app_contracts').delete().eq('id', id);
      if (error) throw error;
  },
  signContract: async (contractId: string, signerId: string, signatureData: string) => {
      if (!isConfigured) return;
      const { data: contract } = await supabase.from('app_contracts').select('signers').eq('id', contractId).single();
      if (contract) {
          const updatedSigners = contract.signers.map((s: any) => 
            s.id === signerId ? { ...s, status: 'signed', signatureData, signedAt: new Date().toISOString() } : s
          );
          const allSigned = updatedSigners.every((s: any) => s.status === 'signed');
          await supabase.from('app_contracts').update({ 
              signers: updatedSigners, 
              status: allSigned ? 'signed' : 'sent' 
          }).eq('id', contractId);
      }
  },
  saveFolder: async (f: ContractFolder) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('app_contract_folders').upsert(f);
      if (error) throw error;
  },
  deleteFolder: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('app_contract_folders').delete().eq('id', id);
      if (error) throw error;
  },
  getPipelines: async (): Promise<Pipeline[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_pipelines').select('*').order('name');
      if (error) throw error;
      return data || [];
  },
  savePipeline: async (p: Pipeline) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_pipelines').upsert(p);
      if (error) throw error;
  },
  deletePipeline: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_pipelines').delete().eq('id', id);
      if (error) throw error;
  },
  getWebhookTriggers: async (): Promise<WebhookTrigger[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_webhook_triggers').select('*');
      if (error) throw error;
      return (data || []).map((d: any) => ({
          id: d.id, pipelineName: d.pipeline_name, stageId: d.stage_id, payloadJson: d.payload_json
      }));
  },
  saveTeacherNews: async (n: any) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_teacher_news').insert([{
          title: n.title, content: n.content, image_url: n.imageUrl
      }]);
      if (error) throw error;
  },
  deleteTeacherNews: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_teacher_news').delete().eq('id', id);
      if (error) throw error;
  },
  submitForm: async (formId: string, answers: FormAnswer[], isLeadCapture: boolean, studentId?: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_form_submissions').insert([{
          form_id: formId, answers, student_id: studentId
      }]);
      if (error) throw error;
  },
  getFormSubmissions: async (formId: string) => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_form_submissions').select('*').eq('form_id', formId).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
  },
  saveForm: async (f: FormModel) => {
      if (!isConfigured) return;
      const payload = {
          title: f.title, description: f.description, campaign: f.campaign,
          is_lead_capture: f.isLeadCapture, team_id: f.teamId, distribution_mode: f.distributionMode,
          fixed_owner_id: f.fixedOwnerId, target_pipeline: f.targetPipeline, target_stage: f.targetStage,
          questions: f.questions, style: f.style, folder_id: f.folderId
      };
      const { error } = await supabase.from('crm_forms').upsert({ ...(f.id ? { id: f.id } : {}), ...payload });
      if (error) throw error;
  },
  deleteForm: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_forms').delete().eq('id', id);
      if (error) throw error;
  },
  saveFormFolder: async (f: FormFolder) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_form_folders').upsert(f);
      if (error) throw error;
  },
  deleteFormFolder: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_form_folders').delete().eq('id', id);
      if (error) throw error;
  },
  saveSurvey: async (s: SurveyModel) => {
      if (!isConfigured) return;
      const payload = {
          title: s.title, description: s.description, campaign: s.campaign,
          is_lead_capture: s.isLeadCapture, questions: s.questions, style: s.style,
          target_type: s.targetType, target_product_type: s.targetProductType,
          target_product_name: s.targetProductName, only_if_finished: s.onlyIfFinished,
          is_active: s.isActive, folder_id: s.folderId
      };
      const { error } = await supabase.from('crm_forms').upsert({ ...(s.id ? { id: s.id } : {}), ...payload });
      if (error) throw error;
  },
  issueCertificate: async (studentDealId: string, templateId: string) => {
      if (!isConfigured) return '';
      const hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const { error } = await supabase.from('crm_student_certificates').insert([{
          student_deal_id: studentDealId, certificate_template_id: templateId, hash, issued_at: new Date().toISOString()
      }]);
      if (error) throw error;
      return hash;
  },
  getCertificates: async (): Promise<CertificateModel[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_certificates').select('*');
      if (error) throw error;
      return (data || []).map((d: any) => ({
          id: d.id, title: d.title, backgroundData: d.background_data,
          backBackgroundData: d.back_background_data, linkedProductId: d.linked_product_id,
          bodyText: d.body_text, layoutConfig: d.layout_config, createdAt: d.created_at
      }));
  },
  saveCertificate: async (c: CertificateModel) => {
      if (!isConfigured) return;
      const payload = {
          title: c.title, background_data: c.backgroundData,
          back_background_data: c.backBackgroundData, linked_product_id: c.linkedProductId,
          body_text: c.bodyText, layout_config: c.layoutConfig
      };
      const { error } = await supabase.from('crm_certificates').upsert({ ...(c.id ? { id: c.id } : {}), ...payload });
      if (error) throw error;
  },
  deleteCertificate: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_certificates').delete().eq('id', id);
      if (error) throw error;
  },
  getStudentCertificate: async (hash: string) => {
      if (!isConfigured) return null;
      const { data, error } = await supabase.from('crm_student_certificates').select('*, student:crm_deals(contact_name, company_name, course_city), template:crm_certificates(*)').eq('hash', hash).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
          studentName: data.student.company_name || data.student.contact_name,
          studentCity: data.student.course_city || 'São Paulo',
          template: {
              id: data.template.id, title: data.template.title, backgroundData: data.template.background_data,
              backBackgroundData: data.template.back_background_data, linkedProductId: data.template.linked_product_id,
              bodyText: data.template.body_text, layoutConfig: data.template.layout_config, createdAt: data.template.created_at
          },
          issuedAt: data.issued_at
      };
  },
  deleteStudentCertificate: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_student_certificates').delete().eq('id', id);
      if (error) throw error;
  },
  getEvents: async (): Promise<EventModel[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_events').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
          id: d.id, name: d.name, description: d.description, location: d.location,
          dates: d.dates, createdAt: d.created_at, registrationOpen: d.registration_open
      }));
  },
  saveEvent: async (e: EventModel) => {
      if (!isConfigured) return e;
      const payload = {
          name: e.name, description: e.description, location: e.location,
          dates: e.dates, registration_open: e.registrationOpen
      };
      const { data, error } = await supabase.from('crm_events').upsert({ ...(e.id ? { id: e.id } : {}), ...payload }).select().single();
      if (error) throw error;
      return {
          id: data.id, name: data.name, description: data.description, location: data.location,
          dates: data.dates, createdAt: data.created_at, registrationOpen: data.registration_open
      };
  },
  deleteEvent: async (id: string) => {
      if (!isConfigured) return;
      await supabase.from('crm_events').delete().eq('id', id);
  },
  getWorkshops: async (eventId: string): Promise<Workshop[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_workshops').select('*').eq('event_id', eventId);
      if (error) throw error;
      return (data || []).map((d: any) => ({
          id: d.id, eventId: d.event_id, blockId: d.block_id, title: d.title,
          description: d.description, speaker: d.speaker, date: d.date, time: d.time, spots: d.spots
      }));
  },
  saveWorkshop: async (w: Workshop) => {
      if (!isConfigured) return w;
      const payload = {
          event_id: w.eventId, block_id: w.blockId, title: w.title,
          description: w.description, speaker: w.speaker, date: w.date, time: w.time, spots: w.spots
      };
      const { data, error } = await supabase.from('crm_workshops').upsert({ ...(w.id ? { id: w.id } : {}), ...payload }).select().single();
      if (error) throw error;
      return {
          id: data.id, eventId: data.event_id, blockId: data.block_id, title: data.title,
          description: data.description, speaker: data.speaker, date: data.date, time: data.time, spots: data.spots
      };
  },
  deleteWorkshop: async (id: string) => {
      if (!isConfigured) return;
      await supabase.from('crm_workshops').delete().eq('id', id);
  },
  getBlocks: async (eventId: string): Promise<EventBlock[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_event_blocks').select('*').eq('event_id', eventId);
      if (error) throw error;
      return (data || []).map((d: any) => ({
          id: d.id, eventId: d.event_id, date: d.date, title: d.title, maxSelections: d.max_selections
      }));
  },
  saveBlock: async (b: EventBlock) => {
      if (!isConfigured) return b;
      const payload = { event_id: b.eventId, date: b.date, title: b.title, max_selections: b.maxSelections };
      const { data, error } = await supabase.from('crm_event_blocks').upsert({ ...(b.id ? { id: b.id } : {}), ...payload }).select().single();
      if (error) throw error;
      return { id: data.id, eventId: data.event_id, date: data.date, title: data.title, maxSelections: data.max_selections };
  },
  deleteBlock: async (id: string) => {
      if (!isConfigured) return;
      await supabase.from('crm_event_blocks').delete().eq('id', id);
  },
  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_event_registrations').select('*').eq('event_id', eventId);
      if (error) throw error;
      return (data || []).map((d: any) => ({
          id: d.id, eventId: d.event_id, workshopId: d.workshop_id, studentId: d.student_id,
          studentName: d.student_name, studentEmail: d.student_email, registeredAt: d.registered_at
      }));
  },
  getWhatsAppConfig: async () => {
      if (!isConfigured) return null;
      const val = await appBackend.getAppSetting('whatsapp_config');
      return val ? JSON.parse(val) : null;
  },
  saveWhatsAppConfig: async (c: any) => {
      if (!isConfigured) return;
      await appBackend.saveAppSetting('whatsapp_config', JSON.stringify(c));
  },
  savePartnerStudio: async (s: PartnerStudio) => {
      if (!isConfigured) return;
      const payload = {
          status: s.status, responsible_name: s.responsibleName, cpf: s.cpf,
          phone: s.phone, email: s.email, password: s.password,
          second_contact_name: s.secondContactName, second_contact_phone: s.secondContactPhone,
          fantasy_name: s.fantasyName, legal_name: s.legalName, cnpj: s.cnpj,
          studio_phone: s.studioPhone, address: s.address, city: s.city, state: s.state, country: s.country,
          size_m2: s.sizeM2, student_capacity: s.studentCapacity, rent_value: s.rentValue,
          methodology: s.methodology, studio_type: s.studioType, name_on_site: s.nameOnSite,
          bank: s.bank, agency: s.agency, account: s.account, beneficiary: s.beneficiary, pix_key: s.pixKey,
          has_reformer: s.hasReformer, qty_reformer: s.qtyReformer,
          has_ladder_barrel: s.hasLadderBarrel, qty_ladder_barrel: s.qtyLadderBarrel,
          has_chair: s.hasChair, qty_chair: s.qtyChair,
          has_cadillac: s.hasCadillac, qty_cadillac: s.qtyCadillac,
          has_chairs_for_course: s.hasChairsForCourse, has_tv: s.hasTv,
          max_kits_capacity: s.maxKitsCapacity, attachments: s.attachments
      };
      const { error } = await supabase.from('crm_partner_studios').upsert({ ...(s.id ? { id: s.id } : {}), ...payload });
      if (error) throw error;
  },
  deletePartnerStudio: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_partner_studios').delete().eq('id', id);
      if (error) throw error;
  },
  saveInventoryRecord: async (r: InventoryRecord) => {
      if (!isConfigured) return;
      const payload = {
          type: r.type, item_apostila_nova: r.itemApostilaNova, item_apostila_classico: r.itemApostilaClassico,
          item_sacochila: r.itemSacochila, item_lapis: r.itemLapis, registration_date: r.registrationDate,
          studio_id: r.studioId || null, tracking_code: r.trackingCode, observations: r.observations,
          conference_date: r.conferenceDate || null, attachments: r.attachments
      };
      const { error } = await supabase.from('crm_inventory').upsert({ ...(r.id ? { id: r.id } : {}), ...payload });
      if (error) throw error;
  },
  deleteInventoryRecord: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_inventory').delete().eq('id', id);
      if (error) throw error;
  },
  getBillingNegotiations: async (): Promise<BillingNegotiation[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_billing_negotiations').select('*');
      if (error) throw error;
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
  saveBillingNegotiation: async (n: any) => {
      if (!isConfigured) return;
      const payload = {
          open_installments: n.openInstallments, total_negotiated_value: n.totalNegotiatedValue,
          total_installments: n.totalInstallments, due_date: n.dueDate, responsible_agent: n.responsibleAgent,
          identifier_code: n.identifierCode, full_name: n.fullName, product_name: n.productName,
          original_value: n.originalValue, payment_method: n.paymentMethod, observations: n.observations,
          status: n.status, team: n.team, voucher_link_1: n.voucherLink1, test_date: n.testDate,
          voucher_link_2: n.voucherLink2, voucher_link_3: n.voucherLink3, boletos_link: n.boletosLink,
          negotiation_reference: n.negotiationReference, attachments: n.attachments
      };
      const { error } = await supabase.from('crm_billing_negotiations').upsert({ ...(n.id ? { id: n.id } : {}), ...payload });
      if (error) throw error;
  },
  deleteBillingNegotiation: async (id: string) => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_billing_negotiations').delete().eq('id', id);
      if (error) throw error;
  }
};

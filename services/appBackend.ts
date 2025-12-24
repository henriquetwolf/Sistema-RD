
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  SupabaseConfig, SavedPreset, Role, Banner, CompanySetting, 
  InstructorLevel, ActivityLog, FormModel, FormAnswer, 
  SurveyModel, InventoryRecord, Contract, ContractFolder,
  Product, CertificateModel, EventModel, Workshop, EventBlock,
  EventRegistration, TwilioConfig, PartnerStudio
} from '../types';

// Use environment variables or empty strings as fallback
const supabaseUrl = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || '';
const supabaseAnonKey = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || '';

// Create client only if URL is valid to prevent crash on boot
const createSafeClient = () => {
  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    console.warn("Supabase VITE_SUPABASE_URL not configured. Backend features will be disabled.");
    // Return a dummy client proxy to prevent 'undefined' errors, but it will fail on actual calls
    return new Proxy({} as any, {
      get: () => () => { throw new Error("Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY às variáveis de ambiente."); }
    });
  }
  return createClient(supabaseUrl, supabaseAnonKey);
};

export const client = createSafeClient();

export const appBackend = {
  client,
  
  auth: {
    signIn: async (email: string, pass: string) => {
      const { data, error } = await client.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      return data;
    },
    signOut: async () => {
      await client.auth.signOut();
    }
  },

  // Settings
  getAppSetting: async (key: string) => {
    const { data } = await client.from('app_settings').select('value').eq('key', key).single();
    return data?.value || null;
  },
  saveAppSetting: async (key: string, value: any) => {
    await client.from('app_settings').upsert({ key, value });
  },

  saveAppLogo: async (logo: string) => appBackend.saveAppSetting('app_logo', logo),
  getAppLogo: async () => appBackend.getAppSetting('app_logo'),

  saveInventorySecurityMargin: async (margin: number) => appBackend.saveAppSetting('inventory_margin', margin),
  getInventorySecurityMargin: async () => (await appBackend.getAppSetting('inventory_margin')) || 5,

  // Presets & Sync
  getPresets: async (): Promise<SavedPreset[]> => {
    const { data } = await client.from('crm_sync_presets').select('*');
    return data || [];
  },
  savePreset: async (preset: Partial<SavedPreset>) => {
    const { data, error } = await client.from('crm_sync_presets').upsert(preset).select().single();
    if (error) throw error;
    return data;
  },
  deletePreset: async (id: string) => {
    await client.from('crm_sync_presets').delete().eq('id', id);
  },

  // CRM & Pipelines
  getPipelines: async (): Promise<any[]> => {
    const { data } = await client.from('crm_pipelines').select('*');
    return data || [];
  },
  savePipeline: async (p: any) => client.from('crm_pipelines').upsert(p),
  deletePipeline: async (id: string) => client.from('crm_pipelines').delete().eq('id', id),

  // Roles
  getRoles: async (): Promise<Role[]> => {
    const { data } = await client.from('crm_roles').select('*');
    return data || [];
  },
  saveRole: async (role: Role) => client.from('crm_roles').upsert(role),
  deleteRole: async (id: string) => client.from('crm_roles').delete().eq('id', id),

  // Banners
  getBanners: async (audience?: string): Promise<Banner[]> => {
    let query = client.from('crm_banners').select('*');
    if (audience) query = query.eq('target_audience', audience);
    const { data } = await query;
    return data || [];
  },
  saveBanner: async (b: Banner) => client.from('crm_banners').upsert(b),
  deleteBanner: async (id: string) => client.from('crm_banners').delete().eq('id', id),

  // Companies
  getCompanies: async (): Promise<CompanySetting[]> => {
    const { data } = await client.from('crm_companies').select('*');
    return data || [];
  },
  saveCompany: async (c: CompanySetting) => client.from('crm_companies').upsert(c),
  deleteCompany: async (id: string) => client.from('crm_companies').delete().eq('id', id),

  // Instructor Levels
  getInstructorLevels: async (): Promise<InstructorLevel[]> => {
    const { data } = await client.from('crm_instructor_levels').select('*');
    return data || [];
  },
  saveInstructorLevel: async (l: InstructorLevel) => client.from('crm_instructor_levels').upsert(l),
  deleteInstructorLevel: async (id: string) => client.from('crm_instructor_levels').delete().eq('id', id),

  // Logs
  logActivity: async (log: Partial<ActivityLog>) => {
    try {
      const { data: userRes } = await client.auth.getUser();
      await client.from('crm_activity_logs').insert({
        ...log,
        user_name: userRes?.user?.email || 'System',
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.error("Log error", e);
    }
  },
  getActivityLogs: async (): Promise<ActivityLog[]> => {
    const { data } = await client.from('crm_activity_logs').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  // Forms
  getForms: async (): Promise<FormModel[]> => {
    const { data } = await client.from('crm_forms').select('*');
    return data || [];
  },
  saveForm: async (f: FormModel) => client.from('crm_forms').upsert(f),
  deleteForm: async (id: string) => client.from('crm_forms').delete().eq('id', id),
  getFormSubmissions: async (formId: string) => {
    const { data } = await client.from('crm_form_submissions').select('*').eq('form_id', formId).order('created_at', { ascending: false });
    return data || [];
  },
  submitForm: async (formId: string, answers: FormAnswer[], isLeadCapture: boolean, studentId?: string) => {
    await client.from('crm_form_submissions').insert({ form_id: formId, answers, student_id: studentId });
  },

  // Surveys
  getSurveys: async (): Promise<SurveyModel[]> => {
    const { data } = await client.from('crm_surveys').select('*');
    return data || [];
  },
  saveSurvey: async (s: SurveyModel) => client.from('crm_surveys').upsert(s),
  getEligibleSurveysForStudent: async (studentId: string) => {
    const { data } = await client.from('crm_surveys').select('*').eq('is_active', true);
    return data || [];
  },

  // Inventory
  getInventory: async (): Promise<InventoryRecord[]> => {
    const { data } = await client.from('crm_inventory').select('*');
    return data || [];
  },
  saveInventoryRecord: async (r: InventoryRecord) => client.from('crm_inventory').upsert(r),
  deleteInventoryRecord: async (id: string) => client.from('crm_inventory').delete().eq('id', id),

  // Contracts
  getContracts: async (): Promise<Contract[]> => {
    const { data } = await client.from('crm_contracts').select('*');
    return data || [];
  },
  saveContract: async (c: Contract) => client.from('crm_contracts').upsert(c),
  deleteContract: async (id: string) => client.from('crm_contracts').delete().eq('id', id),
  getFolders: async (): Promise<ContractFolder[]> => {
    const { data } = await client.from('crm_contract_folders').select('*');
    return data || [];
  },
  saveFolder: async (f: ContractFolder) => client.from('crm_contract_folders').upsert(f),
  deleteFolder: async (id: string) => client.from('crm_contract_folders').delete().eq('id', id),
  signContract: async (contractId: string, signerId: string, sig: string) => {
     // Implementation would update specific signer status
  },

  // Certificates
  getCertificates: async (): Promise<CertificateModel[]> => {
    const { data } = await client.from('crm_certificates').select('*');
    return data || [];
  },
  saveCertificate: async (c: CertificateModel) => client.from('crm_certificates').upsert(c),
  deleteCertificate: async (id: string) => client.from('crm_certificates').delete().eq('id', id),
  issueCertificate: async (dealId: string, templateId: string) => {
    const hash = Math.random().toString(36).substring(2, 15);
    await client.from('crm_student_certificates').insert({ student_deal_id: dealId, certificate_template_id: templateId, hash });
    return hash;
  },
  getStudentCertificate: async (hash: string) => {
    const { data } = await client.from('crm_student_certificates').select('*, template:crm_certificates(*)').eq('hash', hash).single();
    return data;
  },
  deleteStudentCertificate: async (id: string) => client.from('crm_student_certificates').delete().eq('id', id),

  // Events
  getEvents: async (): Promise<EventModel[]> => {
    const { data } = await client.from('crm_events').select('*');
    return data || [];
  },
  saveEvent: async (e: EventModel) => client.from('crm_events').upsert(e),
  deleteEvent: async (id: string) => client.from('crm_events').delete().eq('id', id),
  getWorkshops: async (eventId: string): Promise<Workshop[]> => {
    const { data } = await client.from('crm_workshops').select('*').eq('event_id', eventId);
    return data || [];
  },
  saveWorkshop: async (w: Workshop) => client.from('crm_workshops').upsert(w),
  deleteWorkshop: async (id: string) => client.from('crm_workshops').delete().eq('id', id),
  getBlocks: async (eventId: string): Promise<EventBlock[]> => {
    const { data } = await client.from('crm_event_blocks').select('*').eq('event_id', eventId);
    return data || [];
  },
  saveBlock: async (b: EventBlock) => client.from('crm_event_blocks').upsert(b),
  deleteBlock: async (id: string) => client.from('crm_event_blocks').delete().eq('id', id),
  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
    const { data } = await client.from('crm_event_registrations').select('*').eq('event_id', eventId);
    return data || [];
  },

  // WhatsApp & Twilio
  getWhatsAppConfig: async () => appBackend.getAppSetting('whatsapp_config'),
  saveWhatsAppConfig: async (c: any) => appBackend.saveAppSetting('whatsapp_config', c),
  
  getTwilioConfig: async (): Promise<TwilioConfig | null> => {
    return await appBackend.getAppSetting('twilio_config');
  },
  saveTwilioConfig: async (config: TwilioConfig): Promise<void> => {
    await appBackend.saveAppSetting('twilio_config', config);
  },

  // Partner Studios
  getPartnerStudios: async (): Promise<PartnerStudio[]> => {
    const { data } = await client.from('crm_partner_studios').select('*');
    return data || [];
  },
  savePartnerStudio: async (s: PartnerStudio) => client.from('crm_partner_studios').upsert(s),
  deletePartnerStudio: async (id: string) => client.from('crm_partner_studios').delete().eq('id', id)
};

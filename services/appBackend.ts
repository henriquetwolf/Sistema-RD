
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  TwilioConfig, Role, Banner, InstructorLevel, ActivityLog, 
  FormModel, SurveyModel, Contract, ContractFolder, PartnerStudio, 
  CertificateModel, EventModel, Workshop, EventBlock, InventoryRecord, 
  EventRegistration,
  // Fix missing imports from types.ts
  Pipeline, PipelineStage, CompanySetting 
} from '../types';

// Re-export types so components can import them from this service
export type { Pipeline, PipelineStage, CompanySetting };

// Busca extensiva de variáveis de ambiente
const getSafeEnv = (key: string): string => {
  try {
    // Tenta as chaves com e sem o prefixo VITE_
    const keysToTry = [key, `VITE_${key}`, `REACT_APP_${key}`];
    
    for (const k of keysToTry) {
      // 1. Vite / ESM
      if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[k]) {
        return (import.meta as any).env[k];
      }
      // 2. Node / Webpack / Process
      if (typeof process !== 'undefined' && process.env && process.env[k]) {
        return process.env[k];
      }
    }
  } catch (e) {}
  return '';
};

const supabaseUrl = getSafeEnv('SUPABASE_URL');
const supabaseKey = getSafeEnv('SUPABASE_ANON_KEY');

// Verifica se a configuração global está presente
export const isSupabaseConfigured = !!(supabaseUrl && supabaseUrl.startsWith('http') && supabaseKey);

const createSafeClient = (): SupabaseClient => {
  if (!isSupabaseConfigured) {
    console.warn("CRM BACKEND: Chaves de ambiente não detectadas. Funcionalidades de CRM desabilitadas.");
    
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: { user: null }, error: new Error("Supabase não configurado nas variáveis de ambiente (SUPABASE_URL / SUPABASE_ANON_KEY).") }),
        signOut: async () => ({ error: null })
      },
      from: (table: string) => ({
        select: () => ({
          order: () => ({ limit: () => ({ data: [], error: null }), data: [], error: null }),
          eq: () => ({ single: () => ({ data: null, error: null }), maybeSingle: () => ({ data: null, error: null }), data: [], error: null }),
          data: [], error: null
        }),
        insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
        upsert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
        update: () => ({ eq: () => ({ data: null, error: null }) }),
        delete: () => ({ eq: () => ({ data: null, error: null }) })
      })
    } as unknown as SupabaseClient;
  }

  return createClient(supabaseUrl, supabaseKey);
};

export const supabase = createSafeClient();

export const appBackend = {
  client: supabase,
  isConfigured: isSupabaseConfigured,

  auth: {
    signIn: async (email: string, pass: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      return data;
    },
    signOut: async () => {
      await supabase.auth.signOut();
    }
  },

  getAppSetting: async (key: string) => {
    try {
      const { data } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
      return data?.value || null;
    } catch (e) { return null; }
  },

  saveAppSetting: async (key: string, value: any) => {
    await supabase.from('app_settings').upsert({ key, value });
  },

  getPresets: async () => {
    try {
        const { data } = await supabase.from('app_presets').select('*').order('created_at', { ascending: false });
        return data || [];
    } catch(e) { return []; }
  },

  savePreset: async (preset: any) => {
    const { data, error } = await supabase.from('app_presets').upsert(preset).select().single();
    if (error) throw error;
    return data;
  },

  deletePreset: async (id: string) => {
    await supabase.from('app_presets').delete().eq('id', id);
  },

  getRoles: async (): Promise<Role[]> => {
    const { data } = await supabase.from('crm_roles').select('*');
    return data || [];
  },
  
  saveRole: async (role: Role) => {
    await supabase.from('crm_roles').upsert(role);
  },

  deleteRole: async (id: string) => {
    await supabase.from('crm_roles').delete().eq('id', id);
  },

  getBanners: async (audience?: string): Promise<Banner[]> => {
    let query = supabase.from('crm_banners').select('*');
    if (audience) query = query.eq('target_audience', audience);
    const { data } = await query;
    return data || [];
  },

  saveBanner: async (banner: Banner) => {
    await supabase.from('crm_banners').upsert(banner);
  },

  deleteBanner: async (id: string) => {
    await supabase.from('crm_banners').delete().eq('id', id);
  },

  getCompanies: async () => {
    const { data } = await supabase.from('app_companies').select('*');
    return data || [];
  },

  saveCompany: async (company: any) => {
    await supabase.from('app_companies').upsert(company);
  },

  deleteCompany: async (id: string) => {
    await supabase.from('app_companies').delete().eq('id', id);
  },

  getInstructorLevels: async (): Promise<InstructorLevel[]> => {
    const { data } = await supabase.from('crm_instructor_levels').select('*');
    return data || [];
  },

  saveInstructorLevel: async (level: InstructorLevel) => {
    await supabase.from('crm_instructor_levels').upsert(level);
  },

  deleteInstructorLevel: async (id: string) => {
    await supabase.from('crm_instructor_levels').delete().eq('id', id);
  },

  getActivityLogs: async (limit = 100): Promise<ActivityLog[]> => {
    const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    return (data || []).map(d => ({
        id: d.id,
        action: d.action,
        module: d.module,
        details: d.details,
        userName: d.user_name,
        userId: d.user_id,
        recordId: d.record_id,
        createdAt: d.created_at
    }));
  },

  logActivity: async (log: Partial<ActivityLog>) => {
    try {
      const { data: { user } } = await supabase.auth.getSession().then(res => ({ data: { user: res.data.session?.user } }));
      await supabase.from('activity_logs').insert([{
          action: log.action,
          module: log.module,
          details: log.details,
          user_id: user?.id,
          user_name: user?.email || 'System',
          record_id: log.recordId
      }]);
    } catch (e) {}
  },

  getForms: async (): Promise<FormModel[]> => {
    const { data } = await supabase.from('crm_forms').select('*');
    return data || [];
  },

  saveForm: async (form: FormModel) => {
    await supabase.from('crm_forms').upsert(form);
  },

  deleteForm: async (id: string) => {
    await supabase.from('crm_forms').delete().eq('id', id);
  },

  submitForm: async (formId: string, answers: any[], isLeadCapture?: boolean, studentId?: string) => {
      await supabase.from('crm_form_submissions').insert([{
          form_id: formId,
          answers,
          student_id: studentId
      }]);
  },

  getFormSubmissions: async (formId: string) => {
      const { data } = await supabase.from('crm_form_submissions').select('*').eq('form_id', formId).order('created_at', { ascending: false });
      return data || [];
  },

  getSurveys: async (): Promise<SurveyModel[]> => {
    const { data } = await supabase.from('crm_surveys').select('*');
    return data || [];
  },

  saveSurvey: async (survey: SurveyModel) => {
    await supabase.from('crm_surveys').upsert(survey);
  },

  getEligibleSurveysForStudent: async (studentId: string): Promise<SurveyModel[]> => {
      const { data } = await supabase.from('crm_surveys').select('*').eq('is_active', true);
      return data || [];
  },

  getContracts: async (): Promise<Contract[]> => {
    const { data } = await supabase.from('crm_contracts').select('*');
    return data || [];
  },

  saveContract: async (contract: Contract) => {
    await supabase.from('crm_contracts').upsert(contract);
  },

  deleteContract: async (id: string) => {
    await supabase.from('crm_contracts').delete().eq('id', id);
  },

  signContract: async (contractId: string, signerId: string, signatureData: string) => {
      const { data: contract } = await supabase.from('crm_contracts').select('*').eq('id', contractId).single();
      if (!contract) return;
      const signers = contract.signers.map((s: any) => 
          s.id === signerId ? { ...s, status: 'signed', signatureData, signedAt: new Date().toISOString() } : s
      );
      const allSigned = signers.every((s: any) => s.status === 'signed');
      await supabase.from('crm_contracts').update({ signers, status: allSigned ? 'signed' : 'sent' }).eq('id', contractId);
  },

  getFolders: async (): Promise<ContractFolder[]> => {
    const { data } = await supabase.from('crm_contract_folders').select('*');
    return data || [];
  },

  saveFolder: async (folder: ContractFolder) => {
    await supabase.from('crm_contract_folders').upsert(folder);
  },

  deleteFolder: async (id: string) => {
    await supabase.from('crm_contract_folders').delete().eq('id', id);
  },

  getPartnerStudios: async (): Promise<PartnerStudio[]> => {
    const { data } = await supabase.from('crm_partner_studios').select('*');
    return (data || []).map(d => ({
        id: d.id,
        status: d.status,
        responsibleName: d.responsible_name,
        cpf: d.cpf,
        phone: d.phone,
        email: d.email,
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

  savePartnerStudio: async (studio: PartnerStudio) => {
    const payload = {
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
        size_m2: studio.size_m2,
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
    if (studio.id) {
        await supabase.from('crm_partner_studios').update(payload).eq('id', studio.id);
    } else {
        await supabase.from('crm_partner_studios').insert([payload]);
    }
  },

  deletePartnerStudio: async (id: string) => {
    await supabase.from('crm_partner_studios').delete().eq('id', id);
  },

  getCertificates: async (): Promise<CertificateModel[]> => {
    const { data } = await supabase.from('crm_certificates').select('*');
    return (data || []).map(d => ({
        id: d.id,
        title: d.title,
        backgroundData: d.background_data,
        backBackgroundData: d.back_background_data,
        linkedProductId: d.linked_product_id,
        bodyText: d.body_text,
        layoutConfig: d.layout_config,
        createdAt: d.created_at
    }));
  },

  saveCertificate: async (cert: CertificateModel) => {
    const payload = {
        title: cert.title,
        background_data: cert.background_data,
        back_background_data: cert.back_background_data,
        linked_product_id: cert.linked_product_id,
        body_text: cert.body_text,
        layout_config: cert.layout_config,
        created_at: cert.createdAt
    };
    if (cert.id) {
        await supabase.from('crm_certificates').update(payload).eq('id', cert.id);
    } else {
        await supabase.from('crm_certificates').insert([payload]);
    }
  },

  deleteCertificate: async (id: string) => {
    await supabase.from('crm_certificates').delete().eq('id', id);
  },

  issueCertificate: async (studentDealId: string, templateId: string) => {
      const hash = Math.random().toString(36).substring(2, 15);
      await supabase.from('crm_student_certificates').insert([{
          student_deal_id: studentDealId,
          certificate_template_id: templateId,
          hash,
          issued_at: new Date().toISOString()
      }]);
      return hash;
  },

  getStudentCertificate: async (hash: string) => {
      const { data: cert } = await supabase.from('crm_student_certificates').select('*, crm_deals(*)').eq('hash', hash).single();
      if (!cert) return null;
      const { data: template } = await supabase.from('crm_certificates').select('*').eq('id', cert.certificate_template_id).single();
      return {
          studentName: cert.crm_deals.company_name || cert.crm_deals.contact_name,
          studentCity: cert.crm_deals.course_city || 'S/ Cidade',
          template: {
              id: template.id,
              title: template.title,
              backgroundData: template.background_data,
              backBackgroundData: template.back_background_data,
              bodyText: template.body_text,
              layoutConfig: template.layout_config,
              createdAt: template.created_at
          },
          issuedAt: cert.issued_at
      };
  },

  deleteStudentCertificate: async (id: string) => {
      await supabase.from('crm_student_certificates').delete().eq('id', id);
  },

  getInventory: async (): Promise<InventoryRecord[]> => {
    const { data } = await supabase.from('crm_inventory').select('*');
    return (data || []).map(d => ({
        id: d.id,
        type: d.type,
        itemApostilaNova: d.item_apostila_nova,
        itemApostilaClassico: d.item_apostila_classico,
        itemSacochila: d.item_sacochila,
        itemLapis: d.item_lapis,
        registrationDate: d.registration_date,
        studioId: d.studio_id,
        trackingCode: d.tracking_code,
        observations: d.observations,
        conferenceDate: d.conference_date,
        attachments: d.attachments
    }));
  },

  saveInventoryRecord: async (record: InventoryRecord) => {
    const payload = {
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
    };
    if (record.id) {
        await supabase.from('crm_inventory').update(payload).eq('id', record.id);
    } else {
        await supabase.from('crm_inventory').insert([payload]);
    }
  },

  deleteInventoryRecord: async (id: string) => {
    await supabase.from('crm_inventory').delete().eq('id', id);
  },

  getInventorySecurityMargin: async () => {
    const margin = await appBackend.getAppSetting('inventory_security_margin');
    return margin || 5;
  },

  saveInventorySecurityMargin: async (margin: number) => {
    await appBackend.saveAppSetting('inventory_security_margin', margin);
  },

  getAppLogo: async () => {
    return await appBackend.getAppSetting('app_logo');
  },

  saveAppLogo: async (logo: string) => {
    await appBackend.saveAppSetting('app_logo', logo);
  },

  getWhatsAppConfig: async () => {
    return await appBackend.getAppSetting('whatsapp_config');
  },

  saveWhatsAppConfig: async (config: any) => {
    await appBackend.saveAppSetting('whatsapp_config', config);
  },

  getTwilioConfig: async (): Promise<TwilioConfig | null> => {
    return await appBackend.getAppSetting('twilio_config');
  },

  saveTwilioConfig: async (config: TwilioConfig): Promise<void> => {
    await appBackend.saveAppSetting('twilio_config', config);
  },

  getEvents: async (): Promise<EventModel[]> => {
    const { data } = await supabase.from('crm_events').select('*');
    return (data || []).map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        location: d.location,
        dates: d.dates,
        createdAt: d.created_at,
        registrationOpen: d.registration_open
    }));
  },

  saveEvent: async (evt: EventModel) => {
      const payload = {
          name: evt.name,
          description: evt.description,
          location: evt.location,
          dates: evt.dates,
          created_at: evt.createdAt,
          registration_open: evt.registrationOpen
      };
      const { data, error } = await supabase.from('crm_events').upsert(payload).select().single();
      if (error) throw error;
      return {
          id: data.id,
          name: data.name,
          description: data.description,
          location: data.location,
          dates: data.dates,
          createdAt: data.created_at,
          registrationOpen: data.registration_open
      };
  },

  deleteEvent: async (id: string) => {
    await supabase.from('crm_events').delete().eq('id', id);
  },

  getWorkshops: async (eventId: string): Promise<Workshop[]> => {
    const { data } = await supabase.from('crm_event_workshops').select('*').eq('event_id', eventId);
    return (data || []).map(d => ({
        id: d.id,
        eventId: d.event_id,
        blockId: d.block_id,
        title: d.title,
        description: d.description,
        speaker: d.speaker,
        date: d.date,
        time: d.time,
        spots: d.spots
    }));
  },

  saveWorkshop: async (w: Workshop) => {
      const payload = {
          event_id: w.eventId,
          block_id: w.blockId,
          title: w.title,
          description: w.description,
          speaker: w.speaker,
          date: w.date,
          time: w.time,
          spots: w.spots
      };
      const { data, error } = await supabase.from('crm_event_workshops').upsert(payload).select().single();
      if (error) throw error;
      return {
          id: data.id,
          eventId: data.event_id,
          blockId: data.block_id,
          title: data.title,
          description: data.description,
          speaker: data.speaker,
          date: data.date,
          time: data.time,
          spots: data.spots
      };
  },

  deleteWorkshop: async (id: string) => {
    await supabase.from('crm_event_workshops').delete().eq('id', id);
  },

  getBlocks: async (eventId: string): Promise<EventBlock[]> => {
    const { data } = await supabase.from('crm_event_blocks').select('*').eq('event_id', eventId);
    return (data || []).map(d => ({
        id: d.id,
        eventId: d.event_id,
        date: d.date,
        title: d.title,
        max_selections: d.max_selections
    }));
  },

  saveBlock: async (b: EventBlock) => {
      const payload = {
          event_id: b.eventId,
          date: b.date,
          title: b.title,
          max_selections: b.maxSelections
      };
      const { data, error } = await supabase.from('crm_event_blocks').upsert(payload).select().single();
      if (error) throw error;
      return {
          id: data.id,
          eventId: data.event_id,
          date: data.date,
          title: data.title,
          maxSelections: data.max_selections
      };
  },

  deleteBlock: async (id: string) => {
    await supabase.from('crm_event_blocks').delete().eq('id', id);
  },

  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
      const { data } = await supabase.from('crm_event_registrations').select('*').eq('event_id', eventId);
      return (data || []).map(d => ({
          id: d.id,
          eventId: d.event_id,
          workshopId: d.workshop_id,
          studentId: d.student_id,
          studentName: d.student_name,
          studentEmail: d.student_email,
          registeredAt: d.created_at
      }));
  },

  getPipelines: async (): Promise<Pipeline[]> => {
    try {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'crm_pipelines').maybeSingle();
      return data?.value || [
          { id: '1', name: 'Padrão', stages: [
              { id: 'new', title: 'Sem Contato', color: 'border-slate-300' },
              { id: 'contacted', title: 'Contatado', color: 'border-blue-400' },
              { id: 'proposal', title: 'Proposta', color: 'border-yellow-400' },
              { id: 'negotiation', title: 'Negociação', color: 'border-orange-500' },
              { id: 'closed', title: 'Fechado', color: 'border-green-500' }
          ]}
      ];
    } catch (e) { return []; }
  },

  savePipeline: async (pipeline: Pipeline) => {
      const current = await appBackend.getPipelines();
      const updated = current.some(p => p.id === pipeline.id) 
          ? current.map(p => p.id === pipeline.id ? pipeline : p)
          : [...current, pipeline];
      await supabase.from('app_settings').upsert({ key: 'crm_pipelines', value: updated });
  },

  deletePipeline: async (id: string) => {
      const current = await appBackend.getPipelines();
      const updated = current.filter(p => p.id !== id);
      await supabase.from('app_settings').upsert({ key: 'crm_pipelines', value: updated });
  }
};

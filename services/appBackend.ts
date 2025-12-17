import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  SavedPreset, FormModel, FormAnswer, Contract, ContractFolder, 
  ContractSigner, Banner, EventModel, Workshop, EventBlock, 
  EventRegistration, Role, CertificateModel, PartnerStudio, StockMovement 
} from '../types';

// Safely access environment variables to prevent runtime errors if env is missing
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_APP_SUPABASE_URL;
const supabaseKey = env.VITE_APP_SUPABASE_ANON_KEY;

const isConfigured = !!(supabaseUrl && supabaseKey);

const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseKey) 
  : {
      from: () => ({ 
        select: () => ({ 
            eq: () => ({ single: () => Promise.resolve({}) }),
            order: () => Promise.resolve({ data: [], error: null }),
            in: () => Promise.resolve({ data: [], error: null }),
            or: () => Promise.resolve({ data: [], error: null })
        }),
        insert: () => Promise.resolve({ error: null, data: [] }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) })
      }),
      auth: { 
          getSession: () => Promise.resolve({ data: { session: null } }), 
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), 
          signInWithPassword: () => Promise.resolve({}), 
          signOut: () => Promise.resolve({}) 
      },
      storage: { from: () => ({ upload: () => Promise.resolve({}), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) }
    } as unknown as SupabaseClient;

export const appBackend = {
  client: supabase,
  auth: supabase.auth,

  getAppLogo: () => {
      return localStorage.getItem('app_logo');
  },

  // PRESETS
  getPresets: async (): Promise<SavedPreset[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('app_presets').select('*');
      return data || [];
  },
  savePreset: async (preset: SavedPreset) => {
      const { data, error } = await supabase.from('app_presets').insert([preset]).select().single();
      if (error) throw error;
      return data;
  },
  deletePreset: async (id: string) => {
      const { error } = await supabase.from('app_presets').delete().eq('id', id);
      if (error) throw error;
  },

  // FORMS
  getForms: async (): Promise<FormModel[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_forms').select('*').order('created_at', { ascending: false });
      return (data || []).map((f: any) => ({
          ...f,
          questions: f.questions || [],
          style: f.style || { backgroundType: 'color', backgroundColor: '#f1f5f9' },
          submissionsCount: 0 // Mock for now or fetch count
      }));
  },
  getFormById: async (id: string): Promise<FormModel | null> => {
      const { data, error } = await supabase.from('crm_forms').select('*').eq('id', id).single();
      if (error || !data) return null;
      return { ...data, questions: data.questions || [] };
  },
  saveForm: async (form: FormModel) => {
      if (form.id && form.id.length > 10) { // Check if UUID-ish
          // Check if exists first to decide insert/update, or use upsert
          const { error } = await supabase.from('crm_forms').upsert({
              id: form.id,
              title: form.title,
              description: form.description,
              is_lead_capture: form.isLeadCapture,
              questions: form.questions,
              style: form.style,
              created_at: form.createdAt
          });
          if (error) throw error;
      }
  },
  deleteForm: async (id: string) => {
      await supabase.from('crm_forms').delete().eq('id', id);
  },
  submitForm: async (formId: string, answers: FormAnswer[], isLeadCapture: boolean) => {
      // Save submission
      await supabase.from('crm_form_submissions').insert({
          form_id: formId,
          answers: answers
      });

      if (isLeadCapture) {
          // Extract contact info
          const nameQ = answers.find(a => a.questionTitle.toLowerCase().includes('nome'))?.value;
          const emailQ = answers.find(a => a.questionTitle.toLowerCase().includes('email'))?.value;
          const phoneQ = answers.find(a => a.questionTitle.toLowerCase().includes('telefone') || a.questionTitle.toLowerCase().includes('whatsapp'))?.value;
          const companyQ = answers.find(a => a.questionTitle.toLowerCase().includes('empresa'))?.value;

          if (nameQ) {
              await supabase.from('crm_deals').insert({
                  title: nameQ,
                  contact_name: nameQ,
                  company_name: companyQ || nameQ,
                  email: emailQ,
                  phone: phoneQ,
                  stage: 'new',
                  source: 'Formulário',
                  value: 0
              });
          }
      }
  },

  // CONTRACTS
  getContracts: async (): Promise<Contract[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_contracts').select('*').order('created_at', { ascending: false });
      return (data || []).map((c: any) => ({
          ...c,
          contractDate: c.contract_date,
          folderId: c.folder_id,
          createdAt: c.created_at,
          signers: c.signers || []
      }));
  },
  getContractById: async (id: string): Promise<Contract | null> => {
      const { data } = await supabase.from('crm_contracts').select('*').eq('id', id).single();
      if (!data) return null;
      return {
          ...data,
          contractDate: data.contract_date,
          folderId: data.folder_id,
          createdAt: data.created_at,
          signers: data.signers || []
      };
  },
  saveContract: async (contract: Contract) => {
      const payload = {
          id: contract.id,
          title: contract.title,
          content: contract.content,
          city: contract.city,
          contract_date: contract.contractDate,
          status: contract.status,
          signers: contract.signers,
          folder_id: contract.folderId,
          created_at: contract.createdAt
      };
      const { error } = await supabase.from('crm_contracts').upsert(payload);
      if (error) throw error;
  },
  deleteContract: async (id: string) => {
      await supabase.from('crm_contracts').delete().eq('id', id);
  },
  signContract: async (contractId: string, signerId: string, signatureData: string) => {
      // 1. Get contract
      const { data } = await supabase.from('crm_contracts').select('signers').eq('id', contractId).single();
      if (!data) throw new Error("Contract not found");
      
      const signers = data.signers as ContractSigner[];
      const updatedSigners = signers.map(s => {
          if (s.id === signerId) {
              return { ...s, status: 'signed', signatureData, signedAt: new Date().toISOString() };
          }
          return s;
      });

      const allSigned = updatedSigners.every((s: any) => s.status === 'signed');
      const status = allSigned ? 'signed' : 'sent';

      await supabase.from('crm_contracts').update({ signers: updatedSigners, status }).eq('id', contractId);
  },

  // FOLDERS
  getFolders: async (): Promise<ContractFolder[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_contract_folders').select('*');
      return (data || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          createdAt: f.created_at
      }));
  },
  saveFolder: async (folder: ContractFolder) => {
      await supabase.from('crm_contract_folders').insert({
          id: folder.id,
          name: folder.name,
          created_at: folder.createdAt
      });
  },
  deleteFolder: async (id: string) => {
      await supabase.from('crm_contract_folders').delete().eq('id', id);
  },

  // ROLES
  getRoles: async (): Promise<Role[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_roles').select('*');
      return data || [];
  },

  // EVENTS
  getEvents: async (): Promise<EventModel[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_events').select('*').order('created_at', { ascending: false });
      return (data || []).map((e: any) => ({
          id: e.id,
          name: e.name,
          description: e.description,
          location: e.location,
          dates: e.dates || [],
          registrationOpen: e.registration_open,
          createdAt: e.created_at
      }));
  },
  saveEvent: async (event: EventModel) => {
      const payload = {
          id: event.id,
          name: event.name,
          description: event.description,
          location: event.location,
          dates: event.dates,
          registration_open: event.registrationOpen,
          created_at: event.createdAt
      };
      const { data, error } = await supabase.from('crm_events').upsert(payload).select().single();
      if (error) throw error;
      return {
          id: data.id,
          name: data.name,
          description: data.description,
          location: data.location,
          dates: data.dates || [],
          registrationOpen: data.registration_open,
          createdAt: data.created_at
      };
  },
  deleteEvent: async (id: string) => {
      await supabase.from('crm_events').delete().eq('id', id);
  },

  // WORKSHOPS
  getWorkshops: async (eventId: string): Promise<Workshop[]> => {
      const { data } = await supabase.from('crm_workshops').select('*').eq('event_id', eventId);
      return (data || []).map((w: any) => ({
          id: w.id,
          eventId: w.event_id,
          blockId: w.block_id,
          title: w.title,
          description: w.description,
          speaker: w.speaker,
          date: w.date,
          time: w.time,
          spots: w.spots
      }));
  },
  saveWorkshop: async (w: Workshop) => {
      const payload = {
          id: w.id,
          event_id: w.eventId,
          block_id: w.blockId,
          title: w.title,
          description: w.description,
          speaker: w.speaker,
          date: w.date,
          time: w.time,
          spots: w.spots
      };
      const { data, error } = await supabase.from('crm_workshops').upsert(payload).select().single();
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
      await supabase.from('crm_workshops').delete().eq('id', id);
  },

  // BLOCKS
  getBlocks: async (eventId: string): Promise<EventBlock[]> => {
      const { data } = await supabase.from('crm_event_blocks').select('*').eq('event_id', eventId);
      return (data || []).map((b: any) => ({
          id: b.id,
          eventId: b.event_id,
          date: b.date,
          title: b.title,
          maxSelections: b.max_selections
      }));
  },
  saveBlock: async (b: EventBlock) => {
      const payload = {
          id: b.id,
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

  // REGISTRATIONS
  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
      const { data } = await supabase.from('crm_event_registrations').select('*').eq('event_id', eventId);
      return (data || []).map((r: any) => ({
          id: r.id,
          eventId: r.event_id,
          workshopId: r.workshop_id,
          studentId: r.student_id,
          studentName: r.student_name,
          studentEmail: r.student_email,
          registeredAt: r.created_at
      }));
  },
  saveEventRegistrations: async (eventId: string, studentId: string, studentName: string, studentEmail: string, workshopIds: string[]) => {
      // 1. Delete existing for this student in this event
      await supabase.from('crm_event_registrations').delete().eq('event_id', eventId).eq('student_id', studentId);
      
      // 2. Insert new
      const rows = workshopIds.map(wid => ({
          event_id: eventId,
          workshop_id: wid,
          student_id: studentId,
          student_name: studentName,
          student_email: studentEmail
      }));
      if (rows.length > 0) {
          const { error } = await supabase.from('crm_event_registrations').insert(rows);
          if (error) throw error;
      }
  },

  // CERTIFICATES
  getCertificates: async (): Promise<CertificateModel[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_certificates').select('*');
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
  saveCertificate: async (cert: CertificateModel) => {
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
      const { error } = await supabase.from('crm_certificates').upsert(payload);
      if (error) throw error;
  },
  deleteCertificate: async (id: string) => {
      await supabase.from('crm_certificates').delete().eq('id', id);
  },
  issueCertificate: async (studentDealId: string, templateId: string): Promise<string> => {
      const hash = crypto.randomUUID().substring(0, 8).toUpperCase();
      const { error } = await supabase.from('crm_student_certificates').insert({
          student_deal_id: studentDealId,
          certificate_template_id: templateId,
          hash: hash,
          issued_at: new Date().toISOString()
      });
      if (error) throw error;
      return hash;
  },
  getStudentCertificate: async (hash: string) => {
      const { data: cert, error } = await supabase
          .from('crm_student_certificates')
          .select('*, crm_deals(contact_name, class_mod_1, class_mod_2), crm_certificates(*)')
          .eq('hash', hash)
          .single();
      
      if (error || !cert) return null;

      // Fetch class info to get City if needed
      // Logic simplified: assume student has city in deal or class
      
      return {
          studentName: cert.crm_deals?.contact_name || 'Aluno',
          studentCity: 'Cidade do Curso', // Placeholder, ideally fetch from Class linked to Deal
          template: {
              id: cert.crm_certificates.id,
              title: cert.crm_certificates.title,
              backgroundData: cert.crm_certificates.background_data,
              backBackgroundData: cert.crm_certificates.back_background_data,
              bodyText: cert.crm_certificates.body_text,
              layoutConfig: cert.crm_certificates.layout_config,
              linkedProductId: cert.crm_certificates.linked_product_id,
              createdAt: cert.crm_certificates.created_at
          } as CertificateModel,
          issuedAt: cert.issued_at
      };
  },
  deleteStudentCertificate: async (id: string) => {
      await supabase.from('crm_student_certificates').delete().eq('id', id);
  },

  // BANNERS
  getBanners: async (target: string): Promise<Banner[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase
          .from('app_banners')
          .select('*')
          .eq('active', true)
          .eq('target_audience', target)
          .order('created_at', { ascending: false });
      return (data || []).map((b: any) => ({
          id: b.id,
          title: b.title,
          imageUrl: b.image_url,
          linkUrl: b.link_url,
          targetAudience: b.target_audience,
          active: b.active,
          createdAt: b.created_at
      }));
  },

  // PARTNER STUDIOS
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
          hasReformer: s.has_reformer,
          qtyReformer: s.qty_reformer,
          hasLadderBarrel: s.has_ladder_barrel,
          qtyLadderBarrel: s.qty_ladder_barrel,
          hasChair: s.has_chair,
          qtyChair: s.qty_chair,
          hasCadillac: s.has_cadillac,
          qtyCadillac: s.qty_cadillac,
          hasChairsForCourse: s.has_chairs_for_course,
          hasTv: s.has_tv,
          maxKitsCapacity: s.max_kits_capacity,
          attachments: s.attachments
      }));
  },
  savePartnerStudio: async (s: PartnerStudio) => {
      const payload = {
          id: s.id || crypto.randomUUID(),
          status: s.status,
          responsible_name: s.responsibleName,
          cpf: s.cpf,
          phone: s.phone,
          email: s.email,
          second_contact_name: s.secondContactName,
          second_contact_phone: s.secondContactPhone,
          fantasy_name: s.fantasyName,
          legal_name: s.legalName,
          cnpj: s.cnpj,
          studio_phone: s.studioPhone,
          address: s.address,
          city: s.city,
          state: s.state,
          country: s.country,
          size_m2: s.sizeM2,
          student_capacity: s.studentCapacity,
          rent_value: s.rentValue,
          methodology: s.methodology,
          studio_type: s.studioType,
          name_on_site: s.nameOnSite,
          bank: s.bank,
          agency: s.agency,
          account: s.account,
          beneficiary: s.beneficiary,
          pix_key: s.pixKey,
          has_reformer: s.hasReformer,
          qty_reformer: s.qtyReformer,
          has_ladder_barrel: s.hasLadderBarrel,
          qty_ladder_barrel: s.qtyLadderBarrel,
          has_chair: s.hasChair,
          qty_chair: s.qtyChair,
          has_cadillac: s.hasCadillac,
          qty_cadillac: s.qtyCadillac,
          has_chairs_for_course: s.hasChairsForCourse,
          has_tv: s.hasTv,
          max_kits_capacity: s.maxKitsCapacity,
          attachments: s.attachments
      };
      const { error } = await supabase.from('crm_partner_studios').upsert(payload);
      if (error) throw error;
  },
  deletePartnerStudio: async (id: string) => {
      await supabase.from('crm_partner_studios').delete().eq('id', id);
  },

  // STOCK
  getStockMovements: async (): Promise<StockMovement[]> => {
    if (!isConfigured) return [];
    
    const { data, error } = await supabase
      .from('crm_stock_movements')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error("Error fetching stock:", error);
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      type: d.type,
      date: d.date,
      conferenceDate: d.conference_date,
      items: d.items, // JSONB
      partnerStudioId: d.partner_studio_id,
      partnerStudioName: d.partner_studio_name,
      trackingCode: d.tracking_code,
      observations: d.observations,
      attachments: d.attachments,
      createdAt: d.created_at
    }));
  },

  saveStockMovement: async (movement: StockMovement): Promise<void> => {
    if (!isConfigured) throw new Error("Backend not configured");

    const payload = {
      type: movement.type,
      date: movement.date,
      conference_date: movement.conferenceDate || null,
      items: movement.items, // JSONB
      partner_studio_id: movement.partnerStudioId || null,
      partner_studio_name: movement.partnerStudioName || null,
      tracking_code: movement.trackingCode,
      observations: movement.observations,
      attachments: movement.attachments
    };

    if (movement.id) {
        const { error } = await supabase.from('crm_stock_movements').update(payload).eq('id', movement.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('crm_stock_movements').insert([payload]);
        if (error) throw error;
    }
  },

  deleteStockMovement: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_stock_movements').delete().eq('id', id);
    if (error) throw error;
  }
};
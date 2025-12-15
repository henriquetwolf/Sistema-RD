
import { createClient, Session } from '@supabase/supabase-js';
import { SavedPreset, FormModel, FormSubmission, FormAnswer, Contract, ContractFolder, CertificateModel, StudentCertificate, EventModel, Workshop, EventRegistration } from '../types';

// Credentials for the App's backend (where presets are stored)
// We rely on Environment Variables.
const APP_URL = (import.meta as any).env?.VITE_APP_SUPABASE_URL;
const APP_KEY = (import.meta as any).env?.VITE_APP_SUPABASE_ANON_KEY;

const isConfigured = !!APP_URL && !!APP_KEY;

// Prevent crash if env vars are missing, but requests will fail if used.
const supabase = createClient(
  APP_URL || 'https://placeholder.supabase.co', 
  APP_KEY || 'placeholder'
);

const TABLE_NAME = 'app_presets';

// MOCK SESSION FOR LOCAL MODE
const MOCK_SESSION = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
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
  // Public flag to check if we are in local mode
  isLocalMode: !isConfigured,
  
  // Expose the raw client for custom tables (like CRM)
  client: supabase,

  auth: {
    signIn: async (email: string, password: string) => {
      if (!isConfigured) {
        // In local mode, we accept any login or simply rely on getSession returning true
        return { data: { user: MOCK_SESSION.user, session: MOCK_SESSION }, error: null };
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    },
    signUp: async (email: string, password: string) => {
      if (!isConfigured) throw new Error("Backend not configured.");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      return data;
    },
    signOut: async () => {
      if (!isConfigured) {
        // In local mode, just reload to 'reset' state, although we will auto-login again.
        window.location.reload(); 
        return;
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    getSession: async () => {
      if (!isConfigured) {
          return MOCK_SESSION as unknown as Session;
      }
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    onAuthStateChange: (callback: (session: Session | null) => void) => {
      if (!isConfigured) {
          callback(MOCK_SESSION as unknown as Session);
          return { data: { subscription: { unsubscribe: () => {} } } };
      }
      return supabase.auth.onAuthStateChange((_event, session) => {
        callback(session);
      });
    }
  },

  /**
   * Fetch all saved presets from Supabase or LocalStorage
   */
  getPresets: async (): Promise<SavedPreset[]> => {
    if (!isConfigured) {
        const local = localStorage.getItem('csv_syncer_presets');
        return local ? JSON.parse(local) : [];
    }
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching presets:', error);
      throw error;
    }

    // Map database snake_case to app camelCase
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      url: row.project_url,
      key: row.api_key,
      tableName: row.target_table_name,
      primaryKey: row.target_primary_key || '',
      intervalMinutes: row.interval_minutes || 5, // Map from DB
    }));
  },

  /**
   * Save a new preset to Supabase or LocalStorage
   */
  savePreset: async (preset: Omit<SavedPreset, 'id'>): Promise<SavedPreset> => {
    if (!isConfigured) {
        const local = JSON.parse(localStorage.getItem('csv_syncer_presets') || '[]');
        const newPreset = { ...preset, id: crypto.randomUUID() };
        // Add to beginning
        const updated = [newPreset, ...local];
        localStorage.setItem('csv_syncer_presets', JSON.stringify(updated));
        return newPreset as SavedPreset;
    }
    
    // Get current user to ensure user_id is set for RLS policies
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      user_id: user?.id, // Explicitly adding user_id
      name: preset.name,
      project_url: preset.url,
      api_key: preset.key,
      target_table_name: preset.tableName,
      target_primary_key: preset.primaryKey || null,
      interval_minutes: preset.intervalMinutes || 5, // Save to DB
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error saving preset:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      url: data.project_url,
      key: data.api_key,
      tableName: data.target_table_name,
      primaryKey: data.target_primary_key || '',
      intervalMinutes: data.interval_minutes || 5,
    };
  },

  /**
   * Delete a preset by ID
   */
  deletePreset: async (id: string): Promise<void> => {
    if (!isConfigured) {
        const local = JSON.parse(localStorage.getItem('csv_syncer_presets') || '[]');
        const updated = local.filter((p: any) => p.id !== id);
        localStorage.setItem('csv_syncer_presets', JSON.stringify(updated));
        return;
    }

    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting preset:', error);
      throw error;
    }
  },

  // --- APP SETTINGS (LOGO) ---
  getAppLogo: (): string | null => {
      return localStorage.getItem('app_logo_url');
  },

  saveAppLogo: (url: string) => {
      localStorage.setItem('app_logo_url', url);
  },

  // --- FORMS & CRM LOGIC (MOCKED BACKEND FOR FORMS, REAL FOR CRM) ---
  
  saveForm: async (form: FormModel): Promise<void> => {
      // Simulating DB save in localStorage for forms
      const forms = JSON.parse(localStorage.getItem('app_forms') || '[]');
      const existingIdx = forms.findIndex((f: FormModel) => f.id === form.id);
      
      if (existingIdx >= 0) {
          forms[existingIdx] = form;
      } else {
          forms.push(form);
      }
      
      localStorage.setItem('app_forms', JSON.stringify(forms));
  },

  getForms: async (): Promise<FormModel[]> => {
      return JSON.parse(localStorage.getItem('app_forms') || '[]');
  },

  // New method to fetch a single form
  getFormById: async (id: string): Promise<FormModel | null> => {
      const forms = JSON.parse(localStorage.getItem('app_forms') || '[]');
      return forms.find((f: FormModel) => f.id === id) || null;
  },

  deleteForm: async (id: string): Promise<void> => {
      const forms = JSON.parse(localStorage.getItem('app_forms') || '[]');
      const filtered = forms.filter((f: FormModel) => f.id !== id);
      localStorage.setItem('app_forms', JSON.stringify(filtered));
  },

  submitForm: async (formId: string, answers: FormAnswer[], isLeadCapture: boolean): Promise<void> => {
      // 1. Save submission locally
      const submission: FormSubmission = {
          id: crypto.randomUUID(),
          formId,
          answers,
          submittedAt: new Date().toISOString()
      };

      const submissionsKey = `app_forms_subs_${formId}`;
      const subs = JSON.parse(localStorage.getItem(submissionsKey) || '[]');
      subs.push(submission);
      localStorage.setItem(submissionsKey, JSON.stringify(subs));

      // Update form count
      const forms = JSON.parse(localStorage.getItem('app_forms') || '[]');
      const formIdx = forms.findIndex((f: FormModel) => f.id === formId);
      if (formIdx >= 0) {
          forms[formIdx].submissionsCount = (forms[formIdx].submissionsCount || 0) + 1;
          localStorage.setItem('app_forms', JSON.stringify(forms));
      }

      // 2. LEAD CAPTURE TO CRM
      if (isLeadCapture && isConfigured) {
          // Heuristic to find relevant fields
          const findValue = (keywords: string[]) => {
              const answer = answers.find(a => 
                  keywords.some(k => a.questionTitle.toLowerCase().includes(k))
              );
              return answer ? answer.value : '';
          };

          const name = findValue(['nome', 'name', 'completo']);
          const email = findValue(['email', 'e-mail', 'correio']);
          const phone = findValue(['telefone', 'celular', 'whatsapp', 'fone']);
          const company = findValue(['empresa', 'organização', 'companhia', 'loja']);
          
          if (name) {
              const payload = {
                  title: `Lead: ${name}`,
                  contact_name: name,
                  company_name: company || 'Particular',
                  value: 0,
                  status: 'warm',
                  stage: 'new',
                  next_task: `Entrar em contato (${email || phone || 'sem dados'})`,
                  created_at: new Date().toISOString()
              };

              // Insert directly into CRM table
              const { error } = await supabase.from('crm_deals').insert([payload]);
              if (error) {
                  console.error("Failed to create lead in CRM:", error);
                  // We don't throw here to avoid blocking the user form success message
              }
          }
      }
  },

  // --- CONTRACTS & FOLDERS (SUPABASE INTEGRATION) ---
  
  getFolders: async (): Promise<ContractFolder[]> => {
      if (!isConfigured) return JSON.parse(localStorage.getItem('app_contract_folders') || '[]');

      const { data, error } = await supabase
          .from('app_contract_folders')
          .select('*')
          .order('created_at', { ascending: false });
      
      if (error) {
          console.error("Error fetching folders:", error);
          return [];
      }

      return data.map((d: any) => ({
          id: d.id,
          name: d.name,
          createdAt: d.created_at
      }));
  },

  saveFolder: async (folder: ContractFolder): Promise<void> => {
      if (!isConfigured) {
          const folders = JSON.parse(localStorage.getItem('app_contract_folders') || '[]');
          folders.push(folder);
          localStorage.setItem('app_contract_folders', JSON.stringify(folders));
          return;
      }

      const payload = {
          id: folder.id, // Ensure ID is passed if it's an update, or random UUID from frontend
          name: folder.name
      };

      const { error } = await supabase.from('app_contract_folders').upsert(payload);
      if (error) throw error;
  },

  deleteFolder: async (id: string): Promise<void> => {
      if (!isConfigured) {
          const folders = JSON.parse(localStorage.getItem('app_contract_folders') || '[]');
          const filtered = folders.filter((f: ContractFolder) => f.id !== id);
          localStorage.setItem('app_contract_folders', JSON.stringify(filtered));
          // Move contracts
          const contracts = await appBackend.getContracts();
          const updatedContracts = contracts.map(c => c.folderId === id ? { ...c, folderId: null } : c);
          localStorage.setItem('app_contracts', JSON.stringify(updatedContracts));
          return;
      }

      const { error } = await supabase.from('app_contract_folders').delete().eq('id', id);
      if (error) throw error;
  },

  getContracts: async (): Promise<Contract[]> => {
      if (!isConfigured) return JSON.parse(localStorage.getItem('app_contracts') || '[]');

      const { data, error } = await supabase
          .from('app_contracts')
          .select('*')
          .order('created_at', { ascending: false });

      if (error) {
          console.error("Error fetching contracts:", error);
          return [];
      }

      return data.map((d: any) => ({
          id: d.id,
          title: d.title,
          content: d.content,
          city: d.city,
          contractDate: d.contract_date,
          status: d.status,
          folderId: d.folder_id,
          signers: d.signers || [], // JSONB array
          createdAt: d.created_at
      }));
  },

  getContractById: async (id: string): Promise<Contract | null> => {
      if (!isConfigured) {
          const contracts = JSON.parse(localStorage.getItem('app_contracts') || '[]');
          return contracts.find((c: Contract) => c.id === id) || null;
      }

      const { data, error } = await supabase
          .from('app_contracts')
          .select('*')
          .eq('id', id)
          .single();

      if (error || !data) return null;

      return {
          id: data.id,
          title: data.title,
          content: data.content,
          city: data.city,
          contractDate: data.contract_date,
          status: data.status,
          folderId: data.folder_id,
          signers: data.signers || [],
          createdAt: data.created_at
      };
  },

  saveContract: async (contract: Contract): Promise<void> => {
      if (!isConfigured) {
          const contracts = JSON.parse(localStorage.getItem('app_contracts') || '[]');
          const idx = contracts.findIndex((c: Contract) => c.id === contract.id);
          if (idx >= 0) contracts[idx] = contract;
          else contracts.push(contract);
          localStorage.setItem('app_contracts', JSON.stringify(contracts));
          return;
      }

      const payload = {
          id: contract.id,
          title: contract.title,
          content: contract.content,
          city: contract.city,
          contract_date: contract.contractDate,
          status: contract.status,
          folder_id: contract.folderId || null,
          signers: contract.signers // Will be converted to JSONB automatically
      };

      const { error } = await supabase.from('app_contracts').upsert(payload);
      if (error) throw error;
  },

  deleteContract: async (id: string): Promise<void> => {
      if (!isConfigured) {
          const contracts = JSON.parse(localStorage.getItem('app_contracts') || '[]');
          const filtered = contracts.filter((c: Contract) => c.id !== id);
          localStorage.setItem('app_contracts', JSON.stringify(filtered));
          return;
      }

      const { error } = await supabase.from('app_contracts').delete().eq('id', id);
      if (error) throw error;
  },

  signContract: async (contractId: string, signerId: string, signatureBase64: string): Promise<void> => {
      // 1. Get Current Contract State
      const contract = await appBackend.getContractById(contractId);
      if (!contract) throw new Error("Contrato não encontrado.");

      // 2. Find and Update Signer
      const signerIdx = contract.signers.findIndex(s => s.id === signerId);
      if (signerIdx === -1) throw new Error("Signatário não encontrado.");

      contract.signers[signerIdx].status = 'signed';
      contract.signers[signerIdx].signatureData = signatureBase64;
      contract.signers[signerIdx].signedAt = new Date().toISOString();

      // 3. Check Overall Status
      const allSigned = contract.signers.every(s => s.status === 'signed');
      if (allSigned) {
          contract.status = 'signed';
      }

      // 4. Save Updates
      await appBackend.saveContract(contract);
  },

  // --- CERTIFICATES ---

  getCertificates: async (): Promise<CertificateModel[]> => {
    if (!isConfigured) return JSON.parse(localStorage.getItem('app_certificates') || '[]');

    const { data, error } = await supabase
      .from('crm_certificates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching certificates:", error);
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      title: d.title,
      backgroundData: d.background_base64,
      backBackgroundData: d.back_background_base64,
      linkedProductId: d.linked_product_id,
      bodyText: d.body_text,
      layoutConfig: d.layout_config, // Map layout config
      createdAt: d.created_at
    }));
  },

  saveCertificate: async (cert: CertificateModel): Promise<void> => {
    if (!isConfigured) {
      const certs = JSON.parse(localStorage.getItem('app_certificates') || '[]');
      const idx = certs.findIndex((c: CertificateModel) => c.id === cert.id);
      if (idx >= 0) certs[idx] = cert;
      else certs.push(cert);
      localStorage.setItem('app_certificates', JSON.stringify(certs));
      return;
    }

    const payload = {
      id: cert.id,
      title: cert.title,
      background_base64: cert.backgroundData,
      back_background_base64: cert.backBackgroundData,
      linked_product_id: cert.linkedProductId || null,
      body_text: cert.bodyText,
      layout_config: cert.layoutConfig // Save layout config
    };

    const { error } = await supabase.from('crm_certificates').upsert(payload);
    if (error) throw error;
  },

  deleteCertificate: async (id: string): Promise<void> => {
    if (!isConfigured) {
      const certs = JSON.parse(localStorage.getItem('app_certificates') || '[]');
      const filtered = certs.filter((c: CertificateModel) => c.id !== id);
      localStorage.setItem('app_certificates', JSON.stringify(filtered));
      return;
    }

    const { error } = await supabase.from('crm_certificates').delete().eq('id', id);
    if (error) throw error;
  },

  issueCertificate: async (studentDealId: string, certificateTemplateId: string): Promise<string> => {
    if (!isConfigured) throw new Error("Backend not configured for certificates.");

    const hash = crypto.randomUUID();
    const payload = {
      student_deal_id: studentDealId,
      certificate_template_id: certificateTemplateId,
      hash: hash,
      issued_at: new Date().toISOString()
    };

    const { error } = await supabase.from('crm_student_certificates').insert([payload]);
    if (error) throw error;
    
    return hash;
  },

  deleteStudentCertificate: async (id: string): Promise<void> => {
    if (!isConfigured) throw new Error("Backend not configured.");
    const { error } = await supabase.from('crm_student_certificates').delete().eq('id', id);
    if (error) throw error;
  },

  getStudentCertificate: async (hash: string): Promise<StudentCertificate & { studentName: string, studentCity: string, template: CertificateModel } | null> => {
    if (!isConfigured) return null;

    // Fetch the certificate record
    const { data: certData, error: certError } = await supabase
      .from('crm_student_certificates')
      .select('*')
      .eq('hash', hash)
      .single();

    if (certError || !certData) return null;

    // Fetch Student Info (Deal)
    // NOTE: 'company_name' is mapped to "Nome Completo do Cliente" in the CRM
    const { data: dealData } = await supabase
      .from('crm_deals')
      .select('contact_name, company_name, course_city')
      .eq('id', certData.student_deal_id)
      .single();

    // Fetch Template
    const { data: templateData } = await supabase
      .from('crm_certificates')
      .select('*')
      .eq('id', certData.certificate_template_id)
      .single();

    if (!dealData || !templateData) return null;

    return {
      id: certData.id,
      studentDealId: certData.student_deal_id,
      certificateTemplateId: certData.certificate_template_id,
      hash: certData.hash,
      issuedAt: certData.issued_at,
      studentName: dealData.company_name || dealData.contact_name, // Prefer Full Name (Company Name in CRM logic)
      studentCity: dealData.course_city || 'Local',
      template: {
        id: templateData.id,
        title: templateData.title,
        backgroundData: templateData.background_base64,
        backBackgroundData: templateData.back_background_base64,
        linkedProductId: templateData.linked_product_id,
        bodyText: templateData.body_text,
        layoutConfig: templateData.layout_config, // Map Layout
        createdAt: templateData.created_at
      }
    };
  },

  // --- EVENTS & WORKSHOPS ---

  getEvents: async (): Promise<EventModel[]> => {
    if (!isConfigured) return [];
    
    const { data, error } = await supabase
      .from('crm_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching events:", error);
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      location: d.location,
      dates: d.dates || [],
      createdAt: d.created_at
    }));
  },

  saveEvent: async (event: EventModel): Promise<EventModel> => {
    if (!isConfigured) throw new Error("Backend not configured");

    const payload = {
      id: event.id,
      name: event.name,
      location: event.location,
      dates: event.dates
    };

    const { data, error } = await supabase
      .from('crm_events')
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      location: data.location,
      dates: data.dates || [],
      createdAt: data.created_at
    };
  },

  deleteEvent: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_events').delete().eq('id', id);
    if (error) throw error;
  },

  getWorkshops: async (eventId: string): Promise<Workshop[]> => {
    if (!isConfigured) return [];

    const { data, error } = await supabase
      .from('crm_workshops')
      .select('*')
      .eq('event_id', eventId)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      console.error("Error fetching workshops:", error);
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      eventId: d.event_id,
      title: d.title,
      speaker: d.speaker,
      date: d.date,
      time: d.time,
      spots: d.spots
    }));
  },

  saveWorkshop: async (workshop: Workshop): Promise<Workshop> => {
    if (!isConfigured) throw new Error("Backend not configured");

    const payload = {
      id: workshop.id,
      event_id: workshop.eventId,
      title: workshop.title,
      speaker: workshop.speaker,
      date: workshop.date,
      time: workshop.time,
      spots: workshop.spots
    };

    const { data, error } = await supabase
      .from('crm_workshops')
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      eventId: data.event_id,
      title: data.title,
      speaker: data.speaker,
      date: data.date,
      time: data.time,
      spots: data.spots
    };
  },

  deleteWorkshop: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_workshops').delete().eq('id', id);
    if (error) throw error;
  },

  // --- EVENT REGISTRATIONS (NEW) ---

  // Get all registrations for an event (useful for admin and calculating spots)
  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
    if (!isConfigured) return [];

    const { data, error } = await supabase
      .from('crm_event_registrations')
      .select('*')
      .eq('event_id', eventId);

    if (error) {
      console.error("Error fetching event registrations:", error);
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      eventId: d.event_id,
      workshopId: d.workshop_id,
      studentId: d.student_id,
      studentName: d.student_name,
      studentEmail: d.student_email,
      registeredAt: d.created_at
    }));
  },

  // Save multiple registrations for a student at once (clearing previous ones for this event to avoid duplicates)
  saveEventRegistrations: async (eventId: string, studentId: string, studentName: string, studentEmail: string, workshopIds: string[]): Promise<void> => {
    if (!isConfigured) throw new Error("Backend not configured");

    // 1. Delete existing registrations for this student in this event
    const { error: deleteError } = await supabase
      .from('crm_event_registrations')
      .delete()
      .eq('event_id', eventId)
      .eq('student_id', studentId);

    if (deleteError) throw deleteError;

    // 2. Insert new registrations
    if (workshopIds.length > 0) {
      const payload = workshopIds.map(wId => ({
        event_id: eventId,
        workshop_id: wId,
        student_id: studentId,
        student_name: studentName,
        student_email: studentEmail
      }));

      const { error: insertError } = await supabase
        .from('crm_event_registrations')
        .insert(payload);

      if (insertError) throw insertError;
    }
  }
};

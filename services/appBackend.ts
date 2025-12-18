
import { createClient, Session } from '@supabase/supabase-js';
/* Fix: Removed FormSubmission which is not exported from types.ts */
import { SavedPreset, FormModel, FormAnswer, Contract, ContractFolder, CertificateModel, StudentCertificate, EventModel, Workshop, EventRegistration, EventBlock, Role, Banner, PartnerStudio, InstructorLevel } from '../types';

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

export interface CompanySetting {
    id: string;
    legalName: string;
    cnpj: string;
    productTypes: string[]; // Array of types linked to this CNPJ
}

// Private helper to generate deal number pattern
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
      /* Fix: Property name in Omit<SavedPreset, "id"> is intervalMinutes, not interval_minutes */
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

  // --- APP SETTINGS (LOGO & COMPANY) ---
  getAppLogo: (): string | null => {
      return localStorage.getItem('app_logo_url');
  },

  saveAppLogo: (url: string) => {
      localStorage.setItem('app_logo_url', url);
  },

  // Company Settings (Multi-Company)
  getCompanies: async (): Promise<CompanySetting[]> => {
      if (!isConfigured) {
          const data = localStorage.getItem('app_companies_list');
          return data ? JSON.parse(data) : [];
      }

      const { data, error } = await supabase
          .from('crm_companies')
          .select('*')
          .order('created_at', { ascending: true });
      
      if (error || !data) return JSON.parse(localStorage.getItem('app_companies_list') || '[]');

      return data.map((c: any) => ({
          id: c.id,
          legalName: c.legal_name,
          cnpj: c.cnpj,
          productTypes: c.product_types || []
      }));
  },

  saveCompany: async (company: CompanySetting): Promise<void> => {
      if (!isConfigured) {
          const companies = JSON.parse(localStorage.getItem('app_companies_list') || '[]');
          const idx = companies.findIndex((c: CompanySetting) => c.id === company.id);
          if (idx >= 0) companies[idx] = company;
          else companies.push({ ...company, id: company.id || crypto.randomUUID() });
          localStorage.setItem('app_companies_list', JSON.stringify(companies));
          return;
      }

      const payload = {
          id: company.id || undefined, // undefined to let DB generate UUID if new
          legal_name: company.legalName,
          cnpj: company.cnpj,
          product_types: company.productTypes
      };

      const { error } = await supabase.from('crm_companies').upsert(payload);
      if (error) throw error;
  },

  deleteCompany: async (id: string): Promise<void> => {
      if (!isConfigured) {
          const companies = JSON.parse(localStorage.getItem('app_companies_list') || '[]');
          const filtered = companies.filter((c: CompanySetting) => c.id !== id);
          localStorage.setItem('app_companies_list', JSON.stringify(filtered));
          return;
      }
      const { error } = await supabase.from('crm_companies').delete().eq('id', id);
      if (error) throw error;
  },

  // --- ROLES & PERMISSIONS ---

  getRoles: async (): Promise<Role[]> => {
    if (!isConfigured) return [];
    
    const { data, error } = await supabase
      .from('crm_roles')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
        console.warn("Table crm_roles might not exist.", error);
        return [];
    }

    return data.map((r: any) => ({
      id: r.id,
      name: r.name,
      permissions: r.permissions || {},
      created_at: r.created_at
    }));
  },

  saveRole: async (role: Role): Promise<void> => {
    if (!isConfigured) throw new Error("Backend not configured");

    const payload = {
        name: role.name,
        permissions: role.permissions
    };

    if (role.id) {
        const { error } = await supabase.from('crm_roles').update(payload).eq('id', role.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('crm_roles').insert([payload]);
        if (error) throw error;
    }
  },

  deleteRole: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_roles').delete().eq('id', id);
      if (error) throw error;
  },

  // --- BANNERS ---

  getBanners: async (audience?: 'student' | 'instructor'): Promise<Banner[]> => {
    if (!isConfigured) return [];
    
    let query = supabase
      .from('app_banners')
      .select('*')
      .order('created_at', { ascending: false });

    if (audience) {
      query = query.eq('target_audience', audience);
    }

    const { data, error } = await query;

    if (error) {
        console.warn("Error fetching banners:", error);
        return [];
    }

    return data.map((b: any) => ({
      id: b.id,
      title: b.title,
      imageUrl: b.image_url,
      link_url: b.link_url,
      targetAudience: b.target_audience,
      active: b.active
    }));
  },

  saveBanner: async (banner: Banner): Promise<void> => {
    if (!isConfigured) throw new Error("Backend not configured");

    const payload = {
      title: banner.title,
      image_url: banner.imageUrl,
      link_url: banner.linkUrl,
      target_audience: banner.targetAudience,
      active: banner.active
    };

    if (banner.id) {
      const { error } = await supabase.from('app_banners').update(payload).eq('id', banner.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('app_banners').insert([payload]);
      if (error) throw error;
    }
  },

  deleteBanner: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('app_banners').delete().eq('id', id);
    if (error) throw error;
  },

  // --- PARTNER STUDIOS ---

  getPartnerStudios: async (): Promise<PartnerStudio[]> => {
    if (!isConfigured) return [];
    
    const { data, error } = await supabase
      .from('crm_partner_studios')
      .select('*')
      .order('fantasy_name', { ascending: true });

    if (error) {
      console.warn("Table crm_partner_studios might not exist", error);
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      status: d.status || 'active',
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
      pix_key: d.pix_key,
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

  savePartnerStudio: async (studio: PartnerStudio): Promise<void> => {
    if (!isConfigured) throw new Error("Backend not configured");

    const payload = {
      status: studio.status,
      responsible_name: studio.responsibleName,
      cpf: studio.cpf,
      phone: studio.phone,
      email: studio.email,
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

    if (studio.id) {
      const { error } = await supabase.from('crm_partner_studios').update(payload).eq('id', studio.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('crm_partner_studios').insert([payload]);
      if (error) throw error;
    }
  },

  deletePartnerStudio: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_partner_studios').delete().eq('id', id);
    if (error) throw error;
  },

  // --- INSTRUCTOR LEVELS ---

  getInstructorLevels: async (): Promise<InstructorLevel[]> => {
    if (!isConfigured) return [];
    
    const { data, error } = await supabase
      .from('crm_instructor_levels')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn("Table crm_instructor_levels might not exist", error);
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      honorarium: Number(d.honorarium || 0),
      observations: d.observations || '',
      createdAt: d.created_at
    }));
  },

  saveInstructorLevel: async (level: InstructorLevel): Promise<void> => {
    if (!isConfigured) throw new Error("Backend not configured");

    const payload = {
      name: level.name,
      honorarium: level.honorarium,
      observations: level.observations
    };

    if (level.id) {
      const { error } = await supabase.from('crm_instructor_levels').update(payload).eq('id', level.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('crm_instructor_levels').insert([payload]);
      if (error) throw error;
    }
  },

  deleteInstructorLevel: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_instructor_levels').delete().eq('id', id);
    if (error) throw error;
  },

  // --- FORMS & CRM LOGIC (SUPABASE INTEGRATION) ---
  
  saveForm: async (form: FormModel): Promise<void> => {
      if (!isConfigured) {
          const forms = JSON.parse(localStorage.getItem('app_forms') || '[]');
          const existingIdx = forms.findIndex((f: FormModel) => f.id === form.id);
          if (existingIdx >= 0) forms[existingIdx] = form;
          else forms.push(form);
          localStorage.setItem('app_forms', JSON.stringify(forms));
          return;
      }

      const payload = {
          id: form.id || undefined,
          title: form.title,
          description: form.description,
          campaign: form.campaign || null,
          is_lead_capture: form.isLeadCapture,
          questions: form.questions,
          style: form.style,
          team_id: form.teamId || null,
          distribution_mode: form.distributionMode || 'fixed',
          fixed_owner_id: form.fixedOwnerId || null,
          submissions_count: form.submissionsCount || 0
      };

      const { error } = await supabase.from('crm_forms').upsert(payload);
      if (error) throw error;
  },

  getForms: async (): Promise<FormModel[]> => {
      if (!isConfigured) return JSON.parse(localStorage.getItem('app_forms') || '[]');

      const { data, error } = await supabase
          .from('crm_forms')
          .select('*')
          .order('created_at', { ascending: false });
      
      if (error) return JSON.parse(localStorage.getItem('app_forms') || '[]');

      return data.map((d: any) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          campaign: d.campaign,
          isLeadCapture: d.is_lead_capture,
          teamId: d.team_id,
          distributionMode: d.distribution_mode,
          fixedOwnerId: d.fixed_owner_id,
          questions: d.questions || [],
          style: d.style || {},
          createdAt: d.created_at,
          submissionsCount: d.submissions_count || 0
      }));
  },

  getFormById: async (id: string): Promise<FormModel | null> => {
      if (!isConfigured) {
          const forms = JSON.parse(localStorage.getItem('app_forms') || '[]');
          return forms.find((f: FormModel) => f.id === id) || null;
      }

      const { data, error } = await supabase
          .from('crm_forms')
          .select('*')
          .eq('id', id)
          .single();

      if (error || !data) return null;

      /* Fix: Replaced undefined variable 'd' with 'data' */
      return {
          id: data.id,
          title: data.title,
          description: data.description,
          campaign: data.campaign,
          isLeadCapture: data.is_lead_capture,
          teamId: data.team_id,
          distributionMode: data.distribution_mode,
          fixedOwnerId: data.fixed_owner_id,
          questions: data.questions || [],
          style: data.style || {},
          createdAt: data.created_at,
          submissionsCount: data.submissions_count || 0
      };
  },

  deleteForm: async (id: string): Promise<void> => {
      if (!isConfigured) {
          const forms = JSON.parse(localStorage.getItem('app_forms') || '[]');
          const filtered = forms.filter((f: FormModel) => f.id !== id);
          localStorage.setItem('app_forms', JSON.stringify(filtered));
          return;
      }
      await supabase.from('crm_forms').delete().eq('id', id);
  },

  submitForm: async (formId: string, answers: FormAnswer[], isLeadCapture: boolean): Promise<void> => {
      // 1. Get Form config
      const form = await appBackend.getFormById(formId);
      if (!form) throw new Error("Form not found");

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
              let assignedOwnerId = form.fixedOwnerId || null;

              // --- LOGICA DE DISTRIBUICAO ROUND ROBIN ---
              if (form.distributionMode === 'round-robin' && form.teamId) {
                  // A. Fetch Team Members
                  const { data: teamData } = await supabase
                      .from('crm_teams')
                      .select('members')
                      .eq('id', form.teamId)
                      .single();
                  
                  const members = teamData?.members || [];
                  
                  if (members.length > 0) {
                      // B. Get/Init Counter for this form
                      const { data: counterData } = await supabase
                          .from('crm_form_counters')
                          .select('last_index')
                          .eq('form_id', formId)
                          .single();
                      
                      const lastIndex = counterData ? counterData.last_index : -1;
                      const nextIndex = (lastIndex + 1) % members.length;
                      
                      assignedOwnerId = members[nextIndex];

                      // C. Update Counter
                      await supabase
                          .from('crm_form_counters')
                          .upsert({ form_id: formId, last_index: nextIndex, updated_at: new Date().toISOString() });
                  }
              }

              const dealNumber = generateDealNumber(); // Standardized generation

              const payload = {
                  title: `Lead: ${name}`,
                  contact_name: name,
                  company_name: company || 'Particular',
                  value: 0,
                  status: 'warm',
                  stage: 'new',
                  deal_number: dealNumber, // Standardized protocol
                  source: form.title, // NEW: Automatically set Source as Form Title
                  campaign: form.campaign || '', // NEW: Automatically set Campaign as configured
                  owner_id: assignedOwnerId,
                  next_task: `Entrar em contato (${email || phone || 'sem dados'})`,
                  created_at: new Date().toISOString()
              };

              await supabase.from('crm_deals').insert([payload]);
          }
      }

      // Update submission count
      if (isConfigured) {
          // Increment locally or fetch latest
          await supabase.from('crm_forms').update({ submissions_count: (form.submissionsCount || 0) + 1 }).eq('id', formId);
      }
  },

  // --- CONTRACTS & FOLDERS ---
  
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
          folder_id: d.folder_id,
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
          signers: d.signers || [],
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
      layoutConfig: d.layout_config, 
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
      background_base_64: cert.backgroundData,
      back_background_base_64: cert.backBackgroundData,
      linked_product_id: cert.linkedProductId || null,
      body_text: cert.body_text, 
      layout_config: cert.layoutConfig 
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
      studentName: dealData.company_name || dealData.contact_name, 
      studentCity: dealData.course_city || 'Local',
      template: {
        id: templateData.id,
        title: templateData.title,
        backgroundData: templateData.background_base_64,
        backBackgroundData: templateData.back_background_base_64,
        linkedProductId: templateData.linked_product_id,
        bodyText: templateData.body_text,
        layoutConfig: templateData.layout_config, 
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
      description: d.description, 
      location: d.location,
      dates: d.dates || [],
      createdAt: d.created_at,
      registrationOpen: d.registration_open || false
    }));
  },

  saveEvent: async (event: EventModel): Promise<EventModel> => {
    if (!isConfigured) throw new Error("Backend not configured");

    const payload = {
      id: event.id,
      name: event.name,
      description: event.description, 
      location: event.location,
      dates: event.dates,
      registration_open: event.registrationOpen 
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
      description: data.description,
      location: data.location,
      dates: data.dates || [],
      createdAt: data.created_at,
      registrationOpen: data.registration_open || false
    };
  },

  deleteEvent: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_events').delete().eq('id', id);
    if (error) throw error;
  },

  // --- BLOCKS ---
  
  getBlocks: async (eventId: string): Promise<EventBlock[]> => {
    if (!isConfigured) return [];
    
    const { data, error } = await supabase
        .from('crm_event_blocks')
        .select('*')
        .eq('event_id', eventId)
        .order('title', { ascending: true });

    if (error) {
        console.warn(error); 
        return [];
    }

    return data.map((d: any) => ({
        id: d.id,
        eventId: d.event_id,
        date: d.date,
        title: d.title,
        max_selections: d.max_selections
    }));
  },

  saveBlock: async (block: EventBlock): Promise<EventBlock> => {
      if (!isConfigured) throw new Error("Backend not configured");
      
      const payload = {
          id: block.id,
          event_id: block.eventId,
          date: block.date,
          title: block.title,
          max_selections: block.maxSelections
      };

      const { data, error } = await supabase
          .from('crm_event_blocks')
          .upsert(payload)
          .select()
          .single();
      
      if (error) throw error;

      return {
          id: data.id,
          eventId: data.event_id,
          date: data.date,
          title: data.title,
          maxSelections: data.max_selections
      };
  },

  deleteBlock: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_event_blocks').delete().eq('id', id);
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
      blockId: d.block_id, 
      title: d.title,
      description: d.description, 
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
      block_id: workshop.blockId || null, 
      title: workshop.title,
      description: workshop.description, 
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
      blockId: data.block_id,
      title: data.title,
      description: data.description,
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

  // --- EVENT REGISTRATIONS ---

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

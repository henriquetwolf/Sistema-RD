import { createClient, Session } from '@supabase/supabase-js';
import { SavedPreset, FormModel, FormSubmission, FormAnswer } from '../types';

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
  }
};
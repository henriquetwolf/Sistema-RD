import { createClient, Session } from '@supabase/supabase-js';
import { SavedPreset } from '../types';

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
  }
};
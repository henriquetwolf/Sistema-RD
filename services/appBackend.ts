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

export const appBackend = {
  auth: {
    signIn: async (email: string, password: string) => {
      if (!isConfigured) throw new Error("VITE_APP_SUPABASE_URL and VITE_APP_SUPABASE_ANON_KEY are missing.");
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
      if (!isConfigured) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    getSession: async () => {
      if (!isConfigured) return null;
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    onAuthStateChange: (callback: (session: Session | null) => void) => {
      if (!isConfigured) return { data: { subscription: { unsubscribe: () => {} } } };
      return supabase.auth.onAuthStateChange((_event, session) => {
        callback(session);
      });
    }
  },

  /**
   * Fetch all saved presets from Supabase
   */
  getPresets: async (): Promise<SavedPreset[]> => {
    if (!isConfigured) return [];
    
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
   * Save a new preset to Supabase
   */
  savePreset: async (preset: Omit<SavedPreset, 'id'>): Promise<SavedPreset> => {
    if (!isConfigured) throw new Error("Backend not configured.");
    
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
    if (!isConfigured) throw new Error("Backend not configured.");

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
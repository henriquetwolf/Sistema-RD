import { createClient } from '@supabase/supabase-js';
import { SavedPreset } from '../types';

// Credentials for the App's backend (where presets are stored)
// We try to read from Environment Variables first (Vercel), otherwise fallback to hardcoded (Dev/Local)
// Casting import.meta to any to resolve TS error "Property 'env' does not exist on type 'ImportMeta'"
const APP_URL = (import.meta as any).env?.VITE_APP_SUPABASE_URL || 'https://wfrzsnwisypmgsbeccfj.supabase.co';
const APP_KEY = (import.meta as any).env?.VITE_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indmcnpzbndpc3lwbWdzYmVjY2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTg5MzMsImV4cCI6MjA4MDc5NDkzM30.8el-0CN3LCFn7Wv7znpq_Aj6-tBJPju7zOtbdqCHbFo';

const supabase = createClient(APP_URL, APP_KEY);

const TABLE_NAME = 'app_presets';

export const appBackend = {
  /**
   * Fetch all saved presets from Supabase
   */
  getPresets: async (): Promise<SavedPreset[]> => {
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
    }));
  },

  /**
   * Save a new preset to Supabase
   */
  savePreset: async (preset: Omit<SavedPreset, 'id'>): Promise<SavedPreset> => {
    const payload = {
      name: preset.name,
      project_url: preset.url,
      api_key: preset.key,
      target_table_name: preset.tableName,
      target_primary_key: preset.primaryKey || null,
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
    };
  },

  /**
   * Delete a preset by ID
   */
  deletePreset: async (id: string): Promise<void> => {
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
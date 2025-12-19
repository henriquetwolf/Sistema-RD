
import { createClient, Session } from '@supabase/supabase-js';
import { SavedPreset, FormModel, FormAnswer, Contract, ContractFolder, CertificateModel, StudentCertificate, EventModel, Workshop, EventRegistration, EventBlock, Role, Banner, PartnerStudio, InstructorLevel, InventoryRecord, SyncJob, ActivityLog, CollaboratorSession } from '../types';

const APP_URL = (import.meta as any).env?.VITE_APP_SUPABASE_URL;
const APP_KEY = (import.meta as any).env?.VITE_APP_SUPABASE_ANON_KEY;

const isConfigured = !!APP_URL && !!APP_KEY;

const supabase = createClient(
  APP_URL || 'https://placeholder.supabase.co', 
  APP_KEY || 'placeholder'
);

const TABLE_NAME = 'app_presets';

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
    productTypes: string[]; 
}

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
  isLocalMode: !isConfigured,
  client: supabase,

  auth: {
    signIn: async (email: string, password: string) => {
      if (!isConfigured) {
        return { data: { user: MOCK_SESSION.user, session: MOCK_SESSION }, error: null };
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    signOut: async () => {
      if (!isConfigured) {
        window.location.reload(); 
        return;
      }
      await supabase.auth.signOut();
    },
    getSession: async () => {
      if (!isConfigured) return MOCK_SESSION as unknown as Session;
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    onAuthStateChange: (callback: (session: Session | null) => void) => {
      if (!isConfigured) {
          callback(MOCK_SESSION as unknown as Session);
          return { data: { subscription: { unsubscribe: () => {} } } };
      }
      return supabase.auth.onAuthStateChange((_event, session) => callback(session));
    }
  },

  // --- ACTIVITY LOGS ---
  logActivity: async (log: Omit<ActivityLog, 'id' | 'createdAt' | 'userName'>): Promise<void> => {
      if (!isConfigured) return;
      
      let userName = 'Sistema';
      
      const savedCollab = sessionStorage.getItem('collaborator_session');
      if (savedCollab) {
          const collab = JSON.parse(savedCollab) as CollaboratorSession;
          userName = collab.name;
      } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) userName = user.email || 'Admin';
      }

      await supabase.from('crm_activity_logs').insert([{
          user_name: userName,
          action: log.action,
          module: log.module,
          details: log.details,
          record_id: log.recordId
      }]);
  },

  getActivityLogs: async (limit = 100): Promise<ActivityLog[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase
          .from('crm_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
      
      if (error) throw error;
      return (data || []).map(d => ({
          id: d.id,
          userName: d.user_name,
          action: d.action,
          module: d.module,
          details: d.details,
          recordId: d.record_id,
          createdAt: d.created_at
      }));
  },

  // --- SYNC JOBS (CONNECTIONS) ---
  getSyncJobs: async (): Promise<SyncJob[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_sync_jobs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      sheetUrl: row.sheet_url,
      config: row.config,
      lastSync: row.last_sync,
      status: row.status,
      lastMessage: row.last_message,
      active: row.active,
      intervalMinutes: row.interval_minutes,
      createdBy: row.created_by_name,
      createdAt: row.created_at
    }));
  },

  saveSyncJob: async (job: SyncJob): Promise<void> => {
    if (!isConfigured) return;
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      id: job.id,
      user_id: user?.id,
      name: job.name,
      sheet_url: job.sheetUrl,
      config: job.config,
      active: job.active,
      interval_minutes: job.intervalMinutes,
      last_sync: job.lastSync,
      status: job.status,
      last_message: job.lastMessage,
      created_by_name: job.createdBy,
      created_at: job.createdAt
    };
    const { error } = await supabase.from('crm_sync_jobs').upsert(payload);
    if (error) throw error;
  },

  updateJobStatus: async (jobId: string, status: string, lastSync: string | null, message: string | null): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_sync_jobs').update({
        status,
        last_sync: lastSync,
        last_message: message
    }).eq('id', jobId);
    if (error) throw error;
  },

  deleteSyncJob: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_sync_jobs').delete().eq('id', id);
    if (error) throw error;
  },

  getPresets: async (): Promise<SavedPreset[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from(TABLE_NAME).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id, 
      name: row.name, 
      url: row.project_url, 
      key: row.api_key, 
      tableName: row.target_table_name, 
      primaryKey: row.target_primary_key || '', 
      intervalMinutes: row.interval_minutes || 5,
      createdByName: row.created_by_name || ''
    }));
  },

  savePreset: async (preset: Omit<SavedPreset, 'id'>): Promise<SavedPreset> => {
    if (!isConfigured) throw new Error("Backend not configured.");
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      user_id: user?.id, 
      name: preset.name, 
      project_url: preset.url, 
      api_key: preset.key, 
      target_table_name: preset.tableName, 
      target_primary_key: preset.primaryKey || null, 
      interval_minutes: preset.intervalMinutes || 5,
      created_by_name: preset.createdByName || null
    };
    const { data, error } = await supabase.from(TABLE_NAME).insert([payload]).select().single();
    if (error) throw error;
    return {
      id: data.id, 
      name: data.name, 
      url: data.project_url, 
      key: data.api_key, 
      tableName: data.target_table_name, 
      primaryKey: data.target_primary_key || '', 
      intervalMinutes: data.interval_minutes || 5, 
      createdByName: data.created_by_name || ''
    };
  },

  deletePreset: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
    if (error) throw error;
  },

  getAppSetting: async (key: string): Promise<any | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('app_settings').select('value').eq('key', key).single();
    return data ? data.value : null;
  },

  saveAppSetting: async (key: string, value: any): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
  },

  getAppLogo: async (): Promise<string | null> => {
    return await appBackend.getApp
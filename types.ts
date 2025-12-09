
export interface SupabaseConfig {
  url: string;
  key: string;
  tableName: string;
  primaryKey?: string; // Optional: Used for Upsert logic
}

export interface SavedPreset extends SupabaseConfig {
  id: string;
  name: string; // The display name for the saved config
}

export interface CsvRow {
  [key: string]: any;
}

export interface FileData {
  fileName: string;
  rowCount: number;
  data: CsvRow[];
  headers: string[];
}

export enum AppStep {
  DASHBOARD = -1, // New Step
  UPLOAD = 0,
  CONFIG = 1,
  PREVIEW = 2,
  SYNC = 3,
}

export type UploadStatus = 'idle' | 'parsing' | 'uploading' | 'success' | 'error';

export interface SyncLog {
  timestamp: Date;
  status: 'success' | 'error';
  message: string;
  rowCount?: number;
}

export interface SyncJob {
  id: string;
  name: string;
  sheetUrl: string;
  config: SupabaseConfig;
  lastSync: Date | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastMessage: string | null;
  active: boolean;
}

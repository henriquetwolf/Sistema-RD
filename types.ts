
export interface SupabaseConfig {
  url: string;
  key: string;
  tableName: string;
  primaryKey?: string; // Optional: Used for Upsert logic
  intervalMinutes?: number; // New: Selected sync interval
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
  intervalMinutes: number; // Required for the job logic
}

// --- FORMS & LEADS ---

export type QuestionType = 'text' | 'paragraph' | 'email' | 'phone' | 'number' | 'date';

export interface FormQuestion {
  id: string;
  title: string;
  type: QuestionType;
  required: boolean;
  placeholder?: string;
}

export interface FormStyle {
  backgroundType: 'color' | 'image' | 'texture' | 'none';
  backgroundColor: string;
  backgroundImage?: string; // Base64 or URL
  backgroundTexture?: string; // CSS class or identifier
  cardTransparent?: boolean; // Se o card branco do form deve ser transparente
}

export interface FormModel {
  id: string;
  title: string;
  description: string;
  isLeadCapture: boolean;
  questions: FormQuestion[];
  style?: FormStyle; // New style property
  createdAt: string;
  submissionsCount: number;
}

export interface FormAnswer {
  questionId: string;
  questionTitle: string;
  value: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  answers: FormAnswer[];
  submittedAt: string;
}

// --- CONTRACTS ---

export interface ContractFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface ContractSigner {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'signed';
  signatureData?: string; // Base64 image
  signedAt?: string;
}

export interface Contract {
  id: string;
  title: string;
  content: string; // HTML or Markdown content of the contract
  city: string;
  contractDate: string; // ISO Date string or formatted string
  signers: ContractSigner[];
  status: 'draft' | 'sent' | 'signed'; // 'signed' only when ALL signers have signed
  folderId?: string | null; // Optional folder association
  createdAt: string;
}

// --- CERTIFICATES ---

export interface CertificateModel {
  id: string;
  title: string;
  backgroundData: string; // Base64 image string
  bodyText: string; // The static text (e.g. "Concluiu com êxito...")
  createdAt: string;
}

export interface StudentCertificate {
  id: string;
  studentDealId: string;
  certificateTemplateId: string;
  hash: string;
  issuedAt: string;
}

// --- PRODUCTS ---

export interface Product {
  id: string;
  name: string;
  category: string; 
  platform: string; 
  price: number;
  url: string;
  status: 'active' | 'inactive';
  description: string;
  certificateTemplateId?: string; // New: Link to certificate model
  createdAt: string;
}

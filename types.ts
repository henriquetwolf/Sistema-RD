
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

export type EntityImportType = 'generic' | 'collaborators' | 'instructors' | 'students' | 'franchises' | 'studios';

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
  createdBy?: string; // Nome ou email do usuário que criou a conexão
  createdAt: Date;    // Data e hora da criação da conexão
}

// --- ACCESS CONTROL ---

export interface Role {
  id: string;
  name: string;
  permissions: Record<string, boolean>; // e.g., { 'crm': true, 'financial': false }
  created_at?: string;
}

export interface CollaboratorSession {
  id: string;
  name: string;
  email: string;
  role: Role;
  photoUrl?: string;
}

// --- BANNERS ---

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  targetAudience: 'student' | 'instructor';
  active: boolean;
  createdAt?: string;
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
  backgroundImage?: string;
  backgroundTexture?: string;
  cardTransparent?: boolean;
}

export interface FormModel {
  id: string;
  title: string;
  description: string;
  campaign?: string;
  isLeadCapture: boolean;
  teamId?: string;
  distributionMode?: 'fixed' | 'round-robin';
  fixedOwnerId?: string;
  questions: FormQuestion[];
  style?: FormStyle; 
  createdAt: string;
  submissionsCount: number;
}

export interface FormAnswer {
  questionId: string;
  questionTitle: string;
  value: string;
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
  signatureData?: string;
  signedAt?: string;
}

export interface Contract {
  id: string;
  title: string;
  content: string;
  city: string;
  contractDate: string;
  signers: ContractSigner[];
  status: 'draft' | 'sent' | 'signed';
  folderId?: string | null;
  createdAt: string;
}

// --- CERTIFICATES ---

export interface TextStyle {
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: string;
  textAlign: 'left' | 'center' | 'right';
  width: number;
}

export interface CertificateLayout {
  body: TextStyle;
  name: TextStyle;
  footer: TextStyle;
}

export interface CertificateModel {
  id: string;
  title: string;
  backgroundData: string;
  backBackgroundData?: string;
  linkedProductId?: string;
  bodyText: string;
  layoutConfig?: CertificateLayout;
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
  certificateTemplateId?: string;
  createdAt: string;
}

// --- STUDENT AREA ---

export interface StudentSession {
  email: string;
  cpf: string;
  name: string;
  deals: any[];
}

// --- STUDIO AREA ---
export interface PartnerStudioSession {
    id: string;
    fantasyName: string;
    responsibleName: string;
    email: string;
    cnpj: string;
}

// --- EVENTS & WORKSHOPS ---

export interface EventBlock {
  id: string;
  eventId: string;
  date: string;
  title: string;
  maxSelections: number;
}

export interface Workshop {
  id: string;
  eventId: string;
  blockId?: string;
  title: string;
  description?: string;
  speaker: string;
  date: string;
  time: string;
  spots: number;
}

export interface EventModel {
  id: string;
  name: string;
  description?: string;
  location: string;
  dates: string[];
  createdAt: string;
  registrationOpen: boolean;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  workshopId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  registeredAt: string;
}

// --- PARTNER STUDIOS ---

export interface PartnerStudio {
  id: string;
  status: 'active' | 'inactive';
  responsibleName: string;
  cpf: string;
  phone: string;
  email: string;
  password?: string; // New field for access
  secondContactName: string;
  secondContactPhone: string;
  fantasyName: string;
  legalName: string;
  cnpj: string;
  studioPhone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  sizeM2: string;
  studentCapacity: string;
  rentValue: string;
  methodology: string;
  studioType: string;
  nameOnSite: string;
  bank: string;
  agency: string;
  account: string;
  beneficiary: string;
  pixKey: string;
  hasReformer: boolean;
  qtyReformer: number;
  hasLadderBarrel: boolean;
  qtyLadderBarrel: number;
  hasChair: boolean;
  qtyChair: number;
  hasCadillac: boolean;
  qtyCadillac: number;
  hasChairsForCourse: boolean;
  hasTv: boolean;
  maxKitsCapacity: string;
  attachments: string;
}

// --- INSTRUCTOR LEVELS ---

export interface InstructorLevel {
  id: string;
  name: string;
  honorarium: number;
  observations: string;
  createdAt?: string;
}

// --- INVENTORY ---

export interface InventoryRecord {
  id: string;
  type: 'entry' | 'exit';
  itemApostilaNova: number;
  itemApostilaClassico: number;
  itemSacochila: number;
  itemLapis: number;
  registrationDate: string;
  studioId: string;
  trackingCode: string;
  observations: string;
  conferenceDate: string;
  attachments?: string;
  createdAt?: string;
}


export interface BillingRecord {
  id: number;
  "Identificador do cliente": string;
  "Nome do cliente": string;
  "Código referência": string;
  "Data de competência": string;
  "Valor"?: number;
  "Status"?: string;
  "Vencimento"?: string;
  [key: string]: any;
}

export interface BillingNegotiation {
  id: string;
  openInstallments: number;
  totalNegotiatedValue: number;
  totalInstallments: number;
  dueDate: string;
  responsibleAgent: string;
  identifierCode: string;
  fullName: string;
  productName: string;
  originalValue: number;
  paymentMethod: string;
  observations: string;
  status: string;
  team: string;
  voucherLink1: string;
  testDate: string;
  voucherLink2: string;
  voucherLink3: string;
  boletosLink: string;
  negotiationReference: string;
  attachments: string;
  createdAt: string;
}

export interface CourseInfo {
  id: string;
  courseName: string;
  details: string;
  materials: string;
  requirements: string;
  updatedAt: string;
}

export interface Franchise {
  id: string;
  saleNumber: string;
  contractStartDate: string;
  inaugurationDate: string;
  salesConsultant: string;
  franchiseeName: string;
  cpf: string;
  companyName: string;
  cnpj: string;
  phone: string;
  email: string;
  residentialAddress: string;
  commercialState: string;
  commercialCity: string;
  commercialAddress: string;
  commercialNeighborhood: string;
  latitude: string;
  longitude: string;
  exclusivityRadiusKm?: string; 
  kmStreetPoint: string;
  kmCommercialBuilding: string;
  studioStatus: string;
  studioSizeM2: string;
  equipmentList: string;
  royaltiesValue: string;
  bankAccountInfo: string;
  hasSignedContract: boolean;
  contractEndDate: string;
  isRepresentative: boolean;
  partner1Name: string;
  partner2Name: string;
  franchiseeFolderLink: string;
  pathInfo: string;
  observations: string;
}

export interface SupabaseConfig {
  url: string;
  key: string;
  tableName: string;
  primaryKey?: string; 
  intervalMinutes?: number; 
}

export interface SavedPreset extends SupabaseConfig {
  id: string;
  name: string; 
  createdByName?: string; 
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
  DASHBOARD = -1, 
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
  lastSync: string | Date | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastMessage: string | null;
  active: boolean;
  intervalMinutes: number; 
  createdBy?: string; 
  createdAt: string | Date;    
}

export interface ActivityLog {
  id: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'login';
  module: string;
  details: string;
  recordId?: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: Record<string, boolean>; 
  created_at?: string;
}

export interface CollaboratorSession {
  id: string;
  name: string;
  email: string;
  role: Role;
  photoUrl?: string;
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  targetAudience: 'student' | 'instructor';
  active: boolean;
  createdAt?: string;
}

export type QuestionType = 'text' | 'paragraph' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'checkbox';

export interface FormQuestion {
  id: string;
  title: string;
  type: QuestionType;
  required: boolean;
  placeholder?: string;
  options?: string[]; 
  crmMapping?: string; 
  systemMapping?: string; 
}

export interface FormStyle {
  backgroundType: 'color' | 'image' | 'texture' | 'none';
  backgroundColor: string;
  backgroundImage?: string;
  backgroundTexture?: string;
  cardTransparent?: boolean;
  primaryColor?: string;
  textColor?: string;
  fontFamily?: 'sans' | 'serif' | 'modern';
  titleAlignment?: 'left' | 'center';
  borderRadius?: 'none' | 'small' | 'medium' | 'large' | 'full';
  buttonText?: string;
  logoUrl?: string;
  shadowIntensity?: 'none' | 'soft' | 'strong';
  successTitle?: string;
  successMessage?: string;
  successButtonText?: string;
}

export interface FormFolder {
  id: string;
  name: string;
  createdAt: string;
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
  targetPipeline?: string; 
  targetStage?: string;    
  questions: FormQuestion[];
  style?: FormStyle; 
  createdAt: string;
  submissionsCount: number;
  folderId?: string | null;
}

export interface SurveyModel extends FormModel {
    targetType: 'all' | 'product_type' | 'specific_product';
    targetProductType?: string;
    targetProductName?: string;
    onlyIfFinished: boolean;
    isActive: boolean;
}

export interface FormAnswer {
  questionId: string;
  questionTitle: string;
  value: string;
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
  status: 'sent' | 'signed';
  folderId?: string | null;
  signers: ContractSigner[];
  createdAt: string;
}

export interface ContractFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface StudentSession {
  id?: string;
  email: string;
  cpf: string;
  name: string;
  deals: any[];
}

export interface PartnerStudioSession {
  id: string;
  fantasyName: string;
  responsibleName: string;
  email: string;
  cnpj: string;
}

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
  layoutConfig: CertificateLayout;
  createdAt: string;
}

export interface StudentCertificate {
  id: string;
  studentDealId: string;
  certificateTemplateId: string;
  hash: string;
  issuedAt: string;
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

export interface EventRegistration {
  id: string;
  eventId: string;
  workshopId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  registeredAt: string;
}

export interface PartnerStudio {
  id: string;
  status: 'active' | 'inactive';
  responsibleName: string;
  cpf: string;
  phone: string;
  email: string;
  password?: string;
  secondContactName?: string;
  secondContactPhone?: string;
  fantasyName: string;
  legalName: string;
  cnpj: string;
  studioPhone?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  sizeM2?: string;
  studentCapacity?: string;
  rentValue?: string;
  methodology?: string;
  studioType?: string;
  nameOnSite?: string;
  bank?: string;
  agency?: string;
  account?: string;
  beneficiary?: string;
  pixKey?: string;
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
  maxKitsCapacity?: string;
  attachments?: string;
}

export interface InstructorLevel {
  id: string;
  name: string;
  honorarium: number;
  observations?: string;
  createdAt?: string;
}

export interface InventoryRecord {
  id: string;
  type: 'entry' | 'exit';
  itemApostilaNova: number;
  itemApostilaClassico: number;
  itemSacochila: number;
  itemLapis: number;
  registrationDate: string;
  studioId?: string;
  trackingCode: string;
  observations: string;
  conferenceDate?: string;
  attachments?: string;
  createdAt?: string;
}

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

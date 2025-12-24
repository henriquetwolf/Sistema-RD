
export type CsvRow = Record<string, any>;

export interface FileData {
  fileName: string;
  rowCount: number;
  data: CsvRow[];
  headers: string[];
}

export interface SupabaseConfig {
  url: string;
  key: string;
  tableName: string;
  primaryKey?: string;
  intervalMinutes?: number;
}

export enum AppStep {
  UPLOAD = 0,
  CONFIG = 1,
  PREVIEW = 2,
  DASHBOARD = 3
}

export interface SavedPreset extends SupabaseConfig {
  id: string;
  name: string;
  createdByName: string;
}

export type EntityImportType = 'generic' | 'collaborators' | 'instructors' | 'students' | 'franchises' | 'studios';

export interface StudentSession {
  email: string;
  cpf: string;
  name: string;
  deals: any[];
}

export interface CollaboratorSession {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  role: Role;
}

export interface PartnerStudioSession {
  id: string;
  fantasyName: string;
  responsibleName: string;
  email: string;
  cnpj: string;
}

export interface SyncJob {
  id: string;
  name: string;
  active: boolean;
  intervalMinutes: number;
  config: SupabaseConfig;
  sheetUrl: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
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
  legalName?: string;
  cnpj?: string;
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
  hasReformer?: boolean;
  qtyReformer?: number;
  hasLadderBarrel?: boolean;
  qtyLadderBarrel?: number;
  hasChair?: boolean;
  qtyChair?: number;
  hasCadillac?: boolean;
  qtyCadillac?: number;
  hasChairsForCourse?: boolean;
  hasTv?: boolean;
  maxKitsCapacity?: string;
  attachments?: string;
}

export type QuestionType = 'text' | 'paragraph' | 'select' | 'checkbox' | 'email' | 'phone' | 'number' | 'date';

export interface TextStyle {
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: string;
  textAlign: string;
  width: number;
}

export interface CertificateLayout {
  body: TextStyle;
  name: TextStyle;
  footer: TextStyle;
}

export interface FormStyle {
  backgroundType: 'color' | 'image' | 'texture';
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundTexture?: string;
  cardTransparent?: boolean;
  primaryColor: string;
  textColor: string;
  fontFamily: 'sans' | 'serif' | 'modern';
  titleAlignment: 'left' | 'center';
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full';
  buttonText: string;
  shadowIntensity: 'none' | 'soft' | 'strong';
  successTitle?: string;
  successMessage?: string;
  successButtonText?: string;
  logoUrl?: string;
}

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

export interface FormAnswer {
  questionId: string;
  questionTitle: string;
  value: string;
}

export interface FormModel {
  id: string;
  title: string;
  description: string;
  campaign: string;
  isLeadCapture: boolean;
  questions: FormQuestion[];
  createdAt: string;
  submissionsCount: number;
  style?: FormStyle;
  distributionMode?: 'fixed' | 'round-robin';
  teamId?: string;
  fixedOwnerId?: string;
  targetPipeline?: string;
  targetStage?: string;
}

export interface SurveyModel extends FormModel {
  targetType: 'all' | 'product_type' | 'specific_product';
  targetProductType?: string;
  targetProductName?: string;
  onlyIfFinished: boolean;
  isActive: boolean;
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  targetAudience: 'student' | 'instructor';
  active: boolean;
}

export interface InstructorLevel {
  id: string;
  name: string;
  honorarium: number;
  observations?: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  module: string;
  details: string;
  recordId?: string;
  userName: string;
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
  createdAt: string;
  status: 'sent' | 'signed';
  title: string;
  content: string;
  city: string;
  contractDate: string;
  signers: ContractSigner[];
  folderId: string | null;
}

export interface ContractFolder {
  id: string;
  name: string;
  createdAt: string;
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

export interface Franchise {
  id: string;
  saleNumber?: string;
  contractStartDate?: string;
  inaugurationDate?: string;
  salesConsultant?: string;
  franchiseeName: string;
  cpf?: string;
  companyName: string;
  cnpj?: string;
  phone?: string;
  email: string;
  residentialAddress?: string;
  commercialState: string;
  commercialCity: string;
  commercialAddress?: string;
  commercialNeighborhood?: string;
  latitude?: string;
  longitude?: string;
  exclusivityRadiusKm?: string;
  kmStreetPoint?: string;
  kmCommercialBuilding?: string;
  studioStatus: string;
  studioSizeM2?: string;
  equipmentList?: string;
  royaltiesValue?: string;
  bankAccountInfo?: string;
  hasSignedContract: boolean;
  contractEndDate?: string;
  isRepresentative: boolean;
  partner1Name?: string;
  partner2Name?: string;
  franchiseeFolderLink?: string;
  pathInfo?: string;
  observations?: string;
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

export interface EventBlock {
  id: string;
  eventId: string;
  date: string;
  title: string;
  maxSelections: number;
}

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
  attachments: string;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string; // ex: whatsapp:+14155238886
}

export interface TwilioMessageLog {
  id: string;
  to: string;
  body: string;
  status: string;
  sid: string;
  createdAt: string;
}

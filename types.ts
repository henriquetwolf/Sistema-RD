

export type NodeType = 'trigger' | 'wait' | 'email' | 'condition' | 'crm_action' | 'exit';

export interface AutomationNode {
  id: string;
  type: NodeType;
  title: string;
  config: any;
  nextId?: string; // Para caminhos lineares
  yesId?: string;  // Para ramificação SIM
  noId?: string;   // Para ramificação NÃO
}

export interface AutomationFlow {
  id: string;
  name: string;
  description: string;
  formId: string; // Formulário que inicia o fluxo
  isActive: boolean;
  nodes: AutomationNode[];
  createdAt: string;
  updatedAt: string;
}

export enum AppStep {
  UPLOAD,
  CONFIG,
  PREVIEW,
  DASHBOARD
}

export type UploadStatus = 'idle' | 'parsing' | 'uploading' | 'error' | 'success';

export interface FileData {
  fileName: string;
  rowCount: number;
  data: CsvRow[];
  headers: string[];
}

export interface CsvRow {
  [key: string]: any;
}

export interface SupabaseConfig {
  url: string;
  key: string;
  tableName: string;
  primaryKey: string;
  intervalMinutes: number;
}

export interface SyncJob {
  id: string;
  name: string;
  sheetUrl: string;
  config: SupabaseConfig;
  active: boolean;
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastSync: string | null;
  lastMessage: string;
  intervalMinutes: number;
  createdBy: string;
  createdAt: string;
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
  style: FormStyle;
  distributionMode: 'fixed' | 'random';
  targetPipeline: string;
  targetStage: string;
  folderId: string | null;
}

export interface FormQuestion {
  id: string;
  title: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  systemMapping?: string;
}

export type QuestionType = 'text' | 'paragraph' | 'select' | 'checkbox' | 'number' | 'email' | 'phone' | 'date';

export interface FormStyle {
  backgroundType: 'color' | 'image' | 'texture';
  backgroundColor: string;
  backgroundImage?: string;
  backgroundTexture?: 'dots' | 'grid' | 'diagonal';
  cardTransparent: boolean;
  primaryColor: string;
  textColor: string;
  fontFamily: 'sans' | 'serif' | 'modern';
  titleAlignment: 'left' | 'center' | 'right';
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full';
  buttonText: string;
  shadowIntensity: 'none' | 'soft' | 'strong';
  successTitle: string;
  successMessage: string;
  successButtonText: string;
  logoUrl?: string;
}

export interface FormAnswer {
  questionId: string;
  questionTitle: string;
  value: string;
}

export interface FormFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  title: string;
  content: string;
  city: string;
  contractDate: string;
  status: 'sent' | 'signed';
  signers: ContractSigner[];
  folderId: string | null;
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

export interface ContractFolder {
  id: string;
  name: string;
  createdAt: string;
}

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
  role: {
    id: string;
    name: string;
    permissions: Record<string, boolean>;
  };
}

export interface PartnerStudioSession {
  id: string;
  fantasyName: string;
  responsibleName: string;
  email: string;
  cnpj: string;
}

export type EntityImportType = 'generic' | 'collaborators' | 'instructors' | 'students' | 'franchises' | 'studios';

export interface LandingPage {
  id: string;
  title: string;
  productName: string;
  slug: string;
  content: LandingPageContent;
  isActive: boolean;
  theme: string;
  createdAt: string;
  updatedAt: string;
}

export interface LandingPageContent {
  meta: any;
  theme: any;
  sections: LandingPageSection[];
  htmlCode?: string;
  selectedFormId?: string;
  ctaLink?: string;
  // Fix: added missing ai_defaults property to LandingPageContent
  ai_defaults?: {
    enabled: boolean;
    max_suggestions: number;
    rules: string;
  };
}

export interface LandingPageSection {
  id: string;
  type: string;
  enabled: boolean;
  content: any;
  styles?: Record<string, ElementStyles>;
}

export interface ElementStyles {
  x?: number;
  y?: number;
  width?: number;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
}

export interface SavedPreset extends SupabaseConfig {
  id: string;
  name: string;
  createdByName: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
}

export interface TeacherNews {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
}

export interface InstructorLevel {
  id: string;
  name: string;
  honorarium: number;
  observations?: string;
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  targetAudience: 'student' | 'instructor';
  active: boolean;
}

export interface ActivityLog {
  id: string;
  userName: string;
  action: 'create' | 'update' | 'delete';
  module: string;
  details: string;
  createdAt: string;
}

export interface CourseInfo {
  id: string;
  courseName: string;
  details: string;
  materials: string;
  requirements: string;
}

export interface SupportTag {
  id: string;
  name: string;
  role: 'all' | 'student' | 'instructor' | 'studio' | 'admin';
}

export interface StudentCertificateStatus {
  hash: string;
  issuedAt: string;
}

export interface CertificateModel {
  id: string;
  title: string;
  backgroundData: string;
  backBackgroundData?: string;
  linkedProductId: string;
  bodyText: string;
  layoutConfig: CertificateLayout;
  createdAt: string;
}

export interface CertificateLayout {
  body: TextStyle;
  name: TextStyle;
  footer: TextStyle;
}

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

export interface OnlineCourse {
  id: string;
  title: string;
  description: string;
  price: number;
  paymentLink: string;
  imageUrl?: string;
  certificateTemplateId?: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
}

export interface CourseLesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  videoUrl?: string;
  orderIndex: number;
  materials?: { name: string, url: string }[];
}

export interface EventModel {
  id: string;
  name: string;
  description: string;
  location: string;
  dates: string[];
  createdAt: string;
  registrationOpen: boolean;
}

export interface Workshop {
  id: string;
  eventId: string;
  blockId: string;
  title: string;
  description: string;
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
  locked?: boolean;
}

export interface EventBlock {
  id: string;
  eventId: string;
  date: string;
  title: string;
  maxSelections: number;
}

export interface ExternalCertificate {
  id: string;
  student_id: string;
  course_name: string;
  completion_date: string;
  file_url: string;
  file_name: string;
}

export interface SurveyModel extends FormModel {
  targetAudience: 'all' | 'student' | 'instructor' | 'studio';
  targetType: 'all' | 'product_type' | 'specific_product';
  targetProductType?: string;
  targetProductName?: string;
  onlyIfFinished: boolean;
  isActive: boolean;
}

export interface AttendanceTag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
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

export interface PartnerStudio {
  id: string;
  status: string;
  responsibleName: string;
  cpf: string;
  phone: string;
  email: string;
  password?: string;
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

export interface BillingRecord {
  id: number;
}

export interface BillingNegotiation {
  id: string;
  fullName: string;
  identifierCode: string;
  productName: string;
  originalValue: number;
  totalNegotiatedValue: number;
  totalInstallments: number;
  openInstallments: number;
  paymentMethod: string;
  dueDate: string;
  status: string;
  team: string;
  responsibleAgent: string;
  negotiationReference: string;
  observations: string;
  voucherLink1: string;
  voucherLink2: string;
  voucherLink3: string;
  boletosLink: string;
  testDate: string;
  attachments: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: 'student' | 'instructor' | 'studio' | 'admin';
  targetId?: string;
  targetName?: string;
  targetEmail?: string;
  targetRole?: string;
  subject: string;
  message: string;
  tag: string;
  status: 'open' | 'pending' | 'closed' | 'waiting';
  assignedId?: string;
  assignedName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'instructor' | 'studio' | 'admin';
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
}

export interface WAAutomationRule {
  id: string;
  name: string;
  triggerType: 'crm_stage_reached';
  pipelineName: string;
  stageId: string;
  productType: string;
  productId: string;
  messageTemplate: string;
  isActive: boolean;
  createdAt: string;
}

export interface WAAutomationLog {
  id: string;
  ruleName: string;
  studentName: string;
  phone: string;
  message: string;
  createdAt: string;
}

export interface Product {
    id: string;
    name: string;
    category: string;
    platform: string;
    price: number;
    url: string;
    status: string;
    description: string;
    certificateTemplateId?: string;
    createdAt: string;
    imageUrl?: string;
    targetAreas: string[];
}

// Fix: added missing Franchise interface
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
  kmStreetPoint?: string;
  kmCommercialBuilding?: string;
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

// Fix: added missing StudentCourseAccess interface
export interface StudentCourseAccess {
  student_deal_id: string;
  course_id: string;
}

// Fix: added missing StudentLessonProgress interface
export interface StudentLessonProgress {
  student_deal_id: string;
  lesson_id: string;
  completed: boolean;
}

// Fix: added missing LandingPageField interface
export interface LandingPageField {
  value: string;
  ai?: string[];
  type?: 'image' | 'video' | 'form';
}

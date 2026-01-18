
export type QuestionType = 'text' | 'paragraph' | 'select' | 'checkbox' | 'email' | 'phone' | 'number' | 'date';

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

export interface FormStyle {
  backgroundType: 'color' | 'image' | 'texture';
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundTexture?: 'dots' | 'grid' | 'diagonal';
  cardTransparent?: boolean;
  primaryColor: string;
  textColor: string;
  fontFamily: 'sans' | 'serif' | 'modern';
  titleAlignment: 'left' | 'center';
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full';
  buttonText: string;
  shadowIntensity: 'none' | 'soft' | 'strong';
  successTitle: string;
  successMessage: string;
  successButtonText: string;
  logoUrl?: string;
}

export interface FormModel {
  id: string;
  title: string;
  description: string;
  campaign: string;
  isLeadCapture: boolean;
  questions: FormQuestion[];
  style: FormStyle;
  createdAt: string;
  submissionsCount: number;
  folderId: string | null;
  distributionMode: 'fixed' | 'round-robin';
  fixedOwnerId?: string;
  teamId?: string;
  targetPipeline?: string;
  targetStage?: string;
}

// Novos tipos para Automação
export type NodeType = 'trigger' | 'wait' | 'email' | 'whatsapp' | 'condition' | 'crm_action' | 'exit';

export interface AutomationNode {
  id: string;
  type: NodeType;
  title: string;
  config: any;
  nextId?: string;
  yesId?: string;
  noId?: string;
}

export interface AutomationFlow {
  id: string;
  name: string;
  description: string;
  formId: string;
  isActive: boolean;
  nodes: AutomationNode[];
  createdAt: string;
  updatedAt: string;
}

export interface SurveyModel extends FormModel {
    targetAudience: 'all' | 'student' | 'instructor' | 'studio';
    targetType: 'all' | 'product_type' | 'specific_product';
    targetProductType?: string;
    targetProductName?: string;
    onlyIfFinished: boolean;
    isActive: boolean;
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
  UPLOAD = 0,
  CONFIG = 1,
  PREVIEW = 2,
  DASHBOARD = 3
}

export interface SupabaseConfig {
  url: string;
  key: string;
  tableName: string;
  primaryKey: string;
  intervalMinutes: number;
}

export interface SavedPreset extends SupabaseConfig {
  id: string;
  name: string;
  createdByName?: string;
}

export type EntityImportType = 'generic' | 'collaborators' | 'instructors' | 'students' | 'franchises' | 'studios';

export type UploadStatus = 'idle' | 'parsing' | 'uploading' | 'error';

export interface SyncJob {
  id: string;
  name: string;
  sheetUrl: string;
  config: SupabaseConfig;
  active: boolean;
  status: string;
  lastSync: string | null;
  lastMessage: string;
  intervalMinutes: number;
  createdBy: string;
  createdAt: string;
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

export interface StudentSession {
    email: string;
    name: string;
    cpf: string;
    deals: any[];
}

export interface Role {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
}

export interface CollaboratorSession {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  role: Role;
}

export interface PartnerStudioSession {
  id: string;
  fantasyName: string;
  responsibleName: string;
  email: string;
  cnpj: string;
}

export interface CertificateModel {
  id: string;
  title: string;
  backgroundData: string;
  backBackgroundData: string;
  linkedProductId: string;
  bodyText: string;
  layoutConfig: CertificateLayout;
  createdAt: string;
}

export interface StudentCertificate {
  id: string;
  student_deal_id: string;
  certificate_template_id: string;
  hash: string;
  issued_at: string;
}

export interface ExternalCertificate {
  id: string;
  student_id: string;
  course_name: string;
  completion_date: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

export interface StudentCertificateStatus {
  hash: string;
  issuedAt: string;
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

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  targetAudience: 'student' | 'instructor';
  active: boolean;
  createdAt: string;
}

export interface PartnerStudio {
  id: string;
  status: 'active' | 'inactive';
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

export interface InstructorLevel {
  id: string;
  name: string;
  honorarium: number;
  observations?: string;
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

export interface ActivityLog {
  id: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'login';
  module: string;
  details: string;
  recordId?: string;
  createdAt: string;
}

export interface BillingNegotiation {
  id: string;
  openInstallments: number;
  totalNegotiatedValue: number;
  totalInstallments: number;
  dueDate?: string;
  responsibleAgent?: string;
  identifierCode?: string;
  fullName?: string;
  productName?: string;
  originalValue?: number;
  paymentMethod?: string;
  observations?: string;
  status: string;
  team?: string;
  voucherLink1?: string;
  testDate?: string;
  voucherLink2?: string;
  voucherLink3?: string;
  boletosLink?: string;
  negotiationReference?: string;
  attachments?: string;
  createdAt?: string;
}

export interface FormFolder {
  id: string;
  name: string;
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

export interface TeacherNews {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
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
  targetRole?: 'student' | 'instructor' | 'studio' | 'admin';
  subject: string;
  message: string;
  tag: string;
  status: 'open' | 'pending' | 'closed' | 'waiting';
  response?: string;
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

export interface CompanySetting {
  id: string;
  legalName: string;
  cnpj: string;
  webhookUrl: string;
  productTypes: string[];
  productIds: string[];
}

export type PipelineStage = { id: string; title: string; color?: string; };

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
}

export interface WebhookTrigger {
  id: string;
  pipelineName: string;
  stageId: string;
  payloadJson?: string;
  createdAt?: string;
}

export interface SupportTag {
  id: string;
  name: string;
  role: 'student' | 'instructor' | 'studio' | 'admin' | 'all';
  createdAt: string;
}

export interface OnlineCourse {
  id: string;
  title: string;
  description: string;
  price: number;
  paymentLink: string;
  imageUrl?: string;
  certificateTemplateId?: string;
  createdAt: string;
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
  description: string;
  videoUrl: string;
  materials: { name: string; url: string; }[];
  orderIndex: number;
}

export interface StudentCourseAccess {
  id: string;
  studentDealId: string;
  courseId: string;
  unlockedAt: string;
}

export interface StudentLessonProgress {
  id: string;
  studentDealId: string;
  lessonId: string;
  completedAt: string;
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
  certificateTemplateId: string;
  createdAt: string;
  imageUrl?: string;
  targetAreas?: string[];
}

export interface AttendanceTag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface BillingRecord {
  id: string;
  nome_cliente: string;
  vencimento: string;
  valor_original: number;
  valor_recebido: number;
  status: string;
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

export interface WAAutomationRule {
  id: string;
  name: string;
  triggerType: 'crm_stage_reached';
  pipelineName: string;
  stageId: string;
  productType?: 'Digital' | 'Presencial' | 'Evento' | '';
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

export interface LandingPage {
  id: string;
  title: string;
  productName: string;
  slug?: string;
  content: LandingPageContent;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  theme: 'modern' | 'clean' | 'dark' | 'corporate';
}

export interface ElementStyles {
    fontSize?: string;
    fontFamily?: string;
    textAlign?: 'left' | 'center' | 'right';
    color?: string;
    x?: number;
    y?: number;
    width?: number;
}

export interface LandingPageField {
    value: string;
    ai: string[];
}

export interface LandingPageSection {
  id: string;
  type: 'hero' | 'pain' | 'method' | 'benefits' | 'target' | 'learning' | 'modules' | 'bonuses' | 'testimonials' | 'pricing' | 'guarantee' | 'faq' | 'cta_final' | 'professor' | 'footer' | 'image' | 'form';
  enabled: boolean;
  content: any;
  styles?: Record<string, ElementStyles>;
}

export interface LandingPageContent {
  meta: {
      page_id: string;
      title: string;
      status: string;
      version: number;
      created_at: string;
      updated_at: string;
  };
  theme: {
      brand_name: string;
      tone: string;
      primary_color: string;
      text_color: string;
      bg_color: string;
      font_family: string;
  };
  ai_defaults: {
      enabled: boolean;
      max_suggestions: number;
      rules: string;
  };
  sections: LandingPageSection[];
  htmlCode?: string;
  selectedFormId?: string;
  ctaLink?: string;
}

export interface EmailConfig {
  apiKey: string;
  senderEmail: string;
  senderName: string;
}

export interface AiKnowledgeItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface AiConfig {
  id: string;
  systemPrompt: string;
  isActive: boolean;
  temperature: number;
  updatedAt: string;
}

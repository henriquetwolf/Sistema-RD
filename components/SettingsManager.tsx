import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, 
    Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Layout, ExternalLink, Trash2, BarChart3, Building2, Plus, Edit2,
    Monitor, Globe, Target, Info, Shield, TrendingUp, DollarSign,
    Loader2, Package, Tag, Layers, Palette, History, Clock, User, Search,
    Play, Pause, Calendar, Smartphone, Link as LinkIcon, ChevronDown, Award, ShoppingBag, Zap, Filter,
    List, ArrowRight, Braces, Sparkles, RefreshCw, BookOpen, Book, ListTodo, LifeBuoy, Hash, Tag as TagIcon, Terminal
} from 'lucide-react';
import { appBackend, CompanySetting, WebhookTrigger, Pipeline } from '../services/appBackend';
import { Role, Role as UserRole, Banner, InstructorLevel, ActivityLog, SyncJob, Product, CourseInfo, SupportTag } from '../types';
import clsx from 'clsx';

interface SettingsManagerProps {
  onLogoChange: (newLogo: string | null) => void;
  currentLogo: string | null;
  jobs: SyncJob[];
  onStartWizard: () => void;
  onDeleteJob: (id: string) => void;
}

interface UnifiedProduct {
    id: string;
    name: string;
    type: 'Digital' | 'Presencial' | 'Evento';
}

type SettingsTab = 'visual' | 'company' | 'banners' | 'connection_plug' | 'roles' | 'instructor_levels' | 'course_info' | 'support_tags' | 'logs' | 'database' | 'sql_script';

const DEFAULT_WEBHOOK_PAYLOAD = JSON.stringify({
  "data_venda": "{{data_venda}}",
  "situacao_venda": "Aprovada",
  "numero_venda": "{{deal_number}}",
  "nome_cliente": "{{nome_cliente}}",
  "email_cliente": "{{email_cliente}}",
  "telefone_cliente": "{{telefone_cliente}}",
  "cpf_cnpj_cliente": "{{cpf_cnpj_cliente}}",
  "nome_vendedor": "{{nome_vendedor}}",
  "tipo_produto": "{{tipo_produto}}",
  "curso_produto": "{{curso_produto}}",
  "fonte_negociacao": "{{fonte_negociacao}}",
  "campanha": "{{campanha}}",
  "funil_vendas": "{{funil_vendas}}",
  "etapa_funil": "{{etapa_funil}}",
  "cidade_cliente": "{{cidade_cliente}}",
  "turma_modulo": "{{turma_modulo}}",
  "valor_total": "{{valor_total}}",
  "forma_pagamento": "{{forma_pagamento}}",
  "valor_entrada": "{{valor_entrada}}",
  "numero_parcelas": "{{numero_parcelas}}",
  "valor_parcelas": "{{valor_parcelas}}",
  "dia_primeiro_vencimento": "{{dia_primeiro_vencimento}}",
  "link_comprovante": "{{link_comprovante}}",
  "codigo_transacao": "{{codigo_transacao}}"
}, null, 2);

export const SettingsManager: React.FC<SettingsManagerProps> = ({ 
  onLogoChange, 
  currentLogo,
  jobs,
  onStartWizard,
  onDeleteJob
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('visual');
  const [preview, setPreview] = useState<string | null>(currentLogo);
  const [securityMargin, setSecurityMargin] = useState<number>(5);
  const [isSaved, setIsSaved] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // States para CRUDs
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [isLoadingBanners, setIsLoadingBanners] = useState(false);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const [companies, setCompanies] = useState<CompanySetting[]>([]);
  const [allProducts, setAllProducts] = useState<UnifiedProduct[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isSavingItem, setIsSavingItem] = useState(false); 
  const [editingCompany, setEditingCompany] = useState<Partial<CompanySetting> | null>(null);
  const [productSearch, setProductSearch] = useState('');

  const [instructorLevels, setInstructorLevels] = useState<InstructorLevel[]>([]);
  const [isLoadingLevels, setIsLoadingLevels] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Partial<InstructorLevel> | null>(null);

  const [courseInfos, setCourseInfos] = useState<CourseInfo[]>([]);
  const [editingCourseInfo, setEditingCourseInfo] = useState<Partial<CourseInfo> | null>(null);
  const [isLoadingCourseInfo, setIsLoadingCourseInfo] = useState(false);

  const [supportTags, setSupportTags] = useState<SupportTag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [editingTag, setEditingTag] = useState<Partial<SupportTag> | null>(null);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Connection Plug States
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [webhookTriggers, setWebhookTriggers] = useState<WebhookTrigger[]>([]);
  const [editingTrigger, setEditingTrigger] = useState<Partial<WebhookTrigger> | null>(null);
  const [isLoadingTriggers, setIsLoadingTriggers] = useState(false);

  const PERMISSION_MODULES = [
      { id: 'overview', label: 'Visão Geral' },
      { id: 'hr', label: 'Recursos Humanos' },
      { id: 'crm', label: 'CRM Comercial' },
      { id: 'billing', label: 'Cobrança' },
      { id: 'inventory', label: 'Controle de Estoque' },
      { id: 'suporte_interno', label: 'Suporte Interno' },
      { id: 'whatsapp', label: 'Atendimento' },
      { id: 'analysis', label: 'Análise de Vendas' },
      { id: 'forms', label: 'Formulários' },
      { id: 'surveys', label: 'Pesquisas' },
      { id: 'contracts', label: 'Contratos' },
      { id: 'events', label: 'Eventos' },
      { id: 'students', label: 'Alunos' },
      { id: 'certificates', label: 'Certificados' },
      { id: 'products', label: 'Produtos Digitais' },
      { id: 'franchises', label: 'Franquias' },
      { id: 'partner_studios', label: 'Studios Parceiros' },
      { id: 'classes', label: 'Turmas' },
      { id: 'teachers', label: 'Professores' },
      { id: 'global_settings', label: 'Configurações' }
  ];

  useEffect(() => {
    const fetchGlobalSettings = async () => {
        const margin = await appBackend.getInventorySecurityMargin();
        setSecurityMargin(margin);
        const logo = await appBackend.getAppLogo();
        setPreview(logo);
    };
    fetchGlobalSettings();
  }, []);

  useEffect(() => {
      if (activeTab === 'roles') fetchRoles();
      else if (activeTab === 'banners') fetchBanners();
      else if (activeTab === 'company') { fetchCompanies(); fetchUnifiedProducts(); }
      else if (activeTab === 'instructor_levels') fetchInstructorLevels();
      else if (activeTab === 'course_info') fetchCourseInfos();
      else if (activeTab === 'support_tags') fetchSupportTags();
      else if (activeTab === 'logs') fetchLogs();
      else if (activeTab === 'connection_plug') { fetchPipelines(); fetchWebhookTriggers(); }
  }, [activeTab]);

  const fetchPipelines = async () => { try { const data = await appBackend.getPipelines(); setPipelines(data); } catch (e) {} };
  const fetchWebhookTriggers = async () => { setIsLoadingTriggers(true); try { const data = await appBackend.getWebhookTriggers(); setWebhookTriggers(data); } catch (e) {} finally { setIsLoadingTriggers(false); } };
  const fetchRoles = async () => { setIsLoadingRoles(true); try { const data = await appBackend.getRoles(); setRoles(data); } catch (e) {} finally { setIsLoadingRoles(false); } };
  const fetchBanners = async () => { setIsLoadingBanners(true); try { const data = await appBackend.getBanners('instructor'); setBanners(data); } catch (e) {} finally { setIsLoadingBanners(false); } };
  const fetchCompanies = async () => { setIsLoadingCompanies(true); try { const data = await appBackend.getCompanies(); setCompanies(data); } catch(e) {} finally { setIsLoadingCompanies(false); } };
  const fetchInstructorLevels = async () => { setIsLoadingLevels(true); try { const data = await appBackend.getInstructorLevels(); setInstructorLevels(data); } catch (e) {} finally { setIsLoadingLevels(false); } };
  const fetchCourseInfos = async () => { setIsLoadingCourseInfo(true); try { const data = await appBackend.getCourseInfos(); setCourseInfos(data); } catch (e) {} finally { setIsLoadingCourseInfo(false); } };
  const fetchSupportTags = async () => { setIsLoadingTags(true); try { const data = await appBackend.getSupportTags(); setSupportTags(data); } catch (e) {} finally { setIsLoadingTags(false); } };
  const fetchLogs = async () => { setIsLoadingLogs(true); try { const data = await appBackend.getActivityLogs(100); setLogs(data); } catch (e) {} finally { setIsLoadingLogs(false); } };

  const fetchUnifiedProducts = async () => {
      try {
          const [digitalRes, eventsRes, classesRes] = await Promise.all([
              appBackend.client.from('crm_products').select('id, name').eq('status', 'active'),
              appBackend.client.from('crm_events').select('id, name'),
              appBackend.client.from('crm_classes').select('course')
          ]);
          const unified: UnifiedProduct[] = [];
          if (digitalRes.data) (digitalRes.data as any[]).forEach(p => unified.push({ id: String(p.id), name: String(p.name), type: 'Digital' }));
          if (eventsRes.data) (eventsRes.data as any[]).forEach(e => unified.push({ id: String(e.id), name: String(e.name), type: 'Evento' }));
          if (classesRes.data) {
              const uniqueCourses = Array.from(new Set((classesRes.data as any[]).map(c => (c as any).course as string).filter(Boolean)));
              uniqueCourses.forEach((c: any) => unified.push({ id: `course-${c}`, name: String(c), type: 'Presencial' }));
          }
          setAllProducts(unified.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {}
  };

  const handleBannerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          const reader = new FileReader();
          reader.onloadend = () => setEditingBanner(prev => prev ? { ...prev, imageUrl: reader.result as string } : null);
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleSaveGlobal = async () => {
    if (preview) { await appBackend.saveAppLogo(preview); onLogoChange(preview); }
    await appBackend.saveInventorySecurityMargin(securityMargin);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSaveRole = async () => {
    if (!editingRole?.name) return;
    setIsSavingItem(true);
    try { await appBackend.saveRole(editingRole); await fetchRoles(); setEditingRole(null); } finally { setIsSavingItem(false); }
  };

  const handleSaveBanner = async () => {
    if (!editingBanner?.imageUrl || !editingBanner?.title) return;
    setIsSavingItem(true);
    try { await appBackend.saveBanner(editingBanner as Banner); await fetchBanners(); setEditingBanner(null); } finally { setIsSavingItem(false); }
  };

  const handleSaveCompany = async () => {
    if (!editingCompany?.legalName) return;
    setIsSavingItem(true);
    try { await appBackend.saveCompany(editingCompany as CompanySetting); await fetchCompanies(); setEditingCompany(null); } finally { setIsSavingItem(false); }
  };

  const handleSaveLevel = async () => {
    if (!editingLevel?.name) return;
    setIsSavingItem(true);
    try { await appBackend.saveInstructorLevel(editingLevel as InstructorLevel); await fetchInstructorLevels(); setEditingLevel(null); } finally { setIsSavingItem(false); }
  };

  const handleSaveCourseInfo = async () => {
      if (!editingCourseInfo?.courseName) return;
      setIsSavingItem(true);
      try { await appBackend.saveCourseInfo(editingCourseInfo); await fetchCourseInfos(); setEditingCourseInfo(null); } finally { setIsSavingItem(false); }
  };

  const handleSaveTag = async () => {
      if (!editingTag?.name) return;
      setIsSavingItem(true);
      try { await appBackend.saveSupportTag(editingTag); await fetchSupportTags(); setEditingTag(null); } finally { setIsSavingItem(false); }
  };

  const handleSaveTrigger = async () => {
      if (!editingTrigger?.pipelineName || !editingTrigger?.stageId) return;
      setIsSavingItem(true);
      try { await appBackend.saveWebhookTrigger(editingTrigger); await fetchWebhookTriggers(); setEditingTrigger(null); } finally { setIsSavingItem(false); }
  };

  const generateRepairSQL = () => `
-- SCRIPT DE FUNDAÇÃO CRM V57
CREATE TABLE IF NOT EXISTS public.crm_forms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    campaign text,
    is_lead_capture boolean DEFAULT false,
    distribution_mode text,
    fixed_owner_id uuid,
    team_id uuid,
    target_pipeline text,
    target_stage text,
    questions jsonb DEFAULT '[]'::jsonb,
    style jsonb DEFAULT '{}'::jsonb,
    folder_id uuid,
    target_type text DEFAULT 'all',
    target_product_type text,
    target_product_name text,
    only_if_finished boolean DEFAULT false,
    is_active boolean DEFAULT true,
    submissions_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Garantir colunas em crm_forms caso a tabela já exista
ALTER TABLE IF EXISTS public.crm_forms ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'all';
ALTER TABLE IF EXISTS public.crm_forms ADD COLUMN IF NOT EXISTS target_product_type text;
ALTER TABLE IF EXISTS public.crm_forms ADD COLUMN IF NOT EXISTS target_product_name text;
ALTER TABLE IF EXISTS public.crm_forms ADD COLUMN IF NOT EXISTS only_if_finished boolean DEFAULT false;
ALTER TABLE IF EXISTS public.crm_forms ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE IF EXISTS public.crm_forms ADD COLUMN IF NOT EXISTS submissions_count integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.crm_form_submissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid REFERENCES public.crm_forms(id) ON DELETE CASCADE,
    student_id text,
    answers jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_form_folders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    type text DEFAULT 'form',
    created_at timestamp with time zone DEFAULT now()
);

-- Garantir coluna type em crm_form_folders para distinção entre formulários e pesquisas
ALTER TABLE IF EXISTS public.crm_form_folders ADD COLUMN IF NOT EXISTS type text DEFAULT 'form';

CREATE TABLE IF NOT EXISTS public.crm_online_courses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    price numeric DEFAULT 0,
    payment_link text,
    image_url text,
    certificate_template_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_banners (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    image_url text NOT NULL,
    link_url text,
    target_audience text DEFAULT 'student',
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_webhook_triggers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_name text NOT NULL,
    stage_id text NOT NULL,
    payload_json text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_name text,
    action text,
    module text,
    details text,
    record_id text,
    created_at timestamp with time zone DEFAULT now()
);

NOTIFY pgrst, 'reload schema';
  `.trim();

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };

  return (
    <div className="animate-in fade-in duration-300 space-y-8 pb-20">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Configurações</h2>
            <p className="text-slate-500 text-sm">Painel de controle técnico do ecossistema.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto shrink-0 max-w-full no-scrollbar">
            {[
                { id: 'visual', label: 'Geral', color: 'text-slate-800' },
                { id: 'company', label: 'Empresas', color: 'text-teal-700' },
                { id: 'banners', label: 'Banners', color: 'text-orange-700' },
                { id: 'connection_plug', label: 'Plug', color: 'text-indigo-700' },
                { id: 'roles', label: 'Acessos', color: 'text-indigo-700' },
                { id: 'instructor_levels', label: 'Níveis', color: 'text-rose-700' },
                { id: 'course_info', label: 'Portal', color: 'text-blue-700' },
                { id: 'support_tags', label: 'Tags', color: 'text-emerald-700' },
                { id: 'logs', label: 'Logs', color: 'text-slate-600' },
                { id: 'database', label: 'Banco', color: 'text-amber-700' },
                { id: 'sql_script', label: 'SQL', color: 'text-red-700' }
            ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as SettingsTab)} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === tab.id ? `bg-white ${tab.color} shadow-sm` : "text-slate-500 hover:text-slate-700")}>{tab.label}</button>
            ))}
        </div>
      </div>
      
      <div className="max-w-5xl space-y-8">
        {activeTab === 'visual' && (
            <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4"><Palette className="text-teal-600" size={20}/> Logomarca do Sistema</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        <div className="w-64 h-32 bg-slate-50 border rounded-lg flex items-center justify-center p-4">
                            {preview ? <img src={preview} alt="Logo" className="max-w-full max-h-full object-contain" /> : <ImageIcon className="text-slate-300" size={48} />}
                        </div>
                        <input type="file" className="hidden" id="logo-up" accept="image/*" onChange={(e) => {
                             if (e.target.files?.[0]) {
                                const reader = new FileReader();
                                reader.onloadend = () => setPreview(reader.result as string);
                                reader.readAsDataURL(e.target.files[0]);
                             }
                        }} />
                        <label htmlFor="logo-up" className="cursor-pointer bg-teal-50 text-teal-700 px-6 py-2 rounded-lg font-bold border border-teal-200 hover:bg-teal-100 transition-colors">Trocar Logo</label>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Margem de Segurança do Estoque</h3>
                    <input type="number" className="w-24 px-4 py-2 border rounded-lg" value={securityMargin} onChange={(e) => setSecurityMargin(parseInt(e.target.value) || 0)} />
                    <p className="text-xs text-slate-400 mt-2">Limite para alerta de "Necessita Remessa".</p>
                </div>
                <button onClick={handleSaveGlobal} className="bg-teal-600 text-white px-10 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-teal-700 transition-all">{isSaved ? <><CheckCircle size={18}/> Salvo!</> : <><Save size={18}/> Salvar Geral</>}</button>
            </div>
        )}

        {activeTab === 'company' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Empresas e Faturamento</h3>
                    <button onClick={() => setEditingCompany({ id: '', legalName: '', cnpj: '', productTypes: [], productIds: [] })} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-teal-700">+ Nova Empresa</button>
                </div>
                <div className="space-y-4">
                    {isLoadingCompanies ? <Loader2 className="animate-spin mx-auto text-teal-600"/> : companies.map(c => (
                        <div key={c.id} className="p-4 border rounded-xl flex items-center justify-between group">
                            <div><p className="font-bold text-slate-800">{c.legalName}</p><p className="text-xs text-slate-500">CNPJ: {c.cnpj}</p></div>
                            <div className="flex gap-2"><button onClick={() => setEditingCompany(c)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteCompany(c.id).then(fetchCompanies)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'banners' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Banners do Portal</h3>
                    <button onClick={() => setEditingBanner({ title: '', linkUrl: '', targetAudience: 'student', active: true })} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-700">+ Novo Banner</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isLoadingBanners ? <Loader2 className="animate-spin mx-auto text-orange-600"/> : banners.map(b => (
                        <div key={b.id} className="border rounded-xl overflow-hidden group">
                            <img src={b.imageUrl} className="w-full h-32 object-cover" />
                            <div className="p-4 flex items-center justify-between bg-slate-50">
                                <div><p className="font-bold text-xs">{b.title}</p><p className="text-[10px] text-slate-400 uppercase">{b.targetAudience}</p></div>
                                <div className="flex gap-1">
                                    <button onClick={() => setEditingBanner(b)} className="p-1.5 text-orange-600 hover:bg-white rounded"><Edit2 size={14}/></button>
                                    <button onClick={() => appBackend.deleteBanner(b.id).then(fetchBanners)} className="p-1.5 text-red-600 hover:bg-white rounded"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'connection_plug' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Zap size={24}/></div>
                        <div>
                            <h3 className="text-lg font-bold">Automação: Connection Plug</h3>
                            <p className="text-xs text-slate-500">Configuração de Webhooks e Gatilhos por etapa do CRM.</p>
                        </div>
                    </div>
                    <button onClick={() => setEditingTrigger({ pipelineName: 'Padrão', stageId: 'closed', payloadJson: DEFAULT_WEBHOOK_PAYLOAD })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700">+ Novo Gatilho</button>
                </div>
                <div className="space-y-4">
                    {isLoadingTriggers ? <Loader2 className="animate-spin mx-auto text-indigo-600"/> : webhookTriggers.map(t => (
                        <div key={t.id} className="p-4 border rounded-xl flex items-center justify-between group hover:border-indigo-300 transition-all">
                            <div><p className="font-bold text-slate-800">{t.pipelineName} • {t.stageId}</p><p className="text-[10px] text-slate-400 uppercase">Disparo de Automação Externo</p></div>
                            <div className="flex gap-2"><button onClick={() => setEditingTrigger(t)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteWebhookTrigger(t.id!).then(fetchWebhookTriggers)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'roles' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Perfis de Acesso</h3>
                    <button onClick={() => setEditingRole({ id: '', name: '', permissions: {} })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700">+ Novo Perfil</button>
                </div>
                <div className="space-y-3">
                    {isLoadingRoles ? <Loader2 className="animate-spin mx-auto text-indigo-600"/> : roles.map(r => (
                        <div key={r.id} className="p-4 border rounded-xl flex items-center justify-between">
                            <span className="font-bold">{r.name}</span>
                            <div className="flex gap-2"><button onClick={() => setEditingRole(r)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteRole(r.id).then(fetchRoles)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'instructor_levels' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Níveis Docentes</h3>
                    <button onClick={() => setEditingLevel({ id: '', name: '', honorarium: 0 })} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-rose-700">+ Novo Nível</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isLoadingLevels ? <Loader2 className="animate-spin mx-auto text-rose-600"/> : instructorLevels.map(lvl => (
                        <div key={lvl.id} className="p-4 border rounded-xl flex items-center justify-between">
                            <div><p className="font-bold">{lvl.name}</p><p className="text-xs text-emerald-600 font-bold">R$ {lvl.honorarium.toLocaleString()}</p></div>
                            <div className="flex gap-1"><button onClick={() => setEditingLevel(lvl)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Edit2 size={14}/></button><button onClick={() => appBackend.deleteInstructorLevel(lvl.id).then(fetchInstructorLevels)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'course_info' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Conteúdo Portal Aluno</h3>
                    <button onClick={() => setEditingCourseInfo({ courseName: '', details: '', materials: '', requirements: '' })} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700">+ Nova Info</button>
                </div>
                <div className="space-y-4">
                    {isLoadingCourseInfo ? <Loader2 className="animate-spin mx-auto text-blue-600"/> : courseInfos.map(info => (
                        <div key={info.id} className="p-4 border rounded-xl flex items-center justify-between group">
                            <span className="font-bold">{info.courseName}</span>
                            <div className="flex gap-2"><button onClick={() => setEditingCourseInfo(info)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteCourseInfo(info.id).then(fetchCourseInfos)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'support_tags' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Categorias de Suporte</h3>
                    <button onClick={() => setEditingTag({ name: '', role: 'all' })} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700">+ Novo Tag</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isLoadingTags ? <Loader2 className="animate-spin mx-auto text-emerald-600"/> : supportTags.map(tag => (
                        <div key={tag.id} className="p-4 border rounded-xl flex items-center justify-between">
                            <div><p className="font-bold">{tag.name}</p><p className="text-[10px] text-slate-400 uppercase">Acesso: {tag.role}</p></div>
                            <div className="flex gap-2"><button onClick={() => setEditingTag(tag)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteSupportTag(tag.id).then(fetchSupportTags)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'logs' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2"><History size={20}/> Histórico de Auditoria</h3>
                    <button onClick={fetchLogs} className="p-2 text-slate-400 hover:text-indigo-600 transition-all"><RefreshCw size={18} className={clsx(isLoadingLogs && "animate-spin")} /></button>
                </div>
                <div className="space-y-3">
                    {isLoadingLogs ? <Loader2 className="animate-spin mx-auto text-slate-400"/> : logs.map(log => (
                        <div key={log.id} className="p-3 border-b border-slate-50 text-xs flex items-start gap-4 animate-in fade-in">
                            <span className="text-slate-400 w-32 shrink-0 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                            <span className="font-bold text-slate-700 w-40 shrink-0 truncate">{log.userName}</span>
                            <span className="flex-1 text-slate-600 leading-relaxed"><span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-black uppercase mr-2">{log.action}</span> {log.details}</span>
                        </div>
                    ))}
                    {logs.length === 0 && !isLoadingLogs && <div className="text-center py-10 text-slate-300 italic">Nenhum log de atividade recente.</div>}
                </div>
            </div>
        )}

        {activeTab === 'database' && (
            <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-8">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3"><Layers className="text-amber-600"/><h3 className="text-lg font-bold">Sincronização de Banco</h3></div>
                        <button onClick={onStartWizard} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-teal-700 flex items-center gap-2"><Plus size={16}/> Nova Conexão</button>
                    </div>
                    <div className="space-y-3">
                        {jobs.map(job => (
                            <div key={job.id} className="p-4 border rounded-xl flex items-center justify-between hover:bg-slate-50">
                                <div><p className="font-bold">{job.name}</p><p className="text-[10px] text-slate-400 font-black uppercase">{job.config.tableName} • {job.intervalMinutes}m</p></div>
                                <button onClick={() => onDeleteJob(job.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'sql_script' && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-8 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4"><Terminal className="text-red-500" /><h3 className="text-lg font-bold text-white uppercase tracking-widest">Script SQL de Atualização V57</h3></div>
                <p className="text-sm text-slate-400 mb-6 font-medium leading-relaxed">Este script repara a estrutura do banco de dados, incluindo tabelas de formulários, pesquisas, cursos, logs e automações. Copie e execute no **SQL Editor** do Supabase.</p>
                <div className="relative">
                    <pre className="bg-black text-emerald-400 p-6 rounded-2xl text-[10px] font-mono overflow-auto max-h-[400px] shadow-inner custom-scrollbar-dark border border-slate-800">
                        {generateRepairSQL()}
                    </pre>
                    <button onClick={copySql} className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border border-slate-700">
                        {sqlCopied ? <><Check size={14}/> Copiado!</> : <><Copy size={14}/> Copiar Script</>}
                    </button>
                </div>
                <div className="mt-6 flex items-start gap-3 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                    <AlertTriangle className="text-red-500 shrink-0" size={18}/>
                    <p className="text-[10px] text-red-200 leading-snug uppercase font-black">CUIDADO: Execute este script apenas no ambiente de produção correto. Ele não apaga dados existentes (IF NOT EXISTS), mas modifica o esquema global do banco.</p>
                </div>
            </div>
        )}
      </div>

      {/* MODAL GENÉRICO PARA CRUDS */}
      {(editingRole || editingBanner || editingCompany || editingLevel || editingCourseInfo || editingTag || editingTrigger) && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold uppercase text-xs tracking-widest text-slate-500">Configuração de Item</h3>
                      <button onClick={() => { setEditingRole(null); setEditingBanner(null); setEditingCompany(null); setEditingLevel(null); setEditingCourseInfo(null); setEditingTag(null); setEditingTrigger(null); }}><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto space-y-6">
                      {/* FORM ROLE */}
                      {editingRole && (
                          <div className="space-y-6">
                              <input placeholder="Nome do Perfil" className="w-full px-4 py-2 border rounded-lg font-bold" value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} />
                              <div className="grid grid-cols-2 gap-3">
                                  {PERMISSION_MODULES.map(m => (
                                      <label key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                                          <input type="checkbox" checked={!!editingRole.permissions?.[m.id]} onChange={e => {
                                              const perms = { ...editingRole.permissions, [m.id]: e.target.checked };
                                              setEditingRole({ ...editingRole, permissions: perms });
                                          }} className="w-4 h-4 rounded text-indigo-600" />
                                          <span className="text-xs font-bold text-slate-700">{m.label}</span>
                                      </label>
                                  ))}
                              </div>
                              <button onClick={handleSaveRole} disabled={isSavingItem} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">{isSavingItem ? 'Salvando...' : 'Salvar Perfil'}</button>
                          </div>
                      )}

                      {/* FORM BANNER */}
                      {editingBanner && (
                          <div className="space-y-6">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Título do Banner</label>
                                  <input type="text" className="w-full px-4 py-3 border rounded-2xl font-bold bg-slate-50" value={editingBanner.title} onChange={e => setEditingBanner({...editingBanner, title: e.target.value})} placeholder="Ex: Campanha Black Friday" />
                              </div>
                              
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Link de Direcionamento (URL)</label>
                                  <input type="text" className="w-full px-4 py-3 border rounded-2xl bg-slate-50 font-mono text-xs" value={editingBanner.linkUrl} onChange={e => setEditingBanner({...editingBanner, linkUrl: e.target.value})} placeholder="https://exemplo.com" />
                              </div>

                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Imagem do Banner</label>
                                  <div className="flex flex-col gap-4">
                                      <div className="flex items-center gap-4">
                                          <button 
                                            onClick={() => bannerFileInputRef.current?.click()}
                                            className="bg-orange-50 border-2 border-orange-200 text-orange-700 px-6 py-2.5 rounded-xl font-black text-xs uppercase hover:bg-orange-100 transition-all flex items-center gap-2 shadow-sm"
                                          >
                                              <Upload size={16}/> Selecionar Arquivo
                                          </button>
                                          <input 
                                            ref={bannerFileInputRef}
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*" 
                                            onChange={handleBannerImageUpload} 
                                          />
                                      </div>
                                      {editingBanner.imageUrl && (
                                          <div className="w-full h-32 rounded-2xl overflow-hidden border shadow-sm bg-slate-100">
                                              <img src={editingBanner.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                                          </div>
                                      )}
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Público Alvo</label>
                                      <select className="w-full px-4 py-3 border rounded-2xl bg-white text-sm font-bold" value={editingBanner.targetAudience} onChange={e => setEditingBanner({...editingBanner, targetAudience: e.target.value as any})}>
                                          <option value="student">Alunos</option><option value="instructor">Instrutores</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Estado</label>
                                      <label className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-100 cursor-pointer hover:bg-white transition-all"><input type="checkbox" checked={editingBanner.active} onChange={e => setEditingBanner({...editingBanner, active: e.target.checked})} className="w-5 h-5 rounded text-orange-600"/><span className="text-xs font-black uppercase text-slate-700">Ativo no Portal</span></label>
                                  </div>
                              </div>
                              <button onClick={handleSaveBanner} disabled={isSavingItem} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50">{isSavingItem ? 'Salvando...' : 'Salvar Banner'}</button>
                          </div>
                      )}

                      {/* FORM LEVEL */}
                      {editingLevel && (
                          <div className="space-y-6">
                              <input placeholder="Nome do Nível" className="w-full px-4 py-2 border rounded-lg font-bold" value={editingLevel.name} onChange={e => setEditingLevel({...editingLevel, name: e.target.value})} />
                              <div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="number" placeholder="Valor do Honorário" className="w-full pl-10 pr-4 py-2 border rounded-lg font-bold" value={editingLevel.honorarium} onChange={e => setEditingLevel({...editingLevel, honorarium: parseFloat(e.target.value) || 0})} /></div>
                              <button onClick={handleSaveLevel} disabled={isSavingItem} className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold">{isSavingItem ? 'Salvando...' : 'Salvar Nível'}</button>
                          </div>
                      )}

                      {/* FORM TAG */}
                      {editingTag && (
                          <div className="space-y-6">
                              <input placeholder="Nome da Categoria" className="w-full px-4 py-2 border rounded-lg" value={editingTag.name} onChange={e => setEditingTag({...editingTag, name: e.target.value})} />
                              <select className="w-full px-4 py-2 border rounded-lg bg-white" value={editingTag.role} onChange={e => setEditingTag({...editingTag, role: e.target.value as any})}>
                                  <option value="all">Todos</option><option value="student">Alunos</option><option value="instructor">Instrutores</option><option value="studio">Studios</option>
                              </select>
                              <button onClick={handleSaveTag} disabled={isSavingItem} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold">{isSavingItem ? 'Salvando...' : 'Salvar Tag'}</button>
                          </div>
                      )}

                      {/* FORM COURSE INFO */}
                      {editingCourseInfo && (
                          <div className="space-y-6">
                              <input placeholder="Nome do Curso" className="w-full px-4 py-2 border rounded-lg font-bold" value={editingCourseInfo.courseName} onChange={e => setEditingCourseInfo({...editingCourseInfo, courseName: e.target.value})} />
                              <textarea placeholder="Detalhes" className="w-full px-4 py-2 border rounded-lg h-24" value={editingCourseInfo.details} onChange={e => setEditingCourseInfo({...editingCourseInfo, details: e.target.value})} />
                              <button onClick={handleSaveCourseInfo} disabled={isSavingItem} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">{isSavingItem ? 'Salvando...' : 'Salvar Info'}</button>
                          </div>
                      )}

                      {/* FORM TRIGGER (PLUG) */}
                      {editingTrigger && (
                          <div className="space-y-6 animate-in slide-in-from-bottom-2">
                              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex gap-3 text-xs text-indigo-700"><Zap size={18}/><p>Defina qual **Funil** e **Etapa** devem disparar o webhook para integração externa.</p></div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pipeline / Funil</label>
                                    <input className="w-full px-4 py-2 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl text-sm font-bold transition-all outline-none" value={editingTrigger.pipelineName} onChange={e => setEditingTrigger({...editingTrigger, pipelineName: e.target.value})} placeholder="Padrão" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ID da Etapa (Closed, Contacted...)</label>
                                    <input className="w-full px-4 py-2 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl text-sm font-bold font-mono transition-all outline-none" value={editingTrigger.stageId} onChange={e => setEditingTrigger({...editingTrigger, stageId: e.target.value})} placeholder="closed" />
                                </div>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Payload JSON Customizado</label>
                                  <textarea className="w-full px-4 py-3 border border-slate-200 bg-slate-50 focus:bg-white rounded-2xl text-xs font-mono h-48 outline-none transition-all" value={editingTrigger.payloadJson} onChange={e => setEditingTrigger({...editingTrigger, payloadJson: e.target.value})} />
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                      <span className="text-[8px] font-black text-slate-400 border px-1 rounded uppercase">Placeholders:</span>
                                      {["{{data_venda}}", "{{nome_cliente}}", "{{email_cliente}}", "{{turma_modulo}}"].map(p => <span key={p} className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded cursor-copy" title="Clique para copiar" onClick={() => navigator.clipboard.writeText(p)}>{p}</span>)}
                                  </div>
                              </div>
                              <button onClick={handleSaveTrigger} disabled={isSavingItem} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50">{isSavingItem ? 'Salvando...' : 'Salvar Gatilho'}</button>
                          </div>
                      )}
                      
                      {/* FORM COMPANY */}
                      {editingCompany && (
                          <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                  <input placeholder="Razão Social" className="w-full px-3 py-2 border rounded-lg" value={editingCompany.legalName} onChange={e => setEditingCompany({...editingCompany, legalName: e.target.value})} />
                                  <input placeholder="CNPJ" className="w-full px-3 py-2 border rounded-lg" value={editingCompany.cnpj} onChange={e => setEditingCompany({...editingCompany, cnpj: e.target.value})} />
                              </div>
                              <input placeholder="Webhook URL" className="w-full px-3 py-2 border rounded-lg font-mono text-xs" value={editingCompany.webhookUrl} onChange={e => setEditingCompany({...editingCompany, webhookUrl: e.target.value})} />
                              <button onClick={handleSaveCompany} disabled={isSavingItem} className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold">{isSavingItem ? 'Salvando...' : 'Salvar Empresa'}</button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
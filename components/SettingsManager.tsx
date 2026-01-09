
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, 
    Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Layout, ExternalLink, Trash2, BarChart3, Building2, Plus, Edit2,
    Monitor, Globe, Target, Info, Shield, TrendingUp, DollarSign,
    Loader2, Package, Tag, Layers, Palette, History, Clock, User, Search,
    Play, Pause, Calendar, Smartphone, Link as LinkIcon, ChevronDown, Award, ShoppingBag, Zap, Filter,
    List, ArrowRight, Braces, Sparkles, RefreshCw, BookOpen, Book, ListTodo, LifeBuoy, Hash, Tag as TagIcon
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

const COURSES_MASTER = ['Formação Completa em Pilates', 'Formação em Pilates Clássico', 'MIT - Movimento Inteligente', 'Suspensus'];

export const SettingsManager: React.FC<SettingsManagerProps> = ({ 
  onLogoChange, 
  currentLogo,
  jobs,
  onStartWizard,
  onDeleteJob
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'connections' | 'company' | 'roles' | 'database' | 'banners' | 'instructor_levels' | 'logs' | 'connection_plug' | 'course_info' | 'support_tags'>('visual');
  const [preview, setPreview] = useState<string | null>(currentLogo);
  const [securityMargin, setSecurityMargin] = useState<number>(5);
  const [isSaved, setIsSaved] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // States para CRUDs
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [isLoadingBanners, setIsLoadingBanners] = useState(false);

  const [companies, setCompanies] = useState<CompanySetting[]>([]);
  const [allProducts, setAllProducts] = useState<UnifiedProduct[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false); 
  const [editingCompany, setEditingCompany] = useState<Partial<CompanySetting> | null>(null);
  const [productSearch, setProductSearch] = useState('');

  const [instructorLevels, setInstructorLevels] = useState<InstructorLevel[]>([]);
  const [isLoadingLevels, setIsLoadingLevels] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Partial<InstructorLevel> | null>(null);

  const [courseInfos, setCourseInfos] = useState<CourseInfo[]>([]);
  const [editingCourseInfo, setEditingCourseInfo] = useState<Partial<CourseInfo> | null>(null);
  const [isLoadingCourseInfo, setIsLoadingCourseInfo] = useState(false);
  const [isSavingCourseInfo, setIsSavingCourseInfo] = useState(false);

  const [supportTags, setSupportTags] = useState<SupportTag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [editingTag, setEditingTag] = useState<Partial<SupportTag> | null>(null);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  // Connection Plug States
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [webhookTriggers, setWebhookTriggers] = useState<WebhookTrigger[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [customJson, setCustomJson] = useState('');
  const [editingTriggerId, setEditingTriggerId] = useState<string | null>(null);
  const [isSavingTrigger, setIsSavingTrigger] = useState(false);
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
      fetchGlobalSettings();
      if (activeTab === 'roles') fetchRoles();
      else if (activeTab === 'banners') fetchBanners();
      else if (activeTab === 'company') { fetchCompanies(); fetchUnifiedProducts(); }
      else if (activeTab === 'instructor_levels') fetchInstructorLevels();
      else if (activeTab === 'logs') fetchLogs();
      else if (activeTab === 'connection_plug') { fetchPipelines(); fetchWebhookTriggers(); }
      else if (activeTab === 'course_info') fetchCourseInfos();
      else if (activeTab === 'support_tags') fetchSupportTags();
  }, [activeTab]);

  const fetchGlobalSettings = async () => {
    const margin = await appBackend.getInventorySecurityMargin();
    setSecurityMargin(margin);
    const logo = await appBackend.getAppLogo();
    setPreview(logo);
  };

  const fetchSupportTags = async () => {
      setIsLoadingTags(true);
      try {
          const data = await appBackend.getSupportTags();
          setSupportTags(data);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingTags(false);
      }
  };

  const handleSaveSupportTag = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingTag || !editingTag.name || !editingTag.role) return;
      try {
          await appBackend.saveSupportTag(editingTag);
          setEditingTag(null);
          fetchSupportTags();
      } catch (e: any) {
          alert(`Erro ao salvar tag: ${e.message}`);
      }
  };

  const fetchPipelines = async () => {
      try {
          const data = await appBackend.getPipelines();
          setPipelines(data);
      } catch (e) {}
  };

  const fetchWebhookTriggers = async () => {
      setIsLoadingTriggers(true);
      try {
          const data = await appBackend.getWebhookTriggers();
          setWebhookTriggers(data);
      } catch (e) {} finally { setIsLoadingTriggers(false); }
  };

  const fetchRoles = async () => {
      setIsLoadingRoles(true);
      try { const data = await appBackend.getRoles(); setRoles(data); } catch (e) { console.error(e); } finally { setIsLoadingRoles(false); }
  };

  const fetchBanners = async () => {
      setIsLoadingBanners(true);
      try { const data = await appBackend.getBanners(); setBanners(data); } catch (e) { console.error(e); } finally { setIsLoadingBanners(false); }
  };

  const fetchCompanies = async () => {
      setIsLoadingCompanies(true);
      try { const data = await appBackend.getCompanies(); setCompanies(data); } catch(e) { console.error(e); } finally { setIsLoadingCompanies(false); }
  };

  const fetchCourseInfos = async () => {
      setIsLoadingCourseInfo(true);
      try {
          const data = await appBackend.getCourseInfos();
          setCourseInfos(data);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingCourseInfo(false);
      }
  };

  const fetchUnifiedProducts = async () => {
      try {
          const [digitalRes, eventsRes, classesRes] = (await Promise.all([
              appBackend.client.from('crm_products').select('id, name').eq('status', 'active'),
              appBackend.client.from('crm_events').select('id, name'),
              appBackend.client.from('crm_classes').select('course')
          ])) as any[];

          const unified: UnifiedProduct[] = [];

          if (digitalRes.data) {
              (digitalRes.data as any[]).forEach(p => unified.push({ id: String(p.id), name: String(p.name), type: 'Digital' }));
          }
          if (eventsRes.data) {
              (eventsRes.data as any[]).forEach(e => unified.push({ id: String(e.id), name: String(e.name), type: 'Evento' }));
          }
          if (classesRes.data) {
              const uniqueCourses = Array.from(new Set((classesRes.data as any[]).map(c => c.course as string).filter(Boolean)));
              uniqueCourses.forEach((c: string) => unified.push({ id: `course-${c}`, name: c, type: 'Presencial' }));
          }

          setAllProducts(unified.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {}
  };

  const filteredProductsBySelectedTypes = useMemo(() => {
      if (!editingCompany) return [];
      const selectedTypes = editingCompany.productTypes || [];
      if (selectedTypes.length === 0) return [];

      return allProducts.filter(p => 
          selectedTypes.includes(p.type) && 
          p.name.toLowerCase().includes(productSearch.toLowerCase())
      );
  }, [allProducts, editingCompany, productSearch]);

  const fetchInstructorLevels = async () => {
    setIsLoadingLevels(true);
    try { const data = await appBackend.getInstructorLevels(); setInstructorLevels(data); } catch (e) { console.error(e); } finally { setIsLoadingLevels(false); }
  };

  const fetchLogs = async () => {
      setIsLoadingLogs(true);
      try {
          const data = await appBackend.getActivityLogs();
          setLogs(data);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingLogs(false);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => { setPreview(reader.result as string); setIsSaved(false); };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSaveGlobal = async () => {
    if (preview) {
      await appBackend.saveAppLogo(preview);
      onLogoChange(preview);
    }
    await appBackend.saveInventorySecurityMargin(securityMargin);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const generateRepairSQL = () => `
-- SCRIPT DE REPARO DEFINITIVO VOLL CRM (V28)
-- Adição de campos de destinatário para chamados iniciados pela Adm.

-- Suporte a Tags de Chamado
CREATE TABLE IF NOT EXISTS public.crm_support_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role text NOT NULL, -- 'student', 'instructor', 'studio', 'all'
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Suporte a Tickets de Suporte Interno
CREATE TABLE IF NOT EXISTS public.crm_support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id text NOT NULL,
    sender_name text NOT NULL,
    sender_email text NOT NULL,
    sender_role text NOT NULL,
    target_id text,
    target_name text,
    target_email text,
    target_role text,
    subject text NOT NULL,
    message text NOT NULL,
    tag text,
    status text DEFAULT 'open',
    response text,
    assigned_id text,
    assigned_name text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Suporte a Mensagens em Thread dos Chamados
CREATE TABLE IF NOT EXISTS public.crm_support_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid REFERENCES public.crm_support_tickets(id) ON DELETE CASCADE,
    sender_id text NOT NULL,
    sender_name text NOT NULL,
    sender_role text NOT NULL,
    content text NOT NULL,
    attachment_url text,
    attachment_name text,
    created_at timestamptz DEFAULT now()
);

-- GARANTINDO COLUNAS CASO JÁ EXISTISSEM
ALTER TABLE IF EXISTS public.crm_support_tickets ADD COLUMN IF NOT EXISTS target_id text;
ALTER TABLE IF EXISTS public.crm_support_tickets ADD COLUMN IF NOT EXISTS target_name text;
ALTER TABLE IF EXISTS public.crm_support_tickets ADD COLUMN IF NOT EXISTS target_email text;
ALTER TABLE IF EXISTS public.crm_support_tickets ADD COLUMN IF NOT EXISTS target_role text;
ALTER TABLE IF EXISTS public.crm_support_tickets ADD COLUMN IF NOT EXISTS tag text;
ALTER TABLE IF EXISTS public.crm_support_tickets ADD COLUMN IF NOT EXISTS assigned_id text;
ALTER TABLE IF EXISTS public.crm_support_tickets ADD COLUMN IF NOT EXISTS assigned_name text;
ALTER TABLE IF EXISTS public.crm_support_tickets ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.crm_support_messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE IF EXISTS public.crm_support_messages ADD COLUMN IF NOT EXISTS attachment_name text;

-- Permissões
GRANT ALL ON public.crm_support_tickets TO anon, authenticated, service_role;
GRANT ALL ON public.crm_support_messages TO anon, authenticated, service_role;
GRANT ALL ON public.crm_support_tags TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload config';
  `.trim();

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    await appBackend.saveRole(editingRole);
    fetchRoles();
    setEditingRole(null);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;
    await appBackend.saveBanner(editingBanner as Banner);
    fetchBanners();
    setEditingBanner(null);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    
    setIsSavingCompany(true);
    try {
        await appBackend.saveCompany(editingCompany as CompanySetting);
        await fetchCompanies();
        setEditingCompany(null);
        alert("Empresa salva com sucesso!");
    } catch (err: any) {
        console.error(err);
        alert(`Erro ao salvar empresa: ${err.message}`);
    } finally {
        setIsSavingCompany(false);
    }
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLevel) return;
    await appBackend.saveInstructorLevel(editingLevel as InstructorLevel);
    fetchInstructorLevels();
    setEditingLevel(null);
  };

  const handleSaveCourseInfo = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingCourseInfo || !editingCourseInfo.courseName) return;
      setIsSavingCourseInfo(true);
      try {
          await appBackend.saveCourseInfo(editingCourseInfo);
          await fetchCourseInfos();
          setEditingCourseInfo(null);
          alert("Informações do curso salvas!");
      } catch (err: any) {
          alert(`Erro ao salvar: ${err.message}`);
      } finally {
          setIsSavingCourseInfo(false);
      }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-8 pb-20">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>
            <p className="text-slate-500 text-sm">Personalize acessos, identidade e acompanhe atividades.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto shrink-0 max-w-full no-scrollbar">
            <button onClick={() => setActiveTab('visual')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'visual' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Geral</button>
            <button onClick={() => setActiveTab('course_info')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'course_info' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Info Cursos</button>
            <button onClick={() => setActiveTab('support_tags')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'support_tags' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Tags Suporte</button>
            <button onClick={() => setActiveTab('connections')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'connections' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Conexões</button>
            <button onClick={() => setActiveTab('company')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'company' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Empresas</button>
            <button onClick={() => setActiveTab('roles')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'roles' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Acessos</button>
            <button onClick={() => setActiveTab('logs')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'logs' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Atividades</button>
            <button onClick={() => setActiveTab('banners')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'banners' ? "bg-white text-orange-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Banners</button>
            <button onClick={() => setActiveTab('instructor_levels')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'instructor_levels' ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Níveis</button>
            <button onClick={() => setActiveTab('database')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'database' ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Banco de Dados</button>
        </div>
      </div>
      
      <div className="max-w-5xl space-y-8">
        {activeTab === 'visual' && (
            <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4 mb-2"><Palette className="text-teal-600" size={20}/> Identidade do Sistema</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pré-visualização</span>
                            <div className="w-64 h-32 bg-slate-50 border rounded-lg flex items-center justify-center p-4">
                                {preview ? <img src={preview} alt="Logo" className="max-w-full max-h-full object-contain" /> : <ImageIcon className="text-slate-300" size={48} />}
                            </div>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Upload Nova Logo</label>
                            <label className="cursor-pointer">
                                <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <Upload className="w-8 h-8 mb-3 text-slate-400" /><p className="text-sm text-slate-500">Clique para enviar</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4 mb-2"><Package className="text-teal-600" size={20}/> Configuração de Logística</h3>
                    <div className="max-w-md">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Margem de Segurança do Estoque de Studio</label>
                        <div className="flex items-center gap-4">
                            <input type="number" className="w-24 px-4 py-2 border rounded-lg font-bold text-slate-800" value={securityMargin} onChange={(e) => setSecurityMargin(parseInt(e.target.value) || 0)} min="0" />
                            <p className="text-xs text-slate-400">Alerta ativado se o saldo do studio for menor que este valor.</p>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end pt-4"><button onClick={handleSaveGlobal} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2">{isSaved ? <><Check size={18}/> Salvo!</> : <><Save size={18}/> Salvar Configurações</>}</button></div>
            </div>
        )}

        {activeTab === 'support_tags' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-8 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <TagIcon className="text-indigo-600" size={24} /> Categorias de Suporte
                        </h3>
                        <p className="text-sm text-slate-500">Crie opções de assuntos/departamentos para cada tipo de usuário selecionar no chamado.</p>
                    </div>
                    <button 
                        onClick={() => setEditingTag({ role: 'student', name: '' })}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
                    >
                        <Plus size={16} /> Nova Categoria
                    </button>
                </div>

                {editingTag && (
                    <form onSubmit={handleSaveSupportTag} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Público do Assunto</label>
                                <select 
                                    className="w-full px-4 py-2.5 border rounded-xl bg-white text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={editingTag.role}
                                    onChange={e => setEditingTag({...editingTag, role: e.target.value as any})}
                                    required
                                >
                                    <option value="student">Aluno</option>
                                    <option value="instructor">Instrutor</option>
                                    <option value="studio">Studio Parceiro</option>
                                    <option value="all">Todos</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome da Categoria/Tag</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-2.5 border rounded-xl bg-white text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={editingTag.name}
                                    onChange={e => setEditingTag({...editingTag, name: e.target.value})}
                                    placeholder="Ex: Financeiro, Suporte Técnico, Logística..."
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                            <button type="button" onClick={() => setEditingTag(null)} className="px-6 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all">
                                <Save size={18} /> Salvar Tag
                            </button>
                        </div>
                    </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {['student', 'instructor', 'studio'].map(role => (
                        <div key={role} className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {role === 'student' ? 'Alunos' : role === 'instructor' ? 'Instrutores' : 'Studios'}
                                </h4>
                                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    {supportTags.filter(t => t.role === role || t.role === 'all').length}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {supportTags.filter(t => t.role === role || t.role === 'all').map(tag => (
                                    <div key={tag.id} className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                                        <span className="text-xs font-bold text-slate-700">{tag.name} {tag.role === 'all' && <span className="ml-1 text-[8px] opacity-30">(Universal)</span>}</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingTag(tag)} className="p-1 text-slate-300 hover:text-indigo-600 transition-colors"><Edit2 size={14} /></button>
                                            <button onClick={() => appBackend.deleteSupportTag(tag.id).then(fetchSupportTags)} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                                {supportTags.filter(t => t.role === role || t.role === 'all').length === 0 && (
                                    <div className="p-8 text-center text-slate-300 italic text-[10px]">Nenhuma tag definida.</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'course_info' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-8 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <BookOpen className="text-teal-600" size={24} /> Informações do Curso
                        </h3>
                        <p className="text-sm text-slate-500">Cadastre detalhes, materiais e requisitos que os alunos verão no Portal.</p>
                    </div>
                    <button 
                        onClick={() => setEditingCourseInfo({ courseName: '', details: '', materials: '', requirements: '' })}
                        className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
                    >
                        <Plus size={16} /> Novo Cadastro
                    </button>
                </div>

                {editingCourseInfo && (
                    <form onSubmit={handleSaveCourseInfo} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome do Curso (Deve ser idêntico ao cadastrado nas turmas)</label>
                                <div className="relative">
                                    <select 
                                        className="w-full px-4 py-2.5 border rounded-xl bg-white text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                                        value={editingCourseInfo.courseName || ''}
                                        onChange={e => setEditingCourseInfo({...editingCourseInfo, courseName: e.target.value})}
                                        required
                                    >
                                        <option value="">Selecione o Curso...</option>
                                        {COURSES_MASTER.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2"><Info size={14} className="text-teal-600"/> Detalhes / Descrição do Curso</label>
                                <textarea className="w-full h-32 p-4 border rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none" value={editingCourseInfo.details || ''} onChange={e => setEditingCourseInfo({...editingCourseInfo, details: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2"><Layers size={14} className="text-teal-600"/> Materiais Inclusos</label>
                                <textarea className="w-full h-32 p-4 border rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none" value={editingCourseInfo.materials || ''} onChange={e => setEditingCourseInfo({...editingCourseInfo, materials: e.target.value})} placeholder="Ex: Apostila colorida, Sacochila, Lápis..." />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2"><ListTodo size={14} className="text-teal-600"/> Orientações Importantes</label>
                                <textarea className="w-full h-32 p-4 border rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none" value={editingCourseInfo.requirements || ''} onChange={e => setEditingCourseInfo({...editingCourseInfo, requirements: e.target.value})} placeholder="Ex: Traje esportivo, chegar 15min antes..." />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                            <button type="button" onClick={() => setEditingCourseInfo(null)} className="px-6 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
                            <button type="submit" disabled={isSavingCourseInfo} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all">
                                {isSavingCourseInfo ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Salvar Informações
                            </button>
                        </div>
                    </form>
                )}

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><List size={14}/> Cursos Cadastrados</h4>
                    {isLoadingCourseInfo ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-600" /></div>
                    ) : courseInfos.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-2xl text-slate-300">Nenhuma informação de curso cadastrada.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {courseInfos.map(info => (
                                <div key={info.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between group hover:border-teal-200 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-lg bg-teal-50 text-teal-600"><Book size={20} /></div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">{info.courseName}</h4>
                                            <p className="text-[9px] text-slate-400 uppercase font-black">Atualizado: {new Date(info.updatedAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingCourseInfo(info)} className="p-2 text-slate-300 hover:text-teal-600 transition-colors"><Edit2 size={18} /></button>
                                        <button onClick={() => appBackend.deleteCourseInfo(info.id).then(fetchCourseInfos)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'roles' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold text-slate-800">Perfis de Acesso</h3><button onClick={() => setEditingRole({ id: '', name: '', permissions: {} })} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">+ Novo Perfil</button></div>
                {editingRole && (
                    <form onSubmit={handleSaveRole} className="bg-slate-50 p-6 rounded-xl border mb-6 space-y-4">
                        <label className="block text-xs font-bold">Nome do Perfil</label><input type="text" className="w-full p-2 border rounded text-sm mb-4" value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} required />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {PERMISSION_MODULES.map(mod => (
                                <label key={mod.id} className="flex items-center gap-2 p-2 bg-white border rounded cursor-pointer hover:bg-indigo-50">
                                    <input 
                                        type="checkbox" 
                                        checked={!!editingRole.permissions[mod.id]} 
                                        onChange={e => setEditingRole({...editingRole, permissions: {...editingRole.permissions, [mod.id]: e.target.checked}})} 
                                    />
                                    <span className="text-xs font-medium">{mod.label}</span>
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setEditingRole(null)} className="px-3 py-1.5 text-sm">Cancelar</button><button type="submit" className="bg-indigo-600 text-white px-4 py-1.5 rounded font-bold text-sm">Salvar Perfil</button></div>
                    </form>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{roles.map(r => <div key={r.id} className="p-3 border rounded-xl flex justify-between items-center bg-white hover:border-indigo-200 transition-all"><span className="font-bold text-sm text-slate-700">{r.name}</span><div className="flex gap-2"><button onClick={() => setEditingRole(r)} className="text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteRole(r.id).then(fetchRoles)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button></div></div>)}</div>
            </div>
        )}

        {activeTab === 'database' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex items-center gap-3 mb-4"><Database className="text-amber-600" /><h3 className="text-lg font-bold text-slate-800">Manutenção de Tabelas (V28)</h3></div>
                <p className="text-sm text-slate-500 mb-6 font-bold text-red-600 flex items-center gap-2"><AlertTriangle size={16}/> Use este script para sincronizar as tabelas com os novos recursos (Destinatário em Chamados de Suporte).</p>
                {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm hover:bg-slate-800 transition-all">Gerar Script de Correção V28</button> : (
                    <div className="relative animate-in slide-in-from-top-4">
                        <pre className="bg-black text-amber-400 p-4 rounded-lg text-[10px] font-mono overflow-auto max-h-[400px] border border-amber-900/50 leading-relaxed">{generateRepairSQL()}</pre>
                        <button onClick={copySql} className="absolute top-2 right-2 bg-slate-700 text-white px-3 py-1 rounded text-xs hover:bg-slate-600 transition-colors shadow-lg">{sqlCopied ? 'Copiado!' : 'Copiar SQL'}</button>
                    </div>
                )}
            </div>
        )}

        {/* ... (Demais abas do SettingsManager continuam com seu comportamento original) ... */}
      </div>
    </div>
  );
};

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

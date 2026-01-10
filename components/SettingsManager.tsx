
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, Database, 
    Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Palette, History, Clock, Search,
    Loader2, Package, Tag, Layers, RefreshCw, BookOpen, Book, ListTodo, Zap, Filter, List, ArrowRight, Braces, Sparkles, Landmark, Percent, FileWarning, Globe, Edit2, Trash2, Smartphone, FileSearch, UserPlus, Info,
    Plus, Shield, DollarSign, GraduationCap, FileSpreadsheet
} from 'lucide-react';
import { appBackend, CompanySetting, WebhookTrigger, Pipeline } from '../services/appBackend';
import { Role as UserRole, Banner, InstructorLevel, ActivityLog, SyncJob, Product, CourseInfo, SupportTag } from '../types';
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
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

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
      } catch (e) { console.error(e); } finally { setIsLoadingTags(false); }
  };

  const handleSaveSupportTag = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingTag || !editingTag.name || !editingTag.role) return;
      try {
          await appBackend.saveSupportTag(editingTag);
          setEditingTag(null);
          fetchSupportTags();
      } catch (e: any) { alert(`Erro ao salvar tag: ${e.message}`); }
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
      try { const data = await appBackend.getCourseInfos(); setCourseInfos(data); } catch (e) { console.error(e); } finally { setIsLoadingCourseInfo(false); }
  };

  const fetchUnifiedProducts = async () => {
      try {
          const [digitalRes, eventsRes, classesRes] = (await Promise.all([
              appBackend.client.from('crm_products').select('id, name').eq('status', 'active'),
              appBackend.client.from('crm_events').select('id, name'),
              appBackend.client.from('crm_classes').select('course')
          ])) as any[];

          const unified: UnifiedProduct[] = [];
          if (digitalRes.data) (digitalRes.data as any[]).forEach(p => unified.push({ id: String(p.id), name: String(p.name), type: 'Digital' }));
          if (eventsRes.data) (eventsRes.data as any[]).forEach(e => unified.push({ id: String(e.id), name: String(e.name), type: 'Evento' }));
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
      return allProducts.filter(p => selectedTypes.includes(p.type) && p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [allProducts, editingCompany, productSearch]);

  const fetchInstructorLevels = async () => {
    setIsLoadingLevels(true);
    try { const data = await appBackend.getInstructorLevels(); setInstructorLevels(data); } catch (e) { console.error(e); } finally { setIsLoadingLevels(false); }
  };

  const fetchLogs = async () => {
      setIsLoadingLogs(true);
      try { const data = await appBackend.getActivityLogs(); setLogs(data); } catch (e) { console.error(e); } finally { setIsLoadingLogs(false); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => { setPreview(reader.result as string); setIsSaved(false); };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleBannerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onloadend = () => setEditingBanner(prev => prev ? { ...prev, imageUrl: reader.result as string } : null);
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
-- SCRIPT DE MANUTENÇÃO VOLL CRM (V52)
-- Implementação do Sistema de LMS, Cursos Online e Progresso

CREATE TABLE IF NOT EXISTS public.crm_course_modules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id uuid REFERENCES public.crm_products(id) ON DELETE CASCADE,
    title text NOT NULL,
    "order" integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_course_lessons (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id uuid REFERENCES public.crm_course_modules(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    video_url text,
    "order" integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_student_course_access (
    student_id uuid REFERENCES public.crm_deals(id) ON DELETE CASCADE,
    course_id uuid REFERENCES public.crm_products(id) ON DELETE CASCADE,
    unlocked_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (student_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.crm_lesson_progress (
    student_id uuid REFERENCES public.crm_deals(id) ON DELETE CASCADE,
    lesson_id uuid REFERENCES public.crm_course_lessons(id) ON DELETE CASCADE,
    completed_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (student_id, lesson_id)
);

ALTER TABLE public.crm_products 
ADD COLUMN IF NOT EXISTS thumbnailUrl text,
ADD COLUMN IF NOT EXISTS description text;

GRANT ALL ON public.crm_course_modules TO anon, authenticated, service_role;
GRANT ALL ON public.crm_course_lessons TO anon, authenticated, service_role;
GRANT ALL ON public.crm_student_course_access TO anon, authenticated, service_role;
GRANT ALL ON public.crm_lesson_progress TO anon, authenticated, service_role;

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
    if (!editingBanner || !editingBanner.imageUrl) { alert("A imagem do banner é obrigatória."); return; }
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
    } catch (err: any) { alert(`Erro ao salvar empresa: ${err.message}`); } finally { setIsSavingCompany(false); }
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
      } catch (err: any) { alert(`Erro ao salvar: ${err.message}`); } finally { setIsSavingCourseInfo(false); }
  };

  const handleSaveWebhookTrigger = async () => {
      if (!selectedFunnel || !selectedStage) return;
      setIsSavingTrigger(true);
      try {
          await appBackend.saveWebhookTrigger({ id: editingTriggerId || undefined, pipelineName: selectedFunnel, stageId: selectedStage, payloadJson: customJson.trim() || undefined });
          setSelectedFunnel(''); setSelectedStage(''); setCustomJson(''); setEditingTriggerId(null);
          await fetchWebhookTriggers();
      } catch (e: any) { alert(e.message); } finally { setIsSavingTrigger(false); }
  };

  const toggleCompanyProductType = (type: string) => {
      if (!editingCompany) return;
      const currentTypes = editingCompany.productTypes || [];
      const newTypes = currentTypes.includes(type) 
        ? currentTypes.filter(t => t !== type)
        : [...currentTypes, type];
      
      setEditingCompany({ ...editingCompany, productTypes: newTypes });
  };

  const toggleCompanyProductId = (id: string) => {
      if (!editingCompany) return;
      const currentIds = editingCompany.productIds || [];
      const newIds = currentIds.includes(id) 
        ? currentIds.filter(i => i !== id)
        : [...currentIds, id];
      setEditingCompany({ ...editingCompany, productIds: newIds });
  };

  const funnelStages = useMemo(() => {
      const funnel = pipelines.find(p => p.name === selectedFunnel);
      return funnel?.stages || [];
  }, [selectedFunnel, pipelines]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-8 pb-20">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>
            <p className="text-slate-500 text-sm">Gerencie acessos, branding, integrações e manutenção.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto shrink-0 max-w-full no-scrollbar shadow-inner">
            <button onClick={() => setActiveTab('visual')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'visual' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Geral</button>
            <button onClick={() => setActiveTab('course_info')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'course_info' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Cursos Info</button>
            <button onClick={() => setActiveTab('support_tags')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'support_tags' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Suporte Tags</button>
            <button onClick={() => setActiveTab('connections')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'connections' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Conexões</button>
            <button onClick={() => setActiveTab('company')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'company' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Empresas</button>
            <button onClick={() => setActiveTab('connection_plug')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'connection_plug' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Connection Plug</button>
            <button onClick={() => setActiveTab('roles')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'roles' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Acessos</button>
            <button onClick={() => setActiveTab('logs')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'logs' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Atividades</button>
            <button onClick={() => setActiveTab('banners')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'banners' ? "bg-white text-orange-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Banners</button>
            <button onClick={() => setActiveTab('instructor_levels')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'instructor_levels' ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Níveis</button>
            <button onClick={() => setActiveTab('database')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'database' ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Database</button>
        </div>
      </div>
      
      <div className="max-w-5xl space-y-8">
        {activeTab === 'visual' && (
            <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4 mb-2"><Palette className="text-teal-600" size={20}/> Identidade Visual</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Logo Atual</span>
                            <div className="w-64 h-32 bg-slate-50 border rounded-lg flex items-center justify-center p-4">
                                {preview ? <img src={preview} alt="Logo" className="max-w-full max-h-full object-contain" /> : <ImageIcon className="text-slate-300" size={48} />}
                            </div>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Trocar Logo do Sistema</label>
                            <label className="cursor-pointer">
                                <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <Upload className="w-8 h-8 mb-3 text-slate-400" /><p className="text-sm text-slate-500 font-bold">Clique para enviar imagem</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4 mb-2"><Package className="text-teal-600" size={20}/> Regras de Estoque</h3>
                    <div className="max-w-md">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Margem de Segurança (Unidades)</label>
                        <div className="flex items-center gap-4">
                            <input type="number" className="w-24 px-4 py-2 border rounded-lg font-bold text-slate-800" value={securityMargin} onChange={(e) => setSecurityMargin(parseInt(e.target.value) || 0)} min="0" />
                            <p className="text-xs text-slate-400 font-medium">Define quando o alerta de reposição deve ser ativado para os studios parceiros.</p>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end pt-4"><button onClick={handleSaveGlobal} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2">{isSaved ? <><Check size={18}/> Alterações Salvas!</> : <><Save size={18}/> Salvar Global</>}</button></div>
            </div>
        )}

        {activeTab === 'company' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-8 animate-in fade-in">
                <div className="flex items-center justify-between border-b pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Gerenciamento de Empresas</h3>
                        <p className="text-sm text-slate-500">Configure os dados das empresas para faturamento e webhooks.</p>
                    </div>
                    {!editingCompany && (
                        <button onClick={() => setEditingCompany({ legalName: '', cnpj: '', productTypes: [], productIds: [] })} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm"><Plus size={18}/> Nova Empresa</button>
                    )}
                </div>

                {editingCompany ? (
                    <form onSubmit={handleSaveCompany} className="space-y-6 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in slide-in-from-top-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Razão Social</label><input type="text" required className="w-full border p-2 rounded" value={editingCompany.legalName} onChange={e => setEditingCompany({...editingCompany, legalName: e.target.value})}/></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">CNPJ</label><input type="text" required className="w-full border p-2 rounded" value={editingCompany.cnpj} onChange={e => setEditingCompany({...editingCompany, cnpj: e.target.value})}/></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-400 uppercase mb-1">URL Webhook (Endereço de recebimento de dados)</label><input type="text" className="w-full border p-2 rounded font-mono text-xs" value={editingCompany.webhookUrl} onChange={e => setEditingCompany({...editingCompany, webhookUrl: e.target.value})} placeholder="https://api.vendas.com/receber"/></div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-200">
                             <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Filter size={14}/> Regras de Vinculação Automática</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <div>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Por Categoria de Produto</p>
                                     <div className="flex flex-wrap gap-2">
                                         {['Digital', 'Presencial', 'Evento'].map(type => (
                                             <button type="button" key={type} onClick={() => toggleCompanyProductType(type)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all", editingCompany.productTypes?.includes(type) ? "bg-indigo-600 text-white border-indigo-700 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}>{type}</button>
                                         ))}
                                     </div>
                                 </div>
                                 <div>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Por Produto Específico (Vincular apenas se:)</p>
                                     <div className="relative mb-2"><Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" size={12}/><input type="text" placeholder="Filtrar cursos..." className="w-full pl-7 pr-2 py-1 text-xs border rounded" value={productSearch} onChange={e => setProductSearch(e.target.value)}/></div>
                                     <div className="max-h-[200px] overflow-y-auto custom-scrollbar border rounded-lg bg-white p-2 space-y-1">
                                         {filteredProductsBySelectedTypes.length === 0 ? <p className="text-[10px] text-slate-400 italic text-center py-4">Selecione uma categoria acima.</p> : filteredProductsBySelectedTypes.map(p => (
                                             <label key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer transition-colors"><input type="checkbox" className="rounded text-indigo-600" checked={editingCompany.productIds?.includes(p.name)} onChange={() => toggleCompanyProductId(p.name)}/><span className="text-[11px] font-medium text-slate-700 truncate">{p.name}</span></label>
                                         ))}
                                     </div>
                                 </div>
                             </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setEditingCompany(null)} className="px-6 py-2 text-slate-500 text-sm font-bold">Cancelar</button><button type="submit" disabled={isSavingCompany} className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold text-sm shadow-md flex items-center gap-2">{isSavingCompany ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Salvar Empresa</button></div>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {companies.map(c => (
                            <div key={c.id} className="p-5 border-2 border-slate-100 rounded-2xl hover:border-teal-400 transition-all group flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4"><div className="bg-teal-50 text-teal-700 p-2 rounded-xl"><Landmark size={24}/></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => setEditingCompany(c)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteCompany(c.id!).then(fetchCompanies)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div></div>
                                    <h4 className="font-bold text-slate-800 text-lg">{c.legalName}</h4>
                                    <p className="text-xs text-slate-400 font-mono mb-4">{c.cnpj}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {(c.productTypes || []).map(t => <span key={t} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase rounded border border-indigo-100">{t}</span>)}
                                    </div>
                                </div>
                                {c.webhookUrl && <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2 text-[10px] text-teal-600 font-bold overflow-hidden"><Globe size={12}/><span className="truncate">{c.webhookUrl}</span></div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'banners' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between border-b pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Mural de Banners (Portais)</h3>
                        <p className="text-sm text-slate-500">Gerencie os anúncios que aparecem nos portais do Aluno e do Instrutor.</p>
                    </div>
                    {!editingBanner && (
                        <button onClick={() => setEditingBanner({ title: '', imageUrl: '', linkUrl: '', targetAudience: 'student', active: true })} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all hover:bg-orange-700"><Plus size={18}/> Novo Banner</button>
                    )}
                </div>

                {editingBanner ? (
                    <form onSubmit={handleSaveBanner} className="space-y-6 p-6 bg-slate-50 rounded-2xl border-2 border-orange-100 animate-in slide-in-from-top-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Título do Banner</label><input type="text" required className="w-full border p-2 rounded" value={editingBanner.title} onChange={e => setEditingBanner({...editingBanner, title: e.target.value})}/></div>
                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Link de Destino (Clique)</label><input type="text" className="w-full border p-2 rounded font-mono text-xs" value={editingBanner.linkUrl} onChange={e => setEditingBanner({...editingBanner, linkUrl: e.target.value})} placeholder="https://site.com/oferta"/></div>
                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Público Alvo</label><select className="w-full border p-2 rounded bg-white" value={editingBanner.targetAudience} onChange={e => setEditingBanner({...editingBanner, targetAudience: e.target.value as any})}><option value="student">Portal do Aluno</option><option value="instructor">Portal do Instrutor</option></select></div>
                                <div className="flex items-center gap-2"><input type="checkbox" id="bannerActive" checked={editingBanner.active} onChange={e => setEditingBanner({...editingBanner, active: e.target.checked})} className="rounded text-orange-600"/><label htmlFor="bannerActive" className="text-sm font-bold text-slate-700">Banner Ativo?</label></div>
                            </div>
                            <div className="space-y-4">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Imagem do Banner</label>
                                <div onClick={() => bannerFileInputRef.current?.click()} className="w-full h-40 border-2 border-dashed rounded-xl bg-white hover:bg-orange-50 transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                                    {editingBanner.imageUrl ? <img src={editingBanner.imageUrl} className="w-full h-full object-cover" /> : <><ImageIcon className="text-slate-300 mb-2" size={32}/><p className="text-[10px] font-black uppercase text-slate-400">Clique para Upload</p></>}
                                    <input ref={bannerFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleBannerImageUpload} />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setEditingBanner(null)} className="px-6 py-2 text-slate-500 text-sm font-bold">Cancelar</button><button type="submit" className="bg-orange-600 text-white px-8 py-2 rounded-xl font-bold text-sm shadow-md">Salvar Banner</button></div>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {banners.map(b => (
                            <div key={b.id} className={clsx("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group relative", !b.active && "opacity-50 grayscale")}>
                                <div className="h-32 bg-slate-100 overflow-hidden relative"><img src={b.imageUrl} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all"><button onClick={() => setEditingBanner(b)} className="bg-white p-2 rounded-lg text-slate-800"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteBanner(b.id!).then(fetchBanners)} className="bg-white p-2 rounded-lg text-red-600"><Trash2 size={16}/></button></div></div>
                                <div className="p-4 flex-1 flex flex-col"><div className="flex justify-between items-start mb-2"><h4 className="font-bold text-slate-800 truncate pr-2">{b.title}</h4><span className={clsx("px-2 py-0.5 rounded uppercase text-[8px] font-black border", b.targetAudience === 'student' ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-orange-50 text-orange-600 border-orange-100")}>{b.targetAudience === 'student' ? 'ALUNO' : 'PROFESSOR'}</span></div><p className="text-[10px] text-slate-400 truncate mt-auto">{b.linkUrl || 'Sem link externo'}</p></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'roles' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between border-b pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Perfis de Acesso (Permissões)</h3>
                        <p className="text-sm text-slate-500">Defina quais módulos cada cargo da equipe pode acessar.</p>
                    </div>
                    {!editingRole && (
                        <button onClick={() => setEditingRole({ id: '', name: '', permissions: {} })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm"><Plus size={18}/> Novo Perfil</button>
                    )}
                </div>

                {editingRole ? (
                    <form onSubmit={handleSaveRole} className="space-y-6 p-8 bg-slate-50 rounded-[2.5rem] border-2 border-indigo-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <div className="w-full max-w-md"><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome do Cargo / Perfil</label><input type="text" required className="w-full px-5 py-3.5 border-2 border-white bg-white rounded-2xl text-sm font-black shadow-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} placeholder="Ex: Supervisor Comercial, Auxiliar de RH..." /></div>
                            <div className="flex items-center gap-2"><button type="button" onClick={() => setEditingRole({...editingRole, permissions: PERMISSION_MODULES.reduce((acc, m) => ({...acc, [m.id]: true}), {})})} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Marcar Todos</button><span className="text-slate-300">|</span><button type="button" onClick={() => setEditingRole({...editingRole, permissions: {}})} className="text-[10px] font-black text-red-500 uppercase hover:underline">Limpar</button></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-6 border-t border-slate-200">
                            {PERMISSION_MODULES.map(module => (
                                <label key={module.id} className={clsx("flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group", editingRole.permissions[module.id] ? "bg-white border-indigo-500 shadow-sm" : "bg-slate-100/50 border-transparent hover:bg-white hover:border-slate-300")}>
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("p-2 rounded-lg transition-colors", editingRole.permissions[module.id] ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400")}>
                                            {/* Fix missing icon find: added Shield to imports */}
                                            <Shield size={16}/>
                                        </div>
                                        <span className={clsx("text-xs font-bold", editingRole.permissions[module.id] ? "text-indigo-900" : "text-slate-500")}>{module.label}</span>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" checked={!!editingRole.permissions[module.id]} onChange={e => setEditingRole({...editingRole, permissions: {...editingRole.permissions, [module.id]: e.target.checked}})} />
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3 pt-8 border-t border-slate-200"><button type="button" onClick={() => setEditingRole(null)} className="px-8 py-3 text-slate-500 font-black text-xs uppercase tracking-widest">Cancelar</button><button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95">Salvar Perfil de Acesso</button></div>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roles.map(role => (
                            <div key={role.id} className="p-6 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-4"><div className="bg-indigo-50 text-indigo-700 p-2.5 rounded-xl"><ShieldCheck size={28}/></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => setEditingRole(role)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteRole(role.id!).then(fetchRoles)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div></div>
                                <h4 className="font-bold text-slate-800 text-lg mb-2">{role.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">{Object.values(role.permissions).filter(Boolean).length} Módulos Habilitados</p>
                                <div className="flex flex-wrap gap-1">{Object.keys(role.permissions).filter(k => role.permissions[k]).slice(0, 4).map(k => <span key={k} className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[8px] font-black uppercase rounded border border-slate-100">{PERMISSION_MODULES.find(m => m.id === k)?.label || k}</span>)}{Object.keys(role.permissions).filter(k => role.permissions[k]).length > 4 && <span className="text-[8px] font-black text-slate-300 ml-1">...</span>}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'instructor_levels' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between border-b pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Níveis e Honorários Docentes</h3>
                        <p className="text-sm text-slate-500">Tabela de remuneração para instrutores de cursos presenciais.</p>
                    </div>
                    {!editingLevel && (
                        <button onClick={() => setEditingLevel({ name: '', honorarium: 0 })} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all hover:bg-purple-700"><Plus size={18}/> Novo Nível</button>
                    )}
                </div>

                {editingLevel ? (
                    <form onSubmit={handleSaveLevel} className="space-y-6 p-6 bg-slate-50 rounded-2xl border-2 border-purple-100 animate-in slide-in-from-top-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Nível</label><input type="text" required className="w-full border p-2 rounded" value={editingLevel.name} onChange={e => setEditingLevel({...editingLevel, name: e.target.value})} placeholder="Ex: Instrutor Master, Pleno..."/></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor Honorário Diário (R$)</label><div className="relative"><DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14}/><input type="number" required className="w-full border pl-7 p-2 rounded font-bold text-emerald-600" value={editingLevel.honorarium} onChange={e => setEditingLevel({...editingLevel, honorarium: parseFloat(e.target.value) || 0})}/></div></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Observações / Requisitos</label><textarea className="w-full border p-2 rounded h-20 resize-none" value={editingLevel.observations} onChange={e => setEditingLevel({...editingLevel, observations: e.target.value})} /></div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setEditingLevel(null)} className="px-6 py-2 text-slate-500 text-sm font-bold">Cancelar</button><button type="submit" className="bg-purple-600 text-white px-8 py-2 rounded-xl font-bold text-sm shadow-md">Salvar Nível</button></div>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {instructorLevels.map(lvl => (
                            <div key={lvl.id} className="p-6 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-4"><div className="bg-purple-50 text-purple-700 p-2.5 rounded-xl"><GraduationCap size={28}/></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => setEditingLevel(lvl)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteInstructorLevel(lvl.id!).then(fetchInstructorLevels)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div></div>
                                <h4 className="font-bold text-slate-800 text-lg mb-1">{lvl.name}</h4>
                                <p className="text-xl font-black text-emerald-600 mb-4">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lvl.honorarium)} <span className="text-[10px] text-slate-400 font-bold uppercase">/ dia</span></p>
                                {lvl.observations && <p className="text-[10px] text-slate-500 italic leading-relaxed">{lvl.observations}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'connection_plug' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6 animate-in fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-xl"><Braces size={28}/></div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Connection Plug (Webhook Automation)</h3>
                            <p className="text-sm text-slate-500">Dispare dados do CRM automaticamente para sistemas externos em etapas específicas.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border text-[10px] font-black text-slate-400 uppercase tracking-widest"><Check size={14} className="text-green-500"/> Placeholder Active</div>
                    </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-indigo-100 space-y-6">
                    <h4 className="text-xs font-black text-indigo-700 uppercase tracking-[0.2em] flex items-center gap-2 mb-4"><Plus size={14}/> Criar Novo Gatilho</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Escolher Funil (CRM)</label>
                            <select className="w-full border p-2 rounded bg-white text-sm" value={selectedFunnel} onChange={e => setSelectedFunnel(e.target.value)}>
                                <option value="">Selecione o Funil...</option>
                                {pipelines.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">No Estágio (Gatilho)</label>
                            <select className="w-full border p-2 rounded bg-white text-sm" value={selectedStage} onChange={e => setSelectedStage(e.target.value)} disabled={!selectedFunnel}>
                                <option value="">Selecione o Estágio...</option>
                                {funnelStages.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1 lg:col-span-1 flex items-end">
                            <button onClick={handleSaveWebhookTrigger} disabled={isSavingTrigger || !selectedFunnel || !selectedStage} className="w-full bg-indigo-600 text-white h-10 rounded-lg font-bold text-sm shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">{isSavingTrigger ? <Loader2 className="animate-spin" size={16}/> : <Zap size={16}/>} Ativar Gatilho</button>
                        </div>
                        <div className="md:col-span-2 lg:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex justify-between">
                                <span>Payload Customizado (Opcional - JSON)</span> <span className="text-indigo-400 lowercase font-medium">use {'{{ placeholders }}'}</span>
                            </label>
                            <textarea className="w-full border p-3 rounded font-mono text-[11px] h-32 bg-white resize-none" value={customJson} onChange={e => setCustomJson(e.target.value)} placeholder='{ "nome": "{{nome_cliente}}", "venda": "{{deal_number}}" }' />
                        </div>
                    </div>
                </div>

                <div className="space-y-3 pt-6">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Gatilhos Ativos</h4>
                    {webhookTriggers.length === 0 ? <div className="p-12 text-center text-slate-400 italic border rounded-2xl bg-slate-50/50">Nenhuma automação configurada.</div> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {webhookTriggers.map(t => (
                                <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-indigo-400 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black"><Braces size={20}/></div>
                                        <div><p className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">Funil: {t.pipelineName}</p><h5 className="font-bold text-slate-800 text-sm">Etapa: {pipelines.find(p => p.name === t.pipelineName)?.stages.find(s => s.id === t.stageId)?.title || t.stageId}</h5></div>
                                    </div>
                                    <button onClick={() => appBackend.deleteWebhookTrigger(t.id!).then(fetchWebhookTriggers)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'connections' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 animate-in fade-in">
                <div className="flex items-center justify-between mb-8 border-b pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Conexões Google Sheets</h3>
                        <p className="text-sm text-slate-500">Sincronização automática com planilhas externas (CSV/Publicadas).</p>
                    </div>
                    <button onClick={onStartWizard} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all hover:bg-teal-700 active:scale-95"><Plus size={18}/> Nova Sincronização</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {jobs.length === 0 ? <p className="col-span-full text-slate-400 italic text-center py-10">Nenhuma sincronização agendada.</p> : jobs.map(job => (
                        <div key={job.id} className="p-5 border rounded-2xl bg-slate-50 flex items-center justify-between hover:border-teal-400 transition-all group shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center font-black", job.status === 'success' ? "bg-teal-100 text-teal-600" : job.status === 'error' ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-400")}>
                                    {job.status === 'syncing' ? <Loader2 size={24} className="animate-spin"/> : <FileSpreadsheet size={24}/>}
                                </div>
                                <div><p className="font-bold text-slate-700 leading-tight">{job.name}</p><p className="text-[10px] text-slate-400 uppercase font-black">Tabela: {job.config.tableName} • {job.intervalMinutes} min</p>{job.lastSync && <p className="text-[9px] text-slate-300 mt-1">Última: {new Date(job.lastSync).toLocaleString()}</p>}</div>
                            </div>
                            <button onClick={() => onDeleteJob(job.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'course_info' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between border-b pb-4">
                    <h3 className="text-lg font-bold text-slate-800">Informações de Cursos</h3>
                    <button onClick={() => setEditingCourseInfo({ courseName: '', details: '', materials: '', requirements: '' })} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm">+ Adicionar</button>
                </div>
                <div className="space-y-3">
                    {courseInfos.map(info => (
                        <div key={info.id} className="p-4 border rounded-xl flex items-center justify-between group hover:bg-slate-50 transition-colors shadow-sm">
                            <div><p className="font-bold text-slate-700">{info.courseName}</p><p className="text-[10px] text-slate-400 uppercase font-black">Editado em: {new Date(info.updatedAt).toLocaleDateString()}</p></div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => setEditingCourseInfo(info)} className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg"><Edit2 size={18}/></button><button onClick={() => appBackend.deleteCourseInfo(info.id).then(fetchCourseInfos)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={18}/></button></div>
                        </div>
                    ))}
                </div>
                {editingCourseInfo && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                        <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl animate-in zoom-in-95">
                            <h4 className="text-lg font-bold mb-6">Informações Dinâmicas do Curso</h4>
                            <div className="space-y-4">
                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Curso (Site/Certificado)</label><input type="text" className="w-full border p-2 rounded" value={editingCourseInfo.courseName} onChange={e => setEditingCourseInfo({...editingCourseInfo, courseName: e.target.value})}/></div>
                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Conteúdo Programático / Detalhes</label><textarea className="w-full border p-2 rounded h-40 font-serif text-sm" value={editingCourseInfo.details} onChange={e => setEditingCourseInfo({...editingCourseInfo, details: e.target.value})}/></div>
                                <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setEditingCourseInfo(null)} className="px-6 py-2 text-slate-500 text-sm font-bold">Fechar</button><button onClick={handleSaveCourseInfo} disabled={isSavingCourseInfo} className="bg-teal-600 text-white px-8 py-2 rounded-xl font-bold text-sm shadow-md flex items-center gap-2">{isSavingCourseInfo ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Salvar</button></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'support_tags' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between border-b pb-4">
                    <h3 className="text-lg font-bold text-slate-800">Tags e Categorias de Suporte</h3>
                    <button onClick={() => setEditingTag({ name: '', role: 'all' })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm">+ Nova Tag</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {supportTags.map(tag => (
                        <div key={tag.id} className="p-4 border rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors shadow-sm">
                            <div className="flex items-center gap-3"><div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg"><Tag size={18}/></div><div><p className="font-bold text-slate-700">{tag.name}</p><p className="text-[10px] text-slate-400 uppercase font-black">Público: {tag.role}</p></div></div>
                            <button onClick={() => appBackend.deleteSupportTag(tag.id).then(fetchSupportTags)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
                {editingTag && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                            <h4 className="font-bold mb-6">Cadastrar Categoria</h4>
                            <div className="space-y-4">
                                <div><label className="text-xs font-bold text-slate-400 uppercase mb-1">Título da Tag</label><input type="text" className="w-full border p-2 rounded" value={editingTag.name} onChange={e => setEditingTag({...editingTag, name: e.target.value})} placeholder="Ex: Financeiro"/></div>
                                <div><label className="text-xs font-bold text-slate-400 uppercase mb-1">Disponível para:</label>
                                    <select className="w-full border p-2 rounded bg-white text-sm" value={editingTag.role} onChange={e => setEditingTag({...editingTag, role: e.target.value as any})}>
                                        <option value="all">Todos os Portais</option><option value="student">Portal do Aluno</option><option value="instructor">Portal do Instrutor</option><option value="studio">Portal do Studio</option>
                                    </select>
                                </div>
                                <button onClick={handleSaveSupportTag} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mt-4">Salvar Tag</button>
                                <button onClick={() => setEditingTag(null)} className="w-full text-slate-400 text-xs mt-2 uppercase font-black hover:underline">Cancelar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'database' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-8 space-y-4 animate-in fade-in">
                <div className="flex items-center gap-3 mb-2"><div className="bg-amber-100 text-amber-600 p-2.5 rounded-xl"><Database size={28}/></div><div><h3 className="text-lg font-bold text-slate-800">Manutenção de Tabelas (SQL V52)</h3><p className="text-sm text-slate-500">Gere o script necessário para atualizar a estrutura do banco de dados.</p></div></div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-xs text-red-700 font-bold leading-relaxed flex items-start gap-3"><AlertTriangle className="shrink-0 mt-0.5" size={16}/><span>Execute este script apenas no SQL Editor do seu projeto Supabase. Ele cria as tabelas de módulos, aulas e permissões sem afetar dados existentes de usuários ou turmas.</span></div>
                {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-sm hover:bg-slate-800 transition-all shadow-xl">Gerar Script de Atualização V52</button> : (
                    <div className="relative animate-in slide-in-from-top-4">
                        <pre className="bg-black text-amber-400 p-5 rounded-2xl text-[11px] font-mono overflow-auto max-h-[500px] border border-amber-900/50 leading-relaxed custom-scrollbar-dark">{generateRepairSQL()}</pre>
                        <button onClick={copySql} className="absolute top-4 right-4 bg-slate-700 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-slate-600 transition-all shadow-lg active:scale-95">{sqlCopied ? 'Copiado para Área de Transferência!' : 'Copiar Código SQL'}</button>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'logs' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between border-b pb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><History size={20} className="text-blue-600"/> Histórico de Auditoria Geral</h3>
                    <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/><input type="text" className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-slate-50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500" placeholder="Filtrar por ação ou módulo..." value={logSearch} onChange={e => setLogSearch(e.target.value)}/></div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-inner">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 font-black uppercase text-slate-400 border-b"><tr><th className="p-4">Timestamp</th><th className="p-4">Usuário / Agente</th><th className="p-4">Ação</th><th className="p-4">Módulo</th><th className="p-4">Descrição do Evento</th></tr></thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {logs.filter(l => (l.details + l.userName + l.module).toLowerCase().includes(logSearch.toLowerCase())).map(log => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-slate-500 font-mono whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                                    <td className="p-4 font-bold text-slate-700">{log.userName}</td>
                                    <td className="p-4"><span className={clsx("px-2 py-0.5 rounded uppercase font-black text-[9px] border", log.action === 'delete' ? "bg-red-50 text-red-600 border-red-100" : log.action === 'create' ? "bg-green-50 text-green-600 border-green-100" : "bg-blue-50 text-blue-600 border-blue-100")}>{log.action}</span></td>
                                    <td className="p-4 uppercase font-bold text-slate-400">{log.module}</td>
                                    <td className="p-4 text-slate-600 font-medium">{log.details}</td>
                                </tr>
                            ))}
                            {logs.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-300 italic font-bold">Nenhuma atividade registrada.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

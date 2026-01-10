import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, Database, 
    Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Palette, History, Clock, Search,
    Loader2, Package, Tag, Layers, RefreshCw, BookOpen, Book, ListTodo, Zap, Filter, List, ArrowRight, Braces, Sparkles, Landmark, Percent, FileWarning, Globe, Edit2, Trash2, Smartphone, FileSearch, UserPlus, Info
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
-- SCRIPT DE MANUTENÇÃO VOLL CRM (V50)
-- Implementação do Sistema de LMS e Cursos Online

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

ALTER TABLE public.crm_products 
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS description text;

GRANT ALL ON public.crm_course_modules TO anon, authenticated, service_role;
GRANT ALL ON public.crm_course_lessons TO anon, authenticated, service_role;
GRANT ALL ON public.crm_student_course_access TO anon, authenticated, service_role;

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
            <button onClick={() => setActiveTab('connection_plug')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'connection_plug' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Connection Plug</button>
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

        {activeTab === 'connections' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-bold text-slate-800">Conexões Google Sheets</h3>
                    <button onClick={onStartWizard} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm">+ Nova Sincronização</button>
                </div>
                <div className="space-y-4">
                    {jobs.length === 0 ? <p className="text-slate-400 italic">Nenhuma sincronização agendada.</p> : jobs.map(job => (
                        <div key={job.id} className="p-4 border rounded-xl bg-slate-50 flex items-center justify-between">
                            <div><p className="font-bold text-slate-700">{job.name}</p><p className="text-xs text-slate-400">Tabela: {job.config.tableName}</p></div>
                            <button onClick={() => onDeleteJob(job.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'course_info' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Informações Dinâmicas de Cursos</h3>
                    <button onClick={() => setEditingCourseInfo({ courseName: '', details: '', materials: '', requirements: '' })} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm">+ Adicionar Curso</button>
                </div>
                <div className="space-y-4">
                    {courseInfos.map(info => (
                        <div key={info.id} className="p-4 border rounded-xl flex items-center justify-between group">
                            <div><p className="font-bold">{info.courseName}</p><p className="text-xs text-slate-400">Atualizado em: {new Date(info.updatedAt).toLocaleDateString()}</p></div>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingCourseInfo(info)} className="p-2 text-slate-400 hover:text-teal-600"><Edit2 size={18}/></button>
                                <button onClick={() => appBackend.deleteCourseInfo(info.id).then(fetchCourseInfos)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                </div>
                {editingCourseInfo && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                        <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl animate-in zoom-in-95">
                            <h4 className="text-lg font-bold mb-6">Editar Info Curso</h4>
                            <div className="space-y-4">
                                <input type="text" className="w-full border p-2 rounded" placeholder="Nome do Curso" value={editingCourseInfo.courseName} onChange={e => setEditingCourseInfo({...editingCourseInfo, courseName: e.target.value})}/>
                                <textarea className="w-full border p-2 rounded h-32" placeholder="Detalhes" value={editingCourseInfo.details} onChange={e => setEditingCourseInfo({...editingCourseInfo, details: e.target.value})}/>
                                <button onClick={handleSaveCourseInfo} className="w-full bg-teal-600 text-white py-2 rounded font-bold">Salvar</button>
                                <button onClick={() => setEditingCourseInfo(null)} className="w-full text-slate-400 text-sm">Cancelar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'support_tags' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Categorias do Suporte Interno</h3>
                    <button onClick={() => setEditingTag({ name: '', role: 'all' })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm">+ Nova Tag</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {supportTags.map(tag => (
                        <div key={tag.id} className="p-4 border rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Tag className="text-indigo-600" size={18}/>
                                <div><p className="font-bold text-slate-700">{tag.name}</p><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Público: {tag.role}</p></div>
                            </div>
                            <button onClick={() => appBackend.deleteSupportTag(tag.id).then(fetchSupportTags)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
                {editingTag && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
                            <h4 className="font-bold mb-6">Criar Tag de Suporte</h4>
                            <div className="space-y-4">
                                <div><label className="text-xs font-bold text-slate-400">Nome da Categoria</label><input type="text" className="w-full border p-2 rounded" value={editingTag.name} onChange={e => setEditingTag({...editingTag, name: e.target.value})}/></div>
                                <div><label className="text-xs font-bold text-slate-400">Disponível para:</label>
                                    <select className="w-full border p-2 rounded bg-white" value={editingTag.role} onChange={e => setEditingTag({...editingTag, role: e.target.value as any})}>
                                        <option value="all">Todos</option><option value="student">Alunos</option><option value="instructor">Instrutores</option><option value="studio">Studios</option>
                                    </select>
                                </div>
                                <button onClick={handleSaveSupportTag} className="w-full bg-indigo-600 text-white py-2 rounded font-bold">Salvar Tag</button>
                                <button onClick={() => setEditingTag(null)} className="w-full text-slate-400 text-sm">Cancelar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'database' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex items-center gap-3 mb-4"><Database className="text-amber-600" /><h3 className="text-lg font-bold text-slate-800">Manutenção de Tabelas (V50)</h3></div>
                <p className="text-sm text-slate-500 mb-6 font-bold text-red-600 flex items-center gap-2"><AlertTriangle size={16}/> Use este script para criar as tabelas do sistema de Cursos Online (LMS).</p>
                {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm hover:bg-slate-800 transition-all">Gerar Script de Atualização V50</button> : (
                    <div className="relative animate-in slide-in-from-top-4">
                        <pre className="bg-black text-amber-400 p-4 rounded-lg text-[10px] font-mono overflow-auto max-h-[400px] border border-amber-900/50 leading-relaxed">{generateRepairSQL()}</pre>
                        <button onClick={copySql} className="absolute top-2 right-2 bg-slate-700 text-white px-3 py-1 rounded text-xs hover:bg-slate-600 transition-colors shadow-lg">{sqlCopied ? 'Copiado!' : 'Copiar SQL'}</button>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'logs' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><History size={20} className="text-blue-600"/> Histórico de Auditoria</h3>
                    <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/><input type="text" className="w-full pl-9 pr-4 py-1.5 border rounded-lg text-xs" placeholder="Buscar no log..." value={logSearch} onChange={e => setLogSearch(e.target.value)}/></div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 font-black uppercase text-slate-400"><tr><th className="p-4">Data</th><th className="p-4">Usuário</th><th className="p-4">Ação</th><th className="p-4">Módulo</th><th className="p-4">Detalhes</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.filter(l => l.details.toLowerCase().includes(logSearch.toLowerCase())).map(log => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                                    <td className="p-4 font-bold text-slate-700">{log.userName}</td>
                                    <td className="p-4"><span className={clsx("px-2 py-0.5 rounded uppercase font-black text-[9px]", log.action === 'delete' ? "bg-red-50 text-red-600" : log.action === 'create' ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600")}>{log.action}</span></td>
                                    <td className="p-4 uppercase font-bold text-slate-400">{log.module}</td>
                                    <td className="p-4 text-slate-600">{log.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
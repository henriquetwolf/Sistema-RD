
import React, { useState, useEffect, useMemo, useRef } from 'react';
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

type SettingsTab = 'visual' | 'company' | 'banners' | 'connection_plug' | 'roles' | 'instructor_levels' | 'course_info' | 'support_tags' | 'logs' | 'database';

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
      fetchGlobalSettings();
      if (activeTab === 'roles') fetchRoles();
      else if (activeTab === 'banners') fetchBanners();
      else if (activeTab === 'company') { fetchCompanies(); fetchUnifiedProducts(); }
      else if (activeTab === 'instructor_levels') fetchInstructorLevels();
      else if (activeTab === 'course_info') fetchCourseInfos();
      else if (activeTab === 'support_tags') fetchSupportTags();
      else if (activeTab === 'logs') fetchLogs();
      else if (activeTab === 'connection_plug') { fetchPipelines(); fetchWebhookTriggers(); }
  }, [activeTab]);

  const fetchGlobalSettings = async () => {
    const margin = await appBackend.getInventorySecurityMargin();
    setSecurityMargin(margin);
    const logo = await appBackend.getAppLogo();
    setPreview(logo);
  };

  const fetchPipelines = async () => {
      try { const data = await appBackend.getPipelines(); setPipelines(data); } catch (e) {}
  };

  const fetchWebhookTriggers = async () => {
      setIsLoadingTriggers(true);
      try { const data = await appBackend.getWebhookTriggers(); setWebhookTriggers(data); } catch (e) {} finally { setIsLoadingTriggers(false); }
  };

  const fetchRoles = async () => {
      setIsLoadingRoles(true);
      try { const data = await appBackend.getRoles(); setRoles(data); } catch (e) {} finally { setIsLoadingRoles(false); }
  };

  const fetchBanners = async () => {
      setIsLoadingBanners(true);
      try { const data = await appBackend.getBanners(); setBanners(data); } catch (e) {} finally { setIsLoadingBanners(false); }
  };

  const fetchCompanies = async () => {
      setIsLoadingCompanies(true);
      try { const data = await appBackend.getCompanies(); setCompanies(data); } catch(e) {} finally { setIsLoadingCompanies(false); }
  };

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

  const fetchInstructorLevels = async () => {
      setIsLoadingLevels(true);
      try { const data = await appBackend.getInstructorLevels(); setInstructorLevels(data); } catch (e) {} finally { setIsLoadingLevels(false); }
  };

  const fetchCourseInfos = async () => {
      setIsLoadingCourseInfo(true);
      try { const data = await appBackend.getCourseInfos(); setCourseInfos(data); } catch (e) {} finally { setIsLoadingCourseInfo(false); }
  };

  const fetchSupportTags = async () => {
      setIsLoadingTags(true);
      try { const data = await appBackend.getSupportTags(); setSupportTags(data); } catch (e) {} finally { setIsLoadingTags(false); }
  };

  const fetchLogs = async () => {
      setIsLoadingLogs(true);
      try { const data = await appBackend.getActivityLogs(200); setLogs(data); } catch (e) {} finally { setIsLoadingLogs(false); }
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

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    await appBackend.saveRole(editingRole);
    fetchRoles();
    setEditingRole(null);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner || !editingBanner.imageUrl) return;
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
    } catch (err) {} finally { setIsSavingCompany(false); }
  };

  const handleSaveCourseInfo = async () => {
      if (!editingCourseInfo?.courseName) return;
      setIsSavingCourseInfo(true);
      try {
          await appBackend.saveCourseInfo(editingCourseInfo);
          await fetchCourseInfos();
          setEditingCourseInfo(null);
      } finally { setIsSavingCourseInfo(false); }
  };

  const handleSaveTag = async () => {
      if (!editingTag?.name) return;
      await appBackend.saveSupportTag(editingTag);
      await fetchSupportTags();
      setEditingTag(null);
  };

  const handleSaveTrigger = async () => {
      if (!editingTrigger?.pipelineName || !editingTrigger?.stageId) return;
      await appBackend.saveWebhookTrigger(editingTrigger);
      await fetchWebhookTriggers();
      setEditingTrigger(null);
  };

  const toggleCompanyProductType = (type: string) => {
      if (!editingCompany) return;
      const currentTypes = editingCompany.productTypes || [];
      const newTypes = currentTypes.includes(type) ? currentTypes.filter(t => t !== type) : [...currentTypes, type];
      setEditingCompany({ ...editingCompany, productTypes: newTypes });
  };

  const toggleCompanyProductId = (id: string) => {
      if (!editingCompany) return;
      const currentIds = editingCompany.productIds || [];
      const newIds = currentIds.includes(id) ? currentIds.filter(i => i !== id) : [...currentIds, id];
      setEditingCompany({ ...editingCompany, productIds: newIds });
  };

  const filteredProductsBySelectedTypes = useMemo(() => {
      if (!editingCompany) return [];
      const selectedTypes = editingCompany.productTypes || [];
      if (selectedTypes.length === 0) return [];
      return allProducts.filter(p => selectedTypes.includes(p.type) && p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [allProducts, editingCompany, productSearch]);

  const generateRepairSQL = () => `
-- SCRIPT DE FUNDAÇÃO CRM V46 (CORREÇÃO DE RLS CERTIFICADOS)
CREATE TABLE IF NOT EXISTS public.crm_certificates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    background_data text, 
    back_background_data text, 
    linked_product_id text,
    body_text text,
    layout_config jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Garante colunas de imagem e layout
ALTER TABLE public.crm_certificates ADD COLUMN IF NOT EXISTS background_data text;
ALTER TABLE public.crm_certificates ADD COLUMN IF NOT EXISTS back_background_data text;
ALTER TABLE public.crm_certificates ADD COLUMN IF NOT EXISTS layout_config jsonb;

CREATE TABLE IF NOT EXISTS public.crm_student_certificates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_deal_id uuid REFERENCES public.crm_deals(id) ON DELETE CASCADE,
    certificate_template_id uuid REFERENCES public.crm_certificates(id) ON DELETE CASCADE,
    hash text UNIQUE NOT NULL,
    issued_at timestamp with time zone DEFAULT now()
);

-- Ativação de RLS
ALTER TABLE public.crm_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_student_certificates ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Total (Leitura e Escrita)
DROP POLICY IF EXISTS "Acesso Total Certificados" ON public.crm_certificates;
CREATE POLICY "Acesso Total Certificados" ON public.crm_certificates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Total Diplomas" ON public.crm_student_certificates;
CREATE POLICY "Acesso Total Diplomas" ON public.crm_student_certificates FOR ALL USING (true) WITH CHECK (true);

-- Permissões de Perfil
GRANT ALL ON public.crm_certificates TO anon, authenticated, service_role;
GRANT ALL ON public.crm_student_certificates TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
  `.trim();

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-8 pb-20">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Configurações</h2>
            <p className="text-slate-500 text-sm">Gerenciamento global do ecossistema VOLL.</p>
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
                { id: 'database', label: 'Banco', color: 'text-amber-700' }
            ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === tab.id ? `bg-white ${tab.color} shadow-sm` : "text-slate-500")}>{tab.label}</button>
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
                        <input type="file" className="hidden" id="logo-up" accept="image/*" onChange={handleImageUpload} />
                        <label htmlFor="logo-up" className="cursor-pointer bg-teal-50 text-teal-700 px-6 py-2 rounded-lg font-bold border border-teal-200">Trocar Logo</label>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Margem de Segurança do Estoque</h3>
                    <input type="number" className="w-24 px-4 py-2 border rounded-lg" value={securityMargin} onChange={(e) => setSecurityMargin(parseInt(e.target.value) || 0)} />
                    <p className="text-xs text-slate-400 mt-2">Limite para alerta de "Necessita Remessa" nos Studios.</p>
                </div>
                <button onClick={handleSaveGlobal} className="bg-teal-600 text-white px-10 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2">{isSaved ? 'Salvo!' : 'Salvar Geral'}</button>
            </div>
        )}

        {activeTab === 'company' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Empresas e Faturamento</h3>
                    <button onClick={() => setEditingCompany({ legalName: '', cnpj: '', productTypes: [], productIds: [] })} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-xs font-bold">+ Nova Empresa</button>
                </div>
                <div className="space-y-4">
                    {companies.map(c => (
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
                    <button onClick={() => setEditingBanner({ title: '', linkUrl: '', targetAudience: 'student', active: true })} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold">+ Novo Banner</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {banners.map(b => (
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
                        <div><h3 className="text-lg font-bold">Automação: Connection Plug</h3><p className="text-xs text-slate-500">Gatilhos de Webhook por etapa do Funil.</p></div>
                    </div>
                    <button onClick={() => setEditingTrigger({ pipelineName: 'Padrão', stageId: 'closed' })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold">+ Novo Gatilho</button>
                </div>
                <div className="space-y-4">
                    {webhookTriggers.map(t => (
                        <div key={t.id} className="p-4 border rounded-xl flex items-center justify-between group">
                            <div><p className="font-bold text-slate-800">{t.pipelineName} • {t.stageId}</p><p className="text-[10px] text-slate-400 uppercase">Gatilho de Disparo</p></div>
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
                    <button onClick={() => setEditingRole({ id: crypto.randomUUID(), name: '', permissions: {} })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold">+ Novo Perfil</button>
                </div>
                <div className="space-y-3">
                    {roles.map(r => (
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
                    <h3 className="text-lg font-bold">Níveis Docentes (Honorários)</h3>
                    <button onClick={() => setEditingLevel({ name: '', honorarium: 0 })} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-xs font-bold">+ Novo Nível</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {instructorLevels.map(lvl => (
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
                    <h3 className="text-lg font-bold">Informações dos Cursos (Portal)</h3>
                    <button onClick={() => setEditingCourseInfo({ courseName: '', details: '', materials: '', requirements: '' })} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold">+ Nova Info</button>
                </div>
                <div className="space-y-4">
                    {courseInfos.map(info => (
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
                    <h3 className="text-lg font-bold">Categorias de Suporte (Tags)</h3>
                    <button onClick={() => setEditingTag({ name: '', role: 'all' })} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold">+ Nova Tag</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {supportTags.map(tag => (
                        <div key={tag.id} className="p-4 border rounded-xl flex items-center justify-between group">
                            <div><p className="font-bold">{tag.name}</p><p className="text-[10px] text-slate-400 uppercase">Público: {tag.role}</p></div>
                            <div className="flex gap-2"><button onClick={() => setEditingTag(tag)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteSupportTag(tag.id).then(fetchSupportTags)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'logs' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><History size={20}/> Histórico de Auditoria</h3>
                <div className="space-y-3">
                    {logs.map(log => (
                        <div key={log.id} className="p-3 border-b text-xs flex items-start gap-4">
                            <span className="text-slate-400 w-24 shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                            <span className="font-bold text-slate-700 w-32 shrink-0">{log.userName}</span>
                            <span className="flex-1 text-slate-600">{log.details}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'database' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8">
                <div className="flex items-center gap-3 mb-4"><Database className="text-amber-600" /><h3 className="text-lg font-bold">Manutenção e Sincronização</h3></div>
                <p className="text-sm text-slate-500 mb-6">Execute este reparo se notar erros de banco de dados ou colunas ausentes na liberação de alunos.</p>
                {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-3 bg-slate-900 text-slate-100 rounded-lg font-bold">Gerar Script de Reparo V46</button> : (
                    <div className="relative">
                        <pre className="bg-black text-amber-400 p-4 rounded-lg text-[10px] font-mono overflow-auto">{generateRepairSQL()}</pre>
                        <button onClick={copySql} className="absolute top-2 right-2 bg-slate-700 text-white px-3 py-1 rounded text-xs">{sqlCopied ? 'Copiado!' : 'Copiar'}</button>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* MODAL EMPRESA (Restaurado com Mapeamento de Produtos) */}
      {editingCompany && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold">Configurar Empresa</h3>
                      <button onClick={() => setEditingCompany(null)}><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <input placeholder="Razão Social" className="w-full px-3 py-2 border rounded-lg" value={editingCompany.legalName} onChange={e => setEditingCompany({...editingCompany, legalName: e.target.value})} />
                          <input placeholder="CNPJ" className="w-full px-3 py-2 border rounded-lg" value={editingCompany.cnpj} onChange={e => setEditingCompany({...editingCompany, cnpj: e.target.value})} />
                      </div>
                      <input placeholder="Webhook URL (Connection Plug)" className="w-full px-3 py-2 border rounded-lg font-mono text-xs" value={editingCompany.webhookUrl} onChange={e => setEditingCompany({...editingCompany, webhookUrl: e.target.value})} />
                      
                      <div className="border-t pt-4">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-3">Atribuição por Tipo de Produto</p>
                          <div className="flex gap-2">
                              {['Digital', 'Presencial', 'Evento'].map(type => (
                                  <button key={type} onClick={() => toggleCompanyProductType(type)} className={clsx("px-4 py-2 rounded-lg border-2 text-xs font-bold", editingCompany.productTypes?.includes(type) ? "bg-teal-50 border-teal-500 text-teal-700" : "bg-white border-slate-100")}>{type}</button>
                              ))}
                          </div>
                      </div>

                      <div className="border-t pt-4">
                          <div className="flex justify-between items-center mb-3">
                              <p className="text-xs font-bold text-slate-400 uppercase">Produtos Específicos</p>
                              <div className="relative"><Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="Filtrar produtos..." className="pl-7 pr-2 py-1 border rounded text-[10px] outline-none" value={productSearch} onChange={e => setProductSearch(e.target.value)} /></div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                              {filteredProductsBySelectedTypes.map(p => (
                                  <label key={p.id} className={clsx("flex items-center gap-2 p-2 rounded border text-[10px] cursor-pointer transition-colors", editingCompany.productIds?.includes(p.id) ? "bg-teal-50 border-teal-200" : "hover:bg-slate-50")}>
                                      <input type="checkbox" checked={editingCompany.productIds?.includes(p.id)} onChange={() => toggleCompanyProductId(p.id)} className="rounded text-teal-600" />
                                      <span className="truncate font-bold">{p.name}</span>
                                  </label>
                              ))}
                              {filteredProductsBySelectedTypes.length === 0 && <p className="text-[10px] text-slate-400 italic py-4 text-center">Selecione tipos acima para ver produtos.</p>}
                          </div>
                      </div>
                  </div>
                  <div className="p-6 bg-slate-50 border-t flex justify-end">
                      <button onClick={handleSaveCompany} disabled={isSavingCompany} className="bg-teal-600 text-white px-8 py-2 rounded-lg font-bold">{isSavingCompany ? 'Salvando...' : 'Salvar'}</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL BANNER */}
      {editingBanner && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold">Configurar Banner</h3>
                      <button onClick={() => setEditingBanner(null)}><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-4">
                      <input placeholder="Título" className="w-full px-3 py-2 border rounded-lg" value={editingBanner.title} onChange={e => setEditingBanner({...editingBanner, title: e.target.value})} />
                      <input placeholder="Link" className="w-full px-3 py-2 border rounded-lg" value={editingBanner.linkUrl} onChange={e => setEditingBanner({...editingBanner, linkUrl: e.target.value})} />
                      <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={editingBanner.targetAudience} onChange={e => setEditingBanner({...editingBanner, targetAudience: e.target.value as any})}>
                          <option value="student">Público: Aluno</option>
                          <option value="instructor">Público: Instrutor</option>
                      </select>
                      <div className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer" onClick={() => bannerFileInputRef.current?.click()}>
                          {editingBanner.imageUrl ? <img src={editingBanner.imageUrl} className="h-20 mx-auto" /> : <p className="text-xs text-slate-400">Clique para enviar imagem</p>}
                          <input type="file" ref={bannerFileInputRef} className="hidden" accept="image/*" onChange={handleBannerImageUpload} />
                      </div>
                  </div>
                  <div className="p-6 bg-slate-50 border-t flex justify-end">
                      <button onClick={handleSaveBanner} className="bg-orange-600 text-white px-8 py-2 rounded-lg font-bold">Salvar</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL TAG SUPORTE */}
      {editingTag && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold">Configurar Categoria</h3>
                      <button onClick={() => setEditingTag(null)}><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-4">
                      <input placeholder="Nome da Tag" className="w-full px-3 py-2 border rounded-lg" value={editingTag.name} onChange={e => setEditingTag({...editingTag, name: e.target.value})} />
                      <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={editingTag.role} onChange={e => setEditingTag({...editingTag, role: e.target.value as any})}>
                          <option value="all">Público: Todos</option>
                          <option value="student">Público: Aluno</option>
                          <option value="instructor">Público: Instrutor</option>
                          <option value="studio">Público: Studio</option>
                      </select>
                  </div>
                  <div className="p-6 bg-slate-50 border-t flex justify-end">
                      <button onClick={handleSaveTag} className="bg-emerald-600 text-white px-8 py-2 rounded-lg font-bold">Salvar</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL INFOS PORTAL */}
      {editingCourseInfo && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold">Configurar Infos do Curso</h3>
                      <button onClick={() => setEditingCourseInfo(null)}><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-4">
                      <input placeholder="Nome do Curso" className="w-full px-3 py-2 border rounded-lg font-bold" value={editingCourseInfo.courseName} onChange={e => setEditingCourseInfo({...editingCourseInfo, courseName: e.target.value})} />
                      <textarea placeholder="Detalhes" className="w-full px-3 py-2 border rounded-lg h-24 resize-none" value={editingCourseInfo.details} onChange={e => setEditingCourseInfo({...editingCourseInfo, details: e.target.value})} />
                      <textarea placeholder="Materiais" className="w-full px-3 py-2 border rounded-lg h-24 resize-none" value={editingCourseInfo.materials} onChange={e => setEditingCourseInfo({...editingCourseInfo, materials: e.target.value})} />
                      <textarea placeholder="Requisitos" className="w-full px-3 py-2 border rounded-lg h-24 resize-none" value={editingCourseInfo.requirements} onChange={e => setEditingCourseInfo({...editingCourseInfo, requirements: e.target.value})} />
                  </div>
                  <div className="p-6 bg-slate-50 border-t flex justify-end">
                      <button onClick={handleSaveCourseInfo} disabled={isSavingCourseInfo} className="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold">{isSavingCourseInfo ? 'Salvando...' : 'Salvar'}</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL GATILHO PLUG */}
      {editingTrigger && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold">Gatilho de Automação</h3>
                      <button onClick={() => setEditingTrigger(null)}><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Funil de Vendas</label>
                          <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={editingTrigger.pipelineName} onChange={e => setEditingTrigger({...editingTrigger, pipelineName: e.target.value})}>
                              {pipelines.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Etapa de Disparo</label>
                          <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={editingTrigger.stageId} onChange={e => setEditingTrigger({...editingTrigger, stageId: e.target.value})}>
                              {(pipelines.find(p => p.name === editingTrigger.pipelineName)?.stages || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">JSON Customizado (Opcional)</label>
                          <textarea placeholder='{"venda": "{{deal_number}}"}' className="w-full border rounded-lg px-3 py-2 text-xs font-mono h-32 resize-none bg-slate-50" value={editingTrigger.payloadJson} onChange={e => setEditingTrigger({...editingTrigger, payloadJson: e.target.value})} />
                      </div>
                  </div>
                  <div className="p-6 bg-slate-50 border-t flex justify-end">
                      <button onClick={handleSaveTrigger} className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold">Salvar Gatilho</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL ROLE */}
      {editingRole && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold">Permissões: {editingRole.name}</h3>
                      <button onClick={() => setEditingRole(null)}><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar">
                      <input placeholder="Nome do Perfil" className="w-full px-4 py-2 border rounded-xl mb-8 font-bold text-lg" value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} />
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {PERMISSION_MODULES.map(mod => (
                              <label key={mod.id} className={clsx("p-4 border-2 rounded-xl cursor-pointer transition-all flex items-center justify-between", editingRole.permissions[mod.id] ? "bg-indigo-50 border-indigo-500" : "bg-white border-slate-100")}>
                                  <span className="text-xs font-bold">{mod.label}</span>
                                  <input type="checkbox" checked={!!editingRole.permissions[mod.id]} onChange={e => setEditingRole({...editingRole, permissions: {...editingRole.permissions, [mod.id]: e.target.checked}})} className="w-5 h-5 rounded text-indigo-600" />
                              </label>
                          ))}
                      </div>
                  </div>
                  <div className="p-6 bg-slate-50 border-t flex justify-end">
                      <button onClick={handleSaveRole} className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold">Salvar</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL NÍVEL DOCENTE */}
      {editingLevel && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold">Configurar Nível</h3>
                      <button onClick={() => setEditingLevel(null)}><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-4">
                      <input placeholder="Nome do Nível" className="w-full px-3 py-2 border rounded-lg" value={editingLevel.name} onChange={e => setEditingLevel({...editingLevel, name: e.target.value})} />
                      <input type="number" placeholder="Valor Honorário (R$)" className="w-full px-3 py-2 border rounded-lg" value={editingLevel.honorarium} onChange={e => setEditingLevel({...editingLevel, honorarium: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="p-6 bg-slate-50 border-t flex justify-end">
                      <button onClick={() => { appBackend.saveInstructorLevel(editingLevel as InstructorLevel).then(fetchInstructorLevels); setEditingLevel(null); }} className="bg-rose-600 text-white px-8 py-2 rounded-lg font-bold">Salvar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

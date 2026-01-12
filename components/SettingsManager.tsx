import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, Database, 
    Copy, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Trash2, Building2, Plus, Edit2, Palette, History, RefreshCw, 
    Zap, Loader2, Table, DollarSign, Terminal, Tag as TagIcon, Layout, Globe,
    Search, Info, AlertTriangle, AlertCircle, ChevronDown, CheckCircle2
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

type SettingsTab = 'visual' | 'company' | 'banners' | 'connection_plug' | 'roles' | 'instructor_levels' | 'course_info' | 'support_tags' | 'logs' | 'database' | 'sql_script';

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
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isSavingItem, setIsSavingItem] = useState(false); 
  const [editingCompany, setEditingCompany] = useState<Partial<CompanySetting> | null>(null);

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
      else if (activeTab === 'company') fetchCompanies();
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
  const fetchCompanies = async () => { 
      setIsLoadingCompanies(true); 
      try { 
          const [comps, prods] = await Promise.all([
              appBackend.getCompanies(),
              appBackend.client.from('crm_products').select('id, name')
          ]);
          setCompanies(comps); 
          if (prods.data) setAllProducts(prods.data);
      } catch(e) {} finally { setIsLoadingCompanies(false); } 
  };
  const fetchInstructorLevels = async () => { 
      setIsLoadingLevels(true); 
      try { 
          const data = await appBackend.getInstructorLevels(); 
          setInstructorLevels(data); 
      } catch (e) {
          console.error("Erro ao buscar níveis docentes:", e);
      } finally { 
          setIsLoadingLevels(false); 
      } 
  };
  const fetchCourseInfos = async () => { setIsLoadingCourseInfo(true); try { const data = await appBackend.getCourseInfos(); setCourseInfos(data); } catch (e) {} finally { setIsLoadingCourseInfo(false); } };
  const fetchSupportTags = async () => { setIsLoadingTags(true); try { const data = await appBackend.getSupportTags(); setSupportTags(data); } catch (e) {} finally { setIsLoadingTags(false); } };
  const fetchLogs = async () => { setIsLoadingLogs(true); try { const data = await appBackend.getActivityLogs(100); setLogs(data); } catch (e) {} finally { setIsLoadingLogs(false); } };

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
    try { await appBackend.saveInstructorLevel(editingLevel as InstructorLevel); await fetchInstructorLevels(); setEditingLevel(null); } catch (e: any) { alert(e.message); } finally { setIsSavingItem(false); }
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
-- SCRIPT DE FUNDAÇÃO CRM V62 (INCLUDES REPAIR FOR INSTRUCTOR LEVELS)
CREATE TABLE IF NOT EXISTS public.crm_teacher_levels (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    honorarium numeric DEFAULT 0,
    observations text,
    created_at timestamp with time zone DEFAULT now()
);

-- Garante que a coluna de honorarium esteja no formato correto
ALTER TABLE IF EXISTS public.crm_teacher_levels ALTER COLUMN honorarium SET DEFAULT 0;

NOTIFY pgrst, 'reload schema';
  `.trim();

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && editingBanner) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setEditingBanner({ ...editingBanner, imageUrl: reader.result as string });
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

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
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Building2 className="text-teal-600" size={20}/> Empresas e Faturamento</h3>
                    <button onClick={() => setEditingCompany({ id: '', legalName: '', cnpj: '', webhookUrl: '', productTypes: [], productIds: [] })} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-teal-700">+ Nova Empresa</button>
                </div>
                <div className="space-y-4">
                    {isLoadingCompanies ? <Loader2 className="animate-spin mx-auto text-teal-600"/> : companies.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">Nenhuma empresa cadastrada.</div>
                    ) : companies.map(c => (
                        <div key={c.id} className="p-4 border rounded-xl flex items-center justify-between group hover:border-teal-300 transition-all">
                            <div>
                                <p className="font-bold text-slate-800">{c.legalName}</p>
                                <p className="text-xs text-slate-500 font-mono">CNPJ: {c.cnpj} • Webhook: {c.webhookUrl ? 'Configurado' : 'Pendente'}</p>
                            </div>
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
                    {isLoadingBanners ? <Loader2 className="animate-spin mx-auto text-orange-600"/> : banners.length === 0 ? (
                        <div className="col-span-full p-12 text-center text-slate-400 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">Nenhum banner cadastrado.</div>
                    ) : banners.map(b => (
                        <div key={b.id} className="border rounded-xl overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
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

        {activeTab === 'roles' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Perfis de Acesso</h3>
                    <button onClick={() => setEditingRole({ id: '', name: '', permissions: {} })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700">+ Novo Perfil</button>
                </div>
                <div className="space-y-3">
                    {isLoadingRoles ? <Loader2 className="animate-spin mx-auto text-indigo-600"/> : roles.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">Nenhum perfil de acesso cadastrado.</div>
                    ) : roles.map(r => (
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
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold">Níveis de Instrutores (Honorários)</h3>
                        <button onClick={fetchInstructorLevels} className="p-2 text-slate-400 hover:text-rose-600 transition-all"><RefreshCw size={16} className={clsx(isLoadingLevels && "animate-spin")} /></button>
                    </div>
                    <button onClick={() => setEditingLevel({ id: '', name: '', honorarium: 0, observations: '' })} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-rose-700">+ Novo Nível</button>
                </div>
                <div className="space-y-3">
                    {isLoadingLevels ? <Loader2 className="animate-spin mx-auto text-rose-600"/> : instructorLevels.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">Nenhum nível cadastrado.</div>
                    ) : instructorLevels.map(l => (
                        <div key={l.id} className="p-4 border rounded-xl flex items-center justify-between animate-in fade-in">
                            <div><p className="font-bold">{l.name}</p><p className="text-xs text-slate-500">Remuneração: R$ {l.honorarium}</p></div>
                            <div className="flex gap-2"><button onClick={() => setEditingLevel(l)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteInstructorLevel(l.id).then(fetchInstructorLevels)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'course_info' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Portal do Instrutor: Informações de Cursos</h3>
                    <button onClick={() => setEditingCourseInfo({ id: '', courseName: '', details: '', materials: '', requirements: '' })} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700">+ Nova Info</button>
                </div>
                <div className="space-y-4">
                    {isLoadingCourseInfo ? <Loader2 className="animate-spin mx-auto text-blue-600"/> : courseInfos.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">Nenhuma informação de curso cadastrada.</div>
                    ) : courseInfos.map(i => (
                        <div key={i.id} className="p-4 border rounded-xl flex items-center justify-between group">
                            <div><p className="font-bold">{i.courseName}</p><p className="text-[10px] text-slate-400 uppercase">Atualizado em: {new Date(i.updatedAt).toLocaleDateString()}</p></div>
                            <div className="flex gap-2"><button onClick={() => setEditingCourseInfo(i)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteCourseInfo(i.id).then(fetchCourseInfos)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'support_tags' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2"><TagIcon className="text-emerald-600" size={20}/> Tags de Atendimento</h3>
                    <button onClick={() => setEditingTag({ id: '', name: '', role: 'all' })} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700">+ Nova Tag</button>
                </div>
                <div className="space-y-3">
                    {isLoadingTags ? <Loader2 className="animate-spin mx-auto text-emerald-600"/> : supportTags.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">Nenhuma tag de suporte cadastrada.</div>
                    ) : supportTags.map(t => (
                        <div key={t.id} className="p-4 border rounded-xl flex items-center justify-between group hover:border-emerald-300 transition-all">
                            <div>
                                <p className="font-bold text-slate-800">{t.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Público Alvo: {t.role === 'all' ? 'Todos' : t.role}</p>
                            </div>
                            <div className="flex gap-2"><button onClick={() => setEditingTag(t)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteSupportTag?.(t.id).then(fetchSupportTags)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'connection_plug' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-indigo-800 flex items-center gap-2"><Zap className="text-indigo-600" size={20}/> Connection Plug (Webhooks)</h3>
                        <p className="text-xs text-slate-500">Disparar webhooks de faturamento ao mover negócios no CRM.</p>
                    </div>
                    <button onClick={() => setEditingTrigger({ id: '', pipelineName: '', stageId: '', payloadJson: '' })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700">+ Novo Gatilho</button>
                </div>
                <div className="space-y-4">
                    {isLoadingTriggers ? <Loader2 className="animate-spin mx-auto text-indigo-600"/> : webhookTriggers.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">Nenhum gatilho de webhook configurado.</div>
                    ) : webhookTriggers.map(tr => (
                        <div key={tr.id} className="p-4 border rounded-xl flex items-center justify-between group">
                            <div>
                                <p className="font-bold text-slate-800">{tr.pipelineName} → {pipelines.find(p => p.name === tr.pipelineName)?.stages.find(s => s.id === tr.stageId)?.title || tr.stageId}</p>
                                <p className="text-[10px] text-slate-400 font-mono">Dispara ao entrar nesta etapa</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingTrigger(tr)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={16}/></button>
                                <button onClick={() => appBackend.deleteWebhookTrigger?.(tr.id).then(fetchWebhookTriggers)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                            </div>
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
                    {isLoadingLogs ? <Loader2 className="animate-spin mx-auto text-slate-400"/> : logs.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">Nenhum log de auditoria encontrado.</div>
                    ) : logs.map(log => (
                        <div key={log.id} className="p-3 border-b border-slate-50 text-xs flex items-start gap-4 animate-in fade-in">
                            <span className="text-slate-400 w-32 shrink-0 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                            <span className="font-bold text-slate-700 w-40 shrink-0 truncate">{log.userName}</span>
                            <span className="flex-1 text-slate-600 leading-relaxed"><span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-black uppercase mr-2">{log.action}</span> {log.details}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'database' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-6">
                <div className="flex items-center gap-3 border-b pb-4">
                    <Database className="text-amber-600" size={24}/>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Gerenciador de Sincronização</h3>
                        <p className="text-xs text-slate-500">Controle de conexões externas via Planilhas e Web.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {jobs.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 border-2 border-dashed rounded-2xl">Sem conexões ativas. Use o assistente para criar uma.</div>
                    ) : jobs.map(job => (
                        <div key={job.id} className="p-4 border rounded-xl flex items-center justify-between bg-slate-50/50 group">
                            <div className="flex items-center gap-4">
                                <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center", job.status === 'success' ? "bg-green-100 text-green-600" : job.status === 'syncing' ? "bg-blue-100 text-blue-600 animate-pulse" : "bg-red-100 text-red-600")}>
                                    {job.status === 'syncing' ? <RefreshCw size={20} className="animate-spin"/> : <Table size={20}/>}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">{job.name}</h4>
                                    <p className="text-[10px] text-slate-400 font-mono">{job.sheetUrl ? 'Automação Ativa' : 'Upload Manual'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Última Sinc:</p>
                                    <p className="text-xs font-mono text-slate-600">{job.lastSync ? new Date(job.lastSync).toLocaleString() : '--'}</p>
                                </div>
                                <button onClick={() => onDeleteJob(job.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={onStartWizard} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 hover:border-amber-400 hover:text-amber-600 transition-all flex items-center justify-center gap-2">+ Abrir Assistente de Conexão</button>
            </div>
        )}

        {activeTab === 'sql_script' && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-8 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4"><Terminal className="text-red-500" /><h3 className="text-lg font-bold text-white uppercase tracking-widest">Script SQL de Atualização V62</h3></div>
                <p className="text-sm text-slate-400 mb-6 font-medium leading-relaxed">Este script repara a estrutura do banco de dados para os níveis de instrutores. Copie e execute no **SQL Editor** do Supabase.</p>
                <div className="relative">
                    <pre className="bg-black text-emerald-400 p-6 rounded-2xl text-[10px] font-mono overflow-auto max-h-[400px] shadow-inner custom-scrollbar-dark border border-slate-800">
                        {generateRepairSQL()}
                    </pre>
                    <button onClick={copySql} className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border border-slate-700">
                        {sqlCopied ? <><Check size={14}/> Copiado!</> : <><Copy size={14}/> Copiar Script</>}
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* MODAL GENÉRICO PARA CRUDS */}
      {(editingRole || editingBanner || editingCompany || editingLevel || editingCourseInfo || editingTag || editingTrigger) && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh] my-8">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="font-bold uppercase text-xs tracking-widest text-slate-500">Configuração de Item</h3>
                      <button onClick={() => { setEditingRole(null); setEditingBanner(null); setEditingCompany(null); setEditingLevel(null); setEditingCourseInfo(null); setEditingTag(null); setEditingTrigger(null); }}><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                      
                      {/* FORM ROLE / ACESSOS */}
                      {editingRole && (
                          <div className="space-y-6">
                              <div>
                                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome do Perfil de Acesso</label>
                                  <input 
                                      className="w-full px-4 py-2.5 border-2 border-slate-100 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all" 
                                      value={editingRole.name} 
                                      onChange={e => setEditingRole({...editingRole, name: e.target.value})} 
                                      placeholder="Ex: Consultor Comercial, Coordenador Pedagógico..." 
                                  />
                              </div>

                              <div className="space-y-4">
                                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Permissões de Módulos</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {PERMISSION_MODULES.map(module => (
                                          <label key={module.id} className={clsx(
                                              "flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer group",
                                              editingRole.permissions?.[module.id] ? "bg-indigo-50 border-indigo-500 text-indigo-900" : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                                          )}>
                                              <span className="text-sm font-bold">{module.label}</span>
                                              <input 
                                                  type="checkbox" 
                                                  className="w-5 h-5 rounded text-indigo-600" 
                                                  checked={!!editingRole.permissions?.[module.id]} 
                                                  onChange={e => setEditingRole({
                                                      ...editingRole, 
                                                      permissions: { ...editingRole.permissions, [module.id]: e.target.checked }
                                                  })} 
                                              />
                                          </label>
                                      ))}
                                  </div>
                              </div>

                              <button onClick={handleSaveRole} disabled={isSavingItem} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                                  {isSavingItem ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />} Salvar Perfil de Acesso
                              </button>
                          </div>
                      )}

                      {/* FORM LEVEL */}
                      {editingLevel && (
                          <div className="space-y-6">
                              <input placeholder="Nome do Nível" className="w-full px-4 py-2 border rounded-xl font-bold" value={editingLevel.name} onChange={e => setEditingLevel({...editingLevel, name: e.target.value})} />
                              <div className="relative">
                                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                  <input type="number" placeholder="Valor Honorário (R$)" className="w-full pl-9 pr-4 py-2 border rounded-xl font-bold text-rose-600" value={editingLevel.honorarium} onChange={e => setEditingLevel({...editingLevel, honorarium: parseFloat(e.target.value) || 0})} />
                              </div>
                              <textarea placeholder="Observações e Critérios do Nível..." className="w-full px-4 py-2 border rounded-xl h-32 resize-none outline-none" value={editingLevel.observations} onChange={e => setEditingLevel({...editingLevel, observations: e.target.value})} />
                              <button onClick={handleSaveLevel} disabled={isSavingItem} className="w-full py-3.5 bg-rose-600 text-white rounded-xl font-bold shadow-lg hover:bg-rose-700 transition-all">{isSavingItem ? 'Salvando...' : 'Salvar Nível Docente'}</button>
                          </div>
                      )}

                      {/* FORM COMPANY */}
                      {editingCompany && (
                          <div className="space-y-6">
                              <input className="w-full px-4 py-2.5 border rounded-xl font-bold" value={editingCompany.legalName} onChange={e => setEditingCompany({...editingCompany, legalName: e.target.value})} placeholder="Razão Social" />
                              <input className="w-full px-4 py-2.5 border rounded-xl font-mono text-sm" value={editingCompany.cnpj} onChange={e => setEditingCompany({...editingCompany, cnpj: e.target.value})} placeholder="CNPJ" />
                              <input className="w-full px-4 py-2.5 border rounded-xl text-blue-600 font-mono text-xs" value={editingCompany.webhookUrl} onChange={e => setEditingCompany({...editingCompany, webhookUrl: e.target.value})} placeholder="URL de Webhook" />
                              
                              <div className="space-y-4">
                                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Vincular a Tipos de Produto</label>
                                  <div className="flex flex-wrap gap-2">
                                      {['Digital', 'Presencial', 'Evento'].map(type => (
                                          <button 
                                            key={type}
                                            onClick={() => {
                                                const current = editingCompany.productTypes || [];
                                                const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
                                                setEditingCompany({...editingCompany, productTypes: updated});
                                            }}
                                            className={clsx("px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all", editingCompany.productTypes?.includes(type) ? "bg-teal-600 border-teal-600 text-white shadow-md" : "bg-white border-slate-100 text-slate-400")}
                                          >{type}</button>
                                      ))}
                                  </div>
                              </div>

                              <button onClick={handleSaveCompany} disabled={isSavingItem} className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2">
                                  {isSavingItem ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Empresa
                              </button>
                          </div>
                      )}

                      {/* FORM TAG SUPPORT */}
                      {editingTag && (
                          <div className="space-y-6">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Nome da Tag</label>
                                  <input className="w-full px-4 py-2.5 border rounded-xl font-bold" value={editingTag.name} onChange={e => setEditingTag({...editingTag, name: e.target.value})} placeholder="Ex: Financeiro, Acadêmico..." />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Público de Exibição</label>
                                  <select className="w-full px-4 py-2.5 border rounded-xl bg-white font-medium" value={editingTag.role} onChange={e => setEditingTag({...editingTag, role: e.target.value as any})}>
                                      <option value="all">Todos (Público)</option>
                                      <option value="student">Apenas Alunos</option>
                                      <option value="instructor">Apenas Instrutores</option>
                                      <option value="studio">Apenas Studios</option>
                                      <option value="admin">Apenas Adm (Interno)</option>
                                  </select>
                              </div>
                              <button onClick={handleSaveTag} disabled={isSavingItem} className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
                                  {isSavingItem ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Tag de Suporte
                              </button>
                          </div>
                      )}

                      {/* FORM WEBHOOK TRIGGER */}
                      {editingTrigger && (
                          <div className="space-y-6">
                              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex gap-3 text-indigo-700">
                                  <Zap size={24} className="shrink-0" />
                                  <p className="text-xs font-medium">Os gatilhos disparam o webhook das empresas quando um negócio atinge a etapa selecionada.</p>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">1. Selecione o Funil</label>
                                      <select className="w-full px-4 py-2.5 border rounded-xl bg-white font-bold" value={editingTrigger.pipelineName} onChange={e => setEditingTrigger({...editingTrigger, pipelineName: e.target.value, stageId: ''})}>
                                          <option value="">Escolha um funil...</option>
                                          {pipelines.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">2. Selecione a Etapa (Gatilho)</label>
                                      <select className="w-full px-4 py-2.5 border rounded-xl bg-white disabled:bg-slate-50" value={editingTrigger.stageId} onChange={e => setEditingTrigger({...editingTrigger, stageId: e.target.value})} disabled={!editingTrigger.pipelineName}>
                                          <option value="">Escolha uma etapa...</option>
                                          {pipelines.find(p => p.name === editingTrigger.pipelineName)?.stages.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                      </select>
                                  </div>
                              </div>
                              <button onClick={handleSaveTrigger} disabled={isSavingItem} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                                  {isSavingItem ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Gatilho de Plug
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
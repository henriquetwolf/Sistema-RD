
import React, { useState, useEffect, useRef } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, Database, 
    Copy, Users, User, Lock, Unlock, Check, X, ShieldCheck, 
    Trash2, Building2, Plus, Edit2, Palette, History, RefreshCw, 
    Zap, Loader2, Table, DollarSign, Terminal, Tag as TagIcon, Layout, Globe,
    Search, Info, AlertTriangle, AlertCircle, ChevronDown, CheckCircle2,
    Target, Briefcase, Mail, Key, Shield, GraduationCap, School, ListChecks,
    Eye, Link as LinkIcon, Award, Monitor
} from 'lucide-react';
import { appBackend, CompanySetting, WebhookTrigger, Pipeline } from '../services/appBackend';
import { Role as UserRole, Banner, InstructorLevel, ActivityLog, SyncJob, CourseInfo, SupportTag } from '../types';
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
      { id: 'whatsapp_automation', label: 'Automação WhatsApp' },
      { id: 'whatsapp_bulk', label: 'Envio em Massa' },
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
      { id: 'landing_pages', label: 'Páginas de Venda' },
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
  const fetchBanners = async () => { 
      setIsLoadingBanners(true); 
      try { 
          const [studentBanners, instructorBanners] = await Promise.all([
              appBackend.getBanners('student'),
              appBackend.getBanners('instructor')
          ]);
          setBanners([...studentBanners, ...instructorBanners]); 
      } catch (e) {} finally { setIsLoadingBanners(false); } 
  };
  const fetchCompanies = async () => { 
      setIsLoadingCompanies(true); 
      try { 
          const comps = await appBackend.getCompanies();
          setCompanies(comps); 
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
  const fetchSupportTags = async () => { setIsLoadingTags(true); try { const data = await appBackend.getSupportTags(undefined); setSupportTags(data); } catch (e) {} finally { setIsLoadingTags(false); } };
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
      try {
          await appBackend.saveRole(editingRole);
          await fetchRoles();
          setEditingRole(null);
      } catch (e) {} finally { setIsSavingItem(false); }
  };

  const handleSaveCompany = async () => {
      if (!editingCompany?.legalName || !editingCompany?.cnpj) return;
      setIsSavingItem(true);
      try {
          await appBackend.saveCompany(editingCompany as CompanySetting);
          await fetchCompanies();
          setEditingCompany(null);
      } catch (e) {} finally { setIsSavingItem(false); }
  };

  const handleSaveBanner = async () => {
      if (!editingBanner?.title || !editingBanner?.imageUrl) return;
      setIsSavingItem(true);
      try {
          await appBackend.saveBanner({
              ...editingBanner,
              id: editingBanner.id || crypto.randomUUID(),
              active: editingBanner.active ?? true,
              targetAudience: editingBanner.targetAudience || 'student'
          } as Banner);
          await fetchBanners();
          setEditingBanner(null);
      } catch (e) {} finally { setIsSavingItem(false); }
  };

  const handleSaveLevel = async () => {
      if (!editingLevel?.name) return;
      setIsSavingItem(true);
      try {
          await appBackend.saveInstructorLevel(editingLevel);
          await fetchInstructorLevels();
          setEditingLevel(null);
      } catch (e) {} finally { setIsSavingItem(false); }
  };

  const handleSaveTrigger = async () => {
      if (!editingTrigger?.pipelineName || !editingTrigger?.stageId) return;
      setIsSavingItem(true);
      try {
          await appBackend.saveWebhookTrigger(editingTrigger);
          await fetchWebhookTriggers();
          setEditingTrigger(null);
      } catch (e) {} finally { setIsSavingItem(false); }
  };

  const generateRepairSQL = () => `
-- SCRIPT DE REPARO SQL DEFINITIVO V16
-- Garante extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de Configurações Gerais
CREATE TABLE IF NOT EXISTS public.crm_settings (
    key text PRIMARY KEY,
    value text
);

-- Tabela de Empresas
CREATE TABLE IF NOT EXISTS public.crm_companies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    legal_name text,
    cnpj text UNIQUE,
    webhook_url text,
    product_types text[],
    product_ids text[]
);

-- Tabela de Presets (Configurações Salvas de Banco)
CREATE TABLE IF NOT EXISTS public.crm_presets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    url text NOT NULL,
    key text NOT NULL,
    table_name text,
    primary_key text,
    interval_minutes integer DEFAULT 5,
    created_by_name text,
    created_at timestamptz DEFAULT now()
);

-- Tabela de Conexões de Sincronização Ativas
CREATE TABLE IF NOT EXISTS public.crm_sync_jobs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text,
    sheet_url text,
    config jsonb,
    last_sync timestamptz,
    status text DEFAULT 'idle',
    last_message text,
    active boolean DEFAULT true,
    interval_minutes integer DEFAULT 5,
    created_by text,
    created_at timestamptz DEFAULT now()
);

-- Habilitar RLS em todas as tabelas críticas
ALTER TABLE public.crm_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;

-- Garantir acesso total aos roles anon e authenticated (Necessário para cache da API)
GRANT ALL ON TABLE public.crm_presets TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.crm_sync_jobs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.crm_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.crm_companies TO anon, authenticated, service_role;

-- Recriar Políticas de Acesso
DROP POLICY IF EXISTS "Permitir acesso total crm_presets" ON public.crm_presets;
CREATE POLICY "Permitir acesso total crm_presets" ON public.crm_presets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir acesso total crm_sync_jobs" ON public.crm_sync_jobs;
CREATE POLICY "Permitir acesso total crm_sync_jobs" ON public.crm_sync_jobs FOR ALL USING (true) WITH CHECK (true);

-- COMANDO CRÍTICO: Forçar recarregamento do cache do schema para que a API reconheça as novas tabelas
NOTIFY pgrst, 'reload schema';
`.trim();

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
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
            <div className="space-y-6 animate-in slide-in-from-left-2">
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
            <div className="space-y-6 animate-in slide-in-from-left-2">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div><h3 className="text-lg font-bold text-slate-800">Empresas do Grupo</h3><p className="text-xs text-slate-500">Configuração de CNPJs e Webhooks de integração.</p></div>
                    <button onClick={() => setEditingCompany({ legalName: '', cnpj: '', webhookUrl: '', productTypes: [], productIds: [] })} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Plus size={16}/> Nova Empresa</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isLoadingCompanies ? <div className="col-span-full py-12 flex justify-center"><Loader2 className="animate-spin text-teal-600" /></div> : companies.map(comp => (
                        <div key={comp.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-teal-50 p-2 rounded-lg text-teal-600"><Building2 size={24}/></div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingCompany(comp)} className="p-1.5 text-slate-400 hover:text-teal-600"><Edit2 size={16}/></button>
                                    <button onClick={() => { if(window.confirm("Excluir empresa?")) appBackend.deleteCompany(comp.id).then(fetchCompanies); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <h4 className="font-bold text-slate-800">{comp.legalName}</h4>
                            <p className="text-[10px] font-mono text-slate-400 mb-4">{comp.cnpj}</p>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Webhook Ativo</p>
                                <div className="bg-slate-50 p-2 rounded text-[10px] font-mono truncate border border-slate-100" title={comp.webhookUrl}>{comp.webhookUrl || 'Sem URL vinculada'}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'banners' && (
            <div className="space-y-6 animate-in slide-in-from-left-2">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div><h3 className="text-lg font-bold text-slate-800">Banner de Portal</h3><p className="text-xs text-slate-500">Imagens exibidas no topo da Área do Aluno/Instrutor.</p></div>
                    <button onClick={() => setEditingBanner({ title: '', imageUrl: '', linkUrl: '', targetAudience: 'student', active: true })} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Plus size={16}/> Novo Banner</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isLoadingBanners ? <div className="col-span-full py-12 flex justify-center"><Loader2 className="animate-spin text-orange-600" /></div> : banners.map(banner => (
                        <div key={banner.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group">
                            <div className="h-32 bg-slate-100 relative">
                                <img src={banner.imageUrl} className="w-full h-full object-cover" alt={banner.title} />
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingBanner(banner)} className="bg-white p-1.5 rounded-lg text-slate-600 hover:text-orange-600 shadow-md"><Edit2 size={14}/></button>
                                    <button onClick={() => { if(window.confirm("Excluir banner?")) appBackend.deleteBanner(banner.id).then(fetchBanners); }} className="bg-white p-1.5 rounded-lg text-slate-600 hover:text-red-600 shadow-md"><Trash2 size={14}/></button>
                                </div>
                            </div>
                            <div className="p-4 flex justify-between items-center">
                                <div><h4 className="font-bold text-sm text-slate-800">{banner.title}</h4><span className="text-[10px] uppercase font-black text-slate-400">{banner.targetAudience === 'student' ? 'Área do Aluno' : 'Área do Instrutor'}</span></div>
                                <div className={clsx("w-3 h-3 rounded-full", banner.active ? "bg-green-500" : "bg-slate-300")}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'roles' && (
            <div className="space-y-6 animate-in slide-in-from-left-2">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div><h3 className="text-lg font-bold text-slate-800">Cargos e Permissões</h3><p className="text-xs text-slate-500">Defina o que cada perfil de acesso pode visualizar e editar.</p></div>
                    <button onClick={() => setEditingRole({ id: '', name: '', permissions: {} })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Plus size={16}/> Novo Perfil</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {isLoadingRoles ? <div className="col-span-full py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div> : roles.map(role => (
                        <div key={role.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><ShieldCheck size={20}/></div>
                                <span className="font-bold text-slate-700">{role.name}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingRole(role)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                <button onClick={() => { if(window.confirm("Excluir perfil?")) appBackend.deleteRole(role.id).then(fetchRoles); }} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'database' && (
            <div className="space-y-6 animate-in slide-in-from-left-2">
                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div><h3 className="text-xl font-bold text-slate-800">Conexões Ativas</h3><p className="text-sm text-slate-500">Tabelas do Supabase sincronizadas com planilhas externas.</p></div>
                        <button onClick={onStartWizard} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95"><Plus size={20}/> Nova Conexão</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {jobs.map(job => (
                            <div key={job.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 hover:border-teal-300 transition-all group relative">
                                <button onClick={() => onDeleteJob(job.id)} className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={clsx("p-3 rounded-2xl shadow-sm", job.status === 'syncing' ? "bg-blue-500 animate-pulse" : job.status === 'error' ? "bg-red-500" : "bg-teal-600")}><Database className="text-white" size={24}/></div>
                                    <div><h4 className="font-bold text-slate-800 text-lg">{job.name}</h4><p className="text-xs text-slate-500 font-mono tracking-tighter uppercase">{job.config.tableName}</p></div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs font-medium"><span className="text-slate-400">Última Sincro:</span><span className="text-slate-600 font-bold">{job.lastSync ? new Date(job.lastSync).toLocaleString() : 'Nunca'}</span></div>
                                    <div className="flex justify-between text-xs font-medium"><span className="text-slate-400">Status:</span><span className={clsx("font-bold uppercase tracking-widest text-[10px]", job.status === 'success' ? "text-green-600" : job.status === 'error' ? "text-red-500" : "text-blue-500")}>{job.status}</span></div>
                                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-[10px] font-medium text-slate-500 h-10 line-clamp-2 overflow-hidden italic">"{job.lastMessage}"</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'sql_script' && (
            <div className="bg-slate-900 rounded-3xl p-10 space-y-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Terminal size={140}/></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-black text-white flex items-center gap-3"><Terminal size={24} className="text-red-500"/> Script de Reparo Estrutural V16</h3>
                        <p className="text-slate-400 text-sm mt-2 max-w-xl font-medium leading-relaxed">Este script corrige o schema das tabelas e as permissões de cache para suportar o salvamento de presets e conexões.</p>
                    </div>
                    <button onClick={copySql} className={clsx("px-10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all flex items-center gap-2 shrink-0 active:scale-95", sqlCopied ? "bg-green-600 text-white" : "bg-red-600 hover:bg-red-700 text-white")}>
                        {sqlCopied ? <><Check size={18}/> Copiado!</> : <><Copy size={18}/> Copiar SQL</>}
                    </button>
                </div>
                <div className="relative mt-4">
                    <pre className="bg-slate-950 p-6 rounded-2xl text-red-400 font-mono text-[11px] overflow-x-auto border border-white/5 max-h-64 leading-relaxed custom-scrollbar-dark whitespace-pre-wrap">{generateRepairSQL()}</pre>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 bg-black/20 p-4 rounded-xl">
                    <Info size={18} className="text-red-500 shrink-0"/>
                    <p>Copie o código acima e cole no <strong>SQL Editor</strong> do seu dashboard Supabase para aplicar as correções e forçar a atualização do cache da API.</p>
                </div>
            </div>
        )}
      </div>

      {/* MODALS CRUD */}
      {editingRole && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="text-lg font-black text-slate-800">{editingRole.id ? 'Editar Perfil' : 'Novo Perfil de Acesso'}</h3>
                      <button onClick={() => setEditingRole(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome do Cargo / Perfil</label>
                          <input type="text" className="w-full px-5 py-3 border border-slate-200 bg-slate-50 focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all" value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} placeholder="Ex: Gestor Financeiro" />
                      </div>
                      <div className="space-y-4">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Permissões de Módulo</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {PERMISSION_MODULES.map(mod => (
                                  <label key={mod.id} className={clsx("flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer", editingRole.permissions[mod.id] ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50")}>
                                      <span className="text-xs font-bold">{mod.label}</span>
                                      <input type="checkbox" className="w-5 h-5 rounded text-indigo-600 focus:ring-0" checked={editingRole.permissions[mod.id] || false} onChange={e => {
                                          const updated = { ...editingRole.permissions };
                                          if (e.target.checked) updated[mod.id] = true;
                                          else delete updated[mod.id];
                                          setEditingRole({...editingRole, permissions: updated});
                                      }} />
                                  </label>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
                      <button onClick={() => setEditingRole(null)} className="px-6 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
                      <button onClick={handleSaveRole} disabled={isSavingItem} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 active:scale-95 disabled:opacity-50">{isSavingItem ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Perfil</button>
                  </div>
              </div>
          </div>
      )}

      {editingCompany && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl animate-in zoom-in-95 overflow-hidden">
                  <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-black text-slate-800">{editingCompany.id ? 'Editar Empresa' : 'Nova Empresa do Grupo'}</h3>
                      <button onClick={() => setEditingCompany(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Razão Social</label>
                              <input type="text" className="w-full px-4 py-2 border rounded-xl text-sm font-bold" value={editingCompany.legalName || ''} onChange={e => setEditingCompany({...editingCompany, legalName: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">CNPJ</label>
                              <input type="text" className="w-full px-4 py-2 border rounded-xl text-sm font-mono" value={editingCompany.cnpj || ''} onChange={e => setEditingCompany({...editingCompany, cnpj: e.target.value})} />
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Webhook URL de Destino</label>
                              <input type="text" className="w-full px-4 py-2 border rounded-xl text-xs font-mono text-blue-600" value={editingCompany.webhookUrl || ''} onChange={e => setEditingCompany({...editingCompany, webhookUrl: e.target.value})} placeholder="https://api.erp.com/vendas" />
                          </div>
                      </div>
                      <div className="pt-4 border-t flex justify-end gap-3">
                          <button onClick={() => setEditingCompany(null)} className="px-6 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
                          <button onClick={handleSaveCompany} disabled={isSavingItem} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-2 rounded-xl font-bold text-sm shadow-xl active:scale-95 disabled:opacity-50">{isSavingItem ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Empresa</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

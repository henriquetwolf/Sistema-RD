
import React, { useState, useEffect } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, 
    Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Layout, ExternalLink, Trash2, BarChart3, Building2, Plus, Edit2,
    Monitor, Globe, Target, Info, Shield, TrendingUp, DollarSign,
    Loader2, Package, Tag, Layers, Palette, History, Clock, User, Search,
    Play, Pause, Calendar, Smartphone, Link as LinkIcon, ChevronDown
} from 'lucide-react';
import { appBackend, CompanySetting } from '../services/appBackend';
import { Role, Role as UserRole, Banner, InstructorLevel, ActivityLog, SyncJob } from '../types';
import clsx from 'clsx';

interface SettingsManagerProps {
  onLogoChange: (newLogo: string | null) => void;
  currentLogo: string | null;
  jobs: SyncJob[];
  onStartWizard: () => void;
  onDeleteJob: (id: string) => void;
}

const MODULES = [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'crm', label: 'CRM Comercial' },
    { id: 'inventory', label: 'Controle de Estoque' },
    { id: 'whatsapp', label: 'Atendimento (WhatsApp)' },
    { id: 'analysis', label: 'Análise de Vendas' },
    { id: 'collaborators', label: 'Colaboradores' },
    { id: 'classes', label: 'Turmas' },
    { id: 'teachers', label: 'Professores' },
    { id: 'franchises', label: 'Franquias' },
    { id: 'partner_studios', label: 'Studios Parceiros' },
    { id: 'forms', label: 'Formulários' },
    { id: 'contracts', label: 'Contratos' },
    { id: 'products', label: 'Produtos Digitais' },
    { id: 'events', label: 'Eventos' },
    { id: 'students', label: 'Alunos' },
    { id: 'certificates', label: 'Certificados' },
    { id: 'global_settings', label: 'Configurações' },
];

export const SettingsManager: React.FC<SettingsManagerProps> = ({ 
  onLogoChange, 
  currentLogo,
  jobs,
  onStartWizard,
  onDeleteJob
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'connections' | 'company' | 'roles' | 'database' | 'banners' | 'instructor_levels' | 'logs'>('visual');
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
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Partial<CompanySetting> | null>(null);

  const [instructorLevels, setInstructorLevels] = useState<InstructorLevel[]>([]);
  const [isLoadingLevels, setIsLoadingLevels] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Partial<InstructorLevel> | null>(null);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  useEffect(() => {
      fetchGlobalSettings();
      if (activeTab === 'roles') fetchRoles();
      else if (activeTab === 'banners') fetchBanners();
      else if (activeTab === 'company') fetchCompanies();
      else if (activeTab === 'instructor_levels') fetchInstructorLevels();
      else if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  const fetchGlobalSettings = async () => {
    const margin = await appBackend.getInventorySecurityMargin();
    setSecurityMargin(margin);
    const logo = await appBackend.getAppLogo();
    setPreview(logo);
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
-- SCRIPT DE REPARO COMPLETO DO BANCO DE DADOS VOLL CRM (V3)

-- 1. TABELA DE CONFIGURAÇÕES
CREATE TABLE IF NOT EXISTS public.app_settings (key text PRIMARY KEY, value jsonb, updated_at timestamptz DEFAULT now());

-- 2. TABELA DE CONEXÕES
CREATE TABLE IF NOT EXISTS public.crm_sync_jobs (id uuid PRIMARY KEY, user_id uuid, name text, sheet_url text, config jsonb, active boolean DEFAULT true, interval_minutes int DEFAULT 5, last_sync timestamptz, status text, last_message text, created_by_name text, created_at timestamptz DEFAULT now());

-- 3. TABELA DE LOGS
CREATE TABLE IF NOT EXISTS public.crm_activity_logs (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_name text NOT NULL, action text NOT NULL, module text NOT NULL, details text, record_id text, created_at timestamptz DEFAULT now());

-- 4. TABELA DE CERTIFICADOS
CREATE TABLE IF NOT EXISTS public.crm_certificates (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), title text NOT NULL, background_base_64 text, back_background_base_64 text, linked_product_id text, body_text text, layout_config jsonb);

-- 5. TABELA DE FUNIS DE VENDAS (PIPELINES) - COM REPARO DE COLUNAS
CREATE TABLE IF NOT EXISTS public.crm_pipelines (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    stages jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- GARANTIR COLUNA STAGES (Caso a tabela tenha sido criada sem ela antes)
ALTER TABLE public.crm_pipelines ADD COLUMN IF NOT EXISTS stages jsonb DEFAULT '[]'::jsonb;

-- INSERIR FUNIL PADRÃO SE NÃO EXISTIR
INSERT INTO public.crm_pipelines (name, stages)
SELECT 'Padrão', '[
    {"id": "new", "title": "Sem Contato", "color": "border-slate-300"},
    {"id": "contacted", "title": "Contatado", "color": "border-blue-400"},
    {"id": "proposal", "title": "Proposta Enviada", "color": "border-yellow-400"},
    {"id": "negotiation", "title": "Em Negociação", "color": "border-orange-500"},
    {"id": "closed", "title": "Fechamento", "color": "border-green-500"}
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.crm_pipelines WHERE name = 'Padrão');

-- 6. TABELA DE COLABORADORES (VERSÃO COMPLETA)
CREATE TABLE IF NOT EXISTS public.crm_collaborators (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name text, social_name text, birth_date date, marital_status text, spouse_name text, father_name text, mother_name text,
    gender_identity text, racial_identity text, education_level text, photo_url text, email text UNIQUE, phone text, cellphone text,
    corporate_phone text, operator text, address text, cep text, complement text, birth_state text, birth_city text, state text, current_city text,
    emergency_name text, emergency_phone text, admission_date date, previous_admission_date date, role text, role_id uuid, password text,
    headquarters text, department text, salary text, hiring_mode text, hiring_company text, work_hours text, break_time text, work_days text,
    presential_days text, superior_id text, experience_period text, has_other_job text, status text DEFAULT 'active', contract_type text,
    cpf text, rg text, rg_issuer text, rg_issue_date date, rg_state text, ctps_number text, ctps_series text, ctps_state text, ctps_issue_date date,
    pis_number text, reservist_number text, docs_folder_link text, legal_auth boolean DEFAULT false, bank_account_info text,
    has_insalubrity text, insalubrity_percent text, has_danger_pay text, transport_voucher_info text, bus_line_home_work text, bus_qty_home_work text,
    bus_line_work_home text, bus_qty_work_home text, ticket_value text, fuel_voucher_value text, has_meal_voucher text, has_food_voucher text,
    has_home_office_aid text, has_health_plan text, has_dental_plan text, bonus_info text, bonus_value text, commission_info text,
    commission_percent text, has_dependents text, dependent_name text, dependent_dob date, dependent_kinship text, dependent_cpf text,
    resignation_date date, demission_reason text, demission_docs text, vacation_periods text, observations text,
    created_at timestamptz DEFAULT now()
);

-- 7. TABELAS DE APOIO
CREATE TABLE IF NOT EXISTS public.crm_roles (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, permissions jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.crm_instructor_levels (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, honorarium numeric DEFAULT 0, observations text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.crm_companies (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, legal_name text, cnpj text, product_types jsonb DEFAULT '[]'::jsonb, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.app_banners (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, title text, image_url text, link_url text, target_audience text, active boolean DEFAULT true, created_at timestamptz DEFAULT now());

-- 8. HABILITAR RLS E POLÍTICAS
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total pipelines" ON public.crm_pipelines;
CREATE POLICY "Acesso total pipelines" ON public.crm_pipelines FOR ALL USING (true) WITH CHECK (true);

-- LIMPAR CACHE DO POSTGREST
NOTIFY pgrst, 'reload config';
  `.trim();

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };

  const filteredLogs = logs.filter(l => 
    l.userName.toLowerCase().includes(logSearch.toLowerCase()) || 
    l.details.toLowerCase().includes(logSearch.toLowerCase()) ||
    l.module.toLowerCase().includes(logSearch.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>
            <p className="text-slate-500 text-sm">Personalize acessos, identidade e acompanhe atividades.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto shrink-0 max-w-full no-scrollbar">
            <button onClick={() => setActiveTab('visual')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'visual' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Geral</button>
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

                <div className="flex justify-end pt-4">
                    <button onClick={handleSaveGlobal} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2">
                        {isSaved ? <><Check size={18}/> Salvo!</> : <><Save size={18}/> Salvar Configurações</>}
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'connections' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Conexões Ativas</h3>
                        <p className="text-sm text-slate-500">Sincronização automática com fontes externas.</p>
                    </div>
                    <button onClick={onStartWizard} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-teal-700"><Plus size={16}/> Nova Conexão</button>
                </div>
                <div className="divide-y divide-slate-100">
                    {jobs.length === 0 ? <div className="p-10 text-center text-slate-400">Nenhuma conexão configurada.</div> : jobs.map(job => (
                        <div key={job.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className={clsx("p-2 rounded-lg", job.status === 'success' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                    <LinkIcon size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">{job.name} <span className="text-[10px] text-slate-400 font-normal uppercase ml-2 tracking-widest">({job.config.tableName})</span></h4>
                                    <p className="text-xs text-slate-500 truncate max-w-sm">{job.sheetUrl}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={10}/> {job.intervalMinutes} min</span>
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><User size={10}/> {job.createdBy || 'Admin'}</span>
                                        <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded uppercase", job.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400")}>{job.active ? 'Sincronizando' : 'Pausado'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden md:block">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Último Ciclo</p>
                                    <p className="text-xs font-medium text-slate-700">{job.lastSync ? new Date(job.lastSync).toLocaleString() : 'Nunca'}</p>
                                </div>
                                <button onClick={() => onDeleteJob(job.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'company' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Empresas do Grupo</h3>
                    <button onClick={() => setEditingCompany({ legalName: '', cnpj: '', productTypes: [] })} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16}/> Adicionar Empresa</button>
                </div>
                <div className="p-6">
                    {isLoadingCompanies ? <Loader2 className="animate-spin mx-auto text-teal-600" /> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {companies.map(c => (
                                <div key={c.id} className="p-4 border rounded-xl flex justify-between items-start hover:border-teal-300 transition-all bg-slate-50/50">
                                    <div>
                                        <h4 className="font-bold text-slate-800 uppercase tracking-tight">{c.legalName}</h4>
                                        <p className="text-xs text-slate-500 font-mono mb-2">CNPJ: {c.cnpj}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {(c.productTypes || []).map(t => <span key={t} className="px-1.5 py-0.5 bg-white border text-[9px] font-bold text-teal-600 rounded">{t}</span>)}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => setEditingCompany(c)} className="p-1.5 text-slate-400 hover:text-teal-600"><Edit2 size={14}/></button>
                                        <button onClick={async () => { if(window.confirm('Excluir?')) { await appBackend.deleteCompany(c.id); fetchCompanies(); } }} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {editingCompany && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                            <h3 className="font-bold text-lg mb-4">{editingCompany.id ? 'Editar' : 'Nova'} Empresa</h3>
                            <div className="space-y-4">
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">RAZÃO SOCIAL</label><input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" value={editingCompany.legalName} onChange={e => setEditingCompany({...editingCompany, legalName: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">CNPJ</label><input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" value={editingCompany.cnpj} onChange={e => setEditingCompany({...editingCompany, cnpj: e.target.value})} /></div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">TIPOS DE PRODUTOS VINCULADOS</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Digital', 'Presencial', 'Evento'].map(type => (
                                            <button key={type} onClick={() => {
                                                const current = editingCompany.productTypes || [];
                                                setEditingCompany({ ...editingCompany, productTypes: current.includes(type) ? current.filter(t => t !== type) : [...current, type] });
                                            }} className={clsx("px-3 py-1 rounded-full text-[10px] font-bold border transition-all", editingCompany.productTypes?.includes(type) ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-500")}>{type}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setEditingCompany(null)} className="px-4 py-2 text-sm text-slate-500">Cancelar</button>
                                <button onClick={async () => { await appBackend.saveCompany(editingCompany as any); setEditingCompany(null); fetchCompanies(); }} className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold text-sm">Salvar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'roles' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Perfis de Acesso</h3>
                    <button onClick={() => setEditingRole({ id: '', name: '', permissions: {} })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16}/> Novo Perfil</button>
                </div>
                <div className="p-6">
                    {isLoadingRoles ? <Loader2 className="animate-spin mx-auto text-indigo-600" /> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {roles.map(role => (
                                <div key={role.id} className="p-5 border-2 border-slate-100 rounded-2xl flex flex-col hover:border-indigo-200 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><ShieldCheck size={24}/></div>
                                        <div className="flex gap-1">
                                            <button onClick={() => setEditingRole(role)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                            <button onClick={async () => { if(window.confirm('Excluir perfil?')) { await appBackend.deleteRole(role.id); fetchRoles(); } }} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-slate-800 mb-1">{role.name}</h4>
                                    <p className="text-xs text-slate-400">{Object.values(role.permissions).filter(v => v).length} permissões ativas</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {editingRole && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-8 flex flex-col max-h-[90vh]">
                            <h3 className="font-black text-2xl text-slate-800 mb-6 flex items-center gap-2"><Lock size={24} className="text-indigo-600"/> {editingRole.id ? 'Editar' : 'Criar'} Perfil de Acesso</h3>
                            <div className="mb-6"><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Nome do Cargo / Perfil</label><input type="text" className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-lg font-bold focus:border-indigo-500 outline-none" value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} placeholder="Ex: Vendedor Sênior, Supervisor Financeiro..." /></div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2"><label className="block text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest">Módulos do Sistema</label><div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">{MODULES.map(m => (
                                <label key={m.id} className={clsx("flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all", editingRole.permissions[m.id] ? "bg-indigo-50 border-indigo-500" : "bg-white border-slate-100 hover:border-slate-200")}><span className={clsx("text-sm font-bold", editingRole.permissions[m.id] ? "text-indigo-800" : "text-slate-500")}>{m.label}</span><input type="checkbox" className="w-6 h-6 rounded text-indigo-600" checked={editingRole.permissions[m.id] || false} onChange={e => setEditingRole({...editingRole, permissions: {...editingRole.permissions, [m.id]: e.target.checked}})} /></label>
                            ))}</div></div>
                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t"><button onClick={() => setEditingRole(null)} className="px-6 py-3 text-slate-500 font-bold">Cancelar</button><button onClick={async () => { await appBackend.saveRole(editingRole); setEditingRole(null); fetchRoles(); }} className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-black shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Salvar Perfil de Acesso</button></div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'banners' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Publicidade Interna (Banners)</h3>
                    <button onClick={() => setEditingBanner({ title: '', imageUrl: '', linkUrl: '', targetAudience: 'student', active: true })} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16}/> Novo Banner</button>
                </div>
                <div className="p-6">
                    {isLoadingBanners ? <Loader2 className="animate-spin mx-auto text-orange-600" /> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {banners.map(b => (
                                <div key={b.id} className="group border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all relative">
                                    <div className="h-40 bg-slate-100"><img src={b.imageUrl} className="w-full h-full object-cover" /></div>
                                    <div className="p-4 flex justify-between items-center bg-white">
                                        <div><h4 className="font-bold text-slate-800 text-sm">{b.title}</h4><span className="text-[10px] font-bold text-slate-400 uppercase">{b.targetAudience === 'student' ? 'Portal Aluno' : 'Portal Instrutor'}</span></div>
                                        <div className="flex gap-2"><button onClick={() => setEditingBanner(b)} className="p-1.5 text-slate-400 hover:text-orange-600"><Edit2 size={16}/></button><button onClick={async () => { if(window.confirm('Excluir?')) { await appBackend.deleteBanner(b.id); fetchBanners(); } }} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button></div>
                                    </div>
                                    <div className={clsx("absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold border", b.active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-400 border-slate-200")}>{b.active ? 'ATIVO' : 'OCULTO'}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {editingBanner && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
                            <h3 className="font-bold text-lg mb-4">Gerenciar Banner</h3>
                            <div className="space-y-4">
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">TÍTULO INTERNO</label><input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" value={editingBanner.title} onChange={e => setEditingBanner({...editingBanner, title: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">URL DA IMAGEM (Retangular)</label><input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" value={editingBanner.imageUrl} onChange={e => setEditingBanner({...editingBanner, imageUrl: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">LINK DE DESTINO (Opcional)</label><input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" value={editingBanner.linkUrl} onChange={e => setEditingBanner({...editingBanner, linkUrl: e.target.value})} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">PÚBLICO-ALVO</label><select className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={editingBanner.targetAudience} onChange={e => setEditingBanner({...editingBanner, targetAudience: e.target.value as any})}><option value="student">Portal Aluno</option><option value="instructor">Portal Instrutor</option></select></div>
                                    <div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg w-full justify-center"><input type="checkbox" checked={editingBanner.active} onChange={e => setEditingBanner({...editingBanner, active: e.target.checked})} /><span className="text-xs font-bold">Banner Ativo?</span></label></div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6 pt-4 border-t"><button onClick={() => setEditingBanner(null)} className="px-4 py-2 text-sm text-slate-500 font-bold">Cancelar</button><button onClick={async () => { await appBackend.saveBanner(editingBanner as Banner); setEditingBanner(null); fetchBanners(); }} className="bg-orange-600 text-white px-8 py-2 rounded-lg font-bold text-sm">Salvar Banner</button></div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'instructor_levels' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Níveis e Honorários (Professores)</h3>
                    <button onClick={() => setEditingLevel({ name: '', honorarium: 0, observations: '' })} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-purple-700"><Plus size={16}/> Novo Nível</button>
                </div>
                <div className="p-6">
                    {isLoadingLevels ? <Loader2 className="animate-spin mx-auto text-purple-600" /> : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {instructorLevels.map(level => (
                                <div key={level.id} className="p-4 border rounded-xl bg-purple-50/30 border-purple-100 flex flex-col justify-between group hover:border-purple-300 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-purple-900 uppercase tracking-tight">{level.name}</h4>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingLevel(level)} className="p-1 text-purple-400 hover:text-purple-600"><Edit2 size={12}/></button>
                                            <button onClick={async () => { if(window.confirm('Excluir?')) { await appBackend.deleteInstructorLevel(level.id); fetchInstructorLevels(); } }} className="p-1 text-purple-400 hover:text-red-600"><Trash2 size={12}/></button>
                                        </div>
                                    </div>
                                    <p className="text-xl font-black text-purple-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(level.honorarium)}</p>
                                    <p className="text-[10px] text-slate-400 mt-2 truncate">{level.observations || 'Sem observações'}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {editingLevel && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-sm p-6">
                            <h3 className="font-bold text-lg mb-4">Configurar Nível</h3>
                            <div className="space-y-4">
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">NOME DO NÍVEL</label><input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" value={editingLevel.name} onChange={e => setEditingLevel({...editingLevel, name: e.target.value})} placeholder="Ex: Nível 1, Instrutor Sênior..." /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">VALOR DO HONORÁRIO (R$)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm font-bold" value={editingLevel.honorarium} onChange={e => setEditingLevel({...editingLevel, honorarium: Number(e.target.value)})} /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">OBSERVAÇÕES</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm h-20 resize-none" value={editingLevel.observations} onChange={e => setEditingLevel({...editingLevel, observations: e.target.value})} /></div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6"><button onClick={() => setEditingLevel(null)} className="px-4 py-2 text-sm text-slate-500">Cancelar</button><button onClick={async () => { await appBackend.saveInstructorLevel(editingLevel as any); setEditingLevel(null); fetchInstructorLevels(); }} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold text-sm">Salvar Nível</button></div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'logs' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[700px]">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Log de Atividades</h3>
                        <p className="text-sm text-slate-500">Histórico de alterações e auditoria do sistema.</p>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input type="text" className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white" placeholder="Buscar no log..." value={logSearch} onChange={e => setLogSearch(e.target.value)} />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isLoadingLogs ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></div> : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm"><tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b"><th className="px-6 py-3">Horário</th><th className="px-6 py-3">Usuário</th><th className="px-6 py-3">Ação</th><th className="px-6 py-3">Módulo</th><th className="px-6 py-3">Detalhes</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-[11px] font-mono text-slate-400">{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{log.userName}</td>
                                        <td className="px-6 py-4">
                                            <span className={clsx("px-2 py-0.5 rounded text-[9px] font-black uppercase border", log.action === 'create' ? "bg-green-50 text-green-700 border-green-100" : log.action === 'delete' ? "bg-red-50 text-red-700 border-red-100" : log.action === 'login' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-amber-50 text-amber-700 border-amber-100")}>{log.action}</span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-600 uppercase text-[10px]">{log.module}</td>
                                        <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title={log.details}>{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'database' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex items-center gap-3 mb-4"><Database className="text-amber-600" /><h3 className="text-lg font-bold text-slate-800">Manutenção de Tabelas e Colunas</h3></div>
                <p className="text-sm text-slate-500 mb-6">Script de reparo para resolver erros de "colunas ausentes".</p>
                {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm hover:bg-slate-800 transition-all">Gerar Script de Correção</button> : (
                    <div className="relative animate-in slide-in-from-top-4">
                        <pre className="bg-black text-amber-400 p-4 rounded-lg text-[10px] font-mono overflow-auto max-h-[400px] border border-amber-900/50 leading-relaxed">{generateRepairSQL()}</pre>
                        <button onClick={copySql} className="absolute top-2 right-2 bg-slate-700 text-white px-3 py-1 rounded text-xs hover:bg-slate-600 transition-colors shadow-lg">{sqlCopied ? 'Copiado!' : 'Copiar SQL'}</button>
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};

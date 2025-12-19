
import React, { useState, useEffect } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, 
    Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Layout, ExternalLink, Trash2, BarChart3, Building2, Plus, Edit2,
    Monitor, Globe, Target, Info, Shield, TrendingUp, DollarSign,
    Loader2, Package, Tag, Layers, Palette, History, Clock, User, Search,
    Play, Pause, Calendar
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

  const [roles, setRoles] = useState<UserRole[]>([]);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [newBanner, setNewBanner] = useState<Partial<Banner>>({ title: '', linkUrl: '', targetAudience: 'student', active: true, imageUrl: '' });
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
-- SCRIPT DE REPARO COMPLETO DO BANCO DE DADOS VOLL CRM

-- 1. TABELA DE CONFIGURAÇÕES
CREATE TABLE IF NOT EXISTS public.app_settings (key text PRIMARY KEY, value jsonb, updated_at timestamptz DEFAULT now());

-- 2. TABELA DE CONEXÕES
CREATE TABLE IF NOT EXISTS public.crm_sync_jobs (id uuid PRIMARY KEY, user_id uuid, name text, sheet_url text, config jsonb, active boolean DEFAULT true, interval_minutes int DEFAULT 5, last_sync timestamptz, status text, last_message text, created_by_name text, created_at timestamptz DEFAULT now());

-- 3. TABELA DE LOGS
CREATE TABLE IF NOT EXISTS public.crm_activity_logs (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_name text NOT NULL, action text NOT NULL, module text NOT NULL, details text, record_id text, created_at timestamptz DEFAULT now());

-- 4. TABELA DE CERTIFICADOS E REPARO DE COLUNAS DE IMAGEM
CREATE TABLE IF NOT EXISTS public.crm_certificates (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), title text NOT NULL, background_base_64 text, back_background_base_64 text, linked_product_id text, body_text text, layout_config jsonb);
ALTER TABLE public.crm_certificates ADD COLUMN IF NOT EXISTS background_base_64 text;
ALTER TABLE public.crm_certificates ADD COLUMN IF NOT EXISTS back_background_base_64 text;

-- 5. TABELA DE COLABORADORES (VERSÃO COMPLETA)
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

-- 6. TABELA DE FRANQUIAS E REPARO DE TIPAGEM
CREATE TABLE IF NOT EXISTS public.crm_franchises (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_number text, contract_start_date date, inauguration_date date, sales_consultant text, franchisee_name text, cpf text, company_name text, cnpj text,
    phone text, email text, residential_address text, commercial_state text, commercial_city text, commercial_address text, commercial_neighborhood text,
    latitude numeric, longitude numeric, km_street_point numeric, km_commercial_building numeric, studio_status text, studio_size_m2 text,
    equipment_list text, royalties_value text, bank_account_info text, has_signed_contract boolean DEFAULT false, contract_end_date date,
    is_representative boolean DEFAULT false, partner_1_name text, partner_2_name text, franchisee_folder_link text, path_info text, observations text,
    created_at timestamptz DEFAULT now()
);

-- 7. TABELAS DE APOIO
CREATE TABLE IF NOT EXISTS public.crm_roles (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, permissions jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.crm_instructor_levels (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, honorarium numeric DEFAULT 0, observations text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.crm_companies (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, legal_name text, cnpj text, product_types jsonb DEFAULT '[]'::jsonb, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.app_banners (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, title text, image_url text, link_url text, target_audience text, active boolean DEFAULT true, created_at timestamptz DEFAULT now());

-- 8. HABILITAR SEGURANÇA BÁSICA (RLS)
ALTER TABLE public.crm_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total" ON public.crm_certificates FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.crm_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total" ON public.crm_collaborators FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.crm_franchises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total" ON public.crm_franchises FOR ALL USING (true) WITH CHECK (true);

-- NOTIFICAR O SUPABASE DA MUDANÇA DE SCHEMA
NOTIFY pgrst, 'reload config';
  `.trim();

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };

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
        {activeTab === 'database' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex items-center gap-3 mb-4"><Database className="text-amber-600" /><h3 className="text-lg font-bold text-slate-800">Manutenção de Tabelas e Colunas</h3></div>
                <p className="text-sm text-slate-500 mb-6">Se você encontrar erros de "colunas ausentes", copie o script abaixo e execute-o no Editor de SQL do seu painel Supabase. Ele corrigirá automaticamente o schema sem apagar seus dados.</p>
                {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm hover:bg-slate-800 transition-all">Gerar Script de Correção</button> : (
                    <div className="relative animate-in slide-in-from-top-4">
                        <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-[10px] font-mono overflow-auto max-h-[400px] border border-amber-900/50">{generateRepairSQL()}</pre>
                        <button onClick={copySql} className="absolute top-2 right-2 bg-slate-700 text-white px-3 py-1 rounded text-xs hover:bg-slate-600 transition-colors shadow-lg">{sqlCopied ? 'Copiado!' : 'Copiar SQL'}</button>
                    </div>
                )}
            </div>
        )}

        {/* ... Resto das abas mantidas como antes ... */}
        {activeTab === 'visual' && (
            <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-8 space-y-6">
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
                            <input 
                                type="number" 
                                className="w-24 px-4 py-2 border rounded-lg font-bold text-slate-800"
                                value={securityMargin}
                                onChange={(e) => setSecurityMargin(parseInt(e.target.value) || 0)}
                                min="0"
                            />
                            <p className="text-xs text-slate-400">
                                O alerta "Necessita Remessa" será ativado se o saldo projetado do studio for menor que este valor.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button onClick={handleSaveGlobal} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-2.5 rounded-xl font-bold shadow-lg shadow-teal-600/20 transition-all flex items-center gap-2">
                        {isSaved ? <><CheckCircle size={18}/> Salvo!</> : <><Save size={18}/> Salvar Todas as Configurações</>}
                    </button>
                </div>
            </div>
        )}

        {/* ... Outras abas (Connections, Company, Roles, Banners, Levels, Logs) mantidas para brevidade ... */}
      </div>
    </div>
  );
};

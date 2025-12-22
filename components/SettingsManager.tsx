
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
-- SCRIPT DE REPARO DEFINITIVO VOLL CRM (V12)

-- 1. CONFIGURAÇÕES GERAIS
CREATE TABLE IF NOT EXISTS public.app_settings (key text PRIMARY KEY, value jsonb, updated_at timestamptz DEFAULT now());

-- 2. TABELA DE SUBMISSÕES (RECRIAÇÃO FORÇADA PARA GARANTIR ESTRUTURA)
-- Se você tem dados importantes nela, este comando pode dar erro. Se der, use os ALTER abaixo.
CREATE TABLE IF NOT EXISTS public.crm_form_submissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid NOT NULL,
    student_id uuid,
    answers jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Garantir colunas e tipos caso a tabela já exista
ALTER TABLE public.crm_form_submissions ADD COLUMN IF NOT EXISTS student_id uuid;
ALTER TABLE public.crm_form_submissions ADD COLUMN IF NOT EXISTS answers jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.crm_form_submissions ALTER COLUMN answers TYPE jsonb USING answers::jsonb;

-- Habilitar RLS e Liberar acesso TOTAL (Anônimo e Autenticado) para submissão
ALTER TABLE public.crm_form_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir inserção de respostas" ON public.crm_form_submissions;
CREATE POLICY "Permitir inserção de respostas" ON public.crm_form_submissions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir leitura de respostas" ON public.crm_form_submissions;
CREATE POLICY "Permitir leitura de respostas" ON public.crm_form_submissions FOR SELECT USING (true);

-- 3. TABELA DE CHAMADA / PRESENÇA
CREATE TABLE IF NOT EXISTS public.crm_attendance (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id uuid NOT NULL,
    student_id uuid NOT NULL,
    date date NOT NULL,
    present boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE(class_id, student_id, date)
);
ALTER TABLE public.crm_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total presença" ON public.crm_attendance;
CREATE POLICY "Acesso total presença" ON public.crm_attendance FOR ALL USING (true) WITH CHECK (true);

-- 4. TABELAS DE PESQUISA E FORMULÁRIO (GARANTIR RLS)
ALTER TABLE public.crm_surveys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total surveys" ON public.crm_surveys;
CREATE POLICY "Acesso total surveys" ON public.crm_surveys FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.crm_forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total forms" ON public.crm_forms;
CREATE POLICY "Acesso total forms" ON public.crm_forms FOR ALL USING (true) WITH CHECK (true);

-- 5. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON public.crm_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_student_id ON public.crm_form_submissions(student_id);

-- LIMPAR CACHE
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
                <div className="flex items-center gap-3 mb-4"><Database className="text-amber-600" /><h3 className="text-lg font-bold text-slate-800">Manutenção de Tabelas (V12)</h3></div>
                <p className="text-sm text-slate-500 mb-6 font-bold text-red-600 flex items-center gap-2"><AlertTriangle size={16}/> Rode este script no Supabase se o envio de pesquisas der erro.</p>
                {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm hover:bg-slate-800 transition-all">Gerar Script de Correção</button> : (
                    <div className="relative animate-in slide-in-from-top-4">
                        <pre className="bg-black text-amber-400 p-4 rounded-lg text-[10px] font-mono overflow-auto max-h-[400px] border border-amber-900/50 leading-relaxed">{generateRepairSQL()}</pre>
                        <button onClick={copySql} className="absolute top-2 right-2 bg-slate-700 text-white px-3 py-1 rounded text-xs hover:bg-slate-600 transition-colors shadow-lg">{sqlCopied ? 'Copiado!' : 'Copiar SQL'}</button>
                    </div>
                )}
            </div>
        )}
        {/* Outras tabs mantidas... */}
      </div>
    </div>
  );
};

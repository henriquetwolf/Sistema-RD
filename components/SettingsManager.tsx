
import React, { useState, useEffect, useRef } from 'react';
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

  useEffect(() => {
    const fetchGlobalSettings = async () => {
        const margin = await appBackend.getInventorySecurityMargin();
        setSecurityMargin(margin);
        const logo = await appBackend.getAppLogo();
        setPreview(logo);
    };
    fetchGlobalSettings();
  }, []);

  const handleSaveGlobal = async () => {
    if (preview) { await appBackend.saveAppLogo(preview); onLogoChange(preview); }
    await appBackend.saveInventorySecurityMargin(securityMargin);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const generateRepairSQL = () => `
-- SCRIPT DE FUNDAÇÃO CRM V58 (Estoque, Formulários e Pesquisas)
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
    type text DEFAULT 'form', -- 'form' ou 'survey'
    created_at timestamp with time zone DEFAULT now()
);

-- Garantir coluna 'type' e outras necessárias em crm_forms caso a tabela já exista
ALTER TABLE IF EXISTS public.crm_forms ADD COLUMN IF NOT EXISTS type text DEFAULT 'form';
ALTER TABLE IF EXISTS public.crm_forms ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'all';
ALTER TABLE IF EXISTS public.crm_forms ADD COLUMN IF NOT EXISTS only_if_finished boolean DEFAULT false;
ALTER TABLE IF EXISTS public.crm_forms ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Garantir que a exclusão de formulário apague as respostas (CASCADE)
ALTER TABLE IF EXISTS public.crm_form_submissions DROP CONSTRAINT IF EXISTS crm_form_submissions_form_id_fkey;
ALTER TABLE IF EXISTS public.crm_form_submissions ADD CONSTRAINT crm_form_submissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES crm_forms(id) ON DELETE CASCADE;

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

-- Garantir coluna type em crm_form_folders
ALTER TABLE IF EXISTS public.crm_form_folders ADD COLUMN IF NOT EXISTS type text DEFAULT 'form';

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

        {activeTab === 'sql_script' && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-8 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4"><Terminal className="text-red-500" /><h3 className="text-lg font-bold text-white uppercase tracking-widest">Script SQL de Atualização V58</h3></div>
                <p className="text-sm text-slate-400 mb-6 font-medium leading-relaxed">Este script repara a estrutura do banco de dados e ativa o cascatamento de exclusões. Copie e execute no **SQL Editor** do Supabase.</p>
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
                    <p className="text-[10px] text-red-200 leading-snug uppercase font-black">CUIDADO: Este script forçará a exclusão automática de respostas caso o formulário pai seja deletado.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

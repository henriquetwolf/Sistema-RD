
import React, { useState, useEffect } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, 
    Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Layout, ExternalLink, Trash2, BarChart3, Building2, Plus, Edit2,
    Monitor, Globe, Target, Info, Shield, TrendingUp, DollarSign,
    Loader2, Package, Tag, Layers, Palette
} from 'lucide-react';
import { appBackend, CompanySetting } from '../services/appBackend';
import { Role, Role as UserRole, Banner, InstructorLevel } from '../types';
import clsx from 'clsx';

interface SettingsManagerProps {
  onLogoChange: (newLogo: string | null) => void;
  currentLogo: string | null;
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
    { id: 'tables', label: 'Dados Brutos' },
    { id: 'settings', label: 'Conexões' },
    { id: 'global_settings', label: 'Configurações' },
];

const PRODUCT_TYPES = ['Presencial', 'Digital', 'Evento'];

export const SettingsManager: React.FC<SettingsManagerProps> = ({ onLogoChange, currentLogo }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'company' | 'roles' | 'database' | 'banners' | 'instructor_levels'>('visual');
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

  useEffect(() => {
      fetchGlobalSettings();
      if (activeTab === 'roles') fetchRoles();
      else if (activeTab === 'banners') fetchBanners();
      else if (activeTab === 'company') fetchCompanies();
      else if (activeTab === 'instructor_levels') fetchInstructorLevels();
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
    try { const data = await appBackend.getInstructorLevels(); setInstructorLevels(data); } catch(e) { console.error(e); } finally { setIsLoadingLevels(false); }
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
-- TABELA DE CONFIGURAÇÕES GLOBAIS (SINCRONIZADA)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key text PRIMARY KEY,
    value jsonb,
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- TABELA DE CONEXÕES (SYNC JOBS) - ESSENCIAL PARA CROSS-DEVICE SYNC
CREATE TABLE IF NOT EXISTS public.crm_sync_jobs (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    name text,
    sheet_url text,
    config jsonb,
    active boolean DEFAULT true,
    interval_minutes int DEFAULT 5,
    last_sync timestamptz,
    status text,
    last_message text,
    created_by_name text,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.crm_sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total sync_jobs" ON public.crm_sync_jobs FOR ALL USING (true) WITH CHECK (true);

-- CRM PRESETS (CREDENCIAS DE BANCOS EXTERNOS)
CREATE TABLE IF NOT EXISTS public.app_presets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    name text NOT NULL,
    project_url text NOT NULL,
    api_key text NOT NULL,
    target_table_name text NOT NULL,
    target_primary_key text,
    interval_minutes int DEFAULT 5,
    created_by_name text,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.app_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total presets" ON public.app_presets FOR ALL USING (true) WITH CHECK (true);

-- CRM CERTIFICATES (MODELOS)
CREATE TABLE IF NOT EXISTS public.crm_certificates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    title text NOT NULL,
    background_base_64 text,
    back_background_base_64 text,
    linked_product_id text,
    body_text text,
    layout_config jsonb
);
ALTER TABLE public.crm_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total certificates" ON public.crm_certificates FOR ALL USING (true) WITH CHECK (true);

-- CRM ROLES
CREATE TABLE IF NOT EXISTS public.crm_roles (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), name text NOT NULL, permissions jsonb DEFAULT '{}'::jsonb);
ALTER TABLE public.crm_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total roles" ON public.crm_roles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.crm_roles(id);
ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS password text;

ALTER TABLE public.crm_partner_studios ADD COLUMN IF NOT EXISTS password text;

CREATE TABLE IF NOT EXISTS public.app_banners (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), title text, image_url text, link_url text, target_audience text CHECK (target_audience IN ('student', 'instructor')), active boolean DEFAULT true);
ALTER TABLE public.app_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total banners" ON public.app_banners FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.crm_companies (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, legal_name text, cnpj text, product_types jsonb DEFAULT '[]'::jsonb, created_at timestamptz DEFAULT now());
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total companies" ON public.crm_companies FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.crm_instructor_levels (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), name text NOT NULL, honorarium numeric DEFAULT 0, observations text);
ALTER TABLE public.crm_instructor_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total instructor_levels" ON public.crm_instructor_levels FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.crm_inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  type text CHECK (type IN ('entry', 'exit')),
  item_apostila_nova int DEFAULT 0,
  item_apostila_classico int DEFAULT 0,
  item_sacochila int DEFAULT 0,
  item_lapis int DEFAULT 0,
  registration_date date DEFAULT now(),
  studio_id uuid REFERENCES public.crm_partner_studios(id) ON DELETE SET NULL,
  tracking_code text,
  observations text,
  conference_date date,
  attachments text
);
ALTER TABLE public.crm_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total inventory" ON public.crm_inventory FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload config';
  `.trim();

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Configurações do Systema</h2>
            <p className="text-slate-500 text-sm">Personalize acessos, identidade e banco de dados.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto shrink-0 max-w-full">
            <button onClick={() => setActiveTab('visual')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'visual' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Geral</button>
            <button onClick={() => setActiveTab('company')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'company' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Empresas</button>
            <button onClick={() => setActiveTab('roles')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'roles' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Acessos</button>
            <button onClick={() => setActiveTab('banners')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'banners' ? "bg-white text-orange-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Banners</button>
            <button onClick={() => setActiveTab('instructor_levels')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'instructor_levels' ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Níveis</button>
            <button onClick={() => setActiveTab('database')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'database' ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Banco de Dados</button>
        </div>
      </div>
      
      <div className="max-w-5xl space-y-8">
        {/* TAB: GERAL (IDENTIDADE + ESTOQUE) */}
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

        {/* TAB: EMPRESAS DE FATURAMENTO */}
        {activeTab === 'company' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Building2 size={20} className="text-teal-600"/> Empresas de Faturamento</h3>
                    <button onClick={() => setEditingCompany({ legalName: '', cnpj: '', productTypes: [] })} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"><Plus size={16} /> Nova Empresa</button>
                </div>
                {editingCompany ? (
                    <div className="space-y-6 animate-in fade-in bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Razão Social</label><input type="text" className="w-full px-4 py-2 border rounded-lg" value={editingCompany.legalName} onChange={(e) => setEditingCompany({ ...editingCompany, legalName: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">CNPJ</label><input type="text" className="w-full px-4 py-2 border rounded-lg" value={editingCompany.cnpj} onChange={(e) => setEditingCompany({ ...editingCompany, cnpj: e.target.value })} /></div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Vincular a Tipos de Produto</label>
                            <div className="flex flex-wrap gap-3">
                                {PRODUCT_TYPES.map(type => (
                                    <label key={type} className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all", editingCompany.productTypes?.includes(type) ? "bg-teal-50 border-teal-500 text-teal-700" : "bg-white border-slate-200")}>
                                        <input type="checkbox" className="hidden" checked={editingCompany.productTypes?.includes(type)} onChange={() => { const current = editingCompany.productTypes || []; const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type]; setEditingCompany({ ...editingCompany, productTypes: next }); }} />
                                        <span className="text-xs font-bold">{type}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200"><button onClick={() => setEditingCompany(null)} className="px-6 py-2 text-slate-600 font-medium">Cancelar</button><button onClick={async () => { await appBackend.saveCompany(editingCompany as CompanySetting); fetchCompanies(); setEditingCompany(null); }} className="bg-teal-600 text-white px-8 py-2 rounded-lg font-bold shadow-sm">Salvar Empresa</button></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isLoadingCompanies ? <Loader2 className="animate-spin mx-auto col-span-2 text-teal-600" /> : companies.map(c => (
                            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-800 truncate pr-2">{c.legalName}</h4>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingCompany(c)} className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                        <button onClick={async () => { if(window.confirm('Excluir empresa?')) { await appBackend.deleteCompany(c.id); fetchCompanies(); } }} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <p className="text-xs font-mono text-slate-500 mb-3">{c.cnpj}</p>
                                <div className="flex flex-wrap gap-1">
                                    {c.productTypes.map(t => <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">{t}</span>)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* TAB: ACESSOS (PERMISSÕES) */}
        {activeTab === 'roles' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Shield size={20} className="text-indigo-600" /> Tipos de Usuário (Permissões)</h3>
                    <button onClick={() => setEditingRole({ id: '', name: '', permissions: {} })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"><Plus size={16} /> Novo Perfil</button>
                </div>
                {editingRole ? (
                    <div className="space-y-6 animate-in fade-in bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <div className="max-w-xl"><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Nome do Cargo</label><input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editingRole.name} onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })} /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {MODULES.map(m => (
                                <label key={m.id} className={clsx("flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all", editingRole.permissions?.[m.id] ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200")}>
                                    <span className="text-sm font-medium">{m.label}</span>
                                    <input type="checkbox" className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" checked={!!editingRole.permissions?.[m.id]} onChange={() => { const current = editingRole.permissions || {}; setEditingRole({ ...editingRole, permissions: { ...current, [m.id]: !current[m.id] } }); }} />
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200"><button onClick={() => setEditingRole(null)} className="px-6 py-2 text-slate-600 font-medium">Cancelar</button><button onClick={async () => { await appBackend.saveRole(editingRole); fetchRoles(); setEditingRole(null); }} className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold shadow-sm">Salvar Perfil</button></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {isLoadingRoles ? <Loader2 className="animate-spin mx-auto col-span-3 text-indigo-600" /> : roles.map(r => (
                            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all group">
                                <div><h4 className="font-bold text-slate-800">{r.name}</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{Object.values(r.permissions || {}).filter(v => v).length} módulos liberados</p></div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingRole(r)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"><Edit2 size={16} /></button>
                                    <button onClick={async () => { if(window.confirm('Excluir este perfil de acesso?')) { await appBackend.deleteRole(r.id); fetchRoles(); } }} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* TAB: BANNERS INFORMATIVOS */}
        {activeTab === 'banners' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ImageIcon size={20} className="text-orange-600" /> Banners Informativos</h3>
                    <button onClick={() => { setNewBanner({ title: '', imageUrl: '', linkUrl: '', targetAudience: 'student', active: true }); setIsBannerModalOpen(true); }} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"><Plus size={16} /> Novo Banner</button>
                </div>
                {isLoadingBanners ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-600" /></div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {banners.map(banner => (
                            <div key={banner.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all flex flex-col group">
                                <div className="h-32 bg-slate-100 relative">
                                    <img src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                        <button onClick={() => { setNewBanner(banner); setIsBannerModalOpen(true); }} className="p-2 bg-white text-slate-700 rounded-full hover:bg-slate-100"><Edit2 size={16}/></button>
                                        <button onClick={async () => { if(window.confirm('Excluir banner?')) { await appBackend.deleteBanner(banner.id); fetchBanners(); } }} className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <div className="p-4 flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-slate-800 truncate">{banner.title}</h4>
                                        <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase", banner.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>{banner.active ? 'Ativo' : 'Pausa'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                                        <span className={clsx("px-2 py-0.5 rounded border", banner.targetAudience === 'student' ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-orange-50 text-orange-700 border-orange-100")}>
                                            Para: {banner.targetAudience === 'student' ? 'Aluno' : 'Instrutor'}
                                        </span>
                                        {banner.linkUrl && <span className="text-slate-400 flex items-center gap-1"><ExternalLink size={10} /> Link Vinculado</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* TAB: NÍVEIS DE INSTRUTOR */}
        {activeTab === 'instructor_levels' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Target size={20} className="text-purple-600" /> Níveis de Instrutor e Honorários</h3>
                    <button onClick={() => setEditingLevel({ name: '', honorarium: 0, observations: '' })} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"><Plus size={16} /> Novo Nível</button>
                </div>
                {editingLevel ? (
                    <div className="space-y-6 animate-in fade-in bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Nome do Nível</label><input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={editingLevel.name} onChange={(e) => setEditingLevel({ ...editingLevel, name: e.target.value })} placeholder="Ex: Nível 1, Especialista..." /></div>
                            <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Honorário Base (R$)</label><input type="number" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={editingLevel.honorarium} onChange={(e) => setEditingLevel({ ...editingLevel, honorarium: parseFloat(e.target.value) })} /></div>
                        </div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Requisitos / Observações</label><textarea className="w-full px-4 py-2 border rounded-lg h-24 focus:ring-2 focus:ring-purple-500 outline-none resize-none" value={editingLevel.observations} onChange={(e) => setEditingLevel({ ...editingLevel, observations: e.target.value })}></textarea></div>
                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200"><button onClick={() => setEditingLevel(null)} className="px-6 py-2 text-slate-600 font-medium">Cancelar</button><button onClick={async () => { await appBackend.saveInstructorLevel(editingLevel as InstructorLevel); fetchInstructorLevels(); setEditingLevel(null); }} className="bg-purple-600 text-white px-8 py-2 rounded-lg font-bold shadow-sm">Salvar Nível</button></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {isLoadingLevels ? <Loader2 className="animate-spin mx-auto col-span-3 text-purple-600" /> : instructorLevels.map(level => (
                            <div key={level.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-800">{level.name}</h4>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingLevel(level)} className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg"><Edit2 size={16} /></button>
                                        <button onClick={async () => { if(window.confirm('Excluir este nível?')) { await appBackend.deleteInstructorLevel(level.id); fetchInstructorLevels(); } }} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <p className="text-xl font-black text-purple-700 mb-2">{formatCurrency(level.honorarium)}</p>
                                <p className="text-[10px] text-slate-400 line-clamp-2 italic">{level.observations || 'Sem observações.'}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* TAB: BANCO DE DADOS E MANUTENÇÃO */}
        {activeTab === 'database' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex items-center gap-3 mb-4"><Database className="text-amber-600" /><h3 className="text-lg font-bold text-slate-800">Manutenção de Tabelas</h3></div>
                <p className="text-sm text-slate-500 mb-6">Use o script abaixo no editor de SQL do seu painel Supabase para habilitar novos módulos (como Estoque, Banners, Acessos) e corrigir o schema do banco.</p>
                {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm hover:bg-slate-800 transition-all">Gerar Script de Atualização</button> : (
                    <div className="relative animate-in slide-in-from-top-4">
                        <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-[10px] font-mono overflow-auto max-h-[400px] border border-amber-900/50">{generateRepairSQL()}</pre>
                        <button onClick={copySql} className="absolute top-2 right-2 bg-slate-700 text-white px-3 py-1 rounded text-xs hover:bg-slate-600 transition-colors shadow-lg">{sqlCopied ? 'Copiado!' : 'Copiar SQL'}</button>
                    </div>
                )}
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                    <p className="text-xs text-amber-800">
                        <strong>Cuidado:</strong> Execute este script apenas se notar erros de banco de dados ou colunas ausentes. O script usa <code>CREATE TABLE IF NOT EXISTS</code> e <code>ADD COLUMN IF NOT EXISTS</code> para garantir que seus dados atuais sejam preservados.
                    </p>
                </div>
            </div>
        )}
      </div>

      {/* MODAL: NOVO/EDITAR BANNER */}
      {isBannerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><ImageIcon size={20} className="text-orange-600" /> Configurar Banner</h3>
                      <button onClick={() => setIsBannerModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Título/Identificação</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={newBanner.title} onChange={e => setNewBanner({...newBanner, title: e.target.value})} placeholder="Ex: Aviso Lançamento Curso" /></div>
                      <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">URL da Imagem</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={newBanner.imageUrl} onChange={e => setNewBanner({...newBanner, imageUrl: e.target.value})} placeholder="https://..." /></div>
                      <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Link de Redirecionamento (Opcional)</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={newBanner.linkUrl} onChange={e => setNewBanner({...newBanner, linkUrl: e.target.value})} placeholder="https://..." /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Público-Alvo</label>
                              <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={newBanner.targetAudience} onChange={e => setNewBanner({...newBanner, targetAudience: e.target.value as any})}>
                                  <option value="student">Alunos</option>
                                  <option value="instructor">Instrutores</option>
                              </select>
                          </div>
                          <div className="flex items-end pb-1">
                              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={newBanner.active} onChange={e => setNewBanner({...newBanner, active: e.target.checked})} className="rounded text-orange-600" /><span className="text-sm text-slate-700 font-bold">Ativo?</span></label>
                          </div>
                      </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0"><button onClick={() => setIsBannerModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium">Cancelar</button><button onClick={async () => { await appBackend.saveBanner(newBanner as Banner); fetchBanners(); setIsBannerModalOpen(false); }} className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm">Salvar Banner</button></div>
              </div>
          </div>
      )}
    </div>
  );
};

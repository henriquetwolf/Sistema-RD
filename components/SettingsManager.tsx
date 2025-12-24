
import React, { useState, useEffect } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, 
    Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Layout, ExternalLink, Trash2, BarChart3, Building2, Plus, Edit2,
    Monitor, Globe, Target, Info, Shield, TrendingUp, DollarSign,
    Loader2, Package, Tag, Layers, Palette, History, Clock, User, Search,
    Play, Pause, Calendar, Smartphone, Link as LinkIcon, ChevronDown, Award
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
-- SCRIPT DE REPARO DEFINITIVO VOLL CRM (V16)
-- ADIÇÃO DE CLÁUSULA DE EXCLUSIVIDADE E CORREÇÕES

-- 1. ADICIONAR CAMPO DE EXCLUSIVIDADE NA TABELA DE FRANQUIAS
ALTER TABLE IF EXISTS public.crm_franchises 
ADD COLUMN IF NOT EXISTS exclusivity_radius_km numeric DEFAULT 0;

-- 2. REMOVER CONSTRAINTS CONFLITANTES DE SUBMISSÕES
ALTER TABLE IF EXISTS public.crm_form_submissions 
DROP CONSTRAINT IF EXISTS crm_form_submissions_form_id_fkey;

-- 3. REPARAR/CRIAR TABELA DE SUBMISSÕES
CREATE TABLE IF NOT EXISTS public.crm_form_submissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid NOT NULL,
    student_id uuid,
    answers jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Garantir tipos de dados corretos
ALTER TABLE public.crm_form_submissions ALTER COLUMN student_id TYPE uuid USING student_id::uuid;
ALTER TABLE public.crm_form_submissions ALTER COLUMN answers TYPE jsonb USING answers::jsonb;

-- 4. PERMISSÕES DE ACESSO (GRANT)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.crm_form_submissions TO anon, authenticated, service_role;
GRANT ALL ON public.crm_surveys TO anon, authenticated, service_role;
GRANT ALL ON public.crm_forms TO anon, authenticated, service_role;
GRANT ALL ON public.crm_franchises TO anon, authenticated, service_role;

-- 5. REFAZER POLÍTICAS DE SEGURANÇA (RLS)
ALTER TABLE public.crm_form_submissions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir inserção de respostas" ON public.crm_form_submissions;
DROP POLICY IF EXISTS "Permitir leitura de respostas" ON public.crm_form_submissions;

CREATE POLICY "Permitir inserção de respostas" ON public.crm_form_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura de respostas" ON public.crm_form_submissions FOR SELECT USING (true);

ALTER TABLE public.crm_form_submissions ENABLE ROW LEVEL SECURITY;

-- 6. RELOAD
NOTIFY pgrst, 'reload config';
  `.trim();

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };

  // Handlers para CRUDs
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    await appBackend.saveRole(editingRole);
    fetchRoles();
    setEditingRole(null);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;
    await appBackend.saveBanner(editingBanner as Banner);
    fetchBanners();
    setEditingBanner(null);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    await appBackend.saveCompany(editingCompany as CompanySetting);
    fetchCompanies();
    setEditingCompany(null);
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLevel) return;
    await appBackend.saveInstructorLevel(editingLevel as InstructorLevel);
    fetchInstructorLevels();
    setEditingLevel(null);
  };

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
                <div className="flex justify-end pt-4"><button onClick={handleSaveGlobal} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2">{isSaved ? <><Check size={18}/> Salvo!</> : <><Save size={18}/> Salvar Configurações</>}</button></div>
            </div>
        )}

        {/* CRUD BANNERS */}
        {activeTab === 'banners' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Banners de Promoção</h3>
                    <button onClick={() => setEditingBanner({ title: '', imageUrl: '', linkUrl: '', targetAudience: 'student', active: true })} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold">+ Novo Banner</button>
                </div>
                {editingBanner && (
                    <form onSubmit={handleSaveBanner} className="bg-slate-50 p-6 rounded-xl border mb-8 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold mb-1">Título Interno</label>
                                <input type="text" className="w-full p-2 border rounded text-sm" value={editingBanner.title} onChange={e => setEditingBanner({...editingBanner, title: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">URL da Imagem</label>
                                <input type="text" className="w-full p-2 border rounded text-sm" value={editingBanner.imageUrl} onChange={e => setEditingBanner({...editingBanner, imageUrl: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">Link de Destino</label>
                                <input type="text" className="w-full p-2 border rounded text-sm" value={editingBanner.linkUrl} onChange={e => setEditingBanner({...editingBanner, linkUrl: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">Público</label>
                                <select className="w-full p-2 border rounded text-sm" value={editingBanner.targetAudience} onChange={e => setEditingBanner({...editingBanner, targetAudience: e.target.value as any})}>
                                    <option value="student">Área do Aluno</option>
                                    <option value="instructor">Área do Instrutor</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingBanner(null)} className="px-4 py-2 text-sm">Cancelar</button><button type="submit" className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold text-sm">Salvar Banner</button></div>
                    </form>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {banners.map(b => (
                        <div key={b.id} className="p-3 border rounded-xl flex items-center gap-4 bg-white group">
                            <div className="w-20 h-12 bg-slate-100 rounded overflow-hidden flex-shrink-0"><img src={b.imageUrl} className="w-full h-full object-cover" /></div>
                            <div className="flex-1 truncate"><h4 className="font-bold text-sm text-slate-800">{b.title}</h4><p className="text-[10px] text-slate-400 uppercase">{b.targetAudience}</p></div>
                            <div className="flex gap-1"><button onClick={() => setEditingBanner(b)} className="p-1.5 text-slate-400 hover:text-orange-600"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteBanner(b.id).then(fetchBanners)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* CRUD NÍVEIS DE INSTRUTORES */}
        {activeTab === 'instructor_levels' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Níveis e Honorários Docentes</h3>
                    <button onClick={() => setEditingLevel({ name: '', honorarium: 0, observations: '' })} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold">+ Novo Nível</button>
                </div>
                {editingLevel && (
                    <form onSubmit={handleSaveLevel} className="bg-slate-50 p-6 rounded-xl border mb-8 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold mb-1">Nome do Nível</label>
                                <input type="text" className="w-full p-2 border rounded text-sm" value={editingLevel.name} onChange={e => setEditingLevel({...editingLevel, name: e.target.value})} placeholder="Ex: Master II" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">Honorário Padrão (R$)</label>
                                <input type="number" className="w-full p-2 border rounded text-sm" value={editingLevel.honorarium} onChange={e => setEditingLevel({...editingLevel, honorarium: parseFloat(e.target.value)})} required />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold mb-1">Observações / Regras</label>
                                <input type="text" className="w-full p-2 border rounded text-sm" value={editingLevel.observations} onChange={e => setEditingLevel({...editingLevel, observations: e.target.value})} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingLevel(null)} className="px-4 py-2 text-sm">Cancelar</button><button type="submit" className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold text-sm">Salvar Nível</button></div>
                    </form>
                )}
                <div className="space-y-2">
                    {instructorLevels.map(lvl => (
                        <div key={lvl.id} className="p-4 border rounded-xl flex justify-between items-center bg-white hover:border-purple-200 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><Award size={20}/></div>
                                <div><h4 className="font-bold text-slate-800">{lvl.name}</h4><p className="text-xs text-slate-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lvl.honorarium)}</p></div>
                            </div>
                            <div className="flex gap-2"><button onClick={() => setEditingLevel(lvl)} className="p-2 text-slate-400 hover:text-purple-600"><Edit2 size={18}/></button><button onClick={() => appBackend.deleteInstructorLevel(lvl.id).then(fetchInstructorLevels)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'connections' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Globe className="text-teal-600" size={20}/> Conexões Externas (Sync)</h3>
                    <button onClick={onStartWizard} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm"><Plus size={16}/> Nova Conexão</button>
                </div>
                <div className="space-y-4">
                    {jobs.length === 0 ? <p className="text-center py-10 text-slate-400 italic">Nenhuma conexão configurada.</p> : jobs.map(job => (
                        <div key={job.id} className="p-4 border rounded-xl hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h4 className="font-bold text-slate-800">{job.name}</h4>
                                <p className="text-xs text-slate-400 truncate max-w-md">{job.sheetUrl}</p>
                                <div className="mt-2 flex items-center gap-4">
                                    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded uppercase", job.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400")}>{job.active ? 'Sincronizando' : 'Pausado'}</span>
                                    <span className="text-[10px] text-slate-400">Freq: {job.intervalMinutes} min</span>
                                    <span className="text-[10px] text-slate-400">Tabela: {job.config.tableName}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => onDeleteJob(job.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'database' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex items-center gap-3 mb-4"><Database className="text-amber-600" /><h3 className="text-lg font-bold text-slate-800">Manutenção de Tabelas (V16)</h3></div>
                <p className="text-sm text-slate-500 mb-6 font-bold text-red-600 flex items-center gap-2"><AlertTriangle size={16}/> Use este script para sincronizar as tabelas com os novos recursos (Exclusividade de Franquias).</p>
                {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm hover:bg-slate-800 transition-all">Gerar Script de Correção V16</button> : (
                    <div className="relative animate-in slide-in-from-top-4">
                        <pre className="bg-black text-amber-400 p-4 rounded-lg text-[10px] font-mono overflow-auto max-h-[400px] border border-amber-900/50 leading-relaxed">{generateRepairSQL()}</pre>
                        <button onClick={copySql} className="absolute top-2 right-2 bg-slate-700 text-white px-3 py-1 rounded text-xs hover:bg-slate-600 transition-colors shadow-lg">{sqlCopied ? 'Copiado!' : 'Copiar SQL'}</button>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'company' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold text-slate-800">Empresas do Grupo</h3><button onClick={() => setEditingCompany({ legalName: '', cnpj: '', productTypes: [] })} className="bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">+ Nova Empresa</button></div>
                {editingCompany && (
                    <form onSubmit={handleSaveCompany} className="bg-slate-50 p-6 rounded-xl border mb-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold mb-1">Razão Social</label><input type="text" className="w-full p-2 border rounded text-sm" value={editingCompany.legalName} onChange={e => setEditingCompany({...editingCompany, legalName: e.target.value})} required /></div>
                            <div><label className="block text-xs font-bold mb-1">CNPJ</label><input type="text" className="w-full p-2 border rounded text-sm" value={editingCompany.cnpj} onChange={e => setEditingCompany({...editingCompany, cnpj: e.target.value})} required /></div>
                        </div>
                        <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingCompany(null)} className="px-3 py-1 text-sm">Cancelar</button><button type="submit" className="bg-teal-600 text-white px-4 py-1.5 rounded font-bold text-sm">Salvar</button></div>
                    </form>
                )}
                <div className="space-y-2">{companies.map(c => <div key={c.id} className="p-3 border rounded-lg flex justify-between items-center"><div className="font-bold text-sm">{c.legalName} <span className="text-xs text-slate-400 ml-2">{c.cnpj}</span></div><button onClick={() => appBackend.deleteCompany(c.id).then(fetchCompanies)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></div>)}</div>
            </div>
        )}

        {activeTab === 'roles' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold text-slate-800">Perfis de Acesso</h3><button onClick={() => setEditingRole({ id: '', name: '', permissions: {} })} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">+ Novo Perfil</button></div>
                {editingRole && (
                    <form onSubmit={handleSaveRole} className="bg-slate-50 p-6 rounded-xl border mb-6 space-y-4">
                        <label className="block text-xs font-bold">Nome do Perfil</label><input type="text" className="w-full p-2 border rounded text-sm mb-4" value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} required />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {['overview', 'crm', 'inventory', 'analysis', 'classes', 'teachers', 'forms', 'surveys', 'contracts', 'products', 'students', 'certificates', 'events', 'partner_studios', 'collaborators', 'whatsapp', 'franchises', 'global_settings'].map(mod => (
                                <label key={mod} className="flex items-center gap-2 p-2 bg-white border rounded cursor-pointer hover:bg-indigo-50"><input type="checkbox" checked={!!editingRole.permissions[mod]} onChange={e => setEditingRole({...editingRole, permissions: {...editingRole.permissions, [mod]: e.target.checked}})} /><span className="text-xs capitalize">{mod.replace('_', ' ')}</span></label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setEditingRole(null)} className="px-3 py-1 text-sm">Cancelar</button><button type="submit" className="bg-indigo-600 text-white px-4 py-1.5 rounded font-bold text-sm">Salvar Perfil</button></div>
                    </form>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{roles.map(r => <div key={r.id} className="p-3 border rounded-xl flex justify-between items-center bg-white hover:border-indigo-200 transition-all"><span className="font-bold text-sm text-slate-700">{r.name}</span><div className="flex gap-2"><button onClick={() => setEditingRole(r)} className="text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteRole(r.id).then(fetchRoles)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button></div></div>)}</div>
            </div>
        )}

        {activeTab === 'logs' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col h-[600px]">
                <div className="flex items-center justify-between mb-4 shrink-0"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><History className="text-blue-600" size={20}/> Registro de Auditoria</h3><div className="relative w-64"><Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14}/><input type="text" className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" placeholder="Buscar no histórico..." value={logSearch} onChange={e => setLogSearch(e.target.value)} /></div></div>
                <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-lg"><table className="w-full text-left text-xs border-collapse"><thead className="bg-slate-50 sticky top-0 font-bold text-slate-500 uppercase tracking-wider"><tr><th className="p-3 border-b">Data/Hora</th><th className="p-3 border-b">Usuário</th><th className="p-3 border-b">Ação</th><th className="p-3 border-b">Módulo</th><th className="p-3 border-b">Detalhes</th></tr></thead><tbody className="divide-y divide-slate-100">{logs.filter(l => l.userName.toLowerCase().includes(logSearch.toLowerCase()) || l.details.toLowerCase().includes(logSearch.toLowerCase())).map(log => (<tr key={log.id} className="hover:bg-slate-50 transition-colors"><td className="p-3 text-slate-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td><td className="p-3 font-bold text-slate-700">{log.userName}</td><td className="p-3"><span className={clsx("px-2 py-0.5 rounded font-black uppercase text-[9px]", log.action === 'delete' ? "bg-red-100 text-red-700" : log.action === 'create' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700")}>{log.action}</span></td><td className="p-3 font-medium text-slate-500">{log.module}</td><td className="p-3 text-slate-600">{log.details}</td></tr>))}</tbody></table></div>
            </div>
        )}
      </div>
    </div>
  );
};

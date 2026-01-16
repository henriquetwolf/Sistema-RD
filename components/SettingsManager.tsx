
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, Database, 
    Copy, Users, User, Lock, Unlock, Check, X, ShieldCheck, 
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
          const [comps, prods] = await Promise.all([
              appBackend.getCompanies(),
              appBackend.client.from('crm_products').select('id, name')
          ]);
          setCompanies(comps); 
          if (prods.data) setAllProducts(prods.data as any);
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
-- SCRIPT DE FUNDAÇÃO CRM V79 (REPARO DEFINITIVO PÁGINAS DE VENDA)
-- 1. Tabela de Páginas de Venda (Garantir existência e nome de colunas)
CREATE TABLE IF NOT EXISTS public.crm_landing_pages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    product_name text,
    content jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    theme text DEFAULT 'modern'
);

-- 2. Correção de colunas faltantes ou renomeadas por erro de cache
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_landing_pages' AND column_name='product_name') THEN
        ALTER TABLE public.crm_landing_pages ADD COLUMN product_name text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_landing_pages' AND column_name='is_active') THEN
        ALTER TABLE public.crm_landing_pages ADD COLUMN is_active boolean DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_landing_pages' AND column_name='theme') THEN
        ALTER TABLE public.crm_landing_pages ADD COLUMN theme text DEFAULT 'modern';
    END IF;
END $$;

-- 3. Habilitar RLS
ALTER TABLE public.crm_landing_pages ENABLE ROW LEVEL SECURITY;

-- 4. Criar Política de Acesso Irrestrito (Garante que o Admin salve sem erros)
DROP POLICY IF EXISTS "Permitir tudo" ON public.crm_landing_pages;
CREATE POLICY "Permitir tudo" ON public.crm_landing_pages FOR ALL USING (true) WITH CHECK (true);

-- 5. Função de recarregamento forçado do Cache (PostgREST)
CREATE OR REPLACE FUNCTION reload_schema_cache()
RETURNS void AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Executar Recarregamento
NOTIFY pgrst, 'reload schema';
  `.trim();

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
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
                        <div key={b.id} className="border rounded-xl overflow-hidden group shadow-sm hover:shadow-md transition-all flex flex-col group">
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
                <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-lg font-bold">Níveis de Instrutores (Honorários)</h3>
                    <button onClick={fetchInstructorLevels} className="p-2 text-slate-400 hover:text-rose-600 transition-all"><RefreshCw size={16} className={clsx(isLoadingLevels && "animate-spin")} /></button>
                    <button onClick={() => setEditingLevel({ id: '', name: '', honorarium: 0, observations: '' })} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-rose-700 ml-auto">+ Novo Nível</button>
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
                        <div key={t.id} className="p-4 border rounded-xl flex items-center justify-between group">
                            <div><p className="font-bold">{t.name}</p><p className="text-[10px] text-slate-400 uppercase">Público: {t.role}</p></div>
                            <div className="flex gap-2"><button onClick={() => setEditingTag(t)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteSupportTag(t.id).then(fetchSupportTags)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'connection_plug' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-10">
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Zap className="text-indigo-600" size={20}/> Connection Plug (Webhooks)</h3>
                    <p className="text-sm text-slate-500">Configure disparos automáticos para sistemas externos baseados no CRM.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Ativadores de Webhook</h4>
                            <button onClick={() => setEditingTrigger({ id: '', pipelineName: '', stageId: '', payloadJson: '' })} className="text-[10px] font-bold text-indigo-600 uppercase">+ Adicionar</button>
                        </div>
                        <div className="space-y-3">
                            {webhookTriggers.map(t => (
                                <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-800 truncate">{t.pipelineName} / {t.stageId}</p>
                                        <p className="text-[10px] text-slate-400 font-mono truncate">{t.id}</p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingTrigger(t)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 size={14}/></button>
                                        <button onClick={() => appBackend.deleteWebhookTrigger(t.id!).then(fetchWebhookTriggers)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 bg-indigo-900 rounded-3xl text-white relative overflow-hidden flex flex-col justify-center">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><Terminal size={120}/></div>
                        <h4 className="text-xl font-black mb-2">Automação RD / CRM</h4>
                        <p className="text-sm text-indigo-200 leading-relaxed mb-6">Quando uma negociação atinge uma etapa com gatilho, os dados são enviados para o endpoint configurado na Empresa do faturamento.</p>
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-400"><CheckCircle size={16}/> Sincronização em tempo real</div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'logs' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2"><History className="text-slate-600" size={20}/> Log de Atividades do Sistema</h3>
                    <button onClick={fetchLogs} className="p-2 text-slate-400 hover:text-slate-600 transition-all"><RefreshCw size={18} className={clsx(isLoadingLogs && "animate-spin")} /></button>
                </div>
                <div className="space-y-3">
                    {isLoadingLogs ? <Loader2 className="animate-spin mx-auto text-slate-400"/> : logs.length === 0 ? (
                        <div className="p-12 text-center text-slate-300 italic">Nenhum log registrado.</div>
                    ) : logs.map(l => (
                        <div key={l.id} className="p-3 border-b border-slate-50 flex items-start justify-between text-xs hover:bg-slate-50 transition-colors">
                            <div className="flex gap-3">
                                {/* Fixed: changed Users to User */}
                                <div className="p-2 bg-slate-100 rounded text-slate-400"><User size={14}/></div>
                                <div>
                                    <p className="font-bold text-slate-700">{l.userName}</p>
                                    <p className="text-slate-500">{l.details}</p>
                                </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{new Date(l.createdAt).toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'database' && (
            <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Database className="text-amber-600" size={20}/> Conexões Ativas (Google Sheets)
                        </h3>
                        <button onClick={onStartWizard} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all">+ Nova Conexão</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {jobs.map(job => (
                            <div key={job.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 hover:border-amber-300 transition-all group">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("p-2 rounded-lg", job.active ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-400")}>
                                            <RefreshCw size={20} className={clsx(job.status === 'syncing' && "animate-spin")} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{job.name}</p>
                                            <p className="text-[10px] text-slate-400 font-mono">Tabela: {job.config.tableName}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => onDeleteJob(job.id)} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={clsx("px-2 py-0.5 rounded text-[9px] font-black uppercase border", 
                                        job.status === 'success' ? "bg-green-50 text-green-700 border-green-200" : 
                                        job.status === 'error' ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                                        {job.status.toUpperCase()}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Sinc: {job.intervalMinutes}m</span>
                                </div>
                                <p className="text-[10px] text-slate-500 truncate bg-white p-2 rounded border border-slate-100" title={job.lastMessage}>{job.lastMessage || 'Aguardando primeiro ciclo...'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'sql_script' && (
            <div className="bg-slate-900 rounded-3xl p-10 space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Terminal size={140}/></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-black text-white flex items-center gap-3"><Terminal size={24} className="text-red-500"/> Script de Reparo Estrutural V79</h3>
                        <p className="text-slate-400 text-sm mt-2 max-w-xl font-medium leading-relaxed">Este script atualiza o banco de dados Supabase com as colunas necessárias para as <strong>Páginas de Venda</strong> e força o recarregamento do cache da API.</p>
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
                    <p>Copie o código acima e cole no <strong>SQL Editor</strong> do seu dashboard Supabase para aplicar as correções e recarregar o cache.</p>
                </div>
            </div>
        )}
      </div>

      {/* MODAL EDIT ROLE */}
      {editingRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="font-bold text-slate-800">Editar Perfil de Acesso</h3>
                      <button onClick={() => setEditingRole(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg"><X size={24}/></button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Nome do Perfil</label>
                          <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} placeholder="Ex: Comercial, Diretor..." />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-4 uppercase tracking-wider">Permissões de Módulo</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {PERMISSION_MODULES.map(mod => (
                                  <label key={mod.id} className={clsx("flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all", editingRole.permissions?.[mod.id] ? "bg-indigo-50 border-indigo-500" : "bg-white border-slate-100 hover:border-slate-200")}>
                                      <span className="text-sm font-bold text-slate-700">{mod.label}</span>
                                      <input type="checkbox" className="w-5 h-5 rounded text-indigo-600" checked={!!editingRole.permissions?.[mod.id]} onChange={e => setEditingRole({...editingRole, permissions: { ...editingRole.permissions, [mod.id]: e.target.checked }})} />
                                  </label>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3 shrink-0"><button onClick={() => setEditingRole(null)} className="px-4 py-2 text-slate-600 font-medium text-sm">Cancelar</button><button onClick={handleSaveRole} disabled={isSavingItem} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95">{isSavingItem ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar Perfil</button></div>
              </div>
          </div>
      )}

      {/* MODAL EDIT BANNER */}
      {editingBanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="font-bold text-slate-800">Gerenciar Banner</h3>
                      <button onClick={() => setEditingBanner(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg"><X size={24}/></button>
                  </div>
                  <div className="p-6 space-y-6 flex-1">
                      <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Título / Referência Interna</label><input type="text" className="w-full px-4 py-2 border rounded-lg text-sm" value={editingBanner.title} onChange={e => setEditingBanner({...editingBanner, title: e.target.value})} /></div>
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Público de Exibição</label>
                          <select className="w-full px-4 py-2 border rounded-lg text-sm bg-white" value={editingBanner.targetAudience} onChange={e => setEditingBanner({...editingBanner, targetAudience: e.target.value as any})}>
                              <option value="student">Área do Aluno</option>
                              <option value="instructor">Área do Instrutor</option>
                          </select>
                      </div>
                      <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Link de Destino</label><input type="text" className="w-full px-4 py-2 border rounded-lg text-sm font-mono" value={editingBanner.linkUrl} onChange={e => setEditingBanner({...editingBanner, linkUrl: e.target.value})} placeholder="https://..." /></div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Imagem do Banner</label>
                        <div onClick={() => bannerFileInputRef.current?.click()} className="cursor-pointer bg-slate-50 border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 hover:bg-slate-100 transition-all">
                            {editingBanner.imageUrl ? <img src={editingBanner.imageUrl} className="max-h-32 rounded shadow-sm" /> : <ImageIcon size={32} className="text-slate-300"/>}
                            <span className="text-xs text-slate-500 font-bold uppercase">Selecionar Arquivo</span>
                            <input ref={bannerFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editingBanner.active} onChange={e => setEditingBanner({...editingBanner, active: e.target.checked})} className="rounded text-orange-600" /><span className="text-xs font-bold text-slate-700 uppercase">Banner Ativado</span></label>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3 shrink-0"><button onClick={() => setEditingBanner(null)} className="px-4 py-2 text-slate-600 font-medium text-sm">Cancelar</button><button onClick={handleSaveBanner} disabled={isSavingItem} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-2 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95">{isSavingItem ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar Banner</button></div>
              </div>
          </div>
      )}

      {/* MODAL EDIT COMPANY */}
      {editingCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="font-bold text-slate-800">Gerenciar Empresa</h3>
                      <button onClick={() => setEditingCompany(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Razão Social</label><input type="text" className="w-full px-4 py-2 border rounded-lg text-sm" value={editingCompany.legalName} onChange={e => setEditingCompany({...editingCompany, legalName: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">CNPJ</label><input type="text" className="w-full px-4 py-2 border rounded-lg text-sm" value={editingCompany.cnpj} onChange={e => setEditingCompany({...editingCompany, cnpj: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Webhook URL (Opcional)</label><input type="text" className="w-full px-4 py-2 border rounded-lg text-sm font-mono" value={editingCompany.webhookUrl} onChange={e => setEditingCompany({...editingCompany, webhookUrl: e.target.value})} /></div>
                        
                        <div className="col-span-2 pt-4 border-t">
                            <label className="block text-xs font-bold text-slate-600 mb-3 uppercase tracking-widest">Vincular Tipos de Produto</label>
                            <div className="flex gap-4">
                                {['Digital', 'Presencial', 'Evento'].map(type => (
                                    <label key={type} className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border flex-1 hover:bg-white transition-all">
                                        <input type="checkbox" className="w-4 h-4 rounded text-teal-600" checked={editingCompany.productTypes?.includes(type)} onChange={e => {
                                            const current = editingCompany.productTypes || [];
                                            const updated = e.target.checked ? [...current, type] : current.filter(t => t !== type);
                                            setEditingCompany({...editingCompany, productTypes: updated});
                                        }} />
                                        <span className="text-xs font-bold text-slate-700">{type}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="col-span-2 pt-4">
                            <label className="block text-xs font-bold text-slate-600 mb-3 uppercase tracking-widest">Exceção: Por Produto Específico</label>
                            <div className="max-h-48 overflow-y-auto border rounded-xl p-4 bg-slate-50 space-y-2 custom-scrollbar">
                                {allProducts.map(p => (
                                    <label key={p.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border shadow-sm cursor-pointer hover:border-teal-400 transition-all">
                                        <input type="checkbox" className="w-4 h-4 rounded text-teal-600" checked={editingCompany.productIds?.includes(p.name)} onChange={e => {
                                            const current = editingCompany.productIds || [];
                                            const updated = e.target.checked ? [...current, p.name] : current.filter(name => name !== p.name);
                                            setEditingCompany({...editingCompany, productIds: updated});
                                        }} />
                                        <span className="text-xs font-medium text-slate-800">{p.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                      </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3 shrink-0"><button onClick={() => setEditingCompany(null)} className="px-4 py-2 text-slate-600 font-medium text-sm">Cancelar</button><button onClick={handleSaveCompany} disabled={isSavingItem} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-2 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95">{isSavingItem ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar Empresa</button></div>
              </div>
          </div>
      )}

      {/* MODAL EDIT INSTRUCTOR LEVEL */}
      {editingLevel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="font-bold text-slate-800">Gerenciar Nível Docente</h3>
                      <button onClick={() => setEditingLevel(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg"><X size={24}/></button>
                  </div>
                  <div className="p-6 space-y-6 flex-1">
                      <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Nome do Nível</label><input type="text" className="w-full px-4 py-2 border rounded-lg text-sm" value={editingLevel.name} onChange={e => setEditingLevel({...editingLevel, name: e.target.value})} placeholder="Ex: Sênior, Mestre..." /></div>
                      <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Honorário / Remuneração Padrão (R$)</label><input type="number" className="w-full px-4 py-2 border rounded-lg text-sm font-bold text-emerald-700" value={editingLevel.honorarium} onChange={e => setEditingLevel({...editingLevel, honorarium: parseFloat(e.target.value) || 0})} /></div>
                      <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Observações</label><textarea className="w-full px-4 py-2 border rounded-lg text-sm h-24 resize-none" value={editingLevel.observations} onChange={e => setEditingLevel({...editingLevel, observations: e.target.value})} /></div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3 shrink-0"><button onClick={() => setEditingLevel(null)} className="px-4 py-2 text-slate-600 font-medium text-sm">Cancelar</button><button onClick={handleSaveLevel} disabled={isSavingItem} className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-2 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95">{isSavingItem ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar Nível</button></div>
              </div>
          </div>
      )}

      {/* MODAL EDIT COURSE INFO */}
      {editingCourseInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 flex flex-col h-[90vh]">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="font-bold text-slate-800">Info de Curso (Portal do Instrutor)</h3>
                      <button onClick={() => setEditingCourseInfo(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                      <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Nome do Curso / Formação (Identidade)</label><input type="text" className="w-full px-4 py-2 border rounded-lg text-sm font-bold" value={editingCourseInfo.courseName} onChange={e => setEditingCourseInfo({...editingCourseInfo, courseName: e.target.value})} placeholder="Ex: Formação Completa em Pilates" /></div>
                      <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Detalhes e Ementa Técnica</label><textarea className="w-full px-4 py-2 border rounded-lg text-sm h-48 resize-none leading-relaxed" value={editingCourseInfo.details} onChange={e => setEditingCourseInfo({...editingCourseInfo, details: e.target.value})} /></div>
                      <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Materiais e Apostilas Necessários</label><textarea className="w-full px-4 py-2 border rounded-lg text-sm h-32 resize-none" value={editingCourseInfo.materials} onChange={e => setEditingCourseInfo({...editingCourseInfo, materials: e.target.value})} /></div>
                      <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Requisitos e Orientações Docentes</label><textarea className="w-full px-4 py-2 border rounded-lg text-sm h-32 resize-none" value={editingCourseInfo.requirements} onChange={e => setEditingCourseInfo({...editingCourseInfo, requirements: e.target.value})} /></div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3 shrink-0"><button onClick={() => setEditingCourseInfo(null)} className="px-4 py-2 text-slate-600 font-medium text-sm">Cancelar</button><button onClick={handleSaveCourseInfo} disabled={isSavingItem} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95">{isSavingItem ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar Informação</button></div>
              </div>
          </div>
      )}

      {/* MODAL EDIT SUPPORT TAG */}
      {editingTag && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="font-bold text-slate-800">Gerenciar Tag de Atendimento</h3>
                      <button onClick={() => setEditingTag(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg"><X size={24}/></button>
                  </div>
                  <div className="p-6 space-y-6 flex-1">
                      <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Nome da Tag</label><input type="text" className="w-full px-4 py-2 border rounded-lg text-sm font-bold" value={editingTag.name} onChange={e => setEditingTag({...editingTag, name: e.target.value})} placeholder="Ex: Suporte Financeiro, Dúvida Técnica..." /></div>
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Destino (Role)</label>
                          <select className="w-full px-4 py-2 border rounded-lg text-sm bg-white" value={editingTag.role} onChange={e => setEditingTag({...editingTag, role: e.target.value as any})}>
                              <option value="all">Todas as Áreas</option>
                              <option value="student">Área do Aluno</option>
                              <option value="instructor">Área do Instrutor</option>
                              <option value="studio">Área do Studio</option>
                          </select>
                      </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3 shrink-0"><button onClick={() => setEditingTag(null)} className="px-4 py-2 text-slate-600 font-medium text-sm">Cancelar</button><button onClick={handleSaveTag} disabled={isSavingItem} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95">{isSavingItem ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar Tag</button></div>
              </div>
          </div>
      )}

      {/* MODAL EDIT TRIGGER */}
      {editingTrigger && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><Zap size={20} className="text-indigo-600"/> Configurar Gatilho de Webhook</h3>
                      <button onClick={() => setEditingTrigger(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Funil (Pipeline)</label>
                            <select className="w-full px-4 py-2 border rounded-lg text-sm bg-white" value={editingTrigger.pipelineName} onChange={e => setEditingTrigger({...editingTrigger, pipelineName: e.target.value, stageId: ''})}>
                                <option value="">Selecione...</option>
                                {pipelines.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Etapa de Disparo</label>
                            <select className="w-full px-4 py-2 border rounded-lg text-sm bg-white disabled:bg-slate-50" value={editingTrigger.stageId} onChange={e => setEditingTrigger({...editingTrigger, stageId: e.target.value})} disabled={!editingTrigger.pipelineName}>
                                <option value="">Selecione a etapa...</option>
                                {(pipelines.find(p => p.name === editingTrigger.pipelineName)?.stages || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">JSON Payload Customizado (Opcional)</label>
                            <textarea className="w-full px-4 py-2 border rounded-lg text-xs font-mono h-48 resize-none bg-slate-900 text-teal-400" value={editingTrigger.payloadJson} onChange={e => setEditingTrigger({...editingTrigger, payloadJson: e.target.value})} placeholder='{"nome": "{{nome_cliente}}", "curso": "{{curso_produto}}"}' />
                            <p className="text-[10px] text-slate-400 mt-2 italic">* Se vazio, o sistema enviará o objeto padrão VOLL. Use tags entre {"{{ }}"} para mapear campos do CRM.</p>
                        </div>
                      </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3 shrink-0"><button onClick={() => setEditingTrigger(null)} className="px-4 py-2 text-slate-600 font-medium text-sm">Cancelar</button><button onClick={handleSaveTrigger} disabled={isSavingItem} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95">{isSavingItem ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar Gatilho</button></div>
              </div>
          </div>
      )}
    </div>
  );
};

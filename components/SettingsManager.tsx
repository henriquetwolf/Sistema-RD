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
      { id: 'chat_ia', label: 'Chat IA' },
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
-- SCRIPT DE REPARO SQL - VOLL PILATES
CREATE TABLE IF NOT EXISTS public.crm_settings (
    key text PRIMARY KEY,
    value text
);

CREATE TABLE IF NOT EXISTS public.crm_companies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    legal_name text,
    cnpj text UNIQUE,
    webhook_url text,
    product_types text[],
    product_ids text[]
);

-- TABELAS PARA WHATSAPP E CHAT IA
CREATE TABLE IF NOT EXISTS public.crm_whatsapp_chats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    wa_id text UNIQUE,
    contact_name text,
    contact_phone text,
    last_message text,
    unread_count integer DEFAULT 0,
    status text DEFAULT 'open',
    tag text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_whatsapp_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id uuid REFERENCES public.crm_whatsapp_chats(id) ON DELETE CASCADE,
    text text,
    sender_type text, -- 'user', 'agent', 'system'
    wa_message_id text,
    status text,
    created_at timestamp with time zone DEFAULT now()
);
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

        {activeTab === 'connection_plug' && (
            <div className="space-y-6 animate-in slide-in-from-left-2">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div><h3 className="text-lg font-bold text-slate-800">Connection Plug (Automations)</h3><p className="text-xs text-slate-500">Gatilhos automáticos para disparar dados de negociação entre CRM e Empresas.</p></div>
                    <button onClick={() => setEditingTrigger({ pipelineName: 'Padrão', stageId: 'closed' })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Zap size={16}/> Novo Gatilho</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isLoadingTriggers ? <div className="col-span-full py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div> : webhookTriggers.map(trigger => (
                        <div key={trigger.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Zap size={24}/></div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingTrigger(trigger)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                    <button onClick={() => { if(window.confirm("Excluir gatilho?")) appBackend.deleteWebhookTrigger(trigger.id).then(fetchWebhookTriggers); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-bold text-slate-800">Ao atingir a etapa <span className="text-indigo-600">"{trigger.stageId}"</span></h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase">No Funil: {trigger.pipelineName}</p>
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
                                <button onClick={() => setEditingRole(role)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                <button onClick={() => { if(window.confirm("Excluir perfil?")) appBackend.deleteRole(role.id).then(fetchRoles); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'instructor_levels' && (
            <div className="space-y-6 animate-in slide-in-from-left-2">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div><h3 className="text-lg font-bold text-slate-800">Níveis Docentes</h3><p className="text-xs text-slate-500">Definição técnica de hierarquia e honorários padrão.</p></div>
                    <button onClick={() => setEditingLevel({ name: '', honorarium: 0 })} className="bg-rose-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Plus size={16}/> Novo Nível</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoadingLevels ? <div className="col-span-full py-12 flex justify-center"><Loader2 className="animate-spin text-rose-600" /></div> : instructorLevels.map(lvl => (
                        <div key={lvl.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-rose-50 p-2 rounded-lg text-rose-600"><Award size={24}/></div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingLevel(lvl)} className="p-1.5 text-slate-400 hover:text-rose-600"><Edit2 size={16}/></button>
                                    <button onClick={() => { if(window.confirm("Excluir nível?")) appBackend.deleteInstructorLevel(lvl.id).then(fetchInstructorLevels); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <h4 className="font-bold text-slate-800">{lvl.name}</h4>
                            <p className="text-sm font-black text-emerald-600 mt-2">{formatCurrency(lvl.honorarium)} <span className="text-[10px] text-slate-400 font-bold">/ DIA</span></p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'course_info' && (
            <div className="space-y-6 animate-in slide-in-from-left-2">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div><h3 className="text-lg font-bold text-slate-800">Ementas Técnicas (Portal)</h3><p className="text-xs text-slate-500">Informações ricas exibidas para o aluno nos detalhes logísticos.</p></div>
                    <button onClick={() => setEditingCourseInfo({ courseName: '', details: '', materials: '', requirements: '' })} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Plus size={16}/> Novo Conteúdo</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isLoadingCourseInfo ? <div className="col-span-full py-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div> : courseInfos.map(info => (
                        <div key={info.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Monitor size={24}/></div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingCourseInfo(info)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                                    <button onClick={() => { if(window.confirm("Excluir conteúdo?")) appBackend.deleteCourseInfo(info.id).then(fetchCourseInfos); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <h4 className="font-bold text-slate-800">{info.courseName}</h4>
                            <p className="text-xs text-slate-400 line-clamp-2 mt-2">{info.details}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'support_tags' && (
            <div className="space-y-6 animate-in slide-in-from-left-2">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div><h3 className="text-lg font-bold text-slate-800">Tags de Atendimento</h3><p className="text-xs text-slate-500">Categorias para classificar chamados de suporte.</p></div>
                    <button onClick={() => setEditingTag({ name: '', role: 'all' })} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Plus size={16}/> Nova Tag</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {isLoadingTags ? <div className="col-span-full py-12 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div> : supportTags.map(tag => (
                        <div key={tag.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group">
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-700 text-xs">{tag.name}</span>
                                <span className="text-[9px] text-slate-400 uppercase font-black">{tag.role}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingTag(tag)} className="p-1.5 text-slate-400 hover:text-emerald-600"><Edit2 size={14}/></button>
                                <button onClick={() => { if(window.confirm("Excluir tag?")) appBackend.deleteSupportTag(tag.id).then(fetchSupportTags); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'logs' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-left-2">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><History className="text-slate-400" /> Registro de Atividades</h3>
                    <button onClick={fetchLogs} className="p-2 text-slate-400 hover:text-indigo-600 transition-all"><RefreshCw size={20} className={isLoadingLogs ? "animate-spin" : ""} /></button>
                </div>
                <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0 z-10 shadow-sm border-b">
                            <tr>
                                <th className="p-4">Data/Hora</th>
                                <th className="p-4">Usuário</th>
                                <th className="p-4">Ação</th>
                                <th className="p-4">Módulo</th>
                                <th className="p-4">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoadingLogs ? <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr> : logs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-mono text-slate-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                                    <td className="p-4 font-bold text-slate-700">{log.userName}</td>
                                    <td className="p-4"><span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase", log.action === 'create' ? "bg-green-100 text-green-700" : log.action === 'delete' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700")}>{log.action}</span></td>
                                    <td className="p-4 font-bold uppercase text-slate-500">{log.module}</td>
                                    <td className="p-4 text-slate-500 italic">{log.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                        <h3 className="text-xl font-black text-white flex items-center gap-3"><Terminal size={24} className="text-red-500"/> Script de Reparo Estrutural</h3>
                        <p className="text-slate-400 text-sm mt-2 max-w-xl font-medium leading-relaxed">Este script corrige o schema das tabelas para suportar as novas funcionalidades do ERP.</p>
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

      {/* MODALS */}
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
                      <button onClick={() => setEditingRole(null)} className="px-6 py-2.5 text-slate-500 font-bold text-sm">Cancelar</button>
                      <button onClick={handleSaveRole} disabled={isSavingItem} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 active:scale-95 disabled:opacity-50">{isSavingItem ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Perfil</button>
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

      {editingBanner && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl animate-in zoom-in-95 overflow-hidden">
                  <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-black text-slate-800">Gerenciar Banner</h3>
                      <button onClick={() => setEditingBanner(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="space-y-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Título Interno</label>
                              <input type="text" className="w-full px-4 py-2 border rounded-xl text-sm font-bold" value={editingBanner.title || ''} onChange={e => setEditingBanner({...editingBanner, title: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Link de Destino</label>
                              <input type="text" className="w-full px-4 py-2 border rounded-xl text-xs font-mono" value={editingBanner.linkUrl || ''} onChange={e => setEditingBanner({...editingBanner, linkUrl: e.target.value})} placeholder="https://..." />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Portal Destino</label>
                                  <select className="w-full px-4 py-2 border rounded-xl text-sm font-bold bg-white" value={editingBanner.targetAudience} onChange={e => setEditingBanner({...editingBanner, targetAudience: e.target.value as any})}>
                                      <option value="student">Área do Aluno</option>
                                      <option value="instructor">Área do Instrutor</option>
                                  </select>
                              </div>
                              <div className="flex items-end pb-1">
                                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-xl border w-full">
                                      <input type="checkbox" checked={editingBanner.active} onChange={e => setEditingBanner({...editingBanner, active: e.target.checked})} className="w-4 h-4 rounded text-orange-600" />
                                      <span className="text-[10px] font-black uppercase text-slate-700">Banner Ativo</span>
                                  </label>
                              </div>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Imagem (1200x300 recomendado)</label>
                              <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200">
                                  {editingBanner.imageUrl ? (
                                      <div className="w-32 h-12 rounded border bg-white overflow-hidden shadow-sm"><img src={editingBanner.imageUrl} className="w-full h-full object-cover" /></div>
                                  ) : <div className="w-12 h-12 bg-white rounded border flex items-center justify-center text-slate-200"><ImageIcon size={24}/></div>}
                                  <input type="file" ref={bannerFileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => setEditingBanner({...editingBanner, imageUrl: reader.result as string});
                                          reader.readAsDataURL(e.target.files[0]);
                                      }
                                  }} />
                                  <button onClick={() => bannerFileInputRef.current?.click()} className="px-4 py-2 bg-white border rounded-lg text-[10px] font-black uppercase shadow-sm">Escolher Arquivo</button>
                              </div>
                          </div>
                      </div>
                      <div className="pt-4 border-t flex justify-end gap-3">
                          <button onClick={() => setEditingBanner(null)} className="px-6 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
                          <button onClick={handleSaveBanner} disabled={isSavingItem} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-2 rounded-xl font-bold text-sm shadow-xl active:scale-95 disabled:opacity-50">{isSavingItem ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Banner</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {editingLevel && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 overflow-hidden">
                  <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-black text-slate-800">{editingLevel.id ? 'Editar Nível' : 'Novo Nível Docente'}</h3>
                      <button onClick={() => setEditingLevel(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="space-y-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome do Nível</label>
                              <input type="text" className="w-full px-4 py-2 border rounded-xl text-sm font-bold" value={editingLevel.name || ''} onChange={e => setEditingLevel({...editingLevel, name: e.target.value})} placeholder="Ex: Master / Sênior" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Valor do Honorário (Diária R$)</label>
                              <input type="number" className="w-full px-4 py-2 border border-emerald-100 bg-emerald-50 rounded-xl text-sm font-black text-emerald-700" value={editingLevel.honorarium || 0} onChange={e => setEditingLevel({...editingLevel, honorarium: parseFloat(e.target.value) || 0})} />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Observações Técnicas</label>
                              <textarea className="w-full px-4 py-2 border rounded-xl text-xs h-24 resize-none" value={editingLevel.observations || ''} onChange={e => setEditingLevel({...editingLevel, observations: e.target.value})} />
                          </div>
                      </div>
                      <div className="pt-4 border-t flex justify-end gap-3">
                          <button onClick={() => setEditingLevel(null)} className="px-6 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
                          <button onClick={handleSaveLevel} disabled={isSavingItem} className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-2 rounded-xl font-bold text-sm shadow-xl active:scale-95 disabled:opacity-50">{isSavingItem ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Nível</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {editingTrigger && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl animate-in zoom-in-95 overflow-hidden">
                  <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-black text-slate-800">Gatilho de Integração</h3>
                      <button onClick={() => setEditingTrigger(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Funil de Origem</label>
                              <select className="w-full px-4 py-2 border rounded-xl text-sm font-bold bg-white" value={editingTrigger.pipelineName || ''} onChange={e => setEditingTrigger({...editingTrigger, pipelineName: e.target.value})}>
                                  {pipelines.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Etapa Gatilho</label>
                              <select className="w-full px-4 py-2 border rounded-xl text-sm font-bold bg-white" value={editingTrigger.stageId || ''} onChange={e => setEditingTrigger({...editingTrigger, stageId: e.target.value})}>
                                  <option value="">Selecione...</option>
                                  {(pipelines.find(p => p.name === editingTrigger.pipelineName)?.stages || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                              </select>
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Payload Customizado (JSON) - Opcional</label>
                              <textarea className="w-full px-4 py-2 border rounded-xl text-[10px] font-mono h-48 bg-slate-50 resize-none outline-none focus:bg-white transition-all" value={editingTrigger.payloadJson || ''} onChange={e => setEditingTrigger({...editingTrigger, payloadJson: e.target.value})} placeholder='{"custom_id": "{{deal_number}}", "status": "approved"}' />
                          </div>
                      </div>
                      <div className="pt-4 border-t flex justify-end gap-3">
                          <button onClick={() => setEditingTrigger(null)} className="px-6 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
                          <button onClick={handleSaveTrigger} disabled={isSavingItem} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-xl font-bold text-sm shadow-xl active:scale-95 disabled:opacity-50">{isSavingItem ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Gatilho</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {editingCourseInfo && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-10 py-8 border-b flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="text-xl font-black text-slate-800">Editor de Portal Técnico</h3>
                      <button onClick={() => setEditingCourseInfo(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={32}/></button>
                  </div>
                  <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-10">
                      <div className="space-y-6">
                          <div>
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Vincular ao Curso (Nome Exato)</label>
                              <input className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-[1.5rem] text-sm font-bold outline-none" value={editingCourseInfo.courseName || ''} onChange={e => setEditingCourseInfo({...editingCourseInfo, courseName: e.target.value})} placeholder="Ex: Formação Completa em Pilates" />
                          </div>
                          <div>
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Ementa e Detalhes Técnicos</label>
                              <textarea className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-[1.5rem] text-sm h-48 resize-none outline-none leading-relaxed" value={editingCourseInfo.details || ''} onChange={e => setEditingCourseInfo({...editingCourseInfo, details: e.target.value})} placeholder="Conteúdo programático que o aluno verá..." />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Materiais de Apoio (Texto)</label>
                                  <textarea className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-[1.5rem] text-sm h-32 resize-none outline-none leading-relaxed" value={editingCourseInfo.materials || ''} onChange={e => setEditingCourseInfo({...editingCourseInfo, materials: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pré-requisitos e Preparação</label>
                                  <textarea className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-[1.5rem] text-sm h-32 resize-none outline-none leading-relaxed" value={editingCourseInfo.requirements || ''} onChange={e => setEditingCourseInfo({...editingCourseInfo, requirements: e.target.value})} />
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="px-10 py-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0 rounded-b-[2.5rem]">
                      <button onClick={() => setEditingCourseInfo(null)} className="px-8 py-3 text-slate-500 font-bold text-sm">Cancelar</button>
                      <button onClick={async () => {
                          setIsSavingItem(true);
                          await appBackend.saveCourseInfo(editingCourseInfo);
                          await fetchCourseInfos();
                          setEditingCourseInfo(null);
                          setIsSavingItem(false);
                      }} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center gap-2">
                          {isSavingItem ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar no Portal
                      </button>
                  </div>
              </div>
          </div>
      )}

      {editingTag && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm animate-in zoom-in-95 overflow-hidden">
                  <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-black text-slate-800">{editingTag.id ? 'Editar Tag' : 'Nova Tag Suporte'}</h3>
                      <button onClick={() => setEditingTag(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome da Categoria</label>
                          <input type="text" className="w-full px-4 py-2 border rounded-xl text-sm font-bold bg-slate-50 outline-none focus:bg-white" value={editingTag.name || ''} onChange={e => setEditingTag({...editingTag, name: e.target.value})} placeholder="Ex: Financeiro / Técnico" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Público da Tag</label>
                          <select className="w-full px-4 py-2 border rounded-xl text-sm font-bold bg-white" value={editingTag.role} onChange={e => setEditingTag({...editingTag, role: e.target.value as any})}>
                              <option value="all">Todos os Usuários</option>
                              <option value="student">Somente Alunos</option>
                              <option value="instructor">Somente Instrutores</option>
                              <option value="studio">Somente Studios</option>
                              <option value="admin">Somente Administrativo</option>
                          </select>
                      </div>
                      <div className="pt-4 border-t flex justify-end gap-3">
                          <button onClick={() => setEditingTag(null)} className="px-6 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
                          <button onClick={async () => {
                              setIsSavingItem(true);
                              await appBackend.saveSupportTag(editingTag);
                              await fetchSupportTags();
                              setEditingTag(null);
                              setIsSavingItem(false);
                          }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2 rounded-xl font-bold text-sm shadow-xl active:scale-95 disabled:opacity-50">
                              {isSavingItem ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Tag
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
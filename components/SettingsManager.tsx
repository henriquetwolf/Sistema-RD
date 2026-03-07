
import React, { useState, useEffect, useRef } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, Database, 
    Copy, Users, User, Lock, Unlock, Check, X, ShieldCheck, 
    Trash2, Building2, Plus, Edit2, Palette, History, RefreshCw, 
    Zap, Loader2, Table, DollarSign, Terminal, Tag as TagIcon, Layout, Globe,
    Search, Info, AlertTriangle, AlertCircle, ChevronDown, CheckCircle2,
    Target, Briefcase, Mail, Key, Shield, GraduationCap, School, ListChecks,
    Eye, Link as LinkIcon, Award, Monitor, BookOpen, Bot, Sparkles, MessageSquare
} from 'lucide-react';
import { appBackend, CompanySetting, WebhookTrigger, Pipeline } from '../services/appBackend';
import { Role as UserRole, Banner, InstructorLevel, ActivityLog, SyncJob, CourseInfo, SupportTag, AiAvatar, AvatarTone } from '../types';
import clsx from 'clsx';

interface SettingsManagerProps {
  onLogoChange: (newLogo: string | null) => void;
  currentLogo: string | null;
  jobs: SyncJob[];
  onStartWizard: () => void;
  onDeleteJob: (id: string) => void;
}

type SettingsTab = 'visual' | 'company' | 'banners' | 'connection_plug' | 'roles' | 'instructor_levels' | 'course_info' | 'support_tags' | 'logs' | 'database' | 'sql_script' | 'ai_tutors';

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
  const [isSavingItem, setIsSavingItem] = useState(false); 
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [isLoadingBanners, setIsLoadingBanners] = useState(false);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const [companies, setCompanies] = useState<CompanySetting[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
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

  // AI Avatars
  const [aiAvatars, setAiAvatars] = useState<AiAvatar[]>([]);
  const [editingAvatar, setEditingAvatar] = useState<Partial<AiAvatar> | null>(null);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);
  const [avatarSpecInput, setAvatarSpecInput] = useState('');
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

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
      { id: 'cpf_lookup', label: 'Busca por CPF' },
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingBanner({ ...editingBanner, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const generateRepairSQL = () => `
-- SCRIPT DE REPARO SQL DEFINITIVO V18
-- Este script força a criação das tabelas de configuração de banco e limpa o cache da API.

-- 1. Garante extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela de Presets (Configurações Salvas de Banco)
-- Se a tabela não existir, ela será criada com a estrutura correta.
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

-- 3. Tabela de Conexões de Sincronização Ativas
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

-- 4. Garante permissões de privilégios para a API PostgREST
-- Essencial para que o Supabase reconheça as tabelas no cache.
GRANT ALL ON TABLE public.crm_presets TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.crm_sync_jobs TO postgres, anon, authenticated, service_role;

-- 5. Configuração de Row Level Security (RLS)
-- Define que qualquer pessoa (com a chave anon/service) pode ler e gravar por enquanto.
ALTER TABLE public.crm_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sync_jobs ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Acesso (Recria se existirem)
DROP POLICY IF EXISTS "Permitir acesso total crm_presets" ON public.crm_presets;
CREATE POLICY "Permitir acesso total crm_presets" ON public.crm_presets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir acesso total crm_sync_jobs" ON public.crm_sync_jobs;
CREATE POLICY "Permitir acesso total crm_sync_jobs" ON public.crm_sync_jobs FOR ALL USING (true) WITH CHECK (true);

-- 7. COMANDO CRÍTICO: Recarregar o cache do schema PostgREST
-- Resolve o erro "Could not find the table in the schema cache"
NOTIFY pgrst, 'reload schema';
`.trim();

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const loadAvatars = async () => {
      setIsLoadingAvatars(true);
      try {
          const { data } = await appBackend.client.from('crm_ai_avatars').select('*').order('created_at', { ascending: false });
          setAiAvatars(data || []);
      } catch (e) { console.error(e); } finally { setIsLoadingAvatars(false); }
  };

  useEffect(() => { if (activeTab === 'ai_tutors') loadAvatars(); }, [activeTab]);

  const handleSaveAvatar = async () => {
      if (!editingAvatar?.name || !editingAvatar?.personality_prompt) { alert('Preencha nome e prompt de personalidade.'); return; }
      setIsSavingItem(true);
      try {
          const payload = {
              name: editingAvatar.name,
              description: editingAvatar.description || '',
              avatar_image_url: editingAvatar.avatar_image_url || '',
              personality_prompt: editingAvatar.personality_prompt,
              specialties: editingAvatar.specialties || [],
              tone: editingAvatar.tone || 'friendly',
              is_active: editingAvatar.is_active !== false,
          };
          if (editingAvatar.id) {
              await appBackend.client.from('crm_ai_avatars').update(payload).eq('id', editingAvatar.id);
          } else {
              await appBackend.client.from('crm_ai_avatars').insert([payload]);
          }
          setEditingAvatar(null);
          loadAvatars();
      } catch (e: any) { alert('Erro ao salvar avatar: ' + e.message); } finally { setIsSavingItem(false); }
  };

  const handleAvatarImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 2 * 1024 * 1024) { alert('Imagem muito grande. Máximo: 2MB.'); return; }
          const reader = new FileReader();
          reader.onloadend = () => {
              setEditingAvatar(prev => prev ? { ...prev, avatar_image_url: reader.result as string } : null);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleDeleteAvatar = async (id: string) => {
      if (!window.confirm('Excluir este tutor IA permanentemente?')) return;
      try {
          await appBackend.client.from('crm_ai_avatars').delete().eq('id', id);
          loadAvatars();
      } catch (e: any) { alert('Erro: ' + e.message); }
  };

  const TONE_LABELS: Record<AvatarTone, string> = { formal: 'Formal', friendly: 'Amigável', motivational: 'Motivacional', technical: 'Técnico' };
  const TONE_COLORS: Record<AvatarTone, string> = { formal: 'bg-slate-100 text-slate-700', friendly: 'bg-emerald-50 text-emerald-700', motivational: 'bg-amber-50 text-amber-700', technical: 'bg-indigo-50 text-indigo-700' };

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
                { id: 'sql_script', label: 'SQL', color: 'text-red-700' },
                { id: 'ai_tutors', label: 'Tutores IA', color: 'text-purple-700' }
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
                    <div><h3 className="text-lg font-bold text-slate-800">Gestão de Banners</h3><p className="text-xs text-slate-500">Publicidade interna para Alunos e Instrutores.</p></div>
                    <button onClick={() => setEditingBanner({ title: '', imageUrl: '', linkUrl: '', targetAudience: 'student', active: true })} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all hover:bg-orange-700 active:scale-95"><Plus size={16}/> Novo Banner</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isLoadingBanners ? <div className="col-span-full py-12 flex justify-center"><Loader2 className="animate-spin text-orange-600" /></div> : banners.map(banner => (
                        <div key={banner.id} className={clsx("bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group", !banner.active && "opacity-50")}>
                            <div className="h-32 bg-slate-100 relative overflow-hidden shrink-0">
                                {banner.imageUrl ? <img src={banner.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={32}/></div>}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingBanner(banner)} className="p-1.5 bg-white rounded-lg text-slate-600 shadow-lg hover:text-orange-600"><Edit2 size={14}/></button>
                                    <button onClick={() => { if(window.confirm("Excluir banner?")) appBackend.deleteBanner(banner.id).then(fetchBanners); }} className="p-1.5 bg-white rounded-lg text-slate-600 shadow-lg hover:text-red-600"><Trash2 size={14}/></button>
                                </div>
                            </div>
                            <div className="p-4 flex-1">
                                <h4 className="font-bold text-slate-800 text-sm truncate">{banner.title}</h4>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{banner.targetAudience === 'student' ? 'Alunos' : 'Instrutores'}</span>
                                    <span className={clsx("text-[9px] font-bold px-2 py-0.5 rounded", banner.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>{banner.active ? 'Ativo' : 'Pausado'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'roles' && (
            <div className="space-y-6 animate-in slide-in-from-left-2">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div><h3 className="text-lg font-bold text-slate-800">Perfis de Acesso</h3><p className="text-xs text-slate-500">Defina o que cada colaborador pode visualizar no ecossistema.</p></div>
                    <button onClick={() => setEditingRole({ id: '', name: '', permissions: {} })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all hover:bg-indigo-700 active:scale-95"><Plus size={16}/> Novo Perfil</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoadingRoles ? <div className="col-span-full py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div> : roles.map(role => (
                        <div key={role.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Users size={20}/></div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingRole(role)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                    <button onClick={() => { if(window.confirm("Excluir perfil?")) appBackend.deleteRole(role.id).then(fetchRoles); }} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <h4 className="font-bold text-slate-800">{role.name}</h4>
                            <p className="text-xs text-slate-400 mt-1">{Object.keys(role.permissions || {}).length} módulos liberados</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'instructor_levels' && (
            <div className="space-y-6 animate-in slide-in-from-left-2">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div><h3 className="text-lg font-bold text-slate-800">Honorários Docentes</h3><p className="text-xs text-slate-500">Configuração de valores base por nível de experiência.</p></div>
                    <button onClick={() => setEditingLevel({ name: '', honorarium: 0 })} className="bg-rose-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Plus size={16}/> Novo Nível</button>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b font-bold text-slate-500 uppercase text-[10px] tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Nível</th>
                                <th className="px-6 py-4">Honorário Sugerido (R$)</th>
                                <th className="px-6 py-4">Observações</th>
                                <th className="px-6 py-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoadingLevels ? <tr><td colSpan={4} className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-rose-600" /></td></tr> : instructorLevels.map(lvl => (
                                <tr key={lvl.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-slate-800">{lvl.name}</td>
                                    <td className="px-6 py-4 font-black text-emerald-600">{formatCurrency(lvl.honorarium)}</td>
                                    <td className="px-6 py-4 text-slate-400 italic max-w-xs truncate">{lvl.observations || '--'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingLevel(lvl)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                            <button onClick={() => { if(window.confirm("Excluir nível?")) appBackend.deleteInstructorLevel(lvl.id).then(fetchInstructorLevels); }} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'connection_plug' && (
            <div className="space-y-6 animate-in slide-in-from-left-2">
                <div className="bg-slate-900 rounded-3xl p-10 text-white relative overflow-hidden shadow-xl mb-10">
                    <div className="absolute top-0 right-0 p-8 opacity-5"><Zap size={100}/></div>
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-indigo-500/30">CONEXÃO EXTERNA</div>
                        <h3 className="text-3xl font-black mb-2 tracking-tight">O Plug do CRM Comercial</h3>
                        <p className="text-indigo-100/70 text-base leading-relaxed max-w-xl">Configure gatilhos de automação. Quando uma negociação atingir um estágio específico, o sistema disparará um POST com os dados do cliente para o seu serviço de destino.</p>
                    </div>
                </div>

                <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800">Meus Gatilhos de Integração</h3>
                    <button onClick={() => { fetchPipelines(); setEditingTrigger({ pipelineName: 'Padrão', stageId: 'closed', payloadJson: '' }); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg active:scale-95"><Plus size={18}/> Novo Gatilho</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isLoadingTriggers ? <div className="col-span-full py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div> : webhookTriggers.map(trigger => (
                        <div key={trigger.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-xl transition-all group flex flex-col border-t-8 border-t-indigo-600">
                            <div className="flex justify-between items-start mb-6">
                                <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><Target size={24}/></div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => setEditingTrigger(trigger)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><Edit2 size={16}/></button>
                                    <button onClick={() => { if(window.confirm("Excluir gatilho?")) appBackend.deleteWebhookTrigger(trigger.id).then(fetchWebhookTriggers); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <div className="space-y-4 flex-1">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Funil:</span>
                                    <span className="text-sm font-black text-slate-800">{trigger.pipelineName}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estágio:</span>
                                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black border border-indigo-100 uppercase">{trigger.stageId}</span>
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-widest">
                                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500"/> Ativo</div>
                                <span className="opacity-50">#GATILHO-WEBHOOK</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'course_info' && (
            <div className="space-y-6 animate-in slide-in-from-left-2">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div><h3 className="text-lg font-bold text-slate-800">Ementas e Materiais Técnicos</h3><p className="text-xs text-slate-500">Informações técnicas exibidas para Alunos e Instrutores.</p></div>
                    <button onClick={() => setEditingCourseInfo({ courseName: '', details: '', materials: '', requirements: '' })} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Plus size={16}/> Novo Registro</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isLoadingCourseInfo ? <div className="col-span-full py-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div> : courseInfos.map(info => (
                        <div key={info.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><BookOpen size={24}/></div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingCourseInfo(info)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                                    <button onClick={() => { if(window.confirm("Excluir registro?")) appBackend.deleteCourseInfo(info.id).then(fetchCourseInfos); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <h4 className="font-bold text-slate-800 truncate" title={info.courseName}>{info.courseName}</h4>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-black">Última atualização: {new Date(info.updatedAt).toLocaleDateString()}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'support_tags' && (
            <div className="space-y-6 animate-in slide-in-from-left-2">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div><h3 className="text-lg font-bold text-slate-800">Categorias de Suporte</h3><p className="text-xs text-slate-500">Tags para classificação de chamados técnicos.</p></div>
                    <button onClick={() => setEditingTag({ name: '', role: 'all' })} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Plus size={16}/> Nova Tag</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {isLoadingTags ? <div className="col-span-full py-12 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div> : supportTags.map(tag => (
                        <div key={tag.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between group hover:border-emerald-300 transition-all">
                            <div><p className="font-bold text-slate-700 text-sm">{tag.name}</p><p className="text-[10px] text-slate-400 uppercase font-black">{tag.role}</p></div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditingTag(tag)} className="p-1 text-slate-400 hover:text-emerald-600"><Edit2 size={14}/></button><button onClick={() => { if(window.confirm("Excluir tag?")) appBackend.deleteSupportTag(tag.id).then(fetchSupportTags); }} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'logs' && (
            <div className="space-y-6 animate-in slide-in-from-left-2">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[600px] flex flex-col">
                    <div className="p-6 border-b flex justify-between items-center bg-slate-50"><div><h3 className="text-lg font-bold text-slate-800">Auditoria do Sistema</h3><p className="text-xs text-slate-500">Últimas 100 ações realizadas pelos usuários.</p></div><button onClick={fetchLogs} className="p-2 text-slate-400 hover:text-indigo-600"><RefreshCw size={20} className={isLoadingLogs ? "animate-spin" : ""}/></button></div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-100 sticky top-0 font-bold text-slate-500 uppercase tracking-widest z-10">
                                <tr><th className="px-6 py-4">Data/Hora</th><th className="px-6 py-4">Usuário</th><th className="px-6 py-4">Módulo</th><th className="px-6 py-4">Ação</th><th className="px-6 py-4">Detalhes</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoadingLogs ? <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></td></tr> : logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors"><td className="px-6 py-4 whitespace-nowrap text-slate-400 font-mono">{new Date(log.createdAt).toLocaleString()}</td><td className="px-6 py-4 font-bold text-slate-700">{log.userName}</td><td className="px-6 py-4 uppercase font-black text-[9px]"><span className="bg-slate-100 px-2 py-0.5 rounded border">{log.module}</span></td><td className="px-6 py-4"><span className={clsx("text-[10px] font-black uppercase", log.action === 'create' ? "text-green-600" : log.action === 'delete' ? "text-red-600" : "text-blue-600")}>{log.action}</span></td><td className="px-6 py-4 text-slate-500 italic max-w-md truncate" title={log.details}>"{log.details}"</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
                        <h3 className="text-xl font-black text-white flex items-center gap-3"><Terminal size={24} className="text-red-500"/> Script de Reparo Estrutural V18</h3>
                        <p className="text-slate-400 text-sm mt-2 max-w-xl font-medium leading-relaxed">Este script corrige o schema das tabelas e força o recarregamento do cache PostgREST (Supabase API) para suportar o salvamento de presets e conexões.</p>
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
        {activeTab === 'ai_tutors' && (
            <div className="space-y-6 animate-in slide-in-from-left-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><Bot size={20}/></div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Tutores IA (Avatares)</h3>
                            <p className="text-xs text-slate-500">Crie avatares com personalidades únicas para serem tutores dos alunos.</p>
                        </div>
                    </div>
                    <button onClick={() => { setEditingAvatar({ name: '', description: '', avatar_image_url: '', personality_prompt: '', specialties: [], tone: 'friendly', is_active: true }); setAvatarSpecInput(''); }} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95"><Plus size={16}/> Novo Tutor</button>
                </div>
                {isLoadingAvatars ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600" size={32}/></div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {aiAvatars.map(av => (
                            <div key={av.id} className={clsx("bg-white rounded-2xl border-2 p-6 transition-all hover:shadow-lg", av.is_active ? "border-slate-200" : "border-red-200 opacity-60")}>
                                <div className="flex items-start gap-4 mb-4">
                                    {av.avatar_image_url ? (
                                        <img src={av.avatar_image_url} alt={av.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-100"/>
                                    ) : (
                                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-black">{av.name.charAt(0)}</div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-slate-800 text-lg truncate">{av.name}</h4>
                                        <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded-full uppercase", TONE_COLORS[av.tone as AvatarTone] || TONE_COLORS.friendly)}>{TONE_LABELS[av.tone as AvatarTone] || av.tone}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{av.description || 'Sem descrição'}</p>
                                <div className="flex flex-wrap gap-1 mb-4">
                                    {(av.specialties || []).slice(0, 4).map((s, i) => (
                                        <span key={i} className="text-[8px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full border border-purple-100">{s}</span>
                                    ))}
                                    {(av.specialties || []).length > 4 && <span className="text-[8px] text-slate-400 font-bold">+{av.specialties.length - 4}</span>}
                                </div>
                                <div className="flex gap-2 border-t pt-3">
                                    <button onClick={() => { setEditingAvatar({ ...av }); setAvatarSpecInput(''); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all"><Edit2 size={14}/> Editar</button>
                                    <button onClick={() => handleDeleteAvatar(av.id)} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                        {aiAvatars.length === 0 && (
                            <div className="col-span-full py-20 bg-white rounded-2xl border-2 border-dashed flex flex-col items-center text-slate-300">
                                <Bot size={48} className="mb-4 opacity-20"/>
                                <p className="font-bold">Nenhum tutor IA criado</p>
                                <p className="text-xs mt-1">Clique em "Novo Tutor" para criar o primeiro avatar.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}
      </div>

      {/* AVATAR EDITOR MODAL */}
      {editingAvatar && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl my-8 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-8 py-5 border-b flex justify-between items-center bg-purple-50 shrink-0 rounded-t-[2rem]">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-600 text-white rounded-xl"><Bot size={20}/></div>
                          <h3 className="text-lg font-black text-slate-800">{editingAvatar.id ? 'Editar Tutor IA' : 'Novo Tutor IA'}</h3>
                      </div>
                      <button onClick={() => setEditingAvatar(null)} className="p-2 hover:bg-purple-100 rounded-full text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome do Tutor *</label>
                              <input type="text" className="w-full px-4 py-3 border rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none transition-all" value={editingAvatar.name || ''} onChange={e => setEditingAvatar({...editingAvatar, name: e.target.value})} placeholder="Ex: Prof. Ana, Coach Rodrigo"/>
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descrição (visível para o aluno)</label>
                              <textarea className="w-full px-4 py-3 border rounded-xl text-sm bg-slate-50 focus:bg-white outline-none transition-all resize-none" rows={2} value={editingAvatar.description || ''} onChange={e => setEditingAvatar({...editingAvatar, description: e.target.value})} placeholder="Instrutora com 20 anos de experiência em Pilates Clássico..."/>
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Foto do Tutor</label>
                              <div className="flex items-center gap-6 bg-slate-50 p-5 rounded-2xl border-2 border-dashed border-slate-200">
                                  <div className="w-24 h-24 rounded-2xl border-2 border-purple-100 flex items-center justify-center overflow-hidden shrink-0 bg-white shadow-lg">
                                      {editingAvatar.avatar_image_url ? (
                                          <img src={editingAvatar.avatar_image_url} alt="Preview" className="w-full h-full object-cover"/>
                                      ) : (
                                          <Bot className="text-slate-200" size={40}/>
                                      )}
                                  </div>
                                  <div className="flex-1 space-y-3">
                                      <p className="text-xs text-slate-500">Envie uma imagem do avatar (JPG, PNG, até 2MB).</p>
                                      <div className="flex gap-2">
                                          <button type="button" onClick={() => avatarFileInputRef.current?.click()} className="bg-white border-2 border-slate-200 text-slate-700 px-5 py-2 rounded-xl text-xs font-black uppercase hover:border-purple-500 shadow-sm flex items-center gap-2 transition-all active:scale-95"><Upload size={14}/> Enviar Imagem</button>
                                          {editingAvatar.avatar_image_url && (
                                              <button type="button" onClick={() => setEditingAvatar({...editingAvatar, avatar_image_url: ''})} className="px-3 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition-all"><Trash2 size={14}/></button>
                                          )}
                                      </div>
                                      <input type="file" ref={avatarFileInputRef} className="hidden" accept="image/*" onChange={handleAvatarImageUpload}/>
                                  </div>
                              </div>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tom de Comunicação</label>
                              <select className="w-full px-4 py-3 border rounded-xl text-sm font-bold bg-slate-50" value={editingAvatar.tone || 'friendly'} onChange={e => setEditingAvatar({...editingAvatar, tone: e.target.value as AvatarTone})}>
                                  <option value="friendly">Amigável</option>
                                  <option value="formal">Formal</option>
                                  <option value="motivational">Motivacional</option>
                                  <option value="technical">Técnico</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                              <select className="w-full px-4 py-3 border rounded-xl text-sm font-bold bg-slate-50" value={editingAvatar.is_active !== false ? 'true' : 'false'} onChange={e => setEditingAvatar({...editingAvatar, is_active: e.target.value === 'true'})}>
                                  <option value="true">Ativo</option>
                                  <option value="false">Inativo</option>
                              </select>
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Especialidades</label>
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                  {(editingAvatar.specialties || []).map((s, i) => (
                                      <span key={i} className="flex items-center gap-1 text-xs font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-200">
                                          {s}
                                          <button onClick={() => setEditingAvatar({...editingAvatar, specialties: (editingAvatar.specialties || []).filter((_, idx) => idx !== i)})} className="text-purple-400 hover:text-red-500"><X size={12}/></button>
                                      </span>
                                  ))}
                              </div>
                              <div className="flex gap-2">
                                  <input type="text" className="flex-1 px-4 py-2 border rounded-xl text-sm bg-slate-50" value={avatarSpecInput} onChange={e => setAvatarSpecInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && avatarSpecInput.trim()) { e.preventDefault(); setEditingAvatar({...editingAvatar, specialties: [...(editingAvatar.specialties || []), avatarSpecInput.trim()]}); setAvatarSpecInput(''); }}} placeholder="Pilates Clássico, Anatomia..."/>
                                  <button onClick={() => { if (avatarSpecInput.trim()) { setEditingAvatar({...editingAvatar, specialties: [...(editingAvatar.specialties || []), avatarSpecInput.trim()]}); setAvatarSpecInput(''); }}} className="px-3 py-2 bg-purple-100 text-purple-600 rounded-xl font-bold text-xs"><Plus size={14}/></button>
                              </div>
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Prompt de Personalidade * <span className="text-purple-500">(System Prompt do Avatar)</span></label>
                              <textarea className="w-full px-4 py-3 border rounded-xl text-sm bg-slate-50 focus:bg-white outline-none transition-all resize-none font-mono" rows={6} value={editingAvatar.personality_prompt || ''} onChange={e => setEditingAvatar({...editingAvatar, personality_prompt: e.target.value})} placeholder="Você é uma instrutora de Pilates com 20 anos de experiência, focada em método clássico. Sempre incentive o aluno e use analogias práticas do dia-a-dia para explicar conceitos complexos de biomecânica..."/>
                              <p className="text-[10px] text-slate-400 mt-1">Este texto define como o avatar vai se comportar nas conversas com os alunos.</p>
                          </div>
                      </div>
                  </div>
                  <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3 shrink-0 rounded-b-[2rem]">
                      <button onClick={() => setEditingAvatar(null)} className="px-6 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
                      <button onClick={handleSaveAvatar} disabled={isSavingItem} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 active:scale-95 disabled:opacity-50">{isSavingItem ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18}/>} Salvar Tutor</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODALS CRUD SETTINGS */}
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

      {editingBanner && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl animate-in zoom-in-95 overflow-hidden">
                  <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-black text-slate-800">{editingBanner.id ? 'Editar Banner' : 'Novo Banner Publicitário'}</h3>
                      <button onClick={() => setEditingBanner(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Título Interno</label>
                              <input type="text" className="w-full px-4 py-2 border rounded-xl text-sm font-bold" value={editingBanner.title || ''} onChange={e => setEditingBanner({...editingBanner, title: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Link de Redirecionamento (URL)</label>
                              <input type="text" className="w-full px-4 py-2 border rounded-xl text-xs font-mono text-blue-600" value={editingBanner.linkUrl || ''} onChange={e => setEditingBanner({...editingBanner, linkUrl: e.target.value})} placeholder="https://..." />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Público Destino</label>
                              <select className="w-full px-4 py-2 border rounded-xl text-sm bg-white" value={editingBanner.targetAudience} onChange={e => setEditingBanner({...editingBanner, targetAudience: e.target.value as any})}>
                                  <option value="student">Área do Aluno</option>
                                  <option value="instructor">Área do Instrutor</option>
                              </select>
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Upload da Imagem</label>
                              <div className="flex items-center gap-4">
                                  <div className="w-32 h-20 bg-slate-50 border rounded-lg flex items-center justify-center p-2 overflow-hidden">
                                      {editingBanner.imageUrl ? <img src={editingBanner.imageUrl} className="max-w-full max-h-full object-contain" /> : <ImageIcon className="text-slate-300" size={24}/>}
                                  </div>
                                  <input type="file" className="hidden" ref={bannerFileInputRef} accept="image/*" onChange={handleImageUpload} />
                                  <button onClick={() => bannerFileInputRef.current?.click()} className="text-xs font-black uppercase text-orange-600 bg-orange-50 px-4 py-2 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors">Selecionar Arquivo</button>
                              </div>
                          </div>
                      </div>
                      <div className="pt-4 border-t flex justify-end gap-3">
                          <button onClick={() => setEditingBanner(null)} className="px-6 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
                          <button onClick={handleSaveBanner} disabled={isSavingItem} className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-2.5 rounded-xl font-bold text-sm shadow-xl active:scale-95 disabled:opacity-50">{isSavingItem ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Banner</button>
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
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Título do Nível</label>
                              <input type="text" className="w-full px-4 py-2 border rounded-xl text-sm font-bold" value={editingLevel.name || ''} onChange={e => setEditingLevel({...editingLevel, name: e.target.value})} placeholder="Ex: Master Instructor" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Honorário Base (R$)</label>
                              <input type="number" className="w-full px-4 py-2 border rounded-xl text-sm font-black text-emerald-600" value={editingLevel.honorarium || 0} onChange={e => setEditingLevel({...editingLevel, honorarium: parseFloat(e.target.value) || 0})} />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Observações Internas</label>
                              <textarea className="w-full px-4 py-2 border rounded-xl text-sm h-24 resize-none" value={editingLevel.observations || ''} onChange={e => setEditingLevel({...editingLevel, observations: e.target.value})} />
                          </div>
                      </div>
                      <div className="pt-4 border-t flex justify-end gap-3">
                          <button onClick={() => setEditingLevel(null)} className="px-6 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
                          <button onClick={handleSaveLevel} disabled={isSavingItem} className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-2.5 rounded-xl font-bold text-sm shadow-xl active:scale-95 disabled:opacity-50">{isSavingItem ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Nível</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {editingTrigger && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="text-lg font-black text-slate-800">Configurar Gatilho Connection Plug</h3>
                      <button onClick={() => setEditingTrigger(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Funil de Vendas</label>
                              <select className="w-full px-4 py-2 border rounded-xl text-sm font-bold bg-white" value={editingTrigger.pipelineName} onChange={e => setEditingTrigger({...editingTrigger, pipelineName: e.target.value, stageId: ''})}>
                                  {pipelines.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Etapa Ativadora</label>
                              <select className="w-full px-4 py-2 border rounded-xl text-sm bg-white" value={editingTrigger.stageId} onChange={e => setEditingTrigger({...editingTrigger, stageId: e.target.value})}>
                                  {(pipelines.find(p => p.name === editingTrigger.pipelineName)?.stages || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                              </select>
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Payload Customizado (JSON) - Opcional</label>
                              <textarea className="w-full px-4 py-3 border rounded-xl text-[11px] font-mono h-48 resize-none bg-slate-50" value={editingTrigger.payloadJson || ''} onChange={e => setEditingTrigger({...editingTrigger, payloadJson: e.target.value})} placeholder='{"data": "{{data_venda}}", "aluno": "{{nome_cliente}}"}' />
                              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                  <p className="text-[10px] font-black text-blue-700 uppercase mb-2 flex items-center gap-1"><Info size={12}/> Tags Disponíveis para Mapeamento:</p>
                                  <div className="flex flex-wrap gap-1.5">
                                      {["{{data_venda}}", "{{nome_cliente}}", "{{email_cliente}}", "{{telefone_cliente}}", "{{valor_total}}", "{{curso_produto}}", "{{nome_vendedor}}"].map(tag => (
                                          <button key={tag} onClick={() => setEditingTrigger({...editingTrigger, payloadJson: (editingTrigger.payloadJson || '') + tag})} className="bg-white border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-mono text-blue-600 hover:bg-blue-100">{tag}</button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
                      <button onClick={() => setEditingTrigger(null)} className="px-6 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
                      <button onClick={handleSaveTrigger} disabled={isSavingItem} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 active:scale-95 disabled:opacity-50">{isSavingItem ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Gatilho</button>
                  </div>
              </div>
          </div>
      )}

      {editingCourseInfo && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl my-8 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="text-lg font-black text-slate-800">Ementa e Material do Aluno</h3>
                      <button onClick={() => setEditingCourseInfo(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Curso / Treinamento</label>
                          <input type="text" className="w-full px-4 py-2 border rounded-xl text-sm font-bold" value={editingCourseInfo.courseName || ''} onChange={e => setEditingCourseInfo({...editingCourseInfo, courseName: e.target.value})} placeholder="Ex: Formação Completa em Pilates" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Ementa Detalhada</label>
                              <textarea className="w-full px-4 py-2 border rounded-xl text-sm h-48 resize-none" value={editingCourseInfo.details || ''} onChange={e => setEditingCourseInfo({...editingCourseInfo, details: e.target.value})} placeholder="Descreva os tópicos do curso..." />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Materiais e Links</label>
                              <textarea className="w-full px-4 py-2 border rounded-xl text-sm h-48 resize-none font-mono text-[11px]" value={editingCourseInfo.materials || ''} onChange={e => setEditingCourseInfo({...editingCourseInfo, materials: e.target.value})} placeholder="Links para download de apostilas..." />
                          </div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Pré-requisitos / Instruções Preparatórias</label>
                          <textarea className="w-full px-4 py-2 border rounded-xl text-sm h-24 resize-none" value={editingCourseInfo.requirements || ''} onChange={e => setEditingCourseInfo({...editingCourseInfo, requirements: e.target.value})} placeholder="O que o aluno deve levar ou estudar antes..." />
                      </div>
                  </div>
                  <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
                      <button onClick={() => setEditingCourseInfo(null)} className="px-6 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
                      <button onClick={() => { setIsSavingItem(true); appBackend.saveCourseInfo(editingCourseInfo).then(() => { fetchCourseInfos(); setEditingCourseInfo(null); }).finally(() => setIsSavingItem(false)); }} disabled={isSavingItem} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-xl font-bold text-sm shadow-xl active:scale-95 disabled:opacity-50">{isSavingItem ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Ementa</button>
                  </div>
              </div>
          </div>
      )}

      {editingTag && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                  <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800">Configurar Tag Suporte</h3>
                      <button onClick={() => setEditingTag(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome da Tag</label>
                          <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm font-bold" value={editingTag.name} onChange={e => setEditingTag({...editingTag, name: e.target.value})} placeholder="Ex: Financeiro" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Restringir ao Público</label>
                          <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={editingTag.role} onChange={e => setEditingTag({...editingTag, role: e.target.value as any})}>
                              <option value="all">Visível para Todos</option>
                              <option value="student">Apenas Alunos</option>
                              <option value="instructor">Apenas Instrutores</option>
                              <option value="studio">Apenas Studios</option>
                          </select>
                      </div>
                      <div className="pt-4 flex justify-end gap-2">
                          <button onClick={() => setEditingTag(null)} className="px-4 py-2 text-sm font-medium text-slate-600">Cancelar</button>
                          <button onClick={() => { setIsSavingItem(true); appBackend.saveSupportTag(editingTag).then(() => { fetchSupportTags(); setEditingTag(null); }).finally(() => setIsSavingItem(false)); }} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md">Salvar Tag</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

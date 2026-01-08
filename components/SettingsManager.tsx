
import React, { useState, useEffect, useRef } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, 
    Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Layout, ExternalLink, Trash2, BarChart3, Building2, Plus, Edit2,
    Monitor, Globe, Target, Info, Shield, TrendingUp, DollarSign,
    Loader2, Package, Tag, Layers, Palette, History, Clock, User, Search,
    Play, Pause, Calendar, Smartphone, Link as LinkIcon, ChevronDown, Award, 
    ShoppingBag, Zap, Filter, List, ArrowRight, MoveRight, Braces, Sparkles, 
    RefreshCw, BookOpen, Book, ListTodo, Eye, MessageSquare, Flag
} from 'lucide-react';
import { appBackend, CompanySetting, WebhookTrigger, Pipeline } from '../services/appBackend';
import { Role, Role as UserRole, Banner, InstructorLevel, ActivityLog, SyncJob, Product, CourseInfo } from '../types';
import clsx from 'clsx';

interface SettingsManagerProps {
  onLogoChange: (newLogo: string | null) => void;
  currentLogo: string | null;
  jobs: SyncJob[];
  onStartWizard: () => void;
  onDeleteJob: (id: string) => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ 
  onLogoChange, currentLogo, jobs, onStartWizard, onDeleteJob
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'roles' | 'companies' | 'levels' | 'banners' | 'connections' | 'webhooks' | 'logs' | 'database'>('visual');
  const [isSaving, setIsSaving] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Data States
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [companies, setCompanies] = useState<CompanySetting[]>([]);
  const [instructorLevels, setInstructorLevels] = useState<InstructorLevel[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [webhookTriggers, setWebhookTriggers] = useState<WebhookTrigger[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  const loadAllData = async () => {
    setIsSaving(true);
    try {
      if (activeTab === 'roles') {
          const r = await appBackend.getRoles();
          setRoles(r || []);
      } else if (activeTab === 'companies') {
          const c = await appBackend.getCompanies();
          setCompanies(c || []);
      } else if (activeTab === 'levels') {
          const l = await appBackend.getInstructorLevels();
          setInstructorLevels(l || []);
      } else if (activeTab === 'banners') {
          const b1 = await appBackend.getBanners('student');
          const b2 = await appBackend.getBanners('instructor');
          setBanners([...(b1 || []), ...(b2 || [])]);
      } else if (activeTab === 'webhooks') {
          const [w, p] = await Promise.all([
              appBackend.getWebhookTriggers(),
              appBackend.getPipelines()
          ]);
          setWebhookTriggers(w || []);
          setPipelines(p || []);
      } else if (activeTab === 'logs') {
          const { data } = await appBackend.client.from('crm_activity_logs').select('*').order('created_at', { ascending: false }).limit(50);
          setActivityLogs(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onLogoChange(base64);
        appBackend.saveAppLogo(base64);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const generateRepairSQL = () => `
-- SCRIPT DE MANUTENÇÃO INTEGRAL VOLL CRM
-- 1. Tabela de Chamados de Suporte
CREATE TABLE IF NOT EXISTS public.crm_support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    status text NOT NULL DEFAULT 'open',
    priority text NOT NULL DEFAULT 'medium',
    sender_id text NOT NULL,
    sender_name text NOT NULL,
    sender_type text NOT NULL CHECK (sender_type IN ('student', 'instructor', 'studio', 'admin')),
    assigned_to text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Tabela de Mensagens do Chat de Suporte
CREATE TABLE IF NOT EXISTS public.crm_support_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid REFERENCES public.crm_support_tickets(id) ON DELETE CASCADE,
    sender_id text NOT NULL,
    sender_name text NOT NULL,
    sender_type text NOT NULL CHECK (sender_type IN ('user', 'admin')),
    content text NOT NULL,
    attachments text[] DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- Permissões
GRANT ALL ON public.crm_support_tickets TO anon, authenticated, service_role;
GRANT ALL ON public.crm_support_messages TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload config';
  `.trim();

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };

  return (
    <div className="animate-in fade-in space-y-8 pb-20">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Configurações Globais</h2>
          <p className="text-sm text-slate-500 font-medium">Administração técnica, permissões e automações do sistema.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar shrink-0 gap-1">
          {[
            { id: 'visual', label: 'Visual', icon: Palette },
            { id: 'roles', label: 'Cargos', icon: Lock },
            { id: 'companies', label: 'Empresas', icon: Building2 },
            { id: 'levels', label: 'Docente', icon: Award },
            { id: 'banners', label: 'Banners', icon: Flag },
            { id: 'connections', label: 'Conexões', icon: LinkIcon },
            { id: 'webhooks', label: 'Gatilhos', icon: Zap },
            { id: 'logs', label: 'Auditoria', icon: History },
            { id: 'database', label: 'Banco', icon: Database },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                activeTab === tab.id ? "bg-slate-800 text-white shadow-lg shadow-slate-200" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- ABA VISUAL --- */}
      {activeTab === 'visual' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-left-2">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-8">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4">
              <ImageIcon size={20} className="text-teal-600" /> Branding da Unidade
            </h3>
            <div className="flex flex-col items-center gap-8 py-6">
              <div className="w-64 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center p-6 overflow-hidden relative group transition-all hover:border-teal-400">
                {currentLogo ? (
                  <img src={currentLogo} alt="Preview" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma Logo</span>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => fileInputRef.current?.click()} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-teal-600/20 transition-all active:scale-95">
                  <Upload size={16} /> Upload Logo
                </button>
                {currentLogo && (
                  <button onClick={() => { onLogoChange(null); appBackend.saveAppLogo(""); }} className="bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all">Resetar</button>
                )}
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              <p className="text-[10px] text-slate-400 text-center max-w-xs font-bold leading-relaxed">
                A logo será aplicada em todos os portais (Aluno, Instrutor, Studio) e formulários públicos.
              </p>
            </div>
          </div>
          <div className="bg-slate-800 rounded-[2rem] p-10 text-white relative overflow-hidden flex flex-col justify-center shadow-2xl">
             <div className="absolute top-0 right-0 p-10 opacity-5"><Sparkles size={160} /></div>
             <h4 className="text-3xl font-black mb-4 tracking-tighter leading-tight">Identidade Visual Unificada</h4>
             <p className="text-slate-400 font-medium text-lg leading-relaxed mb-8">Personalize como os alunos e instrutores visualizam a marca VOLL nos portais de acesso.</p>
             <div className="flex items-center gap-4">
                <div className="h-2 w-32 bg-teal-500 rounded-full"></div>
                <div className="h-2 w-8 bg-white/10 rounded-full"></div>
             </div>
          </div>
        </div>
      )}

      {/* --- ABA CARGOS (Roles) --- */}
      {activeTab === 'roles' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
          <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest text-xs">
              <Lock size={16} className="text-indigo-600" /> Níveis de Acesso e Permissões
            </h3>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all hover:bg-indigo-700">
              <Plus size={16} /> Novo Perfil
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map(role => (
              <div key={role.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm group hover:shadow-xl transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><Shield size={24} /></div>
                  <button className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                </div>
                <h4 className="text-lg font-black text-slate-800 mb-2">{role.name}</h4>
                <div className="space-y-1.5 mb-6">
                  {Object.entries(role.permissions).slice(0, 5).map(([mod, allowed]) => (
                    <div key={mod} className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
                      <span className="text-slate-400">{mod}</span>
                      {allowed ? <Check size={12} className="text-green-600"/> : <X size={12} className="text-slate-300"/>}
                    </div>
                  ))}
                  {Object.keys(role.permissions).length > 5 && (
                    <p className="text-[9px] text-indigo-400 font-bold italic pt-1">+ {Object.keys(role.permissions).length - 5} permissões extras</p>
                  )}
                </div>
                <button className="w-full py-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Editar Permissões</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ABA EMPRESAS (Billing Companies) --- */}
      {activeTab === 'companies' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-slate-800 text-sm uppercase flex items-center gap-2"><Building2 size={18} className="text-blue-600"/> Empresas de Faturamento (Multi-CNPJ)</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase shadow-lg shadow-blue-600/20"><Plus size={16}/> Adicionar Empresa</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companies.map(company => (
                <div key={company.id} className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all group">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-black text-slate-800 leading-tight">{company.legalName}</h4>
                        <p className="text-[10px] font-mono text-slate-400">CNPJ: {company.cnpj}</p>
                      </div>
                      <button className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Edit2 size={16}/></button>
                   </div>
                   <div className="space-y-3">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-t pt-3">
                        <Zap size={12}/> Automação de Vendas
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(company.productTypes || []).map(t => <span key={t} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded uppercase">{t}</span>)}
                      </div>
                      <div className="text-[10px] bg-white border border-slate-200 p-2 rounded-lg truncate text-slate-400 font-mono">
                        Webhook: {company.webhookUrl || 'Sem URL configurada'}
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- ABA NÍVEIS DOCENTES --- */}
      {activeTab === 'levels' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-2">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-800 text-sm uppercase flex items-center gap-2"><Award size={18} className="text-amber-500"/> Níveis Docentes e Honorários</h3>
            <button className="bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase"><Plus size={16}/> Novo Nível</button>
          </div>
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
             <table className="w-full text-left border-collapse">
               <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4">Nível</th>
                    <th className="px-8 py-4">Valor Base (Honorário)</th>
                    <th className="px-8 py-4">Observações Técnicas</th>
                    <th className="px-8 py-4 text-right">Ação</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {instructorLevels.map(level => (
                    <tr key={level.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-4 font-black text-slate-800">{level.name}</td>
                      <td className="px-8 py-4 font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(level.honorarium)}</td>
                      <td className="px-8 py-4 text-xs text-slate-500">{level.observations || '--'}</td>
                      <td className="px-8 py-4 text-right">
                        <button className="p-2 text-slate-400 hover:text-amber-600"><Edit2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {/* --- ABA BANNERS --- */}
      {activeTab === 'banners' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
            <h3 className="font-black text-slate-800 text-sm uppercase flex items-center gap-2"><Flag size={18} className="text-orange-600"/> Publicidade Interna (Banners)</h3>
            <button className="bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase"><Plus size={16}/> Novo Banner</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.map(banner => (
                <div key={banner.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden group shadow-sm hover:shadow-lg transition-all">
                    <div className="h-32 bg-slate-100 relative">
                        {banner.imageUrl ? <img src={banner.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={32} className="text-slate-300"/></div>}
                        <div className="absolute top-2 right-2 flex gap-1">
                            <button className="bg-white/80 p-1.5 rounded-lg text-slate-600 hover:text-orange-600"><Edit2 size={14}/></button>
                            <button className="bg-white/80 p-1.5 rounded-lg text-slate-600 hover:text-red-600"><Trash2 size={14}/></button>
                        </div>
                    </div>
                    <div className="p-4">
                        <h4 className="font-bold text-slate-800 text-sm mb-1">{banner.title}</h4>
                        <div className="flex items-center justify-between mt-4">
                            <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded border uppercase", banner.targetAudience === 'student' ? "bg-purple-50 text-purple-700" : "bg-orange-50 text-orange-700")}>
                                Alvo: {banner.targetAudience === 'student' ? 'Alunos' : 'Instrutores'}
                            </span>
                            <div className={clsx("w-2 h-2 rounded-full", banner.active ? "bg-green-500" : "bg-red-400")}></div>
                        </div>
                    </div>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ABA CONEXÕES (Sync Jobs) --- */}
      {activeTab === 'connections' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2"><LinkIcon size={16} className="text-indigo-600"/> Sincronização em Tempo Real</h3>
            <button onClick={onStartWizard} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all"><Plus size={16}/> Nova Conexão</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.length === 0 ? (
              <div className="col-span-full p-20 text-center text-slate-400 italic bg-white rounded-2xl border-2 border-dashed">Nenhuma conexão de sincronização configurada.</div>
            ) : jobs.map(job => (
              <div key={job.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4 group hover:border-indigo-300 transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={clsx("p-2 rounded-lg", job.active ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400")}>
                      <RefreshCw size={20} className={clsx(job.status === 'syncing' && "animate-spin")} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 leading-tight">{job.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Destino: {job.config.tableName}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => onDeleteJob(job.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Último Ciclo</span>
                    <span className="text-xs font-bold text-slate-700">{job.lastSync ? new Date(job.lastSync).toLocaleString('pt-BR') : 'Pendente'}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Frequência</span>
                    <span className="text-xs font-bold text-slate-700">{job.intervalMinutes} min</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 italic bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 overflow-hidden">
                    <div className={clsx("w-2 h-2 rounded-full shrink-0", job.status === 'success' ? "bg-green-500" : job.status === 'error' ? "bg-red-500" : "bg-amber-500")}></div>
                    <span className="truncate">{job.lastMessage || 'Aguardando primeiro ciclo...'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ABA WEBHOOKS (Gatilhos) --- */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
          <div className="bg-indigo-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
            <div className="absolute top-0 right-0 p-10 opacity-10"><Zap size={140} /></div>
            <div className="relative z-10 max-w-xl">
              <h3 className="text-3xl font-black mb-4 tracking-tighter">Connection Plug</h3>
              <p className="text-indigo-200 font-medium text-lg leading-relaxed">Configure gatilhos inteligentes para enviar dados do CRM para as empresas de faturamento via Webhook no exato momento em que um negócio muda de etapa.</p>
            </div>
            <button className="bg-indigo-500 hover:bg-indigo-400 text-white px-10 py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-indigo-600/30 transition-all active:scale-95 shrink-0 relative z-10">Configurar Gatilho</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {webhookTriggers.length === 0 ? (
                 <div className="md:col-span-2 p-12 text-center text-slate-400 italic bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    Nenhum gatilho de automação ativo.
                 </div>
             ) : webhookTriggers.map(trigger => {
                 const pipe = pipelines.find(p => p.name === trigger.pipelineName);
                 const stage = pipe?.stages.find(s => s.id === trigger.stageId);
                 return (
                    <div key={trigger.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4 group">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Zap size={18}/></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Automated Trigger</span>
                            </div>
                            <button className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                        </div>
                        <div className="flex items-center gap-4 py-2">
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Origem (Etapa CRM)</p>
                                <div className="font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">{trigger.pipelineName} > {stage?.title || trigger.stageId}</div>
                            </div>
                            <div className="text-slate-300"><MoveRight size={24}/></div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-teal-400 uppercase mb-1">Destino (Webhook)</p>
                                <div className="font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 truncate">Endpoint Empresa</div>
                            </div>
                        </div>
                        <div className="mt-2 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Payload: {trigger.payloadJson ? 'Customizado' : 'Padrão CRM'}</span>
                            <button className="text-indigo-600 text-[10px] font-black uppercase hover:underline">Ver JSON</button>
                        </div>
                    </div>
                 );
             })}
          </div>
        </div>
      )}

      {/* --- ABA AUDITORIA (Logs) --- */}
      {activeTab === 'logs' && (
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-black text-slate-800 text-sm uppercase flex items-center gap-2"><History size={18} className="text-slate-500"/> Registro de Auditoria (Logs)</h3>
                  <button onClick={loadAllData} className="text-slate-400 hover:text-slate-600 transition-colors"><RefreshCw size={16} className={isSaving ? "animate-spin" : ""} /></button>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-widest">
                          <tr>
                              <th className="p-4">Data/Hora</th>
                              <th className="p-4">Usuário</th>
                              <th className="p-4">Módulo</th>
                              <th className="p-4">Ação</th>
                              <th className="p-4">Detalhes</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {activityLogs.map(log => (
                              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-4 font-mono text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                                  <td className="p-4 font-bold text-slate-700">{log.userName}</td>
                                  <td className="p-4"><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase">{log.module}</span></td>
                                  <td className="p-4 font-black uppercase tracking-tighter">{log.action}</td>
                                  <td className="p-4 text-slate-500 truncate max-w-xs">{log.details}</td>
                              </tr>
                          ))}
                          {activityLogs.length === 0 && <tr><td colSpan={5} className="p-20 text-center text-slate-400 italic">Nenhuma atividade registrada ainda.</td></tr>}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- ABA BANCO DE DADOS --- */}
      {activeTab === 'database' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-10 space-y-8 animate-in zoom-in-95">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
            <div className="bg-red-50 p-3 rounded-2xl text-red-600 shadow-sm"><Database size={32} /></div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 leading-tight">Manutenção de Dados (V22)</h3>
              <p className="text-sm text-slate-500 font-medium">Reparo de estruturas de banco de dados e otimização de consultas.</p>
            </div>
          </div>
          
          <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 flex gap-4">
            <AlertTriangle className="text-amber-600 shrink-0" size={24} />
            <div>
              <h4 className="font-black text-amber-900 mb-1 uppercase text-xs tracking-wider">Aviso de Integridade</h4>
              <p className="text-sm text-amber-800 leading-relaxed font-medium">Rode este script no editor SQL do seu dashboard Supabase para habilitar o novo **Sistema de Suporte Interno** e garantir que todas as tabelas de CRM e RH tenham os campos necessários para esta versão.</p>
            </div>
          </div>

          {!showSql ? (
            <button onClick={() => setShowSql(true)} className="w-full py-4 bg-slate-900 text-slate-100 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98]">Gerar Script de Reparo V22</button>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-top-4">
              <div className="relative">
                <pre className="bg-slate-950 text-amber-400 p-6 rounded-2xl text-[11px] font-mono overflow-auto max-h-[400px] border border-slate-800 leading-relaxed custom-scrollbar shadow-inner">{generateRepairSQL()}</pre>
                <button onClick={copySql} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 backdrop-blur-md border border-white/10">
                  {sqlCopied ? <><Check size={14} className="text-green-400" /> Copiado!</> : <><Copy size={14} /> Copiar SQL</>}
                </button>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-400 px-2 italic font-medium">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>Este script é "idempotente" (pode ser executado múltiplas vezes sem causar danos).</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

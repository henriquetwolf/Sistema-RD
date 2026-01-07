
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, 
    Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Layout, ExternalLink, Trash2, BarChart3, Building2, Plus, Edit2,
    Monitor, Globe, Target, Info, Shield, TrendingUp, DollarSign,
    Loader2, Package, Tag, Layers, Palette, History, Clock, User, Search,
    Play, Pause, Calendar, Smartphone, Link as LinkIcon, ChevronDown, Award, ShoppingBag, Zap, Filter,
    List, ArrowRight, Braces, Sparkles, RefreshCw, BookOpen, Book, ListTodo
} from 'lucide-react';
import { appBackend, CompanySetting, WebhookTrigger, Pipeline } from '../services/appBackend';
import { Role, Role as UserRole, Banner, InstructorLevel, ActivityLog, SyncJob, Product, CourseInfo } from '../types';
import clsx from 'clsx';

interface SettingsManagerProps {
  onLogoChange: (newLogo: string | null) => void;
  currentLogo: string;
  jobs: SyncJob[];
  onStartWizard: () => void;
  onDeleteJob: (id: string) => Promise<void>;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ 
  onLogoChange, 
  currentLogo,
  jobs,
  onStartWizard,
  onDeleteJob
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'connections' | 'company' | 'roles' | 'database' | 'banners' | 'instructor_levels' | 'logs' | 'connection_plug' | 'course_info'>('visual');
  const [preview, setPreview] = useState<string | null>(currentLogo);
  const [securityMargin, setSecurityMargin] = useState<number>(5);
  const [isSaved, setIsSaved] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // External Data
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [levels, setLevels] = useState<InstructorLevel[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [companies, setCompanies] = useState<CompanySetting[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [webhookTriggers, setWebhookTriggers] = useState<WebhookTrigger[]>([]);
  const [coursesInfo, setCoursesInfo] = useState<CourseInfo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
      setIsLoading(true);
      try {
          if (activeTab === 'visual') {
              const margin = await appBackend.getInventorySecurityMargin();
              setSecurityMargin(margin);
          }
          if (activeTab === 'roles') setRoles(await appBackend.getRoles());
          if (activeTab === 'banners') setBanners(await appBackend.getBanners());
          if (activeTab === 'instructor_levels') setLevels(await appBackend.getInstructorLevels());
          if (activeTab === 'logs') setLogs(await appBackend.getActivityLogs());
          if (activeTab === 'company' || activeTab === 'connection_plug') {
              setCompanies(await appBackend.getCompanies());
              setPipelines(await appBackend.getPipelines());
              setWebhookTriggers(await appBackend.getWebhookTriggers());
              const { data } = await appBackend.client.from('crm_products').select('id, name').eq('status', 'active');
              if (data) setProducts(data.map((p: any) => ({ id: p.id, name: p.name } as any)));
          }
          if (activeTab === 'course_info') setCoursesInfo(await appBackend.getCourseInfos());
      } catch (e) {} finally { setIsLoading(false); }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSaveVisual = async () => {
    setIsSaved(false);
    if (preview) {
        await appBackend.saveAppLogo(preview);
        onLogoChange(preview);
    }
    await appBackend.saveInventorySecurityMargin(securityMargin);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const generateRepairSQL = () => `
-- SCRIPT DE REPARO DEFINITIVO VOLL CRM (V22 - SUPORTE)
-- Suporte a Chamados de Atendimento Interno
CREATE TABLE IF NOT EXISTS public.crm_support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    user_name text NOT NULL,
    user_email text NOT NULL,
    user_type text NOT NULL, -- student, instructor, studio
    subject text NOT NULL,
    category text,
    status text DEFAULT 'open',
    last_message text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_support_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid REFERENCES public.crm_support_tickets(id) ON DELETE CASCADE,
    sender_name text NOT NULL,
    sender_type text NOT NULL, -- user, agent
    text text NOT NULL,
    created_at timestamptz DEFAULT now()
);

GRANT ALL ON public.crm_support_tickets TO anon, authenticated, service_role;
GRANT ALL ON public.crm_support_messages TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.crm_teacher_news (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    image_url text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_form_folders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE IF EXISTS public.crm_forms 
ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.crm_form_folders(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.crm_companies 
ADD COLUMN IF NOT EXISTS product_ids text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS webhook_url text;

CREATE TABLE IF NOT EXISTS public.crm_webhook_triggers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_name text NOT NULL,
    stage_id text NOT NULL,
    payload_json text, 
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_course_info (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_name text UNIQUE NOT NULL,
    details text,
    materials text,
    requirements text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_billing_negotiations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    open_installments integer DEFAULT 0,
    total_negotiated_value numeric DEFAULT 0,
    total_installments integer DEFAULT 0,
    due_date date,
    responsible_agent text,
    identifier_code text,
    full_name text,
    product_name text,
    original_value numeric DEFAULT 0,
    payment_method text,
    observations text,
    status text DEFAULT 'EDIÇÃO PENDENTE',
    team text,
    voucher_link_1 text,
    test_date date,
    voucher_link_2 text,
    voucher_link_3 text,
    boletos_link text,
    negotiation_reference text,
    attachments text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT ALL ON public.crm_teacher_news TO anon, authenticated, service_role;
GRANT ALL ON public.crm_form_folders TO anon, authenticated, service_role;
GRANT ALL ON public.crm_webhook_triggers TO anon, authenticated, service_role;
GRANT ALL ON public.crm_billing_negotiations TO anon, authenticated, service_role;
GRANT ALL ON public.crm_course_info TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload config';
  `.trim();

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };

  const tabs = [
      { id: 'visual', label: 'Visual e Materiais', icon: Palette },
      { id: 'connections', label: 'Integrações Planilhas', icon: Globe },
      { id: 'connection_plug', label: 'Webhook Leads', icon: Zap },
      { id: 'company', label: 'Empresas / Faturamento', icon: Building2 },
      { id: 'roles', label: 'Permissões (Papéis)', icon: Shield },
      { id: 'banners', label: 'Banners Portais', icon: ImageIcon },
      { id: 'instructor_levels', label: 'Níveis Docentes', icon: Award },
      { id: 'course_info', label: 'Infos de Cursos', icon: Info },
      { id: 'logs', label: 'Logs do Sistema', icon: History },
      { id: 'database', label: 'Banco de Dados', icon: Database },
  ];

  return (
    <div className="animate-in fade-in duration-300 space-y-8 pb-20">
      <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner w-fit overflow-x-auto no-scrollbar max-w-full">
          {tabs.map(tab => (
              <button 
                key={tab.id} 
                onClick={() => { setActiveTab(tab.id as any); setShowSql(false); }} 
                className={clsx("px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2", activeTab === tab.id ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              >
                  <tab.icon size={16}/> {tab.label}
              </button>
          ))}
      </div>

      <div className="max-w-5xl space-y-8">
          {activeTab === 'visual' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
                      <div className="flex items-center gap-3 mb-4"><Palette className="text-teal-600" /><h3 className="text-lg font-bold text-slate-800">Identidade Visual</h3></div>
                      <div className="flex flex-col items-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 group relative">
                          <img src={preview || ''} alt="Preview" className="h-20 w-auto object-contain mb-6 drop-shadow-sm" />
                          <label className="bg-white px-4 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-all shadow-sm active:scale-95">
                              Alterar Logo do App
                              <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                          </label>
                      </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
                      <div className="flex items-center gap-3 mb-4"><Package className="text-teal-600" /><h3 className="text-lg font-bold text-slate-800">Parâmetros de Estoque</h3></div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Margem de Segurança (Unidades)</label>
                          <input type="number" className="w-full px-4 py-2 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none" value={securityMargin} onChange={e => setSecurityMargin(parseInt(e.target.value) || 0)} />
                          <p className="text-xs text-slate-400 mt-2">Define o limite para o alerta de "Necessita Remessa" na gestão de materiais.</p>
                      </div>
                      <button onClick={handleSaveVisual} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2">
                        {isSaved ? <><CheckCircle size={20} /> Configurações Salvas!</> : <><Save size={20} /> Salvar Alterações</>}
                      </button>
                  </div>
              </div>
          )}

          {activeTab === 'connections' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 animate-in slide-in-from-left-4">
                  <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3"><Globe className="text-teal-600" /><h3 className="text-lg font-bold text-slate-800">Integrações Automáticas de Planilhas</h3></div>
                      <button onClick={onStartWizard} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-teal-700 shadow-md active:scale-95 transition-all"><Plus size={16}/> Nova Integração</button>
                  </div>
                  <div className="space-y-4">
                      {jobs.length === 0 ? (
                          <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">Nenhuma integração automática configurada.</div>
                      ) : jobs.map(job => (
                          <div key={job.id} className="p-5 border border-slate-200 rounded-2xl hover:border-teal-500 transition-all group bg-slate-50/30">
                              <div className="flex justify-between items-start mb-2">
                                  <div>
                                      <h4 className="font-bold text-slate-800 flex items-center gap-2">{job.name} <span className={clsx("text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest", job.active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500")}>{job.active ? 'Ativo' : 'Pausado'}</span></h4>
                                      <p className="text-xs text-slate-400 mt-1 font-mono truncate max-w-md">{job.sheetUrl}</p>
                                  </div>
                                  <div className="flex gap-2">
                                      <button onClick={() => onDeleteJob(job.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                  </div>
                              </div>
                              <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-100">
                                  <div className="flex items-center gap-6">
                                      <div className="flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase">Tabela Destino</span><span className="text-xs font-bold text-slate-700">{job.config.tableName}</span></div>
                                      <div className="flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase">Frequência</span><span className="text-xs font-bold text-slate-700">{job.intervalMinutes} min</span></div>
                                      <div className="flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase">Último Ciclo</span><span className="text-xs font-bold text-slate-700">{job.lastSync ? new Date(job.lastSync).toLocaleString() : '--'}</span></div>
                                  </div>
                                  <div className={clsx("text-xs font-black px-3 py-1 rounded-lg uppercase tracking-widest border", job.status === 'success' ? "bg-green-50 text-green-700 border-green-200" : job.status === 'error' ? "bg-red-50 text-red-600 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200")}>{job.status}</div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {activeTab === 'database' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 animate-in slide-in-from-left-4">
                  <div className="flex items-center gap-3 mb-4"><Database className="text-amber-600" /><h3 className="text-lg font-bold text-slate-800">Manutenção de Tabelas (V22)</h3></div>
                  <p className="text-sm text-slate-500 mb-6 font-bold text-red-600 flex items-center gap-2"><AlertTriangle size={16}/> Use este script para habilitar o sistema de suporte unificado.</p>
                  {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm hover:bg-slate-800 transition-all">Gerar Script de Suporte V22</button> : (
                      <div className="relative animate-in slide-in-from-top-4">
                          <pre className="bg-black text-amber-400 p-4 rounded-lg text-[10px] font-mono overflow-auto max-h-[400px] border border-amber-900/50 leading-relaxed">{generateRepairSQL()}</pre>
                          <button onClick={copySql} className="absolute top-2 right-2 bg-slate-700 text-white px-3 py-1 rounded text-xs hover:bg-slate-600 font-bold">{sqlCopied ? 'Copiado!' : 'Copiar SQL'}</button>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 animate-in slide-in-from-left-4">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3"><History className="text-teal-600" /><h3 className="text-lg font-bold text-slate-800">Audit Trail (Atividade)</h3></div>
                    <button onClick={fetchData} className="p-2 text-slate-400 hover:text-teal-600"><RefreshCw size={18} className={isLoading ? "animate-spin" : ""}/></button>
                </div>
                <div className="space-y-3">
                    {logs.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">Nenhum log registrado.</div>
                    ) : logs.map(log => (
                        <div key={log.id} className="p-4 border-b border-slate-50 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <span className="font-mono text-slate-400 min-w-[120px]">{new Date(log.createdAt).toLocaleString()}</span>
                                <span className="font-bold text-slate-700 w-32 truncate">{log.userName}</span>
                                <span className={clsx("px-2 py-0.5 rounded-full font-black uppercase text-[9px] w-20 text-center border", 
                                    log.action === 'create' ? "bg-green-50 text-green-700 border-green-200" : 
                                    log.action === 'update' ? "bg-blue-50 text-blue-700 border-blue-200" : 
                                    "bg-red-50 text-red-700 border-red-200")}>{log.action}</span>
                                <span className="text-slate-600">{log.details}</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{log.module}</span>
                        </div>
                    ))}
                </div>
            </div>
          )}
      </div>
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, 
    Copy, AlertTriangle, Play, Pause, Trash2, ExternalLink, RefreshCw,
    Palette, Clock, Globe, ShieldCheck, Tag, Info, Loader2, Link as LinkIcon, Smartphone,
    /* Added missing imports Sparkles and Plus */
    Check, Sparkles, Plus
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { SyncJob } from '../types';
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
  const [activeTab, setActiveTab] = useState<'visual' | 'connections' | 'database'>('visual');
  const [isSaving, setIsSaving] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  
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

  const resetLogo = () => {
      onLogoChange(null);
      appBackend.saveAppLogo("");
  };

  const generateRepairSQL = () => `
-- SCRIPT DE REPARO DEFINITIVO VOLL CRM (V22 - SISTEMA DE SUPORTE)
-- 1. Tabela de Chamados
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

-- 2. Tabela de Mensagens do Chat
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
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>
            <p className="text-sm text-slate-500">Personalize a aparência e gerencie integrações.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
            <button onClick={() => setActiveTab('visual')} className={clsx("px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", activeTab === 'visual' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                <Palette size={14}/> Visual
            </button>
            <button onClick={() => setActiveTab('connections')} className={clsx("px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", activeTab === 'connections' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                <LinkIcon size={14}/> Conexões
            </button>
            <button onClick={() => setActiveTab('database')} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", activeTab === 'database' ? "bg-white text-red-600 shadow-sm" : "text-slate-500")}>
                <Database size={14}/> Banco de Dados
            </button>
        </div>
      </div>

      {activeTab === 'visual' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-left-2">
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4"><ImageIcon size={20} className="text-teal-600"/> Logotipo da Empresa</h3>
                  <div className="flex flex-col items-center gap-6 py-4">
                      <div className="w-48 h-24 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center p-4 overflow-hidden relative group">
                          {currentLogo ? (
                              <img src={currentLogo} alt="Preview" className="max-w-full max-h-full object-contain" />
                          ) : (
                              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sem Logo</span>
                          )}
                      </div>
                      <div className="flex gap-2">
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
                          >
                              <Upload size={14}/> Alterar Logo
                          </button>
                          {currentLogo && (
                              <button onClick={resetLogo} className="bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 px-4 py-2 rounded-lg font-bold text-xs transition-all">Restaurar Padrão</button>
                          )}
                      </div>
                      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      <p className="text-[10px] text-slate-400 text-center max-w-xs">A logo será exibida nos portais e formulários públicos. Recomendamos formato horizontal com fundo transparente.</p>
                  </div>
              </div>

              <div className="bg-slate-800 rounded-3xl p-10 text-white relative overflow-hidden flex flex-col justify-center">
                  <div className="absolute top-0 right-0 p-10 opacity-10"><Sparkles size={120}/></div>
                  <h4 className="text-2xl font-black mb-4">Branding Unificado</h4>
                  <p className="text-slate-400 leading-relaxed mb-8">As alterações visuais feitas aqui impactam o Portal do Aluno, Portal do Instrutor e todos os formulários públicos de captura de leads.</p>
                  <div className="flex items-center gap-4">
                      <div className="h-2 w-20 bg-teal-500 rounded-full"></div>
                      <div className="h-2 w-8 bg-white/20 rounded-full"></div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'connections' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800">Sincronização Ativa</h3>
                  <button onClick={onStartWizard} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all"><Plus size={16}/> Nova Conexão</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobs.length === 0 ? (
                      <div className="col-span-full p-20 text-center text-slate-400 italic bg-white rounded-2xl border-2 border-dashed">Nenhuma conexão de sincronização configurada.</div>
                  ) : jobs.map(job => (
                      <div key={job.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4 group">
                          <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                  <div className={clsx("p-2 rounded-lg", job.active ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400")}>
                                      <RefreshCw size={20} className={clsx(job.status === 'syncing' && "animate-spin")}/>
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-800 leading-tight">{job.name}</h4>
                                      <p className="text-[10px] text-slate-400 font-mono">Tabela: {job.config.tableName}</p>
                                  </div>
                              </div>
                              <button onClick={() => onDeleteJob(job.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  <span>Último Ciclo</span>
                                  <span>Frequência</span>
                              </div>
                              <div className="flex justify-between text-xs font-bold text-slate-600">
                                  <span>{job.lastSync ? new Date(job.lastSync).toLocaleString() : 'Pendente'}</span>
                                  <span>{job.intervalMinutes} min</span>
                              </div>
                          </div>
                          <div className="mt-2 text-[10px] font-bold text-slate-500 truncate italic">{job.lastMessage || 'Aguardando primeiro disparo...'}</div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'database' && (
          <div className="bg-white rounded-[2rem] border border-slate-200 p-10 space-y-8 animate-in zoom-in-95">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                  <div className="bg-red-50 p-3 rounded-2xl text-red-600 shadow-sm"><Database size={32}/></div>
                  <div>
                      <h3 className="text-2xl font-black text-slate-800">Manutenção de Dados (V22)</h3>
                      <p className="text-sm text-slate-500">Reparo de estruturas e otimização de consultas.</p>
                  </div>
              </div>
              
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 flex gap-4">
                  <AlertTriangle className="text-amber-600 shrink-0" size={24}/>
                  <div>
                      <h4 className="font-bold text-amber-900 mb-1">Aviso Importante</h4>
                      <p className="text-sm text-amber-800 leading-relaxed">Rode este script no editor SQL do seu dashboard Supabase para habilitar o novo **Sistema de Chamados de Suporte** e garantir que todas as tabelas comerciais tenham os campos necessários.</p>
                  </div>
              </div>

              {!showSql ? (
                  <button onClick={() => setShowSql(true)} className="w-full py-4 bg-slate-900 text-slate-100 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98]">Gerar Script de Reparo V22</button>
              ) : (
                  <div className="space-y-4 animate-in slide-in-from-top-4">
                      <div className="relative">
                          <pre className="bg-slate-950 text-amber-400 p-6 rounded-2xl text-[11px] font-mono overflow-auto max-h-[400px] border border-slate-800 leading-relaxed custom-scrollbar shadow-inner">{generateRepairSQL()}</pre>
                          <button onClick={copySql} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 backdrop-blur-md border border-white/10">
                              {sqlCopied ? <><Check size={14} className="text-green-400"/> Copiado!</> : <><Copy size={14}/> Copiar SQL</>}
                          </button>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-slate-400 px-2 italic">
                          <Info size={14} className="shrink-0 mt-0.5" />
                          <span>Este script é "idempotente" (não causa erro se rodado mais de uma vez).</span>
                      </div>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

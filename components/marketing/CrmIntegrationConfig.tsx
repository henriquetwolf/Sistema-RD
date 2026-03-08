import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, Save, Loader2, Check, X, ArrowRight, ArrowLeftRight, Database,
  Users, Target, Zap, RefreshCw, AlertTriangle, CheckCircle, Clock,
  Eye, Circle, ChevronDown, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';

interface CrmConfig {
  id?: string;
  is_enabled: boolean;
  auto_pass_enabled: boolean;
  min_score_to_pass: number;
  pass_segment_id: string | null;
  target_pipeline: string;
  target_stage: string;
  distribution_mode: 'fixed' | 'round_robin';
  fixed_owner_id: string | null;
  team_id: string | null;
  field_mapping: Record<string, string>;
  sync_crm_events_back: boolean;
}

const DEFAULT_CONFIG: CrmConfig = {
  is_enabled: true,
  auto_pass_enabled: false,
  min_score_to_pass: 100,
  pass_segment_id: null,
  target_pipeline: 'Padrão',
  target_stage: 'novo_lead',
  distribution_mode: 'round_robin',
  fixed_owner_id: null,
  team_id: null,
  field_mapping: {
    name: 'contact_name',
    email: 'email',
    phone: 'phone',
    company: 'company_name',
    city: 'course_city',
    state: 'course_state',
  },
  sync_crm_events_back: true,
};

const MARKETING_FIELDS = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Telefone' },
  { key: 'company', label: 'Empresa' },
  { key: 'job_title', label: 'Cargo' },
  { key: 'city', label: 'Cidade' },
  { key: 'state', label: 'Estado' },
  { key: 'cpf', label: 'CPF' },
  { key: 'origin', label: 'Origem' },
  { key: 'campaign', label: 'Campanha' },
];

const CRM_FIELDS = [
  { key: 'contact_name', label: 'Nome do Contato' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Telefone' },
  { key: 'company_name', label: 'Empresa' },
  { key: 'cpf', label: 'CPF' },
  { key: 'course_city', label: 'Cidade' },
  { key: 'course_state', label: 'Estado' },
  { key: 'source', label: 'Fonte' },
  { key: 'campaign', label: 'Campanha' },
  { key: 'observation', label: 'Observação' },
];

export const CrmIntegrationConfig: React.FC = () => {
  const [config, setConfig] = useState<CrmConfig>(DEFAULT_CONFIG);
  const [segments, setSegments] = useState<any[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('general');
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [cfgRes, segsRes, logsRes, pipRes] = await Promise.all([
      appBackend.getCrmIntegrationConfig(),
      appBackend.getMarketingSegments(),
      appBackend.getCrmSyncLogs(50),
      appBackend.getPipelines(),
    ]);
    if (cfgRes) setConfig(cfgRes);
    setSegments(segsRes);
    setSyncLogs(logsRes);
    setPipelines(pipRes);
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await appBackend.saveCrmIntegrationConfig(config);
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateMapping = (mktField: string, crmField: string) => {
    setConfig(prev => ({
      ...prev,
      field_mapping: { ...prev.field_mapping, [mktField]: crmField },
    }));
  };

  const selectedPipeline = pipelines.find((p: any) => p.name === config.target_pipeline);
  const stages = selectedPipeline?.stages || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-xl"><ArrowLeftRight size={22} className="text-purple-600" /></div>
            Integração Marketing ↔ CRM
          </h2>
          <p className="text-sm text-slate-500 mt-1">Configure como leads do marketing são passados para o CRM e como eventos do CRM retornam ao marketing</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            saved ? "bg-green-500 text-white" : "bg-purple-600 text-white hover:bg-purple-700"
          )}
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? 'Salvo!' : 'Salvar Configurações'}
        </button>
      </div>

      {/* Flow diagram */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100">
        <div className="flex items-center justify-center gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-200 text-center">
            <Target size={24} className="text-purple-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">VOLL Marketing</p>
            <p className="text-[10px] text-slate-500">Leads & Scoring</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ArrowRight size={20} className="text-purple-400" />
            <span className="text-[10px] font-bold text-purple-500">Passagem de Leads</span>
            <ArrowRight size={20} className="text-purple-400 rotate-180" />
            <span className="text-[10px] font-bold text-indigo-500">Eventos do CRM</span>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-indigo-200 text-center">
            <Database size={24} className="text-indigo-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">CRM Comercial</p>
            <p className="text-[10px] text-slate-500">Deals & Pipeline</p>
          </div>
        </div>
      </div>

      {/* Main toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">Integração Ativa</h3>
            <p className="text-xs text-slate-500 mt-0.5">Ativar/desativar a integração entre Marketing e CRM</p>
          </div>
          <button
            onClick={() => setConfig(prev => ({ ...prev, is_enabled: !prev.is_enabled }))}
            className={clsx("p-1 rounded-full transition-colors", config.is_enabled ? "text-green-500" : "text-slate-300")}
          >
            {config.is_enabled ? <CheckCircle size={36} /> : <Circle size={36} />}
          </button>
        </div>
      </div>

      {config.is_enabled && (
        <>
          {/* Auto-pass settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg"><Zap size={18} className="text-green-600" /></div>
              <div>
                <h3 className="font-bold text-slate-800">Passagem Automática de Leads</h3>
                <p className="text-xs text-slate-500">Criar deals no CRM automaticamente quando o lead atingir critérios</p>
              </div>
            </div>

            <div className="flex items-center justify-between pl-12">
              <span className="text-sm text-slate-600">Passagem automática</span>
              <button
                onClick={() => setConfig(prev => ({ ...prev, auto_pass_enabled: !prev.auto_pass_enabled }))}
                className={clsx("p-1 rounded-full transition-colors", config.auto_pass_enabled ? "text-green-500" : "text-slate-300")}
              >
                {config.auto_pass_enabled ? <CheckCircle size={28} /> : <Circle size={28} />}
              </button>
            </div>

            {config.auto_pass_enabled && (
              <div className="pl-12 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Score mínimo para passagem</label>
                  <input
                    type="number"
                    value={config.min_score_to_pass}
                    onChange={e => setConfig(prev => ({ ...prev, min_score_to_pass: parseInt(e.target.value) || 0 }))}
                    className="mt-1 w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ou pertencer ao segmento</label>
                  <select
                    value={config.pass_segment_id || ''}
                    onChange={e => setConfig(prev => ({ ...prev, pass_segment_id: e.target.value || null }))}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Nenhum (usar apenas score)</option>
                    {segments.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Pipeline destination */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg"><Zap size={18} className="text-indigo-600" /></div>
              <h3 className="font-bold text-slate-800">Destino no CRM</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 pl-12">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pipeline</label>
                <select
                  value={config.target_pipeline}
                  onChange={e => setConfig(prev => ({ ...prev, target_pipeline: e.target.value, target_stage: '' }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {pipelines.map((p: any) => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estágio</label>
                <select
                  value={config.target_stage}
                  onChange={e => setConfig(prev => ({ ...prev, target_stage: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {stages.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Distribution */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg"><Users size={18} className="text-amber-600" /></div>
              <h3 className="font-bold text-slate-800">Distribuição de Leads</h3>
            </div>

            <div className="pl-12 space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setConfig(prev => ({ ...prev, distribution_mode: 'round_robin' }))}
                  className={clsx(
                    "flex-1 p-4 rounded-xl border-2 text-left transition-all",
                    config.distribution_mode === 'round_robin' ? "border-purple-500 bg-purple-50" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <p className="font-bold text-sm text-slate-800">Round Robin</p>
                  <p className="text-xs text-slate-500 mt-1">Distribuir entre membros da equipe automaticamente</p>
                </button>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, distribution_mode: 'fixed' }))}
                  className={clsx(
                    "flex-1 p-4 rounded-xl border-2 text-left transition-all",
                    config.distribution_mode === 'fixed' ? "border-purple-500 bg-purple-50" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <p className="font-bold text-sm text-slate-800">Vendedor Fixo</p>
                  <p className="text-xs text-slate-500 mt-1">Todos os leads vão para um vendedor específico</p>
                </button>
              </div>

              {config.distribution_mode === 'fixed' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ID do Vendedor</label>
                  <input
                    value={config.fixed_owner_id || ''}
                    onChange={e => setConfig(prev => ({ ...prev, fixed_owner_id: e.target.value || null }))}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="ID do colaborador"
                  />
                </div>
              )}

              {config.distribution_mode === 'round_robin' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ID da Equipe</label>
                  <input
                    value={config.team_id || ''}
                    onChange={e => setConfig(prev => ({ ...prev, team_id: e.target.value || null }))}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="ID da equipe no CRM"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Field mapping */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-rose-100 p-2 rounded-lg"><ArrowLeftRight size={18} className="text-rose-600" /></div>
              <div>
                <h3 className="font-bold text-slate-800">Mapeamento de Campos</h3>
                <p className="text-xs text-slate-500">Como os campos do lead no Marketing são mapeados para os campos do deal no CRM</p>
              </div>
            </div>

            <div className="pl-12 space-y-2">
              <div className="grid grid-cols-3 gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                <span>Campo Marketing</span>
                <span className="text-center">→</span>
                <span>Campo CRM</span>
              </div>
              {MARKETING_FIELDS.map(mf => (
                <div key={mf.key} className="grid grid-cols-3 gap-4 items-center py-2">
                  <span className="text-sm text-slate-700 font-medium">{mf.label}</span>
                  <ArrowRight size={14} className="text-slate-300 mx-auto" />
                  <select
                    value={config.field_mapping[mf.key] || ''}
                    onChange={e => updateMapping(mf.key, e.target.value)}
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Não mapear</option>
                    {CRM_FIELDS.map(cf => <option key={cf.key} value={cf.key}>{cf.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* CRM events back */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg"><RefreshCw size={18} className="text-blue-600" /></div>
                <div>
                  <h3 className="font-bold text-slate-800">Sincronizar Eventos do CRM</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Quando um deal muda de estágio, é fechado ou perdido, registrar no lead do Marketing</p>
                </div>
              </div>
              <button
                onClick={() => setConfig(prev => ({ ...prev, sync_crm_events_back: !prev.sync_crm_events_back }))}
                className={clsx("p-1 rounded-full transition-colors", config.sync_crm_events_back ? "text-green-500" : "text-slate-300")}
              >
                {config.sync_crm_events_back ? <CheckCircle size={28} /> : <Circle size={28} />}
              </button>
            </div>
          </div>

          {/* Sync logs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2 rounded-lg"><Clock size={18} className="text-slate-600" /></div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-800">Log de Sincronização</h3>
                  <p className="text-xs text-slate-500">Últimas 50 sincronizações entre Marketing e CRM</p>
                </div>
              </div>
              {showLogs ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
            </button>

            {showLogs && (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {syncLogs.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Nenhuma sincronização ainda</p>
                ) : (
                  syncLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-sm">
                      <div className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        log.direction === 'marketing_to_crm' ? "bg-purple-100" : "bg-indigo-100"
                      )}>
                        {log.direction === 'marketing_to_crm'
                          ? <ArrowRight size={14} className="text-purple-600" />
                          : <ArrowRight size={14} className="text-indigo-600 rotate-180" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-700 truncate">{log.action}</p>
                        <p className="text-xs text-slate-400">
                          {log.direction === 'marketing_to_crm' ? 'Marketing → CRM' : 'CRM → Marketing'}
                          {' · '}
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <span className={clsx(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        log.status === 'success' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {log.status === 'success' ? 'OK' : 'ERRO'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

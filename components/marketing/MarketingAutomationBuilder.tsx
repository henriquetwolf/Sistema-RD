import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, Plus, Play, Pause, Trash2, Edit2, Search, Loader2, X, Check,
  ArrowRight, ArrowDown, Clock, Mail, MessageCircle, Smartphone, Bell,
  Tag, Target, Users, Settings, BarChart3, Eye, Copy,
  AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';

// ── Types ────────────────────────────────────────────────────

type ViewMode = 'list' | 'editor';

type AutomationStatus = 'draft' | 'active' | 'paused' | 'archived';

interface Automation {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  status: AutomationStatus;
  stats_entered: number;
  stats_completed: number;
  stats_active: number;
  created_at: string;
  updated_at: string;
}

type StepType = 'trigger' | 'action' | 'condition' | 'delay';

interface AutomationStep {
  id: string;
  automation_id: string;
  step_type: StepType;
  action_type: string;
  config: Record<string, any>;
  sort_order: number;
  true_steps?: AutomationStep[];
  false_steps?: AutomationStep[];
}

// ── Constants ────────────────────────────────────────────────

const TRIGGER_TYPES: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: 'form_submitted', label: 'Formulário enviado', icon: <Target size={16} /> },
  { value: 'email_opened', label: 'Email aberto', icon: <Mail size={16} /> },
  { value: 'email_clicked', label: 'Clique em email', icon: <Mail size={16} /> },
  { value: 'page_visited', label: 'Página visitada', icon: <Eye size={16} /> },
  { value: 'tag_added', label: 'Tag adicionada', icon: <Tag size={16} /> },
  { value: 'score_reached', label: 'Score atingido', icon: <BarChart3 size={16} /> },
  { value: 'date_based', label: 'Baseado em data', icon: <Clock size={16} /> },
  { value: 'lead_created', label: 'Lead criado', icon: <Users size={16} /> },
  { value: 'crm_event', label: 'Evento do CRM', icon: <Settings size={16} /> },
];

const ACTION_TYPES: { value: string; label: string; icon: React.ReactNode; category: string }[] = [
  { value: 'send_email', label: 'Enviar Email', icon: <Mail size={16} />, category: 'action' },
  { value: 'send_whatsapp', label: 'Enviar WhatsApp', icon: <MessageCircle size={16} />, category: 'action' },
  { value: 'send_sms', label: 'Enviar SMS', icon: <Smartphone size={16} />, category: 'action' },
  { value: 'send_push', label: 'Enviar Push', icon: <Bell size={16} />, category: 'action' },
  { value: 'add_tag', label: 'Adicionar Tag', icon: <Tag size={16} />, category: 'action' },
  { value: 'remove_tag', label: 'Remover Tag', icon: <Tag size={16} />, category: 'action' },
  { value: 'update_score', label: 'Atualizar Score', icon: <BarChart3 size={16} />, category: 'action' },
  { value: 'mark_opportunity', label: 'Marcar Oportunidade', icon: <Target size={16} />, category: 'action' },
  { value: 'create_crm_deal', label: 'Criar Negócio CRM', icon: <Settings size={16} />, category: 'action' },
  { value: 'move_crm_deal', label: 'Mover Negócio CRM', icon: <ArrowRight size={16} />, category: 'action' },
  { value: 'create_crm_task', label: 'Criar Tarefa CRM', icon: <Check size={16} />, category: 'action' },
  { value: 'update_crm_owner', label: 'Alterar Responsável', icon: <Users size={16} />, category: 'action' },
  { value: 'webhook', label: 'Webhook', icon: <Zap size={16} />, category: 'action' },
  { value: 'condition_field', label: 'Condição por Campo', icon: <Zap size={16} />, category: 'condition' },
  { value: 'condition_tag', label: 'Condição por Tag', icon: <Tag size={16} />, category: 'condition' },
  { value: 'condition_score', label: 'Condição por Score', icon: <BarChart3 size={16} />, category: 'condition' },
  { value: 'condition_crm_stage', label: 'Condição por Estágio CRM', icon: <Settings size={16} />, category: 'condition' },
  { value: 'wait_time', label: 'Aguardar Tempo', icon: <Clock size={16} />, category: 'delay' },
];

const STATUS_CONFIG: Record<AutomationStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Rascunho', color: 'text-slate-600', bg: 'bg-slate-100' },
  active: { label: 'Ativa', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  paused: { label: 'Pausada', color: 'text-amber-700', bg: 'bg-amber-50' },
  archived: { label: 'Arquivada', color: 'text-slate-500', bg: 'bg-slate-50' },
};

function stepCategoryOf(actionType: string): StepType {
  const found = ACTION_TYPES.find(a => a.value === actionType);
  if (!found) return 'action';
  if (found.category === 'condition') return 'condition';
  if (found.category === 'delay') return 'delay';
  return 'action';
}

function getStepLabel(actionType: string): string {
  return ACTION_TYPES.find(a => a.value === actionType)?.label || actionType;
}

function getStepIcon(actionType: string): React.ReactNode {
  return ACTION_TYPES.find(a => a.value === actionType)?.icon || <Zap size={16} />;
}

function getTriggerLabel(triggerType: string): string {
  return TRIGGER_TYPES.find(t => t.value === triggerType)?.label || triggerType;
}

function getTriggerIcon(triggerType: string): React.ReactNode {
  return TRIGGER_TYPES.find(t => t.value === triggerType)?.icon || <Zap size={16} />;
}

function summarizeConfig(step: AutomationStep): string {
  const c = step.config || {};
  switch (step.action_type) {
    case 'send_email': return c.template_name || c.template_id || 'Template não selecionado';
    case 'send_whatsapp': return c.message ? c.message.substring(0, 60) + (c.message.length > 60 ? '...' : '') : 'Mensagem não definida';
    case 'send_sms': return c.message ? c.message.substring(0, 60) + (c.message.length > 60 ? '...' : '') : 'Mensagem não definida';
    case 'send_push': return c.title || 'Notificação não definida';
    case 'add_tag': case 'remove_tag': return c.tag_name || 'Tag não definida';
    case 'update_score': return c.points ? `${c.points > 0 ? '+' : ''}${c.points} pontos` : 'Sem pontuação';
    case 'mark_opportunity': return c.lifecycle || 'SQL/Oportunidade';
    case 'create_crm_deal': return c.pipeline ? `${c.pipeline} → ${c.stage || ''}` : 'Pipeline não definido';
    case 'move_crm_deal': return c.target_stage || 'Estágio não definido';
    case 'create_crm_task': return c.task_description || 'Tarefa não definida';
    case 'update_crm_owner': return c.owner_name || c.owner_id || 'Responsável não definido';
    case 'webhook': return c.url || 'URL não definida';
    case 'condition_field': return c.field ? `${c.field} ${c.operator || '='} ${c.value || ''}` : 'Condição não definida';
    case 'condition_tag': return c.tag_name ? `Tag: ${c.tag_name}` : 'Tag não definida';
    case 'condition_score': return c.operator && c.value !== undefined ? `Score ${c.operator} ${c.value}` : 'Score não definido';
    case 'condition_crm_stage': return c.pipeline ? `${c.pipeline} → ${c.stage || ''}` : 'Estágio não definido';
    case 'wait_time': {
      const parts: string[] = [];
      if (c.days) parts.push(`${c.days}d`);
      if (c.hours) parts.push(`${c.hours}h`);
      if (c.minutes) parts.push(`${c.minutes}min`);
      return parts.length ? parts.join(' ') : 'Tempo não definido';
    }
    default: return '';
  }
}

// ── Main Component ───────────────────────────────────────────

export const MarketingAutomationBuilder: React.FC = () => {
  const [view, setView] = useState<ViewMode>('list');
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Editor state
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [steps, setSteps] = useState<AutomationStep[]>([]);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [showAddStepAt, setShowAddStepAt] = useState<number | null>(null);
  const [showTriggerConfig, setShowTriggerConfig] = useState(false);

  // ── Data Loading ─────────────────────────────────────────

  const loadAutomations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await appBackend.getMarketingAutomations();
      setAutomations(data);
    } catch (e) {
      console.error('[Automations] Erro:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAutomations(); }, [loadAutomations]);

  const loadSteps = useCallback(async (automationId: string) => {
    try {
      const data = await appBackend.getAutomationSteps(automationId);
      setSteps(data.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)));
    } catch (e) {
      console.error('[Steps] Erro:', e);
      setSteps([]);
    }
  }, []);

  // ── List Actions ─────────────────────────────────────────

  const createNewAutomation = () => {
    const newAuto: Automation = {
      id: crypto.randomUUID(),
      name: 'Nova Automação',
      description: '',
      trigger_type: 'form_submitted',
      trigger_config: {},
      status: 'draft',
      stats_entered: 0,
      stats_completed: 0,
      stats_active: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setEditingAutomation(newAuto);
    setSteps([]);
    setView('editor');
  };

  const openEditor = async (auto: Automation) => {
    setEditingAutomation({ ...auto });
    await loadSteps(auto.id);
    setView('editor');
  };

  const duplicateAutomation = async (auto: Automation) => {
    const dup: Automation = {
      ...auto,
      id: crypto.randomUUID(),
      name: `${auto.name} (cópia)`,
      status: 'draft',
      stats_entered: 0,
      stats_completed: 0,
      stats_active: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      await appBackend.saveMarketingAutomation(dup);
      const originalSteps = await appBackend.getAutomationSteps(auto.id);
      for (const s of originalSteps) {
        await appBackend.saveAutomationStep({
          ...s,
          id: crypto.randomUUID(),
          automation_id: dup.id,
        });
      }
      await loadAutomations();
    } catch (e) {
      console.error('[Duplicate] Erro:', e);
    }
  };

  const toggleStatus = async (auto: Automation) => {
    const next = auto.status === 'active' ? 'paused' : 'active';
    try {
      await appBackend.saveMarketingAutomation({ ...auto, status: next });
      await loadAutomations();
    } catch (e) {
      console.error('[Toggle] Erro:', e);
    }
  };

  const archiveAutomation = async (id: string) => {
    const auto = automations.find(a => a.id === id);
    if (!auto) return;
    try {
      await appBackend.saveMarketingAutomation({ ...auto, status: 'archived' as AutomationStatus });
      await loadAutomations();
    } catch (e) {
      console.error('[Trash2] Erro:', e);
    }
  };

  const deleteAutomation = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta automação permanentemente?')) return;
    try {
      await appBackend.deleteMarketingAutomation(id);
      await loadAutomations();
    } catch (e) {
      console.error('[Delete] Erro:', e);
    }
  };

  // ── Editor Actions ───────────────────────────────────────

  const saveAutomation = async () => {
    if (!editingAutomation) return;
    setSaving(true);
    try {
      await appBackend.saveMarketingAutomation(editingAutomation);
      for (let i = 0; i < steps.length; i++) {
        const step = { ...steps[i], automation_id: editingAutomation.id, sort_order: i };
        await appBackend.saveAutomationStep(step);
      }
      await loadAutomations();
      setView('list');
      setEditingAutomation(null);
      setSteps([]);
    } catch (e) {
      console.error('[Save] Erro:', e);
    } finally {
      setSaving(false);
    }
  };

  const activateAutomation = async () => {
    if (!editingAutomation) return;
    setEditingAutomation(prev => prev ? { ...prev, status: 'active' } : null);
    setTimeout(saveAutomation, 50);
  };

  const addStep = (index: number, actionType: string) => {
    const newStep: AutomationStep = {
      id: crypto.randomUUID(),
      automation_id: editingAutomation?.id || '',
      step_type: stepCategoryOf(actionType),
      action_type: actionType,
      config: actionType === 'wait_time' ? { days: 0, hours: 0, minutes: 5 } : {},
      sort_order: index,
    };
    const next = [...steps];
    next.splice(index, 0, newStep);
    setSteps(next.map((s, i) => ({ ...s, sort_order: i })));
    setShowAddStepAt(null);
    setEditingStepId(newStep.id);
  };

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, sort_order: i })));
    if (editingStepId === id) setEditingStepId(null);
  };

  const updateStepConfig = (id: string, config: Record<string, any>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, config: { ...s.config, ...config } } : s));
  };

  // ── Filtered list ────────────────────────────────────────

  const filtered = automations.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.name.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q);
  });

  // ══════════════════════════════════════════════════════════
  // RENDER — LIST VIEW
  // ══════════════════════════════════════════════════════════

  if (view === 'list') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Zap size={24} className="text-purple-600" />
              Automações de Marketing
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Crie fluxos automatizados para nutrir e converter seus leads
            </p>
          </div>
          <button
            onClick={createNewAutomation}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
          >
            <Plus size={18} />
            Nova Automação
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar automações..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-purple-500" />
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <Zap size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600">Nenhuma automação encontrada</h3>
            <p className="text-sm text-slate-400 mt-1">Crie sua primeira automação para começar</p>
          </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(auto => {
              const st = STATUS_CONFIG[auto.status] || STATUS_CONFIG.draft;
              return (
                <div
                  key={auto.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{auto.name}</h3>
                      {auto.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{auto.description}</p>
                      )}
                    </div>
                    <span className={clsx('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ml-2 shrink-0', st.bg, st.color)}>
                      {st.label}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {auto.stats_entered || 0} entraram
                    </span>
                    <span className="flex items-center gap-1">
                      <Check size={12} /> {auto.stats_completed || 0} concluídos
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap size={12} /> {auto.stats_active || 0} ativos
                    </span>
                  </div>

                  {/* Trigger */}
                  <div className="flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 px-2.5 py-1.5 rounded-lg mb-4">
                    {getTriggerIcon(auto.trigger_type)}
                    <span className="font-medium">{getTriggerLabel(auto.trigger_type)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-3 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditor(auto)} className="p-1.5 rounded-lg hover:bg-purple-50 text-slate-400 hover:text-purple-600 transition-colors" title="Editar">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => duplicateAutomation(auto)} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors" title="Duplicar">
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => toggleStatus(auto)}
                      className={clsx('p-1.5 rounded-lg transition-colors', auto.status === 'active' ? 'hover:bg-amber-50 text-slate-400 hover:text-amber-600' : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600')}
                      title={auto.status === 'active' ? 'Pausar' : 'Ativar'}
                    >
                      {auto.status === 'active' ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                    <button onClick={() => archiveAutomation(auto.id)} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors" title="Arquivar">
                      <Trash2 size={15} />
                    </button>
                    <button onClick={() => deleteAutomation(auto.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors ml-auto" title="Excluir">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // RENDER — EDITOR VIEW
  // ══════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* Editor Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setView('list'); setEditingAutomation(null); setSteps([]); }}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <input
              value={editingAutomation?.name || ''}
              onChange={e => setEditingAutomation(prev => prev ? { ...prev, name: e.target.value } : null)}
              className="text-lg font-bold text-slate-800 border-none outline-none bg-transparent w-full"
              placeholder="Nome da automação"
            />
            <input
              value={editingAutomation?.description || ''}
              onChange={e => setEditingAutomation(prev => prev ? { ...prev, description: e.target.value } : null)}
              className="text-xs text-slate-400 border-none outline-none bg-transparent w-full mt-0.5"
              placeholder="Descrição (opcional)"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editingAutomation?.status !== 'active' && (
            <button
              onClick={activateAutomation}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Play size={14} />
              Ativar
            </button>
          )}
          <button
            onClick={saveAutomation}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Salvar
          </button>
        </div>
      </div>

      {/* Flow Builder */}
      <div className="flex justify-center">
        <div className="w-full max-w-2xl space-y-0">

          {/* ── Trigger Card ──────────────────────────── */}
          <div className="relative">
            <div
              onClick={() => setShowTriggerConfig(!showTriggerConfig)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white cursor-pointer hover:shadow-lg hover:shadow-purple-200 transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Zap size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-wider font-bold opacity-70">Gatilho</div>
                  <div className="font-semibold text-sm">{getTriggerLabel(editingAutomation?.trigger_type || 'form_submitted')}</div>
                </div>
                <Edit2 size={14} className="opacity-60" />
              </div>
            </div>

            {showTriggerConfig && (
              <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-4 space-y-3 z-30 relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-700">Tipo de Gatilho</span>
                  <button onClick={() => setShowTriggerConfig(false)} className="p-1 rounded hover:bg-slate-100">
                    <X size={14} className="text-slate-400" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TRIGGER_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setEditingAutomation(prev => prev ? { ...prev, trigger_type: t.value } : null)}
                      className={clsx(
                        'flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all text-left',
                        editingAutomation?.trigger_type === t.value
                          ? 'border-purple-400 bg-purple-50 text-purple-700'
                          : 'border-slate-200 hover:border-purple-200 text-slate-600 hover:bg-purple-50/50'
                      )}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Trigger config fields */}
                <TriggerConfigFields
                  triggerType={editingAutomation?.trigger_type || ''}
                  config={editingAutomation?.trigger_config || {}}
                  onChange={cfg => setEditingAutomation(prev => prev ? { ...prev, trigger_config: { ...prev.trigger_config, ...cfg } } : null)}
                />
              </div>
            )}
          </div>

          {/* Connector line from trigger */}
          <ConnectorLine />

          {/* Add step at beginning */}
          <AddStepButton
            index={0}
            showAddStepAt={showAddStepAt}
            setShowAddStepAt={setShowAddStepAt}
            onAdd={addStep}
          />

          {/* ── Steps ─────────────────────────────────── */}
          {steps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <ConnectorLine />

              <StepCard
                step={step}
                isEditing={editingStepId === step.id}
                onToggleEdit={() => setEditingStepId(editingStepId === step.id ? null : step.id)}
                onRemove={() => removeStep(step.id)}
                onUpdateConfig={(cfg) => updateStepConfig(step.id, cfg)}
              />

              {/* Condition branching */}
              {step.step_type === 'condition' && (
                <div className="ml-8 mt-2 mb-2 grid grid-cols-2 gap-3">
                  <div className="border-l-2 border-emerald-300 pl-3">
                    <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Sim
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">Leads que atendem a condição seguem por aqui</p>
                  </div>
                  <div className="border-l-2 border-red-300 pl-3">
                    <span className="text-[10px] font-bold uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      Não
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">Leads que não atendem seguem por aqui</p>
                  </div>
                </div>
              )}

              <ConnectorLine />

              <AddStepButton
                index={idx + 1}
                showAddStepAt={showAddStepAt}
                setShowAddStepAt={setShowAddStepAt}
                onAdd={addStep}
              />
            </React.Fragment>
          ))}

          {/* End marker */}
          <ConnectorLine />
          <div className="flex justify-center">
            <div className="bg-slate-100 border border-slate-200 rounded-full px-5 py-2 text-xs font-semibold text-slate-500 flex items-center gap-2">
              <Check size={14} />
              Fim do fluxo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────

const ConnectorLine: React.FC = () => (
  <div className="flex justify-center">
    <div className="w-0.5 h-6 bg-purple-200" />
  </div>
);

const AddStepButton: React.FC<{
  index: number;
  showAddStepAt: number | null;
  setShowAddStepAt: (v: number | null) => void;
  onAdd: (index: number, actionType: string) => void;
}> = ({ index, showAddStepAt, setShowAddStepAt, onAdd }) => (
  <div className="relative flex justify-center">
    <button
      onClick={() => setShowAddStepAt(showAddStepAt === index ? null : index)}
      className={clsx(
        'w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center transition-all',
        showAddStepAt === index
          ? 'border-purple-500 bg-purple-50 text-purple-600 scale-110'
          : 'border-slate-300 text-slate-400 hover:border-purple-400 hover:text-purple-500 hover:bg-purple-50'
      )}
    >
      <Plus size={14} />
    </button>

    {showAddStepAt === index && (
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-30 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700">Adicionar Passo</span>
          <button onClick={() => setShowAddStepAt(null)} className="p-0.5 rounded hover:bg-slate-100">
            <X size={12} className="text-slate-400" />
          </button>
        </div>

        {/* Actions */}
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-wider font-bold text-purple-500 mb-1 px-1">Ações</div>
          <div className="space-y-0.5">
            {ACTION_TYPES.filter(a => a.category === 'action').map(a => (
              <button
                key={a.value}
                onClick={() => onAdd(index, a.value)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left"
              >
                <span className="text-purple-500">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conditions */}
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-wider font-bold text-amber-500 mb-1 px-1">Condições</div>
          <div className="space-y-0.5">
            {ACTION_TYPES.filter(a => a.category === 'condition').map(a => (
              <button
                key={a.value}
                onClick={() => onAdd(index, a.value)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors text-left"
              >
                <span className="text-amber-500">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Delays */}
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-blue-500 mb-1 px-1">Espera</div>
          <div className="space-y-0.5">
            {ACTION_TYPES.filter(a => a.category === 'delay').map(a => (
              <button
                key={a.value}
                onClick={() => onAdd(index, a.value)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
              >
                <span className="text-blue-500">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
);

// ── Step Card ──────────────────────────────────────────────

const StepCard: React.FC<{
  step: AutomationStep;
  isEditing: boolean;
  onToggleEdit: () => void;
  onRemove: () => void;
  onUpdateConfig: (config: Record<string, any>) => void;
}> = ({ step, isEditing, onToggleEdit, onRemove, onUpdateConfig }) => {
  const isCondition = step.step_type === 'condition';
  const isDelay = step.step_type === 'delay';

  const borderColor = isCondition
    ? 'border-amber-200 hover:border-amber-300'
    : isDelay
    ? 'border-blue-200 hover:border-blue-300'
    : 'border-slate-200 hover:border-purple-200';

  const iconBg = isCondition
    ? 'bg-amber-50 text-amber-600'
    : isDelay
    ? 'bg-blue-50 text-blue-600'
    : 'bg-purple-50 text-purple-600';

  return (
    <div className={clsx('bg-white rounded-xl border transition-all', borderColor, isEditing && 'ring-2 ring-purple-300 shadow-lg')}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={onToggleEdit}>
        <div className={clsx('p-2 rounded-lg', iconBg)}>
          {getStepIcon(step.action_type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-700">{getStepLabel(step.action_type)}</div>
          <div className="text-xs text-slate-400 truncate">{summarizeConfig(step)}</div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={e => { e.stopPropagation(); onToggleEdit(); }} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-purple-600">
            <Edit2 size={13} />
          </button>
          <button onClick={e => { e.stopPropagation(); onRemove(); }} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Config panel */}
      {isEditing && (
        <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/50 rounded-b-xl">
          <StepConfigFields
            actionType={step.action_type}
            config={step.config}
            onChange={onUpdateConfig}
          />
          <div className="flex justify-end">
            <button onClick={onToggleEdit} className="text-xs font-medium text-purple-600 hover:text-purple-800 flex items-center gap-1">
              <Check size={12} /> Pronto
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Trigger Config Fields ──────────────────────────────────

const TriggerConfigFields: React.FC<{
  triggerType: string;
  config: Record<string, any>;
  onChange: (cfg: Record<string, any>) => void;
}> = ({ triggerType, config, onChange }) => {
  switch (triggerType) {
    case 'form_submitted':
      return (
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">ID do Formulário</label>
          <input
            value={config.form_id || ''}
            onChange={e => onChange({ form_id: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="UUID do formulário"
          />
        </div>
      );
    case 'email_opened': case 'email_clicked':
      return (
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">ID da Campanha de Email</label>
          <input
            value={config.campaign_id || ''}
            onChange={e => onChange({ campaign_id: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="UUID da campanha"
          />
        </div>
      );
    case 'page_visited':
      return (
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">URL da Página</label>
          <input
            value={config.page_url || ''}
            onChange={e => onChange({ page_url: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="https://..."
          />
        </div>
      );
    case 'tag_added':
      return (
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Nome da Tag</label>
          <input
            value={config.tag_name || ''}
            onChange={e => onChange({ tag_name: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="Ex: interessado-pilates"
          />
        </div>
      );
    case 'score_reached':
      return (
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Score Mínimo</label>
          <input
            type="number"
            value={config.min_score || ''}
            onChange={e => onChange({ min_score: parseInt(e.target.value) || 0 })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="Ex: 100"
          />
        </div>
      );
    case 'date_based':
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Campo de Data</label>
            <input
              value={config.date_field || ''}
              onChange={e => onChange({ date_field: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="Ex: created_at, birthday"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Dias antes/depois</label>
            <input
              type="number"
              value={config.days_offset ?? 0}
              onChange={e => onChange({ days_offset: parseInt(e.target.value) || 0 })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>
      );
    case 'crm_event':
      return (
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo de Evento CRM</label>
          <select
            value={config.crm_event_type || ''}
            onChange={e => onChange({ crm_event_type: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="">Selecione...</option>
            <option value="deal_created">Negócio criado</option>
            <option value="deal_won">Negócio ganho</option>
            <option value="deal_lost">Negócio perdido</option>
            <option value="deal_stage_changed">Estágio alterado</option>
            <option value="task_completed">Tarefa concluída</option>
          </select>
        </div>
      );
    default:
      return null;
  }
};

// ── Step Config Fields ─────────────────────────────────────

const StepConfigFields: React.FC<{
  actionType: string;
  config: Record<string, any>;
  onChange: (cfg: Record<string, any>) => void;
}> = ({ actionType, config, onChange }) => {
  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none';

  switch (actionType) {
    case 'send_email':
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">ID do Template de Email</label>
            <input value={config.template_id || ''} onChange={e => onChange({ template_id: e.target.value })} className={inputCls} placeholder="UUID do template" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Nome do Template (referência)</label>
            <input value={config.template_name || ''} onChange={e => onChange({ template_name: e.target.value })} className={inputCls} placeholder="Ex: Boas-vindas" />
          </div>
        </div>
      );

    case 'send_whatsapp':
      return (
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Mensagem (use {'{{nome}}'}, {'{{email}}'} para variáveis)</label>
          <textarea
            value={config.message || ''}
            onChange={e => onChange({ message: e.target.value })}
            className={clsx(inputCls, 'h-24 resize-none')}
            placeholder="Olá {{nome}}, tudo bem?"
          />
        </div>
      );

    case 'send_sms':
      return (
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Mensagem SMS (max 160 caracteres)</label>
          <textarea
            value={config.message || ''}
            onChange={e => onChange({ message: e.target.value })}
            maxLength={160}
            className={clsx(inputCls, 'h-20 resize-none')}
            placeholder="Sua mensagem SMS"
          />
          <span className="text-[10px] text-slate-400">{(config.message || '').length}/160</span>
        </div>
      );

    case 'send_push':
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Título</label>
            <input value={config.title || ''} onChange={e => onChange({ title: e.target.value })} className={inputCls} placeholder="Título da notificação" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Corpo</label>
            <textarea value={config.body || ''} onChange={e => onChange({ body: e.target.value })} className={clsx(inputCls, 'h-16 resize-none')} placeholder="Corpo da notificação" />
          </div>
        </div>
      );

    case 'add_tag': case 'remove_tag':
      return (
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Nome da Tag</label>
          <input value={config.tag_name || ''} onChange={e => onChange({ tag_name: e.target.value })} className={inputCls} placeholder="Ex: nurturing-fase1" />
        </div>
      );

    case 'update_score':
      return (
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Pontos (+/-)</label>
          <input type="number" value={config.points ?? ''} onChange={e => onChange({ points: parseInt(e.target.value) || 0 })} className={inputCls} placeholder="Ex: +10 ou -5" />
        </div>
      );

    case 'mark_opportunity':
      return (
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Novo estágio do ciclo de vida</label>
          <select value={config.lifecycle || 'sql'} onChange={e => onChange({ lifecycle: e.target.value })} className={inputCls}>
            <option value="mql">MQL</option>
            <option value="sql">SQL</option>
            <option value="opportunity">Oportunidade</option>
            <option value="customer">Cliente</option>
          </select>
        </div>
      );

    case 'create_crm_deal':
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Pipeline</label>
            <input value={config.pipeline || ''} onChange={e => onChange({ pipeline: e.target.value })} className={inputCls} placeholder="Ex: Padrão" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Estágio</label>
            <input value={config.stage || ''} onChange={e => onChange({ stage: e.target.value })} className={inputCls} placeholder="Ex: novo_lead" />
          </div>
        </div>
      );

    case 'move_crm_deal':
      return (
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Estágio de Destino</label>
          <input value={config.target_stage || ''} onChange={e => onChange({ target_stage: e.target.value })} className={inputCls} placeholder="Ex: negotiation" />
        </div>
      );

    case 'create_crm_task':
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Descrição da Tarefa</label>
            <textarea value={config.task_description || ''} onChange={e => onChange({ task_description: e.target.value })} className={clsx(inputCls, 'h-16 resize-none')} placeholder="Descreva a tarefa" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Prazo (dias a partir de agora)</label>
            <input type="number" value={config.due_days ?? ''} onChange={e => onChange({ due_days: parseInt(e.target.value) || 0 })} className={inputCls} placeholder="Ex: 3" />
          </div>
        </div>
      );

    case 'update_crm_owner':
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">ID do Responsável</label>
            <input value={config.owner_id || ''} onChange={e => onChange({ owner_id: e.target.value })} className={inputCls} placeholder="UUID do responsável" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Nome (referência)</label>
            <input value={config.owner_name || ''} onChange={e => onChange({ owner_name: e.target.value })} className={inputCls} placeholder="Nome do responsável" />
          </div>
        </div>
      );

    case 'webhook':
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">URL</label>
            <input value={config.url || ''} onChange={e => onChange({ url: e.target.value })} className={inputCls} placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Payload (JSON)</label>
            <textarea value={config.payload || ''} onChange={e => onChange({ payload: e.target.value })} className={clsx(inputCls, 'h-20 resize-none font-mono text-xs')} placeholder='{"key": "value"}' />
          </div>
        </div>
      );

    case 'condition_field':
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Campo</label>
            <input value={config.field || ''} onChange={e => onChange({ field: e.target.value })} className={inputCls} placeholder="Ex: city, job_title" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Operador</label>
            <select value={config.operator || 'equals'} onChange={e => onChange({ operator: e.target.value })} className={inputCls}>
              <option value="equals">Igual a</option>
              <option value="not_equals">Diferente de</option>
              <option value="contains">Contém</option>
              <option value="not_contains">Não contém</option>
              <option value="is_empty">Está vazio</option>
              <option value="is_not_empty">Não está vazio</option>
              <option value="greater_than">Maior que</option>
              <option value="less_than">Menor que</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Valor</label>
            <input value={config.value || ''} onChange={e => onChange({ value: e.target.value })} className={inputCls} placeholder="Valor de comparação" />
          </div>
        </div>
      );

    case 'condition_tag':
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Nome da Tag</label>
            <input value={config.tag_name || ''} onChange={e => onChange({ tag_name: e.target.value })} className={inputCls} placeholder="Ex: engajado" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Condição</label>
            <select value={config.has_tag ?? 'true'} onChange={e => onChange({ has_tag: e.target.value })} className={inputCls}>
              <option value="true">Possui a tag</option>
              <option value="false">Não possui a tag</option>
            </select>
          </div>
        </div>
      );

    case 'condition_score':
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Operador</label>
            <select value={config.operator || '>'} onChange={e => onChange({ operator: e.target.value })} className={inputCls}>
              <option value=">">Maior que</option>
              <option value="<">Menor que</option>
              <option value="=">Igual a</option>
              <option value=">=">Maior ou igual</option>
              <option value="<=">Menor ou igual</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Valor</label>
            <input type="number" value={config.value ?? ''} onChange={e => onChange({ value: parseInt(e.target.value) || 0 })} className={inputCls} placeholder="Ex: 50" />
          </div>
        </div>
      );

    case 'condition_crm_stage':
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Pipeline</label>
            <input value={config.pipeline || ''} onChange={e => onChange({ pipeline: e.target.value })} className={inputCls} placeholder="Ex: Padrão" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Estágio</label>
            <input value={config.stage || ''} onChange={e => onChange({ stage: e.target.value })} className={inputCls} placeholder="Ex: negotiation" />
          </div>
        </div>
      );

    case 'wait_time':
      return (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Dias</label>
            <input type="number" min={0} value={config.days ?? 0} onChange={e => onChange({ days: parseInt(e.target.value) || 0 })} className={inputCls} />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Horas</label>
            <input type="number" min={0} max={23} value={config.hours ?? 0} onChange={e => onChange({ hours: parseInt(e.target.value) || 0 })} className={inputCls} />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Minutos</label>
            <input type="number" min={0} max={59} value={config.minutes ?? 0} onChange={e => onChange({ minutes: parseInt(e.target.value) || 0 })} className={inputCls} />
          </div>
        </div>
      );

    default:
      return (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <AlertTriangle size={14} />
          Nenhuma configuração disponível para este tipo de passo.
        </div>
      );
  }
};

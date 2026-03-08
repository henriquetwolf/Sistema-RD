import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Filter, Plus, Search, Trash2, Edit2, Users, Eye, Loader2, X, Check,
  Settings, Minus, ChevronDown, ChevronRight, Target,
  Tag, BarChart3, Mail, Globe, Calendar, Star, Zap, Database
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';

/* ───────────────────────── Types ───────────────────────── */

interface Segment {
  id: string;
  name: string;
  description: string;
  segment_type: 'dynamic' | 'static';
  rules: RuleGroup[];
  static_lead_ids: string[];
  is_active: boolean;
  lead_count: number;
  created_at: string;
  updated_at: string;
}

interface RuleGroup {
  id: string;
  combinator: 'AND' | 'OR';
  rules: Rule[];
}

interface Rule {
  id: string;
  field: string;
  operator: string;
  value: string;
  value2?: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  score: number;
  lifecycle_stage: string;
  tags: string[];
  created_at: string;
}

type ViewMode = 'list' | 'editor';

/* ───────────────────────── Criteria Config ───────────────────────── */

interface CriteriaOption {
  value: string;
  label: string;
  category: string;
  categoryIcon: React.ReactNode;
  operators: { value: string; label: string }[];
  valueType?: 'text' | 'select' | 'number' | 'date' | 'none';
  selectOptions?: { value: string; label: string }[];
}

const LIFECYCLE_OPTIONS = [
  { value: 'visitor', label: 'Visitante' },
  { value: 'lead', label: 'Lead' },
  { value: 'mql', label: 'MQL' },
  { value: 'sql', label: 'SQL' },
  { value: 'opportunity', label: 'Oportunidade' },
  { value: 'customer', label: 'Cliente' },
];

const TEXT_OPERATORS = [
  { value: 'equals', label: 'É igual a' },
  { value: 'not_equals', label: 'Não é igual a' },
  { value: 'contains', label: 'Contém' },
  { value: 'not_contains', label: 'Não contém' },
  { value: 'is_empty', label: 'Está vazio' },
  { value: 'not_empty', label: 'Não está vazio' },
];

const BEHAVIOR_OPERATORS = [
  { value: 'has_done', label: 'Realizou' },
  { value: 'has_not_done', label: 'Não realizou' },
  { value: 'count_greater', label: 'Quantidade maior que' },
  { value: 'count_less', label: 'Quantidade menor que' },
];

const SCORE_OPERATORS = [
  { value: 'greater_than', label: 'Maior que' },
  { value: 'less_than', label: 'Menor que' },
  { value: 'between', label: 'Entre' },
  { value: 'equals', label: 'Igual a' },
];

const DATE_OPERATORS = [
  { value: 'before', label: 'Antes de' },
  { value: 'after', label: 'Depois de' },
  { value: 'between', label: 'Entre' },
  { value: 'last_n_days', label: 'Nos últimos N dias' },
];

const CRM_OPERATORS = [
  { value: 'equals', label: 'É igual a' },
  { value: 'not_equals', label: 'Não é igual a' },
  { value: 'is_empty', label: 'Está vazio' },
];

const CRITERIA: CriteriaOption[] = [
  { value: 'name', label: 'Nome', category: 'Dados do Lead', categoryIcon: <Users size={14} />, operators: TEXT_OPERATORS },
  { value: 'email', label: 'Email', category: 'Dados do Lead', categoryIcon: <Users size={14} />, operators: TEXT_OPERATORS },
  { value: 'company', label: 'Empresa', category: 'Dados do Lead', categoryIcon: <Users size={14} />, operators: TEXT_OPERATORS },
  { value: 'job_title', label: 'Cargo', category: 'Dados do Lead', categoryIcon: <Users size={14} />, operators: TEXT_OPERATORS },
  { value: 'city', label: 'Cidade', category: 'Dados do Lead', categoryIcon: <Users size={14} />, operators: TEXT_OPERATORS },
  { value: 'state', label: 'Estado', category: 'Dados do Lead', categoryIcon: <Users size={14} />, operators: TEXT_OPERATORS },
  { value: 'origin', label: 'Origem', category: 'Dados do Lead', categoryIcon: <Users size={14} />, operators: TEXT_OPERATORS },
  { value: 'campaign', label: 'Campanha', category: 'Dados do Lead', categoryIcon: <Users size={14} />, operators: TEXT_OPERATORS },

  { value: 'page_visited', label: 'Visitou página', category: 'Comportamento', categoryIcon: <Globe size={14} />, operators: BEHAVIOR_OPERATORS },
  { value: 'email_opened', label: 'Abriu email', category: 'Comportamento', categoryIcon: <Mail size={14} />, operators: BEHAVIOR_OPERATORS },
  { value: 'email_clicked', label: 'Clicou em email', category: 'Comportamento', categoryIcon: <Mail size={14} />, operators: BEHAVIOR_OPERATORS },
  { value: 'form_submitted', label: 'Submeteu formulário', category: 'Comportamento', categoryIcon: <Zap size={14} />, operators: BEHAVIOR_OPERATORS },

  { value: 'has_tag', label: 'Possui tag', category: 'Tags', categoryIcon: <Tag size={14} />, operators: [{ value: 'equals', label: 'Igual a' }] },
  { value: 'not_has_tag', label: 'Não possui tag', category: 'Tags', categoryIcon: <Tag size={14} />, operators: [{ value: 'equals', label: 'Igual a' }] },

  { value: 'score', label: 'Score', category: 'Scoring', categoryIcon: <Star size={14} />, operators: SCORE_OPERATORS, valueType: 'number' },

  {
    value: 'lifecycle_stage', label: 'Estágio do ciclo', category: 'Lifecycle', categoryIcon: <Target size={14} />,
    operators: [{ value: 'equals', label: 'É igual a' }, { value: 'not_equals', label: 'Não é igual a' }],
    valueType: 'select', selectOptions: LIFECYCLE_OPTIONS,
  },

  { value: 'created_at', label: 'Data de criação', category: 'Datas', categoryIcon: <Calendar size={14} />, operators: DATE_OPERATORS, valueType: 'date' },
  { value: 'last_activity_at', label: 'Última atividade', category: 'Datas', categoryIcon: <Calendar size={14} />, operators: DATE_OPERATORS, valueType: 'date' },

  { value: 'crm_pipeline', label: 'Pipeline CRM', category: 'Dados do CRM', categoryIcon: <Database size={14} />, operators: CRM_OPERATORS },
  { value: 'crm_stage', label: 'Estágio CRM', category: 'Dados do CRM', categoryIcon: <Database size={14} />, operators: CRM_OPERATORS },
  { value: 'crm_product_type', label: 'Tipo de Produto', category: 'Dados do CRM', categoryIcon: <Database size={14} />, operators: CRM_OPERATORS },
  { value: 'crm_product_name', label: 'Nome do Produto', category: 'Dados do CRM', categoryIcon: <Database size={14} />, operators: CRM_OPERATORS },
  { value: 'crm_owner', label: 'Responsável CRM', category: 'Dados do CRM', categoryIcon: <Database size={14} />, operators: CRM_OPERATORS },
];

const CRITERIA_BY_CATEGORY = CRITERIA.reduce<Record<string, CriteriaOption[]>>((acc, c) => {
  (acc[c.category] ??= []).push(c);
  return acc;
}, {});

const NO_VALUE_OPS = new Set(['is_empty', 'not_empty', 'has_done', 'has_not_done']);

/* ───────────────────────── Helpers ───────────────────────── */

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const newId = () => crypto.randomUUID();

const EMPTY_SEGMENT: Partial<Segment> = {
  name: '',
  description: '',
  segment_type: 'dynamic',
  rules: [{ id: newId(), combinator: 'AND', rules: [{ id: newId(), field: 'name', operator: 'contains', value: '' }] }],
  static_lead_ids: [],
  is_active: true,
};

/* ───────────────────────── Component ───────────────────────── */

export const SegmentBuilder: React.FC = () => {
  const [view, setView] = useState<ViewMode>('list');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editor state
  const [editing, setEditing] = useState<Partial<Segment>>(EMPTY_SEGMENT);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Static segment state
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');

  // Collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  /* ── Load Segments ── */
  const loadSegments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await appBackend.getMarketingSegments();
      setSegments((data ?? []) as Segment[]);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadSegments(); }, [loadSegments]);

  /* ── Open Editor ── */
  const openEditor = useCallback((segment?: Segment) => {
    if (segment) {
      setEditing({
        ...segment,
        rules: segment.rules?.length ? segment.rules : EMPTY_SEGMENT.rules,
      });
    } else {
      setEditing({ ...EMPTY_SEGMENT, rules: [{ id: newId(), combinator: 'AND', rules: [{ id: newId(), field: 'name', operator: 'contains', value: '' }] }] });
    }
    setPreviewCount(null);
    setCollapsedGroups(new Set());
    setView('editor');
  }, []);

  /* ── Load leads for static ── */
  useEffect(() => {
    if (view === 'editor' && editing.segment_type === 'static') {
      const load = async () => {
        setLeadsLoading(true);
        try {
          const data = await appBackend.getMarketingLeads();
          setAllLeads((data ?? []) as Lead[]);
        } catch { setAllLeads([]); }
        setLeadsLoading(false);
      };
      load();
    }
  }, [view, editing.segment_type]);

  /* ── Save ── */
  const handleSave = useCallback(async () => {
    if (!editing.name?.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...editing,
        id: editing.id || newId(),
        updated_at: new Date().toISOString(),
        created_at: editing.created_at || new Date().toISOString(),
      };
      await appBackend.saveMarketingSegment(payload);
      await loadSegments();
      setView('list');
    } catch (e) { console.error(e); }
    setSaving(false);
  }, [editing, loadSegments]);

  /* ── Delete ── */
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Excluir este segmento?')) return;
    try {
      await appBackend.deleteMarketingSegment(id);
      await loadSegments();
    } catch (e) { console.error(e); }
  }, [loadSegments]);

  /* ── Preview lead count ── */
  const handlePreview = useCallback(async () => {
    if (!editing.id) {
      const tempId = newId();
      setPreviewLoading(true);
      try {
        const payload = { ...editing, id: tempId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        await appBackend.saveMarketingSegment(payload);
        const leads = await appBackend.evaluateSegment(tempId);
        setPreviewCount(leads.length);
        await appBackend.deleteMarketingSegment(tempId);
      } catch { setPreviewCount(0); }
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    try {
      await appBackend.saveMarketingSegment({ ...editing, updated_at: new Date().toISOString() });
      const leads = await appBackend.evaluateSegment(editing.id);
      setPreviewCount(leads.length);
    } catch { setPreviewCount(0); }
    setPreviewLoading(false);
  }, [editing]);

  /* ── Rule Group Manipulation ── */
  const updateGroups = useCallback((groups: RuleGroup[]) => {
    setEditing(prev => ({ ...prev, rules: groups }));
  }, []);

  const addGroup = useCallback(() => {
    updateGroups([...(editing.rules || []), { id: newId(), combinator: 'AND', rules: [{ id: newId(), field: 'name', operator: 'contains', value: '' }] }]);
  }, [editing.rules, updateGroups]);

  const removeGroup = useCallback((gid: string) => {
    const next = (editing.rules || []).filter(g => g.id !== gid);
    if (next.length === 0) {
      updateGroups([{ id: newId(), combinator: 'AND', rules: [{ id: newId(), field: 'name', operator: 'contains', value: '' }] }]);
    } else {
      updateGroups(next);
    }
  }, [editing.rules, updateGroups]);

  const toggleGroupCombinator = useCallback((gid: string) => {
    updateGroups((editing.rules || []).map(g => g.id === gid ? { ...g, combinator: g.combinator === 'AND' ? 'OR' : 'AND' } : g));
  }, [editing.rules, updateGroups]);

  const addRuleToGroup = useCallback((gid: string) => {
    updateGroups((editing.rules || []).map(g => g.id === gid ? { ...g, rules: [...g.rules, { id: newId(), field: 'name', operator: 'contains', value: '' }] } : g));
  }, [editing.rules, updateGroups]);

  const removeRuleFromGroup = useCallback((gid: string, rid: string) => {
    updateGroups((editing.rules || []).map(g => {
      if (g.id !== gid) return g;
      const next = g.rules.filter(r => r.id !== rid);
      return { ...g, rules: next.length === 0 ? [{ id: newId(), field: 'name', operator: 'contains', value: '' }] : next };
    }));
  }, [editing.rules, updateGroups]);

  const updateRule = useCallback((gid: string, rid: string, patch: Partial<Rule>) => {
    updateGroups((editing.rules || []).map(g => {
      if (g.id !== gid) return g;
      return { ...g, rules: g.rules.map(r => r.id === rid ? { ...r, ...patch } : r) };
    }));
  }, [editing.rules, updateGroups]);

  /* ── Static lead toggle ── */
  const toggleStaticLead = useCallback((leadId: string) => {
    setEditing(prev => {
      const ids = new Set(prev.static_lead_ids || []);
      ids.has(leadId) ? ids.delete(leadId) : ids.add(leadId);
      return { ...prev, static_lead_ids: Array.from(ids) };
    });
  }, []);

  /* ── Filtered static leads ── */
  const filteredStaticLeads = useMemo(() => {
    if (!leadSearch.trim()) return allLeads;
    const q = leadSearch.toLowerCase();
    return allLeads.filter(l =>
      (l.name || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.company || '').toLowerCase().includes(q)
    );
  }, [allLeads, leadSearch]);

  const selectedLeadIds = useMemo(() => new Set(editing.static_lead_ids || []), [editing.static_lead_ids]);

  /* ── View Leads of segment ── */
  const [viewingLeads, setViewingLeads] = useState<Lead[] | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);

  const handleViewLeads = useCallback(async (segId: string) => {
    setViewingLoading(true);
    try {
      const leads = await appBackend.evaluateSegment(segId);
      setViewingLeads(leads as Lead[]);
    } catch { setViewingLeads([]); }
    setViewingLoading(false);
  }, []);

  /* ═══════════════════════ RENDER ═══════════════════════ */

  /* ── Leads Viewer Modal ── */
  const leadsViewerModal = viewingLeads !== null && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setViewingLeads(null)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[75vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users size={18} /> Leads do Segmento ({viewingLeads.length})</h3>
          <button onClick={() => setViewingLeads(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {viewingLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-purple-400" /></div>
          ) : viewingLeads.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Nenhum lead neste segmento.</p>
          ) : (
            <div className="space-y-2">
              {viewingLeads.map(l => (
                <div key={l.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold">
                    {(l.name || '?')[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{l.name || '—'}</p>
                    <p className="text-xs text-slate-400 truncate">{l.email || '—'}</p>
                  </div>
                  <span className="text-xs text-slate-500">{l.company || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* ── EDITOR VIEW ── */
  if (view === 'editor') {
    return (
      <div className="space-y-6">
        {leadsViewerModal}

        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => setView('list')} className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-medium text-sm transition-colors">
            <ChevronRight size={16} className="rotate-180" /> Voltar para lista
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || !editing.name?.trim()} className="bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar Segmento
            </button>
          </div>
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Nome do Segmento *</label>
              <input
                value={editing.name || ''}
                onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Leads quentes de São Paulo"
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Descrição</label>
              <input
                value={editing.description || ''}
                onChange={e => setEditing(p => ({ ...p, description: e.target.value }))}
                placeholder="Descreva brevemente este segmento..."
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              />
            </div>
          </div>

          {/* Type toggle */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-2">Tipo do Segmento</label>
            <div className="inline-flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setEditing(p => ({ ...p, segment_type: 'dynamic' }))}
                className={clsx(
                  'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                  editing.segment_type === 'dynamic'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                <Zap size={14} className="inline mr-1.5 -mt-0.5" /> Dinâmico
              </button>
              <button
                onClick={() => setEditing(p => ({ ...p, segment_type: 'static' }))}
                className={clsx(
                  'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                  editing.segment_type === 'static'
                    ? 'bg-slate-700 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                <Database size={14} className="inline mr-1.5 -mt-0.5" /> Estático
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Rules */}
        {editing.segment_type === 'dynamic' && (
          <div className="space-y-4">
            {(editing.rules || []).map((group, gi) => {
              const isCollapsed = collapsedGroups.has(group.id);
              return (
                <React.Fragment key={group.id}>
                  {gi > 0 && (
                    <div className="flex items-center justify-center">
                      <span className="bg-fuchsia-100 text-fuchsia-700 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        OU
                      </span>
                    </div>
                  )}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Group header */}
                    <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setCollapsedGroups(prev => { const n = new Set(prev); n.has(group.id) ? n.delete(group.id) : n.add(group.id); return n; })} className="text-slate-400 hover:text-slate-600">
                          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <span className="text-sm font-bold text-slate-700">Grupo {gi + 1}</span>
                        <span className="text-xs text-slate-400">({group.rules.length} regra{group.rules.length !== 1 ? 's' : ''})</span>

                        {/* AND/OR pill switch */}
                        <div className="inline-flex bg-slate-200 rounded-full p-0.5 ml-2">
                          <button
                            onClick={() => toggleGroupCombinator(group.id)}
                            className={clsx(
                              'px-3 py-0.5 rounded-full text-[11px] font-bold transition-all',
                              group.combinator === 'AND' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500'
                            )}
                          >
                            E
                          </button>
                          <button
                            onClick={() => toggleGroupCombinator(group.id)}
                            className={clsx(
                              'px-3 py-0.5 rounded-full text-[11px] font-bold transition-all',
                              group.combinator === 'OR' ? 'bg-fuchsia-600 text-white shadow-sm' : 'text-slate-500'
                            )}
                          >
                            OU
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {(editing.rules || []).length > 1 && (
                          <button onClick={() => removeGroup(group.id)} className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors" title="Remover grupo">
                            <Minus size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Rules */}
                    {!isCollapsed && (
                      <div className="p-5 space-y-3">
                        {group.rules.map((rule, ri) => {
                          const criteriaOpt = CRITERIA.find(c => c.value === rule.field);
                          const operators = criteriaOpt?.operators || TEXT_OPERATORS;
                          const needsValue = !NO_VALUE_OPS.has(rule.operator);
                          const needsSecondValue = rule.operator === 'between';
                          const valueType = criteriaOpt?.valueType || 'text';

                          return (
                            <div key={rule.id}>
                              {ri > 0 && (
                                <div className="flex items-center justify-center py-1">
                                  <span className={clsx(
                                    'text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full',
                                    group.combinator === 'AND' ? 'bg-purple-50 text-purple-500' : 'bg-fuchsia-50 text-fuchsia-500'
                                  )}>
                                    {group.combinator === 'AND' ? 'E' : 'OU'}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Field */}
                                <select
                                  value={rule.field}
                                  onChange={e => {
                                    const newCriteria = CRITERIA.find(c => c.value === e.target.value);
                                    const firstOp = newCriteria?.operators[0]?.value || 'equals';
                                    updateRule(group.id, rule.id, { field: e.target.value, operator: firstOp, value: '', value2: '' });
                                  }}
                                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-400 focus:outline-none bg-white min-w-[180px]"
                                >
                                  {Object.entries(CRITERIA_BY_CATEGORY).map(([cat, items]) => (
                                    <optgroup key={cat} label={cat}>
                                      {items.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </optgroup>
                                  ))}
                                </select>

                                {/* Operator */}
                                <select
                                  value={rule.operator}
                                  onChange={e => updateRule(group.id, rule.id, { operator: e.target.value, value: NO_VALUE_OPS.has(e.target.value) ? '' : rule.value })}
                                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-400 focus:outline-none bg-white min-w-[150px]"
                                >
                                  {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                                </select>

                                {/* Value */}
                                {needsValue && (
                                  valueType === 'select' && criteriaOpt?.selectOptions ? (
                                    <select
                                      value={rule.value}
                                      onChange={e => updateRule(group.id, rule.id, { value: e.target.value })}
                                      className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-400 focus:outline-none bg-white min-w-[150px]"
                                    >
                                      <option value="">Selecione...</option>
                                      {criteriaOpt.selectOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                  ) : (
                                    <input
                                      type={valueType === 'number' ? 'number' : valueType === 'date' ? 'date' : 'text'}
                                      value={rule.value}
                                      onChange={e => updateRule(group.id, rule.id, { value: e.target.value })}
                                      placeholder={rule.operator === 'last_n_days' ? 'Nº de dias' : 'Valor...'}
                                      className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-400 focus:outline-none flex-1 min-w-[120px]"
                                    />
                                  )
                                )}

                                {/* Second value for "between" */}
                                {needsSecondValue && (
                                  <>
                                    <span className="text-xs text-slate-400 font-medium">e</span>
                                    <input
                                      type={valueType === 'number' ? 'number' : valueType === 'date' ? 'date' : 'text'}
                                      value={rule.value2 || ''}
                                      onChange={e => updateRule(group.id, rule.id, { value2: e.target.value })}
                                      placeholder="Valor 2..."
                                      className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-400 focus:outline-none min-w-[120px]"
                                    />
                                  </>
                                )}

                                {/* Remove rule */}
                                <button
                                  onClick={() => removeRuleFromGroup(group.id, rule.id)}
                                  className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                  title="Remover regra"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        <button
                          onClick={() => addRuleToGroup(group.id)}
                          className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-semibold mt-2 transition-colors"
                        >
                          <Plus size={14} /> Adicionar regra
                        </button>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}

            <button
              onClick={addGroup}
              className="w-full border-2 border-dashed border-fuchsia-300 rounded-2xl py-4 text-fuchsia-600 hover:bg-fuchsia-50 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
            >
              <Plus size={16} /> Adicionar grupo (OU)
            </button>

            {/* Preview count */}
            <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-2xl border border-purple-200 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-white" />
                </div>
                <div>
                  {previewCount !== null ? (
                    <p className="text-lg font-bold text-purple-900">{previewCount} lead{previewCount !== 1 ? 's' : ''} neste segmento</p>
                  ) : (
                    <p className="text-sm text-purple-700">Clique em "Pré-visualizar" para contar os leads</p>
                  )}
                </div>
              </div>
              <button
                onClick={handlePreview}
                disabled={previewLoading}
                className="bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {previewLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} Pré-visualizar
              </button>
            </div>
          </div>
        )}

        {/* Static segment: lead selection */}
        {editing.segment_type === 'static' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Users size={16} /> Selecionar Leads
                <span className="text-xs font-normal text-slate-400 ml-1">({selectedLeadIds.size} selecionado{selectedLeadIds.size !== 1 ? 's' : ''})</span>
              </h3>
            </div>

            <div className="px-5 py-3 border-b border-slate-50">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={leadSearch}
                  onChange={e => setLeadSearch(e.target.value)}
                  placeholder="Buscar leads por nome, email ou empresa..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>
            </div>

            {/* Selected leads chips */}
            {selectedLeadIds.size > 0 && (
              <div className="px-5 py-3 border-b border-slate-50 flex flex-wrap gap-2">
                {Array.from(selectedLeadIds).map(id => {
                  const lead = allLeads.find(l => l.id === id);
                  return (
                    <span key={id} className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
                      {lead?.name || lead?.email || id.slice(0, 8)}
                      <button onClick={() => toggleStaticLead(id)} className="hover:text-red-600"><X size={11} /></button>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="max-h-[400px] overflow-y-auto">
              {leadsLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-purple-400" /></div>
              ) : filteredStaticLeads.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">Nenhum lead encontrado.</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredStaticLeads.map(lead => {
                    const selected = selectedLeadIds.has(lead.id);
                    return (
                      <label key={lead.id} className={clsx('flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors', selected ? 'bg-purple-50/60' : 'hover:bg-slate-50')}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleStaticLead(lead.id)}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-400"
                        />
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold flex-shrink-0">
                          {(lead.name || '?')[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{lead.name || '—'}</p>
                          <p className="text-xs text-slate-400 truncate">{lead.email || '—'}</p>
                        </div>
                        <span className="text-xs text-slate-400">{lead.company || ''}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════ LIST VIEW ═══════════════════════ */
  return (
    <div className="space-y-6">
      {leadsViewerModal}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Filter size={22} /> Segmentação de Leads</h2>
          <p className="text-sm text-slate-500 mt-1">Crie segmentos dinâmicos ou estáticos para campanhas direcionadas</p>
        </div>
        <button onClick={() => openEditor()} className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-md shadow-purple-200">
          <Plus size={16} /> Novo Segmento
        </button>
      </div>

      {/* Segments Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-purple-400" /></div>
      ) : segments.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
          <Target size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">Nenhum segmento criado ainda</p>
          <p className="text-sm text-slate-400 mt-1">Crie seu primeiro segmento para direcionar suas campanhas</p>
          <button onClick={() => openEditor()} className="mt-4 bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors inline-flex items-center gap-2">
            <Plus size={14} /> Criar Segmento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {segments.map(seg => (
            <div key={seg.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-purple-200 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 truncate group-hover:text-purple-700 transition-colors">{seg.name}</h3>
                  {seg.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{seg.description}</p>}
                </div>
                <span className={clsx(
                  'ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0',
                  seg.segment_type === 'dynamic' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                )}>
                  {seg.segment_type === 'dynamic' ? 'Dinâmico' : 'Estático'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                <span className="flex items-center gap-1"><Users size={12} /> {seg.lead_count ?? '—'} leads</span>
                <span className={clsx('flex items-center gap-1', seg.is_active ? 'text-green-600' : 'text-slate-400')}>
                  <span className={clsx('w-1.5 h-1.5 rounded-full', seg.is_active ? 'bg-green-500' : 'bg-slate-300')} />
                  {seg.is_active ? 'Ativo' : 'Inativo'}
                </span>
                <span className="flex items-center gap-1"><Calendar size={12} /> {fmtDate(seg.created_at)}</span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => openEditor(seg)} className="flex-1 flex items-center justify-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-semibold py-1.5 rounded-lg hover:bg-purple-50 transition-colors">
                  <Edit2 size={13} /> Editar
                </button>
                <button onClick={() => handleViewLeads(seg.id)} className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-semibold py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <Eye size={13} /> Ver Leads
                </button>
                <button onClick={() => handleDelete(seg.id)} className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-red-600 font-semibold py-1.5 px-3 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

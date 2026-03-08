import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, Plus, Search, Trash2, Edit3, Eye, Tag, Target, TrendingUp, Clock,
  Mail, Globe, FileText, MessageCircle, ArrowRight, Loader2, X, Check,
  Download, Upload, Filter, Star, ChevronDown, ChevronRight, Settings,
  BarChart3, Zap, AlertTriangle, UserPlus, ArrowLeft
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';

/* ───────────────────────── Types ───────────────────────── */

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  job_title: string;
  city: string;
  state: string;
  country: string;
  cpf: string;
  origin: string;
  campaign: string;
  medium: string;
  first_conversion: string;
  last_conversion: string;
  custom_fields: Record<string, any>;
  score: number;
  lifecycle_stage: string;
  tags: string[];
  crm_deal_id: string | null;
  crm_aluno_cpf: string;
  opted_out: boolean;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

interface LeadEvent {
  id: string;
  lead_id: string;
  event_type: string;
  event_data: Record<string, any>;
  source: string;
  created_at: string;
}

interface ScoringRule {
  id: string;
  rule_type: 'profile' | 'behavior';
  field_or_event: string;
  operator: string;
  value: string;
  points: number;
  is_active: boolean;
  created_at: string;
}

type ViewMode = 'list' | 'detail';
type DetailTab = 'timeline' | 'scoring' | 'info';

const LIFECYCLE_STAGES = [
  { key: 'visitor', label: 'Visitante' },
  { key: 'lead', label: 'Lead' },
  { key: 'mql', label: 'MQL' },
  { key: 'sql', label: 'SQL' },
  { key: 'opportunity', label: 'Oportunidade' },
  { key: 'customer', label: 'Cliente' },
];

const EVENT_ICONS: Record<string, React.ReactNode> = {
  email_sent: <Mail size={14} className="text-blue-500" />,
  email_opened: <Eye size={14} className="text-green-500" />,
  email_clicked: <ArrowRight size={14} className="text-purple-500" />,
  form_submitted: <FileText size={14} className="text-teal-500" />,
  page_visited: <Globe size={14} className="text-indigo-500" />,
  tag_added: <Tag size={14} className="text-amber-500" />,
  tag_removed: <Tag size={14} className="text-red-400" />,
  score_changed: <TrendingUp size={14} className="text-fuchsia-500" />,
  lifecycle_changed: <Target size={14} className="text-orange-500" />,
  crm_deal_created: <Zap size={14} className="text-green-600" />,
  crm_deal_stage_changed: <ArrowRight size={14} className="text-blue-600" />,
  crm_deal_won: <Check size={14} className="text-emerald-600" />,
  crm_deal_lost: <X size={14} className="text-red-600" />,
  automation_entered: <Zap size={14} className="text-violet-500" />,
  automation_step_executed: <Settings size={14} className="text-slate-500" />,
};

const EVENT_BORDER_COLORS: Record<string, string> = {
  email_sent: 'border-blue-400',
  email_opened: 'border-green-400',
  email_clicked: 'border-purple-400',
  form_submitted: 'border-teal-400',
  page_visited: 'border-indigo-400',
  tag_added: 'border-amber-400',
  tag_removed: 'border-red-300',
  score_changed: 'border-fuchsia-400',
  lifecycle_changed: 'border-orange-400',
  crm_deal_created: 'border-green-500',
  crm_deal_stage_changed: 'border-blue-500',
  crm_deal_won: 'border-emerald-500',
  crm_deal_lost: 'border-red-500',
  automation_entered: 'border-violet-400',
  automation_step_executed: 'border-slate-400',
};

const TAG_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700', 'bg-fuchsia-100 text-fuchsia-700', 'bg-orange-100 text-orange-700',
  'bg-cyan-100 text-cyan-700',
];

const tagColor = (tag: string) => TAG_COLORS[Math.abs([...tag].reduce((a, c) => a + c.charCodeAt(0), 0)) % TAG_COLORS.length];

const scoreColor = (s: number) => s > 80 ? 'from-green-400 to-emerald-500 text-white' : s > 40 ? 'from-amber-400 to-orange-500 text-white' : 'from-red-400 to-rose-500 text-white';
const scoreTextColor = (s: number) => s > 80 ? 'text-green-600' : s > 40 ? 'text-amber-600' : 'text-red-600';
const scoreBgLight = (s: number) => s > 80 ? 'bg-green-50 border-green-200' : s > 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

const lifecycleBadge = (stage: string) => {
  const m: Record<string, string> = {
    visitor: 'bg-slate-100 text-slate-600',
    lead: 'bg-blue-100 text-blue-700',
    mql: 'bg-purple-100 text-purple-700',
    sql: 'bg-fuchsia-100 text-fuchsia-700',
    opportunity: 'bg-amber-100 text-amber-700',
    customer: 'bg-green-100 text-green-700',
  };
  return m[stage] || 'bg-slate-100 text-slate-600';
};

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fmtShortDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const EMPTY_LEAD: Partial<Lead> = {
  name: '', email: '', phone: '', company: '', job_title: '', city: '', state: '',
  country: 'Brasil', cpf: '', origin: '', campaign: '', medium: '',
  custom_fields: {}, tags: [], lifecycle_stage: 'lead', score: 0,
};

/* ───────────────────────── Component ───────────────────────── */

export const LeadManager: React.FC = () => {
  const [view, setView] = useState<ViewMode>('list');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterLifecycle, setFilterLifecycle] = useState('');
  const [filterMinScore, setFilterMinScore] = useState<number | ''>('');
  const [filterTags, setFilterTags] = useState<string[]>([]);

  // Detail
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('timeline');
  const [timeline, setTimeline] = useState<LeadEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Scoring
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
  const [ruleEditing, setRuleEditing] = useState<Partial<ScoringRule> | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead] = useState<Partial<Lead>>(EMPTY_LEAD);
  const [saving, setSaving] = useState(false);

  // Bulk
  const [bulkTag, setBulkTag] = useState('');
  const [showBulkTag, setShowBulkTag] = useState(false);

  // CRM
  const [passingCrm, setPassingCrm] = useState(false);

  // New tag for detail
  const [newTag, setNewTag] = useState('');

  /* ── Load Leads ── */
  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await appBackend.getMarketingLeads({
        search: search || undefined,
        lifecycle: filterLifecycle || undefined,
        minScore: filterMinScore !== '' ? Number(filterMinScore) : undefined,
      });
      let filtered = data as Lead[];
      if (filterTags.length > 0) {
        filtered = filtered.filter(l => filterTags.every(ft => (l.tags || []).includes(ft)));
      }
      setLeads(filtered);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [search, filterLifecycle, filterMinScore, filterTags]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = leads.length;
    const byStage = (s: string) => leads.filter(l => l.lifecycle_stage === s).length;
    return {
      total,
      leads: byStage('lead'),
      mql: byStage('mql'),
      sql: byStage('sql'),
      opportunity: byStage('opportunity'),
      customer: byStage('customer'),
    };
  }, [leads]);

  /* ── Open Detail ── */
  const openDetail = useCallback(async (lead: Lead) => {
    setDetailLead(lead);
    setDetailTab('timeline');
    setView('detail');
    setTimelineLoading(true);
    try {
      const events = await appBackend.getLeadTimeline(lead.id);
      setTimeline(events as LeadEvent[]);
    } catch { setTimeline([]); }
    setTimelineLoading(false);
    try {
      const rules = await appBackend.getScoringRules();
      setScoringRules(rules as ScoringRule[]);
    } catch { setScoringRules([]); }
  }, []);

  /* ── Refresh detail lead data ── */
  const refreshDetailLead = useCallback(async () => {
    if (!detailLead) return;
    const updated = await appBackend.getMarketingLeadById(detailLead.id);
    if (updated) setDetailLead(updated as Lead);
  }, [detailLead]);

  /* ── Save Lead ── */
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await appBackend.saveMarketingLead(editLead);
      setShowModal(false);
      setEditLead(EMPTY_LEAD);
      await loadLeads();
    } catch (e) { console.error(e); }
    setSaving(false);
  }, [editLead, loadLeads]);

  /* ── Delete selected ── */
  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Excluir ${selectedIds.size} lead(s)?`)) return;
    for (const id of selectedIds) {
      await appBackend.deleteMarketingLead(id);
    }
    setSelectedIds(new Set());
    await loadLeads();
  }, [selectedIds, loadLeads]);

  /* ── Bulk add tag ── */
  const handleBulkAddTag = useCallback(async () => {
    if (!bulkTag.trim() || selectedIds.size === 0) return;
    for (const id of selectedIds) {
      const lead = leads.find(l => l.id === id);
      if (!lead) continue;
      const tags = [...new Set([...(lead.tags || []), bulkTag.trim()])];
      await appBackend.saveMarketingLead({ ...lead, tags });
    }
    setBulkTag('');
    setShowBulkTag(false);
    setSelectedIds(new Set());
    await loadLeads();
  }, [bulkTag, selectedIds, leads, loadLeads]);

  /* ── Export CSV ── */
  const handleExportCSV = useCallback(() => {
    const target = selectedIds.size > 0 ? leads.filter(l => selectedIds.has(l.id)) : leads;
    const headers = ['Nome', 'Email', 'Telefone', 'Empresa', 'Score', 'Estágio', 'Tags', 'Origem', 'Última Atividade'];
    const rows = target.map(l => [
      l.name, l.email, l.phone, l.company, String(l.score),
      LIFECYCLE_STAGES.find(s => s.key === l.lifecycle_stage)?.label || l.lifecycle_stage,
      (l.tags || []).join('; '), l.origin, fmtDate(l.last_activity_at),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_voll_marketing_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [leads, selectedIds]);

  /* ── Import CSV ── */
  const handleImportCSV = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, '').toLowerCase());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(".*?"|[^",]+|(?<=,)(?=,))/g)?.map((v: string) => v.replace(/^"|"$/g, '').trim()) || [];
        const row: any = {};
        headers.forEach((h: string, idx: number) => {
          if (h.includes('nome') || h === 'name') row.name = values[idx] || '';
          if (h === 'email' || h === 'e-mail') row.email = values[idx] || '';
          if (h.includes('telefone') || h === 'phone') row.phone = values[idx] || '';
          if (h.includes('empresa') || h === 'company') row.company = values[idx] || '';
          if (h.includes('origem') || h === 'origin') row.origin = values[idx] || '';
          if (h.includes('cidade') || h === 'city') row.city = values[idx] || '';
          if (h.includes('estado') || h === 'state') row.state = values[idx] || '';
        });
        if (row.name || row.email) {
          await appBackend.saveMarketingLead({ ...EMPTY_LEAD, ...row });
        }
      }
      await loadLeads();
    };
    input.click();
  }, [loadLeads]);

  /* ── Tags ── */
  const handleAddTagToLead = useCallback(async () => {
    if (!detailLead || !newTag.trim()) return;
    const tags = [...new Set([...(detailLead.tags || []), newTag.trim()])];
    await appBackend.saveMarketingLead({ ...detailLead, tags });
    await appBackend.logLeadEvent(detailLead.id, 'tag_added', { tag: newTag.trim() });
    setNewTag('');
    await refreshDetailLead();
  }, [detailLead, newTag, refreshDetailLead]);

  const handleRemoveTag = useCallback(async (tag: string) => {
    if (!detailLead) return;
    const tags = (detailLead.tags || []).filter(t => t !== tag);
    await appBackend.saveMarketingLead({ ...detailLead, tags });
    await appBackend.logLeadEvent(detailLead.id, 'tag_removed', { tag });
    await refreshDetailLead();
  }, [detailLead, refreshDetailLead]);

  /* ── Pass to CRM ── */
  const handlePassToCrm = useCallback(async () => {
    if (!detailLead) return;
    setPassingCrm(true);
    try {
      await appBackend.passLeadToCrm(detailLead.id);
      await refreshDetailLead();
    } catch (e) { console.error(e); }
    setPassingCrm(false);
  }, [detailLead, refreshDetailLead]);

  /* ── Recalc score ── */
  const handleRecalcScore = useCallback(async () => {
    if (!detailLead) return;
    setRecalculating(true);
    try {
      await appBackend.calculateLeadScore(detailLead.id);
      await refreshDetailLead();
    } catch (e) { console.error(e); }
    setRecalculating(false);
  }, [detailLead, refreshDetailLead]);

  /* ── Scoring rules CRUD ── */
  const handleSaveRule = useCallback(async () => {
    if (!ruleEditing) return;
    await appBackend.saveScoringRule(ruleEditing);
    const rules = await appBackend.getScoringRules();
    setScoringRules(rules as ScoringRule[]);
    setRuleEditing(null);
  }, [ruleEditing]);

  const handleDeleteRule = useCallback(async (id: string) => {
    await appBackend.deleteScoringRule(id);
    setScoringRules(prev => prev.filter(r => r.id !== id));
  }, []);

  /* ── Update detail lead info ── */
  const handleUpdateLeadInfo = useCallback(async (updates: Partial<Lead>) => {
    if (!detailLead) return;
    setSaving(true);
    try {
      await appBackend.saveMarketingLead({ ...detailLead, ...updates });
      await refreshDetailLead();
    } catch (e) { console.error(e); }
    setSaving(false);
  }, [detailLead, refreshDetailLead]);

  /* ── All existing tags ── */
  const allTags = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => (l.tags || []).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [leads]);

  /* ═══════════════════════ RENDER ═══════════════════════ */

  if (view === 'detail' && detailLead) {
    return (
      <div className="space-y-6">
        {/* Back */}
        <button onClick={() => { setView('list'); setDetailLead(null); }} className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-medium text-sm transition-colors">
          <ArrowLeft size={16} /> Voltar para lista
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className={clsx('w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center font-bold text-xl shadow-lg', scoreColor(detailLead.score))}>
                {detailLead.score}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{detailLead.name || 'Sem nome'}</h2>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                  {detailLead.email && <span className="flex items-center gap-1"><Mail size={13} /> {detailLead.email}</span>}
                  {detailLead.phone && <span className="flex items-center gap-1"><MessageCircle size={13} /> {detailLead.phone}</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  {detailLead.company && <span>{detailLead.company}</span>}
                  {detailLead.job_title && <span>• {detailLead.job_title}</span>}
                  {(detailLead.city || detailLead.state) && <span>• {[detailLead.city, detailLead.state].filter(Boolean).join('/')}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {detailLead.crm_deal_id ? (
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
                  <Check size={13} /> Vinculado ao CRM
                </span>
              ) : (
                <button onClick={handlePassToCrm} disabled={passingCrm} className="text-xs bg-purple-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                  {passingCrm ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />} Passar para CRM
                </button>
              )}
              <button
                onClick={() => { setEditLead(detailLead); setShowModal(true); }}
                className="text-xs bg-slate-100 text-slate-700 px-3 py-2 rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center gap-1.5"
              >
                <Edit3 size={13} /> Editar
              </button>
            </div>
          </div>

          {/* Lifecycle Pipeline */}
          <div className="mt-6 flex items-center gap-1">
            {LIFECYCLE_STAGES.map((stage, i) => {
              const isActive = stage.key === detailLead.lifecycle_stage;
              const idx = LIFECYCLE_STAGES.findIndex(s => s.key === detailLead.lifecycle_stage);
              const isPast = i < idx;
              return (
                <React.Fragment key={stage.key}>
                  <div className={clsx(
                    'flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-all',
                    isActive ? 'bg-purple-600 text-white shadow-md' : isPast ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'
                  )}>
                    {stage.label}
                  </div>
                  {i < LIFECYCLE_STAGES.length - 1 && <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Tags */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <Tag size={14} className="text-slate-400" />
            {(detailLead.tags || []).map(t => (
              <span key={t} className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1', tagColor(t))}>
                {t}
                <button onClick={() => handleRemoveTag(t)} className="hover:opacity-70"><X size={11} /></button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTagToLead()}
                placeholder="Nova tag..."
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
              <button onClick={handleAddTagToLead} className="text-purple-600 hover:text-purple-800"><Plus size={14} /></button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-1">
          {([
            { key: 'timeline', label: 'Timeline', icon: <Clock size={14} /> },
            { key: 'scoring', label: 'Scoring', icon: <TrendingUp size={14} /> },
            { key: 'info', label: 'Informações', icon: <FileText size={14} /> },
          ] as { key: DetailTab; label: string; icon: React.ReactNode }[]).map(tab => (
            <button key={tab.key} onClick={() => setDetailTab(tab.key)} className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all',
              detailTab === tab.key ? 'bg-purple-50 text-purple-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            )}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {detailTab === 'timeline' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock size={16} /> Timeline de Atividades</h3>
            {timelineLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-purple-400" /></div>
            ) : timeline.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">Nenhum evento registrado ainda.</p>
            ) : (
              <div className="space-y-3">
                {timeline.map(ev => (
                  <div key={ev.id} className={clsx('border-l-4 pl-4 py-2', EVENT_BORDER_COLORS[ev.event_type] || 'border-slate-300')}>
                    <div className="flex items-center gap-2">
                      {EVENT_ICONS[ev.event_type] || <Zap size={14} className="text-slate-400" />}
                      <span className="text-sm font-semibold text-slate-700">{ev.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <span className="text-xs text-slate-400 ml-auto">{fmtDate(ev.created_at)}</span>
                    </div>
                    {ev.event_data && Object.keys(ev.event_data).length > 0 && (
                      <p className="text-xs text-slate-500 mt-1 ml-5">{JSON.stringify(ev.event_data)}</p>
                    )}
                    {ev.source && <p className="text-xs text-slate-400 mt-0.5 ml-5">Fonte: {ev.source}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {detailTab === 'scoring' && (
          <div className="space-y-4">
            {/* Score Display */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={clsx('w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center font-black text-2xl shadow-lg', scoreColor(detailLead.score))}>
                    {detailLead.score}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Lead Score</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Pontuação calculada com base em perfil e comportamento</p>
                  </div>
                </div>
                <button onClick={handleRecalcScore} disabled={recalculating} className="bg-fuchsia-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-fuchsia-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {recalculating ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />} Recalcular Score
                </button>
              </div>
            </div>

            {/* Rules */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Settings size={16} /> Regras de Scoring</h3>
                <button onClick={() => setRuleEditing({ rule_type: 'profile', field_or_event: '', operator: 'equals', value: '', points: 10, is_active: true })} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-purple-700 flex items-center gap-1">
                  <Plus size={13} /> Nova Regra
                </button>
              </div>

              {ruleEditing && (
                <div className="border border-purple-200 bg-purple-50 rounded-xl p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo</label>
                      <select value={ruleEditing.rule_type || 'profile'} onChange={e => setRuleEditing(p => ({ ...p, rule_type: e.target.value as any }))} className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-400 focus:outline-none">
                        <option value="profile">Perfil</option>
                        <option value="behavior">Comportamento</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Campo / Evento</label>
                      <input value={ruleEditing.field_or_event || ''} onChange={e => setRuleEditing(p => ({ ...p, field_or_event: e.target.value }))} className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-400 focus:outline-none" placeholder={ruleEditing.rule_type === 'profile' ? 'ex: company' : 'ex: email_opened'} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Operador</label>
                      <select value={ruleEditing.operator || 'equals'} onChange={e => setRuleEditing(p => ({ ...p, operator: e.target.value }))} className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-400 focus:outline-none">
                        <option value="equals">Igual a</option>
                        <option value="contains">Contém</option>
                        <option value="not_empty">Não vazio</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Valor</label>
                      <input value={ruleEditing.value || ''} onChange={e => setRuleEditing(p => ({ ...p, value: e.target.value }))} className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-400 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Pontos</label>
                      <input type="number" value={ruleEditing.points ?? 0} onChange={e => setRuleEditing(p => ({ ...p, points: Number(e.target.value) }))} className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-400 focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setRuleEditing(null)} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5">Cancelar</button>
                    <button onClick={handleSaveRule} className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-purple-700 flex items-center gap-1"><Check size={13} /> Salvar</button>
                  </div>
                </div>
              )}

              {scoringRules.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">Nenhuma regra configurada.</p>
              ) : (
                <div className="space-y-2">
                  {scoringRules.map(rule => (
                    <div key={rule.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold uppercase', rule.rule_type === 'profile' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700')}>
                        {rule.rule_type === 'profile' ? 'Perfil' : 'Comportamento'}
                      </span>
                      <span className="text-sm text-slate-700 font-medium flex-1">{rule.field_or_event} <span className="text-slate-400">{rule.operator}</span> {rule.value}</span>
                      <span className={clsx('text-sm font-bold', rule.points >= 0 ? 'text-green-600' : 'text-red-600')}>{rule.points > 0 ? '+' : ''}{rule.points}pts</span>
                      <button onClick={() => setRuleEditing(rule)} className="text-slate-400 hover:text-purple-600"><Edit3 size={13} /></button>
                      <button onClick={() => handleDeleteRule(rule.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {detailTab === 'info' && <LeadInfoTab lead={detailLead} onSave={handleUpdateLeadInfo} saving={saving} />}
      </div>
    );
  }

  /* ═══════════════════════ LIST VIEW ═══════════════════════ */
  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: 'Total Leads', value: stats.total, icon: <Users size={16} />, color: 'text-purple-600 bg-purple-50 border-purple-200' },
          { label: 'Leads', value: stats.leads, icon: <UserPlus size={16} />, color: 'text-blue-600 bg-blue-50 border-blue-200' },
          { label: 'MQLs', value: stats.mql, icon: <Target size={16} />, color: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200' },
          { label: 'SQLs', value: stats.sql, icon: <Star size={16} />, color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { label: 'Oportunidades', value: stats.opportunity, icon: <TrendingUp size={16} />, color: 'text-orange-600 bg-orange-50 border-orange-200' },
          { label: 'Clientes', value: stats.customer, icon: <Check size={16} />, color: 'text-green-600 bg-green-50 border-green-200' },
        ].map(s => (
          <div key={s.label} className={clsx('rounded-2xl border p-4 flex flex-col items-center gap-1', s.color)}>
            {s.icon}
            <span className="text-2xl font-black">{s.value}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, email ou telefone..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
            />
          </div>
          <button onClick={() => setFilterOpen(!filterOpen)} className={clsx('p-2.5 rounded-xl border transition-colors', filterOpen ? 'bg-purple-50 border-purple-300 text-purple-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}>
            <Filter size={16} />
          </button>
          <button onClick={() => { setEditLead(EMPTY_LEAD); setShowModal(true); }} className="bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2">
            <Plus size={16} /> Novo Lead
          </button>
          <button onClick={handleImportCSV} className="bg-slate-100 text-slate-700 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-1.5">
            <Upload size={14} /> Importar CSV
          </button>
        </div>

        {/* Filters Dropdown */}
        {filterOpen && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Estágio</label>
              <select value={filterLifecycle} onChange={e => setFilterLifecycle(e.target.value)} className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-400 focus:outline-none">
                <option value="">Todos</option>
                {LIFECYCLE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Score mínimo</label>
              <input type="number" value={filterMinScore} onChange={e => setFilterMinScore(e.target.value ? Number(e.target.value) : '')} placeholder="0" className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Tags</label>
              <div className="flex flex-wrap gap-1 border rounded-lg px-2 py-1.5 min-h-[38px]">
                {filterTags.map(t => (
                  <span key={t} className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    {t} <button onClick={() => setFilterTags(prev => prev.filter(x => x !== t))}><X size={10} /></button>
                  </span>
                ))}
                {allTags.filter(t => !filterTags.includes(t)).length > 0 && (
                  <select onChange={e => { if (e.target.value) { setFilterTags(p => [...p, e.target.value]); e.target.value = ''; } }} className="text-xs border-0 focus:ring-0 p-0 bg-transparent focus:outline-none" defaultValue="">
                    <option value="">+ tag</option>
                    {allTags.filter(t => !filterTags.includes(t)).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">{selectedIds.size} selecionado(s)</span>
            <button onClick={handleDeleteSelected} className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"><Trash2 size={12} /> Excluir</button>
            <button onClick={() => setShowBulkTag(!showBulkTag)} className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"><Tag size={12} /> Adicionar Tag</button>
            {showBulkTag && (
              <div className="flex items-center gap-1">
                <input value={bulkTag} onChange={e => setBulkTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleBulkAddTag()} placeholder="Nome da tag" className="text-xs border rounded-lg px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-purple-400" />
                <button onClick={handleBulkAddTag} className="text-purple-600"><Check size={14} /></button>
              </div>
            )}
            <button onClick={handleExportCSV} className="text-xs text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1 ml-auto"><Download size={12} /> Exportar CSV</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-purple-400" /></div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 text-sm">Nenhum lead encontrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="py-3 px-4 text-left w-10">
                  <input type="checkbox" checked={selectedIds.size === leads.length && leads.length > 0} onChange={e => setSelectedIds(e.target.checked ? new Set(leads.map(l => l.id)) : new Set())} className="rounded border-slate-300" />
                </th>
                <th className="py-3 px-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Nome</th>
                <th className="py-3 px-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="py-3 px-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">Score</th>
                <th className="py-3 px-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">Estágio</th>
                <th className="py-3 px-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Tags</th>
                <th className="py-3 px-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Origem</th>
                <th className="py-3 px-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Última Atividade</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id} onClick={() => openDetail(lead)} className="border-b border-slate-50 hover:bg-purple-50/30 cursor-pointer transition-colors">
                  <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={e => { const next = new Set(selectedIds); e.target.checked ? next.add(lead.id) : next.delete(lead.id); setSelectedIds(next); }} className="rounded border-slate-300" />
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{lead.name || '—'}</td>
                  <td className="py-3 px-3 text-slate-500">{lead.email || '—'}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={clsx('inline-block min-w-[40px] text-center px-2 py-0.5 rounded-lg text-xs font-bold bg-gradient-to-r', scoreColor(lead.score))}>
                      {lead.score}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-semibold', lifecycleBadge(lead.lifecycle_stage))}>
                      {LIFECYCLE_STAGES.find(s => s.key === lead.lifecycle_stage)?.label || lead.lifecycle_stage}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {(lead.tags || []).slice(0, 3).map(t => (
                        <span key={t} className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium', tagColor(t))}>{t}</span>
                      ))}
                      {(lead.tags || []).length > 3 && <span className="text-[10px] text-slate-400">+{lead.tags.length - 3}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-xs">{lead.origin || '—'}</td>
                  <td className="py-3 px-3 text-right text-xs text-slate-400">{fmtShortDate(lead.last_activity_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedIds.size === 0 && leads.length > 0 && (
        <div className="flex justify-end">
          <button onClick={handleExportCSV} className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1"><Download size={12} /> Exportar todos ({leads.length})</button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && <LeadModal lead={editLead} onClose={() => { setShowModal(false); setEditLead(EMPTY_LEAD); }} onSave={handleSave} saving={saving} onChange={setEditLead} />}
    </div>
  );
};

/* ═══════════════════════ Sub-components ═══════════════════════ */

const LeadModal: React.FC<{
  lead: Partial<Lead>;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  onChange: (l: Partial<Lead>) => void;
}> = ({ lead, onClose, onSave, saving, onChange }) => {
  const isEdit = !!lead.id;

  const field = (label: string, key: keyof Lead, type = 'text') => (
    <div>
      <label className="text-xs font-semibold text-slate-600 block mb-1">{label}</label>
      <input
        type={type}
        value={(lead as any)[key] || ''}
        onChange={e => onChange({ ...lead, [key]: e.target.value })}
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h3 className="font-bold text-lg text-slate-800">{isEdit ? 'Editar Lead' : 'Novo Lead'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field('Nome', 'name')}
            {field('Email', 'email', 'email')}
            {field('Telefone', 'phone', 'tel')}
            {field('Empresa', 'company')}
            {field('Cargo', 'job_title')}
            {field('CPF', 'cpf')}
            {field('Cidade', 'city')}
            {field('Estado', 'state')}
            {field('Origem', 'origin')}
            {field('Campanha', 'campaign')}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Estágio do Ciclo de Vida</label>
            <select value={lead.lifecycle_stage || 'lead'} onChange={e => onChange({ ...lead, lifecycle_stage: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400">
              {LIFECYCLE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Tags (separadas por vírgula)</label>
            <input
              value={(lead.tags || []).join(', ')}
              onChange={e => onChange({ ...lead, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              placeholder="marketing, pilates, interessado"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Campos Customizados (JSON)</label>
            <textarea
              value={JSON.stringify(lead.custom_fields || {}, null, 2)}
              onChange={e => { try { onChange({ ...lead, custom_fields: JSON.parse(e.target.value) }); } catch {} }}
              rows={3}
              className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
            />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">Cancelar</button>
          <button onClick={onSave} disabled={saving} className="bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {isEdit ? 'Salvar' : 'Criar Lead'}
          </button>
        </div>
      </div>
    </div>
  );
};

const LeadInfoTab: React.FC<{ lead: Lead; onSave: (u: Partial<Lead>) => void; saving: boolean }> = ({ lead, onSave, saving }) => {
  const [form, setForm] = useState<Partial<Lead>>({
    name: lead.name, email: lead.email, phone: lead.phone, company: lead.company,
    job_title: lead.job_title, city: lead.city, state: lead.state, origin: lead.origin,
    campaign: lead.campaign, custom_fields: lead.custom_fields || {},
  });

  useEffect(() => {
    setForm({
      name: lead.name, email: lead.email, phone: lead.phone, company: lead.company,
      job_title: lead.job_title, city: lead.city, state: lead.state, origin: lead.origin,
      campaign: lead.campaign, custom_fields: lead.custom_fields || {},
    });
  }, [lead]);

  const field = (label: string, key: string) => (
    <div>
      <label className="text-xs font-semibold text-slate-600 block mb-1">{label}</label>
      <input
        value={(form as any)[key] || ''}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
      />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
      <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={16} /> Informações do Lead</h3>
      <div className="grid grid-cols-2 gap-4">
        {field('Nome', 'name')}
        {field('Email', 'email')}
        {field('Telefone', 'phone')}
        {field('Empresa', 'company')}
        {field('Cargo', 'job_title')}
        {field('Cidade', 'city')}
        {field('Estado', 'state')}
        {field('Origem', 'origin')}
        {field('Campanha', 'campaign')}
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1">Campos Customizados (JSON)</label>
        <textarea
          value={JSON.stringify(form.custom_fields || {}, null, 2)}
          onChange={e => { try { setForm(p => ({ ...p, custom_fields: JSON.parse(e.target.value) })); } catch {} }}
          rows={3}
          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
        />
      </div>
      <div className="flex justify-end">
        <button onClick={() => onSave(form)} disabled={saving} className="bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar Alterações
        </button>
      </div>
    </div>
  );
};

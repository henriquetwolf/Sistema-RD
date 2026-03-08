import React, { useState, useEffect, useCallback } from 'react';
import {
  MousePointerClick, Plus, Search, Trash2, Edit3, Eye, Loader2, X, Check,
  BarChart3, ArrowDown, LogOut, Globe, FileText, Settings, ToggleLeft, ToggleRight
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';

/* ───────────────────────── Types ───────────────────────── */

interface Popup {
  id: string;
  name: string;
  popup_type: 'scroll' | 'exit_intent';
  title: string;
  description: string;
  cta_text: string;
  image_url: string;
  form_id: string | null;
  target_pages: string[];
  display_frequency: 'once' | 'every_visit' | 'every_session';
  is_active: boolean;
  views: number;
  conversions: number;
  created_at: string;
}

const EMPTY_POPUP: Partial<Popup> = {
  name: '',
  popup_type: 'scroll',
  title: '',
  description: '',
  cta_text: 'Quero saber mais',
  image_url: '',
  form_id: null,
  target_pages: [],
  display_frequency: 'once',
  is_active: true,
  views: 0,
  conversions: 0,
};

const FREQUENCY_OPTIONS = [
  { key: 'once', label: 'Uma vez' },
  { key: 'every_visit', label: 'Toda visita' },
  { key: 'every_session', label: 'Toda sessão' },
] as const;

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ───────────────────────── Component ───────────────────────── */

export const PopupManager: React.FC = () => {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [forms, setForms] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Partial<Popup>>(EMPTY_POPUP);
  const [saving, setSaving] = useState(false);
  const [targetPageInput, setTargetPageInput] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, f] = await Promise.all([
        appBackend.getMarketingPopups(),
        appBackend.getForms(),
      ]);
      setPopups((p ?? []) as Popup[]);
      setForms((f ?? []).map((fm: any) => ({ id: fm.id, title: fm.title })));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = popups.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await appBackend.saveMarketingPopup(editing);
      setShowModal(false);
      setEditing(EMPTY_POPUP);
      await loadData();
    } catch (e) { console.error(e); }
    setSaving(false);
  }, [editing, loadData]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Excluir este pop-up?')) return;
    await appBackend.deleteMarketingPopup(id);
    await loadData();
  }, [loadData]);

  const handleToggleActive = useCallback(async (popup: Popup) => {
    await appBackend.saveMarketingPopup({ ...popup, is_active: !popup.is_active });
    await loadData();
  }, [loadData]);

  const openEditor = useCallback((popup?: Popup) => {
    setEditing(popup ? { ...popup } : { ...EMPTY_POPUP });
    setTargetPageInput('');
    setShowModal(true);
  }, []);

  const addTargetPage = useCallback(() => {
    const v = targetPageInput.trim();
    if (!v) return;
    setEditing(prev => ({
      ...prev,
      target_pages: [...new Set([...(prev.target_pages || []), v])],
    }));
    setTargetPageInput('');
  }, [targetPageInput]);

  const removeTargetPage = useCallback((url: string) => {
    setEditing(prev => ({
      ...prev,
      target_pages: (prev.target_pages || []).filter(p => p !== url),
    }));
  }, []);

  const conversionRate = (views: number, conversions: number) =>
    views > 0 ? ((conversions / views) * 100).toFixed(1) : '0.0';

  /* ═══════════════════════ RENDER ═══════════════════════ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MousePointerClick className="w-6 h-6 text-purple-500" />
            Pop-ups
          </h2>
          <p className="text-sm text-slate-400 mt-1">Gerencie pop-ups de captura (rolagem e intenção de saída)</p>
        </div>
        <button
          onClick={() => openEditor()}
          className="bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Novo Pop-up
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar pop-ups..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-purple-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <MousePointerClick size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 text-sm">Nenhum pop-up encontrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Nome</th>
                <th className="py-3 px-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">Tipo</th>
                <th className="py-3 px-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="py-3 px-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">Visualizações</th>
                <th className="py-3 px-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">Conversões</th>
                <th className="py-3 px-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">Taxa</th>
                <th className="py-3 px-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(popup => (
                <tr key={popup.id} className="border-b border-slate-50 hover:bg-purple-50/30 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800">{popup.name || 'Sem nome'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmtDate(popup.created_at)}</p>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {popup.popup_type === 'scroll' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        <ArrowDown size={12} /> Rolagem
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        <LogOut size={12} /> Intenção de Saída
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button onClick={() => handleToggleActive(popup)} className="inline-flex items-center gap-1.5">
                      {popup.is_active ? (
                        <ToggleRight size={22} className="text-purple-600" />
                      ) : (
                        <ToggleLeft size={22} className="text-slate-300" />
                      )}
                      <span className={clsx('text-xs font-medium', popup.is_active ? 'text-purple-600' : 'text-slate-400')}>
                        {popup.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </button>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-slate-600">
                      <Eye size={13} className="text-slate-400" /> {popup.views || 0}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-slate-600">
                      <BarChart3 size={13} className="text-purple-400" /> {popup.conversions || 0}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-xs font-bold text-purple-600">
                      {conversionRate(popup.views || 0, popup.conversions || 0)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditor(popup)} className="text-slate-400 hover:text-purple-600 transition-colors">
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => handleDelete(popup.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <MousePointerClick size={18} className="text-purple-500" />
                {editing.id ? 'Editar Pop-up' : 'Novo Pop-up'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Nome do Pop-up</label>
                <input
                  value={editing.name || ''}
                  onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Captura de Leads - Pilates"
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>

              {/* Type Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">Tipo de Ativação</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(p => ({ ...p, popup_type: 'scroll' }))}
                    className={clsx(
                      'flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left',
                      editing.popup_type === 'scroll'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', editing.popup_type === 'scroll' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400')}>
                      <ArrowDown size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Rolagem</p>
                      <p className="text-xs text-slate-400">Exibe quando o visitante rolar 50% da página</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(p => ({ ...p, popup_type: 'exit_intent' }))}
                    className={clsx(
                      'flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left',
                      editing.popup_type === 'exit_intent'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', editing.popup_type === 'exit_intent' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400')}>
                      <LogOut size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Intenção de Saída</p>
                      <p className="text-xs text-slate-400">Exibe quando o cursor se move para sair</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Content Fields */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <FileText size={14} className="text-purple-500" /> Conteúdo
                </h4>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Título (texto grande)</label>
                  <input
                    value={editing.title || ''}
                    onChange={e => setEditing(p => ({ ...p, title: e.target.value }))}
                    placeholder="Ex: Não perca essa oportunidade!"
                    className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Descrição</label>
                  <textarea
                    value={editing.description || ''}
                    onChange={e => setEditing(p => ({ ...p, description: e.target.value }))}
                    rows={3}
                    placeholder="Texto descritivo do pop-up..."
                    className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Texto do Botão CTA</label>
                    <input
                      value={editing.cta_text || ''}
                      onChange={e => setEditing(p => ({ ...p, cta_text: e.target.value }))}
                      placeholder="Ex: Quero saber mais"
                      className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">URL da Imagem (opcional)</label>
                    <input
                      value={editing.image_url || ''}
                      onChange={e => setEditing(p => ({ ...p, image_url: e.target.value }))}
                      placeholder="https://..."
                      className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                    />
                  </div>
                </div>
              </div>

              {/* Form Link */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Formulário de Captura (opcional)
                </label>
                <select
                  value={editing.form_id || ''}
                  onChange={e => setEditing(p => ({ ...p, form_id: e.target.value || null }))}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                >
                  <option value="">Nenhum formulário</option>
                  {forms.map(f => (
                    <option key={f.id} value={f.id}>{f.title}</option>
                  ))}
                </select>
              </div>

              {/* Target Pages */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  <Globe size={12} className="inline mr-1" />
                  Páginas Alvo (padrões de URL)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={targetPageInput}
                    onChange={e => setTargetPageInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTargetPage()}
                    placeholder="Ex: /pilates/* ou /landing-page"
                    className="flex-1 text-sm border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  />
                  <button onClick={addTargetPage} className="bg-purple-100 text-purple-700 px-3 py-2 rounded-xl text-sm font-medium hover:bg-purple-200 transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
                {(editing.target_pages || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(editing.target_pages || []).map(url => (
                      <span key={url} className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-lg flex items-center gap-1.5 font-mono">
                        {url}
                        <button onClick={() => removeTargetPage(url)} className="text-slate-400 hover:text-red-500">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Frequency & Active */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    <Settings size={12} className="inline mr-1" />
                    Frequência de Exibição
                  </label>
                  <select
                    value={editing.display_frequency || 'once'}
                    onChange={e => setEditing(p => ({ ...p, display_frequency: e.target.value as Popup['display_frequency'] }))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  >
                    {FREQUENCY_OPTIONS.map(f => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Status</label>
                  <button
                    type="button"
                    onClick={() => setEditing(p => ({ ...p, is_active: !p.is_active }))}
                    className={clsx(
                      'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                      editing.is_active
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                    )}
                  >
                    {editing.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    {editing.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                  <Eye size={14} className="text-purple-500" /> Pré-visualização
                </h4>
                <div className="relative bg-slate-900/60 rounded-2xl p-8 flex items-center justify-center min-h-[280px]">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                    {editing.image_url && (
                      <img
                        src={editing.image_url}
                        alt="Preview"
                        className="w-full h-40 object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div className="p-6 text-center">
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        {editing.title || 'Título do Pop-up'}
                      </h3>
                      <p className="text-sm text-slate-500 mb-5">
                        {editing.description || 'Descrição do pop-up aparecerá aqui.'}
                      </p>
                      <button className="bg-purple-600 text-white px-8 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
                        {editing.cta_text || 'Botão CTA'}
                      </button>
                    </div>
                    <button className="absolute top-12 right-12 bg-white/90 rounded-full p-1 shadow text-slate-500 hover:text-slate-700">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="absolute top-3 left-4 flex items-center gap-1.5">
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                      editing.popup_type === 'scroll' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
                    )}>
                      {editing.popup_type === 'scroll' ? 'Rolagem 50%' : 'Exit Intent'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editing.name?.trim()}
                className="bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editing.id ? 'Salvar' : 'Criar Pop-up'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

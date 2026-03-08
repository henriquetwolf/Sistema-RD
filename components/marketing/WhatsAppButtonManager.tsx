import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, Plus, Trash2, Edit2, Loader2, X, Check,
  Smartphone, Circle, CheckCircle, Eye, BarChart3, Settings
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';

/* ───────────────────────── Types ───────────────────────── */

interface WAButton {
  id: string;
  phone_number: string;
  default_message: string;
  button_color: string;
  position: 'bottom-right' | 'bottom-left';
  label_text: string;
  target_pages: string[];
  capture_as_lead: boolean;
  is_active: boolean;
  click_count: number;
  created_at: string;
}

const EMPTY_BUTTON: Partial<WAButton> = {
  phone_number: '+55',
  default_message: 'Olá! Gostaria de mais informações.',
  button_color: '#25D366',
  position: 'bottom-right',
  label_text: '',
  target_pages: [],
  capture_as_lead: false,
  is_active: true,
  click_count: 0,
};

const POSITION_OPTIONS = [
  { key: 'bottom-right', label: 'Inferior Direito' },
  { key: 'bottom-left', label: 'Inferior Esquerdo' },
] as const;

const COLOR_PRESETS = ['#25D366', '#128C7E', '#075E54', '#7C3AED', '#EC4899', '#F97316', '#0EA5E9', '#10B981'];

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ───────────────────────── Component ───────────────────────── */

export const WhatsAppButtonManager: React.FC = () => {
  const [buttons, setButtons] = useState<WAButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Partial<WAButton>>(EMPTY_BUTTON);
  const [saving, setSaving] = useState(false);
  const [targetPageInput, setTargetPageInput] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await appBackend.getMarketingWAButtons();
      setButtons((data ?? []) as WAButton[]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await appBackend.saveMarketingWAButton(editing);
      setShowModal(false);
      setEditing(EMPTY_BUTTON);
      await loadData();
    } catch (e) { console.error(e); }
    setSaving(false);
  }, [editing, loadData]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Excluir este botão?')) return;
    await appBackend.deleteMarketingWAButton(id);
    await loadData();
  }, [loadData]);

  const handleToggleActive = useCallback(async (btn: WAButton) => {
    await appBackend.saveMarketingWAButton({ ...btn, is_active: !btn.is_active });
    await loadData();
  }, [loadData]);

  const openEditor = useCallback((btn?: WAButton) => {
    setEditing(btn ? { ...btn } : { ...EMPTY_BUTTON });
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

  /* ═══════════════════════ RENDER ═══════════════════════ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-green-500" />
            Botão WhatsApp
          </h2>
          <p className="text-sm text-slate-400 mt-1">Gerencie botões flutuantes de WhatsApp para seu site</p>
        </div>
        <button
          onClick={() => openEditor()}
          className="bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Novo Botão
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-purple-400" />
          </div>
        ) : buttons.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 text-sm">Nenhum botão WhatsApp configurado.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {buttons.map(btn => (
              <div key={btn.id} className="p-5 hover:bg-purple-50/20 transition-colors">
                <div className="flex items-center gap-5">
                  {/* WA Icon */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg flex-shrink-0"
                    style={{ backgroundColor: btn.button_color || '#25D366' }}
                  >
                    <MessageCircle size={22} className="text-white" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Smartphone size={14} className="text-slate-400" />
                        {btn.phone_number}
                      </span>
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                        btn.position === 'bottom-right' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
                      )}>
                        {POSITION_OPTIONS.find(o => o.key === btn.position)?.label || btn.position}
                      </span>
                      {btn.label_text && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          "{btn.label_text}"
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate max-w-md">
                      {btn.default_message || 'Sem mensagem padrão'}
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">{fmtDate(btn.created_at)}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-slate-600 text-sm font-bold">
                        <BarChart3 size={14} className="text-green-500" />
                        {btn.click_count || 0}
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Cliques</p>
                    </div>

                    {/* Toggle */}
                    <button onClick={() => handleToggleActive(btn)} className="flex items-center gap-1.5">
                      {btn.is_active ? (
                        <CheckCircle size={24} className="text-purple-600" />
                      ) : (
                        <Circle size={24} className="text-slate-300" />
                      )}
                    </button>

                    {/* Actions */}
                    <button onClick={() => openEditor(btn)} className="text-slate-400 hover:text-purple-600 transition-colors p-1">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(btn.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <MessageCircle size={18} className="text-green-500" />
                {editing.id ? 'Editar Botão WhatsApp' : 'Novo Botão WhatsApp'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Phone Number */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  <Smartphone size={12} className="inline mr-1" />
                  Número do WhatsApp (com código do país)
                </label>
                <input
                  value={editing.phone_number || ''}
                  onChange={e => setEditing(p => ({ ...p, phone_number: e.target.value }))}
                  placeholder="+5511999999999"
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 font-mono"
                />
              </div>

              {/* Default Message */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Mensagem Padrão</label>
                <textarea
                  value={editing.default_message || ''}
                  onChange={e => setEditing(p => ({ ...p, default_message: e.target.value }))}
                  rows={3}
                  placeholder="Olá! Gostaria de mais informações..."
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 resize-none"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">Cor do Botão</label>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_PRESETS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditing(p => ({ ...p, button_color: c }))}
                        className={clsx(
                          'w-8 h-8 rounded-full border-2 transition-all',
                          editing.button_color === c ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent hover:scale-105'
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={editing.button_color || '#25D366'}
                    onChange={e => setEditing(p => ({ ...p, button_color: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-400">{editing.button_color || '#25D366'}</span>
                </div>
              </div>

              {/* Position & Label */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Posição</label>
                  <select
                    value={editing.position || 'bottom-right'}
                    onChange={e => setEditing(p => ({ ...p, position: e.target.value as WAButton['position'] }))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  >
                    {POSITION_OPTIONS.map(o => (
                      <option key={o.key} value={o.key}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Texto ao Lado (opcional)</label>
                  <input
                    value={editing.label_text || ''}
                    onChange={e => setEditing(p => ({ ...p, label_text: e.target.value }))}
                    placeholder="Ex: Fale conosco"
                    className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Target Pages */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  <Settings size={12} className="inline mr-1" />
                  Páginas Alvo (padrões de URL)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={targetPageInput}
                    onChange={e => setTargetPageInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTargetPage()}
                    placeholder="Ex: /* (todas) ou /contato"
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

              {/* Capture as Lead & Active */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Capturar como Lead</label>
                  <button
                    type="button"
                    onClick={() => setEditing(p => ({ ...p, capture_as_lead: !p.capture_as_lead }))}
                    className={clsx(
                      'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                      editing.capture_as_lead
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                    )}
                  >
                    {editing.capture_as_lead ? <CheckCircle size={20} /> : <Circle size={20} />}
                    {editing.capture_as_lead ? 'Sim' : 'Não'}
                  </button>
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
                    {editing.is_active ? <CheckCircle size={20} /> : <Circle size={20} />}
                    {editing.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                  <Eye size={14} className="text-purple-500" /> Pré-visualização
                </h4>
                <div className="relative bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 min-h-[200px] overflow-hidden">
                  {/* Simulated page */}
                  <div className="p-6">
                    <div className="w-48 h-3 bg-slate-300 rounded mb-3" />
                    <div className="w-full h-2 bg-slate-200 rounded mb-2" />
                    <div className="w-5/6 h-2 bg-slate-200 rounded mb-2" />
                    <div className="w-4/6 h-2 bg-slate-200 rounded mb-4" />
                    <div className="w-32 h-3 bg-slate-300 rounded mb-3" />
                    <div className="w-full h-2 bg-slate-200 rounded mb-2" />
                    <div className="w-3/4 h-2 bg-slate-200 rounded" />
                  </div>

                  {/* Floating Button */}
                  <div
                    className={clsx(
                      'absolute bottom-4 flex items-center gap-2',
                      editing.position === 'bottom-left' ? 'left-4' : 'right-4'
                    )}
                  >
                    {editing.label_text && editing.position === 'bottom-right' && (
                      <span className="bg-white shadow-lg rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap">
                        {editing.label_text}
                      </span>
                    )}
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl cursor-pointer hover:scale-105 transition-transform"
                      style={{ backgroundColor: editing.button_color || '#25D366' }}
                    >
                      <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </div>
                    {editing.label_text && editing.position === 'bottom-left' && (
                      <span className="bg-white shadow-lg rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap">
                        {editing.label_text}
                      </span>
                    )}
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
                disabled={saving || !editing.phone_number?.trim()}
                className="bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editing.id ? 'Salvar' : 'Criar Botão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

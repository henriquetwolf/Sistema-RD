import React, { useState, useEffect, useCallback } from 'react';
import {
  Smartphone, Plus, Search, Trash2, Edit3, Send, Clock,
  Loader2, X, Check, Users, BarChart3
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';

type ViewMode = 'list' | 'editor';

interface SmsCampaign {
  id: string;
  name: string;
  message: string;
  segment_id: string;
  segment_name: string;
  channel: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  scheduled_at: string;
  stats: { sent: number; delivered: number; failed: number };
  created_at: string;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Rascunho' },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Agendada' },
  sending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Enviando' },
  sent: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Enviada' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-600', label: 'Cancelada' },
};

const SMS_CHAR_LIMIT = 160;

const blankCampaign = (): SmsCampaign => ({
  id: '',
  name: '',
  message: '',
  segment_id: '',
  segment_name: '',
  channel: 'sms',
  status: 'draft',
  scheduled_at: '',
  stats: { sent: 0, delivered: 0, failed: 0 },
  created_at: new Date().toISOString(),
});

export const SmsMarketingManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [view, setView] = useState<ViewMode>('list');
  const [editing, setEditing] = useState<SmsCampaign | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [c, s] = await Promise.all([
        appBackend.getSmsCampaigns(),
        appBackend.getMarketingSegments(),
      ]);
      const smsCampaigns = (c || []).filter(
        (x: any) => !x.channel || x.channel === 'sms'
      );
      setCampaigns(smsCampaigns as SmsCampaign[]);
      setSegments(s || []);
    } catch (e) {
      console.error('[SMS] load error', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = campaigns.filter(c => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.message || '').toLowerCase().includes(q);
  });

  const openEditor = useCallback((campaign?: SmsCampaign) => {
    setEditing(campaign ? { ...campaign } : blankCampaign());
    setView('editor');
  }, []);

  const backToList = useCallback(() => {
    setView('list');
    setEditing(null);
  }, []);

  const patch = useCallback((p: Partial<SmsCampaign>) => {
    setEditing(prev => prev ? { ...prev, ...p } : prev);
  }, []);

  const save = useCallback(async (status: SmsCampaign['status']) => {
    if (!editing) return;
    setIsLoading(true);
    try {
      const seg = segments.find(s => s.id === editing.segment_id);
      await appBackend.saveSmsCampaign({
        ...editing,
        channel: 'sms',
        segment_name: seg?.name || editing.segment_name,
        status,
      });
      await load();
      backToList();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [editing, segments, load, backToList]);

  const deleteCampaign = useCallback(async (id: string) => {
    if (!confirm('Excluir esta campanha SMS?')) return;
    await appBackend.deleteSmsCampaign(id);
    await load();
  }, [load]);

  const charCount = editing?.message?.length || 0;
  const charOverLimit = charCount > SMS_CHAR_LIMIT;

  const pct = (a: number, b: number) => b > 0 ? ((a / b) * 100).toFixed(1) : '0.0';

  // ─── LIST ───
  if (view === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Smartphone size={22} className="text-purple-600" /> SMS Marketing
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Campanhas de SMS em massa</p>
          </div>
          <button
            onClick={() => openEditor()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 transition-all"
          >
            <Plus size={16} /> Nova Campanha
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar campanhas SMS..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-purple-400" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <Smartphone size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Nenhuma campanha SMS encontrada</p>
            <p className="text-sm mt-1">Crie sua primeira campanha de SMS</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(c => {
              const status = STATUS_STYLE[c.status] || STATUS_STYLE.draft;
              const stats = c.stats || { sent: 0, delivered: 0, failed: 0 };
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100/50 transition-all p-5 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="font-bold text-slate-800 text-sm truncate">{c.name || 'Sem nome'}</h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{(c.message || '').slice(0, 50)}...</p>
                    </div>
                    <span className={clsx('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap', status.bg, status.text)}>
                      {status.label}
                    </span>
                  </div>

                  {c.segment_name && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                      <Users size={12} /> {c.segment_name}
                    </div>
                  )}

                  {(stats.sent > 0 || c.status === 'sent') && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center bg-slate-50 rounded-xl py-2">
                        <p className="text-lg font-black text-slate-700">{stats.sent || 0}</p>
                        <p className="text-[10px] text-slate-500">Enviados</p>
                      </div>
                      <div className="text-center bg-emerald-50 rounded-xl py-2">
                        <p className="text-lg font-black text-emerald-600">{pct(stats.delivered || 0, stats.sent || 1)}%</p>
                        <p className="text-[10px] text-slate-500">Entregues</p>
                      </div>
                      <div className="text-center bg-red-50 rounded-xl py-2">
                        <p className="text-lg font-black text-red-500">{stats.failed || 0}</p>
                        <p className="text-[10px] text-slate-500">Falhas</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
                    <Clock size={12} />
                    <span>{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                    {c.scheduled_at && (
                      <>
                        <span className="ml-2">Agendada:</span>
                        <span>{new Date(c.scheduled_at).toLocaleString('pt-BR')}</span>
                      </>
                    )}
                  </div>

                  <div className="mt-auto flex items-center gap-1.5 pt-3 border-t border-slate-100">
                    <button onClick={() => openEditor(c)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl text-slate-600 bg-slate-50 hover:bg-purple-50 hover:text-purple-700 transition-colors">
                      <Edit3 size={13} /> Editar
                    </button>
                    <button onClick={() => deleteCampaign(c.id)} className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Excluir">
                      <Trash2 size={14} />
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

  // ─── EDITOR ───
  if (view === 'editor' && editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={backToList} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100">
              <X size={18} />
            </button>
            <div>
              <h2 className="text-lg font-black text-slate-800">
                {editing.id ? 'Editar Campanha SMS' : 'Nova Campanha SMS'}
              </h2>
              <p className="text-xs text-slate-500">Configure e envie sua campanha de SMS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => save('draft')} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
              <Check size={14} /> Salvar Rascunho
            </button>
            {editing.scheduled_at && (
              <button onClick={() => save('scheduled')} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Clock size={14} /> Agendar
              </button>
            )}
            <button onClick={() => save('sending')} disabled={isLoading || charOverLimit} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-200 hover:shadow-xl disabled:opacity-50 transition-all">
              <Send size={14} /> Enviar Agora
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome da Campanha</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={e => patch({ name: e.target.value })}
                  placeholder="Ex: Promoção Março"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Mensagem SMS</label>
                  <span className={clsx('text-xs font-bold', charOverLimit ? 'text-red-500' : 'text-slate-400')}>
                    {charCount}/{SMS_CHAR_LIMIT}
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={editing.message}
                  onChange={e => patch({ message: e.target.value })}
                  maxLength={SMS_CHAR_LIMIT + 20}
                  placeholder="Sua mensagem SMS aqui..."
                  className={clsx(
                    'w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 resize-y',
                    charOverLimit
                      ? 'border-red-300 focus:ring-red-300 bg-red-50'
                      : 'border-slate-200 focus:ring-purple-300'
                  )}
                />
                {charOverLimit && (
                  <p className="text-xs text-red-500 mt-1">A mensagem excede o limite de {SMS_CHAR_LIMIT} caracteres. Ela poderá ser dividida em múltiplos SMS.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Segmento</label>
                  <select
                    value={editing.segment_id}
                    onChange={e => patch({ segment_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    <option value="">Todos os contatos</option>
                    {segments.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name || 'Segmento'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Agendar para</label>
                  <input
                    type="datetime-local"
                    value={editing.scheduled_at}
                    onChange={e => patch({ scheduled_at: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SMS Preview */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                <Smartphone size={15} className="text-purple-500" /> Preview SMS
              </h3>
              <div className="bg-slate-100 rounded-2xl p-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Smartphone size={14} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">VOLL Pilates</p>
                      <p className="text-[10px] text-slate-400">SMS</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {editing.message || 'Sua mensagem aparecerá aqui...'}
                  </p>
                  <p className="text-[10px] text-slate-400 text-right mt-2">
                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-2xl border border-purple-200 p-5">
              <h3 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                <BarChart3 size={14} /> Dicas SMS
              </h3>
              <ul className="text-xs text-purple-600/80 space-y-2">
                <li>• Mantenha abaixo de 160 caracteres</li>
                <li>• Inclua call-to-action claro</li>
                <li>• Identifique sua empresa no início</li>
                <li>• Ofereça opt-out (LGPD)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

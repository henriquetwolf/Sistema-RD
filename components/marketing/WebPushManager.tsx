import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, Plus, Search, Trash2, Edit3, Send, Clock,
  Loader2, X, Check, Users, BarChart3, Globe, Eye
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';

type ViewMode = 'list' | 'editor';

interface PushCampaign {
  id: string;
  name: string;
  title: string;
  body: string;
  icon_url: string;
  click_url: string;
  segment_id: string;
  segment_name: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  scheduled_at: string;
  stats: { sent: number; displayed: number; clicked: number };
  created_at: string;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Rascunho' },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Agendada' },
  sending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Enviando' },
  sent: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Enviada' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-600', label: 'Cancelada' },
};

const blankCampaign = (): PushCampaign => ({
  id: '',
  name: '',
  title: '',
  body: '',
  icon_url: '',
  click_url: '',
  segment_id: '',
  segment_name: '',
  status: 'draft',
  scheduled_at: '',
  stats: { sent: 0, displayed: 0, clicked: 0 },
  created_at: new Date().toISOString(),
});

export const WebPushManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<PushCampaign[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [view, setView] = useState<ViewMode>('list');
  const [editing, setEditing] = useState<PushCampaign | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [c, s] = await Promise.all([
        appBackend.getPushCampaigns(),
        appBackend.getMarketingSegments(),
      ]);
      setCampaigns((c || []) as PushCampaign[]);
      setSegments(s || []);
    } catch (e) {
      console.error('[Push] load error', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = campaigns.filter(c => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.title || '').toLowerCase().includes(q) ||
      (c.body || '').toLowerCase().includes(q)
    );
  });

  const openEditor = useCallback((campaign?: PushCampaign) => {
    setEditing(campaign ? { ...campaign } : blankCampaign());
    setView('editor');
    setShowPreview(true);
  }, []);

  const backToList = useCallback(() => {
    setView('list');
    setEditing(null);
  }, []);

  const patch = useCallback((p: Partial<PushCampaign>) => {
    setEditing(prev => prev ? { ...prev, ...p } : prev);
  }, []);

  const save = useCallback(async (status: PushCampaign['status']) => {
    if (!editing) return;
    setIsLoading(true);
    try {
      const seg = segments.find(s => s.id === editing.segment_id);
      await appBackend.savePushCampaign({
        ...editing,
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
    if (!confirm('Excluir esta campanha de Push?')) return;
    await appBackend.deletePushCampaign(id);
    await load();
  }, [load]);

  const pct = (a: number, b: number) => b > 0 ? ((a / b) * 100).toFixed(1) : '0.0';

  // ─── LIST ───
  if (view === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Bell size={22} className="text-purple-600" /> Web Push Notifications
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Campanhas de notificação push para navegadores</p>
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
            placeholder="Buscar campanhas push..."
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
            <Bell size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Nenhuma campanha push encontrada</p>
            <p className="text-sm mt-1">Crie sua primeira notificação push</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(c => {
              const status = STATUS_STYLE[c.status] || STATUS_STYLE.draft;
              const stats = c.stats || { sent: 0, displayed: 0, clicked: 0 };
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100/50 transition-all p-5 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="font-bold text-slate-800 text-sm truncate">{c.name || 'Sem nome'}</h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{c.title || '(sem título)'}</p>
                      <p className="text-xs text-slate-400 truncate">{(c.body || '').slice(0, 50)}</p>
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
                      <div className="text-center bg-blue-50 rounded-xl py-2">
                        <p className="text-lg font-black text-blue-600">{pct(stats.displayed || 0, stats.sent || 1)}%</p>
                        <p className="text-[10px] text-slate-500">Exibidos</p>
                      </div>
                      <div className="text-center bg-purple-50 rounded-xl py-2">
                        <p className="text-lg font-black text-purple-600">{pct(stats.clicked || 0, stats.sent || 1)}%</p>
                        <p className="text-[10px] text-slate-500">Clicados</p>
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
                {editing.id ? 'Editar Push Campaign' : 'Nova Push Campaign'}
              </h2>
              <p className="text-xs text-slate-500">Configure sua notificação push</p>
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
            <button onClick={() => save('sending')} disabled={isLoading} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-200 hover:shadow-xl disabled:opacity-50 transition-all">
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
                  placeholder="Ex: Lançamento novo curso"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Título da Notificação</label>
                <input
                  type="text"
                  value={editing.title}
                  onChange={e => patch({ title: e.target.value })}
                  placeholder="Ex: Novidade VOLL Pilates!"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Corpo da Notificação</label>
                <textarea
                  rows={3}
                  value={editing.body}
                  onChange={e => patch({ body: e.target.value })}
                  placeholder="Texto exibido na notificação..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">URL do Ícone</label>
                  <input
                    type="url"
                    value={editing.icon_url}
                    onChange={e => patch({ icon_url: e.target.value })}
                    placeholder="https://exemplo.com/icon.png"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">URL ao Clicar</label>
                  <input
                    type="url"
                    value={editing.click_url}
                    onChange={e => patch({ click_url: e.target.value })}
                    placeholder="https://vollpilates.com.br/promo"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Segmento</label>
                  <select
                    value={editing.segment_id}
                    onChange={e => patch({ segment_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    <option value="">Todos os assinantes</option>
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

          {/* Chrome Notification Preview */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Eye size={15} className="text-purple-500" /> Preview da Notificação
                </h3>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors',
                    showPreview ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-purple-50'
                  )}
                >
                  {showPreview ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {showPreview && (
                <div className="bg-slate-800 rounded-xl p-3">
                  {/* Chrome-style notification card */}
                  <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-[340px]">
                    <div className="flex items-start gap-3 p-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center overflow-hidden">
                        {editing.icon_url ? (
                          <img src={editing.icon_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <Bell size={18} className="text-purple-600" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Globe size={10} className="text-slate-400 flex-shrink-0" />
                          <span className="text-[10px] text-slate-400 truncate">vollpilates.com.br</span>
                          <span className="text-[10px] text-slate-300 ml-auto flex-shrink-0">agora</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {editing.title || 'Título da notificação'}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-0.5">
                          {editing.body || 'Corpo da notificação aparecerá aqui...'}
                        </p>
                      </div>
                      {/* Close button */}
                      <button className="flex-shrink-0 p-1 text-slate-300 hover:text-slate-500">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center mt-2">Estilo Chrome Desktop</p>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-2xl border border-purple-200 p-5">
              <h3 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                <Bell size={14} /> Dicas Push
              </h3>
              <ul className="text-xs text-purple-600/80 space-y-2">
                <li>• Títulos curtos (max 50 caracteres)</li>
                <li>• Use ícone de 192x192px para melhor visual</li>
                <li>• Inclua URL de destino relevante</li>
                <li>• Horários de pico: 9h-11h e 18h-20h</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

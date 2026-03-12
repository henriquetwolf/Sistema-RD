import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, Plus, Search, Trash2, Edit2, Send, Clock,
  Loader2, X, Check, Users, BarChart3, Eye, Settings
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';
import { WhatsAppConfig } from './WhatsAppConfig';

type ViewMode = 'list' | 'editor';
type WaSubTab = 'campaigns' | 'config';

interface Campaign {
  id: string;
  name: string;
  message: string;
  segment_id: string;
  segment_name: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  scheduled_at: string;
  stats: { sent: number; delivered: number; read: number; failed: number };
  created_at: string;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Rascunho' },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Agendada' },
  sending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Enviando' },
  sent: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Enviada' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-600', label: 'Cancelada' },
};

const VARIABLES = ['{{nome}}', '{{email}}', '{{telefone}}'];

const blankCampaign = (): Campaign => ({
  id: '',
  name: '',
  message: '',
  segment_id: '',
  segment_name: '',
  status: 'draft',
  scheduled_at: '',
  stats: { sent: 0, delivered: 0, read: 0, failed: 0 },
  created_at: new Date().toISOString(),
});

const replacePreviewVars = (msg: string) =>
  msg
    .replace(/\{\{nome\}\}/gi, 'Maria Silva')
    .replace(/\{\{email\}\}/gi, 'maria@email.com')
    .replace(/\{\{telefone\}\}/gi, '(11) 99999-0000');

export const WhatsAppMarketingManager: React.FC = () => {
  const [waSubTab, setWaSubTab] = useState<WaSubTab>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [view, setView] = useState<ViewMode>('list');
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [c, s] = await Promise.all([
        appBackend.getSmsCampaigns(),
        appBackend.getMarketingSegments(),
      ]);
      const whatsappCampaigns = (c || []).filter(
        (x: any) => x.channel === 'whatsapp'
      );
      setCampaigns(whatsappCampaigns as Campaign[]);
      setSegments(s || []);
    } catch (e) {
      console.error('[WhatsApp] load error', e);
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

  const openEditor = useCallback((campaign?: Campaign) => {
    setEditing(campaign ? { ...campaign } : blankCampaign());
    setView('editor');
    setShowPreview(false);
  }, []);

  const backToList = useCallback(() => {
    setView('list');
    setEditing(null);
    setShowPreview(false);
  }, []);

  const patch = useCallback((p: Partial<Campaign>) => {
    setEditing(prev => prev ? { ...prev, ...p } : prev);
  }, []);

  const saveDraft = useCallback(async () => {
    if (!editing) return;
    setIsLoading(true);
    try {
      const seg = segments.find(s => s.id === editing.segment_id);
      await appBackend.saveSmsCampaign({
        ...editing,
        channel: 'whatsapp',
        segment_name: seg?.name || editing.segment_name,
        status: 'draft',
      });
      await load();
      backToList();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [editing, segments, load, backToList]);

  const scheduleCampaign = useCallback(async () => {
    if (!editing || !editing.scheduled_at) return;
    setIsLoading(true);
    try {
      const seg = segments.find(s => s.id === editing.segment_id);
      await appBackend.saveSmsCampaign({
        ...editing,
        channel: 'whatsapp',
        segment_name: seg?.name || editing.segment_name,
        status: 'scheduled',
      });
      await load();
      backToList();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [editing, segments, load, backToList]);

  const sendNow = useCallback(async () => {
    if (!editing) return;
    setIsLoading(true);
    try {
      const seg = segments.find(s => s.id === editing.segment_id);
      await appBackend.saveSmsCampaign({
        ...editing,
        channel: 'whatsapp',
        segment_name: seg?.name || editing.segment_name,
        status: 'sending',
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
    if (!confirm('Excluir esta campanha de WhatsApp?')) return;
    await appBackend.deleteSmsCampaign(id);
    await load();
  }, [load]);

  const pct = (a: number, b: number) => b > 0 ? ((a / b) * 100).toFixed(1) : '0.0';

  const subTabBar = (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
      <button
        onClick={() => setWaSubTab('campaigns')}
        className={clsx(
          'px-4 py-2 rounded-lg text-sm font-bold transition-all',
          waSubTab === 'campaigns' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        )}
      >
        Campanhas
      </button>
      <button
        onClick={() => setWaSubTab('config')}
        className={clsx(
          'px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2',
          waSubTab === 'config' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        )}
      >
        <Settings size={16} /> Configurar Whatsapp
      </button>
    </div>
  );

  if (waSubTab === 'config') {
    return (
      <div className="space-y-6">
        {subTabBar}
        <WhatsAppConfig onBack={() => setWaSubTab('campaigns')} />
      </div>
    );
  }

  // ─── LIST ───
  if (view === 'list') {
    return (
      <div className="space-y-6">
        {subTabBar}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <MessageCircle size={22} className="text-green-600" /> WhatsApp Marketing
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Campanhas em massa via WhatsApp</p>
          </div>
          <button
            onClick={() => openEditor()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-200 hover:shadow-xl hover:shadow-green-300 transition-all"
          >
            <Plus size={16} /> Nova Campanha
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar campanhas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-green-400" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <MessageCircle size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Nenhuma campanha de WhatsApp</p>
            <p className="text-sm mt-1">Crie sua primeira campanha</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(c => {
              const status = STATUS_STYLE[c.status] || STATUS_STYLE.draft;
              const stats = c.stats || { sent: 0, delivered: 0, read: 0, failed: 0 };
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200 hover:border-green-300 hover:shadow-lg hover:shadow-green-100/50 transition-all p-5 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="font-bold text-slate-800 text-sm truncate">{c.name || 'Sem nome'}</h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{(c.message || '').slice(0, 60)}...</p>
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
                      <div className="text-center bg-blue-50 rounded-xl py-2">
                        <p className="text-lg font-black text-blue-600">{pct(stats.read || 0, stats.sent || 1)}%</p>
                        <p className="text-[10px] text-slate-500">Lidos</p>
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
                    <button onClick={() => openEditor(c)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl text-slate-600 bg-slate-50 hover:bg-green-50 hover:text-green-700 transition-colors">
                      <Edit2 size={13} /> Editar
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
        {subTabBar}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={backToList} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100">
              <X size={18} />
            </button>
            <div>
              <h2 className="text-lg font-black text-slate-800">
                {editing.id ? 'Editar Campanha WhatsApp' : 'Nova Campanha WhatsApp'}
              </h2>
              <p className="text-xs text-slate-500">Configure sua campanha de WhatsApp Marketing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={saveDraft} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
              <Check size={14} /> Salvar Rascunho
            </button>
            {editing.scheduled_at && (
              <button onClick={scheduleCampaign} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Clock size={14} /> Agendar
              </button>
            )}
            <button onClick={sendNow} disabled={isLoading} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-200 hover:shadow-xl disabled:opacity-50 transition-all">
              <Send size={14} /> Enviar Agora
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome da Campanha</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={e => patch({ name: e.target.value })}
                  placeholder="Ex: Promoção Março"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Mensagem</label>
                <textarea
                  rows={6}
                  value={editing.message}
                  onChange={e => patch({ message: e.target.value })}
                  placeholder="Olá {{nome}}, temos uma novidade para você!"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-y"
                />
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Variáveis:</span>
                  {VARIABLES.map(v => (
                    <button
                      key={v}
                      onClick={() => patch({ message: (editing.message || '') + ' ' + v })}
                      className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Segmento</label>
                  <select
                    value={editing.segment_id}
                    onChange={e => patch({ segment_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
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
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Eye size={15} className="text-green-500" /> Preview
                </h3>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors',
                    showPreview ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-green-50'
                  )}
                >
                  {showPreview ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {showPreview && (
                <div className="bg-[#e5ddd5] rounded-xl p-4 min-h-[200px]">
                  <div className="bg-[#dcf8c6] rounded-xl rounded-tr-none px-4 py-3 max-w-[85%] ml-auto shadow-sm">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {replacePreviewVars(editing.message || 'Sua mensagem aparecerá aqui...')}
                    </p>
                    <p className="text-[10px] text-slate-400 text-right mt-1">
                      {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ✓✓
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-5">
              <h3 className="text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
                <MessageCircle size={14} /> Dicas
              </h3>
              <ul className="text-xs text-green-600/80 space-y-2">
                <li>• Personalize com {'{{nome}}'} para mais engajamento</li>
                <li>• Mensagens curtas têm melhor taxa de leitura</li>
                <li>• Envie em horário comercial</li>
                <li>• Respeite a LGPD e opt-in dos contatos</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

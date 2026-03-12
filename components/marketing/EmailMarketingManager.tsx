import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Mail, Plus, Search, Trash2, Edit2, Send, Clock, Eye, BarChart3,
  Copy, Loader2, X, Check, AlertTriangle, Calendar, Users, Zap,
  ArrowLeft, FileText, MousePointerClick, Settings
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';
import { EmailBrevoConfig } from './EmailBrevoConfig';

type ViewMode = 'list' | 'editor' | 'stats';

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Rascunho' },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Agendada' },
  sending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Enviando' },
  sent: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Enviada' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-600', label: 'Cancelada' },
};

const blankCampaign = (): any => ({
  id: '',
  name: '',
  subject: '',
  subject_b: '',
  from_name: '',
  from_email: '',
  reply_to: '',
  segment_id: '',
  html_content: '',
  template_id: '',
  ab_test: false,
  scheduled: false,
  scheduled_at: '',
  status: 'draft',
  stats: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 },
  created_at: new Date().toISOString(),
});

type EmailSubTab = 'campaigns' | 'config';

export const EmailMarketingManager: React.FC = () => {
  const [emailSubTab, setEmailSubTab] = useState<EmailSubTab>('campaigns');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [view, setView] = useState<ViewMode>('list');
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [statsCampaign, setStatsCampaign] = useState<any | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [c, t, s] = await Promise.all([
        appBackend.getEmailCampaigns(),
        appBackend.getEmailTemplates(),
        appBackend.getMarketingSegments(),
      ]);
      setCampaigns(c);
      setTemplates(t);
      setSegments(s);
    } catch (e) {
      console.error('[EmailMarketing] load error', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return campaigns;
    const q = searchTerm.toLowerCase();
    return campaigns.filter(
      (c: any) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.subject || '').toLowerCase().includes(q)
    );
  }, [campaigns, searchTerm]);

  const openEditor = useCallback((campaign?: any) => {
    setEditingCampaign(campaign ? { ...campaign } : blankCampaign());
    setView('editor');
    setShowPreview(false);
  }, []);

  const openStats = useCallback((campaign: any) => {
    setStatsCampaign(campaign);
    setView('stats');
  }, []);

  const backToList = useCallback(() => {
    setView('list');
    setEditingCampaign(null);
    setStatsCampaign(null);
    setShowPreview(false);
    setConfirmSend(false);
  }, []);

  const saveDraft = useCallback(async () => {
    if (!editingCampaign) return;
    setIsLoading(true);
    try {
      await appBackend.saveEmailCampaign({ ...editingCampaign, status: 'draft' });
      await load();
      backToList();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Erro ao salvar rascunho. Verifique o console.');
    } finally {
      setIsLoading(false);
    }
  }, [editingCampaign, load, backToList]);

  const scheduleCampaign = useCallback(async () => {
    if (!editingCampaign || !editingCampaign.scheduled_at) return;
    setIsLoading(true);
    try {
      await appBackend.saveEmailCampaign({ ...editingCampaign, status: 'scheduled', scheduled: true });
      await load();
      backToList();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [editingCampaign, load, backToList]);

  const sendNow = useCallback(async () => {
    if (!editingCampaign) return;
    setIsLoading(true);
    setConfirmSend(false);
    try {
      const campaignId = await appBackend.saveEmailCampaign({ ...editingCampaign, status: 'draft' });
      if (!campaignId) {
        await load();
        backToList();
        return;
      }
      const result = await appBackend.sendEmailCampaignNow(campaignId);
      if (result.error && result.sent === 0 && result.failed === 0) {
        alert(result.error);
      } else {
        alert(result.failed > 0
          ? `Envio concluído: ${result.sent} enviados, ${result.failed} falhas.`
          : `${result.sent} email(s) enviado(s) com sucesso.`);
      }
      await load();
      backToList();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Erro ao enviar campanha.');
    } finally {
      setIsLoading(false);
    }
  }, [editingCampaign, load, backToList]);

  const duplicateCampaign = useCallback(async (campaign: any) => {
    const dup = { ...campaign, id: '', name: `${campaign.name} (cópia)`, status: 'draft', created_at: new Date().toISOString(), stats: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 } };
    await appBackend.saveEmailCampaign(dup);
    await load();
  }, [load]);

  const deleteCampaign = useCallback(async (id: string) => {
    if (!confirm('Excluir esta campanha?')) return;
    await appBackend.deleteEmailCampaign(id);
    await load();
  }, [load]);

  const applyTemplate = useCallback((templateId: string) => {
    const tpl = templates.find((t: any) => t.id === templateId);
    if (tpl && editingCampaign) {
      setEditingCampaign({ ...editingCampaign, html_content: tpl.html_content || tpl.content || '', template_id: templateId });
    }
  }, [templates, editingCampaign]);

  const patchCampaign = useCallback((patch: Record<string, any>) => {
    if (!editingCampaign) return;
    setEditingCampaign((prev: any) => ({ ...prev, ...patch }));
  }, [editingCampaign]);

  // ─── Stats helpers ───
  const pct = (a: number, b: number) => b > 0 ? ((a / b) * 100).toFixed(1) : '0.0';

  const subTabBar = (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
      <button
        onClick={() => setEmailSubTab('campaigns')}
        className={clsx(
          'px-4 py-2 rounded-lg text-sm font-bold transition-all',
          emailSubTab === 'campaigns' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        )}
      >
        Campanhas
      </button>
      <button
        onClick={() => setEmailSubTab('config')}
        className={clsx(
          'px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2',
          emailSubTab === 'config' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        )}
      >
        <Settings size={16} /> Configurar E-mail (Brevo)
      </button>
    </div>
  );

  if (emailSubTab === 'config') {
    return (
      <div className="space-y-6">
        {subTabBar}
        <EmailBrevoConfig onBack={() => setEmailSubTab('campaigns')} />
      </div>
    );
  }

  // ─── LIST VIEW ───
  if (view === 'list') {
    return (
      <div className="space-y-6">
        {subTabBar}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Mail size={22} className="text-purple-600" /> Email Marketing
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Crie, agende e analise campanhas de email</p>
          </div>
          <button
            onClick={() => openEditor()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 transition-all"
          >
            <Plus size={16} /> Nova Campanha
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar campanhas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-purple-400" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <Mail size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Nenhuma campanha encontrada</p>
            <p className="text-sm mt-1">Crie sua primeira campanha de email marketing</p>
          </div>
        )}

        {/* Campaign Grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((c: any) => {
              const status = STATUS_STYLE[c.status] || STATUS_STYLE.draft;
              const stats = c.stats || {};
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100/50 transition-all p-5 flex flex-col">
                  {/* Top */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="font-bold text-slate-800 text-sm truncate">{c.name || 'Sem nome'}</h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{c.subject || '(sem assunto)'}</p>
                    </div>
                    <span className={clsx('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap', status.bg, status.text)}>
                      {status.label}
                    </span>
                  </div>

                  {/* Stats mini */}
                  {(stats.sent > 0 || c.status === 'sent') && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center bg-slate-50 rounded-xl py-2">
                        <p className="text-lg font-black text-slate-700">{stats.sent || 0}</p>
                        <p className="text-[10px] text-slate-500">Enviados</p>
                      </div>
                      <div className="text-center bg-emerald-50 rounded-xl py-2">
                        <p className="text-lg font-black text-emerald-600">{pct(stats.opened || 0, stats.sent || 1)}%</p>
                        <p className="text-[10px] text-slate-500">Abertos</p>
                      </div>
                      <div className="text-center bg-blue-50 rounded-xl py-2">
                        <p className="text-lg font-black text-blue-600">{pct(stats.clicked || 0, stats.sent || 1)}%</p>
                        <p className="text-[10px] text-slate-500">Clicados</p>
                      </div>
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
                    <Calendar size={12} />
                    <span>{new Date(c.created_at || c.createdAt).toLocaleDateString('pt-BR')}</span>
                    {c.scheduled_at && (
                      <>
                        <Clock size={12} className="ml-2" />
                        <span>Agendada: {new Date(c.scheduled_at).toLocaleString('pt-BR')}</span>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex items-center gap-1.5 pt-3 border-t border-slate-100">
                    <button onClick={() => openEditor(c)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl text-slate-600 bg-slate-50 hover:bg-purple-50 hover:text-purple-700 transition-colors">
                      <Edit2 size={13} /> Editar
                    </button>
                    <button onClick={() => duplicateCampaign(c)} className="p-2 rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Duplicar">
                      <Copy size={14} />
                    </button>
                    {c.status === 'sent' && (
                      <button onClick={() => openStats(c)} className="p-2 rounded-xl text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors" title="Estatísticas">
                        <BarChart3 size={14} />
                      </button>
                    )}
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

  // ─── EDITOR VIEW ───
  if (view === 'editor' && editingCampaign) {
    return (
      <div className="space-y-6">
        {subTabBar}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={backToList} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-lg font-black text-slate-800">
                {editingCampaign.id ? 'Editar Campanha' : 'Nova Campanha'}
              </h2>
              <p className="text-xs text-slate-500">Configure e envie sua campanha de email</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveDraft}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <FileText size={14} /> Salvar Rascunho
            </button>
            {editingCampaign.scheduled && editingCampaign.scheduled_at && (
              <button
                onClick={scheduleCampaign}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Clock size={14} /> Agendar
              </button>
            )}
            <button
              onClick={() => setConfirmSend(true)}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-200 hover:shadow-xl disabled:opacity-50 transition-all"
            >
              <Send size={14} /> Enviar Agora
            </button>
          </div>
        </div>

        {/* Confirm Send Modal */}
        {confirmSend && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <AlertTriangle size={22} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Confirmar envio</h3>
                  <p className="text-sm text-slate-500">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-6">
                Deseja realmente enviar a campanha <strong>"{editingCampaign.name}"</strong> para o segmento selecionado?
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button onClick={() => setConfirmSend(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">
                  Cancelar
                </button>
                <button onClick={sendNow} disabled={isLoading} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Sim, Enviar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-5">
            {/* Name & Subject */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome da Campanha</label>
                <input
                  type="text"
                  value={editingCampaign.name || ''}
                  onChange={e => patchCampaign({ name: e.target.value })}
                  placeholder="Ex: Newsletter Março 2026"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Assunto do Email</label>
                <input
                  type="text"
                  value={editingCampaign.subject || ''}
                  onChange={e => patchCampaign({ subject: e.target.value })}
                  placeholder="Ex: Novidades imperdíveis para você!"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              {/* A/B Test */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingCampaign.ab_test}
                    onChange={e => patchCampaign({ ab_test: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
                <span className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-500" /> Teste A/B de Assunto
                </span>
              </div>
              {editingCampaign.ab_test && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Assunto B</label>
                  <input
                    type="text"
                    value={editingCampaign.subject_b || ''}
                    onChange={e => patchCampaign({ subject_b: e.target.value })}
                    placeholder="Variante B do assunto..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              )}
            </div>

            {/* Sender */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Mail size={15} className="text-purple-500" /> Remetente
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome do Remetente</label>
                  <input
                    type="text"
                    value={editingCampaign.from_name || ''}
                    onChange={e => patchCampaign({ from_name: e.target.value })}
                    placeholder="VOLL Pilates"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Email do Remetente</label>
                  <input
                    type="email"
                    value={editingCampaign.from_email || ''}
                    onChange={e => patchCampaign({ from_email: e.target.value })}
                    placeholder="contato@voll.com.br"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Responder para</label>
                <input
                  type="email"
                  value={editingCampaign.reply_to || ''}
                  onChange={e => patchCampaign({ reply_to: e.target.value })}
                  placeholder="respostas@voll.com.br"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
            </div>

            {/* HTML Content */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <FileText size={15} className="text-purple-500" /> Conteúdo HTML
                </h3>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors",
                    showPreview ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700"
                  )}
                >
                  <Eye size={13} /> {showPreview ? 'Fechar Preview' : 'Preview'}
                </button>
              </div>

              {/* Template selector */}
              {templates.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Carregar Template</label>
                  <select
                    value={editingCampaign.template_id || ''}
                    onChange={e => applyTemplate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    <option value="">Selecione um template...</option>
                    {templates.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name || t.title || 'Template'}</option>
                    ))}
                  </select>
                </div>
              )}

              <textarea
                rows={16}
                value={editingCampaign.html_content || ''}
                onChange={e => patchCampaign({ html_content: e.target.value })}
                placeholder="<html>...</html>"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-300 resize-y"
              />

              {showPreview && editingCampaign.html_content && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
                  <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2">
                    <Eye size={13} className="text-purple-500" />
                    <span className="text-xs font-bold text-slate-500 uppercase">Preview do Email</span>
                  </div>
                  <iframe
                    srcDoc={editingCampaign.html_content}
                    className="w-full border-0 bg-white"
                    style={{ minHeight: 400 }}
                    title="Campaign Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Segment */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Users size={15} className="text-purple-500" /> Segmento
              </h3>
              <select
                value={editingCampaign.segment_id || ''}
                onChange={e => patchCampaign({ segment_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                <option value="">Todos os contatos</option>
                {(segments || []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name || 'Segmento'}</option>
                ))}
              </select>
              {Array.isArray(segments) && segments.length === 0 && (
                <p className="text-xs text-slate-500">Nenhum segmento criado. Crie segmentos em VOLL Marketing → Segmentos para filtrar o público.</p>
              )}
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Clock size={15} className="text-purple-500" /> Agendamento
              </h3>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingCampaign.scheduled}
                    onChange={e => patchCampaign({ scheduled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
                <span className="text-sm text-slate-600">Agendar envio</span>
              </div>
              {editingCampaign.scheduled && (
                <input
                  type="datetime-local"
                  value={editingCampaign.scheduled_at || ''}
                  onChange={e => patchCampaign({ scheduled_at: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              )}
            </div>

            {/* Quick info */}
            <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-2xl border border-purple-200 p-5">
              <h3 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                <Zap size={14} /> Dicas
              </h3>
              <ul className="text-xs text-purple-600/80 space-y-2">
                <li>• Use assuntos curtos e chamativos</li>
                <li>• Personalize com {"{{nome}}"} e {"{{empresa}}"}</li>
                <li>• Teste A/B para melhores resultados</li>
                <li>• Envie nos horários de pico (9h-11h)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── STATS VIEW ───
  if (view === 'stats' && statsCampaign) {
    const s = statsCampaign.stats || {};
    const sent = s.sent || 0;
    const delivered = s.delivered || sent;
    const opened = s.opened || 0;
    const clicked = s.clicked || 0;
    const bounced = s.bounced || 0;
    const unsub = s.unsubscribed || 0;
    const openRate = sent > 0 ? (opened / sent) * 100 : 0;
    const clickRate = sent > 0 ? (clicked / sent) * 100 : 0;

    return (
      <div className="space-y-6">
        {subTabBar}
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={backToList} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <BarChart3 size={20} className="text-purple-600" /> Estatísticas
            </h2>
            <p className="text-sm text-slate-500">{statsCampaign.name}</p>
          </div>
        </div>

        {/* Big Numbers */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: 'Enviados', value: sent, icon: <Send size={18} />, color: 'text-slate-700', bg: 'bg-slate-50' },
            { label: 'Entregues', value: delivered, icon: <Check size={18} />, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Abertos', value: `${openRate.toFixed(1)}%`, icon: <Eye size={18} />, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Clicados', value: `${clickRate.toFixed(1)}%`, icon: <MousePointerClick size={18} />, color: 'text-purple-700', bg: 'bg-purple-50' },
            { label: 'Bounces', value: bounced, icon: <AlertTriangle size={18} />, color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: 'Descadastros', value: unsub, icon: <X size={18} />, color: 'text-red-700', bg: 'bg-red-50' },
          ].map((m, i) => (
            <div key={i} className={clsx('rounded-2xl border border-slate-200 p-5 text-center', m.bg)}>
              <div className={clsx('flex justify-center mb-2', m.color)}>{m.icon}</div>
              <p className={clsx('text-2xl font-black', m.color)}>{m.value}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Rate Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700">Taxa de Abertura</h3>
              <span className="text-xl font-black text-emerald-600">{openRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(openRate, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">{opened} de {sent} emails foram abertos</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700">Taxa de Cliques</h3>
              <span className="text-xl font-black text-purple-600">{clickRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-fuchsia-600 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(clickRate, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">{clicked} de {sent} emails receberam cliques</p>
          </div>
        </div>

        {/* Campaign details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Detalhes da Campanha</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-400 text-xs uppercase font-bold">Assunto:</span> <span className="text-slate-700 ml-2">{statsCampaign.subject}</span></div>
            <div><span className="text-slate-400 text-xs uppercase font-bold">Remetente:</span> <span className="text-slate-700 ml-2">{statsCampaign.from_name} ({statsCampaign.from_email})</span></div>
            <div><span className="text-slate-400 text-xs uppercase font-bold">Criada em:</span> <span className="text-slate-700 ml-2">{new Date(statsCampaign.created_at).toLocaleString('pt-BR')}</span></div>
            <div><span className="text-slate-400 text-xs uppercase font-bold">Status:</span> <span className="text-slate-700 ml-2">{(STATUS_STYLE[statsCampaign.status] || STATUS_STYLE.draft).label}</span></div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

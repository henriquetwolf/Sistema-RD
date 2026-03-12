import React, { useState } from 'react';
import {
  Plus, Trash2, Loader2, Edit2, Megaphone, Globe, ChevronRight,
  Sparkles, Save, X, Target, Users, MessageSquare, Zap, Copy
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';
import { LPAdsProject, LPAdsCampaign, LPAdsLandingPage, LP_ADS_PLATFORM_LABELS, LPAdsPlatform, LPAdsProjectStatus } from './types';
import { LPAdsStatusBadge } from './LPAdsStatusBadge';

interface Props {
  project: LPAdsProject;
  campaigns: LPAdsCampaign[];
  baseLp: LPAdsLandingPage | null;
  variantLps: LPAdsLandingPage[];
  onCampaignsChange: () => void;
  onLPChange: () => void;
}

const EMPTY_CAMPAIGN: Partial<LPAdsCampaign> = {
  name: '',
  objective: '',
  platform: 'meta_ads',
  focus_angle: '',
  persona: '',
  specific_pain: '',
  specific_promise: '',
  cta: '',
  tone_of_voice: '',
  notes: '',
  ad_creatives: [],
  status: 'draft',
};

const FOCUS_SUGGESTIONS = [
  'Empreendedorismo', 'Empregabilidade', 'Liderança', 'Produtividade',
  'Transição de Carreira', 'Renda Extra', 'Crescimento Profissional',
  'Qualidade de Vida', 'Autoridade', 'Saúde e Bem-Estar',
];

export const LPAdsAdCampaignList: React.FC<Props> = ({ project, campaigns, baseLp, variantLps, onCampaignsChange, onLPChange }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Partial<LPAdsCampaign> | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingAdId, setGeneratingAdId] = useState<string | null>(null);
  const [generatingLpId, setGeneratingLpId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!editingCampaign?.name?.trim()) return;
    setSaving(true);
    try {
      await appBackend.lpAds.campaigns.save({
        ...editingCampaign,
        project_id: project.id,
      });
      setShowForm(false);
      setEditingCampaign(null);
      onCampaignsChange();
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este anúncio?')) return;
    await appBackend.lpAds.campaigns.delete(id);
    onCampaignsChange();
  };

  const handleGenerateAd = async (campaignId: string) => {
    setGeneratingAdId(campaignId);
    try {
      const result = await appBackend.lpAds.generate({
        job_type: 'generate_ad',
        project_id: project.id,
        target_id: campaignId,
      });
      if (result?.success) onCampaignsChange();
      else alert(result?.error || 'Erro ao gerar anúncio.');
    } catch { /* silent */ }
    setGeneratingAdId(null);
  };

  const handleGenerateVariantLP = async (campaignId: string) => {
    if (!baseLp) { alert('Crie a Landing Page Base antes de gerar uma derivada.'); return; }
    setGeneratingLpId(campaignId);
    try {
      const result = await appBackend.lpAds.generate({
        job_type: 'generate_variant_lp',
        project_id: project.id,
        target_id: campaignId,
      });
      if (result?.success) {
        onLPChange();
        onCampaignsChange();
      } else {
        alert(result?.error || 'Erro ao gerar LP derivada.');
      }
    } catch { /* silent */ }
    setGeneratingLpId(null);
  };

  const openCreate = () => {
    setEditingCampaign({ ...EMPTY_CAMPAIGN });
    setShowForm(true);
  };

  const openEdit = (campaign: LPAdsCampaign) => {
    setEditingCampaign({ ...campaign });
    setShowForm(true);
  };

  const getVariantLP = (campaignId: string) => variantLps.find(lp => lp.campaign_id === campaignId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Anúncios e Campanhas</h3>
          <p className="text-xs text-slate-400">Cada anúncio representa um ângulo de comunicação. Gere uma LP derivada para cada um.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          <Plus size={16} /> Novo Anúncio
        </button>
      </div>

      {/* No base LP warning */}
      {!baseLp && (
        <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 text-sm text-amber-700 font-medium">
          Crie primeiro a Landing Page Base para poder gerar LPs derivadas dos anúncios.
        </div>
      )}

      {/* Campaign Cards */}
      {campaigns.length === 0 && !showForm && (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <Megaphone size={40} className="mx-auto text-slate-300 mb-3" />
          <h4 className="font-bold text-slate-600 mb-1">Nenhum anúncio criado</h4>
          <p className="text-xs text-slate-400 mb-4">Crie anúncios com diferentes ângulos para gerar LPs personalizadas</p>
          <button onClick={openCreate} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">
            <Plus size={14} className="inline mr-1" /> Criar Primeiro Anúncio
          </button>
        </div>
      )}

      {campaigns.map(campaign => {
        const variantLp = getVariantLP(campaign.id);
        return (
          <div key={campaign.id} className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">
            {/* Campaign Header */}
            <div className="p-5 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-slate-800">{campaign.name}</h4>
                  <LPAdsStatusBadge status={campaign.status as LPAdsProjectStatus} />
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                    {LP_ADS_PLATFORM_LABELS[campaign.platform as LPAdsPlatform] || campaign.platform}
                  </span>
                </div>
                {campaign.focus_angle && (
                  <p className="text-xs text-indigo-600 font-medium mb-1">Foco: {campaign.focus_angle}</p>
                )}
                {campaign.specific_promise && (
                  <p className="text-xs text-slate-500">{campaign.specific_promise}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(campaign)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(campaign.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Creatives Preview */}
            {campaign.ad_creatives && campaign.ad_creatives.length > 0 && (
              <div className="px-5 pb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Criativos Gerados</p>
                <div className="space-y-1">
                  {campaign.ad_creatives.slice(0, 3).map((creative: any, i: number) => (
                    <div key={i} className="px-3 py-2 bg-slate-50 rounded-lg text-xs">
                      <span className="font-bold text-slate-500 mr-2">{creative.type}:</span>
                      <span className="text-slate-600">{creative.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleGenerateAd(campaign.id)}
                disabled={generatingAdId === campaign.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-40"
              >
                {generatingAdId === campaign.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {campaign.ad_creatives?.length ? 'Regenerar Criativos' : 'Gerar Criativos com IA'}
              </button>

              <button
                onClick={() => handleGenerateVariantLP(campaign.id)}
                disabled={!baseLp || generatingLpId === campaign.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-600 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-40"
              >
                {generatingLpId === campaign.id ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
                {variantLp ? 'Regenerar LP Derivada' : 'Gerar LP Derivada'}
              </button>

              {variantLp && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                  <Globe size={10} /> LP Derivada criada
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Create/Edit Modal */}
      {showForm && editingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => { setShowForm(false); setEditingCampaign(null); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-800">
                {editingCampaign.id ? 'Editar Anúncio' : 'Novo Anúncio'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingCampaign(null); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome do Anúncio *</label>
                  <input
                    type="text"
                    value={editingCampaign.name || ''}
                    onChange={e => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                    placeholder="Ex: Campanha Empreendedorismo"
                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Plataforma</label>
                  <select
                    value={editingCampaign.platform || 'meta_ads'}
                    onChange={e => setEditingCampaign({ ...editingCampaign, platform: e.target.value as LPAdsPlatform })}
                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm focus:border-indigo-400 focus:outline-none cursor-pointer"
                  >
                    {Object.entries(LP_ADS_PLATFORM_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Foco / Ângulo da Campanha *</label>
                <input
                  type="text"
                  value={editingCampaign.focus_angle || ''}
                  onChange={e => setEditingCampaign({ ...editingCampaign, focus_angle: e.target.value })}
                  placeholder="Ex: Empreendedorismo, Liderança, Produtividade..."
                  className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {FOCUS_SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setEditingCampaign({ ...editingCampaign, focus_angle: s })}
                      className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Objetivo</label>
                <input
                  type="text"
                  value={editingCampaign.objective || ''}
                  onChange={e => setEditingCampaign({ ...editingCampaign, objective: e.target.value })}
                  placeholder="Ex: Gerar leads qualificados para o curso"
                  className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Persona</label>
                  <input
                    type="text"
                    value={editingCampaign.persona || ''}
                    onChange={e => setEditingCampaign({ ...editingCampaign, persona: e.target.value })}
                    placeholder="Ex: Profissional de 30-40 anos buscando crescimento"
                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tom de Voz</label>
                  <input
                    type="text"
                    value={editingCampaign.tone_of_voice || ''}
                    onChange={e => setEditingCampaign({ ...editingCampaign, tone_of_voice: e.target.value })}
                    placeholder="Ex: Motivacional, Direto, Empático..."
                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Dor Específica</label>
                <textarea
                  value={editingCampaign.specific_pain || ''}
                  onChange={e => setEditingCampaign({ ...editingCampaign, specific_pain: e.target.value })}
                  placeholder="A dor principal que este anúncio vai atacar..."
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm focus:border-indigo-400 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Promessa Específica</label>
                <textarea
                  value={editingCampaign.specific_promise || ''}
                  onChange={e => setEditingCampaign({ ...editingCampaign, specific_promise: e.target.value })}
                  placeholder="A promessa central deste anúncio..."
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm focus:border-indigo-400 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">CTA</label>
                  <input
                    type="text"
                    value={editingCampaign.cta || ''}
                    onChange={e => setEditingCampaign({ ...editingCampaign, cta: e.target.value })}
                    placeholder="Ex: Inscreva-se agora"
                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Observações</label>
                  <input
                    type="text"
                    value={editingCampaign.notes || ''}
                    onChange={e => setEditingCampaign({ ...editingCampaign, notes: e.target.value })}
                    placeholder="Notas adicionais..."
                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => { setShowForm(false); setEditingCampaign(null); }} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editingCampaign.name?.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingCampaign.id ? 'Salvar Alterações' : 'Criar Anúncio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Tree */}
      {campaigns.length > 0 && baseLp && (
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Árvore do Projeto</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="font-bold text-slate-800">{project.name}</span>
            </div>
            <div className="ml-4 pl-4 border-l-2 border-indigo-200 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Globe size={14} className="text-indigo-500" />
                <span className="font-medium text-slate-700">Landing Page Base</span>
                <LPAdsStatusBadge status={baseLp.status as LPAdsProjectStatus} />
              </div>
              {campaigns.map(campaign => {
                const variant = getVariantLP(campaign.id);
                return (
                  <div key={campaign.id} className="ml-4 pl-4 border-l-2 border-purple-200">
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <Megaphone size={14} className="text-purple-500" />
                      <span className="font-medium text-slate-700">{campaign.name}</span>
                      <span className="text-[10px] text-slate-400">({campaign.focus_angle})</span>
                    </div>
                    {variant && (
                      <div className="ml-4 pl-4 border-l-2 border-emerald-200 flex items-center gap-2 text-sm">
                        <Globe size={12} className="text-emerald-500" />
                        <span className="text-slate-600">LP Derivada - {campaign.focus_angle}</span>
                        <LPAdsStatusBadge status={variant.status as LPAdsProjectStatus} />
                      </div>
                    )}
                    {!variant && (
                      <div className="ml-4 pl-4 border-l-2 border-slate-200 flex items-center gap-2 text-sm">
                        <Globe size={12} className="text-slate-300" />
                        <span className="text-slate-400 italic">LP não gerada</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

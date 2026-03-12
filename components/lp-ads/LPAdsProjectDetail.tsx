import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Loader2, FileText, Globe, Megaphone, Settings,
  BarChart3, FlaskConical, Sparkles, Clock
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';
import { LPAdsProject, LPAdsLandingPage, LPAdsCampaign, LPAdsSourceAsset, LPAdsProjectStatus } from './types';
import { LPAdsStatusBadge } from './LPAdsStatusBadge';
import { LPAdsProductForm } from './LPAdsProductForm';
import { LPAdsBaseLPEditor } from './LPAdsBaseLPEditor';
import { LPAdsAdCampaignList } from './LPAdsAdCampaignList';
import { LPAdsClaudeConfig } from './LPAdsClaudeConfig';
import { LPAdsPerformanceDashboard } from './LPAdsPerformanceDashboard';
import { LPAdsVersionHistory } from './LPAdsVersionHistory';

type Tab = 'product' | 'base_lp' | 'campaigns' | 'performance' | 'config';

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: 'product', label: 'Dados do Produto', icon: <FileText size={16} /> },
  { id: 'base_lp', label: 'Landing Page Base', icon: <Globe size={16} /> },
  { id: 'campaigns', label: 'Anúncios', icon: <Megaphone size={16} /> },
  { id: 'performance', label: 'Performance', icon: <BarChart3 size={16} /> },
  { id: 'config', label: 'Config IA', icon: <Settings size={16} /> },
];

interface Props {
  projectId: string;
  onBack: () => void;
}

export const LPAdsProjectDetail: React.FC<Props> = ({ projectId, onBack }) => {
  const [project, setProject] = useState<LPAdsProject | null>(null);
  const [landingPages, setLandingPages] = useState<LPAdsLandingPage[]>([]);
  const [campaigns, setCampaigns] = useState<LPAdsCampaign[]>([]);
  const [assets, setAssets] = useState<LPAdsSourceAsset[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('product');
  const [isLoading, setIsLoading] = useState(true);

  const loadProject = async () => {
    setIsLoading(true);
    try {
      const [proj, lps, camps, assts] = await Promise.all([
        appBackend.lpAds.projects.getById(projectId),
        appBackend.lpAds.landingPages.listByProject(projectId),
        appBackend.lpAds.campaigns.listByProject(projectId),
        appBackend.lpAds.sourceAssets.listByProject(projectId),
      ]);
      setProject(proj);
      setLandingPages(lps || []);
      setCampaigns(camps || []);
      setAssets(assts || []);
    } catch { /* silent */ }
    setIsLoading(false);
  };

  useEffect(() => { loadProject(); }, [projectId]);

  const reloadLPs = async () => {
    const lps = await appBackend.lpAds.landingPages.listByProject(projectId);
    setLandingPages(lps || []);
  };

  const reloadCampaigns = async () => {
    const camps = await appBackend.lpAds.campaigns.listByProject(projectId);
    setCampaigns(camps || []);
  };

  const reloadAssets = async () => {
    const assts = await appBackend.lpAds.sourceAssets.listByProject(projectId);
    setAssets(assts || []);
  };

  const baseLp = landingPages.find(lp => lp.page_type === 'base') || null;
  const variantLps = landingPages.filter(lp => lp.page_type === 'variant');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 size={36} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Projeto não encontrado.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 text-indigo-600 font-bold text-sm">Voltar</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft size={20} className="text-slate-500" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-800">{project.name}</h1>
              <LPAdsStatusBadge status={project.status as LPAdsProjectStatus} size="md" />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{project.description || 'Sem descrição'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg">
            <Globe size={13} /> {landingPages.length} LP{landingPages.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg">
            <Megaphone size={13} /> {campaigns.length} Anúncio{campaigns.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-50 rounded-2xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 justify-center',
              activeTab === tab.id
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'campaigns' && campaigns.length > 0 && (
              <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">{campaigns.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'product' && (
          <LPAdsProductForm
            project={project}
            assets={assets}
            onSave={(updated) => setProject(updated)}
            onAssetsChange={reloadAssets}
          />
        )}

        {activeTab === 'base_lp' && (
          <LPAdsBaseLPEditor
            project={project}
            baseLp={baseLp}
            assets={assets}
            onLPChange={reloadLPs}
          />
        )}

        {activeTab === 'campaigns' && (
          <LPAdsAdCampaignList
            project={project}
            campaigns={campaigns}
            baseLp={baseLp}
            variantLps={variantLps}
            onCampaignsChange={reloadCampaigns}
            onLPChange={reloadLPs}
          />
        )}

        {activeTab === 'performance' && (
          <LPAdsPerformanceDashboard
            project={project}
            landingPages={landingPages}
            campaigns={campaigns}
          />
        )}

        {activeTab === 'config' && (
          <LPAdsClaudeConfig />
        )}

        {/* Version History (shown below base_lp tab) */}
        {activeTab === 'base_lp' && baseLp && (
          <div className="mt-6">
            <LPAdsVersionHistory
              landingPageId={baseLp.id}
              currentVersion={baseLp.current_version}
              onRestoreVersion={async (version) => {
                await appBackend.lpAds.landingPages.save({
                  ...baseLp,
                  content: version.content,
                  html_code: version.html_code,
                  current_version: (baseLp.current_version || 0) + 1,
                });
                reloadLPs();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  Eye, MousePointerClick, TrendingUp, Trophy, Calendar,
  Loader2, Globe, Megaphone, Monitor, Smartphone, Tablet,
  ExternalLink, Copy, CheckCircle
} from 'lucide-react';
import { appBackend } from '../../services/appBackend';
import { LPAdsProject, LPAdsLandingPage, LPAdsCampaign } from './types';

interface Props {
  project: LPAdsProject;
  landingPages: LPAdsLandingPage[];
  campaigns: LPAdsCampaign[];
}

interface LPMetrics {
  landing_page_id: string;
  title: string;
  page_type: string;
  campaign_name: string;
  views: number;
  conversions: number;
  rate: number;
  cta_clicks: number;
}

interface EventRow {
  landing_page_id: string;
  event_type: string;
  utm_source: string;
  device_type: string;
  created_at: string;
}

export const LPAdsPerformanceDashboard: React.FC<Props> = ({ project, landingPages, campaigns }) => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const supabase = appBackend.client;
        let evtQuery = supabase.from('lp_ads_page_events').select('landing_page_id, event_type, utm_source, device_type, created_at').eq('project_id', project.id);
        let convQuery = supabase.from('lp_ads_conversions').select('landing_page_id, conversion_type, created_at').eq('project_id', project.id);

        if (period !== 'all') {
          const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
          const since = new Date(Date.now() - days * 86400000).toISOString();
          evtQuery = evtQuery.gte('created_at', since);
          convQuery = convQuery.gte('created_at', since);
        }

        const [evtRes, convRes] = await Promise.all([
          evtQuery.order('created_at', { ascending: false }).limit(10000),
          convQuery.order('created_at', { ascending: false }).limit(10000),
        ]);

        setEvents(evtRes.data || []);
        setConversions(convRes.data || []);
      } catch { /* silent */ }
      setIsLoading(false);
    };
    load();
  }, [project.id, period]);

  const metrics: LPMetrics[] = useMemo(() => {
    return landingPages.map(lp => {
      const lpEvents = events.filter(e => e.landing_page_id === lp.id);
      const lpConversions = conversions.filter(c => c.landing_page_id === lp.id);
      const views = lpEvents.filter(e => e.event_type === 'page_view').length;
      const ctaClicks = lpEvents.filter(e => e.event_type === 'cta_click').length;
      const convCount = lpConversions.length;
      const campaign = campaigns.find(c => c.id === lp.campaign_id);

      return {
        landing_page_id: lp.id,
        title: lp.title || (lp.page_type === 'base' ? 'LP Base' : `LP ${campaign?.focus_angle || 'Variante'}`),
        page_type: lp.page_type,
        campaign_name: campaign?.name || (lp.page_type === 'base' ? 'Base' : '—'),
        views,
        conversions: convCount,
        rate: views > 0 ? (convCount / views) * 100 : 0,
        cta_clicks: ctaClicks,
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [landingPages, events, conversions, campaigns]);

  const totalViews = metrics.reduce((s, m) => s + m.views, 0);
  const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0);
  const avgRate = totalViews > 0 ? (totalConversions / totalViews) * 100 : 0;
  const bestLP = metrics.filter(m => m.views >= 10).sort((a, b) => b.rate - a.rate)[0];

  const utmBreakdown = useMemo(() => {
    const map: Record<string, { views: number; conversions: number }> = {};
    events.filter(e => e.event_type === 'page_view' && e.utm_source).forEach(e => {
      if (!map[e.utm_source]) map[e.utm_source] = { views: 0, conversions: 0 };
      map[e.utm_source].views++;
    });
    conversions.forEach(c => {
      const evt = events.find(e => e.landing_page_id === c.landing_page_id && e.utm_source);
      if (evt?.utm_source && map[evt.utm_source]) map[evt.utm_source].conversions++;
    });
    return Object.entries(map).sort((a, b) => b[1].views - a[1].views);
  }, [events, conversions]);

  const deviceBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    events.filter(e => e.event_type === 'page_view').forEach(e => {
      const device = e.device_type || 'desktop';
      map[device] = (map[device] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [events]);

  const getPageUrl = (lpId: string) => {
    const base = window.location.origin + window.location.pathname;
    return `${base}?lpAdsPageId=${lpId}`;
  };

  const copyUrl = (lpId: string) => {
    navigator.clipboard.writeText(getPageUrl(lpId));
    setCopiedUrl(lpId);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const DeviceIcon = ({ type }: { type: string }) => {
    if (type === 'mobile') return <Smartphone size={12} />;
    if (type === 'tablet') return <Tablet size={12} />;
    return <Monitor size={12} />;
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-indigo-400" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-lg">Performance</h3>
        <div className="flex gap-1 bg-slate-50 rounded-lg p-0.5">
          {(['7d', '30d', '90d', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${period === p ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {p === 'all' ? 'Tudo' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 text-center">
          <Eye size={20} className="mx-auto text-blue-500 mb-2" />
          <p className="text-2xl font-black text-slate-800">{totalViews.toLocaleString('pt-BR')}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Visualizações</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 text-center">
          <MousePointerClick size={20} className="mx-auto text-green-500 mb-2" />
          <p className="text-2xl font-black text-slate-800">{totalConversions.toLocaleString('pt-BR')}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Conversões</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 text-center">
          <TrendingUp size={20} className="mx-auto text-purple-500 mb-2" />
          <p className="text-2xl font-black text-slate-800">{avgRate.toFixed(1)}%</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Taxa Média</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 text-center">
          <Trophy size={20} className="mx-auto text-amber-500 mb-2" />
          <p className="text-sm font-bold text-slate-800 truncate">{bestLP?.title || '—'}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Melhor LP</p>
        </div>
      </div>

      {/* LP Comparison Table */}
      {metrics.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comparativo de Landing Pages</h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase">
                <th className="px-5 py-2.5">Página</th>
                <th className="px-5 py-2.5">Tipo</th>
                <th className="px-5 py-2.5 text-right">Views</th>
                <th className="px-5 py-2.5 text-right">Cliques CTA</th>
                <th className="px-5 py-2.5 text-right">Conversões</th>
                <th className="px-5 py-2.5 text-right">Taxa</th>
                <th className="px-5 py-2.5 w-16">URL</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, idx) => (
                <tr key={m.landing_page_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      {idx === 0 && m.views >= 10 && <Trophy size={12} className="text-amber-500" />}
                      <span className="font-medium text-slate-800">{m.title}</span>
                    </div>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.page_type === 'base' ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'}`}>
                      {m.page_type === 'base' ? 'Base' : m.campaign_name}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium">{m.views.toLocaleString('pt-BR')}</td>
                  <td className="px-5 py-2.5 text-right font-medium">{m.cta_clicks.toLocaleString('pt-BR')}</td>
                  <td className="px-5 py-2.5 text-right font-bold text-green-600">{m.conversions.toLocaleString('pt-BR')}</td>
                  <td className="px-5 py-2.5 text-right">
                    <span className={`font-bold ${m.rate > avgRate ? 'text-green-600' : m.rate < avgRate ? 'text-red-500' : 'text-slate-600'}`}>
                      {m.rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    <button onClick={() => copyUrl(m.landing_page_id)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" title="Copiar URL">
                      {copiedUrl === m.landing_page_id ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* UTM Sources */}
        {utmBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Fontes de Tráfego</h4>
            <div className="space-y-2">
              {utmBreakdown.slice(0, 8).map(([source, data]) => (
                <div key={source} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 font-medium">{source}</span>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{data.views} views</span>
                    <span className="text-green-600 font-bold">{data.conversions} conv.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Device Breakdown */}
        {deviceBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Dispositivos</h4>
            <div className="space-y-2">
              {deviceBreakdown.map(([device, count]) => {
                const pct = totalViews > 0 ? (count / totalViews) * 100 : 0;
                return (
                  <div key={device} className="flex items-center gap-3">
                    <DeviceIcon type={device} />
                    <span className="text-sm text-slate-700 font-medium capitalize w-16">{device}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div className="bg-indigo-500 rounded-full h-2 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 font-bold w-16 text-right">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {totalViews === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <Eye size={36} className="mx-auto text-slate-300 mb-3" />
          <h4 className="font-bold text-slate-600 mb-1">Sem dados ainda</h4>
          <p className="text-xs text-slate-400">Publique landing pages e compartilhe as URLs para começar a coletar dados de performance.</p>
        </div>
      )}
    </div>
  );
};

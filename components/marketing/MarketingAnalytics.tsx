import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Users, Mail, Globe, FileText,
  MessageCircle, Smartphone, Bell, Target, Eye, MousePointerClick,
  Download, Calendar, Filter, Loader2, ArrowRight
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

type TabId = 'funnel' | 'channels' | 'campaigns';
type DateRange = '7' | '30' | '90' | 'custom';

const FUNNEL_STAGES = [
  { key: 'visitors', label: 'Visitantes', icon: Eye, color: '#a855f7' },
  { key: 'leads', label: 'Leads', icon: Users, color: '#c084fc' },
  { key: 'mql', label: 'MQL', icon: Target, color: '#d946ef' },
  { key: 'sql', label: 'SQL', icon: Filter, color: '#e879f9' },
  { key: 'opportunity', label: 'Oportunidade', icon: TrendingUp, color: '#f0abfc' },
  { key: 'customer', label: 'Cliente', icon: Users, color: '#f5d0fe' },
];

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  email: { label: 'Email', icon: Mail, color: 'text-purple-600', bg: 'bg-purple-50' },
  landing_pages: { label: 'Landing Pages', icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50' },
  forms: { label: 'Formulários', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  social: { label: 'Redes Sociais', icon: Globe, color: 'text-pink-600', bg: 'bg-pink-50' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-50' },
  sms: { label: 'SMS', icon: Smartphone, color: 'text-violet-600', bg: 'bg-violet-50' },
  push: { label: 'Push', icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50' },
};

const CHART_COLORS = ['#a855f7', '#d946ef', '#ec4899', '#8b5cf6', '#6366f1', '#3b82f6', '#10b981'];

const TABS: { id: TabId; label: string }[] = [
  { id: 'funnel', label: 'Funil' },
  { id: 'channels', label: 'Canais' },
  { id: 'campaigns', label: 'Campanhas' },
];

export const MarketingAnalytics: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [emailCampaigns, setEmailCampaigns] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [socialPosts, setSocialPosts] = useState<any[]>([]);
  const [smsCampaigns, setSmsCampaigns] = useState<any[]>([]);
  const [pushCampaigns, setPushCampaigns] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('funnel');
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [sortColumn, setSortColumn] = useState<string>('sent');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [l, ec, seg, sp, sms, push] = await Promise.all([
          appBackend.getMarketingLeads(),
          appBackend.getEmailCampaigns(),
          appBackend.getMarketingSegments(),
          appBackend.getSocialPosts(),
          appBackend.getSmsCampaigns(),
          appBackend.getPushCampaigns(),
        ]);
        setLeads(l ?? []);
        setEmailCampaigns(ec ?? []);
        setSegments(seg ?? []);
        setSocialPosts(sp ?? []);
        setSmsCampaigns(sms ?? []);
        setPushCampaigns(push ?? []);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const daysNum = dateRange === 'custom' ? 30 : parseInt(dateRange);

  const filteredLeads = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysNum);
    return leads.filter(l => l.created_at && new Date(l.created_at) >= cutoff);
  }, [leads, daysNum]);

  // ─── Funnel data ───
  const funnelData = useMemo(() => {
    const visitors = Math.max(filteredLeads.length * 3, filteredLeads.length);
    const leadsCount = filteredLeads.length;
    const mql = filteredLeads.filter(l => ['mql', 'sql', 'opportunity', 'customer'].includes(l.lifecycle_stage)).length;
    const sql = filteredLeads.filter(l => ['sql', 'opportunity', 'customer'].includes(l.lifecycle_stage)).length;
    const opportunity = filteredLeads.filter(l => ['opportunity', 'customer'].includes(l.lifecycle_stage)).length;
    const customer = filteredLeads.filter(l => l.lifecycle_stage === 'customer').length;

    const counts = [visitors, leadsCount, mql, sql, opportunity, customer];
    return FUNNEL_STAGES.map((stage, i) => ({
      ...stage,
      count: counts[i],
      conversionRate: i > 0 && counts[i - 1] > 0
        ? ((counts[i] / counts[i - 1]) * 100).toFixed(1)
        : null,
    }));
  }, [filteredLeads]);

  // ─── Funnel over time ───
  const funnelOverTime = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - daysNum);

    const dayMap: Record<string, { date: string; leads: number; mql: number; customer: number }> = {};
    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = { date: `${key.slice(8, 10)}/${key.slice(5, 7)}`, leads: 0, mql: 0, customer: 0 };
    }

    filteredLeads.forEach(l => {
      if (!l.created_at) return;
      const key = new Date(l.created_at).toISOString().slice(0, 10);
      if (key in dayMap) {
        dayMap[key].leads++;
        if (['mql', 'sql', 'opportunity', 'customer'].includes(l.lifecycle_stage)) dayMap[key].mql++;
        if (l.lifecycle_stage === 'customer') dayMap[key].customer++;
      }
    });

    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredLeads, daysNum]);

  // ─── Channel stats ───
  const channelStats = useMemo(() => {
    const emailSent = emailCampaigns.filter(c => c.status === 'sent');
    const totalEmailSent = emailSent.reduce((acc, c) => acc + (c.stats?.sent || 0), 0);
    const totalEmailOpened = emailSent.reduce((acc, c) => acc + (c.stats?.opened || 0), 0);

    const smsAll = smsCampaigns.filter((c: any) => !c.channel || c.channel === 'sms');
    const smsSent = smsAll.reduce((acc, c) => acc + (c.stats?.sent || 0), 0);
    const smsDelivered = smsAll.reduce((acc, c) => acc + (c.stats?.delivered || 0), 0);

    const waAll = smsCampaigns.filter((c: any) => c.channel === 'whatsapp');
    const waSent = waAll.reduce((acc, c) => acc + (c.stats?.sent || 0), 0);
    const waDelivered = waAll.reduce((acc, c) => acc + (c.stats?.delivered || 0), 0);

    const pushSent = pushCampaigns.reduce((acc, c) => acc + (c.stats?.sent || 0), 0);
    const pushClicked = pushCampaigns.reduce((acc, c) => acc + (c.stats?.clicked || 0), 0);

    const socialPublished = socialPosts.filter((p: any) => p.status === 'published').length;

    return [
      { channel: 'email', total: totalEmailSent, conversions: totalEmailOpened, rate: totalEmailSent > 0 ? (totalEmailOpened / totalEmailSent * 100) : 0 },
      { channel: 'landing_pages', total: 0, conversions: 0, rate: 0 },
      { channel: 'forms', total: 0, conversions: filteredLeads.filter(l => l.source === 'form').length, rate: 0 },
      { channel: 'social', total: socialPublished, conversions: 0, rate: 0 },
      { channel: 'whatsapp', total: waSent, conversions: waDelivered, rate: waSent > 0 ? (waDelivered / waSent * 100) : 0 },
      { channel: 'sms', total: smsSent, conversions: smsDelivered, rate: smsSent > 0 ? (smsDelivered / smsSent * 100) : 0 },
      { channel: 'push', total: pushSent, conversions: pushClicked, rate: pushSent > 0 ? (pushClicked / pushSent * 100) : 0 },
    ];
  }, [emailCampaigns, smsCampaigns, pushCampaigns, socialPosts, filteredLeads]);

  const channelBarData = useMemo(() =>
    channelStats.map(c => ({
      name: CHANNEL_CONFIG[c.channel]?.label || c.channel,
      total: c.total,
      conversions: c.conversions,
    })),
  [channelStats]);

  // ─── Campaigns table ───
  const campaignsTable = useMemo(() => {
    const rows = emailCampaigns
      .filter(c => c.status === 'sent' || c.status === 'sending')
      .map(c => {
        const s = c.stats || {};
        const sent = s.sent || 0;
        const delivered = s.delivered || sent;
        const opened = s.opened || 0;
        const clicked = s.clicked || 0;
        const bounced = s.bounced || 0;
        return {
          id: c.id,
          name: c.name || 'Sem nome',
          sent,
          delivered,
          opened,
          clicked,
          bounceRate: sent > 0 ? ((bounced / sent) * 100) : 0,
          openRate: sent > 0 ? ((opened / sent) * 100) : 0,
          clickRate: sent > 0 ? ((clicked / sent) * 100) : 0,
          date: c.created_at,
        };
      });

    rows.sort((a, b) => {
      const aVal = (a as any)[sortColumn] ?? 0;
      const bVal = (b as any)[sortColumn] ?? 0;
      if (typeof aVal === 'number') return sortAsc ? aVal - bVal : bVal - aVal;
      return sortAsc ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });

    return rows;
  }, [emailCampaigns, sortColumn, sortAsc]);

  const toggleSort = (col: string) => {
    if (sortColumn === col) setSortAsc(!sortAsc);
    else { setSortColumn(col); setSortAsc(false); }
  };

  // ─── Export CSV ───
  const exportCsv = () => {
    let csvContent = '';
    if (activeTab === 'funnel') {
      csvContent = 'Etapa,Quantidade,Taxa Conversão\n';
      funnelData.forEach(s => {
        csvContent += `${s.label},${s.count},${s.conversionRate || '-'}\n`;
      });
    } else if (activeTab === 'channels') {
      csvContent = 'Canal,Total,Conversões,Taxa\n';
      channelStats.forEach(c => {
        csvContent += `${CHANNEL_CONFIG[c.channel]?.label || c.channel},${c.total},${c.conversions},${c.rate.toFixed(1)}%\n`;
      });
    } else {
      csvContent = 'Campanha,Enviados,Entregues,Abertos,Clicados,Bounce Rate\n';
      campaignsTable.forEach(r => {
        csvContent += `"${r.name}",${r.sent},${r.delivered},${r.opened},${r.clicked},${r.bounceRate.toFixed(1)}%\n`;
      });
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketing_analytics_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <BarChart3 size={22} className="text-purple-600" /> Analytics de Marketing
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Visão completa das suas campanhas e funil</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date range */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {[
              { value: '7' as DateRange, label: '7d' },
              { value: '30' as DateRange, label: '30d' },
              { value: '90' as DateRange, label: '90d' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setDateRange(opt.value)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  dateRange === opt.value
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-500 hover:bg-slate-50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'px-5 py-2 rounded-lg text-sm font-semibold transition-colors',
              activeTab === tab.id
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════ FUNNEL TAB ═══════════ */}
      {activeTab === 'funnel' && (
        <div className="space-y-6">
          {/* Funnel steps */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2">
              <Target size={16} className="text-purple-500" /> Funil de Marketing
            </h3>
            <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
              {funnelData.map((step, i) => {
                const StepIcon = step.icon;
                const maxWidth = 100 - i * 12;
                return (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center min-w-[110px] flex-1">
                      <div
                        className="rounded-xl flex flex-col items-center justify-center py-4 px-3 transition-all"
                        style={{
                          background: step.color,
                          minHeight: 100,
                          width: `${maxWidth}%`,
                          margin: '0 auto',
                        }}
                      >
                        <StepIcon className="w-5 h-5 text-white mb-1 opacity-80" />
                        <span className="text-2xl font-black text-white">{step.count}</span>
                        <span className="text-[10px] text-white/80 font-medium mt-0.5">{step.label}</span>
                      </div>
                      {step.conversionRate !== null && (
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs font-bold text-purple-600">{step.conversionRate}%</span>
                          <TrendingDown size={11} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                    {i < funnelData.length - 1 && (
                      <div className="flex items-center px-1 text-slate-300">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Stacked area chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-fuchsia-500" /> Evolução do Funil
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={funnelOverTime} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradMql" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCustomer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Area type="monotone" dataKey="leads" stroke="#a855f7" strokeWidth={2} fill="url(#gradLeads)" name="Leads" stackId="1" />
                <Area type="monotone" dataKey="mql" stroke="#d946ef" strokeWidth={2} fill="url(#gradMql)" name="MQL" stackId="2" />
                <Area type="monotone" dataKey="customer" stroke="#ec4899" strokeWidth={2} fill="url(#gradCustomer)" name="Clientes" stackId="3" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══════════ CHANNELS TAB ═══════════ */}
      {activeTab === 'channels' && (
        <div className="space-y-6">
          {/* Channel cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {channelStats.map(ch => {
              const cfg = CHANNEL_CONFIG[ch.channel];
              if (!cfg) return null;
              const ChIcon = cfg.icon;
              return (
                <div key={ch.channel} className="bg-white rounded-2xl border border-slate-200 hover:shadow-lg hover:shadow-purple-100/30 transition-all p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', cfg.bg)}>
                      <ChIcon size={20} className={cfg.color} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700">{cfg.label}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-2xl font-black text-slate-800">{ch.total}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Total</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-purple-600">{ch.conversions}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Conversões</p>
                    </div>
                  </div>
                  {ch.rate > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Taxa</span>
                        <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                          <TrendingUp size={12} /> {ch.rate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-400 to-fuchsia-500 rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(ch.rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bar chart comparison */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-purple-500" /> Comparação por Canal
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={channelBarData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Bar dataKey="total" fill="#a855f7" radius={[6, 6, 0, 0]} name="Total" />
                <Bar dataKey="conversions" fill="#d946ef" radius={[6, 6, 0, 0]} name="Conversões" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Target size={16} className="text-fuchsia-500" /> Distribuição por Canal
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={channelBarData.filter(c => c.total > 0)}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={60}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {channelBarData.filter(c => c.total > 0).map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══════════ CAMPAIGNS TAB ═══════════ */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Mail size={16} className="text-purple-500" /> Campanhas de Email Enviadas
              </h3>
            </div>

            {campaignsTable.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Mail size={40} className="mx-auto mb-2 opacity-30" />
                <p className="font-semibold">Nenhuma campanha enviada ainda</p>
              </div>
            )}

            {campaignsTable.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
                      {[
                        { key: 'name', label: 'Campanha', align: 'text-left' },
                        { key: 'sent', label: 'Enviados', align: 'text-right' },
                        { key: 'delivered', label: 'Entregues', align: 'text-right' },
                        { key: 'openRate', label: 'Abertos', align: 'text-right' },
                        { key: 'clickRate', label: 'Clicados', align: 'text-right' },
                        { key: 'bounceRate', label: 'Bounce', align: 'text-right' },
                      ].map(col => (
                        <th
                          key={col.key}
                          onClick={() => toggleSort(col.key)}
                          className={clsx('px-4 py-3 cursor-pointer hover:text-purple-600 transition-colors', col.align)}
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {sortColumn === col.key && (
                              <span className="text-purple-500">{sortAsc ? '↑' : '↓'}</span>
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaignsTable.map(row => (
                      <tr key={row.id} className="border-t border-slate-100 hover:bg-purple-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-slate-800 truncate max-w-[200px]">{row.name}</p>
                            <p className="text-[10px] text-slate-400">{row.date ? new Date(row.date).toLocaleDateString('pt-BR') : '-'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-700">{row.sent}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{row.delivered}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-emerald-600">{row.openRate.toFixed(1)}%</span>
                          <span className="text-slate-400 text-[10px] ml-1">({row.opened})</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-purple-600">{row.clickRate.toFixed(1)}%</span>
                          <span className="text-slate-400 text-[10px] ml-1">({row.clicked})</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={clsx('font-bold', row.bounceRate > 5 ? 'text-red-500' : 'text-slate-500')}>
                            {row.bounceRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

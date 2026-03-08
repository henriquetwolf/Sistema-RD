import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Mail, MousePointerClick, TrendingUp, Eye, Target,
  ArrowRight, Loader2, BarChart3, Zap, Globe, MessageCircle,
  Filter, DollarSign
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

interface Props {
  onNavigate: (module: string) => void;
}

const FUNNEL_COLORS = [
  '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#f3e8ff', '#faf5ff'
];

const CHART_PURPLE = '#a855f7';
const CHART_FUCHSIA = '#d946ef';

export const MarketingDashboard: React.FC<Props> = ({ onNavigate }) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [l, c, a, s] = await Promise.all([
          appBackend.getMarketingLeads(),
          appBackend.getEmailCampaigns(),
          appBackend.getMarketingAutomations(),
          appBackend.getMarketingSegments(),
        ]);
        setLeads(l ?? []);
        setCampaigns(c ?? []);
        setAutomations(a ?? []);
        setSegments(s ?? []);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // --- KPIs ---
  const kpis = useMemo(() => ({
    totalLeads: leads.length,
    emailsSent: campaigns.filter(c => c.status === 'sent').length,
    activeAutomations: automations.filter(a => a.status === 'active').length,
    segmentsCreated: segments.length,
  }), [leads, campaigns, automations, segments]);

  // --- Funnel ---
  const funnel = useMemo(() => {
    const visitantes = 0;
    const totalLeads = leads.length;
    const mql = leads.filter(l => l.lifecycle_stage === 'mql').length;
    const sql = leads.filter(l => l.lifecycle_stage === 'sql').length;
    const opportunities = leads.filter(l => l.lifecycle_stage === 'opportunity').length;
    const customers = leads.filter(l => l.lifecycle_stage === 'customer').length;

    const steps = [
      { label: 'Visitantes', count: visitantes, icon: Eye },
      { label: 'Leads', count: totalLeads, icon: Users },
      { label: 'MQL', count: mql, icon: Target },
      { label: 'SQL', count: sql, icon: Filter },
      { label: 'Oportunidades', count: opportunities, icon: DollarSign },
      { label: 'Clientes', count: customers, icon: Users },
    ];

    return steps.map((step, i) => ({
      ...step,
      conversionRate:
        i < steps.length - 1 && step.count > 0
          ? ((steps[i + 1].count / step.count) * 100).toFixed(1)
          : null,
    }));
  }, [leads]);

  // --- Leads over last 30 days ---
  const leadsOverTime = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dayMap: Record<string, number> = {};
    for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = 0;
    }

    leads.forEach(l => {
      if (!l.created_at) return;
      const key = new Date(l.created_at).toISOString().slice(0, 10);
      if (key in dayMap) dayMap[key]++;
    });

    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: `${date.slice(8, 10)}/${date.slice(5, 7)}`,
        leads: count,
      }));
  }, [leads]);

  // --- Quick Actions ---
  const quickActions = [
    { label: 'Criar Campanha de Email', module: 'email', icon: Mail, color: 'from-purple-500 to-fuchsia-500' },
    { label: 'Nova Automação', module: 'automation', icon: Zap, color: 'from-fuchsia-500 to-pink-500' },
    { label: 'Ver Leads', module: 'leads', icon: Users, color: 'from-violet-500 to-purple-500' },
    { label: 'Criar Landing Page', module: 'landing_pages', icon: Globe, color: 'from-purple-600 to-indigo-500' },
    { label: 'Criar Segmento', module: 'segments', icon: Target, color: 'from-fuchsia-600 to-purple-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total de Leads', value: kpis.totalLeads, icon: Users, accent: 'text-purple-600 bg-purple-50' },
          { label: 'Emails Enviados', value: kpis.emailsSent, icon: Mail, accent: 'text-fuchsia-600 bg-fuchsia-50' },
          { label: 'Automações Ativas', value: kpis.activeAutomations, icon: Zap, accent: 'text-violet-600 bg-violet-50' },
          { label: 'Segmentos Criados', value: kpis.segmentsCreated, icon: Target, accent: 'text-pink-600 bg-pink-50' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4"
          >
            <div className={clsx('rounded-xl p-3', kpi.accent)}>
              <kpi.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Marketing Funnel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-500" />
          Funil de Marketing
        </h3>
        <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
          {funnel.map((step, i) => {
            const StepIcon = step.icon;
            const widthPercent = 100 - i * 12;
            return (
              <React.Fragment key={step.label}>
                <div className="flex flex-col items-center min-w-[120px] flex-1">
                  <div
                    className={clsx(
                      'rounded-xl flex flex-col items-center justify-center py-4 px-3 w-full transition-all',
                    )}
                    style={{
                      background: FUNNEL_COLORS[i],
                      minHeight: 90,
                      width: `${widthPercent}%`,
                      margin: '0 auto',
                    }}
                  >
                    <StepIcon className="w-5 h-5 text-purple-900 mb-1 opacity-70" />
                    <span className="text-2xl font-bold text-purple-900">{step.count}</span>
                    <span className="text-xs text-purple-800 font-medium mt-1">{step.label}</span>
                  </div>
                  {step.conversionRate !== null && (
                    <span className="text-xs text-slate-400 mt-2">
                      {step.conversionRate}% →
                    </span>
                  )}
                </div>
                {i < funnel.length - 1 && (
                  <div className="flex items-center px-1 text-slate-300">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Leads over 30 days chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-fuchsia-500" />
          Leads nos Últimos 30 Dias
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={leadsOverTime} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_PURPLE} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_PURPLE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                fontSize: 13,
              }}
            />
            <Area
              type="monotone"
              dataKey="leads"
              stroke={CHART_PURPLE}
              strokeWidth={2}
              fill="url(#purpleGrad)"
              name="Leads"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <MousePointerClick className="w-5 h-5 text-purple-500" />
          Ações Rápidas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {quickActions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={action.module}
                onClick={() => onNavigate(action.module)}
                className={clsx(
                  'group bg-white rounded-2xl border border-slate-200 shadow-sm p-5',
                  'hover:shadow-md hover:border-purple-300 transition-all text-left',
                )}
              >
                <div className={clsx(
                  'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3',
                  action.color,
                )}>
                  <ActionIcon className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-semibold text-slate-700 group-hover:text-purple-700 transition-colors">
                  {action.label}
                </p>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 mt-2 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

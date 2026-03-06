import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import {
  Calendar, Download, DollarSign, Target, RefreshCw, ShoppingBag,
  PieChart as PieIcon, Activity, ArrowUpRight, Users, TrendingUp, TrendingDown, FileSpreadsheet
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

const COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#a855f7'];
const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

function getPrevPeriod(start: Date, end: Date): { start: Date; end: Date } {
  const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days + 1);
  return { start: prevStart, end: prevEnd };
}

export const SalesAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'distribution'>('general');

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [filterType, setFilterType] = useState<string>('Todos');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dealsResult, collabResult] = await Promise.all([
        appBackend.client.from('crm_deals').select('*').order('created_at', { ascending: true }),
        appBackend.client.from('crm_collaborators').select('id, full_name')
      ]);
      if (dealsResult.error) throw dealsResult.error;
      setDeals(dealsResult.data || []);
      setCollaborators(collabResult.data || []);
    } catch (e) {
      console.error("Erro ao buscar dados:", e);
    } finally {
      setLoading(false);
    }
  };

  const processedData = useMemo(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59);

    const filterDeals = (list: any[], from: Date, to: Date) =>
      list.filter(deal => {
        const dealDate = new Date(deal.created_at);
        const ok = dealDate >= from && dealDate <= to;
        const typeOk = filterType === 'Todos' || deal.product_type === filterType;
        return ok && typeOk;
      });

    const filtered = filterDeals(deals, start, end);
    const wonDeals = filtered.filter(d => d.stage === 'closed');
    const totalRevenue = wonDeals.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    const conversionRate = filtered.length > 0 ? ((wonDeals.length / filtered.length) * 100).toFixed(1) : '0';
    const avgTicket = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;

    // Período anterior (mesma duração)
    const { start: prevStart, end: prevEnd } = getPrevPeriod(start, end);
    prevEnd.setHours(23, 59, 59);
    const prevFiltered = filterDeals(deals, prevStart, prevEnd);
    const prevWon = prevFiltered.filter(d => d.stage === 'closed');
    const prevRevenue = prevWon.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    const prevConversion = prevFiltered.length > 0 ? (prevWon.length / prevFiltered.length) * 100 : 0;
    const prevAvgTicket = prevWon.length > 0 ? prevRevenue / prevWon.length : 0;

    const revDiff = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : (totalRevenue > 0 ? 100 : 0);
    const convDiff = prevConversion > 0 ? (Number(conversionRate) - prevConversion) : (Number(conversionRate) > 0 ? Number(conversionRate) : 0);
    const ticketDiff = prevAvgTicket > 0 ? ((avgTicket - prevAvgTicket) / prevAvgTicket) * 100 : (avgTicket > 0 ? 100 : 0);
    const dealsDiff = prevFiltered.length > 0 ? ((filtered.length - prevFiltered.length) / prevFiltered.length) * 100 : (filtered.length > 0 ? 100 : 0);

    // Timeline de Faturamento (ordenado por data)
    const timelineMap: Record<string, number> = {};
    wonDeals.forEach(d => {
      const dateKey = new Date(d.closed_at || d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      timelineMap[dateKey] = (timelineMap[dateKey] || 0) + Number(d.value);
    });
    const y = start.getFullYear();
    const timelineData = Object.entries(timelineMap)
      .map(([date, value]) => {
        const [d, m] = date.split('/').map(Number);
        return { date, value, sortKey: new Date(y, m - 1, d).getTime() };
      })
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ date, value }) => ({ date, value }));

    // Distribuição por Tipo de Produto
    const typeMap: Record<string, number> = {};
    wonDeals.forEach(d => {
      const type = d.product_type || 'Outros';
      typeMap[type] = (typeMap[type] || 0) + Number(d.value);
    });
    const distributionData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

    // Por colaborador (owner_id) para aba Distribuição
    const collabMap: Record<string, { revenue: number; count: number }> = {};
    wonDeals.forEach(d => {
      const ownerId = d.owner_id || 'sem_responsavel';
      if (!collabMap[ownerId]) collabMap[ownerId] = { revenue: 0, count: 0 };
      collabMap[ownerId].revenue += Number(d.value) || 0;
      collabMap[ownerId].count += 1;
    });
    const byCollaborator = Object.entries(collabMap).map(([id, { revenue, count }]) => ({
      id,
      name: id === 'sem_responsavel' ? 'Sem responsável' : (collaborators.find(c => c.id === id)?.full_name || id),
      revenue,
      count
    })).sort((a, b) => b.revenue - a.revenue);

    // Top vendas para tabela
    const topDeals = [...wonDeals]
      .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
      .slice(0, 15)
      .map(d => ({
        title: d.title || d.contact_name || '—',
        value: Number(d.value) || 0,
        date: d.closed_at || d.created_at,
        owner: collaborators.find(c => c.id === d.owner_id)?.full_name || '—',
        product_type: d.product_type || '—'
      }));

    return {
      metrics: {
        totalRevenue, totalDeals: filtered.length, conversionRate, avgTicket, wonCount: wonDeals.length,
        prevRevenue, prevConversion, prevAvgTicket, prevDeals: prevFiltered.length,
        revDiff, convDiff, ticketDiff, dealsDiff
      },
      charts: { timelineData, distributionData },
      byCollaborator,
      topDeals,
      hasData: filtered.length > 0
    };
  }, [deals, dateRange, filterType, collaborators]);

  const handleExportCsv = () => {
    const headers = ['Período', dateRange.start, 'a', dateRange.end, '', ''];
    const rows = [
      ['Métrica', 'Valor', 'Vs período anterior'],
      ['Receita total', formatCurrency(processedData.metrics.totalRevenue), `${processedData.metrics.revDiff >= 0 ? '+' : ''}${processedData.metrics.revDiff.toFixed(1)}%`],
      ['Taxa de conversão', `${processedData.metrics.conversionRate}%`, `${processedData.metrics.convDiff >= 0 ? '+' : ''}${processedData.metrics.convDiff.toFixed(1)} p.p.`],
      ['Ticket médio', formatCurrency(processedData.metrics.avgTicket), `${processedData.metrics.ticketDiff >= 0 ? '+' : ''}${processedData.metrics.ticketDiff.toFixed(1)}%`],
      ['Leads no período', String(processedData.metrics.totalDeals), `${processedData.metrics.dealsDiff >= 0 ? '+' : ''}${processedData.metrics.dealsDiff.toFixed(1)}%`],
      ['Vendas fechadas', String(processedData.metrics.wonCount), ''],
    ];
    const byCollab = processedData.byCollaborator.map(c => [c.name, formatCurrency(c.revenue), String(c.count)]);
    const csv = [
      headers.join(';'),
      ...rows.map(r => r.join(';')),
      '',
      'Vendas por colaborador;Receita;Qtd',
      ...byCollab.map(r => r.join(';'))
    ].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analise-vendas-${dateRange.start}-${dateRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <PieIcon className="text-teal-600" size={28} /> Análise de Faturamento
            </h2>
            <p className="text-slate-500 text-sm font-medium">Desempenho financeiro e métricas de conversão em tempo real.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
                <button onClick={() => setActiveTab('general')} className={clsx("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", activeTab === 'general' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Visão Geral</button>
                <button onClick={() => setActiveTab('distribution')} className={clsx("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", activeTab === 'distribution' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Distribuição</button>
            </div>

            <div className="h-10 w-px bg-slate-200 mx-2 hidden xl:block"></div>

            <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 gap-2">
                <div className="flex items-center px-3 border-r border-slate-200">
                    <Calendar size={16} className="text-slate-400 mr-2" />
                    <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 p-0 w-28" />
                    <span className="mx-2 text-slate-300 font-bold">/</span>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 p-0 w-28" />
                </div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-transparent border-none text-xs font-black uppercase text-teal-700 focus:ring-0 px-3 cursor-pointer">
                    <option value="Todos">Todos os Cursos</option>
                    <option value="Presencial">Presencial</option>
                    <option value="Digital">Digital</option>
                    <option value="Evento">Evento</option>
                </select>
            </div>

            <button onClick={fetchData} className="p-2.5 bg-teal-50 text-teal-600 rounded-xl hover:bg-teal-100 transition-all border border-teal-100" title="Atualizar dados">
                <RefreshCw size={20} className={clsx(loading && "animate-spin")} />
            </button>
            <button onClick={handleExportCsv} className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all border border-slate-200 flex items-center gap-2" title="Exportar CSV">
                <FileSpreadsheet size={18} /> <span className="text-xs font-bold hidden sm:inline">Exportar</span>
            </button>
        </div>
      </div>

      {/* Empty state */}
      {!loading && !processedData.hasData && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <PieIcon className="text-slate-400" size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-700 mb-2">Nenhum dado no período</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">Não há oportunidades ou vendas no intervalo e filtro selecionados. Ajuste as datas ou o tipo de curso e tente novamente.</p>
        </div>
      )}

      {processedData.hasData && (
        <>
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-teal-400 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign size={80} className="text-teal-600" /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receita Total</p>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(processedData.metrics.totalRevenue)}</h3>
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-teal-600 uppercase"><ArrowUpRight size={14}/> {processedData.metrics.wonCount} vendas</span>
                {processedData.metrics.prevRevenue !== undefined && (
                  <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase", processedData.metrics.revDiff >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
                    {processedData.metrics.revDiff >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {processedData.metrics.revDiff >= 0 ? '+' : ''}{processedData.metrics.revDiff.toFixed(1)}% vs anterior
                  </span>
                )}
              </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-400 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Target size={80} className="text-indigo-600" /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Taxa de Conversão</p>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{processedData.metrics.conversionRate}%</h3>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${Math.min(100, Number(processedData.metrics.conversionRate))}%` }}></div>
              </div>
              {processedData.metrics.prevConversion !== undefined && (
                <p className={clsx("mt-2 text-[10px] font-bold uppercase", processedData.metrics.convDiff >= 0 ? "text-emerald-600" : "text-red-500")}>
                  {processedData.metrics.convDiff >= 0 ? '+' : ''}{processedData.metrics.convDiff.toFixed(1)} p.p. vs anterior
                </p>
              )}
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-orange-400 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ShoppingBag size={80} className="text-orange-600" /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Médio</p>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(processedData.metrics.avgTicket)}</h3>
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <p className="text-[10px] font-bold text-orange-500 uppercase">Valor médio por aluno</p>
                {processedData.metrics.prevAvgTicket !== undefined && processedData.metrics.prevAvgTicket > 0 && (
                  <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase", processedData.metrics.ticketDiff >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
                    {processedData.metrics.ticketDiff >= 0 ? '+' : ''}{processedData.metrics.ticketDiff.toFixed(1)}% vs anterior
                  </span>
                )}
              </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-900/20 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={80} /></div>
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Leads Captados</p>
              <h3 className="text-3xl font-black">{processedData.metrics.totalDeals}</h3>
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">Oportunidades no período</p>
                {processedData.metrics.prevDeals !== undefined && processedData.metrics.prevDeals > 0 && (
                  <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase", processedData.metrics.dealsDiff >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300")}>
                    {processedData.metrics.dealsDiff >= 0 ? '+' : ''}{processedData.metrics.dealsDiff.toFixed(1)}% vs anterior
                  </span>
                )}
              </div>
          </div>
      </div>

      {/* Visão Geral: Timeline + Mix de Produtos */}
      {activeTab === 'general' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-10">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                    <Activity className="text-teal-600" size={20}/> Evolução do Faturamento
                </h3>
            </div>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={processedData.charts.timelineData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(val) => `R$${val/1000}k`} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                            formatter={(val: number) => [formatCurrency(val), 'Faturamento']}
                        />
                        <Area type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 mb-10">
                <PieIcon className="text-indigo-600" size={20}/> Mix de Produtos
            </h3>
            <div className="flex-1 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={processedData.charts.distributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {processedData.charts.distributionData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(val: number) => formatCurrency(val)} />
                        <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
      )}

      {/* Aba Distribuição: por colaborador + top vendas */}
      {activeTab === 'distribution' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 mb-6">
                <Users className="text-indigo-600" size={20}/> Faturamento por Colaborador
            </h3>
            <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedData.byCollaborator} layout="vertical" margin={{ left: 8, right: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" tickFormatter={(v) => `R$${v/1000}k`} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                        <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 600, fill: '#475569'}} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(val: number) => [formatCurrency(val), 'Receita']} />
                        <Bar dataKey="revenue" fill="#6366f1" radius={[0, 6, 6, 0]} name="Receita" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 mb-6">
                <TrendingUp className="text-teal-600" size={20}/> Top Vendas do Período
            </h3>
            <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="pb-3 pr-4">Venda / Contato</th>
                            <th className="pb-3 pr-4">Tipo</th>
                            <th className="pb-3 pr-4">Responsável</th>
                            <th className="pb-3 pr-4 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedData.topDeals.length === 0 ? (
                            <tr><td colSpan={4} className="py-8 text-slate-400 text-center text-xs">Nenhuma venda fechada no período.</td></tr>
                        ) : (
                            processedData.topDeals.map((row, i) => (
                                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                                    <td className="py-3 pr-4 font-semibold text-slate-800 truncate max-w-[180px]" title={row.title}>{row.title}</td>
                                    <td className="py-3 pr-4 text-slate-600">{row.product_type}</td>
                                    <td className="py-3 pr-4 text-slate-600">{row.owner}</td>
                                    <td className="py-3 pr-4 text-right font-black text-teal-700">{formatCurrency(row.value)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
      )}
        </>
      )}
    </div>
  );
};

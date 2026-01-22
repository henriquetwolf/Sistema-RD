
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Calendar, Filter, Download, TrendingUp, DollarSign, Target, 
  Briefcase, Loader2, RefreshCw, Users, LayoutGrid, ShoppingBag, Tag,
  PieChart as PieIcon, Activity, ArrowUpRight
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

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

    const filtered = deals.filter(deal => {
      const dealDate = new Date(deal.created_at);
      const isDateValid = dealDate >= start && dealDate <= end;
      const isTypeValid = filterType === 'Todos' || deal.product_type === filterType;
      return isDateValid && isTypeValid;
    });

    const wonDeals = filtered.filter(d => d.stage === 'closed');
    const totalRevenue = wonDeals.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    const conversionRate = filtered.length > 0 ? ((wonDeals.length / filtered.length) * 100).toFixed(1) : '0';
    const avgTicket = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;

    // Timeline de Faturamento
    const timelineMap: Record<string, number> = {};
    wonDeals.forEach(d => {
        const dateKey = new Date(d.closed_at || d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        timelineMap[dateKey] = (timelineMap[dateKey] || 0) + Number(d.value);
    });
    const timelineData = Object.entries(timelineMap).map(([date, value]) => ({ date, value }));

    // Distribuição por Tipo de Produto
    const typeMap: Record<string, number> = {};
    wonDeals.forEach(d => {
        const type = d.product_type || 'Outros';
        typeMap[type] = (typeMap[type] || 0) + Number(d.value);
    });
    const distributionData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

    return {
        metrics: { totalRevenue, totalDeals: filtered.length, conversionRate, avgTicket, wonCount: wonDeals.length },
        charts: { timelineData, distributionData }
    };
  }, [deals, dateRange, filterType]);

  const COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

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

            <button onClick={fetchData} className="p-2.5 bg-teal-50 text-teal-600 rounded-xl hover:bg-teal-100 transition-all border border-teal-100">
                <RefreshCw size={20} className={clsx(loading && "animate-spin")} />
            </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-teal-400 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign size={80} className="text-teal-600" /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receita Total</p>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(processedData.metrics.totalRevenue)}</h3>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-teal-600 uppercase">
                  <ArrowUpRight size={14}/> {processedData.metrics.wonCount} Vendas Fechadas
              </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-400 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Target size={80} className="text-indigo-600" /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Taxa de Conversão</p>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{processedData.metrics.conversionRate}%</h3>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${processedData.metrics.conversionRate}%` }}></div>
              </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-orange-400 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ShoppingBag size={80} className="text-orange-600" /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Médio</p>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(processedData.metrics.avgTicket)}</h3>
              <p className="text-[10px] font-bold text-orange-500 mt-4 uppercase">Valor médio por aluno</p>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-900/20 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={80} /></div>
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Leads Captados</p>
              <h3 className="text-3xl font-black">{processedData.metrics.totalDeals}</h3>
              <p className="text-[10px] font-bold text-indigo-400 mt-4 uppercase tracking-tighter">Oportunidades no período</p>
          </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Chart */}
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

        {/* Distribution Chart */}
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
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { Calendar, Filter, Download, TrendingUp, DollarSign, Target, Briefcase, Loader2, RefreshCw } from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { MOCK_COLLABORATORS } from './CollaboratorsManager';

export const SalesAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<any[]>([]);
  
  // Filters
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Inicio do ano atual
    end: new Date().toISOString().split('T')[0]
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'won' | 'lost' | 'open'>('all');

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const { data, error } = await appBackend.client
        .from('crm_deals')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setDeals(data || []);
    } catch (e) {
      console.error("Erro ao buscar dados:", e);
    } finally {
      setLoading(false);
    }
  };

  // --- DATA PROCESSING ---
  const processedData = useMemo(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);

    // 1. Filter Data
    const filtered = deals.filter(deal => {
      const dealDate = new Date(deal.created_at);
      const isDateValid = dealDate >= start && dealDate <= end;
      
      let isStatusValid = true;
      if (statusFilter === 'won') isStatusValid = deal.stage === 'closed';
      if (statusFilter === 'open') isStatusValid = deal.stage !== 'closed'; // Simplificação
      
      return isDateValid && isStatusValid;
    });

    // 2. Metrics
    const totalRevenue = filtered
        .filter(d => d.stage === 'closed')
        .reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    
    const totalDeals = filtered.length;
    const closedDeals = filtered.filter(d => d.stage === 'closed').length;
    const conversionRate = totalDeals > 0 ? ((closedDeals / totalDeals) * 100).toFixed(1) : '0';
    const avgTicket = closedDeals > 0 ? totalRevenue / closedDeals : 0;

    // 3. Charts Data

    // A) Sales Over Time (Line Chart)
    const salesByDateMap: Record<string, number> = {};
    filtered.forEach(deal => {
        if (deal.stage === 'closed') {
            const dateKey = new Date(deal.closed_at || deal.created_at).toLocaleDateString('pt-BR');
            salesByDateMap[dateKey] = (salesByDateMap[dateKey] || 0) + Number(deal.value);
        }
    });
    const salesOverTimeData = Object.keys(salesByDateMap).map(date => ({
        date,
        vendas: salesByDateMap[date]
    }));

    // B) Funnel Stages (Bar Chart)
    const stageCounts: Record<string, number> = { new: 0, contacted: 0, proposal: 0, negotiation: 0, closed: 0 };
    filtered.forEach(deal => {
        const stage = deal.stage || 'new';
        if (stageCounts[stage] !== undefined) stageCounts[stage]++;
    });
    
    const stageLabels: Record<string, string> = { 
        new: 'Sem Contato', contacted: 'Contatado', proposal: 'Proposta', negotiation: 'Negociação', closed: 'Fechado' 
    };
    
    const funnelData = Object.keys(stageCounts).map(key => ({
        name: stageLabels[key] || key,
        quantidade: stageCounts[key]
    }));

    // C) Sales by Owner (Bar Chart)
    const ownerSales: Record<string, number> = {};
    filtered.forEach(deal => {
        if (deal.stage === 'closed') {
            const ownerName = MOCK_COLLABORATORS.find(c => c.id === deal.owner_id)?.fullName || 'Desconhecido';
            ownerSales[ownerName] = (ownerSales[ownerName] || 0) + Number(deal.value);
        }
    });
    const topSellersData = Object.keys(ownerSales)
        .map(name => ({ name, valor: ownerSales[name] }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5); // Top 5

    return {
        metrics: { totalRevenue, totalDeals, conversionRate, avgTicket },
        charts: { salesOverTimeData, funnelData, topSellersData }
    };
  }, [deals, dateRange, statusFilter]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
      
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="text-teal-600" /> Análise de Vendas
            </h2>
            <p className="text-slate-500 text-sm">Dashboard de performance comercial.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-1">
                <div className="flex items-center px-2 text-slate-500 border-r border-slate-200">
                    <Calendar size={16} className="mr-2" />
                    <span className="text-xs font-semibold uppercase">Período</span>
                </div>
                <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={e => setDateRange({...dateRange, start: e.target.value})}
                    className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 px-2 py-1 outline-none"
                />
                <span className="text-slate-300">-</span>
                <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={e => setDateRange({...dateRange, end: e.target.value})}
                    className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 px-2 py-1 outline-none"
                />
            </div>

            <button 
                onClick={fetchDeals}
                className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors border border-transparent hover:border-teal-200"
                title="Atualizar dados"
            >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:border-teal-300 transition-all">
              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <DollarSign size={64} className="text-teal-600" />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Receita Total (Fechado)</p>
                  <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(processedData.metrics.totalRevenue)}</h3>
              </div>
              <div className="text-xs text-teal-600 font-medium flex items-center gap-1">
                  <TrendingUp size={14} /> No período selecionado
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:border-indigo-300 transition-all">
              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Briefcase size={64} className="text-indigo-600" />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Total de Negócios</p>
                  <h3 className="text-2xl font-bold text-slate-800">{processedData.metrics.totalDeals}</h3>
              </div>
              <div className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                  <Target size={14} /> Oportunidades criadas
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:border-blue-300 transition-all">
              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Target size={64} className="text-blue-600" />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Taxa de Conversão</p>
                  <h3 className="text-2xl font-bold text-slate-800">{processedData.metrics.conversionRate}%</h3>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(Number(processedData.metrics.conversionRate), 100)}%` }}></div>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:border-orange-300 transition-all">
              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <DollarSign size={64} className="text-orange-600" />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Ticket Médio</p>
                  <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(processedData.metrics.avgTicket)}</h3>
              </div>
              <div className="text-xs text-orange-600 font-medium">
                  Por venda fechada
              </div>
          </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Revenue Timeline */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Evolução de Receita</h3>
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={processedData.charts.salesOverTimeData}>
                          <defs>
                              <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fill: '#64748b'}} 
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fill: '#64748b'}} 
                            tickFormatter={(value) => `R$ ${value/1000}k`} 
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [formatCurrency(value), 'Vendas']}
                          />
                          <Area type="monotone" dataKey="vendas" stroke="#0d9488" fillOpacity={1} fill="url(#colorVendas)" strokeWidth={2} />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Chart 2: Funnel */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Pipeline de Oportunidades</h3>
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={processedData.charts.funnelData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={100} 
                            axisLine={false} 
                            tickLine={false}
                            tick={{fontSize: 12, fill: '#64748b'}}
                          />
                          <Tooltip 
                            cursor={{fill: '#f8fafc'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="quantidade" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={32}>
                            {processedData.charts.funnelData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 4 ? '#10b981' : '#6366f1'} />
                            ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Chart 3: Top Sellers */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Top Vendedores (Receita)</h3>
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={processedData.charts.topSellersData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fill: '#64748b'}} 
                            interval={0}
                          />
                          <YAxis 
                            hide
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [formatCurrency(value), 'Total Vendido']}
                          />
                          <Bar dataKey="valor" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { Calendar, Filter, Download, TrendingUp, DollarSign, Target, Briefcase, Loader2, RefreshCw, Users, LayoutGrid, ShoppingBag, Tag } from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { MOCK_COLLABORATORS } from './CollaboratorsManager';
import clsx from 'clsx';

interface Team {
  id: string;
  name: string;
  members: string[]; // IDs of collaborators
}

export const SalesAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<any[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'general' | 'teams'>('general');

  // Filters
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Inicio do ano atual
    end: new Date().toISOString().split('T')[0]
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'won' | 'lost' | 'open'>('all');
  
  // New Filters
  const [filterType, setFilterType] = useState<string>('Todos');
  const [filterProduct, setFilterProduct] = useState<string>('Todos');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Deals and Teams in parallel
      const [dealsResult, teamsResult] = await Promise.all([
        appBackend.client.from('crm_deals').select('*').order('created_at', { ascending: true }),
        appBackend.client.from('crm_teams').select('*')
      ]);

      if (dealsResult.error) throw dealsResult.error;
      
      setDeals(dealsResult.data || []);
      setTeams(teamsResult.data || []);

    } catch (e) {
      console.error("Erro ao buscar dados:", e);
    } finally {
      setLoading(false);
    }
  };

  // --- DERIVED OPTIONS FOR FILTERS ---
  const availableTypes = useMemo(() => {
      const types = deals.map(d => d.product_type).filter(Boolean);
      return Array.from(new Set(types)).sort();
  }, [deals]);

  const availableProducts = useMemo(() => {
      let filteredDeals = deals;
      // If a specific type is selected, show only products of that type
      if (filterType !== 'Todos') {
          filteredDeals = deals.filter(d => d.product_type === filterType);
      }
      const products = filteredDeals.map(d => d.product_name).filter(Boolean);
      return Array.from(new Set(products)).sort();
  }, [deals, filterType]);

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
      if (statusFilter === 'open') isStatusValid = deal.stage !== 'closed'; 
      
      // New Filters Logic
      let isTypeValid = true;
      if (filterType !== 'Todos') {
          isTypeValid = deal.product_type === filterType;
      }

      let isProductValid = true;
      if (filterProduct !== 'Todos') {
          isProductValid = deal.product_name === filterProduct;
      }
      
      return isDateValid && isStatusValid && isTypeValid && isProductValid;
    });

    // 2. Metrics General
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

    // D) Sales by Team (New)
    const teamStats = teams.map(team => {
        const teamDeals = filtered.filter(d => 
            team.members && Array.isArray(team.members) && team.members.includes(d.owner_id)
        );

        const revenue = teamDeals
            .filter(d => d.stage === 'closed')
            .reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
        
        const closedCount = teamDeals.filter(d => d.stage === 'closed').length;
        const totalCount = teamDeals.length;
        const avg = closedCount > 0 ? revenue / closedCount : 0;

        return {
            name: team.name,
            revenue,
            deals: totalCount,
            closed: closedCount,
            avgTicket: avg,
            conversion: totalCount > 0 ? ((closedCount / totalCount) * 100).toFixed(1) : '0'
        };
    }).sort((a, b) => b.revenue - a.revenue);

    return {
        metrics: { totalRevenue, totalDeals, conversionRate, avgTicket },
        charts: { salesOverTimeData, funnelData, topSellersData, teamStats }
    };
  }, [deals, teams, dateRange, statusFilter, filterType, filterProduct]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
      
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="text-teal-600" /> Análise de Vendas
            </h2>
            <p className="text-slate-500 text-sm">Dashboard de performance comercial.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* View Toggle */}
            <div className="bg-slate-100 p-1 rounded-lg flex items-center mr-2">
                <button 
                    onClick={() => setActiveTab('general')}
                    className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", activeTab === 'general' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    <LayoutGrid size={16} /> Geral
                </button>
                <button 
                    onClick={() => setActiveTab('teams')}
                    className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", activeTab === 'teams' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    <Users size={16} /> Equipes
                </button>
            </div>

            {/* PRODUCT TYPE FILTER */}
            <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-1">
                <div className="flex items-center px-2 text-slate-500 border-r border-slate-200" title="Tipo de Produto">
                    <Tag size={16} />
                </div>
                <select 
                    value={filterType}
                    onChange={(e) => { setFilterType(e.target.value); setFilterProduct('Todos'); }}
                    className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 px-2 py-1 outline-none w-32"
                >
                    <option value="Todos">Todos Tipos</option>
                    {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            {/* PRODUCT NAME FILTER */}
            <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-1">
                <div className="flex items-center px-2 text-slate-500 border-r border-slate-200" title="Produto">
                    <ShoppingBag size={16} />
                </div>
                <select 
                    value={filterProduct}
                    onChange={(e) => setFilterProduct(e.target.value)}
                    className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 px-2 py-1 outline-none w-40"
                >
                    <option value="Todos">Todos Produtos</option>
                    {availableProducts.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            {/* DATE RANGE */}
            <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-1">
                <div className="flex items-center px-2 text-slate-500 border-r border-slate-200">
                    <Calendar size={16} className="mr-2" />
                    <span className="text-xs font-semibold uppercase hidden sm:inline">Período</span>
                </div>
                <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={e => setDateRange({...dateRange, start: e.target.value})}
                    className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 px-2 py-1 outline-none w-28"
                />
                <span className="text-slate-300">-</span>
                <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={e => setDateRange({...dateRange, end: e.target.value})}
                    className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 px-2 py-1 outline-none w-28"
                />
            </div>

            <button 
                onClick={fetchData}
                className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors border border-transparent hover:border-teal-200"
                title="Atualizar dados"
            >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
        </div>
      </div>

      {/* --- TAB: GENERAL OVERVIEW --- */}
      {activeTab === 'general' && (
        <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-left-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:border-teal-300 transition-all">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={64} className="text-teal-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Receita Total (Fechado)</p>
                        <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(processedData.metrics.totalRevenue)}</h3>
                    </div>
                    <div className="text-xs text-teal-600 font-medium flex items-center gap-1">
                        <TrendingUp size={14} /> Filtrado
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                
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
        </>
      )}

      {/* --- TAB: TEAMS COMPARISON --- */}
      {activeTab === 'teams' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              
              {/* Teams Overview Chart */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Receita por Equipe</h3>
                  <p className="text-sm text-slate-500 mb-6">Comparativo de vendas fechadas entre os times comerciais (com filtros aplicados).</p>
                  
                  {processedData.charts.teamStats.length === 0 ? (
                      <div className="h-[200px] flex items-center justify-center text-slate-400">
                          Nenhuma equipe com vendas no período ou equipes não cadastradas.
                      </div>
                  ) : (
                      <div className="h-[350px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={processedData.charts.teamStats}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis 
                                      dataKey="name" 
                                      axisLine={false} 
                                      tickLine={false} 
                                      tick={{fontSize: 12, fill: '#64748b'}} 
                                  />
                                  <YAxis 
                                      axisLine={false} 
                                      tickLine={false} 
                                      tick={{fontSize: 12, fill: '#64748b'}} 
                                      tickFormatter={(value) => `R$ ${value/1000}k`} 
                                  />
                                  <Tooltip 
                                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                      formatter={(value: number) => [formatCurrency(value), 'Receita Total']}
                                  />
                                  <Legend />
                                  <Bar dataKey="revenue" name="Receita Total" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={50} />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  )}
              </div>

              {/* Detailed Teams Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800">Detalhamento de Performance</h3>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                          <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                              <tr>
                                  <th className="px-6 py-4">Equipe</th>
                                  <th className="px-6 py-4 text-right">Vendas Fechadas</th>
                                  <th className="px-6 py-4 text-right">Taxa Conversão</th>
                                  <th className="px-6 py-4 text-right">Ticket Médio</th>
                                  <th className="px-6 py-4 text-right">Receita Total</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {processedData.charts.teamStats.map((team, idx) => (
                                  <tr key={team.name} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4 font-medium text-slate-800">
                                          <div className="flex items-center gap-3">
                                              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold border border-slate-200">{idx + 1}</span>
                                              {team.name}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <span className="font-bold text-slate-700">{team.closed}</span>
                                          <span className="text-xs text-slate-400 ml-1">/ {team.deals} total</span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <span className={clsx("px-2 py-1 rounded text-xs font-bold", Number(team.conversion) > 20 ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600")}>
                                              {team.conversion}%
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-right font-mono text-slate-600">
                                          {formatCurrency(team.avgTicket)}
                                      </td>
                                      <td className="px-6 py-4 text-right font-bold text-emerald-600 text-base">
                                          {formatCurrency(team.revenue)}
                                      </td>
                                  </tr>
                              ))}
                              {processedData.charts.teamStats.length === 0 && (
                                  <tr>
                                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                          Nenhuma equipe encontrada com os filtros atuais.
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

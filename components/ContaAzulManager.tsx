
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Landmark, Table, Search, RefreshCw, ChevronLeft, 
  ChevronRight, Info, DollarSign, CheckCircle, Clock, 
  ArrowRight, Eraser, Loader2, Filter as FilterIcon, Calendar, AlertTriangle,
  Database, Zap, CheckCircle2 as CheckIcon, BarChart3, PieChart as PieIcon, TrendingUp,
  ArrowDownToLine
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

const COLORS = ['#0d9488', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899'];

export const ContaAzulManager: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalInTable, setTotalInTable] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const rowsPerPage = 50;

  const abortControllerRef = useRef<boolean>(false);

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');
  const [costCenter, setCostCenter] = useState('');

  const fetchAllData = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setLoadProgress(0);
    setData([]);
    abortControllerRef.current = false;

    const tableCandidates = ['visao_contas_a_receber_Geral', 'Conta_Azul_Receber'];
    let activeTable = '';

    try {
      for (const tName of tableCandidates) {
        const { count, error } = await appBackend.client
          .from(tName)
          .select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          activeTable = tName;
          setTotalInTable(count);
          break;
        }
      }

      if (!activeTable) throw new Error("Tabela Conta Azul não localizada no banco.");

      const BATCH_SIZE = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore && !abortControllerRef.current) {
        const { data: batch, error } = await appBackend.client
          .from(activeTable)
          .select('*')
          .range(from, from + BATCH_SIZE - 1)
          .order('id', { ascending: false });

        if (error) throw error;

        if (batch && batch.length > 0) {
          setData(prev => [...prev, ...batch]);
          setLoadProgress(prev => prev + batch.length);
          if (batch.length < BATCH_SIZE) hasMore = false;
          else from += BATCH_SIZE;
        } else {
          hasMore = false;
        }
        await new Promise(r => setTimeout(r, 50));
      }

    } catch (e: any) {
      console.error("Erro Conta Azul:", e);
      alert(`Erro: ${e.message || "Falha na conexão."}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => { abortControllerRef.current = true; };
  }, []);

  const handleResetFilters = () => {
    setStartDate(''); setEndDate(''); setCategory(''); setCostCenter('');
    setSearchTerm(''); setColumnFilters({});
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const parseMoney = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let clean = String(val).replace('R$', '').replace(/\s/g, '');
    if (clean.includes(',')) clean = clean.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  // Filtragem local
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (startDate || endDate) {
        const dateKey = Object.keys(item).find(k => 
            k.toLowerCase() === 'vencimento' || 
            k.toLowerCase().includes('data_venc') || 
            k.toLowerCase().includes('vencimento_original')
        );
        const vencRaw = dateKey ? String(item[dateKey] || '') : '';
        let itemDate = vencRaw.includes('/') ? vencRaw.split('/').reverse().join('-') : vencRaw.split('T')[0];
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
      }

      if (category && !String(item.categoria || '').toLowerCase().includes(category.toLowerCase())) return false;
      if (costCenter && !String(item.centro_de_custo || '').toLowerCase().includes(costCenter.toLowerCase())) return false;

      if (searchTerm) {
          const matchesGlobal = Object.values(item).some(val => 
            String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
          );
          if (!matchesGlobal) return false;
      }

      const matchesColumns = Object.entries(columnFilters).every(([key, value]) => {
        if (!value) return true;
        return String(item[key] || '').toLowerCase().includes(String(value).toLowerCase());
      });

      return matchesColumns;
    });
  }, [data, searchTerm, columnFilters, startDate, endDate, category, costCenter]);

  // Estatísticas e Dados para Gráficos
  const analytics = useMemo(() => {
    const totalValue = filteredData.reduce((acc, curr) => acc + parseMoney(curr.valor || curr.valor_original), 0);
    const paidRecords = filteredData.filter(item => {
      const s = String(item.situacao || item.status || '').toLowerCase();
      return s.includes('pago') || s.includes('liquidado');
    });
    const totalPaid = paidRecords.reduce((acc, curr) => acc + parseMoney(curr.valor_recebido || curr.valor), 0);

    // Gráfico 1: Status
    const statusCounts: Record<string, number> = {};
    filteredData.forEach(item => {
        const s = String(item.situacao || item.status || 'Pendente').trim();
        statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    const statusChart = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    // Gráfico 2: Evolução (Agrupado por Dia)
    const timeMap: Record<string, number> = {};
    filteredData.slice(0, 1000).forEach(item => { // Limitando para performance de agregação
        const dateKey = Object.keys(item).find(k => k.toLowerCase() === 'vencimento') || 'vencimento';
        const d = String(item[dateKey] || '').split('T')[0];
        if (d && d.length > 5) {
            timeMap[d] = (timeMap[d] || 0) + parseMoney(item.valor || item.valor_original);
        }
    });
    const timelineChart = Object.entries(timeMap)
        .sort((a,b) => a[0].localeCompare(b[0]))
        .map(([date, value]) => ({ date, value }));

    // Gráfico 3: Categorias
    const catMap: Record<string, number> = {};
    filteredData.forEach(item => {
        const c = String(item.categoria || 'Outros').trim();
        catMap[c] = (catMap[c] || 0) + parseMoney(item.valor || item.valor_original);
    });
    const categoryChart = Object.entries(catMap)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

    return {
      stats: { totalValue, totalPaid, totalPending: totalValue - totalPaid, count: filteredData.length },
      charts: { statusChart, timelineChart, categoryChart }
    };
  }, [filteredData]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 pb-20">
      {/* Header Fixo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 shrink-0">
        <div className="flex items-center gap-4">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit">
                <div className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white shadow-md flex items-center gap-2">
                    <Landmark size={18}/> Conta Azul Intelligence
                </div>
            </div>
            {loadProgress > 0 && (
                <div className={clsx(
                    "flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all animate-in zoom-in-95",
                    isLoading ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-green-50 border-green-100 text-green-600"
                )}>
                    {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckIcon size={14} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        {isLoading ? `Sincronizando: ${loadProgress.toLocaleString()} / ${totalInTable.toLocaleString()}` : `Base Completa: ${loadProgress.toLocaleString()} registros`}
                    </span>
                </div>
            )}
        </div>
        <div className="flex items-center gap-2">
             <button onClick={handleResetFilters} className="p-3 text-slate-400 hover:text-red-500 bg-white border border-slate-200 rounded-xl transition-all shadow-sm" title="Limpar Filtros"><Eraser size={20}/></button>
             <button 
                onClick={fetchAllData} 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center gap-3"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18}/>}
                {data.length > 0 ? 'Sincronizar' : 'Baixar Banco'}
              </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Filtros e KPIs */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-1 bg-white p-6 rounded-[2.5rem] border-2 border-blue-50 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4"><FilterIcon size={14}/> Filtros de Pesquisa</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Vencimento Início</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Vencimento Fim</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Centro de Custo</label>
                        <input type="text" placeholder="Ex: Matriz" value={costCenter} onChange={e => setCostCenter(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                    </div>
                </div>
            </div>

            <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:rotate-12 transition-transform"><DollarSign size={64} className="text-blue-600" /></div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Volume em Aberto</p>
                    <h3 className="text-2xl font-black text-slate-800">{formatCurrency(analytics.stats.totalPending)}</h3>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">{analytics.stats.count} itens filtrados</p>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:rotate-12 transition-transform"><CheckCircle size={64} className="text-green-600" /></div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Recebido</p>
                    <h3 className="text-2xl font-black text-green-600">{formatCurrency(analytics.stats.totalPaid)}</h3>
                    <p className="text-[10px] text-green-500 mt-2 font-black uppercase">Liquidados no período</p>
                </div>
                <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:rotate-12 transition-transform"><TrendingUp size={64} /></div>
                    <p className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-1">Volume Total Bruto</p>
                    <h3 className="text-2xl font-black">{formatCurrency(analytics.stats.totalValue)}</h3>
                    <p className="text-[10px] text-indigo-400 mt-2 font-black uppercase">Soma nominal total</p>
                </div>
            </div>
        </div>

        {/* Gráficos Analíticos */}
        {data.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 delay-150">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-[380px] flex flex-col">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2"><PieIcon size={14} className="text-blue-500"/> Saúde do Recebimento</h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={analytics.charts.statusChart} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                    {analytics.charts.statusChart.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-[380px] flex flex-col">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2"><BarChart3 size={14} className="text-indigo-500"/> Volume por Categoria (Top 5)</h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.charts.categoryChart} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{fontSize: 10, fontBold: true}} />
                                <Tooltip formatter={(val: number) => formatCurrency(val)} cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={25} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-[380px] flex flex-col">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2"><RefreshCw size={14} className="text-teal-500"/> Evolução de Vencimentos</h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics.charts.timelineChart}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/><stop offset="95%" stopColor="#0d9488" stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9}} hide />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9}} />
                                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                <Area type="monotone" dataKey="value" stroke="#0d9488" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        )}

        {/* Tabela de Auditoria */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[600px] animate-in slide-in-from-bottom-4 delay-300">
            <div className="px-8 py-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100"><Table size={24}/></div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Auditoria Detalhada</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Mostrando {filteredData.length.toLocaleString()} registros</p>
                </div>
              </div>
              <div className="relative max-w-sm w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Pesquisar em tempo real..." className="w-full pl-12 pr-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500 transition-all font-bold shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              {data.length === 0 && !isLoading ? (
                <div className="py-32 flex flex-col items-center text-slate-300">
                    <ArrowDownToLine size={64} className="mb-4 opacity-10 animate-bounce" />
                    <p className="font-bold">Clique em "Baixar Banco" para começar a análise.</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="py-32 text-center text-slate-300 italic">Nenhum dado localizado para os filtros atuais.</div>
              ) : (
                <table className="w-full text-left text-sm border-collapse min-w-max">
                  <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">#</th>
                      {Object.keys(paginatedData[0]).filter(k => k !== 'id' && !k.startsWith('_')).map(key => (
                        <th key={key} className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50">{key.replace(/_/g, ' ')}</th>
                      ))}
                    </tr>
                    <tr className="bg-slate-50/80 backdrop-blur-md border-b border-slate-200">
                      <th className="px-2 py-1"></th>
                      {Object.keys(paginatedData[0]).filter(k => k !== 'id' && !k.startsWith('_')).map(key => (
                        <th key={`filter-${key}`} className="px-3 py-2 bg-white/50">
                          <input className="w-full text-[10px] px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 bg-white font-bold" placeholder={`Filtrar...`} value={columnFilters[key] || ''} onChange={e => setColumnFilters(prev => ({...prev, [key]: e.target.value}))} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/40 transition-colors group">
                        <td className="px-6 py-4 text-[10px] font-black text-slate-300 text-center">{(page - 1) * rowsPerPage + idx + 1}</td>
                        {Object.entries(item).filter(([k]) => k !== 'id' && !k.startsWith('_')).map(([key, val], vIdx) => {
                          const lowKey = key.toLowerCase();
                          const isMoney = lowKey.includes('valor') || lowKey.includes('total') || typeof val === 'number';
                          const isStatus = lowKey.includes('situa') || lowKey.includes('status');
                          return (
                            <td key={vIdx} className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">
                              {isStatus ? (
                                  <span className={clsx("text-[9px] font-black px-2 py-1 rounded border uppercase", 
                                    String(val).toLowerCase().includes('pago') ? "bg-green-50 text-green-700 border-green-100" :
                                    String(val).toLowerCase().includes('atrasa') ? "bg-red-50 text-red-700 border-red-100" : "bg-amber-50 text-amber-700 border-amber-100")}>
                                      {String(val)}
                                  </span>
                              ) : (
                                val === null ? <span className="text-slate-300">--</span> : 
                                (typeof val === 'number' || (!isNaN(Number(val)) && isMoney)) ? formatCurrency(Number(val)) :
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            {totalPages > 1 && (
                <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base: {data.length.toLocaleString()} | Resultado: {filteredData.length.toLocaleString()}</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"><ChevronLeft size={20} /></button>
                        <div className="px-5 py-2 bg-white border border-slate-200 rounded-xl font-black text-xs text-slate-600 shadow-sm">Página {page} de {totalPages}</div>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"><ChevronRight size={20} /></button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

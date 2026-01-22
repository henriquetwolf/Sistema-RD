
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Landmark, PieChart, Table, Search, RefreshCw, ChevronLeft, 
  ChevronRight, Info, DollarSign, XCircle, CheckCircle, Clock, 
  ArrowRight, Eraser, Loader2 
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

export const ContaAzulManager: React.FC = () => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'table'>('dashboard');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const rowsPerPage = 50;

  // Filtros Dashboard
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');
  const [costCenter, setCostCenter] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let allData: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error } = await appBackend.client
          .from('visao_contas_a_receber_Geral')
          .select('*')
          .range(from, from + step - 1);

        if (error) throw error;
        if (batch && batch.length > 0) {
          allData = [...allData, ...batch];
          if (batch.length < step) hasMore = false;
          else from += step;
        } else {
          hasMore = false;
        }
      }
      setData(allData);
    } catch (e) {
      console.error("Erro ao buscar dados do Conta Azul:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const filterOptions = useMemo(() => {
    if (!data.length) return { categories: [], costCenters: [] };
    const keys = Object.keys(data[0]);
    const catKey = keys.find(k => k.toLowerCase().includes('categoria'));
    const ccKey = keys.find(k => k.toLowerCase().includes('centro') && k.toLowerCase().includes('custo'));

    const categories = new Set<string>();
    const costCenters = new Set<string>();

    data.forEach(item => {
      if (catKey && item[catKey]) categories.add(String(item[catKey]));
      if (ccKey && item[ccKey]) costCenters.add(String(item[ccKey]));
    });

    return {
      categories: Array.from(categories).sort(),
      costCenters: Array.from(costCenters).sort()
    };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const keys = Object.keys(item);
      const catKey = keys.find(k => k.toLowerCase().includes('categoria'));
      const ccKey = keys.find(k => k.toLowerCase().includes('centro') && k.toLowerCase().includes('custo'));
      const dKey = keys.find(k => k.toLowerCase().includes('vencimento') || k.toLowerCase().includes('venc'));

      if (category && catKey && String(item[catKey] || '').toLowerCase() !== category.toLowerCase()) return false;
      if (costCenter && ccKey && String(item[ccKey] || '').toLowerCase() !== costCenter.toLowerCase()) return false;
      
      if (startDate || endDate) {
        const dueDate = dKey ? item[dKey] : null;
        if (dueDate) {
          let vDate: Date;
          if (typeof dueDate === 'string' && dueDate.includes('/')) {
            const [d, m, y] = dueDate.split('/').map(Number);
            vDate = new Date(y, m - 1, d);
          } else {
            vDate = new Date(dueDate);
          }
          const isoDate = vDate.toISOString().split('T')[0];
          if (startDate && isoDate < startDate) return false;
          if (endDate && isoDate > endDate) return false;
        }
      }

      const matchesGlobal = Object.values(item).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );

      const matchesColumns = Object.entries(columnFilters).every(([key, value]) => {
        if (!value) return true;
        return String(item[key] || '').toLowerCase().includes(String(value).toLowerCase());
      });

      return matchesGlobal && matchesColumns;
    });
  }, [data, searchTerm, columnFilters, startDate, endDate, category, costCenter]);

  useEffect(() => { setPage(1); }, [searchTerm, columnFilters, startDate, endDate, category, costCenter]);

  const stats = useMemo(() => {
    if (!filteredData.length) return {
      totalRecords: 0, totalValue: 0, totalOverdueValue: 0, overdueCount: 0,
      totalPaidValue: 0, paidCount: 0, totalPendingValue: 0, pendingCount: 0
    };

    const keys = Object.keys(filteredData[0]);
    const parseMoney = (val: any) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      let clean = String(val).replace('R$', '').replace(/\s/g, '');
      if (clean.includes(',')) clean = clean.replace(/\./g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    };

    const vKey = keys.find(k => k.toLowerCase() === 'valor') || keys.find(k => k.toLowerCase().includes('valor')) || keys[0];
    const sKey = keys.find(k => k.toLowerCase().includes('status') || k.toLowerCase().includes('situacao') || k.toLowerCase().includes('situação'));
    const dKey = keys.find(k => k.toLowerCase().includes('vencimento') || k.toLowerCase().includes('venc'));
    const vrKey = keys.find(k => k.toLowerCase().includes('recebido') || k.toLowerCase().includes('pago'));

    const now = new Date();
    now.setHours(0,0,0,0);

    const totalValue = filteredData.reduce((acc, curr) => acc + parseMoney(vKey ? curr[vKey] : 0), 0);
    
    const overdue = filteredData.filter(item => {
      const status = String(sKey ? item[sKey] : '').toLowerCase();
      const dueDate = dKey ? item[dKey] : null;
      let isPast = false;
      if (dueDate) {
        let vDate: Date;
        if (typeof dueDate === 'string' && dueDate.includes('/')) {
          const [d, m, y] = dueDate.split('/').map(Number);
          vDate = new Date(y, m - 1, d);
        } else vDate = new Date(dueDate);
        isPast = vDate < now;
      }
      return isPast && (status.includes('atrasado') || status.includes('vencido') || status.includes('aberto') || status.includes('pendente'));
    });

    const paid = filteredData.filter(item => {
      const status = String(sKey ? item[sKey] : '').toLowerCase();
      return status.includes('pago') || status.includes('liquidado');
    });

    const pending = filteredData.filter(item => {
      const status = String(sKey ? item[sKey] : '').toLowerCase();
      const dueDate = dKey ? item[dKey] : null;
      let isFuture = true;
      if (dueDate) {
        let vDate: Date;
        if (typeof dueDate === 'string' && dueDate.includes('/')) {
          const [d, m, y] = dueDate.split('/').map(Number);
          vDate = new Date(y, m - 1, d);
        } else vDate = new Date(dueDate);
        isFuture = vDate >= now;
      }
      return isFuture && (status.includes('aberto') || status.includes('pendente'));
    });

    return {
      totalRecords: filteredData.length,
      totalValue,
      totalOverdueValue: overdue.reduce((acc, curr) => acc + parseMoney(vKey ? curr[vKey] : 0), 0),
      overdueCount: overdue.length,
      totalPaidValue: paid.reduce((acc, curr) => acc + parseMoney(vrKey ? curr[vrKey] : (vKey ? curr[vKey] : 0)), 0),
      paidCount: paid.length,
      totalPendingValue: pending.reduce((acc, curr) => acc + parseMoney(vKey ? curr[vKey] : 0), 0),
      pendingCount: pending.length
    };
  }, [filteredData]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit shrink-0">
          <button className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white shadow-md flex items-center gap-2">
            <Landmark size={18}/> Contas a Receber Geral
          </button>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner shrink-0">
          <button onClick={() => setViewMode('dashboard')} className={clsx("px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2", viewMode === 'dashboard' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            <PieChart size={16}/> Dashboard
          </button>
          <button onClick={() => setViewMode('table')} className={clsx("px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2", viewMode === 'table' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            <Table size={16}/> Tabela
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {viewMode === 'dashboard' ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Início</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-xs p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fim</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-xs p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="flex-1 text-xs p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Todas</option>
                  {filterOptions.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Centro de Custo</label>
                <select value={costCenter} onChange={e => setCostCenter(e.target.value)} className="flex-1 text-xs p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Todos</option>
                  {filterOptions.costCenters.map(cc => <option key={cc} value={cc}>{cc}</option>)}
                </select>
              </div>
              <button onClick={() => { setStartDate(''); setEndDate(''); setCategory(''); setCostCenter(''); }} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Limpar Filtros"><Eraser size={18}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5"><DollarSign size={64} className="text-blue-600" /></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Valor Total Geral</p>
                <h3 className="text-3xl font-black text-slate-800">{formatCurrency(stats.totalValue)}</h3>
                <p className="text-[10px] text-slate-500 mt-2">{stats.totalRecords} registros filtrados</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5"><XCircle size={64} className="text-red-600" /></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total em Atraso</p>
                <h3 className="text-3xl font-black text-red-600">{formatCurrency(stats.totalOverdueValue)}</h3>
                <p className="text-[10px] text-red-400 mt-2 font-bold uppercase">{stats.overdueCount} títulos vencidos</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5"><CheckCircle size={64} className="text-green-600" /></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Recebido</p>
                <h3 className="text-3xl font-black text-green-600">{formatCurrency(stats.totalPaidValue)}</h3>
                <p className="text-[10px] text-green-500 mt-2 font-bold uppercase">{stats.paidCount} títulos liquidados</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5"><Clock size={64} className="text-blue-600" /></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Pendente</p>
                <h3 className="text-3xl font-black text-blue-600">{formatCurrency(stats.totalPendingValue)}</h3>
                <p className="text-[10px] text-blue-400 mt-2 font-bold uppercase">{stats.pendingCount} títulos em aberto</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-10 flex flex-col items-center justify-center text-center space-y-4 shadow-sm border-t-8 border-t-blue-600">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-2 shadow-inner"><Landmark size={40}/></div>
              <h3 className="text-2xl font-black text-slate-800">Pronto para detalhar?</h3>
              <p className="text-slate-500 max-w-sm font-medium">Acesse a tabela completa para filtrar, buscar e analisar cada título individualmente.</p>
              <button onClick={() => setViewMode('table')} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-3">
                Ver Tabela Completa com Filtros <ArrowRight size={20}/>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Contas a Receber Geral</h3>
                <p className="text-sm text-slate-500 font-medium">Filtre e analise os registros da tabela (50 por página).</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Buscar em todas as colunas..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all min-w-[280px]" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={() => { setColumnFilters({}); setSearchTerm(''); fetchData(); }} className="p-2.5 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-xl transition-all" title="Limpar e Atualizar">
                  <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                  <Loader2 size={40} className="animate-spin text-blue-600" />
                  <p className="font-black uppercase text-xs tracking-widest">Sincronizando dados...</p>
                </div>
              ) : paginatedData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 italic py-20">
                  <Landmark size={64} className="opacity-10 mb-4" />
                  <p>Nenhum registro encontrado para esta busca.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm border-collapse min-w-max">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="border-b border-slate-200">
                      {Object.keys(paginatedData[0]).map(key => (
                        <th key={key} className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{key.replace(/_/g, ' ')}</th>
                      ))}
                    </tr>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {Object.keys(paginatedData[0]).map(key => (
                        <th key={`filter-${key}`} className="px-2 py-1">
                          <input className="w-full text-[10px] p-1 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-blue-400 bg-white font-medium" placeholder={`Filtrar...`} value={columnFilters[key] || ''} onChange={e => setColumnFilters(prev => ({...prev, [key]: e.target.value}))} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                        {Object.entries(item).map(([key, val], vIdx) => {
                          const isIdColumn = key.toLowerCase() === 'id';
                          const isMoney = !isIdColumn && (key.toLowerCase().includes('valor') || typeof val === 'number');
                          return (
                            <td key={vIdx} className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">
                              {val === null ? <span className="text-slate-300">--</span> : 
                               isIdColumn ? String(val) :
                               (typeof val === 'number' || (!isNaN(Number(val)) && isMoney)) ? formatCurrency(Number(val)) :
                               String(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Total: {filteredData.length} registros</span>
                <span className="mx-2">|</span>
                <div className="flex items-center gap-1.5"><Info size={12} className="text-blue-500"/> Sincronizado via Supabase</div>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all"><ChevronLeft size={18} /></button>
                  <span className="text-xs font-black text-slate-600 uppercase tracking-tighter">Página {page} de {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all"><ChevronRight size={18} /></button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

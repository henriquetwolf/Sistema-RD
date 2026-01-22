
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Landmark, PieChart, Table, Search, RefreshCw, ChevronLeft, 
  ChevronRight, Info, DollarSign, XCircle, CheckCircle, Clock, 
  ArrowRight, Eraser, Loader2, Filter as FilterIcon, Calendar, AlertTriangle
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

  // Filtros persistentes
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');
  const [costCenter, setCostCenter] = useState('');

  // Busca dados com estratégia de performance
  const fetchFilteredData = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Definimos o nome da tabela principal do Conta Azul
      const tableName = 'visao_contas_a_receber_Geral';
      
      let query = appBackend.client.from(tableName).select('*');

      // Tentativa de filtro server-side (rápido)
      // Nota: Só funciona se a coluna no Supabase for do tipo DATE ou TIMESTAMP
      if (startDate) query = query.gte('vencimento', startDate);
      if (endDate) query = query.lte('vencimento', endDate);
      
      const { data: result, error } = await query.order('vencimento', { ascending: true });

      if (error) {
          console.warn("Filtro de servidor falhou, tentando modo de compatibilidade...", error);
          // Se falhar (ex: coluna é texto), buscamos os dados para filtrar no cliente
          const { data: fallbackResult, error: fallbackError } = await appBackend.client
            .from(tableName)
            .select('*')
            .limit(10000); // Limite de segurança para performance
            
          if (fallbackError) throw fallbackError;
          setData(fallbackResult || []);
      } else {
          setData(result || []);
      }
      
      setPage(1);
    } catch (e: any) {
      console.error("Erro crítico ao carregar Conta Azul:", e);
      alert(`Erro de conexão com o banco: ${e.message || 'Verifique se a tabela visao_contas_a_receber_Geral existe.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setCategory('');
    setCostCenter('');
    setData([]);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Lógica de filtragem no cliente (Garante que funcione mesmo com formatos de data brasileiros DD/MM/YYYY)
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // 1. Filtro de Data (Compatível com texto DD/MM/YYYY e ISO YYYY-MM-DD)
      if (startDate || endDate) {
        const vencRaw = item.vencimento || item.vencimento_original || '';
        let itemDate: string = '';
        
        if (vencRaw.includes('/')) {
            const [d, m, y] = vencRaw.split('/');
            itemDate = `${y}-${m}-${d}`;
        } else {
            itemDate = vencRaw;
        }

        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
      }

      // 2. Filtros de Texto (Categoria e Centro de Custo)
      if (category && !String(item.categoria || '').toLowerCase().includes(category.toLowerCase())) return false;
      if (costCenter && !String(item.centro_de_custo || '').toLowerCase().includes(costCenter.toLowerCase())) return false;

      // 3. Busca Global
      const matchesGlobal = searchTerm === '' || Object.values(item).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );

      // 4. Filtros por Coluna (Tabela)
      const matchesColumns = Object.entries(columnFilters).every(([key, value]) => {
        if (!value) return true;
        return String(item[key] || '').toLowerCase().includes(String(value).toLowerCase());
      });

      return matchesGlobal && matchesColumns;
    });
  }, [data, searchTerm, columnFilters, startDate, endDate, category, costCenter]);

  const stats = useMemo(() => {
    const parseMoney = (val: any) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      let clean = String(val).replace('R$', '').replace(/\s/g, '');
      if (clean.includes(',')) clean = clean.replace(/\./g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    };

    const now = new Date();
    now.setHours(0,0,0,0);

    const totalValue = filteredData.reduce((acc, curr) => acc + parseMoney(curr.valor), 0);
    
    const overdue = filteredData.filter(item => {
      const status = String(item.situacao || item.status || '').toLowerCase();
      const vencRaw = item.vencimento || '';
      let vencDate: Date | null = null;
      if (vencRaw.includes('/')) {
          const [d, m, y] = vencRaw.split('/').map(Number);
          vencDate = new Date(y, m - 1, d);
      } else if (vencRaw) {
          vencDate = new Date(vencRaw);
      }
      return vencDate && vencDate < now && (status.includes('atrasado') || status.includes('vencido') || status.includes('aberto'));
    });

    const paid = filteredData.filter(item => {
      const status = String(item.situacao || item.status || '').toLowerCase();
      return status.includes('pago') || status.includes('liquidado');
    });

    return {
      totalRecords: filteredData.length,
      totalValue,
      totalOverdueValue: overdue.reduce((acc, curr) => acc + parseMoney(curr.valor), 0),
      overdueCount: overdue.length,
      totalPaidValue: paid.reduce((acc, curr) => acc + parseMoney(curr.valor_recebido || curr.valor), 0),
      paidCount: paid.length,
      totalPendingValue: totalValue - paid.reduce((acc, curr) => acc + parseMoney(curr.valor_recebido || curr.valor), 0)
    };
  }, [filteredData]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* Header com Abas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit shrink-0">
          <button className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white shadow-md flex items-center gap-2">
            <Landmark size={18}/> Conta Azul Geral
          </button>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner shrink-0">
          <button onClick={() => setViewMode('dashboard')} className={clsx("px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2", viewMode === 'dashboard' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            <PieChart size={16}/> Dashboard
          </button>
          <button onClick={() => setViewMode('table')} className={clsx("px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2", viewMode === 'table' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            <Table size={16}/> Tabela Detalhada
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {viewMode === 'dashboard' ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            {/* Painel de Filtros Otimizado */}
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-50 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200"><FilterIcon size={20}/></div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">Carga de Dados por Vencimento</h3>
                 </div>
                 {isLoading && <div className="flex items-center gap-2 text-blue-600 animate-pulse font-black text-[10px] uppercase tracking-widest"><RefreshCw size={14} className="animate-spin"/> Sincronizando...</div>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Início Vencimento</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fim Vencimento</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                  <input type="text" placeholder="Ex: Cursos" value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Centro de Custo</label>
                  <input type="text" placeholder="Ex: Matriz" value={costCenter} onChange={e => setCostCenter(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-medium max-w-md">
                    <Info size={14} className="text-blue-500 shrink-0"/>
                    <span>Ajuste o período acima e clique em carregar. O sistema buscará apenas os registros desse intervalo para garantir velocidade.</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleResetFilters} className="px-6 py-3 text-slate-400 hover:text-red-500 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"><Eraser size={16}/> Limpar</button>
                  <button 
                    onClick={fetchFilteredData} 
                    disabled={isLoading || (!startDate && !endDate)}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-3"
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18}/>}
                    {data.length > 0 ? 'Recarregar e Atualizar' : 'Aplicar Filtros e Carregar'}
                  </button>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5"><DollarSign size={64} className="text-blue-600" /></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Carga no Período</p>
                <h3 className="text-3xl font-black text-slate-800">{formatCurrency(stats.totalValue)}</h3>
                <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase">{stats.totalRecords} registros ativos</p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5"><XCircle size={64} className="text-red-600" /></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Atrasados (Nesta Carga)</p>
                <h3 className="text-3xl font-black text-red-600">{formatCurrency(stats.totalOverdueValue)}</h3>
                <p className="text-[10px] text-red-400 mt-2 font-black uppercase tracking-tighter">{stats.overdueCount} títulos vencidos</p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5"><CheckCircle size={64} className="text-green-600" /></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Recebidos (Nesta Carga)</p>
                <h3 className="text-3xl font-black text-green-600">{formatCurrency(stats.totalPaidValue)}</h3>
                <p className="text-[10px] text-green-500 mt-2 font-black uppercase tracking-tighter">{stats.paidCount} títulos liquidados</p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5"><Clock size={64} className="text-blue-600" /></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Provisão Pendente</p>
                <h3 className="text-3xl font-black text-blue-600">{formatCurrency(stats.totalPendingValue)}</h3>
                <p className="text-[10px] text-blue-400 mt-2 font-black uppercase tracking-tighter">Expectativa de Recebimento</p>
              </div>
            </div>

            {data.length > 0 ? (
              <div className="bg-slate-900 rounded-[3rem] border border-slate-800 p-10 flex flex-col md:flex-row items-center justify-between text-center md:text-left space-y-6 md:space-y-0 shadow-2xl relative overflow-hidden group animate-in zoom-in-95">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform"><Landmark size={120} className="text-white"/></div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-black text-white tracking-tight">Análise Detalhada disponível</h3>
                  <p className="text-slate-400 max-w-sm font-medium mt-1">Os {filteredData.length} registros filtrados estão prontos para visualização linha a linha.</p>
                </div>
                <button onClick={() => setViewMode('table')} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-3 relative z-10">
                  Acessar Tabela Completa <ArrowRight size={20}/>
                </button>
              </div>
            ) : (
                <div className="bg-white rounded-[2.5rem] p-16 text-center border-2 border-dashed border-slate-100 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center"><Table size={32}/></div>
                    <div>
                        <h4 className="font-black text-slate-400 uppercase tracking-widest text-xs">Aguardando Filtro</h4>
                        <p className="text-slate-300 text-sm mt-1">Defina o período de vencimento e clique em "Aplicar Filtros e Carregar" para ver os dados.</p>
                    </div>
                </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4">
            <div className="p-8 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100"><Table size={24}/></div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Carga de Dados: {filteredData.length} registros</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Página {page} de {totalPages || 1}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Filtrar nesta carga..." className="pl-12 pr-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500 transition-all min-w-[320px] font-medium shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={() => setViewMode('dashboard')} className="p-3.5 text-slate-400 bg-white border-2 border-slate-100 rounded-2xl hover:text-blue-600 transition-all" title="Voltar aos Filtros">
                  <FilterIcon size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                  <Loader2 size={64} className="animate-spin text-blue-600" />
                  <p className="font-black uppercase text-xs tracking-[0.2em]">Otimizando consulta no banco...</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 italic py-20">
                  <AlertTriangle size={64} className="opacity-10 mb-4" />
                  <p className="font-bold">Nenhum dado localizado para esta busca.</p>
                  <button onClick={() => setViewMode('dashboard')} className="mt-4 text-blue-600 font-black uppercase text-[10px] hover:underline">Alterar Período de Vencimento</button>
                </div>
              ) : (
                <table className="w-full text-left text-sm border-collapse min-w-max">
                  <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">#</th>
                      {Object.keys(paginatedData[0]).filter(k => k !== 'id' && !k.startsWith('_')).map(key => (
                        <th key={key} className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{key.replace(/_/g, ' ')}</th>
                      ))}
                    </tr>
                    <tr className="bg-slate-50/80 backdrop-blur-md border-b border-slate-200">
                      <th className="px-2 py-1"></th>
                      {Object.keys(paginatedData[0]).filter(k => k !== 'id' && !k.startsWith('_')).map(key => (
                        <th key={`filter-${key}`} className="px-3 py-2">
                          <input className="w-full text-[10px] px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 bg-white font-bold placeholder:font-normal" placeholder={`Filtrar...`} value={columnFilters[key] || ''} onChange={e => setColumnFilters(prev => ({...prev, [key]: e.target.value}))} />
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
            
            <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                 <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                   Total na tela: {filteredData.length} registros
                 </div>
                 <span className="text-[10px] text-slate-300">|</span>
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100">
                    <CheckCircle size={12}/> {data.length >= 10000 ? 'Limitado a 10k registros por performance' : 'Carga completa sincronizada'}
                 </div>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"><ChevronLeft size={20} /></button>
                  <div className="px-5 py-2 bg-white border border-slate-200 rounded-xl font-black text-xs text-slate-600 shadow-sm uppercase tracking-tighter">Página {page} de {totalPages}</div>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"><ChevronRight size={20} /></button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

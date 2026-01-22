
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Landmark, PieChart, Table, Search, RefreshCw, ChevronLeft, 
  ChevronRight, Info, DollarSign, XCircle, CheckCircle, Clock, 
  ArrowRight, Eraser, Loader2, Filter as FilterIcon, Calendar, AlertTriangle,
  Database, Zap, ArrowDownToLine, CheckCircle2 as CheckIcon
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

export const ContaAzulManager: React.FC = () => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'table'>('dashboard');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalInTable, setTotalInTable] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const rowsPerPage = 50;

  // Refs para controle de cancelamento de busca
  const abortControllerRef = useRef<boolean>(false);

  // Filtros de Data e Categoria
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');
  const [costCenter, setCostCenter] = useState('');

  // Busca TODOS os dados com carregamento incremental (Stream visual)
  const fetchAllData = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setLoadProgress(0);
    setData([]); // Limpa para nova carga limpa
    abortControllerRef.current = false;

    const tableCandidates = ['visao_contas_a_receber_Geral', 'Conta_Azul_Receber'];
    let activeTable = '';

    try {
      // 1. Identifica a tabela e pega o total de linhas para progresso
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

      if (!activeTable) throw new Error("Tabela Conta Azul não localizada.");

      // 2. Carregamento Incremental
      const BATCH_SIZE = 1000;
      let from = 0;
      let hasMore = true;

      // Loop de busca
      while (hasMore && !abortControllerRef.current) {
        // Buscamos um lote
        const { data: batch, error } = await appBackend.client
          .from(activeTable)
          .select('*')
          .range(from, from + BATCH_SIZE - 1)
          .order('id', { ascending: false });

        if (error) throw error;

        if (batch && batch.length > 0) {
          // Atualiza os dados IMEDIATAMENTE (User Experience rápida)
          setData(prev => [...prev, ...batch]);
          setLoadProgress(prev => prev + batch.length);
          
          if (batch.length < BATCH_SIZE) hasMore = false;
          else from += BATCH_SIZE;
        } else {
          hasMore = false;
        }

        // Pequena pausa para permitir que o navegador processe a renderização dos novos dados
        await new Promise(r => setTimeout(r, 50));
      }

    } catch (e: any) {
      console.error("Erro ao carregar Conta Azul:", e);
      alert(`Erro: ${e.message || "Falha na conexão com o banco."}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Cancela busca se sair da aba
  useEffect(() => {
    return () => { abortControllerRef.current = true; };
  }, []);

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setCategory('');
    setCostCenter('');
    setSearchTerm('');
    setColumnFilters({});
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Lógica de filtragem unificada (Executada localmente para velocidade e precisão)
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // 1. Filtro de Data
      if (startDate || endDate) {
        const dateKey = Object.keys(item).find(k => 
            k.toLowerCase() === 'vencimento' || 
            k.toLowerCase().includes('data_venc') || 
            k.toLowerCase().includes('vencimento_original')
        );
        
        const vencRaw = dateKey ? String(item[dateKey] || '') : '';
        let itemDate: string = '';
        
        if (vencRaw.includes('/')) {
            const [d, m, y] = vencRaw.split('/');
            itemDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else {
            itemDate = vencRaw.split('T')[0];
        }

        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
      }

      // 2. Filtros de Texto
      if (category && !String(item.categoria || '').toLowerCase().includes(category.toLowerCase())) return false;
      if (costCenter && !String(item.centro_de_custo || '').toLowerCase().includes(costCenter.toLowerCase())) return false;

      // 3. Busca Global
      if (searchTerm) {
          const matchesGlobal = Object.values(item).some(val => 
            String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
          );
          if (!matchesGlobal) return false;
      }

      // 4. Filtros de Coluna Individuais
      const matchesColumns = Object.entries(columnFilters).every(([key, value]) => {
        if (!value) return true;
        return String(item[key] || '').toLowerCase().includes(String(value).toLowerCase());
      });

      return matchesColumns;
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

    const totalValue = filteredData.reduce((acc, curr) => acc + parseMoney(curr.valor || curr.valor_original), 0);
    const paid = filteredData.filter(item => {
      const status = String(item.situacao || item.status || '').toLowerCase();
      return status.includes('pago') || status.includes('liquidado');
    });
    const totalPaidValue = paid.reduce((acc, curr) => acc + parseMoney(curr.valor_recebido || curr.valor), 0);

    return {
      totalRecords: filteredData.length,
      totalValue,
      totalPaidValue,
      totalPendingValue: totalValue - totalPaidValue
    };
  }, [filteredData]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* Header com Status de Carga */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit shrink-0">
                <div className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white shadow-md flex items-center gap-2">
                    <Landmark size={18}/> Conciliação Geral
                </div>
            </div>
            {loadProgress > 0 && (
                <div className={clsx(
                    "flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all animate-in zoom-in-95",
                    isLoading ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-green-50 border-green-100 text-green-600"
                )}>
                    {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckIcon size={14} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        {isLoading ? `Sincronizando: ${loadProgress.toLocaleString()} de ${totalInTable.toLocaleString()}` : `Base Completa: ${loadProgress.toLocaleString()} registros`}
                    </span>
                </div>
            )}
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner shrink-0">
          <button onClick={() => setViewMode('dashboard')} className={clsx("px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2", viewMode === 'dashboard' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            <PieChart size={16}/> Dashboards
          </button>
          <button onClick={() => setViewMode('table')} className={clsx("px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2", viewMode === 'table' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            <Table size={16}/> Tabela ({filteredData.length})
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {viewMode === 'dashboard' ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            {/* Control Panel */}
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-50 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200"><Database size={20}/></div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">Central de Filtros</h3>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vencimento Inicial</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vencimento Final</label>
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
                    <span>A busca carrega os dados de forma <strong>incremental</strong>. Você pode começar a filtrar assim que os primeiros registros aparecerem.</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleResetFilters} className="px-6 py-3 text-slate-400 hover:text-red-500 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"><Eraser size={16}/> Limpar Tudo</button>
                  <button 
                    onClick={fetchAllData} 
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-3"
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18}/>}
                    {data.length > 0 ? 'Sincronizar Novamente' : 'Iniciar Carga Completa'}
                  </button>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:rotate-12 transition-transform"><DollarSign size={80} className="text-blue-600" /></div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Volume {filteredData.length.toLocaleString()} itens</p>
                    <h3 className="text-4xl font-black text-slate-800 tracking-tight">{formatCurrency(stats.totalValue)}</h3>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Total bruto da seleção</p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:rotate-12 transition-transform"><CheckCircle size={80} className="text-green-600" /></div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Recebido</p>
                    <h3 className="text-4xl font-black text-green-600 tracking-tight">{formatCurrency(stats.totalPaidValue)}</h3>
                    <p className="text-[10px] text-green-500 mt-2 font-black uppercase tracking-tighter">Liquidados no período</p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:rotate-12 transition-transform"><Clock size={80} className="text-blue-600" /></div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Saldo em Aberto</p>
                    <h3 className="text-4xl font-black text-blue-600 tracking-tight">{formatCurrency(stats.totalPendingValue)}</h3>
                    <p className="text-[10px] text-blue-400 mt-2 font-black uppercase tracking-tighter">Provisão pendente</p>
                </div>
            </div>

            {data.length > 0 ? (
              <div className="bg-slate-900 rounded-[3.5rem] border border-slate-800 p-12 flex flex-col md:flex-row items-center justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform"><Zap size={140} className="text-white"/></div>
                <div className="relative z-10">
                  <h3 className="text-3xl font-black text-white tracking-tight">Relatórios Prontos</h3>
                  <p className="text-slate-400 max-w-md font-medium mt-2 text-lg">Os {filteredData.length.toLocaleString()} registros selecionados estão processados.</p>
                </div>
                <button onClick={() => setViewMode('table')} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-4 relative z-10">
                  Ver Tabela Detalhada <ArrowRight size={24}/>
                </button>
              </div>
            ) : !isLoading && (
                <div className="bg-white rounded-[2.5rem] p-24 text-center border-2 border-dashed border-slate-200 flex flex-col items-center gap-6">
                    <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-3xl flex items-center justify-center animate-pulse"><Table size={48}/></div>
                    <div>
                        <h4 className="font-black text-slate-400 uppercase tracking-[0.3em] text-sm">Aguardando Comando</h4>
                        <p className="text-slate-300 text-base mt-2 max-w-sm mx-auto">Clique no botão "Iniciar Carga Completa" para sincronizar todos os registros do Conta Azul.</p>
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
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Auditoria: {filteredData.length.toLocaleString()} registros</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Página {page} de {totalPages || 1}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Filtrar nesta lista..." className="pl-12 pr-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500 transition-all min-w-[350px] font-bold shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={() => setViewMode('dashboard')} className="p-3.5 text-slate-400 bg-white border-2 border-slate-100 rounded-2xl hover:text-blue-600 transition-all shadow-sm" title="Voltar aos Painéis">
                  <FilterIcon size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar relative">
              {isLoading && data.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                  <Loader2 size={64} className="animate-spin text-blue-600" />
                  <p className="font-black uppercase text-xs tracking-[0.2em]">Conectando ao banco de dados...</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 italic py-24">
                  <AlertTriangle size={64} className="opacity-10 mb-4" />
                  <p className="font-bold">Nenhum registro localizado para os filtros atuais.</p>
                  <button onClick={() => setViewMode('dashboard')} className="mt-4 text-blue-600 font-black uppercase text-[10px] hover:underline">Voltar e Ajustar Filtros</button>
                </div>
              ) : (
                <>
                    <table className="w-full text-left text-sm border-collapse min-w-max">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr className="border-b border-slate-200">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">#</th>
                        {Object.keys(paginatedData[0]).filter(k => k !== 'id' && !k.startsWith('_')).map(key => (
                            <th key={key} className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50">{key.replace(/_/g, ' ')}</th>
                        ))}
                        </tr>
                        <tr className="bg-slate-50/80 backdrop-blur-md border-b border-slate-200">
                        <th className="px-2 py-1 bg-slate-50"></th>
                        {Object.keys(paginatedData[0]).filter(k => k !== 'id' && !k.startsWith('_')).map(key => (
                            <th key={`filter-${key}`} className="px-3 py-2 bg-slate-50">
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
                    {isLoading && (
                        <div className="sticky bottom-0 left-0 right-0 bg-blue-600 text-white text-center py-2 text-[10px] font-black uppercase tracking-widest animate-pulse flex items-center justify-center gap-2">
                            <RefreshCw size={12} className="animate-spin" /> Carregando mais registros ({loadProgress.toLocaleString()} já baixados)...
                        </div>
                    )}
                </>
              )}
            </div>
            
            <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                 <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                   Base Local: {data.length.toLocaleString()} registros
                 </div>
                 <span className="text-slate-300">|</span>
                 <div className="text-[10px] font-bold text-slate-400 uppercase">Resultado Filtro: {filteredData.length.toLocaleString()}</div>
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

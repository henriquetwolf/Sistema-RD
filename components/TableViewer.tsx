
import React, { useState, useEffect, useMemo } from 'react';
import { SyncJob } from '../types';
// Fix: Corrected import to appBackend as createSupabaseClient is not exported from appBackend.ts
import { appBackend } from '../services/appBackend';
import { 
  Loader2, AlertTriangle, Database, RefreshCw, 
  Table as TableIcon, Search, FileText, Download, 
  ChevronLeft, ChevronRight, ArrowUpDown, Filter
} from 'lucide-react';
import clsx from 'clsx';

interface TableViewerProps {
  jobs: SyncJob[];
}

export const TableViewer: React.FC<TableViewerProps> = ({ jobs }) => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(jobs.length > 0 ? jobs[0].id : null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  useEffect(() => {
    if (!selectedJob) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fix: appBackend is now properly imported and accessible
        const { data: rows, error: err } = await appBackend.client
          .from(selectedJob.config.tableName)
          .select('*')
          .limit(100);

        if (err) throw err;
        setData(rows || []);
      } catch (e: any) {
        console.error("Erro no TableViewer:", e);
        setError(e.message || "Falha na conexão com a tabela.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedJob, refreshKey]);

  const filteredData = useMemo(() => {
      if (!searchTerm) return data;
      return data.filter(row => 
          Object.values(row).some(val => 
              String(val).toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
  }, [data, searchTerm]);

  const columns = useMemo(() => data.length > 0 ? Object.keys(data[0]) : [], [data]);

  const formatValue = (key: string, val: any) => {
    if (val === null) return <span className="text-slate-300 italic">null</span>;
    if (typeof val === 'object') return <span className="font-mono text-[10px] bg-slate-100 p-1 rounded">{JSON.stringify(val)}</span>;
    
    // Formatação de Dinheiro Inteligente
    const lowKey = key.toLowerCase();
    if (lowKey.includes('valor') || lowKey.includes('preço') || lowKey.includes('price') || lowKey.includes('salary') || lowKey.includes('honorarium')) {
        const num = parseFloat(val);
        if (!isNaN(num)) return <span className="font-black text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)}</span>;
    }
    
    return String(val);
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-[700px] overflow-hidden animate-in fade-in">
      {/* Header Premium */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-4 flex-1">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200">
            <TableIcon size={24} />
          </div>
          <div className="flex-1 max-w-sm">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Selecionar Tabela</label>
             <div className="relative">
                <select 
                    value={selectedJobId || ''} 
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                    {jobs.map(job => (
                        <option key={job.id} value={job.id}>{job.name}</option>
                    ))}
                    {jobs.length === 0 && <option value="">Nenhuma tabela vinculada</option>}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronRight size={16} className="rotate-90" />
                </div>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Pesquisar em toda a tabela..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                />
            </div>
            <button 
                onClick={() => setRefreshKey(k => k + 1)}
                disabled={loading || !selectedJob}
                className="p-2.5 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl transition-all shadow-sm active:scale-95"
            >
                <RefreshCw size={20} className={clsx(loading && "animate-spin")} />
            </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto relative custom-scrollbar">
        {loading && (
             <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-30 backdrop-blur-sm animate-in fade-in">
                 <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Sincronizando Dados...</span>
                 </div>
             </div>
        )}

        {error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-12">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mb-6">
                    <AlertTriangle size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Falha ao carregar tabela</h3>
                <p className="text-slate-500 mt-2 max-w-sm mx-auto font-medium">{error}</p>
                <button onClick={() => setRefreshKey(k => k + 1)} className="mt-8 bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all">Tentar novamente</button>
            </div>
        ) : filteredData.length === 0 && !loading ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-300 italic py-20">
                <FileText size={64} className="opacity-10 mb-4" />
                <p className="font-bold">A tabela está vazia ou nenhum resultado coincide com a busca.</p>
             </div>
        ) : (
            <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 z-20 shadow-sm">
                    <tr className="bg-slate-50">
                        <th className="w-12 px-6 py-4 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">#</th>
                        {columns.map(col => (
                            <th key={col} className="px-6 py-4 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap bg-slate-50">
                                <div className="flex items-center gap-2">
                                    {col.replace(/_/g, ' ')}
                                    <ArrowUpDown size={12} className="text-slate-300" />
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                            <td className="px-6 py-4 text-xs font-mono text-slate-400 font-bold border-r border-slate-50">{idx + 1}</td>
                            {columns.map(col => (
                                <td key={`${idx}-${col}`} className="px-6 py-4 whitespace-nowrap max-w-[400px] overflow-hidden text-ellipsis font-medium text-slate-600 group-hover:text-indigo-900 transition-colors">
                                    {formatValue(col, row[col])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <Database size={14} className="text-indigo-500" /> Fonte: {selectedJob?.config.tableName || 'Supabase'}
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Total Exibido: {filteredData.length} registros
          </div>
      </div>
    </div>
  );
};

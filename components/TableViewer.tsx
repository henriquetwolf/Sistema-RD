
import React, { useState, useEffect } from 'react';
import { SyncJob } from '../types';
import { createSupabaseClient } from '../services/supabaseService';
import { Loader2, AlertTriangle, Database, RefreshCw, Table as TableIcon, Search } from 'lucide-react';
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

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  useEffect(() => {
    if (!selectedJob) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const client = createSupabaseClient(selectedJob.config.url, selectedJob.config.key);
        // Attempt to fetch data
        const { data: rows, error: err } = await client
          .from(selectedJob.config.tableName)
          .select('*')
          .limit(50);

        if (err) throw err;
        setData(rows || []);
      } catch (e: any) {
        console.error("Erro detalhado no TableViewer:", e);
        // Garante que o erro seja uma string legível
        const errorMsg = e.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedJob, refreshKey]);

  // Update selected job if jobs list changes and current selection is invalid
  useEffect(() => {
      if (selectedJobId && !jobs.find(j => j.id === selectedJobId) && jobs.length > 0) {
          setSelectedJobId(jobs[0].id);
      } else if (!selectedJobId && jobs.length > 0) {
          setSelectedJobId(jobs[0].id);
      }
  }, [jobs, selectedJobId]);

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
          <Database size={32} />
        </div>
        <h3 className="text-lg font-medium text-slate-700">Nenhuma tabela conectada</h3>
        <p className="text-slate-500 max-w-md mx-auto">Crie uma nova conexão para visualizar os dados aqui.</p>
      </div>
    );
  }

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
      {/* Header / Selector */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
            <TableIcon size={20} />
          </div>
          <div className="relative max-w-xs w-full">
             <select 
                value={selectedJobId || ''} 
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 font-medium"
             >
                {jobs.map(job => (
                    <option key={job.id} value={job.id}>{job.name} ({job.config.tableName})</option>
                ))}
             </select>
          </div>
        </div>
        
        <button 
            onClick={() => setRefreshKey(k => k + 1)}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Atualizar dados"
        >
            <RefreshCw size={20} className={clsx(loading && "animate-spin")} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto relative">
        {loading && (
             <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 backdrop-blur-sm">
                 <div className="flex flex-col items-center">
                    <Loader2 size={32} className="animate-spin text-indigo-600 mb-2" />
                    <span className="text-sm font-medium text-slate-600">Carregando dados...</span>
                 </div>
             </div>
        )}

        {error ? (
            <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-3">
                    <AlertTriangle size={24} />
                </div>
                <h3 className="text-slate-800 font-medium">Erro ao carregar tabela</h3>
                <p className="text-red-600 text-sm mt-1 bg-red-50 px-4 py-2 rounded border border-red-100 max-w-lg break-words">
                    {error}
                </p>
                <p className="text-slate-400 text-xs mt-4">Verifique se as credenciais e a tabela existem no Supabase.</p>
                <button 
                    onClick={() => setRefreshKey(k => k + 1)}
                    className="mt-4 text-xs font-bold text-indigo-600 hover:underline"
                >
                    Tentar novamente
                </button>
            </div>
        ) : data.length === 0 && !loading ? (
             <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                <p>A tabela está vazia ou a conexão não retornou registros.</p>
             </div>
        ) : (
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="w-12 px-4 py-3 border-b border-r border-slate-200 bg-slate-50 text-xs uppercase tracking-wider">#</th>
                        {columns.map(col => (
                            <th key={col} className="px-4 py-3 border-b border-r border-slate-200 whitespace-nowrap bg-slate-50 text-xs uppercase tracking-wider">{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2 border-r border-slate-100 text-xs text-slate-400 text-center">{idx + 1}</td>
                            {columns.map(col => (
                                <td key={`${idx}-${col}`} className="px-4 py-2 border-r border-slate-100 whitespace-nowrap max-w-[300px] overflow-hidden text-ellipsis">
                                    {row[col] === null ? <span className="text-slate-300 italic">null</span> : 
                                     typeof row[col] === 'object' ? <span className="font-mono text-xs">{JSON.stringify(row[col])}</span> : 
                                     String(row[col])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
      </div>
      
      <div className="p-2 border-t border-slate-200 bg-slate-50 text-xs text-slate-400 text-center">
          Visualizando os primeiros 50 registros de <strong>{selectedJob?.config.tableName}</strong>
      </div>
    </div>
  );
};

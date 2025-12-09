import React, { useState, useMemo } from 'react';
import { FileData, CsvRow } from '../types';
import { Table, AlertCircle, FileText, ArrowRight, Code, Copy, Check, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface PreviewPanelProps {
  files: FileData[];
  tableName: string;
  onSync: () => void;
  onBack: () => void;
  onClearTable: () => Promise<void>; 
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ files, tableName, onSync, onBack, onClearTable }) => {
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Admin states
  const [isClearing, setIsClearing] = useState(false);
  const [clearStatus, setClearStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [clearErrorMsg, setClearErrorMsg] = useState<string | null>(null);

  const totalRows = files.reduce((acc, f) => acc + f.rowCount, 0);
  const totalFiles = files.length;
  
  // Get columns from the first file
  const previewColumns = files[0]?.headers.slice(0, 5) || [];
  const extraColumnsCount = (files[0]?.headers.length || 0) - 5;
  
  // Get first 5 rows for preview
  const previewRows = files[0]?.data.slice(0, 5) || [];

  // Infer types and generate SQL
  const sqlCode = useMemo(() => {
    if (!files.length) return '';

    const safeTableName = tableName.trim() || 'minha_tabela_importada';
    const headers = files[0].headers.filter(h => h && h.trim() !== '');
    const allData = files.flatMap(f => f.data);
    const idColumnIndex = headers.findIndex(h => h.toLowerCase() === 'id');
    const hasId = idColumnIndex !== -1;

    const columnDefs = headers.map((header) => {
      let isInt = true;
      let isFloat = false; 
      let isBoolean = true;
      let hasData = false;
      const isExplicitId = header.toLowerCase() === 'id';

      for (const row of allData) {
        const val = row[header];
        if (val === null || val === undefined || val === '') continue;
        hasData = true;
        if (typeof val === 'boolean') {
            isInt = false; isFloat = false;
        } else if (typeof val === 'number') {
            isBoolean = false;
            if (!Number.isInteger(val)) { isInt = false; isFloat = true; }
        } else {
            isBoolean = false; isInt = false; isFloat = false;
            break; 
        }
      }

      let type = 'text';
      if (hasData) {
        if (isBoolean) type = 'boolean';
        else if (isFloat) type = 'numeric'; 
        else if (isInt) type = 'bigint';
      }
      if (isExplicitId) return `  "${header}" ${type} primary key`;
      return `  "${header}" ${type}`;
    });

    let sql = `CREATE TABLE IF NOT EXISTS "${safeTableName}" (\n`;
    if (!hasId) sql += `  "id" bigint generated always as identity primary key,\n`;
    sql += columnDefs.join(',\n');
    sql += `\n);\n`;
    sql += `\n-- Habilitar Row Level Security (Recomendado)\nALTER TABLE "${safeTableName}" ENABLE ROW LEVEL SECURITY;\n`;
    sql += `\n-- Criar política para permitir acesso total (leitura e escrita)\n`;
    sql += `CREATE POLICY "Permitir acesso total" ON "${safeTableName}" FOR ALL USING (true) WITH CHECK (true);`;

    return sql;
  }, [files, tableName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearClick = async () => {
    if (window.confirm(`ATENÇÃO: Isso apagará TODOS os dados da tabela "${tableName}" no Supabase.\n\nEssa ação não pode ser desfeita. Deseja continuar?`)) {
      setIsClearing(true);
      setClearStatus('idle');
      setClearErrorMsg(null);
      try {
        await onClearTable();
        setClearStatus('success');
        setTimeout(() => setClearStatus('idle'), 3000);
      } catch (e: any) {
        setClearStatus('error');
        setClearErrorMsg(e.message || "Erro desconhecido ao limpar tabela.");
      } finally {
        setIsClearing(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* SQL Generator Section */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-start gap-4">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 hidden sm:block">
                <Code size={24} />
            </div>
            <div className="flex-1">
                <h3 className="text-lg font-bold text-indigo-900 mb-1">Código SQL para Criação</h3>
                <p className="text-indigo-700 text-sm mb-4">
                   Copie e execute no Supabase se a tabela ainda não existir.
                </p>
                
                {!showSql ? (
                    <button onClick={() => setShowSql(true)} className="text-sm bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors shadow-sm">
                        Ver Código SQL
                    </button>
                ) : (
                    <div className="relative">
                         <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto border border-indigo-200 font-mono whitespace-pre-wrap">{sqlCode}</pre>
                        <button onClick={handleCopy} className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-md transition-colors">
                            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

       {/* Admin / Danger Zone */}
       <div className="bg-white border border-red-100 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="bg-red-50 text-red-600 p-2 rounded-lg">
                    <ShieldAlert size={20} />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-800">Limpar Dados Existentes</h3>
                    <p className="text-sm text-slate-500">
                        Útil para resetar a tabela antes da primeira sincronização completa.
                    </p>
                </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
                <button onClick={handleClearClick} disabled={isClearing} className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all w-full md:w-auto justify-center", clearStatus === 'success' ? "bg-green-100 text-green-700" : "bg-white border border-red-200 text-red-600 hover:bg-red-50")}>
                    {isClearing ? <Loader2 size={16} className="animate-spin" /> : clearStatus === 'success' ? <><Check size={16} /> Dados Limpos</> : <><Trash2 size={16} /> Limpar Tabela</>}
                </button>
                
                {clearStatus === 'error' && clearErrorMsg && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded max-w-xs text-right">
                        {clearErrorMsg}
                    </span>
                )}
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-indigo-600" size={20} />
              Visualização dos Dados ({totalRows} linhas)
            </h2>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100 text-slate-800 font-semibold uppercase text-xs">
                <tr>
                  {previewColumns.map((col) => (
                    <th key={col} className="px-4 py-3 border-b">{col}</th>
                  ))}
                  {extraColumnsCount > 0 && <th className="px-4 py-3 border-b">...mais {extraColumnsCount}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {previewColumns.map((col) => (
                      <td key={col} className="px-4 py-2 border-r last:border-r-0 border-slate-100 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                    {extraColumnsCount > 0 && <td className="px-4 py-2 text-slate-400">...</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
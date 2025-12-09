import React, { useState, useMemo } from 'react';
import { FileData, CsvRow } from '../types';
import { Table, AlertCircle, FileText, ArrowRight, Code, Copy, Check, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface PreviewPanelProps {
  files: FileData[];
  tableName: string;
  onSync: () => void;
  onBack: () => void;
  onClearTable: () => Promise<void>; // New prop for clearing table
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ files, tableName, onSync, onBack, onClearTable }) => {
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Admin states
  const [isClearing, setIsClearing] = useState(false);
  const [clearStatus, setClearStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const totalRows = files.reduce((acc, f) => acc + f.rowCount, 0);
  const totalFiles = files.length;
  
  // Get columns from the first file
  const previewColumns = files[0]?.headers.slice(0, 5) || [];
  const extraColumnsCount = (files[0]?.headers.length || 0) - 5;
  
  // Get first 5 rows for preview
  const previewRows = files[0]?.data.slice(0, 5) || [];

  // Infer types and generate SQL
  // We use useMemo to avoid recalculating on every render.
  const sqlCode = useMemo(() => {
    if (!files.length) return '';

    const safeTableName = tableName.trim() || 'minha_tabela_importada';
    // Filter out empty headers just in case
    const headers = files[0].headers.filter(h => h && h.trim() !== '');
    
    // Scan ALL data to ensure we don't miss a decimal value
    const allData = files.flatMap(f => f.data);

    // Check if ID column exists (case insensitive)
    const idColumnIndex = headers.findIndex(h => h.toLowerCase() === 'id');
    const hasId = idColumnIndex !== -1;

    const columnDefs = headers.map((header) => {
      let isInt = true;
      let isFloat = false; // If we find ANY float, the column must be numeric/float
      let isBoolean = true;
      let hasData = false;

      // Special handling for existing 'id' column
      const isExplicitId = header.toLowerCase() === 'id';

      for (const row of allData) {
        const val = row[header];
        if (val === null || val === undefined || val === '') continue;
        
        hasData = true;
        
        if (typeof val === 'boolean') {
            isInt = false;
            isFloat = false;
        } else if (typeof val === 'number') {
            isBoolean = false;
            if (!Number.isInteger(val)) {
                isInt = false;
                isFloat = true;
            }
        } else {
            // It's a string or other object
            isBoolean = false;
            isInt = false;
            isFloat = false;
        }

        // If it's definitely text, stop checking
        if (!isBoolean && !isInt && !isFloat) {
             break; 
        }
      }

      let type = 'text';
      if (hasData) {
        if (isBoolean) type = 'boolean';
        else if (isFloat) type = 'numeric'; // Safer than double precision for money/decimals
        else if (isInt) type = 'bigint';
      }

      // Force ID to be primary key if it exists
      if (isExplicitId) {
          return `  "${header}" ${type} primary key`;
      }

      return `  "${header}" ${type}`;
    });

    let sql = `CREATE TABLE IF NOT EXISTS "${safeTableName}" (\n`;
    
    // If no ID column found, inject an auto-generated one
    if (!hasId) {
        sql += `  "id" bigint generated always as identity primary key,\n`;
    }

    sql += columnDefs.join(',\n');
    sql += `\n);\n`;
    
    // ADDED: Create Policy to avoid RLS error immediately after creation
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
      try {
        await onClearTable();
        setClearStatus('success');
        setTimeout(() => setClearStatus('idle'), 3000);
      } catch (e) {
        setClearStatus('error');
      } finally {
        setIsClearing(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* SQL Generator Section */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-start gap-4">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 hidden sm:block">
                <Code size={24} />
            </div>
            <div className="flex-1">
                <h3 className="text-lg font-bold text-indigo-900 mb-1">Precisa criar a tabela no Supabase?</h3>
                <p className="text-indigo-700 text-sm mb-4">
                    Se você ainda não configurou seu banco de dados, copie o código abaixo e execute no <strong>SQL Editor</strong> do Supabase.
                    <br/>
                    <span className="text-xs opacity-80 mt-1 block">
                        * O código detecta tipos automaticamente e cria a política de segurança (RLS).
                    </span>
                </p>
                
                {!showSql ? (
                    <button 
                        onClick={() => setShowSql(true)}
                        className="text-sm bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors shadow-sm"
                    >
                        Ver Código SQL
                    </button>
                ) : (
                    <div className="relative">
                         <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto border border-indigo-200 font-mono whitespace-pre-wrap">
                            {sqlCode}
                        </pre>
                        <button 
                            onClick={handleCopy}
                            className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-md transition-colors"
                            title="Copiar SQL"
                        >
                            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

       {/* Admin / Danger Zone */}
       <div className="bg-white border border-red-100 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-red-50 text-red-600 p-2 rounded-lg">
                    <ShieldAlert size={20} />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-800">Administração da Tabela</h3>
                    <p className="text-sm text-slate-500">
                        Ações destrutivas para a tabela <strong>{tableName}</strong>
                    </p>
                </div>
            </div>
            
            <button
                onClick={handleClearClick}
                disabled={isClearing}
                className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    clearStatus === 'success' 
                        ? "bg-green-100 text-green-700"
                        : "bg-white border border-red-200 text-red-600 hover:bg-red-50"
                )}
            >
                {isClearing ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : clearStatus === 'success' ? (
                    <><Check size={16} /> Dados Limpos</>
                ) : (
                    <><Trash2 size={16} /> Limpar Tabela</>
                )}
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-indigo-600" size={20} />
              Resumo do Import
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Serão importadas <strong>{totalRows}</strong> linhas de <strong>{totalFiles}</strong> arquivos.
            </p>
          </div>
          <button 
             onClick={onSync}
             className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
             Sincronizar Agora <ArrowRight size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-4 rounded-lg mb-6 text-sm">
            <AlertCircle size={18} />
            <p>Certifique-se de que a tabela <strong>{tableName}</strong> já existe no Supabase e possui as colunas compatíveis.</p>
          </div>

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
          
          <div className="mt-4">
             <h3 className="text-sm font-semibold text-slate-700 mb-2">Arquivos carregados:</h3>
             <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs border border-slate-200">
                        {f.fileName} ({f.rowCount} rows)
                    </span>
                ))}
             </div>
          </div>
        </div>
      </div>
       <button onClick={onBack} className="text-slate-500 hover:text-slate-700 text-sm">
         &larr; Voltar e escolher outros arquivos
       </button>
    </div>
  );
};
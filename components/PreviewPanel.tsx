import React, { useState, useMemo } from 'react';
import { FileData, SupabaseConfig } from '../types';
import { 
    Table, AlertCircle, FileText, ArrowRight, Code, Copy, Check, 
    Trash2, ShieldAlert, Loader2, Edit2, X, Plus, GripVertical 
} from 'lucide-react';
import clsx from 'clsx';

interface PreviewPanelProps {
  files: FileData[];
  tableName: string;
  config: SupabaseConfig;
  onUpdateFiles: (files: FileData[]) => void;
  onUpdateConfig: (config: SupabaseConfig) => void;
  onSync: () => void;
  onBack: () => void;
  onClearTable: () => Promise<void>; 
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ 
    files, 
    tableName, 
    config,
    onUpdateFiles, 
    onUpdateConfig,
    onSync, 
    onBack, 
    onClearTable 
}) => {
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Admin states
  const [isClearing, setIsClearing] = useState(false);
  const [clearStatus, setClearStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [clearErrorMsg, setClearErrorMsg] = useState<string | null>(null);

  // Edit states
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [tempColName, setTempColName] = useState('');

  const totalRows = files.reduce((acc, f) => acc + f.rowCount, 0);
  
  // Get columns from the first file (assuming structure consistency for headers)
  const previewColumns = files[0]?.headers || [];
  
  // Get first 10 rows for preview
  const previewRows = files[0]?.data.slice(0, 10) || [];

  // Infer types and generate SQL
  const sqlCode = useMemo(() => {
    if (!files.length) return '';

    const safeTableName = tableName.trim() || 'minha_tabela_importada';
    const headers = files[0].headers.filter(h => h && h.trim() !== '');
    const allData = files.flatMap(f => f.data.slice(0, 50)); // Sample first 50 rows for type inference
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

  // --- TRANSFORMATION LOGIC ---

  const startEditing = (colName: string) => {
    setEditingCol(colName);
    setTempColName(colName);
  };

  const cancelEditing = () => {
    setEditingCol(null);
    setTempColName('');
  };

  const saveRename = () => {
    if (!editingCol || !tempColName.trim()) return;
    if (editingCol === tempColName) {
        cancelEditing();
        return;
    }

    const oldName = editingCol;
    const newName = tempColName.trim();

    // Check duplicate
    if (files[0].headers.includes(newName)) {
        alert('Já existe uma coluna com este nome.');
        return;
    }

    // Apply transformation to ALL files
    const newFiles = files.map(file => {
        // 1. Rename in Headers
        const newHeaders = file.headers.map(h => h === oldName ? newName : h);
        
        // 2. Rename in Data Rows
        const newData = file.data.map(row => {
            const newRow = { ...row };
            // Move value to new key
            newRow[newName] = newRow[oldName];
            // Delete old key
            delete newRow[oldName];
            return newRow;
        });

        return { ...file, headers: newHeaders, data: newData };
    });

    onUpdateFiles(newFiles);

    // Update Config if PK was renamed
    if (config.primaryKey === oldName) {
        onUpdateConfig({ ...config, primaryKey: newName });
    }

    cancelEditing();
  };

  const deleteColumn = () => {
    if (!editingCol) return;
    const colName = editingCol;

    if (!window.confirm(`Tem certeza que deseja excluir a coluna "${colName}"? Isso removerá os dados dela.`)) {
        return;
    }

    // Apply transformation to ALL files
    const newFiles = files.map(file => {
        // 1. Remove from Headers
        const newHeaders = file.headers.filter(h => h !== colName);
        
        // 2. Remove from Data Rows
        const newData = file.data.map(row => {
            const newRow = { ...row };
            delete newRow[colName];
            return newRow;
        });

        return { ...file, headers: newHeaders, data: newData };
    });

    onUpdateFiles(newFiles);

    // Warn if deleting PK
    if (config.primaryKey === colName) {
        onUpdateConfig({ ...config, primaryKey: '' });
        alert('Atenção: Você excluiu a coluna que estava definida como Chave Primária.');
    }

    cancelEditing();
  };


  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      
      {/* Transformation Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
            <div className="bg-orange-100 p-2 rounded-lg text-orange-600 hidden sm:block">
                <Edit2 size={24} />
            </div>
            <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Editor de Dados (Transformações)</h3>
                <p className="text-slate-600 text-sm mb-4">
                   Passe o mouse sobre os cabeçalhos da tabela abaixo para <b>Renomear</b> ou <b>Excluir</b> colunas. 
                   As alterações serão aplicadas a todas as linhas antes da sincronização.
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 flex items-center gap-1"><Edit2 size={10}/> Clique no cabeçalho para editar</span>
                    <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 flex items-center gap-1"><Trash2 size={10}/> Use a lixeira para remover</span>
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-indigo-600" size={20} />
              Pré-visualização
            </h2>
            <span className="text-xs font-mono text-slate-500 bg-slate-200 px-2 py-1 rounded">{totalRows} linhas</span>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-100 text-slate-800 font-semibold uppercase text-xs">
                <tr>
                  {previewColumns.map((col) => (
                    <th key={col} className="border-b border-r border-slate-200 min-w-[150px] relative group p-0">
                        {editingCol === col ? (
                            <div className="p-1 flex items-center bg-white inset-0 absolute z-10 border-2 border-indigo-500">
                                <input 
                                    autoFocus
                                    className="flex-1 min-w-0 px-1 py-0.5 outline-none text-xs font-mono"
                                    value={tempColName}
                                    onChange={(e) => setTempColName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveRename();
                                        if (e.key === 'Escape') cancelEditing();
                                    }}
                                />
                                <div className="flex items-center gap-1 ml-1">
                                    <button onClick={saveRename} className="p-0.5 text-green-600 hover:bg-green-50 rounded"><Check size={14}/></button>
                                    <button onClick={deleteColumn} className="p-0.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                                    <button onClick={cancelEditing} className="p-0.5 text-slate-400 hover:bg-slate-100 rounded"><X size={14}/></button>
                                </div>
                            </div>
                        ) : (
                            <div 
                                onClick={() => startEditing(col)}
                                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white hover:text-indigo-700 transition-colors h-full select-none"
                            >
                                <span>{col}</span>
                                <Edit2 size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />
                            </div>
                        )}
                    </th>
                  ))}
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
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
        {totalRows > 10 && (
             <div className="p-2 bg-slate-50 text-center text-xs text-slate-400 border-t border-slate-200">
                Mostrando as primeiras 10 linhas. As transformações serão aplicadas em todo o conjunto de dados.
             </div>
        )}
      </div>

      {/* Admin / SQL / Clear Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SQL Generator */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                    <Code size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-indigo-900">SQL para Criação</h3>
                    <p className="text-indigo-700 text-xs">Baseado nas colunas atuais.</p>
                </div>
            </div>
            
            {!showSql ? (
                <button onClick={() => setShowSql(true)} className="w-full text-sm bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors shadow-sm">
                    Ver Código SQL
                </button>
            ) : (
                <div className="relative">
                        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto border border-indigo-200 font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto">{sqlCode}</pre>
                    <button onClick={handleCopy} className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-md transition-colors">
                        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>
                </div>
            )}
        </div>

        {/* Danger Zone */}
        <div className="bg-white border border-red-100 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-start gap-3 mb-4">
                <div className="bg-red-50 text-red-600 p-2 rounded-lg">
                    <ShieldAlert size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">Limpar Tabela</h3>
                    <p className="text-slate-500 text-xs">
                        Apaga todos os dados da tabela "{tableName}" no Supabase.
                    </p>
                </div>
            </div>
            
            <div className="flex flex-col gap-2">
                <button onClick={handleClearClick} disabled={isClearing} className={clsx("flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all justify-center", clearStatus === 'success' ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200")}>
                    {isClearing ? <Loader2 size={16} className="animate-spin" /> : clearStatus === 'success' ? <><Check size={16} /> Limpo com sucesso</> : <><Trash2 size={16} /> Resetar Dados no DB</>}
                </button>
                
                {clearStatus === 'error' && clearErrorMsg && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded text-center">
                        {clearErrorMsg}
                    </span>
                )}
            </div>
        </div>

      </div>

    </div>
  );
};
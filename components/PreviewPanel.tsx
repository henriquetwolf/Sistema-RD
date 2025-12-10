import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FileData, SupabaseConfig } from '../types';
import { 
    Table, FileText, Code, Copy, Check, Trash2, ShieldAlert, Loader2, 
    Edit2, X, MoreVertical, ArrowUp, Filter, Replace, Type, 
    Calendar, Hash, AlignLeft, Braces, ToggleLeft, GripHorizontal
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

type ColumnType = 'text' | 'bigint' | 'numeric' | 'boolean' | 'jsonb' | 'timestamp';

interface ColumnMeta {
    name: string;
    type: ColumnType;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ 
    files, 
    tableName, 
    config,
    onUpdateFiles, 
    onUpdateConfig,
    onBack, 
    onClearTable 
}) => {
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Admin states
  const [isClearing, setIsClearing] = useState(false);
  const [clearStatus, setClearStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [clearErrorMsg, setClearErrorMsg] = useState<string | null>(null);

  // Transformation UI States
  const [activeMenuCol, setActiveMenuCol] = useState<string | null>(null);
  const [columnTypes, setColumnTypes] = useState<Record<string, ColumnType>>({});
  
  // Modals
  const [modalMode, setModalMode] = useState<'rename' | 'replace' | 'filter' | null>(null);
  const [modalCol, setModalCol] = useState<string | null>(null);
  
  // Modal Inputs
  const [renameValue, setRenameValue] = useState('');
  const [findValue, setFindValue] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [filterMode, setFilterMode] = useState<'keep' | 'remove'>('remove');

  // Click outside to close menu
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuCol(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- DERIVED DATA ---
  const totalRows = files.reduce((acc, f) => acc + f.rowCount, 0);
  const previewColumns = files[0]?.headers || [];
  const previewRows = files[0]?.data.slice(0, 15) || []; // Show 15 rows

  // --- SQL GENERATION ---
  const sqlCode = useMemo(() => {
    if (!files.length) return '';

    const safeTableName = tableName.trim() || 'minha_tabela_importada';
    const headers = files[0].headers.filter(h => h && h.trim() !== '');
    const idColumnIndex = headers.findIndex(h => h.toLowerCase() === 'id');
    const hasId = idColumnIndex !== -1;

    const columnDefs = headers.map((header) => {
      const isExplicitId = header.toLowerCase() === 'id';
      // Use user selected type OR default to text
      const type = columnTypes[header] || 'text'; 
      
      if (isExplicitId) return `  "${header}" ${type} primary key`;
      return `  "${header}" ${type}`;
    });

    let sql = `CREATE TABLE IF NOT EXISTS "${safeTableName}" (\n`;
    if (!hasId) sql += `  "id" bigint generated always as identity primary key,\n`;
    sql += columnDefs.join(',\n');
    sql += `\n);\n`;
    sql += `\nALTER TABLE "${safeTableName}" ENABLE ROW LEVEL SECURITY;\n`;
    sql += `CREATE POLICY "Permitir acesso total" ON "${safeTableName}" FOR ALL USING (true) WITH CHECK (true);`;

    return sql;
  }, [files, tableName, columnTypes]);


  // --- ACTIONS ---

  // 1. Promote Headers
  const promoteHeaders = () => {
    if (files.length === 0 || files[0].data.length === 0) return;

    if (!window.confirm("Usar a primeira linha como cabeçalho? A primeira linha de TODOS os arquivos será removida.")) return;

    const firstFile = files[0];
    const newHeaders = files[0].headers.map(h => String(firstFile.data[0][h] || `Col_${Math.random().toString(36).substr(2, 5)}`));

    const newFiles = files.map(f => ({
        ...f,
        headers: newHeaders,
        data: f.data.slice(1).map(row => {
            // Remap row keys to new headers
            const newRow: any = {};
            f.headers.forEach((oldH, idx) => {
                newRow[newHeaders[idx]] = row[oldH];
            });
            return newRow;
        }),
        rowCount: f.rowCount - 1
    }));

    onUpdateFiles(newFiles);
  };

  // 2. Delete Row
  const deleteRow = (fileIndex: number, rowIndex: number) => {
      // Note: This deletes visual row. 
      // Since we map all files, we need to find which file owns this row if we were rendering all.
      // But here we usually preview mostly file[0]. 
      // Implementation: We will just delete from file[0] for the preview if index matches.
      // For a robust implementation, we'd need to know source file.
      // Assuming previewRows comes from file[0]:
      
      const newFiles = [...files];
      const targetFile = newFiles[0]; // Currently editing first file in preview
      
      const newData = [...targetFile.data];
      newData.splice(rowIndex, 1);
      
      targetFile.data = newData;
      targetFile.rowCount = newData.length;
      newFiles[0] = targetFile;
      
      onUpdateFiles(newFiles);
  };

  // 3. Change Type
  const handleTypeChange = (col: string, type: ColumnType) => {
      setColumnTypes(prev => ({ ...prev, [col]: type }));
      setActiveMenuCol(null);
  };

  // 4. Rename Column
  const applyRename = () => {
    if (!modalCol || !renameValue.trim()) return;
    const oldName = modalCol;
    const newName = renameValue.trim();

    if (files[0].headers.includes(newName)) {
        alert('Já existe uma coluna com este nome.');
        return;
    }

    const newFiles = files.map(file => {
        const newHeaders = file.headers.map(h => h === oldName ? newName : h);
        const newData = file.data.map(row => {
            const newRow = { ...row };
            newRow[newName] = newRow[oldName];
            delete newRow[oldName];
            return newRow;
        });
        return { ...file, headers: newHeaders, data: newData };
    });

    // Update Types Map
    if (columnTypes[oldName]) {
        const newTypes = { ...columnTypes };
        newTypes[newName] = newTypes[oldName];
        delete newTypes[oldName];
        setColumnTypes(newTypes);
    }

    onUpdateFiles(newFiles);
    if (config.primaryKey === oldName) onUpdateConfig({ ...config, primaryKey: newName });
    
    closeModal();
  };

  // 5. Replace Values
  const applyReplace = () => {
      if (!modalCol) return;
      const col = modalCol;

      const newFiles = files.map(f => ({
          ...f,
          data: f.data.map(row => {
              const val = String(row[col] || '');
              if (val === findValue) {
                  return { ...row, [col]: replaceValue };
              }
              // Basic substring replace if intended? Let's do exact match for CSV safety, 
              // or simple string replace for flexibility. Let's do string replace.
              if (val.includes(findValue) && findValue !== '') {
                   return { ...row, [col]: val.split(findValue).join(replaceValue) };
              }
              return row;
          })
      }));
      
      onUpdateFiles(newFiles);
      closeModal();
  };

  // 6. Filter
  const applyFilter = () => {
      if (!modalCol || !filterValue) return;
      const col = modalCol;

      const newFiles = files.map(f => {
          const newData = f.data.filter(row => {
              const val = String(row[col] || '').toLowerCase();
              const query = filterValue.toLowerCase();
              const match = val.includes(query);
              
              return filterMode === 'keep' ? match : !match;
          });
          return { ...f, data: newData, rowCount: newData.length };
      });

      onUpdateFiles(newFiles);
      closeModal();
  };

  // 7. Delete Column
  const deleteColumn = (colName: string) => {
    if (!window.confirm(`Excluir coluna "${colName}"?`)) return;

    const newFiles = files.map(file => {
        const newHeaders = file.headers.filter(h => h !== colName);
        const newData = file.data.map(row => {
            const newRow = { ...row };
            delete newRow[colName];
            return newRow;
        });
        return { ...file, headers: newHeaders, data: newData };
    });

    onUpdateFiles(newFiles);
    if (config.primaryKey === colName) {
        onUpdateConfig({ ...config, primaryKey: '' });
    }
    setActiveMenuCol(null);
  };

  // Helper
  const openModal = (mode: 'rename' | 'replace' | 'filter', col: string) => {
      setModalCol(col);
      setModalMode(mode);
      setActiveMenuCol(null);
      // Reset inputs
      setRenameValue(col);
      setFindValue('');
      setReplaceValue('');
      setFilterValue('');
  };

  const closeModal = () => {
      setModalMode(null);
      setModalCol(null);
  };

  const getTypeIcon = (col: string) => {
      const t = columnTypes[col] || 'text';
      switch(t) {
          case 'bigint': case 'numeric': return <Hash size={12} className="text-blue-500" />;
          case 'boolean': return <ToggleLeft size={12} className="text-purple-500" />;
          case 'timestamp': return <Calendar size={12} className="text-orange-500" />;
          case 'jsonb': return <Braces size={12} className="text-yellow-600" />;
          default: return <AlignLeft size={12} className="text-slate-400" />;
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 relative">
      
      {/* --- TOOLBAR --- */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
             <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <Edit2 size={20} />
            </div>
            <div>
                <h3 className="text-sm font-bold text-slate-900">Transformação</h3>
                <p className="text-xs text-slate-500">Editor avançado de dados</p>
            </div>
        </div>

        <button 
            onClick={promoteHeaders}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
        >
            <ArrowUp size={16} /> Usar 1ª linha como cabeçalho
        </button>

        <div className="flex-1 text-right text-xs text-slate-400">
            {totalRows} linhas carregadas
        </div>
      </div>

      {/* --- TABLE PREVIEW --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible flex flex-col relative min-h-[400px]">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-indigo-600" size={20} />
              Pré-visualização
            </h2>
        </div>

        <div className="overflow-x-auto pb-24"> {/* Extra padding for dropdowns */}
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-100 text-slate-800 font-semibold uppercase text-xs">
                <tr>
                  <th className="w-8 p-0 border-b border-r border-slate-200"></th> {/* Row Actions */}
                  {previewColumns.map((col) => (
                    <th key={col} className="border-b border-r border-slate-200 min-w-[150px] relative group p-0 select-none">
                        <div className="flex items-center justify-between px-3 py-3 hover:bg-white transition-colors h-full">
                            <div className="flex items-center gap-2">
                                {getTypeIcon(col)}
                                <span>{col}</span>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setActiveMenuCol(activeMenuCol === col ? null : col); }}
                                className={clsx("p-1 rounded hover:bg-slate-100", activeMenuCol === col ? "opacity-100 bg-slate-200" : "opacity-0 group-hover:opacity-100")}
                            >
                                <MoreVertical size={14} />
                            </button>
                        </div>

                        {/* COLUMN MENU DROPDOWN */}
                        {activeMenuCol === col && (
                            <div ref={menuRef} className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 text-xs font-normal normal-case overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                <div className="p-1">
                                    <div className="px-2 py-1.5 text-slate-400 font-bold text-[10px] uppercase">Alterar Tipo</div>
                                    <button onClick={() => handleTypeChange(col, 'text')} className="flex items-center gap-2 w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded text-slate-700"><AlignLeft size={12}/> Texto</button>
                                    <button onClick={() => handleTypeChange(col, 'bigint')} className="flex items-center gap-2 w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded text-slate-700"><Hash size={12}/> Inteiro</button>
                                    <button onClick={() => handleTypeChange(col, 'numeric')} className="flex items-center gap-2 w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded text-slate-700"><Hash size={12}/> Decimal</button>
                                    <button onClick={() => handleTypeChange(col, 'boolean')} className="flex items-center gap-2 w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded text-slate-700"><ToggleLeft size={12}/> Booleano</button>
                                    <button onClick={() => handleTypeChange(col, 'timestamp')} className="flex items-center gap-2 w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded text-slate-700"><Calendar size={12}/> Data/Hora</button>
                                </div>
                                <div className="h-px bg-slate-100 my-1"></div>
                                <div className="p-1">
                                    <button onClick={() => openModal('rename', col)} className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-slate-100 rounded text-slate-700"><Edit2 size={12}/> Renomear...</button>
                                    <button onClick={() => openModal('replace', col)} className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-slate-100 rounded text-slate-700"><Replace size={12}/> Substituir Valores...</button>
                                    <button onClick={() => openModal('filter', col)} className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-slate-100 rounded text-slate-700"><Filter size={12}/> Filtrar Linhas...</button>
                                </div>
                                <div className="h-px bg-slate-100 my-1"></div>
                                <div className="p-1">
                                    <button onClick={() => deleteColumn(col)} className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-red-50 text-red-600 rounded"><Trash2 size={12}/> Excluir Coluna</button>
                                </div>
                            </div>
                        )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((row, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50">
                    <td className="w-8 border-r border-slate-100 text-center relative">
                        <span className="text-[10px] text-slate-300 group-hover:hidden">{idx + 1}</span>
                        <button 
                            onClick={() => deleteRow(0, idx)}
                            className="hidden group-hover:flex absolute inset-0 items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                            title="Remover linha"
                        >
                            <X size={14} />
                        </button>
                    </td>
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
        <div className="p-2 bg-slate-50 text-center text-xs text-slate-400 border-t border-slate-200 absolute bottom-0 w-full">
            Mostrando as primeiras 15 linhas. As transformações serão aplicadas em todo o conjunto de dados.
        </div>
      </div>

      {/* --- ADMIN SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SQL Generator */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                    <Code size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-indigo-900">SQL para Criação</h3>
                    <p className="text-indigo-700 text-xs">Atualiza automaticamente com base nos tipos selecionados.</p>
                </div>
            </div>
            
            {!showSql ? (
                <button onClick={() => setShowSql(true)} className="w-full text-sm bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors shadow-sm">
                    Ver Código SQL
                </button>
            ) : (
                <div className="relative">
                        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto border border-indigo-200 font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto">{sqlCode}</pre>
                    <button onClick={() => { navigator.clipboard.writeText(sqlCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-md transition-colors">
                        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>
                </div>
            )}
        </div>

        {/* Clear Data */}
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
                <button 
                    onClick={async () => {
                        if (window.confirm(`ATENÇÃO: Apagar TODOS os dados de "${tableName}"?`)) {
                            setIsClearing(true);
                            setClearStatus('idle');
                            try {
                                await onClearTable();
                                setClearStatus('success');
                            } catch (e: any) {
                                setClearStatus('error');
                                setClearErrorMsg(e.message);
                            } finally {
                                setIsClearing(false);
                            }
                        }
                    }} 
                    disabled={isClearing} 
                    className={clsx("flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all justify-center", clearStatus === 'success' ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200")}
                >
                    {isClearing ? <Loader2 size={16} className="animate-spin" /> : clearStatus === 'success' ? <><Check size={16} /> Limpo com sucesso</> : <><Trash2 size={16} /> Resetar Dados no DB</>}
                </button>
                
                {clearStatus === 'error' && clearErrorMsg && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded text-center">{clearErrorMsg}</span>
                )}
            </div>
        </div>
      </div>

      {/* --- MODALS OVERLAY --- */}
      {modalMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800 capitalize flex items-center gap-2">
                          {modalMode === 'rename' && <><Edit2 size={16} className="text-indigo-600"/> Renomear Coluna</>}
                          {modalMode === 'replace' && <><Replace size={16} className="text-indigo-600"/> Substituir Valores</>}
                          {modalMode === 'filter' && <><Filter size={16} className="text-indigo-600"/> Filtrar Coluna</>}
                      </h3>
                      <button onClick={closeModal} className="text-slate-400 hover:bg-slate-200 rounded p-1"><X size={18}/></button>
                  </div>
                  
                  <div className="p-5 space-y-4">
                      {modalMode === 'rename' && (
                          <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Novo nome para "{modalCol}"</label>
                              <input 
                                  value={renameValue} 
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                  autoFocus
                              />
                          </div>
                      )}

                      {modalMode === 'replace' && (
                          <>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Localizar valor</label>
                                <input 
                                    value={findValue} 
                                    onChange={(e) => setFindValue(e.target.value)}
                                    placeholder="Ex: null"
                                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Substituir por</label>
                                <input 
                                    value={replaceValue} 
                                    onChange={(e) => setReplaceValue(e.target.value)}
                                    placeholder="Ex: (vazio)"
                                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                          </>
                      )}

                      {modalMode === 'filter' && (
                          <>
                             <div className="flex gap-2 p-1 bg-slate-100 rounded mb-2">
                                 <button 
                                    onClick={() => setFilterMode('remove')}
                                    className={clsx("flex-1 py-1 text-xs font-medium rounded transition-all", filterMode === 'remove' ? "bg-white shadow text-red-600" : "text-slate-500 hover:text-slate-700")}
                                 >
                                    Remover se conter...
                                 </button>
                                 <button 
                                    onClick={() => setFilterMode('keep')}
                                    className={clsx("flex-1 py-1 text-xs font-medium rounded transition-all", filterMode === 'keep' ? "bg-white shadow text-green-600" : "text-slate-500 hover:text-slate-700")}
                                 >
                                    Manter apenas se...
                                 </button>
                             </div>
                             <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Valor do filtro</label>
                                <input 
                                    value={filterValue} 
                                    onChange={(e) => setFilterValue(e.target.value)}
                                    placeholder="Ex: cancelado"
                                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                    autoFocus
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Isso removerá as linhas do conjunto de dados antes do envio.</p>
                            </div>
                          </>
                      )}
                  </div>

                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                      <button onClick={closeModal} className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded font-medium">Cancelar</button>
                      <button 
                        onClick={() => {
                            if (modalMode === 'rename') applyRename();
                            if (modalMode === 'replace') applyReplace();
                            if (modalMode === 'filter') applyFilter();
                        }}
                        className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium shadow-sm"
                      >
                          Confirmar
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
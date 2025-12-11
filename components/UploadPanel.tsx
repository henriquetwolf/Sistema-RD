import React, { useRef, useState } from 'react';
import { Upload, FileType, Link, AlertCircle, FileSpreadsheet, Check, ExternalLink, HelpCircle, Cloud } from 'lucide-react';
import { parseExcelFile } from '../utils/excelParser';
import clsx from 'clsx';

interface UploadPanelProps {
  onFilesSelected: (files: File[]) => void;
  onUrlConfirmed?: (url: string) => void;
  isLoading: boolean;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({ onFilesSelected, onUrlConfirmed, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'sheets' | 'onedrive'>('upload');
  const [dragActive, setDragActive] = useState(false);
  
  // Google Sheets State
  const [sheetUrl, setSheetUrl] = useState('');
  
  // OneDrive State
  const [oneDriveUrl, setOneDriveUrl] = useState('');

  // Shared Loading/Error State
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPassFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      validateAndPassFiles(Array.from(e.target.files));
    }
  };

  const validateAndPassFiles = (files: File[]) => {
    const validFiles = files.filter(f => 
      f.type === 'text/csv' || 
      f.name.endsWith('.csv') || 
      f.name.endsWith('.xlsx') ||
      f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    } else {
      alert('Por favor, selecione apenas arquivos CSV ou Excel (.xlsx).');
    }
  };

  const processGoogleSheet = async () => {
    if (!sheetUrl) return;
    
    setIsFetching(true);
    setFetchError(null);

    try {
      let fetchUrl = sheetUrl.trim();
      let docId = 'sheet';

      // Lógica Google Sheets
      if (fetchUrl.includes('/d/e/')) {
        if (fetchUrl.includes('/pubhtml')) {
           fetchUrl = fetchUrl.replace('/pubhtml', '/pub?output=csv');
        } else if (!fetchUrl.includes('output=csv')) {
           fetchUrl = fetchUrl.replace(/\/pub.*/, '/pub?output=csv');
           if (!fetchUrl.includes('output=csv')) fetchUrl += '/pub?output=csv';
        }
        docId = 'published_doc';
      } else {
        const idMatch = fetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        const gidMatch = fetchUrl.match(/[#&?]gid=([0-9]+)/);

        if (!idMatch) throw new Error("URL não reconhecida. Use o link 'Publicar na Web' (CSV).");

        docId = idMatch[1];
        const gid = gidMatch ? gidMatch[1] : '0';
        fetchUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;
      }

      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error("Permissão negada. A planilha precisa ser publicada como CSV.");
        }
        throw new Error(`Erro ao baixar (${response.status}). Link inválido.`);
      }

      const csvText = await response.text();
      
      if (csvText.trim().toLowerCase().startsWith('<!doctype html') || csvText.includes('<html')) {
           throw new Error("O Google retornou HTML. Use a opção 'Publicar na Web' > Formato 'CSV'.");
      }

      const fileName = `google_sheet_${docId}.csv`;
      const file = new File([csvText], fileName, { type: 'text/csv' });
      
      if (onUrlConfirmed) onUrlConfirmed(fetchUrl);
      onFilesSelected([file]);

    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setIsFetching(false);
    }
  };

  const processOneDrive = async () => {
    if (!oneDriveUrl) return;

    setIsFetching(true);
    setFetchError(null);

    try {
        let fetchUrl = oneDriveUrl.trim();
        
        // Transformação de Link do OneDrive / SharePoint
        // Remove query params existentes e adiciona download=1
        const baseUrl = fetchUrl.split('?')[0];
        fetchUrl = `${baseUrl}?download=1`;

        // Tentativa de Fetch
        const response = await fetch(fetchUrl);

        if (!response.ok) {
            throw new Error(`Erro (${response.status}). Verifique se o link é "Qualquer pessoa" (Público).`);
        }

        // Para Excel, precisamos do BLOB, não text
        const blob = await response.blob();
        
        // Validação básica de tipo
        if (blob.type.includes('text/html')) {
             throw new Error("O link retornou uma página de login ou visualização. Use um link direto de download.");
        }

        const fileName = "onedrive_import.xlsx";
        const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Tenta parsear aqui mesmo para garantir que é um Excel válido antes de prosseguir
        await parseExcelFile(file);

        if (onUrlConfirmed) onUrlConfirmed(fetchUrl);
        onFilesSelected([file]);

    } catch (err: any) {
        console.error(err);
        let msg = err.message;
        if (msg.includes('Failed to fetch')) {
            msg = "Bloqueio de CORS detectado. O OneDrive Business pode bloquear downloads via navegador. Tente baixar o arquivo manualmente e fazer upload.";
        }
        setFetchError(msg);
    } finally {
        setIsFetching(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-white p-1 rounded-lg border border-slate-200 inline-flex shadow-sm">
            <button
                onClick={() => { setActiveTab('upload'); setFetchError(null); }}
                className={clsx(
                    "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                    activeTab === 'upload' ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
            >
                <Upload size={16} /> Upload Local
            </button>
            <button
                onClick={() => { setActiveTab('sheets'); setFetchError(null); }}
                className={clsx(
                    "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                    activeTab === 'sheets' ? "bg-green-100 text-green-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
            >
                <FileSpreadsheet size={16} /> Google Sheets
            </button>
            <button
                onClick={() => { setActiveTab('onedrive'); setFetchError(null); }}
                className={clsx(
                    "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                    activeTab === 'onedrive' ? "bg-blue-100 text-blue-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
            >
                <Cloud size={16} /> OneDrive / Excel
            </button>
        </div>
      </div>

      {activeTab === 'upload' && (
        <div
            className={clsx(
            "relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ease-in-out cursor-pointer",
            dragActive
                ? "border-indigo-500 bg-indigo-50"
                : "border-slate-300 hover:border-indigo-400 bg-white"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
        >
            <input
            ref={inputRef}
            className="hidden"
            type="file"
            multiple
            accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleChange}
            />
            
            {isLoading ? (
            <div className="flex flex-col items-center animate-pulse">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <FileType className="animate-bounce" size={32} />
                </div>
                <p className="text-lg font-medium text-slate-700">Processando arquivos...</p>
            </div>
            ) : (
            <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-100 group-hover:text-indigo-500 transition-colors">
                <Upload size={32} />
                </div>
                <p className="text-lg font-medium text-slate-700 mb-1">
                Arraste seus arquivos <span className="text-indigo-600 font-bold">CSV</span> ou <span className="text-indigo-600 font-bold">Excel (.xlsx)</span>
                </p>
                <p className="text-sm text-slate-500">
                Você pode selecionar vários arquivos com as mesmas colunas
                </p>
            </div>
            )}
        </div>
      )}

      {activeTab === 'sheets' && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
             <div className="mb-6 text-center">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Link size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Sincronizar Google Sheets</h3>
                <p className="text-sm text-slate-500 mt-1">Conecte uma planilha pública diretamente.</p>
             </div>

             <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Link de Publicação (CSV)</label>
                    <input 
                        type="text" 
                        value={sheetUrl}
                        onChange={(e) => { setSheetUrl(e.target.value); setFetchError(null); }}
                        placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition font-mono text-xs text-slate-600"
                    />
                </div>

                {fetchError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2 whitespace-pre-line">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{fetchError}</span>
                    </div>
                )}

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-sm">
                    <div className="flex items-center gap-2 font-semibold text-slate-700 mb-2">
                        <HelpCircle size={16} />
                        Como obter o link correto:
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 text-xs">
                        <li>Na sua planilha, vá em <b>Arquivo</b> &gt; <b>Compartilhar</b> &gt; <b>Publicar na Web</b>.</li>
                        <li>Na caixa de seleção, mude de "Página da Web" para <b>Valores separados por vírgula (.csv)</b>.</li>
                        <li>Clique em <b>Publicar</b> e copie o link gerado.</li>
                    </ol>
                </div>

                <button
                    onClick={processGoogleSheet}
                    disabled={!sheetUrl || isFetching || isLoading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 mt-2"
                >
                    {isFetching || isLoading ? 'Baixando...' : 'Carregar Planilha'}
                </button>
             </div>
        </div>
      )}

      {activeTab === 'onedrive' && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
             <div className="mb-6 text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Cloud size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">OneDrive / Excel Online</h3>
                <p className="text-sm text-slate-500 mt-1">Conecte um arquivo .xlsx hospedado na nuvem.</p>
             </div>

             <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Link de Compartilhamento</label>
                    <input 
                        type="text" 
                        value={oneDriveUrl}
                        onChange={(e) => { setOneDriveUrl(e.target.value); setFetchError(null); }}
                        placeholder="https://suaempresa-my.sharepoint.com/:x:/g/..."
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-xs text-slate-600"
                    />
                </div>

                {fetchError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2 whitespace-pre-line">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{fetchError}</span>
                    </div>
                )}

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-sm">
                    <div className="flex items-center gap-2 font-semibold text-slate-700 mb-2">
                        <HelpCircle size={16} />
                        Instruções:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 text-xs">
                        <li>No Excel Online ou OneDrive, clique em <b>Compartilhar</b>.</li>
                        <li>Certifique-se de configurar para <b>"Qualquer pessoa com o link"</b> (Público).</li>
                        <li>Copie o link e cole acima.</li>
                        <li>O sistema tentará baixar o arquivo automaticamente.</li>
                    </ul>
                </div>

                <button
                    onClick={processOneDrive}
                    disabled={!oneDriveUrl || isFetching || isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 mt-2"
                >
                    {isFetching || isLoading ? 'Processando Excel...' : 'Carregar Excel'}
                </button>
             </div>
        </div>
      )}
    </div>
  );
};

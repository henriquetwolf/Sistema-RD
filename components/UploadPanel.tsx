import React, { useRef, useState } from 'react';
import { Upload, FileType, Link, AlertCircle, FileSpreadsheet, Check, ExternalLink, HelpCircle } from 'lucide-react';
import clsx from 'clsx';

interface UploadPanelProps {
  onFilesSelected: (files: File[]) => void;
  onUrlConfirmed?: (url: string) => void; // New prop to store URL for auto-sync
  isLoading: boolean;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({ onFilesSelected, onUrlConfirmed, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'sheets'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  
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
    const csvFiles = files.filter(f => f.type === 'text/csv' || f.name.endsWith('.csv'));
    if (csvFiles.length > 0) {
      onFilesSelected(csvFiles);
    } else {
      alert('Por favor, selecione apenas arquivos CSV.');
    }
  };

  const processGoogleSheet = async () => {
    if (!sheetUrl) return;
    
    setIsFetchingSheet(true);
    setSheetError(null);

    try {
      let fetchUrl = sheetUrl.trim();
      let docId = 'sheet';

      // LÓGICA DE URL INTELIGENTE
      
      // Caso 1: Link "Publicar na Web" (/d/e/...)
      if (fetchUrl.includes('/d/e/')) {
        // Se o usuário colou o link da "Página da Web" (HTML), tentamos converter para CSV
        if (fetchUrl.includes('/pubhtml')) {
           fetchUrl = fetchUrl.replace('/pubhtml', '/pub?output=csv');
        } else if (!fetchUrl.includes('output=csv')) {
           // Se não tem output especificado, forçamos csv
           fetchUrl = fetchUrl.replace(/\/pub.*/, '/pub?output=csv');
           // Fallback se a regex não pegar
           if (!fetchUrl.includes('output=csv')) fetchUrl += '/pub?output=csv';
        }
        docId = 'published_doc';
      } 
      // Caso 2: Link Padrão (/d/ID/edit...)
      else {
        const idMatch = fetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        const gidMatch = fetchUrl.match(/[#&?]gid=([0-9]+)/);

        if (!idMatch) {
            throw new Error("URL não reconhecida. Use o link 'Publicar na Web' (CSV).");
        }

        docId = idMatch[1];
        const gid = gidMatch ? gidMatch[1] : '0';
        
        // Tentamos o endpoint de exportação
        fetchUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;
      }

      console.log("Fetching URL:", fetchUrl); // Debug

      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error("Permissão negada. A planilha precisa ser publicada como CSV (Arquivo > Compartilhar > Publicar na Web).");
        }
        throw new Error(`Erro ao baixar (${response.status}). Verifique se o link está correto.`);
      }

      const contentType = response.headers.get('content-type');
      const csvText = await response.text();
      
      // Validação: Verifica se retornou HTML (o que acontece quando pede login ou link errado)
      if (csvText.trim().toLowerCase().startsWith('<!doctype html') || csvText.includes('<html')) {
           throw new Error("O Google retornou uma página de Login/HTML em vez de CSV. \nSOLUÇÃO: Use a opção 'Publicar na Web' > Formato 'CSV' e cole aquele link específico.");
      }

      // Create a File object from the text
      const fileName = `google_sheet_${docId}.csv`;
      const file = new File([csvText], fileName, { type: 'text/csv' });
      
      // Save the URL for auto-sync later
      if (onUrlConfirmed) {
          onUrlConfirmed(fetchUrl);
      }
      
      onFilesSelected([file]);

    } catch (err: any) {
      setSheetError(err.message);
    } finally {
      setIsFetchingSheet(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-white p-1 rounded-lg border border-slate-200 inline-flex shadow-sm">
            <button
                onClick={() => { setActiveTab('upload'); setSheetError(null); }}
                className={clsx(
                    "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                    activeTab === 'upload' ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
            >
                <Upload size={16} /> Upload Arquivo
            </button>
            <button
                onClick={() => { setActiveTab('sheets'); setSheetError(null); }}
                className={clsx(
                    "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                    activeTab === 'sheets' ? "bg-green-100 text-green-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
            >
                <FileSpreadsheet size={16} /> Google Sheets
            </button>
        </div>
      </div>

      {activeTab === 'upload' ? (
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
            accept=".csv"
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
                Arraste e solte seus arquivos CSV aqui
                </p>
                <p className="text-sm text-slate-500">
                ou clique para selecionar arquivos do computador
                </p>
            </div>
            )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
             <div className="mb-6 text-center">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Link size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Sincronizar Planilha do Google</h3>
                <p className="text-sm text-slate-500 mt-1">Conecte uma planilha pública diretamente.</p>
             </div>

             <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Link de Publicação (CSV)</label>
                    <input 
                        type="text" 
                        value={sheetUrl}
                        onChange={(e) => { setSheetUrl(e.target.value); setSheetError(null); }}
                        placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition font-mono text-xs text-slate-600"
                    />
                </div>

                {sheetError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2 whitespace-pre-line">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{sheetError}</span>
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
                        <li>O link deve conter <code>/pub?output=csv</code> no final.</li>
                    </ol>
                </div>

                <button
                    onClick={processGoogleSheet}
                    disabled={!sheetUrl || isFetchingSheet || isLoading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 mt-2"
                >
                    {isFetchingSheet || isLoading ? 'Baixando...' : 'Carregar Planilha'}
                </button>
             </div>
        </div>
      )}
    </div>
  );
};
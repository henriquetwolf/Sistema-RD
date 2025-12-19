
import React, { useRef, useState } from 'react';
import { 
    Upload, FileType, Link, AlertCircle, FileSpreadsheet, Cloud, 
    Layers, CheckCircle2, Download, Users, School, GraduationCap, 
    Store, Building2, LayoutGrid, Info, FileText
} from 'lucide-react';
import { parseExcelFile } from '../utils/excelParser';
import { EntityImportType } from '../types';
import clsx from 'clsx';

interface UploadPanelProps {
  onFilesSelected: (files: File[]) => void;
  onUrlConfirmed?: (url: string) => void;
  onEntitySelected?: (type: EntityImportType) => void;
  isLoading: boolean;
}

const ENTITIES = [
    { id: 'collaborators', label: 'Colaboradores', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', template: 'full_name,email,phone,role,department,status,admission_date,cpf,rg' },
    { id: 'instructors', label: 'Instrutores', icon: School, color: 'text-orange-600', bg: 'bg-orange-50', template: 'full_name,email,phone,teacher_level,is_active,academic_formation,city,state' },
    { id: 'students', label: 'Alunos / Leads', icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50', template: 'contact_name,company_name,email,phone,cpf,product_name,stage,status,class_mod_1,class_mod_2' },
    { id: 'franchises', label: 'Franquias', icon: Store, color: 'text-teal-600', bg: 'bg-teal-50', template: 'franchisee_name,email,phone,commercial_city,commercial_state,studio_status,cnpj' },
    { id: 'studios', label: 'Studios Parceiros', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50', template: 'fantasy_name,responsible_name,email,phone,city,state,status' },
];

export const UploadPanel: React.FC<UploadPanelProps> = ({ onFilesSelected, onUrlConfirmed, onEntitySelected, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'sheets' | 'onedrive'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [importType, setImportType] = useState<EntityImportType>('generic');
  
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

  const handleEntitySelect = (type: EntityImportType) => {
      setImportType(type);
      if (onEntitySelected) onEntitySelected(type);
  };

  const downloadTemplate = (entityId: string) => {
      const entity = ENTITIES.find(e => e.id === entityId);
      if (!entity) return;

      const headers = entity.template.split(',');
      
      // Criar uma tabela HTML simples que o Excel interpreta nativamente ao abrir como .xls
      let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
      html += '<head><meta charset="utf-8" /><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Template</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
      html += '<body><table border="1">';
      html += '<tr>';
      headers.forEach(h => {
          html += `<th style="background-color: #0d9488; color: #ffffff; font-weight: bold; padding: 5px;">${h}</th>`;
      });
      html += '</tr>';
      // Adicionar uma linha vazia para o usuário preencher
      html += '<tr>';
      headers.forEach(() => {
          html += '<td></td>';
      });
      html += '</tr>';
      html += '</table></body></html>';

      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `modelo_importacao_${entityId}.xls`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const processGoogleSheet = async () => {
    if (!sheetUrl) return;
    setIsFetching(true);
    setFetchError(null);

    try {
      let fetchUrl = sheetUrl.trim();
      let docId = 'sheet';

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
        const baseUrl = fetchUrl.split('?')[0];
        fetchUrl = `${baseUrl}?download=1`;

        let response;
        try {
            response = await fetch(fetchUrl);
            if (!response.ok) throw new Error('Direct fetch failed');
        } catch (directErr) {
            console.warn("Download direto falhou (provável CORS), tentando via proxy...");
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`;
            response = await fetch(proxyUrl);
        }

        if (!response.ok) {
            throw new Error(`Erro (${response.status}). Verifique se o link é "Qualquer pessoa" (Público).`);
        }

        const blob = await response.blob();
        if (blob.type.includes('text/html')) {
             throw new Error("O link retornou uma página de login ou visualização. Use um link direto de download.");
        }

        const fileName = "onedrive_import.xlsx";
        const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        await parseExcelFile(file);

        if (onUrlConfirmed) onUrlConfirmed(fetchUrl);
        onFilesSelected([file]);

    } catch (err: any) {
        console.error(err);
        let msg = err.message;
        if (msg.includes('Failed to fetch')) {
            msg = "Erro de conexão. Verifique se o link está correto e acessível publicamente.";
        }
        setFetchError(msg);
    } finally {
        /* Corrected: Fixed non-existent setter name 'setIsSearchingMap' to the correct 'setIsFetching(false)' */
        setIsFetching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* 1. SELEÇÃO DE TIPO DE DADO */}
      <section className="animate-in fade-in slide-in-from-top-4">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <LayoutGrid className="text-teal-600" size={20} />
                O que você deseja importar hoje?
            </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <button 
                onClick={() => handleEntitySelect('generic')}
                className={clsx(
                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all group min-h-[120px]",
                    importType === 'generic' ? "bg-teal-50 border-teal-500 shadow-sm" : "bg-white border-slate-100 hover:border-slate-200"
                )}
            >
                <div className={clsx("p-2 rounded-lg mb-2 transition-colors", importType === 'generic' ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200")}>
                    <LayoutGrid size={24} />
                </div>
                <span className={clsx("text-xs font-bold text-center leading-tight", importType === 'generic' ? "text-teal-800" : "text-slate-500")}>Tabela Genérica</span>
            </button>

            {ENTITIES.map(entity => (
                <div key={entity.id} className="relative">
                    <button 
                        onClick={() => handleEntitySelect(entity.id as EntityImportType)}
                        className={clsx(
                            "w-full h-full flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all group min-h-[120px]",
                            importType === entity.id ? `bg-white border-teal-500 shadow-sm ring-2 ring-teal-50 ring-offset-0` : "bg-white border-slate-100 hover:border-slate-200"
                        )}
                    >
                        <div className={clsx("p-2 rounded-lg mb-2 transition-colors", importType === entity.id ? "bg-teal-600 text-white" : `${entity.bg} ${entity.color} group-hover:opacity-80`)}>
                            <entity.icon size={24} />
                        </div>
                        <span className={clsx("text-xs font-bold text-center leading-tight", importType === entity.id ? "text-teal-800" : "text-slate-500")}>{entity.label}</span>
                    </button>
                    {importType === entity.id && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); downloadTemplate(entity.id); }}
                            className="absolute -top-2 -right-2 bg-orange-500 text-white p-2 rounded-full shadow-lg hover:bg-orange-600 transition-all hover:scale-110 animate-bounce active:scale-95"
                            title="Baixar Modelo (Excel)"
                        >
                            <Download size={16} />
                        </button>
                    )}
                </div>
            ))}
        </div>
        
        {importType !== 'generic' && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-left-2 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                        <FileText size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-orange-900">Modelo disponível para {ENTITIES.find(e => e.id === importType)?.label}</p>
                        <p className="text-xs text-orange-700">Baixe o modelo em Excel e preencha as colunas para atualizar a lista no banco de dados.</p>
                    </div>
                </div>
                <button 
                    onClick={() => downloadTemplate(importType)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
                >
                    <Download size={16}/> Baixar Modelo (Excel)
                </button>
            </div>
        )}
      </section>

      {/* Tabs */}
      <div className="flex justify-center mb-6 pt-4 border-t border-slate-100">
        <div className="bg-slate-100 p-1.5 rounded-xl inline-flex shadow-inner">
            <button
                onClick={() => { setActiveTab('upload'); setFetchError(null); }}
                className={clsx(
                    "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                    activeTab === 'upload' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}
            >
                <Upload size={16} /> Arquivos Locais
            </button>
            <button
                onClick={() => { setActiveTab('sheets'); setFetchError(null); }}
                className={clsx(
                    "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                    activeTab === 'sheets' ? "bg-white text-green-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}
            >
                <FileSpreadsheet size={16} /> Google Sheets
            </button>
            <button
                onClick={() => { setActiveTab('onedrive'); setFetchError(null); }}
                className={clsx(
                    "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                    activeTab === 'onedrive' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}
            >
                <Cloud size={16} /> OneDrive
            </button>
        </div>
      </div>

      {activeTab === 'upload' && (
        <>
            <div
                className={clsx(
                "relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ease-in-out cursor-pointer group",
                dragActive
                    ? "border-teal-500 bg-teal-50 scale-[1.01]"
                    : "border-slate-300 hover:border-teal-400 bg-white"
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
                    accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, .xls"
                    onChange={handleChange}
                />
                
                {isLoading ? (
                <div className="flex flex-col items-center animate-pulse">
                    <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4">
                        <FileType className="animate-bounce" size={32} />
                    </div>
                    <p className="text-lg font-bold text-slate-700">Processando arquivos...</p>
                </div>
                ) : (
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors">
                        <Upload size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-1 group-hover:text-teal-700 transition-colors">
                        Arraste seus arquivos aqui
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                        Suporta <span className="font-semibold">.CSV</span>, <span className="font-semibold">.XLSX</span> e <span className="font-semibold">.XLS</span>
                    </p>
                    <div className="bg-teal-50 text-teal-700 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border border-teal-100">
                         <Layers size={14} /> Upload em Lote Permitido
                    </div>
                </div>
                )}
            </div>
            
            <div className="mt-6 flex items-start gap-3 bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div>
                    <span className="font-bold block mb-1">Dica de Importação:</span>
                    Ao utilizar um modelo específico, o sistema atualizará (Upsert) automaticamente os registros no Supabase utilizando a chave primária da entidade (ex: E-mail para alunos, CNPJ para franquias).
                </div>
            </div>
        </>
      )}

      {activeTab === 'sheets' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
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
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition font-mono text-xs text-slate-600 bg-slate-50 focus:bg-white"
                    />
                </div>

                {fetchError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2 whitespace-pre-line">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{fetchError}</span>
                    </div>
                )}

                <button
                    onClick={processGoogleSheet}
                    disabled={!sheetUrl || isFetching || isLoading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-4"
                >
                    {isFetching || isLoading ? 'Baixando...' : 'Carregar Planilha'}
                </button>
             </div>
        </div>
      )}

      {activeTab === 'onedrive' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
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
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-xs text-slate-600 bg-slate-50 focus:bg-white"
                    />
                </div>

                {fetchError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2 whitespace-pre-line">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{fetchError}</span>
                    </div>
                )}

                <button
                    onClick={processOneDrive}
                    disabled={!oneDriveUrl || isFetching || isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-4"
                >
                    {isFetching || isLoading ? 'Verificando...' : 'Conectar e Sincronizar'}
                </button>
             </div>
        </div>
      )}
    </div>
  );
};

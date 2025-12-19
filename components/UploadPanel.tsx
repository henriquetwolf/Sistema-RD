
import React, { useRef, useState } from 'react';
import { 
    Upload, FileType, Link, AlertCircle, FileSpreadsheet, Cloud, 
    Layers, CheckCircle2, Download, Users, School, GraduationCap, 
    Store, Building2, LayoutGrid, Info, FileText
} from 'lucide-react';
import { parseExcelFile } from '../utils/excelParser';
import { EntityImportType } from '../types';
import clsx from 'clsx';

// Declare XLSX for TS since it's loaded via CDN
declare const XLSX: any;

interface UploadPanelProps {
  onFilesSelected: (files: File[]) => void;
  onUrlConfirmed?: (url: string) => void;
  onEntitySelected?: (type: EntityImportType) => void;
  isLoading: boolean;
}

const ENTITIES = [
    { 
        id: 'collaborators', 
        label: 'Colaboradores', 
        icon: Users, 
        color: 'text-blue-600', 
        bg: 'bg-blue-50', 
        template: 'full_name,social_name,birth_date,marital_status,spouse_name,father_name,mother_name,gender_identity,racial_identity,education_level,photo_url,email,phone,cellphone,corporate_phone,operator,address,cep,complement,birth_state,birth_city,state,current_city,emergency_name,emergency_phone,admission_date,previous_admission_date,role,role_id,password,headquarters,department,salary,hiring_mode,hiring_company,work_hours,break_time,work_days,presential_days,superior_id,experience_period,has_other_job,status,contract_type,cpf,rg,rg_issuer,rg_issue_date,rg_state,ctps_number,ctps_series,ctps_state,ctps_issue_date,pis_number,reservist_number,docs_folder_link,legal_auth,bank_account_info,has_insalubrity,insalubrity_percent,has_danger_pay,transport_voucher_info,bus_line_home_work,bus_qty_home_work,bus_line_work_home,bus_qty_work_home,ticket_value,fuel_voucher_value,has_meal_voucher,has_food_voucher,has_home_office_aid,has_health_plan,has_dental_plan,bonus_info,bonus_value,commission_info,commission_percent,has_dependents,dependent_name,dependent_dob,dependent_kinship,dependent_cpf,resignation_date,demission_reason,demission_docs,vacation_periods,observations' 
    },
    { 
        id: 'instructors', 
        label: 'Instrutores', 
        icon: School, 
        color: 'text-orange-600', 
        bg: 'bg-orange-50', 
        template: 'full_name,email,phone,password,rg,cpf,birth_date,marital_status,mother_name,photo_url,address,district,city,state,cep,emergency_contact_name,emergency_contact_phone,profession,council_number,is_council_active,cnpj,company_name,has_cnpj_active,academic_formation,other_formation,course_type,teacher_level,level_honorarium,is_active,bank,agency,account_number,account_digit,has_pj_account,pix_key_pj,pix_key_pf,region_availability,week_availability,shirt_size,has_notebook,has_vehicle,has_studio,studio_address,additional_1,value_additional_1,date_additional_1,additional_2,value_additional_2,date_additional_2,additional_3,value_additional_3,date_additional_3' 
    },
    { 
        id: 'students', 
        label: 'Alunos / Leads', 
        icon: GraduationCap, 
        color: 'text-purple-600', 
        bg: 'bg-purple-50', 
        template: 'title,contact_name,company_name,value,payment_method,stage,owner_id,status,next_task,source,campaign,entry_value,installments,installment_value,product_type,product_name,email,phone,cpf,first_due_date,receipt_link,transaction_code,zip_code,address,address_number,registration_data,observation,course_state,course_city,class_mod_1,class_mod_2,billing_cnpj,billing_company_name' 
    },
    { 
        id: 'franchises', 
        label: 'Franquias', 
        icon: Store, 
        color: 'text-teal-600', 
        bg: 'bg-teal-50', 
        template: 'sale_number,contract_start_date,inauguration_date,sales_consultant,franchisee_name,cpf,company_name,cnpj,phone,email,residential_address,commercial_state,commercial_city,commercial_address,commercial_neighborhood,latitude,longitude,km_street_point,km_commercial_building,studio_status,studio_size_m2,equipment_list,royalties_value,bank_account_info,has_signed_contract,contract_end_date,is_representative,partner_1_name,partner_2_name,franchisee_folder_link,path_info,observations' 
    },
    { 
        id: 'studios', 
        label: 'Studios Parceiros', 
        icon: Building2, 
        color: 'text-indigo-600', 
        bg: 'bg-indigo-50', 
        template: 'status,responsible_name,cpf,phone,email,password,second_contact_name,second_contact_phone,fantasy_name,legal_name,cnpj,studio_phone,address,city,state,country,size_m2,student_capacity,rent_value,methodology,studio_type,name_on_site,bank,agency,account,beneficiary,pix_key,has_reformer,qty_reformer,has_ladder_barrel,qty_ladder_barrel,has_chair,qty_chair,has_cadillac,qty_cadillac,has_chairs_for_course,has_tv,max_kits_capacity,attachments' 
    },
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
      f.name.endsWith('.xls') ||
      f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    } else {
      alert('Por favor, selecione apenas arquivos CSV ou Excel (.xlsx, .xls).');
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
      
      // Criar o workbook e a worksheet usando SheetJS (XLSX)
      const wsData = [headers];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");

      // Gerar o arquivo .xlsx
      XLSX.writeFile(wb, `modelo_importacao_${entityId}.xlsx`);
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
                            title="Baixar Modelo (Excel .xlsx)"
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
                        <p className="text-sm font-bold text-orange-900">Modelo completo disponível para {ENTITIES.find(e => e.id === importType)?.label}</p>
                        <p className="text-xs text-orange-700">Baixe o modelo em Excel (.xlsx) com todas as colunas da tabela para atualizar a lista no banco de dados.</p>
                    </div>
                </div>
                <button 
                    onClick={() => downloadTemplate(importType)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
                >
                    <Download size={16}/> Baixar Modelo (.xlsx)
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
                    accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
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
                    Ao utilizar um modelo específico, o sistema atualizará (Upsert) automaticamente os registros no Supabase utilizando a chave primária da entidade (ex: E-mail para alunos, CNPJ para franquias). Certifique-se de que os dados estão nas colunas corretas.
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

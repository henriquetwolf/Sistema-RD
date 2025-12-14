import React, { useState } from 'react';
import { Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, Copy, AlertTriangle } from 'lucide-react';
import { appBackend } from '../services/appBackend';

interface SettingsManagerProps {
  onLogoChange: (newLogo: string | null) => void;
  currentLogo: string | null;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ onLogoChange, currentLogo }) => {
  const [preview, setPreview] = useState<string | null>(currentLogo);
  const [isSaved, setIsSaved] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setIsSaved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (preview) {
      appBackend.saveAppLogo(preview);
      onLogoChange(preview);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleReset = () => {
      // Reset to Default VOLL logo
      const defaultLogo = "https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png";
      setPreview(defaultLogo);
      appBackend.saveAppLogo(defaultLogo);
      onLogoChange(defaultLogo);
  };

  const generateRepairSQL = () => `
-- ATUALIZAÇÃO E CORREÇÃO DE COLUNAS (TODOS OS MÓDULOS)

-- 1. TABELA COLABORADORES
CREATE TABLE IF NOT EXISTS public.crm_collaborators (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now());

ALTER TABLE public.crm_collaborators
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS social_name text,
ADD COLUMN IF NOT EXISTS birth_date text,
ADD COLUMN IF NOT EXISTS marital_status text,
ADD COLUMN IF NOT EXISTS spouse_name text,
ADD COLUMN IF NOT EXISTS father_name text,
ADD COLUMN IF NOT EXISTS mother_name text,
ADD COLUMN IF NOT EXISTS gender_identity text,
ADD COLUMN IF NOT EXISTS racial_identity text,
ADD COLUMN IF NOT EXISTS education_level text,
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS cellphone text,
ADD COLUMN IF NOT EXISTS corporate_phone text,
ADD COLUMN IF NOT EXISTS operator text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS complement text,
ADD COLUMN IF NOT EXISTS birth_state text,
ADD COLUMN IF NOT EXISTS birth_city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS current_city text,
ADD COLUMN IF NOT EXISTS emergency_name text,
ADD COLUMN IF NOT EXISTS emergency_phone text,
ADD COLUMN IF NOT EXISTS admission_date text,
ADD COLUMN IF NOT EXISTS previous_admission_date text,
ADD COLUMN IF NOT EXISTS role text,
ADD COLUMN IF NOT EXISTS headquarters text,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS salary text,
ADD COLUMN IF NOT EXISTS hiring_mode text,
ADD COLUMN IF NOT EXISTS hiring_company text,
ADD COLUMN IF NOT EXISTS work_hours text,
ADD COLUMN IF NOT EXISTS break_time text,
ADD COLUMN IF NOT EXISTS work_days text,
ADD COLUMN IF NOT EXISTS presential_days text,
ADD COLUMN IF NOT EXISTS superior_id text,
ADD COLUMN IF NOT EXISTS experience_period text,
ADD COLUMN IF NOT EXISTS has_other_job text,
ADD COLUMN IF NOT EXISTS status text,
ADD COLUMN IF NOT EXISTS contract_type text,
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS rg text,
ADD COLUMN IF NOT EXISTS rg_issuer text,
ADD COLUMN IF NOT EXISTS rg_issue_date text,
ADD COLUMN IF NOT EXISTS rg_state text,
ADD COLUMN IF NOT EXISTS ctps_number text,
ADD COLUMN IF NOT EXISTS ctps_series text,
ADD COLUMN IF NOT EXISTS ctps_state text,
ADD COLUMN IF NOT EXISTS ctps_issue_date text,
ADD COLUMN IF NOT EXISTS pis_number text,
ADD COLUMN IF NOT EXISTS reservist_number text,
ADD COLUMN IF NOT EXISTS docs_folder_link text,
ADD COLUMN IF NOT EXISTS legal_auth boolean,
ADD COLUMN IF NOT EXISTS bank_account_info text,
ADD COLUMN IF NOT EXISTS has_insalubrity text,
ADD COLUMN IF NOT EXISTS insalubrity_percent text,
ADD COLUMN IF NOT EXISTS has_danger_pay text,
ADD COLUMN IF NOT EXISTS transport_voucher_info text,
ADD COLUMN IF NOT EXISTS bus_line_home_work text,
ADD COLUMN IF NOT EXISTS bus_qty_home_work text,
ADD COLUMN IF NOT EXISTS bus_line_work_home text,
ADD COLUMN IF NOT EXISTS bus_qty_work_home text,
ADD COLUMN IF NOT EXISTS ticket_value text,
ADD COLUMN IF NOT EXISTS fuel_voucher_value text,
ADD COLUMN IF NOT EXISTS has_meal_voucher text,
ADD COLUMN IF NOT EXISTS has_food_voucher text,
ADD COLUMN IF NOT EXISTS has_home_office_aid text,
ADD COLUMN IF NOT EXISTS has_health_plan text,
ADD COLUMN IF NOT EXISTS has_dental_plan text,
ADD COLUMN IF NOT EXISTS bonus_info text,
ADD COLUMN IF NOT EXISTS bonus_value text,
ADD COLUMN IF NOT EXISTS commission_info text,
ADD COLUMN IF NOT EXISTS commission_percent text,
ADD COLUMN IF NOT EXISTS has_dependents text,
ADD COLUMN IF NOT EXISTS dependent_name text,
ADD COLUMN IF NOT EXISTS dependent_dob text,
ADD COLUMN IF NOT EXISTS dependent_kinship text,
ADD COLUMN IF NOT EXISTS dependent_cpf text,
ADD COLUMN IF NOT EXISTS resignation_date text,
ADD COLUMN IF NOT EXISTS demission_reason text,
ADD COLUMN IF NOT EXISTS demission_docs text,
ADD COLUMN IF NOT EXISTS vacation_periods text,
ADD COLUMN IF NOT EXISTS observations text;

-- 2. TABELA INSTRUTORES
CREATE TABLE IF NOT EXISTS public.crm_teachers (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now());

ALTER TABLE public.crm_teachers
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS rg text,
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS birth_date text,
ADD COLUMN IF NOT EXISTS marital_status text,
ADD COLUMN IF NOT EXISTS mother_name text,
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS district text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS profession text,
ADD COLUMN IF NOT EXISTS council_number text,
ADD COLUMN IF NOT EXISTS is_council_active boolean,
ADD COLUMN IF NOT EXISTS cnpj text,
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS has_cnpj_active boolean,
ADD COLUMN IF NOT EXISTS academic_formation text,
ADD COLUMN IF NOT EXISTS other_formation text,
ADD COLUMN IF NOT EXISTS course_type text,
ADD COLUMN IF NOT EXISTS teacher_level text,
ADD COLUMN IF NOT EXISTS is_active boolean,
ADD COLUMN IF NOT EXISTS bank text,
ADD COLUMN IF NOT EXISTS agency text,
ADD COLUMN IF NOT EXISTS account_number text,
ADD COLUMN IF NOT EXISTS account_digit text,
ADD COLUMN IF NOT EXISTS has_pj_account boolean,
ADD COLUMN IF NOT EXISTS pix_key_pj text,
ADD COLUMN IF NOT EXISTS pix_key_pf text,
ADD COLUMN IF NOT EXISTS region_availability text,
ADD COLUMN IF NOT EXISTS week_availability text,
ADD COLUMN IF NOT EXISTS shirt_size text,
ADD COLUMN IF NOT EXISTS has_notebook boolean,
ADD COLUMN IF NOT EXISTS has_vehicle boolean,
ADD COLUMN IF NOT EXISTS has_studio boolean,
ADD COLUMN IF NOT EXISTS studio_address text,
ADD COLUMN IF NOT EXISTS additional_1 text,
ADD COLUMN IF NOT EXISTS value_additional_1 text,
ADD COLUMN IF NOT EXISTS date_additional_1 text,
ADD COLUMN IF NOT EXISTS additional_2 text,
ADD COLUMN IF NOT EXISTS value_additional_2 text,
ADD COLUMN IF NOT EXISTS date_additional_2 text,
ADD COLUMN IF NOT EXISTS additional_3 text,
ADD COLUMN IF NOT EXISTS value_additional_3 text,
ADD COLUMN IF NOT EXISTS date_additional_3 text;

-- 3. TABELA PRODUTOS DIGITAIS (NOVO)
CREATE TABLE IF NOT EXISTS public.crm_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  name text,
  category text,
  platform text,
  price numeric,
  url text,
  status text,
  description text
);

-- 4. TABELA NEGOCIACOES (ATUALIZAÇÃO)
CREATE TABLE IF NOT EXISTS public.crm_deals (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now());

ALTER TABLE public.crm_deals
ADD COLUMN IF NOT EXISTS product_type text,
ADD COLUMN IF NOT EXISTS product_name text;

-- 5. LIMPEZA DE CACHE
NOTIFY pgrst, 'reload config';
  `;

  const copySql = () => {
      navigator.clipboard.writeText(generateRepairSQL());
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 3000);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>
        <p className="text-slate-500 text-sm">Personalize a aparência e administre o banco de dados.</p>
      </div>

      <div className="max-w-3xl space-y-8">
        
        {/* Identidade Visual */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-1">Identidade Visual</h3>
                <p className="text-sm text-slate-500">Altere a logomarca exibida no canto superior esquerdo.</p>
            </div>

            <div className="p-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-8">
                    {/* Preview Box */}
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Pré-visualização</span>
                        <div className="w-64 h-32 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center p-4 relative overflow-hidden">
                            {preview ? (
                                <img src={preview} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <ImageIcon className="text-slate-300" size={48} />
                            )}
                        </div>
                    </div>

                    {/* Upload Controls */}
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Upload Nova Logo</label>
                        <div className="flex items-center gap-4">
                            <label className="flex-1 cursor-pointer">
                                <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-3 text-slate-400" />
                                        <p className="text-sm text-slate-500"><span className="font-semibold">Clique para enviar</span></p>
                                        <p className="text-xs text-slate-500">PNG, JPG ou GIF (Max. 2MB)</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button 
                        onClick={handleReset}
                        className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-2"
                    >
                        <RotateCcw size={16} /> Restaurar Padrão
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={!preview || preview === currentLogo}
                        className={isSaved 
                            ? "bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2 pointer-events-none"
                            : "bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                        }
                    >
                        {isSaved ? <><CheckCircle size={18} /> Salvo!</> : <><Save size={18} /> Salvar Alterações</>}
                    </button>
                </div>
            </div>
        </div>

        {/* Database Diagnostic */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                        <Database size={20} className="text-indigo-600" /> Diagnóstico de Banco de Dados
                    </h3>
                    <p className="text-sm text-slate-500">Use esta ferramenta se estiver vendo erros de "Coluna Faltante" ao salvar dados.</p>
                </div>
            </div>
            
            <div className="p-6 bg-slate-50">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="text-sm font-bold text-amber-800">Correção de Tabelas</h4>
                        <p className="text-xs text-amber-700 mt-1">
                            Se você adicionou novos campos ou módulos no sistema, é necessário atualizar a estrutura do banco de dados. 
                            O script abaixo cria todas as colunas e tabelas necessárias automaticamente.
                        </p>
                    </div>
                </div>

                {!showSql ? (
                    <button 
                        onClick={() => setShowSql(true)}
                        className="w-full py-3 bg-white border border-slate-300 hover:border-indigo-500 hover:text-indigo-600 text-slate-600 font-medium rounded-lg transition-all shadow-sm"
                    >
                        Mostrar Script SQL de Correção
                    </button>
                ) : (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <div className="relative">
                            <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-[300px] border border-slate-800">
                                {generateRepairSQL()}
                            </pre>
                            <button 
                                onClick={copySql}
                                className={isSaved 
                                    ? "absolute top-2 right-2 bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1"
                                    : "absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 backdrop-blur-sm transition-colors"
                                }
                            >
                                {sqlCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
                                {sqlCopied ? 'Copiado!' : 'Copiar SQL'}
                            </button>
                        </div>
                        
                        <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
                            <p><strong>Instruções:</strong></p>
                            <ol className="list-decimal list-inside space-y-1 ml-1">
                                <li>Clique em <strong>Copiar SQL</strong> acima.</li>
                                <li>Vá para o painel do seu projeto no <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Supabase</a>.</li>
                                <li>No menu lateral, clique em <strong>SQL Editor</strong>.</li>
                                <li>Cole o código e clique em <strong>RUN</strong>.</li>
                            </ol>
                        </div>
                        
                        <button 
                            onClick={() => setShowSql(false)}
                            className="mt-4 text-xs text-slate-400 hover:text-slate-600 underline"
                        >
                            Ocultar script
                        </button>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

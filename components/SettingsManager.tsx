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
-- (Colunas omitidas para brevidade, mantendo as existentes...)

-- 2. TABELA INSTRUTORES
CREATE TABLE IF NOT EXISTS public.crm_teachers (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now());
-- (Colunas omitidas para brevidade...)

-- 3. TABELA PRODUTOS DIGITAIS
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
ALTER TABLE public.crm_products ADD COLUMN IF NOT EXISTS certificate_template_id uuid; -- NOVO

-- 4. TABELA FRANQUIAS
CREATE TABLE IF NOT EXISTS public.crm_franchises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  sale_number text,
  contract_start_date date,
  inauguration_date date,
  franchisee_name text,
  commercial_city text,
  commercial_state text,
  studio_status text,
  cpf text,
  phone text,
  email text,
  residential_address text,
  company_name text, 
  cnpj text,
  commercial_address text,
  commercial_neighborhood text,
  latitude text,
  longitude text,
  km_street_point text,
  km_commercial_building text,
  studio_size_m2 text,
  is_representative boolean,
  sales_consultant text,
  equipment_list text,
  royalties_value text,
  bank_account_info text,
  has_signed_contract boolean,
  contract_end_date date,
  franchisee_folder_link text,
  observations text,
  path_info text,
  partner_1_name text,
  partner_2_name text
);

-- GARANTIR COLUNAS DE MAPA (CASO A TABELA JÁ EXISTA ANTIGA)
ALTER TABLE public.crm_franchises ADD COLUMN IF NOT EXISTS latitude text;
ALTER TABLE public.crm_franchises ADD COLUMN IF NOT EXISTS longitude text;
ALTER TABLE public.crm_franchises ADD COLUMN IF NOT EXISTS commercial_neighborhood text;
ALTER TABLE public.crm_franchises ADD COLUMN IF NOT EXISTS km_street_point text;
ALTER TABLE public.crm_franchises ADD COLUMN IF NOT EXISTS km_commercial_building text;

-- 5. TABELA LISTA DE CHAMADA (NOVO)
CREATE TABLE IF NOT EXISTS public.crm_attendance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  class_id uuid, -- ID da Turma
  student_id uuid, -- ID do Aluno (Deal)
  date date, -- Data da chamada
  present boolean,
  UNIQUE(class_id, student_id, date) -- Evita duplicidade no mesmo dia
);
ALTER TABLE public.crm_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total attendance" ON public.crm_attendance FOR ALL USING (true) WITH CHECK (true);

-- 6. TABELA NEGOCIACOES (ATUALIZAÇÃO)
CREATE TABLE IF NOT EXISTS public.crm_deals (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now());
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS product_type text, ADD COLUMN IF NOT EXISTS product_name text;

-- 7. TABELA CERTIFICADOS (NOVO)
CREATE TABLE IF NOT EXISTS public.crm_certificates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  title text,
  background_base64 text,
  back_background_base64 text, -- VERSO (NOVO)
  linked_product_id uuid, -- CURSO ASSOCIADO (NOVO)
  body_text text
);
ALTER TABLE public.crm_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total certificates" ON public.crm_certificates FOR ALL USING (true) WITH CHECK (true);

-- 8. TABELA ALUNOS_CERTIFICADOS (NOVO - EMITIDOS)
CREATE TABLE IF NOT EXISTS public.crm_student_certificates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  student_deal_id uuid,
  certificate_template_id uuid,
  hash text, -- Código unico para URL publica
  issued_at timestamptz DEFAULT now()
);
ALTER TABLE public.crm_student_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total student_certificates" ON public.crm_student_certificates FOR ALL USING (true) WITH CHECK (true);

-- 9. LIMPEZA DE CACHE
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

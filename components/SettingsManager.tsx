import React, { useState } from 'react';
import { Cog, Check, AlertTriangle, Database, Image as ImageIcon } from 'lucide-react';
import { appBackend } from '../services/appBackend';

interface SettingsManagerProps {
    onLogoChange: (logo: string | null) => void;
    currentLogo: string;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ onLogoChange, currentLogo }) => {
  const [logoUrl, setLogoUrl] = useState(currentLogo);
  const [sqlStatus, setSqlStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [sqlError, setSqlError] = useState('');

  const handleSaveLogo = () => {
      localStorage.setItem('app_logo', logoUrl);
      onLogoChange(logoUrl);
      alert('Logo atualizado!');
  };

  const handleResetLogo = () => {
      localStorage.removeItem('app_logo');
      const defaultLogo = "https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png";
      setLogoUrl(defaultLogo);
      onLogoChange(defaultLogo);
  };

  const generateRepairSQL = () => `
-- SCRIPT DE CORREÇÃO E ATUALIZAÇÃO DO BANCO DE DADOS

-- 1. TABELA DE FUNÇÕES (ROLES)
CREATE TABLE IF NOT EXISTS public.crm_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  permissions jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.crm_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total roles" ON public.crm_roles;
CREATE POLICY "Acesso total roles" ON public.crm_roles FOR ALL USING (true) WITH CHECK (true);

-- 2. TABELA COLABORADORES
CREATE TABLE IF NOT EXISTS public.crm_collaborators (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now());

-- Adicionar colunas necessárias
ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.crm_roles(id);
ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- CORREÇÃO CRÍTICA: Transformar emails vazios em NULL para evitar erro de duplicidade
UPDATE public.crm_collaborators SET email = NULL WHERE trim(email) = '';

-- Aplicar Constraint Unique no Email (Login)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_collaborators_email_key') THEN
        ALTER TABLE public.crm_collaborators ADD CONSTRAINT crm_collaborators_email_key UNIQUE (email);
    END IF;
END $$;

ALTER TABLE public.crm_collaborators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total collaborators" ON public.crm_collaborators;
CREATE POLICY "Acesso total collaborators" ON public.crm_collaborators FOR ALL USING (true) WITH CHECK (true);

-- 3. TABELA INSTRUTORES
CREATE TABLE IF NOT EXISTS public.crm_teachers (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now());
ALTER TABLE public.crm_teachers ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.crm_teachers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.crm_teachers ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE public.crm_teachers ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE public.crm_teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total teachers" ON public.crm_teachers;
CREATE POLICY "Acesso total teachers" ON public.crm_teachers FOR ALL USING (true) WITH CHECK (true);

-- 4. TABELA DE BANNERS
CREATE TABLE IF NOT EXISTS public.app_banners (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    title text,
    image_url text,
    link_url text,
    target_audience text CHECK (target_audience IN ('student', 'instructor')),
    active boolean DEFAULT true
);
ALTER TABLE public.app_banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total banners" ON public.app_banners;
CREATE POLICY "Acesso total banners" ON public.app_banners FOR ALL USING (true) WITH CHECK (true);

-- 5. STUDIOS PARCEIROS
CREATE TABLE IF NOT EXISTS public.crm_partner_studios (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    status text,
    responsible_name text,
    cpf text,
    phone text,
    email text,
    second_contact_name text,
    second_contact_phone text,
    fantasy_name text,
    legal_name text,
    cnpj text,
    studio_phone text,
    address text,
    city text,
    state text,
    country text,
    size_m2 text,
    student_capacity text,
    rent_value text,
    methodology text,
    studio_type text,
    name_on_site text,
    bank text,
    agency text,
    account text,
    beneficiary text,
    pix_key text,
    has_reformer boolean DEFAULT false,
    qty_reformer integer DEFAULT 0,
    has_ladder_barrel boolean DEFAULT false,
    qty_ladder_barrel integer DEFAULT 0,
    has_chair boolean DEFAULT false,
    qty_chair integer DEFAULT 0,
    has_cadillac boolean DEFAULT false,
    qty_cadillac integer DEFAULT 0,
    has_chairs_for_course boolean DEFAULT false,
    has_tv boolean DEFAULT false,
    max_kits_capacity text,
    attachments text
);
ALTER TABLE public.crm_partner_studios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total parceiros" ON public.crm_partner_studios;
CREATE POLICY "Acesso total parceiros" ON public.crm_partner_studios FOR ALL USING (true) WITH CHECK (true);

-- 6. CONTROLE DE ESTOQUE
CREATE TABLE IF NOT EXISTS public.crm_stock_movements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    type text CHECK (type IN ('in', 'out')),
    date date,
    conference_date date,
    items jsonb DEFAULT '{}'::jsonb,
    partner_studio_id uuid,
    partner_studio_name text,
    tracking_code text,
    observations text,
    attachments text
);
ALTER TABLE public.crm_stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total estoque" ON public.crm_stock_movements;
CREATE POLICY "Acesso total estoque" ON public.crm_stock_movements FOR ALL USING (true) WITH CHECK (true);

-- 7. DADOS INICIAIS (SEED)
INSERT INTO public.crm_roles (name, permissions)
VALUES 
('Super Admin', '{"overview": true, "crm": true, "whatsapp": true, "analysis": true, "collaborators": true, "classes": true, "teachers": true, "franchises": true, "partner_studios": true, "stock": true, "forms": true, "contracts": true, "products": true, "events": true, "students": true, "certificates": true, "tables": true, "settings": true, "global_settings": true}'::jsonb),
('Comercial', '{"overview": true, "crm": true, "whatsapp": true, "analysis": true, "forms": true, "products": true, "events": true}'::jsonb),
('Secretaria', '{"overview": true, "classes": true, "students": true, "certificates": true, "contracts": true, "teachers": true, "partner_studios": true, "stock": true}'::jsonb)
ON CONFLICT DO NOTHING;

-- 8. OUTRAS TABELAS (Eventos, Alunos, etc)
CREATE TABLE IF NOT EXISTS public.crm_events (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text, dates text[], registration_open boolean, created_at timestamptz default now());
ALTER TABLE public.crm_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso eventos" ON public.crm_events;
CREATE POLICY "Acesso eventos" ON public.crm_events FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload config';
  `;

  const copySQL = () => {
      navigator.clipboard.writeText(generateRepairSQL());
      setSqlStatus('success');
      setTimeout(() => setSqlStatus('idle'), 3000);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Cog className="text-slate-600" /> Configurações Gerais
        </h2>

        {/* LOGO SETTINGS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <ImageIcon size={18} /> Personalização
            </h3>
            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-full md:w-1/2 space-y-4">
                    <label className="block text-sm font-semibold text-slate-600">URL do Logo</label>
                    <input 
                        type="text" 
                        value={logoUrl} 
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        placeholder="https://..."
                    />
                    <div className="flex gap-2">
                        <button onClick={handleSaveLogo} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors">
                            Salvar Logo
                        </button>
                        <button onClick={handleResetLogo} className="text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors">
                            Resetar Padrão
                        </button>
                    </div>
                </div>
                <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 border-dashed rounded-lg">
                    <p className="text-xs text-slate-400 mb-2 uppercase font-bold">Preview</p>
                    <img src={logoUrl} alt="Logo Preview" className="h-12 object-contain" />
                </div>
            </div>
        </div>

        {/* DATABASE DIAGNOSIS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Database size={18} /> Diagnóstico de Banco de Dados
            </h3>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 mb-4">
                <div className="flex items-start gap-2">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <p>
                        Se você está vendo erros como <strong>"relation does not exist"</strong> ou <strong>"column does not exist"</strong>, 
                        significa que a estrutura do banco de dados no Supabase está desatualizada.
                    </p>
                </div>
            </div>
            
            <p className="text-sm text-slate-600 mb-3">
                Copie o script SQL abaixo e execute no <strong>SQL Editor</strong> do painel do Supabase para corrigir todas as tabelas.
            </p>

            <div className="bg-slate-900 rounded-lg p-4 relative group">
                <pre className="text-xs text-slate-300 font-mono overflow-x-auto h-32 custom-scrollbar">
                    {generateRepairSQL()}
                </pre>
                <button 
                    onClick={copySQL}
                    className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 backdrop-blur-sm"
                >
                    {sqlStatus === 'success' ? <Check size={14} /> : <Database size={14} />}
                    {sqlStatus === 'success' ? 'Copiado!' : 'Copiar SQL'}
                </button>
            </div>
        </div>
    </div>
  );
};
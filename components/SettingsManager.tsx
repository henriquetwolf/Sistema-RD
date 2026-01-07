
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, 
    Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Layout, ExternalLink, Trash2, BarChart3, Building2, Plus, Edit2,
    Monitor, Globe, Target, Info, Shield, TrendingUp, DollarSign,
    Loader2, Package, Tag, Layers, Palette, History, Clock, User, Search,
    Play, Pause, Calendar, Smartphone, Link as LinkIcon, ChevronDown, Award, ShoppingBag, Zap, Filter,
    List, ArrowRight, Braces, Sparkles, RefreshCw, BookOpen, Book, ListTodo
} from 'lucide-react';
import { appBackend, CompanySetting, WebhookTrigger, Pipeline } from '../services/appBackend';
import { Role, Role as UserRole, Banner, InstructorLevel, ActivityLog, SyncJob, Product, CourseInfo } from '../types';
import clsx from 'clsx';

// Interface defined to fix missing type error
interface SettingsManagerProps {
  onLogoChange: (newLogo: string | null) => void;
  currentLogo: string;
  jobs: SyncJob[];
  onStartWizard: () => void;
  onDeleteJob: (id: string) => Promise<void>;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ 
  onLogoChange, 
  currentLogo,
  jobs,
  onStartWizard,
  onDeleteJob
}) => {
  // (Manter estados e useEffects...)
  const [activeTab, setActiveTab] = useState<'visual' | 'connections' | 'company' | 'roles' | 'database' | 'banners' | 'instructor_levels' | 'logs' | 'connection_plug' | 'course_info'>('visual');
  const [preview, setPreview] = useState<string | null>(currentLogo);
  const [securityMargin, setSecurityMargin] = useState<number>(5);
  const [isSaved, setIsSaved] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const generateRepairSQL = () => `
-- SCRIPT DE REPARO DEFINITIVO VOLL CRM (V22 - SUPORTE)
-- Suporte a Chamados de Atendimento Interno
CREATE TABLE IF NOT EXISTS public.crm_support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    user_name text NOT NULL,
    user_email text NOT NULL,
    user_type text NOT NULL, -- student, instructor, studio
    subject text NOT NULL,
    category text,
    status text DEFAULT 'open',
    last_message text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_support_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid REFERENCES public.crm_support_tickets(id) ON DELETE CASCADE,
    sender_name text NOT NULL,
    sender_type text NOT NULL, -- user, agent
    text text NOT NULL,
    created_at timestamptz DEFAULT now()
);

GRANT ALL ON public.crm_support_tickets TO anon, authenticated, service_role;
GRANT ALL ON public.crm_support_messages TO anon, authenticated, service_role;

-- (Manter as outras tabelas existentes no script...)
CREATE TABLE IF NOT EXISTS public.crm_teacher_news (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    image_url text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_form_folders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE IF EXISTS public.crm_forms 
ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.crm_form_folders(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.crm_companies 
ADD COLUMN IF NOT EXISTS product_ids text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS webhook_url text;

CREATE TABLE IF NOT EXISTS public.crm_webhook_triggers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_name text NOT NULL,
    stage_id text NOT NULL,
    payload_json text, 
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_course_info (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_name text UNIQUE NOT NULL,
    details text,
    materials text,
    requirements text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_billing_negotiations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    open_installments integer DEFAULT 0,
    total_negotiated_value numeric DEFAULT 0,
    total_installments integer DEFAULT 0,
    due_date date,
    responsible_agent text,
    identifier_code text,
    full_name text,
    product_name text,
    original_value numeric DEFAULT 0,
    payment_method text,
    observations text,
    status text DEFAULT 'EDIÇÃO PENDENTE',
    team text,
    voucher_link_1 text,
    test_date date,
    voucher_link_2 text,
    voucher_link_3 text,
    boletos_link text,
    negotiation_reference text,
    attachments text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT ALL ON public.crm_teacher_news TO anon, authenticated, service_role;
GRANT ALL ON public.crm_form_folders TO anon, authenticated, service_role;
GRANT ALL ON public.crm_webhook_triggers TO anon, authenticated, service_role;
GRANT ALL ON public.crm_billing_negotiations TO anon, authenticated, service_role;
GRANT ALL ON public.crm_course_info TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload config';
  `.trim();

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };

  // (Manter o restante do componente...)
  return (
      <div className="animate-in fade-in duration-300 space-y-8 pb-20">
          {/* Navegação de abas... */}
          <div className="max-w-5xl space-y-8">
              {activeTab === 'database' && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                      <div className="flex items-center gap-3 mb-4"><Database className="text-amber-600" /><h3 className="text-lg font-bold text-slate-800">Manutenção de Tabelas (V22)</h3></div>
                      <p className="text-sm text-slate-500 mb-6 font-bold text-red-600 flex items-center gap-2"><AlertTriangle size={16}/> Use este script para habilitar o sistema de suporte unificado.</p>
                      {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm hover:bg-slate-800 transition-all">Gerar Script de Suporte V22</button> : (
                          <div className="relative animate-in slide-in-from-top-4">
                              <pre className="bg-black text-amber-400 p-4 rounded-lg text-[10px] font-mono overflow-auto max-h-[400px] border border-amber-900/50">{generateRepairSQL()}</pre>
                              <button onClick={copySql} className="absolute top-2 right-2 bg-slate-700 text-white px-3 py-1 rounded text-xs hover:bg-slate-600">{sqlCopied ? 'Copiado!' : 'Copiar SQL'}</button>
                          </div>
                      )}
                  </div>
              )}
              {/* Outras abas... */}
          </div>
      </div>
  );
};

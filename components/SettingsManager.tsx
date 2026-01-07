
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

interface SettingsManagerProps {
  onLogoChange: (newLogo: string | null) => void;
  currentLogo: string | null;
  jobs: SyncJob[];
  onStartWizard: () => void;
  onDeleteJob: (id: string) => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ 
  onLogoChange, currentLogo, jobs, onStartWizard, onDeleteJob
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'connections' | 'database'>('visual');
  const [showSql, setShowSql] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const generateRepairSQL = () => `
-- SCRIPT DE REPARO DEFINITIVO VOLL CRM (V23 - SISTEMA DE SUPORTE)
-- 1. Tabela de Cabeçalho dos Tickets
CREATE TABLE IF NOT EXISTS public.crm_support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    category text NOT NULL DEFAULT 'Geral',
    priority text NOT NULL DEFAULT 'medium',
    status text NOT NULL DEFAULT 'open',
    sender_id text NOT NULL,
    sender_name text NOT NULL,
    sender_type text NOT NULL CHECK (sender_type IN ('student', 'instructor', 'studio', 'admin')),
    assigned_to uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Tabela de Mensagens do Chat de Suporte
CREATE TABLE IF NOT EXISTS public.crm_support_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid REFERENCES public.crm_support_tickets(id) ON DELETE CASCADE,
    sender_id text NOT NULL,
    sender_name text NOT NULL,
    sender_type text NOT NULL CHECK (sender_type IN ('admin', 'user')),
    content text NOT NULL,
    attachments text,
    created_at timestamptz DEFAULT now()
);

-- Permissões
GRANT ALL ON public.crm_support_tickets TO anon, authenticated, service_role;
GRANT ALL ON public.crm_support_messages TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload config';
  `.trim();

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };

  return (
    <div className="animate-in fade-in space-y-8 pb-20">
      <div className="mb-6 flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-slate-800">Configurações</h2></div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('visual')} className={clsx("px-4 py-2 text-xs font-bold rounded-md", activeTab === 'visual' ? "bg-white shadow" : "text-slate-500")}>Geral</button>
            <button onClick={() => setActiveTab('database')} className={clsx("px-4 py-2 text-xs font-bold rounded-md", activeTab === 'database' ? "bg-white shadow" : "text-slate-500")}>Banco de Dados</button>
        </div>
      </div>

      {activeTab === 'database' && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-6">
              <div className="flex items-center gap-3"><Database className="text-amber-600"/><h3 className="text-lg font-bold">Manutenção (V23)</h3></div>
              <p className="text-sm text-slate-500 font-bold text-red-600 flex items-center gap-2"><AlertTriangle size={16}/> Rode este script para habilitar o novo Sistema de Chamados e Chat de Suporte.</p>
              {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm">Gerar Script V23</button> : (
                  <div className="relative">
                      <pre className="bg-black text-amber-400 p-4 rounded-lg text-[10px] font-mono overflow-auto max-h-64">{generateRepairSQL()}</pre>
                      <button onClick={copySql} className="absolute top-2 right-2 bg-slate-700 text-white px-3 py-1 rounded text-xs">{sqlCopied ? 'Copiado!' : 'Copiar SQL'}</button>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

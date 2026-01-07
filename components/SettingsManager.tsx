
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

export const SettingsManager: React.FC<any> = (props) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'connections' | 'database'>('visual');
  const [showSql, setShowSql] = useState(false);

  const generateRepairSQL = () => `
-- SCRIPT DE REPARO VOLL CRM (TICKETS & SUPORTE)
CREATE TABLE IF NOT EXISTS public.crm_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    category text DEFAULT 'Geral',
    status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    sender_id text NOT NULL,
    sender_name text NOT NULL,
    sender_type text NOT NULL CHECK (sender_type IN ('student', 'instructor', 'studio')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_ticket_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid REFERENCES public.crm_tickets(id) ON DELETE CASCADE,
    content text NOT NULL,
    sender_name text NOT NULL,
    sender_type text NOT NULL CHECK (sender_type IN ('agent', 'user')),
    created_at timestamptz DEFAULT now()
);

GRANT ALL ON public.crm_tickets TO anon, authenticated, service_role;
GRANT ALL ON public.crm_ticket_messages TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload config';
  `.trim();

  return (
    <div className="animate-in fade-in space-y-8 pb-20">
      <h2 className="text-2xl font-bold">Configurações</h2>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
          <button onClick={() => setShowSql(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold">Gerar Script de Suporte (SQL)</button>
          {showSql && <pre className="mt-4 bg-black text-teal-400 p-4 rounded-lg text-xs overflow-auto">{generateRepairSQL()}</pre>}
      </div>
    </div>
  );
};

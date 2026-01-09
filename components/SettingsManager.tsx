
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, 
    Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Layout, ExternalLink, Trash2, BarChart3, Building2, Plus, Edit2,
    Monitor, Globe, Target, Info, Shield, TrendingUp, DollarSign,
    Loader2, Package, Tag, Layers, Palette, History, Clock, User, Search,
    Play, Pause, Calendar, Smartphone, Link as LinkIcon, ChevronDown, Award, ShoppingBag, Zap, Filter,
    List, ArrowRight, Braces, Sparkles, RefreshCw, BookOpen, Book, ListTodo, LifeBuoy, Hash, Tag as TagIcon,
    Code, Terminal
} from 'lucide-react';
import { appBackend, CompanySetting, WebhookTrigger, Pipeline } from '../services/appBackend';
import { Role, Role as UserRole, Banner, InstructorLevel, ActivityLog, SyncJob, Product, CourseInfo, SupportTag } from '../types';
import clsx from 'clsx';

interface SettingsManagerProps {
  onLogoChange: (newLogo: string | null) => void;
  currentLogo: string | null;
  jobs: SyncJob[];
  onStartWizard: () => void;
  onDeleteJob: (id: string) => void;
}

interface UnifiedProduct {
    id: string;
    name: string;
    type: 'Digital' | 'Presencial' | 'Evento';
}

const COURSES_MASTER = ['Formação Completa em Pilates', 'Formação em Pilates Clássico', 'MIT - Movimento Inteligente', 'Suspensus'];

export const SettingsManager: React.FC<SettingsManagerProps> = ({ 
  onLogoChange, 
  currentLogo,
  jobs,
  onStartWizard,
  onDeleteJob
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'connections' | 'company' | 'roles' | 'database' | 'banners' | 'instructor_levels' | 'logs' | 'connection_plug' | 'course_info' | 'support_tags' | 'webhook_whatsapp'>('visual');
  const [preview, setPreview] = useState<string | null>(currentLogo);
  const [securityMargin, setSecurityMargin] = useState<number>(5);
  const [isSaved, setIsSaved] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // States para CRUDs
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [isLoadingBanners, setIsLoadingBanners] = useState(false);

  const [companies, setCompanies] = useState<CompanySetting[]>([]);
  const [allProducts, setAllProducts] = useState<UnifiedProduct[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false); 
  const [editingCompany, setEditingCompany] = useState<Partial<CompanySetting> | null>(null);
  const [productSearch, setProductSearch] = useState('');

  const [instructorLevels, setInstructorLevels] = useState<InstructorLevel[]>([]);
  const [isLoadingLevels, setIsLoadingLevels] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Partial<InstructorLevel> | null>(null);

  const [courseInfos, setCourseInfos] = useState<CourseInfo[]>([]);
  const [editingCourseInfo, setEditingCourseInfo] = useState<Partial<CourseInfo> | null>(null);
  const [isLoadingCourseInfo, setIsLoadingCourseInfo] = useState(false);
  const [isSavingCourseInfo, setIsSavingCourseInfo] = useState(false);

  const [supportTags, setSupportTags] = useState<SupportTag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [editingTag, setEditingTag] = useState<Partial<SupportTag> | null>(null);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  // Connection Plug States
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [webhookTriggers, setWebhookTriggers] = useState<WebhookTrigger[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [customJson, setCustomJson] = useState('');
  const [editingTriggerId, setEditingTriggerId] = useState<string | null>(null);
  const [isSavingTrigger, setIsSavingTrigger] = useState(false);
  const [isLoadingTriggers, setIsLoadingTriggers] = useState(false);

  const PERMISSION_MODULES = [
      { id: 'overview', label: 'Visão Geral' },
      { id: 'hr', label: 'Recursos Humanos' },
      { id: 'crm', label: 'CRM Comercial' },
      { id: 'billing', label: 'Cobrança' },
      { id: 'inventory', label: 'Controle de Estoque' },
      { id: 'suporte_interno', label: 'Suporte Interno' },
      { id: 'whatsapp', label: 'Atendimento' },
      { id: 'analysis', label: 'Análise de Vendas' },
      { id: 'forms', label: 'Formulários' },
      { id: 'surveys', label: 'Pesquisas' },
      { id: 'contracts', label: 'Contratos' },
      { id: 'events', label: 'Eventos' },
      { id: 'students', label: 'Alunos' },
      { id: 'certificates', label: 'Certificados' },
      { id: 'products', label: 'Produtos Digitais' },
      { id: 'franchises', label: 'Franquias' },
      { id: 'partner_studios', label: 'Studios Parceiros' },
      { id: 'classes', label: 'Turmas' },
      { id: 'teachers', label: 'Professores' },
      { id: 'global_settings', label: 'Configurações' }
  ];

  useEffect(() => {
      fetchGlobalSettings();
      if (activeTab === 'roles') fetchRoles();
      else if (activeTab === 'banners') fetchBanners();
      else if (activeTab === 'company') { fetchCompanies(); fetchUnifiedProducts(); }
      else if (activeTab === 'instructor_levels') fetchInstructorLevels();
      else if (activeTab === 'logs') fetchLogs();
      else if (activeTab === 'connection_plug') { fetchPipelines(); fetchWebhookTriggers(); }
      else if (activeTab === 'course_info') fetchCourseInfos();
      else if (activeTab === 'support_tags') fetchSupportTags();
  }, [activeTab]);

  const fetchGlobalSettings = async () => {
    const margin = await appBackend.getInventorySecurityMargin();
    setSecurityMargin(margin);
    const logo = await appBackend.getAppLogo();
    setPreview(logo);
  };

  const fetchSupportTags = async () => {
      setIsLoadingTags(true);
      try {
          const data = await appBackend.getSupportTags();
          setSupportTags(data);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingTags(false);
      }
  };

  const handleSaveSupportTag = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingTag || !editingTag.name || !editingTag.role) return;
      try {
          await appBackend.saveSupportTag(editingTag);
          setEditingTag(null);
          fetchSupportTags();
      } catch (e: any) {
          alert(`Erro ao salvar tag: ${e.message}`);
      }
  };

  const fetchPipelines = async () => {
      try {
          const data = await appBackend.getPipelines();
          setPipelines(data);
      } catch (e) {}
  };

  const fetchWebhookTriggers = async () => {
      setIsLoadingTriggers(true);
      try {
          const data = await appBackend.getWebhookTriggers();
          setWebhookTriggers(data);
      } catch (e) {} finally { setIsLoadingTriggers(false); }
  };

  const fetchRoles = async () => {
      setIsLoadingRoles(true);
      try { const data = await appBackend.getRoles(); setRoles(data); } catch (e) { console.error(e); } finally { setIsLoadingRoles(false); }
  };

  const fetchBanners = async () => {
      setIsLoadingBanners(true);
      try { const data = await appBackend.getBanners(); setBanners(data); } catch (e) { console.error(e); } finally { setIsLoadingBanners(false); }
  };

  const fetchCompanies = async () => {
      setIsLoadingCompanies(true);
      try { const data = await appBackend.getCompanies(); setCompanies(data); } catch(e) { console.error(e); } finally { setIsLoadingCompanies(false); }
  };

  const fetchCourseInfos = async () => {
      setIsLoadingCourseInfo(true);
      try {
          const data = await appBackend.getCourseInfos();
          setCourseInfos(data);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingCourseInfo(false);
      }
  };

  const fetchUnifiedProducts = async () => {
      try {
          const [digitalRes, eventsRes, classesRes] = (await Promise.all([
              appBackend.client.from('crm_products').select('id, name').eq('status', 'active'),
              appBackend.client.from('crm_events').select('id, name'),
              appBackend.client.from('crm_classes').select('course')
          ])) as any[];

          const unified: UnifiedProduct[] = [];

          if (digitalRes.data) {
              (digitalRes.data as any[]).forEach(p => unified.push({ id: String(p.id), name: String(p.name), type: 'Digital' }));
          }
          if (eventsRes.data) {
              (eventsRes.data as any[]).forEach(e => unified.push({ id: String(e.id), name: String(e.name), type: 'Evento' }));
          }
          if (classesRes.data) {
              const uniqueCourses = Array.from(new Set((classesRes.data as any[]).map(c => c.course as string).filter(Boolean)));
              uniqueCourses.forEach((c: string) => unified.push({ id: `course-${c}`, name: c, type: 'Presencial' }));
          }

          setAllProducts(unified.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {}
  };

  const filteredProductsBySelectedTypes = useMemo(() => {
      if (!editingCompany) return [];
      const selectedTypes = editingCompany.productTypes || [];
      if (selectedTypes.length === 0) return [];

      return allProducts.filter(p => 
          selectedTypes.includes(p.type) && 
          p.name.toLowerCase().includes(productSearch.toLowerCase())
      );
  }, [allProducts, editingCompany, productSearch]);

  const fetchInstructorLevels = async () => {
    setIsLoadingLevels(true);
    try { const data = await appBackend.getInstructorLevels(); setInstructorLevels(data); } catch (e) { console.error(e); } finally { setIsLoadingLevels(false); }
  };

  const fetchLogs = async () => {
      setIsLoadingLogs(true);
      try {
          const data = await appBackend.getActivityLogs();
          setLogs(data);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingLogs(false);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => { setPreview(reader.result as string); setIsSaved(false); };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSaveGlobal = async () => {
    if (preview) {
      await appBackend.saveAppLogo(preview);
      onLogoChange(preview);
    }
    await appBackend.saveInventorySecurityMargin(securityMargin);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const generateRepairSQL = () => `
-- SCRIPT DE REPARO DEFINITIVO VOLL CRM (V29)
-- Inclusão de tabelas para Atendimento WhatsApp e suporte.

-- Tabelas WhatsApp
CREATE TABLE IF NOT EXISTS public.crm_whatsapp_chats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_id text UNIQUE NOT NULL,
    contact_name text,
    contact_phone text,
    last_message text,
    unread_count int DEFAULT 0,
    status text DEFAULT 'open',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_whatsapp_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id uuid REFERENCES public.crm_whatsapp_chats(id) ON DELETE CASCADE,
    text text,
    sender_type text, -- 'user', 'agent', 'system'
    wa_message_id text,
    status text DEFAULT 'received',
    created_at timestamptz DEFAULT now()
);

-- Suporte a Tags de Chamado
CREATE TABLE IF NOT EXISTS public.crm_support_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role text NOT NULL, -- 'student', 'instructor', 'studio', 'all'
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Suporte a Tickets
CREATE TABLE IF NOT EXISTS public.crm_support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id text NOT NULL,
    sender_name text NOT NULL,
    sender_email text NOT NULL,
    sender_role text NOT NULL,
    target_id text,
    target_name text,
    target_email text,
    target_role text,
    subject text NOT NULL,
    message text NOT NULL,
    tag text,
    status text DEFAULT 'open',
    response text,
    assigned_id text,
    assigned_name text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Mensagens de Suporte
CREATE TABLE IF NOT EXISTS public.crm_support_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid REFERENCES public.crm_support_tickets(id) ON DELETE CASCADE,
    sender_id text NOT NULL,
    sender_name text NOT NULL,
    sender_role text NOT NULL,
    content text NOT NULL,
    attachment_url text,
    attachment_name text,
    created_at timestamptz DEFAULT now()
);

-- Permissões
GRANT ALL ON public.crm_whatsapp_chats TO anon, authenticated, service_role;
GRANT ALL ON public.crm_whatsapp_messages TO anon, authenticated, service_role;
GRANT ALL ON public.crm_support_tickets TO anon, authenticated, service_role;
GRANT ALL ON public.crm_support_messages TO anon, authenticated, service_role;
GRANT ALL ON public.crm_support_tags TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload config';
  `.trim();

  const generateWebhookCode = () => {
    const supabaseUrl = (import.meta as any).env?.VITE_APP_SUPABASE_URL || 'https://sua-url.supabase.co';
    
    return `
/**
 * CÓDIGO PARA SUPABASE EDGE FUNCTION (index.ts)
 * Local: rapid-service
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Trata preflight CORS (Evolution API às vezes envia)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '${supabaseUrl}',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const payload = await req.json()
    console.log("Evento Evolution Recebido:", payload.event)

    // Processa apenas mensagens recebidas
    if (payload.event === 'messages.upsert') {
      const data = payload.data
      const remoteJid = data.key.remoteJid
      const fromMe = data.key.fromMe

      // Ignora mensagens enviadas pelo próprio sistema
      if (fromMe) return new Response("Ignored: fromMe", { status: 200, headers: corsHeaders })

      // Limpa o JID para obter o número (ID único)
      const waId = remoteJid.split('@')[0].replace(/\\D/g, '')
      const text = data.message?.conversation || 
                   data.message?.extendedTextMessage?.text || 
                   data.message?.imageMessage?.caption ||
                   "Mensagem de mídia"

      // A. Busca ou cria conversa
      let { data: chat } = await supabase
        .from('crm_whatsapp_chats')
        .select('id, unread_count')
        .eq('wa_id', waId)
        .maybeSingle()

      if (!chat) {
        const { data: newChat, error: errC } = await supabase
          .from('crm_whatsapp_chats')
          .insert([{ 
            wa_id: waId, 
            contact_name: waId, 
            contact_phone: waId, 
            last_message: text,
            unread_count: 1,
            status: 'open'
          }])
          .select()
          .single()
        if (errC) throw errC
        chat = newChat
      } else {
        await supabase
          .from('crm_whatsapp_chats')
          .update({ 
            last_message: text, 
            unread_count: (chat.unread_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', chat.id)
      }

      // B. Grava a mensagem na thread
      const { error: errM } = await supabase
        .from('crm_whatsapp_messages')
        .insert([{
          chat_id: chat.id,
          text: text,
          sender_type: 'user',
          status: 'received',
          wa_message_id: data.key.id
        }])
      if (errM) throw errM

      return new Response("OK", { status: 200, headers: corsHeaders })
    }

    return new Response("Event not handled", { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error("ERRO WEBHOOK:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
    `.trim();
  };

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };
  const copyWebhook = () => { navigator.clipboard.writeText(generateWebhookCode()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    await appBackend.saveRole(editingRole);
    fetchRoles();
    setEditingRole(null);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;
    await appBackend.saveBanner(editingBanner as Banner);
    fetchBanners();
    setEditingBanner(null);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    
    setIsSavingCompany(true);
    try {
        await appBackend.saveCompany(editingCompany as CompanySetting);
        await fetchCompanies();
        setEditingCompany(null);
        alert("Empresa salva com sucesso!");
    } catch (err: any) {
        console.error(err);
        alert(`Erro ao salvar empresa: ${err.message}`);
    } finally {
        setIsSavingCompany(false);
    }
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLevel) return;
    await appBackend.saveInstructorLevel(editingLevel as InstructorLevel);
    fetchInstructorLevels();
    setEditingLevel(null);
  };

  const handleSaveCourseInfo = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingCourseInfo || !editingCourseInfo.courseName) return;
      setIsSavingCourseInfo(true);
      try {
          await appBackend.saveCourseInfo(editingCourseInfo);
          await fetchCourseInfos();
          setEditingCourseInfo(null);
          alert("Informações do curso salvas!");
      } catch (err: any) {
          alert(`Erro ao salvar: ${err.message}`);
      } finally {
          setIsSavingCourseInfo(false);
      }
  };

  const handleSaveWebhookTrigger = async () => {
      if (!selectedFunnel || !selectedStage) return;
      setIsSavingTrigger(true);
      try {
          await appBackend.saveWebhookTrigger({
              id: editingTriggerId || undefined,
              pipelineName: selectedFunnel,
              stageId: selectedStage,
              payloadJson: customJson.trim() || undefined
          });
          setSelectedFunnel('');
          setSelectedStage('');
          setCustomJson('');
          setEditingTriggerId(null);
          await fetchWebhookTriggers();
      } catch (e: any) { alert(e.message); } finally { setIsSavingTrigger(false); }
  };

  const toggleCompanyProductType = (type: string) => {
      if (!editingCompany) return;
      const currentTypes = editingCompany.productTypes || [];
      const newTypes = currentTypes.includes(type) 
        ? currentTypes.filter(t => t !== type)
        : [...currentTypes, type];
      
      setEditingCompany({ ...editingCompany, productTypes: newTypes });
  };

  const toggleCompanyProductId = (id: string) => {
      if (!editingCompany) return;
      const currentIds = editingCompany.productIds || [];
      const newIds = currentIds.includes(id) 
        ? currentIds.filter(i => i !== id)
        : [...currentIds, id];
      setEditingCompany({ ...editingCompany, productIds: newIds });
  };

  const funnelStages = useMemo(() => {
      const funnel = pipelines.find(p => p.name === selectedFunnel);
      return funnel?.stages || [];
  }, [selectedFunnel, pipelines]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-8 pb-20">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>
            <p className="text-slate-500 text-sm">Personalize acessos, identidade e acompanhe atividades.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto shrink-0 max-w-full no-scrollbar">
            <button onClick={() => setActiveTab('visual')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'visual' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Geral</button>
            <button onClick={() => setActiveTab('course_info')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'course_info' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Info Cursos</button>
            <button onClick={() => setActiveTab('webhook_whatsapp')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'webhook_whatsapp' ? "bg-white text-green-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Webhook WhatsApp</button>
            <button onClick={() => setActiveTab('support_tags')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'support_tags' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Tags Suporte</button>
            <button onClick={() => setActiveTab('connections')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'connections' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Conexões</button>
            <button onClick={() => setActiveTab('company')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'company' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Empresas</button>
            <button onClick={() => setActiveTab('connection_plug')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'connection_plug' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Connection Plug</button>
            <button onClick={() => setActiveTab('roles')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'roles' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Acessos</button>
            <button onClick={() => setActiveTab('logs')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'logs' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Atividades</button>
            <button onClick={() => setActiveTab('banners')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'banners' ? "bg-white text-orange-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Banners</button>
            <button onClick={() => setActiveTab('instructor_levels')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'instructor_levels' ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Níveis</button>
            <button onClick={() => setActiveTab('database')} className={clsx("px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap", activeTab === 'database' ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Banco de Dados</button>
        </div>
      </div>
      
      <div className="max-w-5xl space-y-8">
        {activeTab === 'visual' && (
            <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4 mb-2"><Palette className="text-teal-600" size={20}/> Identidade do Sistema</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pré-visualização</span>
                            <div className="w-64 h-32 bg-slate-50 border rounded-lg flex items-center justify-center p-4">
                                {preview ? <img src={preview} alt="Logo" className="max-w-full max-h-full object-contain" /> : <ImageIcon className="text-slate-300" size={48} />}
                            </div>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Upload Nova Logo</label>
                            <label className="cursor-pointer">
                                <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <Upload className="w-8 h-8 mb-3 text-slate-400" /><p className="text-sm text-slate-500">Clique para enviar</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4 mb-2"><Package className="text-teal-600" size={20}/> Configuração de Logística</h3>
                    <div className="max-w-md">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Margem de Segurança do Estoque de Studio</label>
                        <div className="flex items-center gap-4">
                            <input type="number" className="w-24 px-4 py-2 border rounded-lg font-bold text-slate-800" value={securityMargin} onChange={(e) => setSecurityMargin(parseInt(e.target.value) || 0)} min="0" />
                            <p className="text-xs text-slate-400">Alerta ativado se o saldo do studio for menor que este valor.</p>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end pt-4"><button onClick={handleSaveGlobal} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2">{isSaved ? <><Check size={18}/> Salvo!</> : <><Save size={18}/> Salvar Configurações</>}</button></div>
            </div>
        )}

        {activeTab === 'webhook_whatsapp' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-10 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-3 border-b pb-4">
                    <div className="p-2 bg-green-100 text-green-700 rounded-xl"><Smartphone size={24}/></div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-tight">Configuração de Recebimento</h3>
                        <p className="text-xs text-slate-500">Siga estes passos para as mensagens aparecerem no Atendimento.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2"><CheckCircle className="text-green-500" size={18}/> Passo 1: Evolution API</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">No painel da Evolution, em <b>Events (Eventos)</b>, certifique-se de que o interruptor <b>Webhook por Eventos</b> está ligado e o evento abaixo está marcado:</p>
                        <div className="p-4 bg-slate-900 rounded-2xl border-l-4 border-teal-500">
                            <div className="flex items-center justify-between text-teal-400">
                                <span className="font-mono text-xs">MESSAGES_UPSERT</span>
                                <Check size={16} className="text-teal-500"/>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 italic font-medium">Nota: Sem este evento marcado, a Evolution não avisará o sistema quando chegar uma nova mensagem.</p>
                    </div>

                    <div className="space-y-6">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2"><Code className="text-indigo-500" size={18}/> Passo 2: Supabase Edge Function</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Copie o código abaixo e cole no arquivo <b>index.ts</b> da sua função <code>rapid-service</code> no Supabase. <b>Não esqueça de rodar o SQL de reparo (V29) na aba Banco de Dados primeiro!</b></p>
                        
                        <div className="relative group">
                            <div className="bg-slate-900 rounded-2xl p-4 max-h-48 overflow-y-auto custom-scrollbar border border-slate-800">
                                <pre className="text-[10px] text-green-400 font-mono leading-relaxed">
                                    {generateWebhookCode()}
                                </pre>
                            </div>
                            <button 
                                onClick={copyWebhook} 
                                className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold backdrop-blur-md transition-all flex items-center gap-2 border border-white/10"
                            >
                                {sqlCopied ? <><Check size={12}/> Copiado</> : <><Copy size={12}/> Copiar Código</>}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex gap-5 items-start">
                    <div className="bg-white p-3 rounded-2xl shadow-sm text-amber-600 shrink-0"><Info size={24}/></div>
                    <div className="space-y-2">
                        <p className="text-sm font-black text-amber-900 uppercase tracking-tight">O que este código faz?</p>
                        <p className="text-xs text-amber-800 leading-relaxed">Ele recebe o aviso da Evolution, identifica o número do aluno, cria a conversa se ela não existir e grava a mensagem na sua base de dados do Supabase. Assim que salvo, o contador de mensagens não lidas no <b>Atendimento</b> subirá automaticamente.</p>
                    </div>
                </div>
            </div>
        )}

        {/* ... (restante dos tabs originais mantidos) ... */}
        {activeTab === 'database' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex items-center gap-3 mb-4"><Database className="text-amber-600" /><h3 className="text-lg font-bold text-slate-800">Manutenção de Tabelas (V29)</h3></div>
                <p className="text-sm text-slate-500 mb-6 font-bold text-red-600 flex items-center gap-2"><AlertTriangle size={16}/> Use este script para sincronizar as tabelas com os novos recursos (WhatsApp, Atendimento e Suporte).</p>
                {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm hover:bg-slate-800 transition-all">Gerar Script de Correção V29</button> : (
                    <div className="relative animate-in slide-in-from-top-4">
                        <pre className="bg-black text-amber-400 p-4 rounded-lg text-[10px] font-mono overflow-auto max-h-[400px] border border-amber-900/50 leading-relaxed">{generateRepairSQL()}</pre>
                        <button onClick={copySql} className="absolute top-2 right-2 bg-slate-700 text-white px-3 py-1 rounded text-xs hover:bg-slate-600 transition-colors shadow-lg">{sqlCopied ? 'Copiado!' : 'Copiar SQL'}</button>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

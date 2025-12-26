
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, 
    Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Layout, ExternalLink, Trash2, BarChart3, Building2, Plus, Edit2,
    Monitor, Globe, Target, Info, Shield, TrendingUp, DollarSign,
    Loader2, Package, Tag, Layers, Palette, History, Clock, User, Search,
    Play, Pause, Calendar, Smartphone, Link as LinkIcon, ChevronDown, Award, ShoppingBag, Zap, Filter,
    List, ArrowRight, Braces, Sparkles, RefreshCw
} from 'lucide-react';
import { appBackend, CompanySetting, WebhookTrigger, Pipeline } from '../services/appBackend';
import { Role, Role as UserRole, Banner, InstructorLevel, ActivityLog, SyncJob, Product } from '../types';
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

export const SettingsManager: React.FC<SettingsManagerProps> = ({ 
  onLogoChange, 
  currentLogo,
  jobs,
  onStartWizard,
  onDeleteJob
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'connections' | 'company' | 'roles' | 'database' | 'banners' | 'instructor_levels' | 'logs' | 'connection_plug'>('visual');
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

  // Lista exata de módulos do menu lateral para permissões
  const PERMISSION_MODULES = [
      { id: 'overview', label: 'Visão Geral' },
      { id: 'hr', label: 'Recursos Humanos' },
      { id: 'crm', label: 'CRM Comercial' },
      { id: 'billing', label: 'Cobrança' },
      { id: 'inventory', label: 'Controle de Estoque' },
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
  }, [activeTab]);

  const fetchGlobalSettings = async () => {
    const margin = await appBackend.getInventorySecurityMargin();
    setSecurityMargin(margin);
    const logo = await appBackend.getAppLogo();
    setPreview(logo);
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

  // Filtragem dos produtos específicos baseada nos tipos selecionados para a empresa
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
-- SCRIPT DE REPARO DEFINITIVO VOLL CRM (V18.1)
-- ATUALIZAÇÃO DE TABELA DE EMPRESAS E TRIGGER DE WEBHOOKS

ALTER TABLE IF EXISTS public.crm_companies 
ADD COLUMN IF NOT EXISTS product_ids text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS webhook_url text;

-- ATUALIZAR TABELA DE GATILHOS DE WEBHOOK (CONNECTION PLUG)
CREATE TABLE IF NOT EXISTS public.crm_webhook_triggers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_name text NOT NULL,
    stage_id text NOT NULL,
    payload_json text, -- NOVO CAMPO PARA JSON CUSTOMIZADO
    created_at timestamptz DEFAULT now()
);

-- ADICIONAR COLUNA CASO JÁ EXISTA A TABELA
ALTER TABLE IF EXISTS public.crm_webhook_triggers 
ADD COLUMN IF NOT EXISTS payload_json text;

-- 1. CRIAR TABELA DE NEGOCIAÇÕES DE COBRANÇA
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

-- PERMISSÕES
GRANT ALL ON public.crm_webhook_triggers TO anon, authenticated, service_role;
GRANT ALL ON public.crm_billing_negotiations TO anon, authenticated, service_role;

-- RELOAD
NOTIFY pgrst, 'reload config';
  `.trim();

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };

  const handleLoadDefaultJson = () => {
      const defaultFormat = {
          "data_venda": "{{data_venda}}",  
          "situacao_venda": "Aprovada",                        
          "numero_venda": "{{deal_number}}",                              
          "numero_negociacao": "{{deal_number}}",                        
          "nome_cliente": "{{nome_cliente}}",
          "email_cliente": "{{email_cliente}}",                             
          "telefone_cliente": "{{telefone_cliente}}",                            
          "cpf_cnpj_cliente": "{{cpf_cnpj_cliente}}",              
          "nome_vendedor": "{{nome_vendedor}}",  
          "tipo_produto": "{{tipo_produto}}", 
          "curso_produto": "{{curso_produto}}", 
          "fonte_negociacao": "{{fonte_negociacao}}", 
          "campanha": "{{campanha}}",
          "funil_vendas": "{{funil_vendas}}", 
          "etapa_funil": "{{etapa_funil}}",
          "cidade_cliente": "{{cidade_cliente}}", 
          "turma_modulo": "{{turma_modulo}}", 
          "valor_total": "{{valor_total}}", 
          "itens_venda": "1", 
          "forma_pagamento": "{{forma_pagamento}}", 
          "valor_entrada": "{{valor_entrada}}",  
          "numero_parcelas": "{{numero_parcelas}}",
          "valor_parcelas": "{{valor_parcelas}}", 
          "dia_primeiro_vencimento": "{{dia_primeiro_vencimento}}",
          "link_comprovante": "{{link_comprovante}}", 
          "codigo_transacao": "{{codigo_transacao}}"
      };
      setCustomJson(JSON.stringify(defaultFormat, null, 2));
  };

  // Handlers para CRUDs
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

  const handleSaveWebhookTrigger = async () => {
      if (!selectedFunnel || !selectedStage) return;
      
      // Validação básica do JSON se preenchido
      if (customJson.trim()) {
          try {
              JSON.parse(customJson);
          } catch(e) {
              alert("O formato do JSON é inválido. Verifique vírgulas e aspas.");
              return;
          }
      }

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

  const handleEditTrigger = (trigger: WebhookTrigger) => {
      setEditingTriggerId(trigger.id);
      setSelectedFunnel(trigger.pipelineName);
      setSelectedStage(trigger.stageId);
      setCustomJson(trigger.payloadJson || '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditTrigger = () => {
      setEditingTriggerId(null);
      setSelectedFunnel('');
      setSelectedStage('');
      setCustomJson('');
  };

  const handleDeleteTrigger = async (id: string) => {
      if (!window.confirm("Excluir este gatilho?")) return;
      try {
          await appBackend.deleteWebhookTrigger(id);
          fetchWebhookTriggers();
      } catch (e: any) { alert(e.message); }
  };

  const toggleCompanyProductType = (type: string) => {
      if (!editingCompany) return;
      const currentTypes = editingCompany.productTypes || [];
      const newTypes = currentTypes.includes(type) 
        ? currentTypes.filter(t => t !== type)
        : [...currentTypes, type];
      
      let newProductIds = editingCompany.productIds || [];
      if (!newTypes.includes(type)) {
          const productsToRemove = allProducts.filter(p => p.type === type).map(p => p.name);
          newProductIds = newProductIds.filter(id => !productsToRemove.includes(id));
      }

      setEditingCompany({ ...editingCompany, productTypes: newTypes, productIds: newProductIds });
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

        {/* CONNECTION PLUG (WEBHOOK TRIGGERS) */}
        {activeTab === 'connection_plug' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-8 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Zap className="text-indigo-600" size={24} /> Connection Plug
                        </h3>
                        <p className="text-sm text-slate-500">Configure em qual etapa do CRM os Webhooks das empresas serão disparados.</p>
                    </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="w-full">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">1. Selecione o Funil</label>
                            <div className="relative">
                                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select 
                                    className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={selectedFunnel}
                                    onChange={e => { setSelectedFunnel(e.target.value); setSelectedStage(''); }}
                                >
                                    <option value="">Escolha o Funil...</option>
                                    {pipelines.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="w-full">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">2. Selecione a Etapa (Gatilho)</label>
                            <div className="relative">
                                <Zap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select 
                                    className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                                    value={selectedStage}
                                    onChange={e => setSelectedStage(e.target.value)}
                                    disabled={!selectedFunnel}
                                >
                                    <option value="">Escolha a Etapa...</option>
                                    {funnelStages.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="w-full">
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Braces size={14} className="text-indigo-600" /> 3. JSON de Disparo (Payload)
                            </label>
                            <button 
                                onClick={handleLoadDefaultJson}
                                className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 flex items-center gap-1 uppercase transition-all"
                            >
                                <Sparkles size={10}/> Carregar Padrão
                            </button>
                        </div>
                        <textarea 
                            className="w-full h-48 p-4 border rounded-xl bg-slate-900 text-teal-400 font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder='{"nome": "{{nome_cliente}}", "valor": "{{valor_total}}"}'
                            value={customJson}
                            onChange={e => setCustomJson(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-400 mt-2 italic">
                            Dica: Use <strong>{"{{nome_cliente}}"}</strong>, <strong>{"{{valor_total}}"}</strong>, <strong>{"{{deal_number}}"}</strong> etc, para preenchimento dinâmico.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3">
                        {editingTriggerId && (
                            <button 
                                onClick={cancelEditTrigger}
                                className="px-6 py-2.5 text-slate-600 font-bold text-sm"
                            >
                                Cancelar Edição
                            </button>
                        )}
                        <button 
                            onClick={handleSaveWebhookTrigger}
                            disabled={!selectedStage || isSavingTrigger}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"
                        >
                            {isSavingTrigger ? <Loader2 size={18} className="animate-spin" /> : (editingTriggerId ? <RefreshCw size={18} /> : <Plus size={18} />)}
                            {editingTriggerId ? 'Atualizar Gatilho' : 'Adicionar Gatilho Customizado'}
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <List size={14}/> Gatilhos de Disparo Ativos
                    </h4>
                    
                    {isLoadingTriggers ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600" /></div>
                    ) : webhookTriggers.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-2xl text-slate-300">
                            Nenhum gatilho configurado. Adicione o primeiro acima.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {webhookTriggers.map(trigger => {
                                const funnel = pipelines.find(p => p.name === trigger.pipelineName);
                                const stage = funnel?.stages.find(s => s.id === trigger.stageId);
                                
                                return (
                                    <div key={trigger.id} className={clsx(
                                        "bg-white border p-4 rounded-xl shadow-sm flex items-center justify-between group transition-all",
                                        editingTriggerId === trigger.id ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-200 hover:border-indigo-300"
                                    )}>
                                        <div className="flex items-center gap-4">
                                            <div className={clsx(
                                                "p-2 rounded-lg transition-colors",
                                                editingTriggerId === trigger.id ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
                                            )}>
                                                <Zap size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Ao chegar em:</p>
                                                <h4 className="font-bold text-slate-800 text-sm">
                                                    {trigger.pipelineName} <ArrowRight size={10} className="inline mx-1 text-slate-300" /> 
                                                    <span className="text-indigo-600">{stage?.title || trigger.stageId}</span>
                                                </h4>
                                                {trigger.payloadJson && (
                                                    <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100 mt-1 inline-block uppercase">JSON Customizado</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={() => handleEditTrigger(trigger)}
                                                className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Editar Gatilho"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteTrigger(trigger.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Excluir Gatilho"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="bg-indigo-50 p-4 rounded-xl flex gap-3 text-xs text-indigo-800 border border-indigo-100">
                    <Info size={18} className="shrink-0 text-indigo-600" />
                    <p><strong>Automação Inteligente:</strong> Ao configurar o JSON acima, o sistema substituirá os tokens entre chaves pelos dados reais da negociação antes de enviar para o Webhook da empresa.</p>
                </div>
            </div>
        )}

        {/* CRUD BANNERS */}
        {activeTab === 'banners' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Banners de Promoção</h3>
                    <button onClick={() => setEditingBanner({ title: '', imageUrl: '', linkUrl: '', targetAudience: 'student', active: true })} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold">+ Novo Banner</button>
                </div>
                {editingBanner && (
                    <form onSubmit={handleSaveBanner} className="bg-slate-50 p-6 rounded-xl border mb-8 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold mb-1">Título Interno</label>
                                <input type="text" className="w-full p-2 border rounded text-sm" value={editingBanner.title} onChange={e => setEditingBanner({...editingBanner, title: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">URL da Imagem</label>
                                <input type="text" className="w-full p-2 border rounded text-sm" value={editingBanner.imageUrl} onChange={e => setEditingBanner({...editingBanner, imageUrl: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">Link de Destino</label>
                                <input type="text" className="w-full p-2 border rounded text-sm" value={editingBanner.linkUrl} onChange={e => setEditingBanner({...editingBanner, linkUrl: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">Público</label>
                                <select className="w-full p-2 border rounded text-sm" value={editingBanner.targetAudience} onChange={e => setEditingBanner({...editingBanner, targetAudience: e.target.value as any})}>
                                    <option value="student">Área do Aluno</option>
                                    <option value="instructor">Área do Instrutor</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingBanner(null)} className="px-4 py-2 text-sm">Cancelar</button><button type="submit" className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold text-sm">Salvar Banner</button></div>
                    </form>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {banners.map(b => (
                        <div key={b.id} className="p-3 border rounded-xl flex items-center gap-4 bg-white group">
                            <div className="w-20 h-12 bg-slate-100 rounded overflow-hidden flex-shrink-0"><img src={b.imageUrl} className="w-full h-full object-cover" /></div>
                            <div className="flex-1 truncate"><h4 className="font-bold text-sm text-slate-800">{b.title}</h4><p className="text-[10px] text-slate-400 uppercase">{b.targetAudience}</p></div>
                            <div className="flex gap-1"><button onClick={() => setEditingBanner(b)} className="p-1.5 text-slate-400 hover:text-orange-600"><Edit2 size={16}/></button><button onClick={() => appBackend.deleteBanner(b.id).then(fetchBanners)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* CRUD NÍVEIS DE INSTRUTORES */}
        {activeTab === 'instructor_levels' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Níveis e Honorários Docentes</h3>
                    <button onClick={() => setEditingLevel({ name: '', honorarium: 0, observations: '' })} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold">+ Novo Nível</button>
                </div>
                {editingLevel && (
                    <form onSubmit={handleSaveLevel} className="bg-slate-50 p-6 rounded-xl border mb-8 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold mb-1">Nome do Nível</label>
                                <input type="text" className="w-full p-2 border rounded text-sm" value={editingLevel.name} onChange={e => setEditingLevel({...editingLevel, name: e.target.value})} placeholder="Ex: Master II" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">Honorário Padrão (R$)</label>
                                <input type="number" className="w-full p-2 border rounded text-sm" value={editingLevel.honorarium} onChange={e => setEditingLevel({...editingLevel, honorarium: parseFloat(e.target.value)})} required />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold mb-1">Observações / Regras</label>
                                <input type="text" className="w-full p-2 border rounded text-sm" value={editingLevel.observations} onChange={e => setEditingLevel({...editingLevel, observations: e.target.value})} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingLevel(null)} className="px-4 py-2 text-sm">Cancelar</button><button type="submit" className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold text-sm">Salvar Nível</button></div>
                    </form>
                )}
                <div className="space-y-2">
                    {instructorLevels.map(lvl => (
                        <div key={lvl.id} className="p-4 border rounded-xl flex justify-between items-center bg-white hover:border-purple-200 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><Award size={20}/></div>
                                <div><h4 className="font-bold text-slate-800">{lvl.name}</h4><p className="text-xs text-slate-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lvl.honorarium)}</p></div>
                            </div>
                            <div className="flex gap-2"><button onClick={() => setEditingLevel(lvl)} className="p-2 text-slate-400 hover:text-purple-600"><Edit2 size={18}/></button><button onClick={() => appBackend.deleteInstructorLevel(lvl.id).then(fetchInstructorLevels)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'connections' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Globe className="text-teal-600" size={20}/> Conexões Externas (Sync)</h3>
                    <button onClick={onStartWizard} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm"><Plus size={16}/> Nova Conexão</button>
                </div>
                <div className="space-y-4">
                    {jobs.length === 0 ? <p className="text-center py-10 text-slate-400 italic">Nenhuma conexão configurada.</p> : jobs.map(job => (
                        <div key={job.id} className="p-4 border rounded-xl hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h4 className="font-bold text-slate-800">{job.name}</h4>
                                <p className="text-xs text-slate-400 truncate max-w-md">{job.sheetUrl}</p>
                                <div className="mt-2 flex items-center gap-4">
                                    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded uppercase", job.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400")}>{job.active ? 'Sincronizando' : 'Pausado'}</span>
                                    <span className="text-[10px] text-slate-400">Freq: {job.intervalMinutes} min</span>
                                    <span className="text-[10px] text-slate-400">Tabela: {job.config.tableName}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => onDeleteJob(job.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'database' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex items-center gap-3 mb-4"><Database className="text-amber-600" /><h3 className="text-lg font-bold text-slate-800">Manutenção de Tabelas (V18.1)</h3></div>
                <p className="text-sm text-slate-500 mb-6 font-bold text-red-600 flex items-center gap-2"><AlertTriangle size={16}/> Use este script para sincronizar as tabelas com os novos recursos (JSON Customizado no Connection Plug).</p>
                {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm hover:bg-slate-800 transition-all">Gerar Script de Correção V18.1</button> : (
                    <div className="relative animate-in slide-in-from-top-4">
                        <pre className="bg-black text-amber-400 p-4 rounded-lg text-[10px] font-mono overflow-auto max-h-[400px] border border-amber-900/50 leading-relaxed">{generateRepairSQL()}</pre>
                        <button onClick={copySql} className="absolute top-2 right-2 bg-slate-700 text-white px-3 py-1 rounded text-xs hover:bg-slate-600 transition-colors shadow-lg">{sqlCopied ? 'Copiado!' : 'Copiar SQL'}</button>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'company' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold text-slate-800">Empresas do Grupo</h3><button onClick={() => setEditingCompany({ legalName: '', cnpj: '', webhookUrl: '', productTypes: [], productIds: [] })} className="bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">+ Nova Empresa</button></div>
                {editingCompany && (
                    <form onSubmit={handleSaveCompany} className="bg-slate-50 p-6 rounded-xl border mb-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold mb-1">Razão Social</label><input type="text" className="w-full p-2 border rounded text-sm font-bold" value={editingCompany.legalName} onChange={e => setEditingCompany({...editingCompany, legalName: e.target.value})} required /></div>
                            <div><label className="block text-xs font-bold mb-1">CNPJ</label><input type="text" className="w-full p-2 border rounded text-sm font-mono" value={editingCompany.cnpj} onChange={e => setEditingCompany({...editingCompany, cnpj: e.target.value})} required /></div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold mb-1 flex items-center gap-1">Webhook URL <LinkIcon size={12} className="text-teal-600"/></label>
                                <input type="text" className="w-full p-2 border rounded text-sm font-mono text-blue-600" value={editingCompany.webhookUrl || ''} onChange={e => setEditingCompany({...editingCompany, webhookUrl: e.target.value})} placeholder="https://endpoint-da-automacao.com/webhook" />
                                <p className="text-[10px] text-slate-400 mt-1">URL para onde o sistema enviará eventos de faturamento/venda desta empresa.</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* TIPOS DE PRODUTOS */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200">
                                <label className="block text-xs font-black text-teal-700 uppercase tracking-widest mb-3">Associar Tipos de Produtos</label>
                                <div className="flex flex-wrap gap-4">
                                    {['Digital', 'Presencial', 'Evento'].map(type => (
                                        <label key={type} className="flex items-center gap-2 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500" 
                                                checked={(editingCompany.productTypes || []).includes(type)} 
                                                onChange={() => toggleCompanyProductType(type)}
                                            />
                                            <span className="text-sm font-medium text-slate-700 group-hover:text-teal-600 transition-colors">{type}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 italic leading-tight">Selecione os tipos para habilitar a lista de produtos específicos à direita.</p>
                            </div>

                            {/* PRODUTOS ESPECÍFICOS (FILTRADOS) */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col max-h-[300px]">
                                <div className="flex items-center justify-between mb-3 shrink-0">
                                    <label className="block text-xs font-black text-indigo-700 uppercase tracking-widest">Produtos Específicos</label>
                                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{filteredProductsBySelectedTypes.length} disponíveis</span>
                                </div>
                                
                                { (editingCompany.productTypes || []).length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                        <ShoppingBag className="text-slate-200 mb-2" size={32}/>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Marque ao menos um tipo à esquerda</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative mb-3 shrink-0">
                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" size={12} />
                                            <input type="text" placeholder="Filtrar por nome..." className="w-full pl-7 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs" value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                                        </div>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 p-1">
                                            {filteredProductsBySelectedTypes.map(p => (
                                                <label key={p.id} className={clsx("flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group", (editingCompany.productIds || []).includes(p.name) ? "bg-indigo-50" : "hover:bg-slate-50")}>
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-3.5 h-3.5 rounded text-indigo-600" 
                                                        checked={(editingCompany.productIds || []).includes(p.name)} 
                                                        onChange={() => toggleCompanyProductId(p.name)} 
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-medium text-slate-700 group-hover:text-indigo-600">{p.name}</span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{p.type}</span>
                                                    </div>
                                                </label>
                                            ))}
                                            {filteredProductsBySelectedTypes.length === 0 && <p className="text-[10px] text-slate-400 italic py-4 text-center">
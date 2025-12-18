
import React, { useState, useEffect } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, 
    Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Layout, ExternalLink, Trash2, BarChart3, Building2, Plus, Edit2,
    Monitor, Globe, Target, Info, Shield, TrendingUp, DollarSign,
    Loader2
} from 'lucide-react';
import { appBackend, CompanySetting } from '../services/appBackend';
import { Role, Role as UserRole, Banner, InstructorLevel } from '../types';
import clsx from 'clsx';

interface SettingsManagerProps {
  onLogoChange: (newLogo: string | null) => void;
  currentLogo: string | null;
}

const MODULES = [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'crm', label: 'CRM Comercial' },
    { id: 'whatsapp', label: 'Atendimento (WhatsApp)' },
    { id: 'analysis', label: 'Análise de Vendas' },
    { id: 'collaborators', label: 'Colaboradores' },
    { id: 'classes', label: 'Turmas' },
    { id: 'teachers', label: 'Professores' },
    { id: 'franchises', label: 'Franquias' },
    { id: 'partner_studios', label: 'Studios Parceiros' },
    { id: 'forms', label: 'Formulários' },
    { id: 'contracts', label: 'Contratos' },
    { id: 'products', label: 'Produtos Digitais' },
    { id: 'events', label: 'Eventos' },
    { id: 'students', label: 'Alunos' },
    { id: 'certificates', label: 'Certificados' },
    { id: 'tables', label: 'Dados Brutos' },
    { id: 'settings', label: 'Conexões' },
    { id: 'global_settings', label: 'Configurações' },
];

const PRODUCT_TYPES = ['Presencial', 'Digital', 'Evento'];

export const SettingsManager: React.FC<SettingsManagerProps> = ({ onLogoChange, currentLogo }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'company' | 'roles' | 'database' | 'banners' | 'powerbi' | 'instructor_levels'>('visual');
  const [preview, setPreview] = useState<string | null>(currentLogo);
  const [isSaved, setIsSaved] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Role Management State
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  // Banner Management State
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [newBanner, setNewBanner] = useState<Partial<Banner>>({
      title: '',
      linkUrl: '',
      targetAudience: 'student',
      active: true,
      imageUrl: ''
  });
  const [isLoadingBanners, setIsLoadingBanners] = useState(false);

  // Company Settings State (Multi-Company)
  const [companies, setCompanies] = useState<CompanySetting[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Partial<CompanySetting> | null>(null);

  // Instructor Levels State
  const [instructorLevels, setInstructorLevels] = useState<InstructorLevel[]>([]);
  const [isLoadingLevels, setIsLoadingLevels] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Partial<InstructorLevel> | null>(null);

  // Power BI Helper State
  const [pbiConfig, setPbiConfig] = useState({ url: '', tableName: '', key: '' });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
      if (activeTab === 'roles') {
          fetchRoles();
      } else if (activeTab === 'banners') {
          fetchBanners();
      } else if (activeTab === 'company') {
          fetchCompanies();
      } else if (activeTab === 'instructor_levels') {
          fetchInstructorLevels();
      }
  }, [activeTab]);

  const fetchRoles = async () => {
      setIsLoadingRoles(true);
      try {
          const data = await appBackend.getRoles();
          setRoles(data);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingRoles(false);
      }
  };

  const fetchBanners = async () => {
      setIsLoadingBanners(true);
      try {
          const data = await appBackend.getBanners();
          setBanners(data);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingBanners(false);
      }
  };

  const fetchCompanies = async () => {
      setIsLoadingCompanies(true);
      try {
          const data = await appBackend.getCompanies();
          setCompanies(data);
      } catch(e) {
          console.error(e);
      } finally {
          setIsLoadingCompanies(false);
      }
  };

  const fetchInstructorLevels = async () => {
    setIsLoadingLevels(true);
    try {
        const data = await appBackend.getInstructorLevels();
        setInstructorLevels(data);
    } catch(e) {
        console.error(e);
    } finally {
        setIsLoadingLevels(false);
    }
  };

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

  const handleBannerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              setNewBanner(prev => ({ ...prev, imageUrl: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSaveLogo = () => {
    if (preview) {
      appBackend.saveAppLogo(preview);
      onLogoChange(preview);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleResetLogo = () => {
      const defaultLogo = "https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png";
      setPreview(defaultLogo);
      appBackend.saveAppLogo(defaultLogo);
      onLogoChange(defaultLogo);
  };

  const handleSaveRole = async () => {
      if (!editingRole || !editingRole.name) return;
      try {
          await appBackend.saveRole(editingRole);
          await fetchRoles();
          setEditingRole(null);
      } catch (e: any) {
          alert(`Erro ao salvar perfil: ${e.message}`);
      }
  };

  const handleDeleteRole = async (id: string) => {
      if (window.confirm("Excluir este tipo de usuário?")) {
          try {
              await appBackend.deleteRole(id);
              fetchRoles();
          } catch (e: any) {
              alert(`Erro: ${e.message}`);
          }
      }
  };

  const handleSaveBanner = async () => {
      if (!newBanner.title || !newBanner.imageUrl) {
          alert("Título e Imagem são obrigatórios.");
          return;
      }
      try {
          await appBackend.saveBanner(newBanner as Banner);
          await fetchBanners();
          setIsBannerModalOpen(false);
          setNewBanner({ title: '', linkUrl: '', targetAudience: 'student', active: true, imageUrl: '' });
      } catch (e: any) {
          alert(`Erro ao salvar banner: ${e.message}`);
      }
  };

  const handleDeleteBanner = async (id: string) => {
      if (window.confirm("Excluir este banner?")) {
          try {
              await appBackend.deleteBanner(id);
              fetchBanners();
          } catch (e: any) {
              alert(`Erro ao excluir: ${e.message}`);
          }
      }
  };

  const handleSaveCompany = async () => {
      if (!editingCompany?.legalName || !editingCompany?.cnpj) {
          alert("Razão Social e CNPJ são obrigatórios.");
          return;
      }
      try {
          await appBackend.saveCompany(editingCompany as CompanySetting);
          await fetchCompanies();
          setEditingCompany(null);
      } catch(e: any) {
          alert(`Erro ao salvar empresa: ${e.message}`);
      }
  };

  const handleDeleteCompany = async (id: string) => {
      if (window.confirm("Excluir esta empresa?")) {
          try {
              await appBackend.deleteCompany(id);
              await fetchCompanies();
          } catch (e: any) {
              alert(`Erro ao excluir: ${e.message}`);
          }
      }
  };

  const handleSaveInstructorLevel = async () => {
    if (!editingLevel?.name) {
        alert("O nome do nível é obrigatório.");
        return;
    }
    try {
        await appBackend.saveInstructorLevel(editingLevel as InstructorLevel);
        await fetchInstructorLevels();
        setEditingLevel(null);
    } catch(e: any) {
        alert(`Erro ao salvar nível: ${e.message}`);
    }
  };

  const handleDeleteInstructorLevel = async (id: string) => {
    if (window.confirm("Excluir este nível de instrutor?")) {
        try {
            await appBackend.deleteInstructorLevel(id);
            await fetchInstructorLevels();
        } catch (e: any) {
            alert(`Erro ao excluir: ${e.message}`);
        }
    }
  };

  const handleCnpjChange = (value: string) => {
      let val = value.replace(/\D/g, '');
      val = val.substring(0, 14);
      val = val.replace(/^(\d{2})(\d)/, '$1.$2');
      val = val.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      val = val.replace(/\.(\d{3})(\d)/, '.$1/$2');
      val = val.replace(/(\d{4})(\d)/, '$1-$2');
      setEditingCompany(prev => ({ ...prev, cnpj: val }));
  };

  const toggleProductType = (type: string) => {
      if (!editingCompany) return;
      const types = editingCompany.productTypes || [];
      if (types.includes(type)) {
          setEditingCompany({ ...editingCompany, productTypes: types.filter(t => t !== type) });
      } else {
          setEditingCompany({ ...editingCompany, productTypes: [...types, type] });
      }
  };

  const togglePermission = (moduleId: string) => {
      if (!editingRole) return;
      const currentPerms = editingRole.permissions || {};
      setEditingRole({
          ...editingRole,
          permissions: {
              ...currentPerms,
              [moduleId]: !currentPerms[moduleId]
          }
      });
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generateRepairSQL = () => `
-- SCRIPT DE CORREÇÃO E ATUALIZAÇÃO DO BANCO DE DADOS
CREATE TABLE IF NOT EXISTS public.crm_roles (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), name text NOT NULL, permissions jsonb DEFAULT '{}'::jsonb);
ALTER TABLE public.crm_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total roles" ON public.crm_roles;
CREATE POLICY "Acesso total roles" ON public.crm_roles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.crm_roles(id);
ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS password text;

CREATE TABLE IF NOT EXISTS public.app_banners (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), title text, image_url text, link_url text, target_audience text CHECK (target_audience IN ('student', 'instructor')), active boolean DEFAULT true);
ALTER TABLE public.app_banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total banners" ON public.app_banners;
CREATE POLICY "Acesso total banners" ON public.app_banners FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS billing_cnpj text;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS billing_company_name text;

CREATE TABLE IF NOT EXISTS public.crm_companies (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, legal_name text, cnpj text, product_types jsonb DEFAULT '[]'::jsonb, created_at timestamptz DEFAULT now());
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total companies" ON public.crm_companies;
CREATE POLICY "Acesso total companies" ON public.crm_companies FOR ALL USING (true) WITH CHECK (true);

-- TABELA DE CONFIGURAÇÃO DO WHATSAPP
CREATE TABLE IF NOT EXISTS public.app_whatsapp_config (id text PRIMARY KEY DEFAULT 'singleton', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), access_token text, phone_number_id text, waba_id text, webhook_verify_token text);
ALTER TABLE public.app_whatsapp_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total whatsapp_config" ON public.app_whatsapp_config;
CREATE POLICY "Acesso total whatsapp_config" ON public.app_whatsapp_config FOR ALL USING (true) WITH CHECK (true);

-- TABELAS DE MENSAGENS DO WHATSAPP
CREATE TABLE IF NOT EXISTS public.crm_whatsapp_chats (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), wa_id text UNIQUE, contact_name text, contact_phone text, last_message text, unread_count int DEFAULT 0, status text DEFAULT 'open', crm_stage text DEFAULT 'Novo Lead');
CREATE TABLE IF NOT EXISTS public.crm_whatsapp_messages (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), chat_id uuid REFERENCES public.crm_whatsapp_chats(id) ON DELETE CASCADE, sender_type text CHECK (sender_type IN ('user', 'agent', 'system')), text text, wa_message_id text, status text DEFAULT 'sent');
ALTER TABLE public.crm_whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total whatsapp_chats" ON public.crm_whatsapp_chats;
CREATE POLICY "Acesso total whatsapp_chats" ON public.crm_whatsapp_chats FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Acesso total whatsapp_messages" ON public.crm_whatsapp_messages;
CREATE POLICY "Acesso total whatsapp_messages" ON public.crm_whatsapp_messages FOR ALL USING (true) WITH CHECK (true);

-- TABELA DE NÍVEIS DE INSTRUTOR
CREATE TABLE IF NOT EXISTS public.crm_instructor_levels (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), name text NOT NULL, honorarium numeric DEFAULT 0, observations text);
ALTER TABLE public.crm_instructor_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total instructor_levels" ON public.crm_instructor_levels;
CREATE POLICY "Acesso total instructor_levels" ON public.crm_instructor_levels FOR ALL USING (true) WITH CHECK (true);

-- ATUALIZAÇÃO TABELA DE PROFESSORES PARA NOVO CAMPO
ALTER TABLE public.crm_teachers ADD COLUMN IF NOT EXISTS level_honorarium numeric DEFAULT 0;

-- TABELA DE EQUIPES COMERCIAIS
CREATE TABLE IF NOT EXISTS public.crm_teams (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), name text NOT NULL, members jsonb DEFAULT '[]'::jsonb);
ALTER TABLE public.crm_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total teams" ON public.crm_teams;
CREATE POLICY "Acesso total teams" ON public.crm_teams FOR ALL USING (true) WITH CHECK (true);

-- TABELA DE FORMULÁRIOS NO BANCO
CREATE TABLE IF NOT EXISTS public.crm_forms (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), title text NOT NULL, description text, is_lead_capture boolean DEFAULT true, questions jsonb DEFAULT '[]'::jsonb, style jsonb DEFAULT '{}'::jsonb, team_id uuid REFERENCES public.crm_teams(id), distribution_mode text DEFAULT 'fixed', fixed_owner_id uuid REFERENCES public.crm_collaborators(id), submissions_count int DEFAULT 0);
ALTER TABLE public.crm_forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total forms" ON public.crm_forms;
CREATE POLICY "Acesso total forms" ON public.crm_forms FOR ALL USING (true) WITH CHECK (true);

-- TABELA DE CONTADORES PARA ROUND ROBIN
CREATE TABLE IF NOT EXISTS public.crm_form_counters (form_id uuid REFERENCES public.crm_forms(id) PRIMARY KEY, last_index int DEFAULT -1, updated_at timestamptz DEFAULT now());
ALTER TABLE public.crm_form_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total counters" ON public.crm_form_counters;
CREATE POLICY "Acesso total counters" ON public.crm_form_counters FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload config';
  `;

  const copySql = () => {
    const sql = generateRepairSQL();
    navigator.clipboard.writeText(sql);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>
            <p className="text-slate-500 text-sm">Personalize a aparência, acessos e banco de dados.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
            <button onClick={() => setActiveTab('visual')} className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap", activeTab === 'visual' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}><ImageIcon size={16} /> Identidade</button>
            <button onClick={() => setActiveTab('company')} className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap", activeTab === 'company' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Building2 size={16} /> Empresas</button>
            <button onClick={() => setActiveTab('instructor_levels')} className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap", activeTab === 'instructor_levels' ? "bg-white text-orange-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><TrendingUp size={16} /> Níveis de Instrutor</button>
            <button onClick={() => setActiveTab('roles')} className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap", activeTab === 'roles' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><ShieldCheck size={16} /> Tipos de Usuário</button>
            <button onClick={() => setActiveTab('banners')} className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap", activeTab === 'banners' ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Layout size={16} /> Banners</button>
            <button onClick={() => setActiveTab('powerbi')} className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap", activeTab === 'powerbi' ? "bg-white text-yellow-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><BarChart3 size={16} /> Guia Power BI</button>
            <button onClick={() => setActiveTab('database')} className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap", activeTab === 'database' ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Database size={16} /> Banco de Dados</button>
        </div>
      </div>
      
      <div className="max-w-4xl space-y-8">
        {activeTab === 'visual' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-bold text-slate-800 mb-1">Identidade Visual</h3><p className="text-sm text-slate-500">Altere a logomarca exibida no canto superior esquerdo.</p></div>
                <div className="p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Pré-visualização</span>
                            <div className="w-64 h-32 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center p-4 relative overflow-hidden">
                                {preview ? <img src={preview} alt="Logo" className="max-w-full max-h-full object-contain" /> : <ImageIcon className="text-slate-300" size={48} />}
                            </div>
                        </div>
                        <div className="flex-1 w-full"><label className="block text-sm font-medium text-slate-700 mb-2">Upload Nova Logo</label><label className="cursor-pointer"><div className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"><Upload className="w-8 h-8 mb-3 text-slate-400" /><p className="text-sm text-slate-500"><span className="font-semibold">Clique para enviar</span></p></div><input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} /></label></div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button onClick={handleResetLogo} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-2"><RotateCcw size={16} /> Restaurar Padrão</button>
                        <button onClick={handleSaveLogo} disabled={!preview || preview === currentLogo} className={clsx("px-6 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-all", isSaved ? "bg-green-600 text-white" : "bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50")}>{isSaved ? <><CheckCircle size={18} /> Salvo!</> : <><Save size={18} /> Salvar Alterações</>}</button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'company' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                {editingCompany ? (
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 gap-6 max-w-2xl">
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Razão Social</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value={editingCompany.legalName || ''} onChange={(e) => setEditingCompany({...editingCompany, legalName: e.target.value})} /></div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">CNPJ</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value={editingCompany.cnpj || ''} onChange={(e) => handleCnpjChange(e.target.value)} maxLength={18} /></div>
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Tipos de Produtos Associados</label>
                                <div className="flex flex-wrap gap-3">
                                    {PRODUCT_TYPES.map(type => (
                                        <button key={type} onClick={() => toggleProductType(type)} className={clsx("px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1", editingCompany.productTypes?.includes(type) ? "bg-teal-100 text-teal-700 border-teal-200" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}>
                                            {editingCompany.productTypes?.includes(type) && <Check size={12} />} {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end pt-4 gap-2">
                                <button onClick={() => setEditingCompany(null)} className="px-4 py-2 text-slate-600">Cancelar</button>
                                <button onClick={handleSaveCompany} className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold">Salvar Empresa</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div><h3 className="text-lg font-bold text-slate-800">Empresas e CNPJs</h3><p className="text-sm text-slate-500">Gerencie múltiplas empresas para faturamento.</p></div>
                            <button onClick={() => setEditingCompany({ productTypes: [] })} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Plus size={16} /> Nova Empresa</button>
                        </div>
                        <div className="p-6 space-y-4">
                            {companies.map(c => (
                                <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                                    <div><h4 className="font-bold text-slate-800">{c.legalName}</h4><p className="text-sm text-slate-500 font-mono">{c.cnpj}</p></div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingCompany(c)} className="p-2 text-slate-400 hover:text-teal-600"><Edit2 size={18} /></button>
                                        <button onClick={() => handleDeleteCompany(c.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'instructor_levels' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                {editingLevel ? (
                    <div className="p-8 space-y-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">{editingLevel.id ? 'Editar Nível' : 'Novo Nível de Instrutor'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Nível</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                                    placeholder="Ex: Master, Sênior..."
                                    value={editingLevel.name || ''} 
                                    onChange={(e) => setEditingLevel({...editingLevel, name: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Honorário (Valor Sugerido)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                                    <input 
                                        type="number" 
                                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                                        placeholder="0,00"
                                        value={editingLevel.honorarium || ''} 
                                        onChange={(e) => setEditingLevel({...editingLevel, honorarium: parseFloat(e.target.value)})} 
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Observações</label>
                                <textarea 
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none h-24 resize-none" 
                                    placeholder="Regras de pagamento, requisitos para este nível..."
                                    value={editingLevel.observations || ''} 
                                    onChange={(e) => setEditingLevel({...editingLevel, observations: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 gap-3 border-t">
                            <button onClick={() => setEditingLevel(null)} className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors">Cancelar</button>
                            <button onClick={handleSaveInstructorLevel} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-2 rounded-lg font-bold shadow-md transition-all">Salvar Nível</button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Hierarquia de Instrutores</h3>
                                <p className="text-sm text-slate-500">Defina os níveis e valores de honorários padrões.</p>
                            </div>
                            <button onClick={() => setEditingLevel({ name: '', honorarium: 0, observations: '' })} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all"><Plus size={16} /> Novo Nível</button>
                        </div>
                        <div className="p-6">
                            {isLoadingLevels ? (
                                <div className="flex justify-center py-8"><Loader2 size={32} className="animate-spin text-orange-500" /></div>
                            ) : instructorLevels.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 italic">Nenhum nível cadastrado.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {instructorLevels.map(level => (
                                        <div key={level.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-orange-200 transition-all group flex flex-col">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-lg">{level.name}</h4>
                                                    <span className="text-orange-600 font-bold text-sm flex items-center gap-1">
                                                        <DollarSign size={14} /> {formatCurrency(level.honorarium)}
                                                    </span>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setEditingLevel(level)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteInstructorLevel(level.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                            {level.observations && (
                                                <p className="text-xs text-slate-500 line-clamp-2 mt-2 italic leading-relaxed">{level.observations}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'roles' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Tipos de Usuário</h3>
                    <button onClick={() => setEditingRole({ id: '', name: '', permissions: {} })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Plus size={16} /> Novo Perfil</button>
                </div>
                {editingRole ? (
                    <div className="p-8 space-y-6">
                        <div className="max-w-xl"><label className="block text-sm font-bold text-slate-700 mb-1">Nome do Cargo</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none" value={editingRole.name} onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })} /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {MODULES.map(m => (
                                <label key={m.id} className={clsx("flex items-center justify-between p-3 rounded-xl border cursor-pointer", editingRole.permissions?.[m.id] ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-100")}>
                                    <span className="text-sm font-medium">{m.label}</span>
                                    <input type="checkbox" checked={!!editingRole.permissions?.[m.id]} onChange={() => togglePermission(m.id)} />
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setEditingRole(null)} className="px-6 py-2 text-slate-600">Cancelar</button><button onClick={handleSaveRole} className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold">Salvar Acessos</button></div>
                    </div>
                ) : (
                    <div className="p-6 space-y-4">
                        {roles.map(r => (
                            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                                <div><h4 className="font-bold text-slate-800">{r.name}</h4><p className="text-xs text-slate-400">{Object.values(r.permissions || {}).filter(v => v).length} módulos</p></div>
                                <div className="flex gap-2"><button onClick={() => setEditingRole(r)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={18} /></button><button onClick={() => handleDeleteRole(r.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'banners' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="text-lg font-bold text-slate-800">Banners</h3><button onClick={() => setIsBannerModalOpen(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm"><Plus size={16} className="inline mr-1"/> Novo Banner</button></div>
                {isBannerModalOpen ? (
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">Título</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={newBanner.title} onChange={e => setNewBanner({...newBanner, title: e.target.value})} /></div>
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">Link (URL)</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={newBanner.linkUrl} onChange={e => setNewBanner({...newBanner, linkUrl: e.target.value})} /></div>
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">Público</label><select className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white" value={newBanner.targetAudience} onChange={e => setNewBanner({...newBanner, targetAudience: e.target.value as any})}><option value="student">Aluno</option><option value="instructor">Instrutor</option></select></div>
                            </div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-2">Imagem</label><label className="cursor-pointer block"><div className="border-2 border-dashed border-slate-300 rounded-xl aspect-video bg-slate-50 flex flex-col items-center justify-center overflow-hidden">{newBanner.imageUrl ? <img src={newBanner.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon size={32} className="text-slate-300" />}</div><input type="file" className="hidden" accept="image/*" onChange={handleBannerImageUpload} /></label></div>
                        </div>
                        <div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setIsBannerModalOpen(false)} className="px-6 py-2 text-slate-600">Cancelar</button><button onClick={handleSaveBanner} className="bg-purple-600 text-white px-8 py-2 rounded-lg font-bold">Ativar Banner</button></div>
                    </div>
                ) : (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {banners.map(b => (
                            <div key={b.id} className="bg-white border rounded-xl overflow-hidden group">
                                <div className="h-32 relative"><img src={b.imageUrl} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center"><button onClick={() => handleDeleteBanner(b.id)} className="bg-white text-red-600 p-2 rounded-full"><Trash2 size={18} /></button></div></div>
                                <div className="p-3"><h4 className="font-bold text-sm truncate">{b.title}</h4><span className="text-[10px] uppercase font-bold text-purple-600">{b.targetAudience}</span></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'powerbi' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3"><BarChart3 className="text-yellow-600" /><h3 className="text-lg font-bold text-slate-800">Conexão Power BI</h3></div>
                <div className="p-8 space-y-6">
                    <p className="text-sm text-slate-600">No Power BI, selecione a option de Obter Dados &gt; Web &gt; Avançado e use os valores abaixo:</p>
                    <div className="space-y-4">
                        <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono" placeholder="URL do Projeto Supabase" value={pbiConfig.url} onChange={e => setPbiConfig({...pbiConfig, url: e.target.value})} />
                        <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono" placeholder="Nome da Tabela" value={pbiConfig.tableName} onChange={e => setPbiConfig({...pbiConfig, tableName: e.target.value})} />
                        <div className="bg-slate-100 p-4 rounded-lg flex items-center justify-between">
                            <code className="text-xs text-slate-600 truncate">{pbiConfig.url ? `${pbiConfig.url}/rest/v1/${pbiConfig.tableName}?select=*` : 'URL Pendente...'}</code>
                            <button onClick={() => handleCopy(`${pbiConfig.url}/rest/v1/${pbiConfig.tableName}?select=*`, 'url')} className="text-indigo-600 ml-2"><Copy size={16}/></button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'database' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="text-lg font-bold text-slate-800">Diagnóstico</h3></div>
                <div className="p-6 bg-slate-50">
                    {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-3 bg-white border border-slate-300 rounded-lg">Mostrar SQL de Reparo</button> : (
                        <div className="relative">
                            <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono overflow-auto max-h-[300px]">{generateRepairSQL()}</pre>
                            <button 
                                onClick={copySql} 
                                className="absolute top-2 right-2 bg-slate-700 text-white px-3 py-1 rounded text-xs hover:bg-slate-600 transition-colors"
                            >
                                {sqlCopied ? 'Copiado!' : 'Copiar SQL'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

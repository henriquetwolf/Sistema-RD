
import React, { useState, useEffect } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, 
    Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Layout, ExternalLink, Trash2, BarChart3, Building2, Plus, Edit2,
    Monitor, Globe, Target, Info, Shield
} from 'lucide-react';
import { appBackend, CompanySetting } from '../services/appBackend';
import { Role, Banner } from '../types';
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
  const [activeTab, setActiveTab] = useState<'visual' | 'company' | 'roles' | 'database' | 'banners' | 'powerbi'>('visual');
  const [preview, setPreview] = useState<string | null>(currentLogo);
  const [isSaved, setIsSaved] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Role Management State
  const [roles, setRoles] = useState<Role[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
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

  // Company Logic
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
          } catch(e: any) {
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
ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.crm_roles(id);
ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
UPDATE public.crm_collaborators SET email = NULL WHERE trim(email) = '';
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

-- 6. ATUALIZAÇÃO CRM DEALS (Faturamento Automático)
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS deal_number bigint;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS billing_cnpj text;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS billing_company_name text;

-- 7. TABELA DE EMPRESAS (MULTI-CNPJ)
CREATE TABLE IF NOT EXISTS public.crm_companies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    legal_name text,
    cnpj text,
    product_types jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total companies" ON public.crm_companies;
CREATE POLICY "Acesso total companies" ON public.crm_companies FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload config';
  `;

  const copySql = () => {
      navigator.clipboard.writeText(generateRepairSQL());
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 3000);
  };

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
            <button onClick={() => setActiveTab('roles')} className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap", activeTab === 'roles' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><ShieldCheck size={16} /> Tipos de Usuário</button>
            <button onClick={() => setActiveTab('banners')} className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap", activeTab === 'banners' ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Layout size={16} /> Banners</button>
            <button onClick={() => setActiveTab('powerbi')} className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap", activeTab === 'powerbi' ? "bg-white text-yellow-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><BarChart3 size={16} /> Guia Power BI</button>
            <button onClick={() => setActiveTab('database')} className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap", activeTab === 'database' ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Database size={16} /> Banco de Dados</button>
        </div>
      </div>

      <div className="max-w-4xl space-y-8">
        
        {/* ABA: IDENTIDADE VISUAL */}
        {activeTab === 'visual' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Identidade Visual</h3>
                    <p className="text-sm text-slate-500">Altere a logomarca exibida no canto superior esquerdo.</p>
                </div>
                <div className="p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Pré-visualização</span>
                            <div className="w-64 h-32 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center p-4 relative overflow-hidden">
                                {preview ? <img src={preview} alt="Logo Preview" className="max-w-full max-h-full object-contain" /> : <ImageIcon className="text-slate-300" size={48} />}
                            </div>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Upload Nova Logo</label>
                            <label className="cursor-pointer">
                                <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <Upload className="w-8 h-8 mb-3 text-slate-400" />
                                    <p className="text-sm text-slate-500"><span className="font-semibold">Clique para enviar</span></p>
                                    <p className="text-xs text-slate-500">Max. 2MB</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button onClick={handleResetLogo} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-2"><RotateCcw size={16} /> Restaurar Padrão</button>
                        <button onClick={handleSaveLogo} disabled={!preview || preview === currentLogo} className={clsx("px-6 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-all", isSaved ? "bg-green-600 text-white" : "bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50")}>{isSaved ? <><CheckCircle size={18} /> Salvo!</> : <><Save size={18} /> Salvar Alterações</>}</button>
                    </div>
                </div>
            </div>
        )}

        {/* ABA: EMPRESAS */}
        {activeTab === 'company' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                {editingCompany ? (
                    <div className="animate-in fade-in">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div><h3 className="text-lg font-bold text-slate-800">{editingCompany.id ? 'Editar Empresa' : 'Nova Empresa'}</h3><p className="text-sm text-slate-500">Cadastro de CNPJ e associação de produtos.</p></div>
                            <button onClick={() => setEditingCompany(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 gap-6 max-w-2xl">
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">Razão Social</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Ex: Minha Empresa LTDA" value={editingCompany.legalName || ''} onChange={(e) => setEditingCompany({...editingCompany, legalName: e.target.value})} /></div>
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">CNPJ</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" placeholder="00.000.000/0000-00" value={editingCompany.cnpj || ''} onChange={(e) => handleCnpjChange(e.target.value)} maxLength={18} /></div>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Tipos de Produtos Associados</label>
                                    <div className="flex flex-wrap gap-3">
                                        {PRODUCT_TYPES.map(type => {
                                            const isSelected = editingCompany.productTypes?.includes(type);
                                            return (<button key={type} onClick={() => toggleProductType(type)} className={clsx("px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1", isSelected ? "bg-teal-100 text-teal-700 border-teal-200" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}>{isSelected && <Check size={12} />}{type}</button>);
                                        })}
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4 gap-2">
                                    <button onClick={() => setEditingCompany(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                                    <button onClick={handleSaveCompany} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"><Save size={18} /> Salvar Empresa</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div><h3 className="text-lg font-bold text-slate-800 mb-1">Empresas e CNPJs</h3><p className="text-sm text-slate-500">Gerencie múltiplas empresas para faturamento.</p></div>
                            <button onClick={() => setEditingCompany({ productTypes: [] })} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all"><Plus size={16} /> Nova Empresa</button>
                        </div>
                        <div className="p-6">
                            {isLoadingCompanies ? <div className="text-center py-10 text-slate-400">Carregando...</div> : companies.length === 0 ? <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg"><Building2 size={32} className="mx-auto mb-2 opacity-50" /><p>Nenhuma empresa cadastrada.</p></div> : (
                                <div className="grid grid-cols-1 gap-4">
                                    {companies.map(company => (
                                        <div key={company.id} className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm transition-shadow">
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-lg">{company.legalName}</h4>
                                                <p className="text-sm text-slate-500 font-mono mb-2">{company.cnpj}</p>
                                                <div className="flex flex-wrap gap-2">{company.productTypes.map(pt => (<span key={pt} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 uppercase font-bold">{pt}</span>))}</div>
                                            </div>
                                            <div className="flex items-center gap-2 self-start sm:self-center">
                                                <button onClick={() => setEditingCompany(company)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Edit2 size={18} /></button>
                                                <button onClick={() => handleDeleteCompany(company.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* ABA: TIPOS DE USUÁRIO (PERMISSÕES) */}
        {activeTab === 'roles' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div><h3 className="text-lg font-bold text-slate-800">Tipos de Usuário</h3><p className="text-sm text-slate-500">Controle o que cada cargo pode acessar no sistema.</p></div>
                    {!editingRole && (
                        <button onClick={() => setEditingRole({ id: '', name: '', permissions: {} })} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"><Plus size={16} /> Novo Perfil</button>
                    )}
                </div>

                {editingRole ? (
                    <div className="p-8 space-y-6">
                        <div className="max-w-xl">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Cargo / Tipo</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                                placeholder="Ex: Vendedor, Coordenador, Financeiro..." 
                                value={editingRole.name}
                                onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><Shield size={18} /> Módulos Habilitados</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {MODULES.map(module => (
                                    <label key={module.id} className={clsx("flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all", editingRole.permissions?.[module.id] ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50")}>
                                        <span className="text-sm font-medium">{module.label}</span>
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 rounded text-indigo-600" 
                                            checked={!!editingRole.permissions?.[module.id]}
                                            onChange={() => togglePermission(module.id)}
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                            <button onClick={() => setEditingRole(null)} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                            <button onClick={handleSaveRole} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"><Save size={18} /> Salvar Acessos</button>
                        </div>
                    </div>
                ) : (
                    <div className="p-6">
                        {isLoadingRoles ? <div className="text-center py-10">Carregando...</div> : roles.length === 0 ? <p className="text-center py-10 text-slate-400 italic">Nenhum perfil cadastrado.</p> : (
                            <div className="space-y-4">
                                {roles.map(role => (
                                    <div key={role.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{role.name}</h4>
                                            <p className="text-xs text-slate-400 mt-1">{Object.values(role.permissions || {}).filter(v => v).length} módulos liberados</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingRole(role)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={18} /></button>
                                            <button onClick={() => handleDeleteRole(role.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* ABA: BANNERS */}
        {activeTab === 'banners' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div><h3 className="text-lg font-bold text-slate-800">Gerenciador de Banners</h3><p className="text-sm text-slate-500">Exiba avisos e promoções nas áreas do aluno e instrutor.</p></div>
                    {!isBannerModalOpen && (
                        <button onClick={() => setIsBannerModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Plus size={16} /> Novo Banner</button>
                    )}
                </div>

                {isBannerModalOpen ? (
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">Título do Banner</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none" value={newBanner.title} onChange={e => setNewBanner({...newBanner, title: e.target.value})} /></div>
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">Link de Destino (URL)</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none" placeholder="https://..." value={newBanner.linkUrl} onChange={e => setNewBanner({...newBanner, linkUrl: e.target.value})} /></div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Público Alvo</label>
                                    <select className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white" value={newBanner.targetAudience} onChange={e => setNewBanner({...newBanner, targetAudience: e.target.value as any})}>
                                        <option value="student">Área do Aluno</option>
                                        <option value="instructor">Área do Instrutor</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Imagem do Banner</label>
                                <label className="cursor-pointer block">
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl aspect-video bg-slate-50 flex flex-col items-center justify-center overflow-hidden hover:bg-slate-100 transition-colors">
                                        {newBanner.imageUrl ? <img src={newBanner.imageUrl} className="w-full h-full object-cover" /> : <><ImageIcon size={32} className="text-slate-300 mb-2" /><span className="text-xs text-slate-500">Clique para selecionar imagem</span></>}
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleBannerImageUpload} />
                                </label>
                                <p className="text-[10px] text-slate-400 mt-2">Recomendado: 1200x400px (Paisagem)</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                            <button onClick={() => setIsBannerModalOpen(false)} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                            <button onClick={handleSaveBanner} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2 rounded-lg font-bold shadow-sm transition-all"><Save size={18} className="inline mr-2" /> Ativar Banner</button>
                        </div>
                    </div>
                ) : (
                    <div className="p-6">
                        {isLoadingBanners ? <div className="text-center py-10">Carregando...</div> : banners.length === 0 ? <p className="text-center py-10 text-slate-400 italic">Nenhum banner ativo.</p> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {banners.map(banner => (
                                    <div key={banner.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                                        <div className="h-32 bg-slate-100 relative">
                                            <img src={banner.imageUrl} className="w-full h-full object-cover opacity-80" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button onClick={() => handleDeleteBanner(banner.id)} className="bg-white text-red-600 p-2 rounded-full hover:bg-red-50"><Trash2 size={18} /></button>
                                            </div>
                                            <div className="absolute top-2 right-2">
                                                <span className={clsx("px-2 py-0.5 rounded text-[9px] font-bold uppercase", banner.targetAudience === 'student' ? "bg-purple-600 text-white" : "bg-orange-500 text-white")}>
                                                    {banner.targetAudience === 'student' ? 'Aluno' : 'Instrutor'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h4 className="font-bold text-slate-800 text-sm truncate">{banner.title}</h4>
                                            {banner.linkUrl && <p className="text-[10px] text-blue-500 truncate mt-1">{banner.linkUrl}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* ABA: GUIA POWER BI */}
        {activeTab === 'powerbi' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="bg-yellow-100 p-2 rounded-lg text-yellow-700"><BarChart3 size={24} /></div>
                    <div><h3 className="text-lg font-bold text-slate-800">Conexão Power BI</h3><p className="text-sm text-slate-500">Como exportar seus dados do CRM para relatórios externos.</p></div>
                </div>
                <div className="p-8 space-y-8">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">Siga as instruções técnicas abaixo para conectar o Power BI Desktop diretamente ao seu banco de dados Supabase via REST API.</div>
                    
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">1</div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 mb-1">Configurar URL base do projeto</h4>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono mb-2" placeholder="https://[REFERENCIA].supabase.co" value={pbiConfig.url} onChange={e => setPbiConfig({...pbiConfig, url: e.target.value})} />
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono" placeholder="Nome da Tabela (ex: crm_deals)" value={pbiConfig.tableName} onChange={e => setPbiConfig({...pbiConfig, tableName: e.target.value})} />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">2</div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 mb-1">Obter Dados Web (Avançado)</h4>
                                <p className="text-sm text-slate-500 mb-3">No Power BI, selecione <strong>Obter Dados > Web > Avançado</strong> e use os valores abaixo:</p>
                                
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">URL da Solicitação HTTP</label>
                                        <div className="flex bg-slate-100 border border-slate-200 rounded p-2 items-center group">
                                            <code className="text-[11px] text-slate-600 flex-1 truncate">{pbiConfig.url ? `${pbiConfig.url}/rest/v1/${pbiConfig.tableName}?select=*` : 'URL Pendente...'}</code>
                                            <button onClick={() => handleCopy(`${pbiConfig.url}/rest/v1/${pbiConfig.tableName}?select=*`, 'url')} className="text-slate-400 hover:text-indigo-600 ml-2">{copiedField === 'url' ? <Check size={14}/> : <Copy size={14}/>}</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Header: apikey</label><div className="bg-slate-100 p-2 rounded text-[11px] text-slate-500 italic">Sua ANON KEY</div></div>
                                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Header: Authorization</label><div className="bg-slate-100 p-2 rounded text-[11px] text-slate-500 italic">Bearer [SUA ANON KEY]</div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex gap-3">
                        <Info className="text-amber-600 shrink-0" size={20} />
                        <div className="text-xs text-amber-900 leading-relaxed"><strong>Dica de Segurança:</strong> Nunca compartilhe o token de serviço ou administrativo. A <code>anon key</code> do Supabase é suficiente e segura para leitura de dados públicos configurados via RLS.</div>
                    </div>
                </div>
            </div>
        )}

        {/* ABA: BANCO DE DADOS (DIAGNÓSTICO) */}
        {activeTab === 'database' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2"><Database size={20} className="text-amber-600" /> Diagnóstico de Banco de Dados</h3><p className="text-sm text-slate-500">Execute o script abaixo no Supabase para garantir que todas as colunas existem.</p></div>
                <div className="p-6 bg-slate-50">
                    {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-3 bg-white border border-slate-300 hover:border-amber-500 hover:text-amber-600 text-slate-600 font-medium rounded-lg transition-all shadow-sm">Mostrar Script SQL de Correção</button> : (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <div className="relative"><pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-[300px] border border-slate-800">{generateRepairSQL()}</pre><button onClick={copySql} className={clsx("absolute top-2 right-2 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 backdrop-blur-sm transition-colors", sqlCopied ? "bg-green-600 text-white" : "bg-white/10 hover:bg-white/20 text-white")}>{sqlCopied ? <CheckCircle size={14} /> : <Copy size={14} />}{sqlCopied ? 'Copiado!' : 'Copiar SQL'}</button></div>
                            <button onClick={() => setShowSql(false)} className="mt-4 text-xs text-slate-400 hover:text-slate-600 underline">Ocultar script</button>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

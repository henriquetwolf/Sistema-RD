
import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, Layout, ExternalLink, Trash2, BarChart3 } from 'lucide-react';
import { appBackend } from '../services/appBackend';
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
    { id: 'partner_studios', label: 'Studios Parceiros' }, // Added
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

export const SettingsManager: React.FC<SettingsManagerProps> = ({ onLogoChange, currentLogo }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'roles' | 'database' | 'banners' | 'powerbi'>('visual');
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

  // Power BI Helper State
  const [pbiConfig, setPbiConfig] = useState({ url: '', tableName: '', key: '' });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
      if (activeTab === 'roles') {
          fetchRoles();
      } else if (activeTab === 'banners') {
          fetchBanners();
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

  const getPbiUrl = () => {
      if (!pbiConfig.url) return 'https://[PROJECT_REF].supabase.co/rest/v1/[NOME_DA_TABELA]?select=*';
      // Normalize URL
      const baseUrl = pbiConfig.url.endsWith('/') ? pbiConfig.url.slice(0, -1) : pbiConfig.url;
      const table = pbiConfig.tableName || '[NOME_DA_TABELA]';
      return `${baseUrl}/rest/v1/${table}?select=*`;
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

-- 6. ATUALIZAÇÃO CRM DEALS (Número Automático)
-- Adiciona a coluna deal_number se não existir
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS deal_number bigint GENERATED BY DEFAULT AS IDENTITY;

-- 7. DADOS INICIAIS (SEED)
INSERT INTO public.crm_roles (name, permissions)
VALUES 
('Super Admin', '{"overview": true, "crm": true, "whatsapp": true, "analysis": true, "collaborators": true, "classes": true, "teachers": true, "franchises": true, "partner_studios": true, "forms": true, "contracts": true, "products": true, "events": true, "students": true, "certificates": true, "tables": true, "settings": true, "global_settings": true}'::jsonb),
('Comercial', '{"overview": true, "crm": true, "whatsapp": true, "analysis": true, "forms": true, "products": true, "events": true}'::jsonb),
('Secretaria', '{"overview": true, "classes": true, "students": true, "certificates": true, "contracts": true, "teachers": true, "partner_studios": true}'::jsonb)
ON CONFLICT DO NOTHING;

-- 8. OUTRAS TABELAS (Eventos, Alunos, etc)
CREATE TABLE IF NOT EXISTS public.crm_events (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text, dates text[], registration_open boolean, created_at timestamptz default now());
ALTER TABLE public.crm_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso eventos" ON public.crm_events;
CREATE POLICY "Acesso eventos" ON public.crm_events FOR ALL USING (true) WITH CHECK (true);

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
        
        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
            <button 
                onClick={() => setActiveTab('visual')}
                className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap", activeTab === 'visual' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
                <ImageIcon size={16} /> Identidade
            </button>
            <button 
                onClick={() => setActiveTab('roles')}
                className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap", activeTab === 'roles' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
                <ShieldCheck size={16} /> Tipos de Usuário
            </button>
            <button 
                onClick={() => setActiveTab('banners')}
                className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap", activeTab === 'banners' ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
                <Layout size={16} /> Banners
            </button>
            <button 
                onClick={() => setActiveTab('powerbi')}
                className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap", activeTab === 'powerbi' ? "bg-white text-yellow-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
                <BarChart3 size={16} /> Guia Power BI
            </button>
            <button 
                onClick={() => setActiveTab('database')}
                className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap", activeTab === 'database' ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
                <Database size={16} /> Banco de Dados
            </button>
        </div>
      </div>

      <div className="max-w-4xl space-y-8">
        
        {/* TAB: VISUAL */}
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
                                {preview ? (
                                    <img src={preview} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                ) : (
                                    <ImageIcon className="text-slate-300" size={48} />
                                )}
                            </div>
                        </div>

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
                            onClick={handleResetLogo}
                            className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-2"
                        >
                            <RotateCcw size={16} /> Restaurar Padrão
                        </button>
                        <button 
                            onClick={handleSaveLogo}
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
        )}

        {/* TAB: BANNERS */}
        {activeTab === 'banners' && (
            <div className="space-y-6 animate-in fade-in">
                {/* List */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Banners Publicitários</h3>
                            <p className="text-sm text-slate-500">Gerencie os banners exibidos nas áreas de aluno e instrutor.</p>
                        </div>
                        <button 
                            onClick={() => setIsBannerModalOpen(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                        >
                            <Upload size={16} /> Novo Banner
                        </button>
                    </div>
                    
                    <div className="p-6">
                        {isLoadingBanners ? (
                            <div className="text-center py-10 text-slate-400">Carregando...</div>
                        ) : banners.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                                <Layout size={32} className="mx-auto mb-2 opacity-50" />
                                <p>Nenhum banner cadastrado.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {banners.map(banner => (
                                    <div key={banner.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden group hover:shadow-md transition-all">
                                        <div className="h-40 bg-slate-100 relative">
                                            <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleDeleteBanner(banner.id)} 
                                                    className="bg-white text-red-600 p-2 rounded-full hover:bg-red-50"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="absolute top-2 left-2">
                                                <span className={clsx("text-[10px] font-bold px-2 py-1 rounded shadow-sm border", banner.targetAudience === 'student' ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-orange-100 text-orange-700 border-orange-200")}>
                                                    {banner.targetAudience === 'student' ? 'Área do Aluno' : 'Área do Instrutor'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h4 className="font-bold text-slate-800 text-sm mb-1">{banner.title}</h4>
                                            {banner.linkUrl && (
                                                <a href={banner.linkUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                                    <ExternalLink size={10} /> {banner.linkUrl}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Create Banner */}
                {isBannerModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-slate-800">Novo Banner</h3>
                                <button onClick={() => setIsBannerModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Título do Banner</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                                        value={newBanner.title}
                                        onChange={e => setNewBanner({...newBanner, title: e.target.value})}
                                        placeholder="Ex: Promoção de Verão"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Público Alvo</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg flex-1 hover:bg-slate-50">
                                            <input 
                                                type="radio" 
                                                name="audience" 
                                                checked={newBanner.targetAudience === 'student'} 
                                                onChange={() => setNewBanner({...newBanner, targetAudience: 'student'})}
                                                className="text-purple-600 focus:ring-purple-500"
                                            />
                                            <span className="text-sm font-medium">Área do Aluno</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg flex-1 hover:bg-slate-50">
                                            <input 
                                                type="radio" 
                                                name="audience" 
                                                checked={newBanner.targetAudience === 'instructor'} 
                                                onChange={() => setNewBanner({...newBanner, targetAudience: 'instructor'})}
                                                className="text-orange-600 focus:ring-orange-500"
                                            />
                                            <span className="text-sm font-medium">Área do Instrutor</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Imagem do Banner</label>
                                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors relative">
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleBannerImageUpload} />
                                        {newBanner.imageUrl ? (
                                            <img src={newBanner.imageUrl} alt="Preview" className="max-h-32 mx-auto rounded shadow-sm" />
                                        ) : (
                                            <div className="text-slate-400">
                                                <Upload className="mx-auto mb-2" size={24} />
                                                <p className="text-xs">Clique para fazer upload</p>
                                                <p className="text-[10px] mt-1">Recomendado: 1200x300px (Desktop)</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Link de Redirecionamento</label>
                                    <div className="relative">
                                        <ExternalLink size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text" 
                                            className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm" 
                                            value={newBanner.linkUrl}
                                            onChange={e => setNewBanner({...newBanner, linkUrl: e.target.value})}
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                                <button onClick={() => setIsBannerModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                                <button onClick={handleSaveBanner} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm">Salvar Banner</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* TAB: ROLES */}
        {activeTab === 'roles' && (
            <div className="space-y-6 animate-in fade-in">
                {!editingRole ? (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">Tipos de Usuário</h3>
                                <p className="text-sm text-slate-500">Gerencie os perfis de acesso ao painel administrativo.</p>
                            </div>
                            <button 
                                onClick={() => setEditingRole({ id: '', name: '', permissions: {} })}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                            >
                                <Users size={16} /> Novo Tipo
                            </button>
                        </div>
                        <div className="p-6">
                            {isLoadingRoles ? (
                                <div className="text-center py-10 text-slate-400">Carregando...</div>
                            ) : roles.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">Nenhum tipo de usuário criado.</div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {roles.map(role => (
                                        <div key={role.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors">
                                            <div>
                                                <h4 className="font-bold text-slate-800">{role.name}</h4>
                                                <p className="text-xs text-slate-500">
                                                    {Object.values(role.permissions).filter(Boolean).length} módulos permitidos
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingRole(role)} className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-600 hover:bg-slate-50">Editar</button>
                                                <button onClick={() => handleDeleteRole(role.id)} className="px-3 py-1.5 bg-white border border-red-200 rounded text-xs font-bold text-red-600 hover:bg-red-50">Excluir</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // EDIT MODE
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                            <h3 className="text-lg font-bold text-indigo-900">
                                {editingRole.id ? `Editar: ${editingRole.name}` : 'Criar Novo Tipo de Usuário'}
                            </h3>
                            <button onClick={() => setEditingRole(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Tipo (Cargo/Departamento)</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Ex: Vendas, Marketing, Financeiro..."
                                    value={editingRole.name}
                                    onChange={(e) => setEditingRole({...editingRole, name: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">Permissões de Acesso</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {MODULES.map(module => {
                                        const isAllowed = !!editingRole.permissions[module.id];
                                        return (
                                            <div 
                                                key={module.id}
                                                onClick={() => togglePermission(module.id)}
                                                className={clsx(
                                                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                                                    isAllowed 
                                                        ? "bg-green-50 border-green-200 shadow-sm" 
                                                        : "bg-slate-50 border-slate-200 opacity-70 hover:opacity-100"
                                                )}
                                            >
                                                <span className={clsx("text-sm font-medium", isAllowed ? "text-green-800" : "text-slate-500")}>
                                                    {module.label}
                                                </span>
                                                {isAllowed ? <Check size={18} className="text-green-600" /> : <Lock size={16} className="text-slate-400" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setEditingRole(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                            <button onClick={handleSaveRole} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm">
                                Salvar Permissões
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* TAB: DATABASE */}
        {activeTab === 'database' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                            <Database size={20} className="text-amber-600" /> Diagnóstico de Banco de Dados
                        </h3>
                        <p className="text-sm text-slate-500">Use esta ferramenta se estiver vendo erros de "Coluna Faltante" ou de unicidade.</p>
                    </div>
                </div>
                
                <div className="p-6 bg-slate-50">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="text-sm font-bold text-amber-800">Correção de Tabelas</h4>
                            <p className="text-xs text-amber-700 mt-1">
                                Este script cria tabelas faltantes e corrige erros comuns, como <strong>emails duplicados</strong> impedindo login.
                            </p>
                        </div>
                    </div>

                    {!showSql ? (
                        <button 
                            onClick={() => setShowSql(true)}
                            className="w-full py-3 bg-white border border-slate-300 hover:border-amber-500 hover:text-amber-600 text-slate-600 font-medium rounded-lg transition-all shadow-sm"
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
                                    className={sqlCopied 
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
        )}

        {/* TAB: POWER BI (INTEGRATION HELP) */}
        {activeTab === 'powerbi' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                            <BarChart3 size={20} className="text-yellow-600" /> Guia de Conexão Power BI
                        </h3>
                        <p className="text-sm text-slate-500">Tutorial de conexão de dados em tempo real.</p>
                    </div>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Dynamic Inputs for URL Generation */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                        <h4 className="text-sm font-bold text-slate-700 mb-2">1. Gerador de Link</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">URL do Projeto (Supabase)</label>
                                <input 
                                    type="text" 
                                    placeholder="https://xyz.supabase.co" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono"
                                    value={pbiConfig.url}
                                    onChange={(e) => setPbiConfig({...pbiConfig, url: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nome da Tabela</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: crm_deals" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono"
                                    value={pbiConfig.tableName}
                                    onChange={(e) => setPbiConfig({...pbiConfig, tableName: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-1">Iniciar Conexão Web</h3>
                            <p className="text-sm text-slate-500">
                                Abra o Power BI Desktop, clique em <strong>Obter Dados</strong> na barra superior e selecione a opção <strong>Web</strong>.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 mb-1">Configurar URL da API</h3>
                            <p className="text-sm text-slate-500 mb-2">
                                Selecione a opção <strong>Avançado</strong>. No campo URL, insira o endpoint abaixo:
                            </p>
                            <div className="bg-slate-100 border border-slate-200 rounded p-3 text-xs font-mono break-all relative group flex items-center justify-between">
                                <span>{getPbiUrl()}</span>
                                <button 
                                    onClick={() => handleCopy(getPbiUrl(), 'url')}
                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                    title="Copiar"
                                >
                                    {copiedField === 'url' ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 mb-2">Adicionar Cabeçalhos (Headers)</h3>
                            <p className="text-sm text-slate-500 mb-3">
                                Ainda na tela "Avançado", adicione os seguintes parâmetros de cabeçalho:
                            </p>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-24 text-xs font-bold text-slate-600 text-right">apikey</div>
                                    <div className="flex-1 bg-slate-100 border border-slate-200 rounded p-2 text-xs font-mono flex justify-between items-center group">
                                        <input 
                                            type="text" 
                                            className="bg-transparent border-none w-full outline-none text-slate-600 placeholder-slate-400" 
                                            placeholder="Cole sua ANON KEY aqui..." 
                                            value={pbiConfig.key}
                                            onChange={(e) => setPbiConfig({...pbiConfig, key: e.target.value})}
                                        />
                                        {pbiConfig.key && (
                                            <button 
                                                onClick={() => handleCopy(pbiConfig.key, 'apikey')}
                                                className="text-slate-400 hover:text-indigo-600 transition-colors"
                                            >
                                                {copiedField === 'apikey' ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="w-24 text-xs font-bold text-slate-600 text-right">Authorization</div>
                                    <div className="flex-1 bg-slate-100 border border-slate-200 rounded p-2 text-xs font-mono flex justify-between items-center group">
                                        <span className="text-slate-600">Bearer {pbiConfig.key || 'SUA_ANON_KEY'}</span>
                                        {pbiConfig.key && (
                                            <button 
                                                onClick={() => handleCopy(`Bearer ${pbiConfig.key}`, 'auth')}
                                                className="text-slate-400 hover:text-indigo-600 transition-colors"
                                            >
                                                {copiedField === 'auth' ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-4 p-3 bg-amber-50 text-amber-800 text-xs rounded border border-amber-100">
                                <strong>Nota:</strong> A chave API (ANON KEY) pode ser encontrada nas configurações do seu projeto Supabase. Ela é segura para leitura de dados se as políticas RLS estiverem corretas.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
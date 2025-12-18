
import React, { useState, useEffect } from 'react';
import { 
    Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, 
    Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck, 
    Layout, ExternalLink, Trash2, BarChart3, Building2, Plus, Edit2,
    Monitor, Globe, Target, Info, Shield, TrendingUp, DollarSign,
    Loader2, Package
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
    { id: 'inventory', label: 'Controle de Estoque' },
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

  const [roles, setRoles] = useState<UserRole[]>([]);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [newBanner, setNewBanner] = useState<Partial<Banner>>({ title: '', linkUrl: '', targetAudience: 'student', active: true, imageUrl: '' });
  const [isLoadingBanners, setIsLoadingBanners] = useState(false);

  const [companies, setCompanies] = useState<CompanySetting[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Partial<CompanySetting> | null>(null);

  const [instructorLevels, setInstructorLevels] = useState<InstructorLevel[]>([]);
  const [isLoadingLevels, setIsLoadingLevels] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Partial<InstructorLevel> | null>(null);

  useEffect(() => {
      if (activeTab === 'roles') fetchRoles();
      else if (activeTab === 'banners') fetchBanners();
      else if (activeTab === 'company') fetchCompanies();
      else if (activeTab === 'instructor_levels') fetchInstructorLevels();
  }, [activeTab]);

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

  const fetchInstructorLevels = async () => {
    setIsLoadingLevels(true);
    try { const data = await appBackend.getInstructorLevels(); setInstructorLevels(data); } catch(e) { console.error(e); } finally { setIsLoadingLevels(false); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => { setPreview(reader.result as string); setIsSaved(false); };
      reader.readAsDataURL(e.target.files[0]);
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

  const generateRepairSQL = () => `
-- SCRIPT DE ATUALIZAÇÃO DO BANCO DE DADOS VOLL
CREATE TABLE IF NOT EXISTS public.crm_roles (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), name text NOT NULL, permissions jsonb DEFAULT '{}'::jsonb);
ALTER TABLE public.crm_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total roles" ON public.crm_roles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.crm_roles(id);
ALTER TABLE public.crm_collaborators ADD COLUMN IF NOT EXISTS password text;

CREATE TABLE IF NOT EXISTS public.app_banners (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), title text, image_url text, link_url text, target_audience text CHECK (target_audience IN ('student', 'instructor')), active boolean DEFAULT true);
ALTER TABLE public.app_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total banners" ON public.app_banners FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.crm_companies (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, legal_name text, cnpj text, product_types jsonb DEFAULT '[]'::jsonb, created_at timestamptz DEFAULT now());
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total companies" ON public.crm_companies FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.crm_instructor_levels (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), name text NOT NULL, honorarium numeric DEFAULT 0, observations text);
ALTER TABLE public.crm_instructor_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total instructor_levels" ON public.crm_instructor_levels FOR ALL USING (true) WITH CHECK (true);

-- TABELA DE ESTOQUE
CREATE TABLE IF NOT EXISTS public.crm_inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  type text CHECK (type IN ('entry', 'exit')),
  item_apostila_nova int DEFAULT 0,
  item_apostila_classico int DEFAULT 0,
  item_sacochila int DEFAULT 0,
  item_lapis int DEFAULT 0,
  registration_date date DEFAULT now(),
  studio_id uuid REFERENCES public.crm_partner_studios(id) ON DELETE SET NULL,
  tracking_code text,
  observations text,
  conference_date date,
  attachments text
);
ALTER TABLE public.crm_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total inventory" ON public.crm_inventory FOR ALL USING (true) WITH CHECK (true);

-- TABELAS CRM RESTANTES
CREATE TABLE IF NOT EXISTS public.crm_whatsapp_chats (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), wa_id text UNIQUE, contact_name text, contact_phone text, last_message text, unread_count int DEFAULT 0, status text DEFAULT 'open', crm_stage text DEFAULT 'Novo Lead');
CREATE TABLE IF NOT EXISTS public.crm_whatsapp_messages (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), chat_id uuid REFERENCES public.crm_whatsapp_chats(id) ON DELETE CASCADE, sender_type text CHECK (sender_type IN ('user', 'agent', 'system')), text text, wa_message_id text, status text DEFAULT 'sent');
ALTER TABLE public.crm_whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total whatsapp_chats" ON public.crm_whatsapp_chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total whatsapp_messages" ON public.crm_whatsapp_messages FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload config';
  `;

  const copySql = () => { navigator.clipboard.writeText(generateRepairSQL()); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); };
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>
            <p className="text-slate-500 text-sm">Personalize acessos, identidade e banco de dados.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
            <button onClick={() => setActiveTab('visual')} className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all", activeTab === 'visual' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Identidade</button>
            <button onClick={() => setActiveTab('roles')} className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all", activeTab === 'roles' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Acessos</button>
            <button onClick={() => setActiveTab('database')} className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all", activeTab === 'database' ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Banco de Dados</button>
        </div>
      </div>
      
      <div className="max-w-4xl space-y-8">
        {activeTab === 'visual' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Pré-visualização</span>
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
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button onClick={handleSaveLogo} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-2 rounded-lg font-bold shadow-sm">{isSaved ? 'Salvo!' : 'Salvar Alterações'}</button>
                </div>
            </div>
        )}

        {activeTab === 'roles' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Tipos de Usuário (Permissões)</h3>
                    <button onClick={() => setEditingRole({ id: '', name: '', permissions: {} })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Plus size={16} /> Novo Perfil</button>
                </div>
                {editingRole ? (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="max-w-xl"><label className="block text-sm font-bold text-slate-700 mb-1">Nome do Cargo</label><input type="text" className="w-full px-4 py-2 border rounded-lg" value={editingRole.name} onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })} /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {MODULES.map(m => (
                                <label key={m.id} className={clsx("flex items-center justify-between p-3 rounded-xl border cursor-pointer", editingRole.permissions?.[m.id] ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-100")}>
                                    <span className="text-sm font-medium">{m.label}</span>
                                    <input type="checkbox" checked={!!editingRole.permissions?.[m.id]} onChange={() => { const current = editingRole.permissions || {}; setEditingRole({ ...editingRole, permissions: { ...current, [m.id]: !current[m.id] } }); }} />
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setEditingRole(null)} className="px-6 py-2 text-slate-600">Cancelar</button><button onClick={async () => { await appBackend.saveRole(editingRole); fetchRoles(); setEditingRole(null); }} className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold">Salvar</button></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {roles.map(r => (
                            <div key={r.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                                <div><h4 className="font-bold text-slate-800">{r.name}</h4><p className="text-xs text-slate-400">{Object.values(r.permissions || {}).filter(v => v).length} módulos</p></div>
                                <div className="flex gap-2"><button onClick={() => setEditingRole(r)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={18} /></button><button onClick={async () => { if(window.confirm('Excluir?')) { await appBackend.deleteRole(r.id); fetchRoles(); } }} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'database' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex items-center gap-3 mb-4"><Database className="text-amber-600" /><h3 className="text-lg font-bold text-slate-800">Manutenção de Tabelas</h3></div>
                <p className="text-sm text-slate-500 mb-6">Use o script abaixo no editor de SQL do seu painel Supabase para habilitar o módulo de <strong>Estoque</strong> e outros.</p>
                {!showSql ? <button onClick={() => setShowSql(true)} className="w-full py-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm">Gerar Script de Atualização</button> : (
                    <div className="relative animate-in slide-in-from-top-4">
                        <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-[10px] font-mono overflow-auto max-h-[400px]">{generateRepairSQL()}</pre>
                        <button onClick={copySql} className="absolute top-2 right-2 bg-slate-700 text-white px-3 py-1 rounded text-xs hover:bg-slate-600 transition-colors">{sqlCopied ? 'Copiado!' : 'Copiar SQL'}</button>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

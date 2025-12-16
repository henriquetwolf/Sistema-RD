
import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, Database, Copy, AlertTriangle, Users, Lock, Unlock, Check, X, ShieldCheck } from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { Role } from '../types';
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
  const [activeTab, setActiveTab] = useState<'visual' | 'roles' | 'database'>('visual');
  const [preview, setPreview] = useState<string | null>(currentLogo);
  const [isSaved, setIsSaved] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Role Management State
  const [roles, setRoles] = useState<Role[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  useEffect(() => {
      if (activeTab === 'roles') {
          fetchRoles();
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

-- 4. DADOS INICIAIS (SEED)
INSERT INTO public.crm_roles (name, permissions)
VALUES 
('Super Admin', '{"overview": true, "crm": true, "whatsapp": true, "analysis": true, "collaborators": true, "classes": true, "teachers": true, "franchises": true, "forms": true, "contracts": true, "products": true, "events": true, "students": true, "certificates": true, "tables": true, "settings": true, "global_settings": true}'::jsonb),
('Comercial', '{"overview": true, "crm": true, "whatsapp": true, "analysis": true, "forms": true, "products": true, "events": true}'::jsonb),
('Secretaria', '{"overview": true, "classes": true, "students": true, "certificates": true, "contracts": true, "teachers": true}'::jsonb)
ON CONFLICT DO NOTHING;

-- 5. OUTRAS TABELAS (Eventos, Alunos, etc)
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
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('visual')}
                className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2", activeTab === 'visual' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
                <ImageIcon size={16} /> Identidade
            </button>
            <button 
                onClick={() => setActiveTab('roles')}
                className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2", activeTab === 'roles' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
                <ShieldCheck size={16} /> Tipos de Usuário
            </button>
            <button 
                onClick={() => setActiveTab('database')}
                className={clsx("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2", activeTab === 'database' ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
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

      </div>
    </div>
  );
};

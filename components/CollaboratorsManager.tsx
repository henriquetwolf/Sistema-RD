import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, MoreVertical, Shield, User, 
  Mail, CheckCircle, X, ArrowLeft, Save, Briefcase, Edit2, Trash2
} from 'lucide-react';
import clsx from 'clsx';

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  department: string; // Novo campo
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'inactive';
  lastAccess: string;
}

export const MOCK_COLLABORATORS: Collaborator[] = [
  { id: '1', name: 'Ricardo Oliveira', email: 'ricardo@voll.com.br', department: 'Web / TI', role: 'admin', status: 'active', lastAccess: 'Hoje, 09:30' },
  { id: '2', name: 'Amanda Souza', email: 'amanda@voll.com.br', department: 'Marketing', role: 'editor', status: 'active', lastAccess: 'Ontem, 14:15' },
  { id: '3', name: 'Equipe Financeira', email: 'financeiro@voll.com.br', department: 'Financeiro', role: 'viewer', status: 'inactive', lastAccess: 'Há 5 dias' },
  // Adicionando colaboradores comerciais para teste do CRM
  { id: '4', name: 'Carlos Vendas', email: 'carlos@voll.com.br', department: 'Comercial', role: 'editor', status: 'active', lastAccess: 'Hoje, 08:00' },
  { id: '5', name: 'Ana Silva', email: 'ana.silva@voll.com.br', department: 'Comercial', role: 'viewer', status: 'active', lastAccess: 'Hoje, 10:15' },
  { id: '6', name: 'Roberto Junior', email: 'beto@voll.com.br', department: 'Comercial', role: 'editor', status: 'active', lastAccess: 'Ontem, 18:00' },
];

const DEPARTMENTS = [
  'Comercial',
  'Marketing',
  'Financeiro',
  'Web / TI',
  'Suporte / Relacionamento',
  'Logística',
  'Franquias',
  'RH'
];

interface CollaboratorsManagerProps {
  onBack: () => void;
}

export const CollaboratorsManager: React.FC<CollaboratorsManagerProps> = ({ onBack }) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>(MOCK_COLLABORATORS);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Actions State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({ name: '', email: '', department: '', role: 'viewer' as const });

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.actions-menu-btn') === null) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.department) return;
    
    if (editingId) {
        setCollaborators(prev => prev.map(c => c.id === editingId ? {
            ...c,
            name: formData.name,
            email: formData.email,
            department: formData.department,
            role: formData.role
        } : c));
    } else {
        const newCollaborator: Collaborator = {
          id: Math.random().toString(36).substr(2, 9),
          name: formData.name,
          email: formData.email,
          department: formData.department,
          role: formData.role,
          status: 'active',
          lastAccess: 'Nunca'
        };
        setCollaborators([...collaborators, newCollaborator]);
    }

    closeModal();
  };

  const handleEdit = (c: Collaborator) => {
      setFormData({
          name: c.name,
          email: c.email,
          department: c.department,
          role: c.role
      });
      setEditingId(c.id);
      setActiveMenuId(null);
      setShowModal(true);
  };

  const handleDelete = (id: string) => {
      if (window.confirm('Tem certeza que deseja remover este colaborador?')) {
          setCollaborators(prev => prev.filter(c => c.id !== id));
      }
      setActiveMenuId(null);
  };

  const openNewModal = () => {
      setFormData({ name: '', email: '', department: '', role: 'viewer' });
      setEditingId(null);
      setShowModal(true);
  };

  const closeModal = () => {
      setShowModal(false);
      setFormData({ name: '', email: '', department: '', role: 'viewer' });
      setEditingId(null);
  };

  const filtered = collaborators.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Users className="text-blue-600" /> Colaboradores
                </h2>
                <p className="text-slate-500 text-sm">Gerencie o acesso e permissões da equipe.</p>
            </div>
        </div>
        <button 
            onClick={openNewModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
        >
            <Plus size={18} /> Novo Colaborador
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Buscar por nome, email ou setor..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
         </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto min-h-[400px]">
        <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                    <th className="px-6 py-4">Usuário</th>
                    <th className="px-6 py-4">Setor</th>
                    <th className="px-6 py-4">Função</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Último Acesso</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors relative">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                    {c.name.substring(0,2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 whitespace-nowrap">{c.name}</p>
                                    <p className="text-xs text-slate-400">{c.email}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                <Briefcase size={14} className="text-slate-400" />
                                {c.department}
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className={clsx(
                                "px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 w-fit whitespace-nowrap",
                                c.role === 'admin' ? "bg-purple-50 text-purple-700 border-purple-100" :
                                c.role === 'editor' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                "bg-slate-100 text-slate-600 border-slate-200"
                            )}>
                                {c.role === 'admin' && <Shield size={10} />}
                                {c.role === 'admin' ? 'Administrador' : c.role === 'editor' ? 'Editor' : 'Visualizador'}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <span className={clsx(
                                "px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap",
                                c.status === 'active' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                            )}>
                                {c.status === 'active' ? 'Ativo' : 'Inativo'}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                            {c.lastAccess}
                        </td>
                        <td className="px-6 py-4 text-right relative">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(activeMenuId === c.id ? null : c.id);
                                }}
                                className={clsx(
                                    "p-2 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 actions-menu-btn transition-colors",
                                    activeMenuId === c.id && "bg-slate-200 text-slate-600"
                                )}
                            >
                                <MoreVertical size={16} />
                            </button>
                            
                            {/* Actions Dropdown */}
                            {activeMenuId === c.id && (
                                <div className="absolute right-10 top-8 w-40 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                    <button 
                                        onClick={() => handleEdit(c)}
                                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                        <Edit2 size={14} /> Editar
                                    </button>
                                    <div className="h-px bg-slate-100 my-0"></div>
                                    <button 
                                        onClick={() => handleDelete(c.id)}
                                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <Trash2 size={14} /> Excluir
                                    </button>
                                </div>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">{editingId ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                    <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ex: João Silva"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Corporativo</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="email" 
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="joao@empresa.com"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Setor</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select 
                                value={formData.department}
                                onChange={e => setFormData({...formData, department: e.target.value})}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
                            >
                                <option value="" disabled>Selecione um setor...</option>
                                {DEPARTMENTS.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Permissão</label>
                        <select 
                            value={formData.role}
                            onChange={e => setFormData({...formData, role: e.target.value as any})}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="viewer">Visualizador (Apenas Leitura)</option>
                            <option value="editor">Editor (Pode criar/editar)</option>
                            <option value="admin">Administrador (Acesso Total)</option>
                        </select>
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                    <button onClick={closeModal} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2">
                        <Save size={16} /> Salvar Cadastro
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
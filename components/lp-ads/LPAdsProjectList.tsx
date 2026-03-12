import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Trash2, FolderOpen, LayoutGrid, List,
  Megaphone, Globe, ArrowLeft, Loader2, MoreVertical, Copy
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';
import { LPAdsProject, LPAdsProjectStatus, LP_ADS_STATUS_LABELS } from './types';
import { LPAdsStatusBadge } from './LPAdsStatusBadge';

interface Props {
  onSelectProject: (id: string) => void;
  onBack: () => void;
}

const EMPTY_PROJECT: Partial<LPAdsProject> = {
  name: '',
  description: '',
  offer: '',
  target_audience: '',
  campaign_objective: '',
  cta_principal: '',
  tone_of_voice: 'Profissional e Persuasivo',
  status: 'draft',
};

export const LPAdsProjectList: React.FC<Props> = ({ onSelectProject, onBack }) => {
  const [projects, setProjects] = useState<LPAdsProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState<Partial<LPAdsProject>>({ ...EMPTY_PROJECT });
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const data = await appBackend.lpAds.projects.list();
      setProjects(data || []);
    } catch { /* silent */ }
    setIsLoading(false);
  };

  useEffect(() => { loadProjects(); }, []);

  const handleCreate = async () => {
    if (!newProject.name?.trim()) return;
    setSaving(true);
    try {
      const saved = await appBackend.lpAds.projects.save(newProject);
      if (saved) {
        setShowCreateModal(false);
        setNewProject({ ...EMPTY_PROJECT });
        onSelectProject(saved.id);
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Excluir este projeto e todos os dados vinculados?')) return;
    await appBackend.lpAds.projects.delete(id);
    loadProjects();
  };

  const handleDuplicate = async (project: LPAdsProject, e: React.MouseEvent) => {
    e.stopPropagation();
    const { id, created_at, updated_at, ...rest } = project;
    await appBackend.lpAds.projects.save({ ...rest, name: `${rest.name} (cópia)`, status: 'draft' });
    loadProjects();
  };

  const filtered = projects.filter(p => {
    const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft size={20} className="text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800">LP + Anúncios (IA)</h1>
            <p className="text-sm text-slate-500">Crie landing pages e anúncios com inteligência artificial</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          <Plus size={18} /> Novo Projeto
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar projetos..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-100 rounded-xl text-sm focus:border-indigo-400 focus:outline-none bg-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border-2 border-slate-100 rounded-xl text-sm font-medium focus:border-indigo-400 focus:outline-none bg-white cursor-pointer"
        >
          <option value="all">Todos os status</option>
          {Object.entries(LP_ADS_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <div className="flex border-2 border-slate-100 rounded-xl overflow-hidden">
          <button onClick={() => setViewMode('grid')} className={clsx('p-2.5 transition-colors', viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50')}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setViewMode('list')} className={clsx('p-2.5 transition-colors', viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50')}>
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-1">
            {searchTerm || filterStatus !== 'all' ? 'Nenhum projeto encontrado' : 'Crie seu primeiro projeto'}
          </h3>
          <p className="text-sm text-slate-400 mb-6">
            {searchTerm || filterStatus !== 'all' ? 'Tente ajustar os filtros' : 'Landing pages + anúncios gerados por IA para vender mais'}
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <button onClick={() => setShowCreateModal(true)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">
              <Plus size={16} className="inline mr-2" />Novo Projeto
            </button>
          )}
        </div>
      )}

      {/* Grid View */}
      {!isLoading && filtered.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="bg-white rounded-2xl border-2 border-slate-100 p-5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{project.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{project.description || 'Sem descrição'}</p>
                </div>
                <LPAdsStatusBadge status={project.status as LPAdsProjectStatus} />
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 mt-4 pt-3 border-t border-slate-50">
                <span className="flex items-center gap-1"><Globe size={12} /> LP</span>
                <span className="flex items-center gap-1"><Megaphone size={12} /> Anúncios</span>
                <span className="ml-auto">{new Date(project.created_at).toLocaleDateString('pt-BR')}</span>
              </div>

              <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => handleDuplicate(project, e)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Duplicar">
                  <Copy size={14} />
                </button>
                <button onClick={(e) => handleDelete(project.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {!isLoading && filtered.length > 0 && viewMode === 'list' && (
        <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Projeto</th>
                <th className="px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Criado em</th>
                <th className="px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider w-20">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(project => (
                <tr
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className="border-b border-slate-50 hover:bg-indigo-50/30 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-800">{project.name}</div>
                    <div className="text-xs text-slate-400 truncate max-w-sm">{project.description || 'Sem descrição'}</div>
                  </td>
                  <td className="px-5 py-3"><LPAdsStatusBadge status={project.status as LPAdsProjectStatus} /></td>
                  <td className="px-5 py-3 text-slate-500">{new Date(project.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => handleDuplicate(project, e)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Duplicar">
                        <Copy size={14} />
                      </button>
                      <button onClick={(e) => handleDelete(project.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black text-slate-800 mb-6">Novo Projeto</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome do Produto / Projeto *</label>
                <input
                  type="text"
                  value={newProject.name || ''}
                  onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Ex: Curso de Gestão Estratégica"
                  className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-medium focus:border-indigo-400 focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descrição breve</label>
                <textarea
                  value={newProject.description || ''}
                  onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Descreva brevemente o produto e seu objetivo..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-medium focus:border-indigo-400 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Público-alvo</label>
                <input
                  type="text"
                  value={newProject.target_audience || ''}
                  onChange={e => setNewProject({ ...newProject, target_audience: e.target.value })}
                  placeholder="Ex: Profissionais de saúde de 25 a 45 anos"
                  className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-medium focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !newProject.name?.trim()}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Criar e Abrir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

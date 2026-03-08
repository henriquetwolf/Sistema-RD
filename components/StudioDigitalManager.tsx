import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Loader2, Plus, Trash2, ChevronUp, ChevronDown,
  X, MonitorPlay, Settings, Eye, EyeOff, Image as ImageIcon,
  Save, CheckCircle2, AlertCircle, Sparkles, Database, Play, Video, Edit2
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { StudioDigitalEquipment, StudioDigitalExercise } from '../types';

const SEED_EQUIPMENTS = [
  { name: 'Reformer', slug: 'reformer', description: 'O equipamento mais versátil do Pilates, ideal para trabalho de corpo inteiro com resistência por molas.', partner_name: 'Equipilates', sort_order: 1 },
  { name: 'Cadillac', slug: 'cadillac', description: 'Também conhecido como Trapézio, oferece ampla variedade de exercícios de mobilidade e fortalecimento.', partner_name: 'Equipilates', sort_order: 2 },
  { name: 'Chair', slug: 'chair', description: 'Equipamento compacto e desafiador, excelente para fortalecimento e equilíbrio.', partner_name: 'Equipilates', sort_order: 3 },
  { name: 'Mat', slug: 'mat', description: 'A base do Pilates: exercícios no solo que desenvolvem controle, força e flexibilidade.', partner_name: 'Equipilates', sort_order: 4 },
  { name: 'Barrel', slug: 'barrel', description: 'Perfeito para alongamento, extensão da coluna e trabalho de mobilidade articular.', partner_name: 'Equipilates', sort_order: 5 },
];

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getAutoThumbnail(videoUrl: string): string {
  const ytId = extractYouTubeId(videoUrl);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  return '';
}

interface StudioDigitalManagerProps {
  onBack: () => void;
}

export const StudioDigitalManager: React.FC<StudioDigitalManagerProps> = ({ onBack }) => {
  const [adminView, setAdminView] = useState<'list' | 'detail'>('list');
  const [equipments, setEquipments] = useState<StudioDigitalEquipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<StudioDigitalEquipment | null>(null);
  const [exercises, setExercises] = useState<StudioDigitalExercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [seedError, setSeedError] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<StudioDigitalExercise | null>(null);
  const [exerciseForm, setExerciseForm] = useState({ name: '', description: '', video_url: '', thumbnail_url: '' });

  const [editForm, setEditForm] = useState<{ description: string; image_url: string }>({ description: '', image_url: '' });

  useEffect(() => { loadEquipments(); }, []);

  const loadEquipments = async () => {
    setIsLoading(true);
    try {
      const data = await appBackend.getStudioDigitalEquipments();
      setEquipments(data);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleSeedEquipments = async () => {
    setIsSeeding(true);
    setSeedError('');
    try {
      for (const eq of SEED_EQUIPMENTS) {
        await appBackend.upsertStudioDigitalEquipment({
          name: eq.name, slug: eq.slug, description: eq.description,
          partner_name: eq.partner_name, is_active: true, sort_order: eq.sort_order,
        });
      }
      await loadEquipments();
    } catch (e: any) {
      console.error(e);
      setSeedError('Erro ao cadastrar equipamentos. Verifique se a tabela existe no banco. Execute a migration 022 e 023 no SQL Editor do Supabase.');
    } finally { setIsSeeding(false); }
  };

  const openDetail = async (eq: StudioDigitalEquipment) => {
    setSelectedEquipment(eq);
    setEditForm({ description: eq.description || '', image_url: eq.image_url || '' });
    setAdminView('detail');
    await loadExercises(eq.id);
  };

  const loadExercises = async (equipmentId: string) => {
    try {
      const data = await appBackend.getStudioDigitalExercises(equipmentId);
      setExercises(data);
    } catch (e) { console.error(e); }
  };

  const handleToggleEquipment = async (eq: StudioDigitalEquipment) => {
    await appBackend.toggleStudioDigitalEquipmentActive(eq.id, !eq.is_active);
    setEquipments(prev => prev.map(e => e.id === eq.id ? { ...e, is_active: !e.is_active } : e));
    if (selectedEquipment?.id === eq.id) setSelectedEquipment(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
  };

  const handleSaveEquipment = async () => {
    if (!selectedEquipment) return;
    setIsSaving(true);
    try {
      await appBackend.upsertStudioDigitalEquipment({ ...selectedEquipment, description: editForm.description, image_url: editForm.image_url });
      setSelectedEquipment(prev => prev ? { ...prev, description: editForm.description, image_url: editForm.image_url } : null);
      setEquipments(prev => prev.map(e => e.id === selectedEquipment.id ? { ...e, description: editForm.description, image_url: editForm.image_url } : e));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) { console.error(e); alert('Erro ao salvar equipamento.'); } finally { setIsSaving(false); }
  };

  const openNewExercise = () => {
    setEditingExercise(null);
    setExerciseForm({ name: '', description: '', video_url: '', thumbnail_url: '' });
    setShowExerciseModal(true);
  };

  const openEditExercise = (ex: StudioDigitalExercise) => {
    setEditingExercise(ex);
    setExerciseForm({ name: ex.name, description: ex.description || '', video_url: ex.video_url, thumbnail_url: ex.thumbnail_url || '' });
    setShowExerciseModal(true);
  };

  const handleSaveExercise = async () => {
    if (!selectedEquipment || !exerciseForm.name.trim() || !exerciseForm.video_url.trim()) return;
    setIsSaving(true);
    try {
      const thumbnail = exerciseForm.thumbnail_url.trim() || getAutoThumbnail(exerciseForm.video_url);
      await appBackend.saveStudioDigitalExercise({
        id: editingExercise?.id,
        equipment_id: selectedEquipment.id,
        name: exerciseForm.name.trim(),
        description: exerciseForm.description.trim(),
        video_url: exerciseForm.video_url.trim(),
        thumbnail_url: thumbnail,
        is_active: editingExercise?.is_active ?? true,
        sort_order: editingExercise?.sort_order ?? 999,
      });
      await loadExercises(selectedEquipment.id);
      setShowExerciseModal(false);
    } catch (e) { console.error(e); alert('Erro ao salvar exercício.'); } finally { setIsSaving(false); }
  };

  const handleRemoveExercise = async (id: string) => {
    if (!window.confirm('Remover este exercício?')) return;
    await appBackend.removeStudioDigitalExercise(id);
    setExercises(prev => prev.filter(e => e.id !== id));
  };

  const handleToggleExercise = async (ex: StudioDigitalExercise) => {
    await appBackend.toggleStudioDigitalExerciseActive(ex.id, !ex.is_active);
    setExercises(prev => prev.map(e => e.id === ex.id ? { ...e, is_active: !e.is_active } : e));
  };

  const handleMoveExercise = async (idx: number, direction: 'up' | 'down') => {
    const sorted = [...exercises];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
    const updates = sorted.map((s, i) => ({ id: s.id, sort_order: i }));
    setExercises(sorted.map((s, i) => ({ ...s, sort_order: i })));
    await appBackend.updateStudioDigitalExerciseOrder(updates);
  };

  const getExerciseThumbnail = (ex: StudioDigitalExercise): string => {
    if (ex.thumbnail_url) return ex.thumbnail_url;
    return getAutoThumbnail(ex.video_url);
  };

  // ── LIST VIEW ─────────────────────────────────────────────
  if (adminView === 'list') {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200"><MonitorPlay size={22} className="text-amber-600" /></div>
              Studio Digital
            </h1>
            <p className="text-sm text-slate-500 mt-1">Configure vídeos de exercícios para cada equipamento do Studio Digital.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
        ) : equipments.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <div className="bg-amber-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles size={28} className="text-amber-500" />
            </div>
            <h3 className="font-black text-slate-700 text-lg mb-2">Nenhum equipamento cadastrado</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              Configure os equipamentos Equipilates para que os alunos visualizem exercícios em vídeo no Studio Digital.
            </p>
            <button onClick={handleSeedEquipments} disabled={isSeeding}
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50">
              {isSeeding ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
              {isSeeding ? 'Cadastrando...' : 'Cadastrar equipamentos iniciais (Equipilates)'}
            </button>
            <p className="text-xs text-slate-400 mt-3">Serão criados 5 equipamentos: Reformer, Cadillac, Chair, Mat e Barrel.</p>
            {seedError && (
              <div className="mt-4 mx-auto max-w-lg bg-red-50 border border-red-200 rounded-xl p-4 text-left">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-700">Erro ao cadastrar</p>
                    <p className="text-xs text-red-600 mt-1">{seedError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipments.map(eq => (
              <div key={eq.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
                <div className="h-40 bg-slate-100 relative overflow-hidden">
                  {eq.image_url ? (
                    <img src={eq.image_url} alt={eq.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={48} /></div>
                  )}
                  <div className="absolute top-3 right-3">
                    <button onClick={(e) => { e.stopPropagation(); handleToggleEquipment(eq); }}
                      className={clsx("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors", eq.is_active ? "bg-emerald-500 text-white border-emerald-600" : "bg-slate-300 text-slate-600 border-slate-400")}>
                      {eq.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-black text-slate-800 text-lg">{eq.name}</h3>
                  <p className="text-xs text-amber-600 font-bold mt-1">{eq.partner_name}</p>
                  {eq.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{eq.description}</p>}
                  <button onClick={() => openDetail(eq)}
                    className="mt-4 w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-widest py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Settings size={14} /> Configurar Exercícios
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── DETAIL VIEW ───────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <button onClick={() => { setAdminView('list'); setSelectedEquipment(null); }} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium transition-colors">
        <ArrowLeft size={16} /> Voltar para equipamentos
      </button>

      {selectedEquipment && (
        <>
          {/* Equipment Header */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                  {selectedEquipment.image_url ? (
                    <img src={selectedEquipment.image_url} alt={selectedEquipment.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={24} /></div>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">{selectedEquipment.name}</h2>
                  <p className="text-xs text-amber-600 font-bold">{selectedEquipment.partner_name}</p>
                </div>
              </div>
              <button onClick={() => handleToggleEquipment(selectedEquipment)}
                className={clsx("px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-colors", selectedEquipment.is_active ? "bg-emerald-500 text-white border-emerald-600" : "bg-slate-300 text-slate-600 border-slate-400")}>
                {selectedEquipment.is_active ? 'Ativo' : 'Inativo'}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">URL da Imagem</label>
                <input value={editForm.image_url} onChange={e => setEditForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descrição</label>
                <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descrição curta do equipamento..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button onClick={handleSaveEquipment} disabled={isSaving}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
              </button>
              {saveSuccess && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Salvo!</span>}
            </div>
          </div>

          {/* Exercises */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                <Video size={16} className="text-amber-600" /> Exercícios em Vídeo
              </h3>
              <button onClick={openNewExercise}
                className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
                <Plus size={12} /> Adicionar Exercício
              </button>
            </div>

            {exercises.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Play size={36} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-bold">Nenhum exercício cadastrado.</p>
                <p className="text-xs mt-1">Clique em "Adicionar Exercício" para vincular vídeos a este equipamento.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {exercises.map((ex, idx) => {
                  const thumb = getExerciseThumbnail(ex);
                  return (
                    <div key={ex.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => handleMoveExercise(idx, 'up')} disabled={idx === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"><ChevronUp size={14} /></button>
                        <button onClick={() => handleMoveExercise(idx, 'down')} disabled={idx === exercises.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"><ChevronDown size={14} /></button>
                      </div>
                      <div className="w-20 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative group">
                        {thumb ? (
                          <img src={thumb} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300"><Play size={20} /></div>
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play size={16} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{ex.name}</p>
                        {ex.description && <p className="text-xs text-slate-400 truncate mt-0.5">{ex.description}</p>}
                        <p className="text-[10px] text-slate-300 truncate mt-0.5">{ex.video_url}</p>
                      </div>
                      <button onClick={() => openEditExercise(ex)} className="text-slate-400 hover:text-amber-600 transition-colors p-1" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleToggleExercise(ex)}
                        className={clsx("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors flex items-center gap-1", ex.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200")}>
                        {ex.is_active ? <><Eye size={10} /> Ativo</> : <><EyeOff size={10} /> Inativo</>}
                      </button>
                      <button onClick={() => handleRemoveExercise(ex.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1"><Trash2 size={16} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Exercise Modal */}
      {showExerciseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowExerciseModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800">{editingExercise ? 'Editar Exercício' : 'Novo Exercício'}</h3>
              <button onClick={() => setShowExerciseModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome do Exercício *</label>
                <input value={exerciseForm.name} onChange={e => setExerciseForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Footwork - Série Básica" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none" autoFocus />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descrição Breve</label>
                <textarea value={exerciseForm.description} onChange={e => setExerciseForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Exercício para fortalecimento de membros inferiores..." rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">URL do Vídeo *</label>
                <input value={exerciseForm.video_url} onChange={e => setExerciseForm(f => ({ ...f, video_url: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..." className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none" />
                <p className="text-[10px] text-slate-400 mt-1">Aceita YouTube, Vimeo ou link direto de vídeo (.mp4)</p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">URL da Miniatura (opcional)</label>
                <input value={exerciseForm.thumbnail_url} onChange={e => setExerciseForm(f => ({ ...f, thumbnail_url: e.target.value }))}
                  placeholder="Gerada automaticamente para YouTube" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none" />
                {exerciseForm.video_url && !exerciseForm.thumbnail_url && getAutoThumbnail(exerciseForm.video_url) && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={getAutoThumbnail(exerciseForm.video_url)} alt="preview" className="w-20 h-14 object-cover rounded-lg border" />
                    <span className="text-[10px] text-emerald-600 font-bold">Miniatura auto-detectada do YouTube</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowExerciseModal(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-bold transition-colors">Cancelar</button>
              <button onClick={handleSaveExercise} disabled={isSaving || !exerciseForm.name.trim() || !exerciseForm.video_url.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editingExercise ? 'Salvar Alterações' : 'Adicionar Exercício'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

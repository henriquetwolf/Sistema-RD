import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Loader2, Plus, Trash2, ChevronUp, ChevronDown,
  Search, X, MonitorPlay, ShoppingBag, GraduationCap, Settings,
  Eye, EyeOff, Image as ImageIcon, Save, CheckCircle2, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { StudioDigitalEquipment, StudioDigitalItem, OnlineCourse, Product } from '../types';

interface StudioDigitalManagerProps {
  onBack: () => void;
}

export const StudioDigitalManager: React.FC<StudioDigitalManagerProps> = ({ onBack }) => {
  const [adminView, setAdminView] = useState<'list' | 'detail'>('list');
  const [equipments, setEquipments] = useState<StudioDigitalEquipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<StudioDigitalEquipment | null>(null);
  const [items, setItems] = useState<StudioDigitalItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [allCourses, setAllCourses] = useState<OnlineCourse[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<'course' | 'product'>('course');
  const [addModalSearch, setAddModalSearch] = useState('');

  const [editForm, setEditForm] = useState<{ description: string; image_url: string }>({ description: '', image_url: '' });

  useEffect(() => { loadEquipments(); }, []);

  const loadEquipments = async () => {
    setIsLoading(true);
    try {
      const data = await appBackend.getStudioDigitalEquipments();
      setEquipments(data);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const openDetail = async (eq: StudioDigitalEquipment) => {
    setSelectedEquipment(eq);
    setEditForm({ description: eq.description || '', image_url: eq.image_url || '' });
    setAdminView('detail');
    await loadItems(eq.id);
    await loadCatalog();
  };

  const loadItems = async (equipmentId: string) => {
    try {
      const data = await appBackend.getStudioDigitalItems(equipmentId);
      setItems(data);
    } catch (e) { console.error(e); }
  };

  const loadCatalog = async () => {
    try {
      const [coursesRes, productsRes] = await Promise.all([
        appBackend.client.from('crm_online_courses').select('*').order('title'),
        appBackend.client.from('crm_products').select('*').order('name'),
      ]);
      setAllCourses((coursesRes.data || []) as OnlineCourse[]);
      setAllProducts((productsRes.data || []) as Product[]);
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
      await appBackend.upsertStudioDigitalEquipment({
        ...selectedEquipment,
        description: editForm.description,
        image_url: editForm.image_url,
      });
      setSelectedEquipment(prev => prev ? { ...prev, description: editForm.description, image_url: editForm.image_url } : null);
      setEquipments(prev => prev.map(e => e.id === selectedEquipment.id ? { ...e, description: editForm.description, image_url: editForm.image_url } : e));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) { console.error(e); alert('Erro ao salvar equipamento.'); } finally { setIsSaving(false); }
  };

  const openAddModal = (type: 'course' | 'product') => {
    setAddModalType(type);
    setAddModalSearch('');
    setShowAddModal(true);
  };

  const handleAddItem = async (itemId: string) => {
    if (!selectedEquipment) return;
    await appBackend.addStudioDigitalItem({ equipment_id: selectedEquipment.id, item_type: addModalType, item_id: itemId });
    await loadItems(selectedEquipment.id);
    setShowAddModal(false);
  };

  const handleRemoveItem = async (id: string) => {
    if (!window.confirm('Remover este vínculo?')) return;
    await appBackend.removeStudioDigitalItem(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleToggleItem = async (item: StudioDigitalItem) => {
    await appBackend.toggleStudioDigitalItemActive(item.id, !item.is_active);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i));
  };

  const handleMoveItem = async (idx: number, direction: 'up' | 'down') => {
    const sorted = [...items];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
    const updates = sorted.map((s, i) => ({ id: s.id, sort_order: i }));
    setItems(sorted.map((s, i) => ({ ...s, sort_order: i })));
    await appBackend.updateStudioDigitalItemOrder(updates);
  };

  const resolveItemName = (item: StudioDigitalItem): string => {
    if (item.item_type === 'course') {
      return allCourses.find(c => c.id === item.item_id)?.title || 'Curso não encontrado';
    }
    return allProducts.find(p => p.id === item.item_id)?.name || 'Produto não encontrado';
  };

  const resolveItemImage = (item: StudioDigitalItem): string | undefined => {
    if (item.item_type === 'course') return allCourses.find(c => c.id === item.item_id)?.imageUrl;
    return allProducts.find(p => p.id === item.item_id)?.imageUrl;
  };

  const linkedItemIds = useMemo(() => new Set(items.map(i => `${i.item_type}:${i.item_id}`)), [items]);

  const filteredModalItems = useMemo(() => {
    const term = addModalSearch.toLowerCase();
    if (addModalType === 'course') {
      return allCourses.filter(c => c.title.toLowerCase().includes(term));
    }
    return allProducts.filter(p => p.name.toLowerCase().includes(term));
  }, [addModalType, addModalSearch, allCourses, allProducts]);

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
            <p className="text-sm text-slate-500 mt-1">Configure quais cursos e produtos ficarão visíveis no Studio Digital do aluno.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
        ) : equipments.length === 0 ? (
          <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border-2 border-dashed">
            <MonitorPlay size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-bold">Nenhum equipamento cadastrado.</p>
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
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleEquipment(eq); }}
                      className={clsx("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors", eq.is_active ? "bg-emerald-500 text-white border-emerald-600" : "bg-slate-300 text-slate-600 border-slate-400")}
                    >
                      {eq.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-black text-slate-800 text-lg">{eq.name}</h3>
                  <p className="text-xs text-amber-600 font-bold mt-1">{eq.partner_name}</p>
                  {eq.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{eq.description}</p>}
                  <button
                    onClick={() => openDetail(eq)}
                    className="mt-4 w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-widest py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Settings size={14} /> Configurar
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
              <button
                onClick={() => handleToggleEquipment(selectedEquipment)}
                className={clsx("px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-colors", selectedEquipment.is_active ? "bg-emerald-500 text-white border-emerald-600" : "bg-slate-300 text-slate-600 border-slate-400")}
              >
                {selectedEquipment.is_active ? 'Ativo' : 'Inativo'}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">URL da Imagem</label>
                <input
                  value={editForm.image_url}
                  onChange={e => setEditForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descrição</label>
                <input
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descrição curta do equipamento..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button onClick={handleSaveEquipment} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
              </button>
              {saveSuccess && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Salvo!</span>}
            </div>
          </div>

          {/* Linked Items */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Itens Vinculados</h3>
              <div className="flex gap-2">
                <button onClick={() => openAddModal('course')} className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
                  <Plus size={12} /> Adicionar Curso
                </button>
                <button onClick={() => openAddModal('product')} className="bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
                  <Plus size={12} /> Adicionar Produto
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <ShoppingBag size={36} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-bold">Nenhum curso ou produto vinculado.</p>
                <p className="text-xs mt-1">Use os botões acima para vincular itens a este equipamento.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => handleMoveItem(idx, 'up')} disabled={idx === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"><ChevronUp size={14} /></button>
                      <button onClick={() => handleMoveItem(idx, 'down')} disabled={idx === items.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"><ChevronDown size={14} /></button>
                    </div>
                    <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      {resolveItemImage(item) ? (
                        <img src={resolveItemImage(item)} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          {item.item_type === 'course' ? <GraduationCap size={16} /> : <ShoppingBag size={16} />}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{resolveItemName(item)}</p>
                      <span className={clsx("text-[10px] font-black uppercase tracking-widest", item.item_type === 'course' ? "text-indigo-600" : "text-teal-600")}>
                        {item.item_type === 'course' ? 'Curso' : 'Produto'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleItem(item)}
                      className={clsx("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors flex items-center gap-1", item.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200")}
                    >
                      {item.is_active ? <><Eye size={10} /> Ativo</> : <><EyeOff size={10} /> Inativo</>}
                    </button>
                    <button onClick={() => handleRemoveItem(item.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800">
                Adicionar {addModalType === 'course' ? 'Curso' : 'Produto'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={addModalSearch}
                  onChange={e => setAddModalSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredModalItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">Nenhum item encontrado.</div>
              ) : (
                <div className="space-y-1">
                  {filteredModalItems.map((modalItem: any) => {
                    const id = modalItem.id;
                    const name = addModalType === 'course' ? modalItem.title : modalItem.name;
                    const image = modalItem.imageUrl || modalItem.image_url;
                    const alreadyLinked = linkedItemIds.has(`${addModalType}:${id}`);
                    return (
                      <button
                        key={id}
                        disabled={alreadyLinked}
                        onClick={() => handleAddItem(id)}
                        className={clsx("w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors", alreadyLinked ? "opacity-40 cursor-not-allowed bg-slate-50" : "hover:bg-slate-50 cursor-pointer")}
                      >
                        <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                          {image ? <img src={image} className="w-full h-full object-cover" alt="" /> : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              {addModalType === 'course' ? <GraduationCap size={16} /> : <ShoppingBag size={16} />}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
                          {alreadyLinked && <span className="text-[10px] text-slate-400 font-bold">Já vinculado</span>}
                        </div>
                        {!alreadyLinked && <Plus size={16} className="text-slate-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

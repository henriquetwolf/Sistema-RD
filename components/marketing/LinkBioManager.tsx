import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2, Plus, Trash2, Edit2, Eye, GripVertical, Globe, Image, Type,
  Minus, MessageCircle, ExternalLink, Loader2, X, Check, Smartphone,
  Copy, BarChart3,
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';

type ViewMode = 'list' | 'editor';

interface BioPage {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  avatar_url: string;
  bg_color: string;
  text_color: string;
  accent_color: string;
  is_active: boolean;
  view_count: number;
  created_at: string;
}

interface BioItem {
  id: string;
  bio_id: string;
  type: 'link' | 'button' | 'image' | 'text' | 'separator' | 'whatsapp';
  label: string;
  url: string;
  icon_name: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
}

const ITEM_TYPES = [
  { id: 'link', label: 'Link', icon: ExternalLink },
  { id: 'button', label: 'Botão', icon: Globe },
  { id: 'image', label: 'Imagem', icon: Image },
  { id: 'text', label: 'Texto', icon: Type },
  { id: 'separator', label: 'Separador', icon: Minus },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
];

const blankPage = (): BioPage => ({
  id: '',
  slug: '',
  title: '',
  subtitle: '',
  avatar_url: '',
  bg_color: '#ffffff',
  text_color: '#1f2937',
  accent_color: '#7c3aed',
  is_active: true,
  view_count: 0,
  created_at: new Date().toISOString(),
});

const blankItem = (bioId: string, type: string, order: number): BioItem => ({
  id: '',
  bio_id: bioId,
  type: type as BioItem['type'],
  label: '',
  url: '',
  icon_name: '',
  image_url: '',
  is_active: true,
  sort_order: order,
});

export const LinkBioManager: React.FC = () => {
  const [pages, setPages] = useState<BioPage[]>([]);
  const [view, setView] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(true);

  const [editingPage, setEditingPage] = useState<BioPage | null>(null);
  const [items, setItems] = useState<BioItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showAddType, setShowAddType] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await appBackend.getMarketingLinkBios();
      setPages(data as BioPage[]);
    } catch (e) {
      console.error('[LinkBio] load error', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEditor = async (page?: BioPage) => {
    const p = page ? { ...page } : blankPage();
    setEditingPage(p);
    setEditingItemId(null);
    setShowAddType(false);
    if (page?.id) {
      try {
        const data = await appBackend.getLinkBioItems(page.id);
        setItems(data as BioItem[]);
      } catch { setItems([]); }
    } else {
      setItems([]);
    }
    setView('editor');
  };

  const backToList = () => {
    setView('list');
    setEditingPage(null);
    setItems([]);
    load();
  };

  const savePage = async () => {
    if (!editingPage) return;
    const payload = { ...editingPage };
    if (!payload.id) payload.id = crypto.randomUUID();
    if (!payload.slug) payload.slug = payload.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || crypto.randomUUID().slice(0, 8);
    try {
      await appBackend.saveMarketingLinkBio(payload);
      setEditingPage(payload);
      for (const item of items) {
        const itemPayload = { ...item, bio_id: payload.id };
        if (!itemPayload.id) itemPayload.id = crypto.randomUUID();
        await appBackend.saveLinkBioItem(itemPayload);
      }
    } catch (e) {
      console.error('[LinkBio] save error', e);
    }
  };

  const deletePage = async (id: string) => {
    if (!confirm('Excluir esta página?')) return;
    try {
      await appBackend.deleteMarketingLinkBio(id);
      await load();
    } catch (e) {
      console.error('[LinkBio] delete error', e);
    }
  };

  const addItem = (type: string) => {
    if (!editingPage) return;
    const newItem = blankItem(editingPage.id || 'temp', type, items.length);
    newItem.id = crypto.randomUUID();
    setItems([...items, newItem]);
    setEditingItemId(newItem.id);
    setShowAddType(false);
  };

  const updateItem = (id: string, patch: Partial<BioItem>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const removeItem = async (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
    try { await appBackend.deleteLinkBioItem(id); } catch {}
    if (editingItemId === id) setEditingItemId(null);
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    const arr = [...items];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    arr.forEach((it, i) => it.sort_order = i);
    setItems(arr);
  };

  const copySlug = () => {
    if (!editingPage?.slug) return;
    navigator.clipboard.writeText(`https://vollpilates.com.br/bio/${editingPage.slug}`);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  const getItemTypeInfo = (type: string) => ITEM_TYPES.find(t => t.id === type) || ITEM_TYPES[0];

  // ── Loading ──
  if (isLoading && view === 'list') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // ═══════ LIST VIEW ═══════
  if (view === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Link2 className="w-6 h-6 text-purple-600" />
              Link da Bio
            </h2>
            <p className="text-sm text-gray-500 mt-1">Crie páginas de links personalizadas para suas redes sociais</p>
          </div>
          <button
            onClick={() => openEditor()}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Página
          </button>
        </div>

        {pages.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Link2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma página criada ainda</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pages.map(page => (
              <div key={page.id} className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    {page.avatar_url ? (
                      <img src={page.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-purple-100 flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-500 flex-shrink-0">
                        <Globe className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-800 truncate">{page.title || 'Sem título'}</h3>
                      <p className="text-xs text-gray-400 truncate">/{page.slug || '...'}</p>
                    </div>
                    <span className={clsx(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                      page.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      {page.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5" />
                      {page.view_count || 0} views
                    </span>
                  </div>
                </div>

                <div className="border-t px-4 py-2.5 flex items-center gap-1">
                  <button onClick={() => openEditor(page)} className="p-2 rounded-lg hover:bg-purple-50 text-gray-500 hover:text-purple-600 transition-colors" title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deletePage(page.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://vollpilates.com.br/bio/${page.slug}`);
                    }}
                    className="ml-auto p-2 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                    title="Copiar link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ═══════ EDITOR VIEW ═══════
  if (!editingPage) return null;

  return (
    <div className="space-y-4">
      {/* Editor header */}
      <div className="flex items-center gap-4">
        <button onClick={backToList} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-800 flex-1 truncate">
          {editingPage.id ? 'Editar Página' : 'Nova Página'}
        </h2>
        <button
          onClick={async () => { await savePage(); backToList(); }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Check className="w-4 h-4" /> Salvar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Settings + Items ── */}
        <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-200px)] pr-1">
          {/* Page settings */}
          <div className="bg-white rounded-2xl border p-5 space-y-4">
            <h3 className="font-semibold text-gray-700 text-sm">Configurações da Página</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Slug (URL)</label>
                <div className="flex gap-2">
                  <input
                    value={editingPage.slug}
                    onChange={e => setEditingPage({ ...editingPage, slug: e.target.value })}
                    placeholder="minha-pagina"
                    className="flex-1 border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                  />
                  <button
                    onClick={copySlug}
                    className={clsx('p-2 rounded-xl border transition-colors', copiedSlug ? 'bg-emerald-50 border-emerald-300 text-emerald-600' : 'hover:bg-gray-50 text-gray-400')}
                    title="Copiar link"
                  >
                    {copiedSlug ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Título</label>
                <input
                  value={editingPage.title}
                  onChange={e => setEditingPage({ ...editingPage, title: e.target.value })}
                  placeholder="VOLL Pilates"
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Subtítulo</label>
                <input
                  value={editingPage.subtitle}
                  onChange={e => setEditingPage({ ...editingPage, subtitle: e.target.value })}
                  placeholder="Saúde, movimento e bem-estar"
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Avatar URL</label>
                <input
                  value={editingPage.avatar_url}
                  onChange={e => setEditingPage({ ...editingPage, avatar_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                />
              </div>
            </div>

            {/* Colors */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Cores</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-gray-400 block mb-1">Fundo</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingPage.bg_color}
                      onChange={e => setEditingPage({ ...editingPage, bg_color: e.target.value })}
                      className="w-8 h-8 rounded-lg border cursor-pointer"
                    />
                    <input
                      value={editingPage.bg_color}
                      onChange={e => setEditingPage({ ...editingPage, bg_color: e.target.value })}
                      className="flex-1 border rounded-lg px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-purple-300 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block mb-1">Texto</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingPage.text_color}
                      onChange={e => setEditingPage({ ...editingPage, text_color: e.target.value })}
                      className="w-8 h-8 rounded-lg border cursor-pointer"
                    />
                    <input
                      value={editingPage.text_color}
                      onChange={e => setEditingPage({ ...editingPage, text_color: e.target.value })}
                      className="flex-1 border rounded-lg px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-purple-300 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block mb-1">Destaque</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingPage.accent_color}
                      onChange={e => setEditingPage({ ...editingPage, accent_color: e.target.value })}
                      className="w-8 h-8 rounded-lg border cursor-pointer"
                    />
                    <input
                      value={editingPage.accent_color}
                      onChange={e => setEditingPage({ ...editingPage, accent_color: e.target.value })}
                      className="flex-1 border rounded-lg px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-purple-300 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700 text-sm">Itens ({items.length})</h3>
              <div className="relative">
                <button
                  onClick={() => setShowAddType(!showAddType)}
                  className="flex items-center gap-1.5 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
                {showAddType && (
                  <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg py-1 z-20 w-44">
                    {ITEM_TYPES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => addItem(t.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                      >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {items.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum item adicionado</p>
            )}

            <div className="space-y-2">
              {items.map((item, idx) => {
                const typeInfo = getItemTypeInfo(item.type);
                const TypeIcon = typeInfo.icon;
                const isEditing = editingItemId === item.id;
                return (
                  <div key={item.id} className={clsx('border rounded-xl overflow-hidden transition-colors', isEditing ? 'border-purple-300 bg-purple-50/50' : 'bg-gray-50')}>
                    {/* Item row */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      <TypeIcon className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate flex-1">
                        {item.label || item.url || typeInfo.label}
                      </span>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-white text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                        </button>
                        <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} className="p-1 rounded hover:bg-white text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                        </button>
                        <button
                          onClick={() => setEditingItemId(isEditing ? null : item.id)}
                          className={clsx('p-1 rounded transition-colors', isEditing ? 'bg-purple-200 text-purple-700' : 'hover:bg-white text-gray-400 hover:text-purple-600')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateItem(item.id, { is_active: !item.is_active })}
                          className={clsx('p-1 rounded transition-colors', item.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-300 hover:bg-gray-100')}
                          title={item.is_active ? 'Desativar' : 'Ativar'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeItem(item.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline editor */}
                    {isEditing && (
                      <div className="px-4 pb-3 pt-1 space-y-2 border-t border-purple-200">
                        {(item.type !== 'separator') && (
                          <div>
                            <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Label</label>
                            <input
                              value={item.label}
                              onChange={e => updateItem(item.id, { label: e.target.value })}
                              placeholder="Texto do item"
                              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-purple-300 outline-none"
                            />
                          </div>
                        )}
                        {(['link', 'button', 'whatsapp'].includes(item.type)) && (
                          <div>
                            <label className="text-[10px] font-medium text-gray-500 block mb-0.5">
                              {item.type === 'whatsapp' ? 'Número (com DDD)' : 'URL'}
                            </label>
                            <input
                              value={item.url}
                              onChange={e => updateItem(item.id, { url: e.target.value })}
                              placeholder={item.type === 'whatsapp' ? '5511999999999' : 'https://...'}
                              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-purple-300 outline-none"
                            />
                          </div>
                        )}
                        {item.type === 'image' && (
                          <div>
                            <label className="text-[10px] font-medium text-gray-500 block mb-0.5">URL da Imagem</label>
                            <input
                              value={item.image_url}
                              onChange={e => updateItem(item.id, { image_url: e.target.value })}
                              placeholder="https://..."
                              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-purple-300 outline-none"
                            />
                          </div>
                        )}
                        {(['link', 'button'].includes(item.type)) && (
                          <div>
                            <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Ícone (opcional)</label>
                            <input
                              value={item.icon_name}
                              onChange={e => updateItem(item.id, { icon_name: e.target.value })}
                              placeholder="ex: star, heart, globe"
                              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-purple-300 outline-none"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Phone Preview ── */}
        <div className="flex justify-center lg:sticky lg:top-4 self-start">
          <div className="relative">
            <div className="flex items-center gap-2 mb-3 justify-center">
              <Smartphone className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-400">Preview</span>
            </div>

            {/* Phone frame */}
            <div className="w-[320px] h-[580px] rounded-[2.5rem] border-[6px] border-gray-800 bg-gray-800 shadow-2xl overflow-hidden relative">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-800 rounded-b-2xl z-10" />

              {/* Screen */}
              <div
                className="w-full h-full rounded-[2rem] overflow-y-auto"
                style={{ backgroundColor: editingPage.bg_color }}
              >
                <div className="pt-12 pb-8 px-6 flex flex-col items-center">
                  {/* Avatar */}
                  {editingPage.avatar_url ? (
                    <img
                      src={editingPage.avatar_url}
                      alt=""
                      className="w-20 h-20 rounded-full object-cover border-4 mb-3"
                      style={{ borderColor: editingPage.accent_color }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center mb-3 border-4"
                      style={{ borderColor: editingPage.accent_color, backgroundColor: editingPage.accent_color + '20' }}
                    >
                      <Globe className="w-8 h-8" style={{ color: editingPage.accent_color }} />
                    </div>
                  )}

                  {/* Title */}
                  <h3
                    className="text-lg font-bold text-center mb-0.5"
                    style={{ color: editingPage.text_color }}
                  >
                    {editingPage.title || 'Título'}
                  </h3>
                  {editingPage.subtitle && (
                    <p
                      className="text-xs text-center mb-5 opacity-70"
                      style={{ color: editingPage.text_color }}
                    >
                      {editingPage.subtitle}
                    </p>
                  )}

                  {/* Items preview */}
                  <div className="w-full space-y-2.5">
                    {items.filter(it => it.is_active).map(item => {
                      if (item.type === 'separator') {
                        return <div key={item.id} className="border-t opacity-20 my-3" style={{ borderColor: editingPage.text_color }} />;
                      }
                      if (item.type === 'text') {
                        return (
                          <p key={item.id} className="text-xs text-center px-2" style={{ color: editingPage.text_color }}>
                            {item.label || '...'}
                          </p>
                        );
                      }
                      if (item.type === 'image' && item.image_url) {
                        return (
                          <img
                            key={item.id}
                            src={item.image_url}
                            alt={item.label}
                            className="w-full rounded-xl object-cover max-h-40"
                          />
                        );
                      }
                      if (item.type === 'whatsapp') {
                        return (
                          <div
                            key={item.id}
                            className="w-full py-3 px-4 rounded-xl text-center text-sm font-medium flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#25D366', color: '#fff' }}
                          >
                            <MessageCircle className="w-4 h-4" />
                            {item.label || 'WhatsApp'}
                          </div>
                        );
                      }
                      return (
                        <div
                          key={item.id}
                          className={clsx(
                            'w-full py-3 px-4 rounded-xl text-center text-sm font-medium transition-transform hover:scale-[1.02]',
                            item.type === 'button' ? '' : 'border'
                          )}
                          style={
                            item.type === 'button'
                              ? { backgroundColor: editingPage.accent_color, color: '#fff' }
                              : { borderColor: editingPage.accent_color, color: editingPage.text_color }
                          }
                        >
                          {item.label || 'Link'}
                        </div>
                      );
                    })}
                  </div>

                  {/* Branding */}
                  <p className="text-[9px] mt-8 opacity-30" style={{ color: editingPage.text_color }}>
                    Feito com VOLL Marketing
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

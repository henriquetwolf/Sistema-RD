import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Share2, Plus, Search, Trash2, Edit2, Calendar, Clock, Image,
  Loader2, X, Check, Eye, Send, AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';

type ViewMode = 'list' | 'calendar';

interface SocialPost {
  id: string;
  platform: string;
  content: string;
  media_urls: string[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduled_at: string;
  published_at?: string;
  created_at: string;
}

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', color: 'bg-gradient-to-br from-purple-500 to-pink-500', text: 'text-white', dot: 'bg-pink-500' },
  { id: 'facebook', label: 'Facebook', color: 'bg-blue-600', text: 'text-white', dot: 'bg-blue-600' },
  { id: 'linkedin', label: 'LinkedIn', color: 'bg-sky-700', text: 'text-white', dot: 'bg-sky-700' },
  { id: 'twitter', label: 'X / Twitter', color: 'bg-black', text: 'text-white', dot: 'bg-black' },
  { id: 'tiktok', label: 'TikTok', color: 'bg-gray-900', text: 'text-white', dot: 'bg-gray-900' },
];

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Rascunho' },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Agendado' },
  published: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Publicado' },
  failed: { bg: 'bg-red-100', text: 'text-red-600', label: 'Falhou' },
};

const CHAR_LIMITS: Record<string, number> = {
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
  twitter: 280,
  tiktok: 2200,
};

const platformIcon = (id: string) => {
  switch (id) {
    case 'instagram': return '📷';
    case 'facebook': return '📘';
    case 'linkedin': return '💼';
    case 'twitter': return '𝕏';
    case 'tiktok': return '🎵';
    default: return '🌐';
  }
};

const blankPost = (): SocialPost => ({
  id: '',
  platform: 'instagram',
  content: '',
  media_urls: [],
  status: 'draft',
  scheduled_at: '',
  created_at: new Date().toISOString(),
});

export const SocialMediaManager: React.FC = () => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [view, setView] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await appBackend.getSocialPosts();
      setPosts(data as SocialPost[]);
    } catch (e) {
      console.error('[SocialMedia] load error', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = posts;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p => (p.content || '').toLowerCase().includes(q));
    }
    if (filterPlatform) list = list.filter(p => p.platform === filterPlatform);
    if (filterStatus) list = list.filter(p => p.status === filterStatus);
    return list;
  }, [posts, searchTerm, filterPlatform, filterStatus]);

  const openEditor = (post?: SocialPost) => {
    setEditingPost(post ? { ...post } : blankPost());
    setNewMediaUrl('');
    setShowPreview(false);
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingPost(null);
  };

  const savePost = async (publish?: boolean) => {
    if (!editingPost) return;
    const payload = { ...editingPost };
    if (publish) {
      payload.status = 'published';
      payload.published_at = new Date().toISOString();
    }
    if (!payload.id) payload.id = crypto.randomUUID();
    try {
      await appBackend.saveSocialPost(payload);
      await load();
      closeEditor();
    } catch (e) {
      console.error('[SocialMedia] save error', e);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm('Excluir este post?')) return;
    try {
      await appBackend.deleteSocialPost(id);
      await load();
    } catch (e) {
      console.error('[SocialMedia] delete error', e);
    }
  };

  const addMediaUrl = () => {
    if (!newMediaUrl.trim() || !editingPost) return;
    setEditingPost({ ...editingPost, media_urls: [...(editingPost.media_urls || []), newMediaUrl.trim()] });
    setNewMediaUrl('');
  };

  const removeMedia = (idx: number) => {
    if (!editingPost) return;
    const urls = [...editingPost.media_urls];
    urls.splice(idx, 1);
    setEditingPost({ ...editingPost, media_urls: urls });
  };

  const getPlatformMeta = (id: string) => PLATFORMS.find(p => p.id === id) || PLATFORMS[0];

  // ── Calendar helpers ──
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const monthLabel = new Date(calYear, calMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const postsForDay = (day: number) => {
    return posts.filter(p => {
      if (!p.scheduled_at) return false;
      const d = new Date(p.scheduled_at);
      return d.getFullYear() === calYear && d.getMonth() === calMonth && d.getDate() === day;
    });
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
    setSelectedDay(null);
  };

  // ── Render ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Share2 className="w-6 h-6 text-purple-600" />
            Mídias Sociais
          </h2>
          <p className="text-sm text-gray-500 mt-1">Agende e publique posts nas redes sociais</p>
        </div>
        <button
          onClick={() => openEditor()}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Post
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['list', 'calendar'] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              view === v ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {v === 'list' ? 'Lista' : 'Calendário'}
          </button>
        ))}
      </div>

      {/* ═══════ LIST VIEW ═══════ */}
      {view === 'list' && (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por conteúdo..."
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
              />
            </div>
            <select
              value={filterPlatform}
              onChange={e => setFilterPlatform(e.target.value)}
              className="px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
            >
              <option value="">Todas plataformas</option>
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
            >
              <option value="">Todos status</option>
              {Object.entries(STATUS_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Share2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum post encontrado</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map(post => {
                const pm = getPlatformMeta(post.platform);
                const st = STATUS_STYLE[post.status] || STATUS_STYLE.draft;
                return (
                  <div key={post.id} className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    {/* Platform header */}
                    <div className={clsx('px-4 py-2.5 flex items-center gap-2', pm.color, pm.text)}>
                      <span className="text-lg">{platformIcon(post.platform)}</span>
                      <span className="font-medium text-sm">{pm.label}</span>
                      <span className={clsx('ml-auto text-xs px-2 py-0.5 rounded-full', st.bg, st.text)}>{st.label}</span>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">
                        {post.content || '(sem conteúdo)'}
                      </p>

                      {/* Media thumbnails */}
                      {post.media_urls?.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {post.media_urls.slice(0, 4).map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt=""
                              className="w-16 h-16 rounded-lg object-cover border flex-shrink-0"
                              onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect fill=%22%23e5e7eb%22 width=%2240%22 height=%2240%22/><text x=%2220%22 y=%2224%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2212%22>img</text></svg>'; }}
                            />
                          ))}
                          {post.media_urls.length > 4 && (
                            <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-medium flex-shrink-0">
                              +{post.media_urls.length - 4}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Scheduled date */}
                      {post.scheduled_at && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(post.scheduled_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="border-t px-4 py-2.5 flex items-center gap-1">
                      <button onClick={() => openEditor(post)} className="p-2 rounded-lg hover:bg-purple-50 text-gray-500 hover:text-purple-600 transition-colors" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deletePost(post.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {post.status === 'draft' && (
                        <button
                          onClick={async () => {
                            const p = { ...post, status: 'published' as const, published_at: new Date().toISOString() };
                            await appBackend.saveSocialPost(p);
                            await load();
                          }}
                          className="ml-auto flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" /> Publicar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════ CALENDAR VIEW ═══════ */}
      {view === 'calendar' && (
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          {/* Calendar nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h3 className="text-lg font-semibold text-gray-700 capitalize">{monthLabel}</h3>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Week headers */}
          <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-400 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d}>{d}</div>)}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-gray-50 min-h-[80px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayPosts = postsForDay(day);
              const isSelected = selectedDay === day;
              const isToday = new Date().getDate() === day && new Date().getMonth() === calMonth && new Date().getFullYear() === calYear;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={clsx(
                    'bg-white min-h-[80px] p-2 text-left transition-colors hover:bg-purple-50 relative',
                    isSelected && 'ring-2 ring-purple-400 bg-purple-50'
                  )}
                >
                  <span className={clsx(
                    'text-xs font-medium',
                    isToday ? 'bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-600'
                  )}>
                    {day}
                  </span>
                  {dayPosts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {dayPosts.slice(0, 3).map(p => (
                        <span key={p.id} className={clsx('w-2.5 h-2.5 rounded-full', getPlatformMeta(p.platform).dot)} title={getPlatformMeta(p.platform).label} />
                      ))}
                      {dayPosts.length > 3 && <span className="text-[10px] text-gray-400">+{dayPosts.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected day posts */}
          {selectedDay !== null && (
            <div className="mt-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-600">
                Posts em {selectedDay}/{calMonth + 1}/{calYear}
              </h4>
              {postsForDay(selectedDay).length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum post neste dia.</p>
              ) : (
                postsForDay(selectedDay).map(p => {
                  const pm = getPlatformMeta(p.platform);
                  const st = STATUS_STYLE[p.status] || STATUS_STYLE.draft;
                  return (
                    <div key={p.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border">
                      <span className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-sm', pm.color, pm.text)}>
                        {platformIcon(p.platform)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{p.content || '(sem conteúdo)'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', st.bg, st.text)}>{st.label}</span>
                          {p.scheduled_at && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {new Date(p.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => openEditor(p)} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-purple-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════ POST EDITOR MODAL ═══════ */}
      {showEditor && editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeEditor}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingPost.id ? 'Editar Post' : 'Novo Post'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={clsx(
                    'p-2 rounded-lg transition-colors',
                    showPreview ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-500'
                  )}
                  title="Preview"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button onClick={closeEditor} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Platform selector */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Plataforma</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setEditingPost({ ...editingPost, platform: p.id })}
                      className={clsx(
                        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border-2',
                        editingPost.platform === p.id
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <span>{platformIcon(p.id)}</span>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                  <span>Conteúdo</span>
                  <span className={clsx(
                    'text-xs',
                    (editingPost.content?.length || 0) > (CHAR_LIMITS[editingPost.platform] || 2200)
                      ? 'text-red-500 font-semibold' : 'text-gray-400'
                  )}>
                    {editingPost.content?.length || 0} / {CHAR_LIMITS[editingPost.platform] || 2200}
                  </span>
                </label>
                <textarea
                  value={editingPost.content || ''}
                  onChange={e => setEditingPost({ ...editingPost, content: e.target.value })}
                  rows={6}
                  className="w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none resize-none"
                  placeholder="Escreva o conteúdo do post..."
                />
              </div>

              {/* Media */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Mídias</label>
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={newMediaUrl}
                      onChange={e => setNewMediaUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addMediaUrl()}
                      placeholder="Cole a URL da imagem ou vídeo..."
                      className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                    />
                  </div>
                  <button
                    onClick={addMediaUrl}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {editingPost.media_urls?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editingPost.media_urls.map((url: string, i: number) => (
                      <div key={i} className="relative group">
                        <img
                          src={url}
                          alt=""
                          className="w-20 h-20 rounded-lg object-cover border"
                          onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect fill=%22%23e5e7eb%22 width=%2240%22 height=%2240%22/><text x=%2220%22 y=%2224%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2212%22>img</text></svg>'; }}
                        />
                        <button
                          onClick={() => removeMedia(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status + schedule */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                  <select
                    value={editingPost.status}
                    onChange={e => setEditingPost({ ...editingPost, status: e.target.value as SocialPost['status'] })}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="scheduled">Agendado</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Agendar para</label>
                  <input
                    type="datetime-local"
                    value={editingPost.scheduled_at ? editingPost.scheduled_at.slice(0, 16) : ''}
                    onChange={e => setEditingPost({ ...editingPost, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                  />
                </div>
              </div>

              {/* Preview */}
              {showPreview && (
                <div className="border rounded-2xl p-5 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
                    <Eye className="w-4 h-4" /> Preview
                  </h4>
                  <div className="bg-white rounded-xl border p-4 max-w-sm mx-auto">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center', getPlatformMeta(editingPost.platform).color, getPlatformMeta(editingPost.platform).text)}>
                        <span className="text-sm">{platformIcon(editingPost.platform)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">VOLL Pilates</p>
                        <p className="text-[10px] text-gray-400">
                          {editingPost.scheduled_at
                            ? new Date(editingPost.scheduled_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                            : 'Agora'}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{editingPost.content || '...'}</p>
                    {editingPost.media_urls?.length > 0 && (
                      <div className="rounded-lg overflow-hidden border">
                        <img
                          src={editingPost.media_urls[0]}
                          alt=""
                          className="w-full h-48 object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
              <button onClick={closeEditor} className="px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => savePost()}
                className="px-5 py-2.5 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors"
              >
                <Check className="w-4 h-4 inline mr-1.5" />
                Salvar
              </button>
              <button
                onClick={() => {
                  if (editingPost.status !== 'published') {
                    setEditingPost({ ...editingPost, status: 'scheduled' });
                  }
                  savePost();
                }}
                className="px-5 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
              >
                <Calendar className="w-4 h-4 inline mr-1.5" />
                Agendar
              </button>
              <button
                onClick={() => savePost(true)}
                className="px-5 py-2.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
              >
                <Send className="w-4 h-4 inline mr-1.5" />
                Publicar Agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

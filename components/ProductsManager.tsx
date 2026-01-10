
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Plus, Search, MoreVertical, Edit2, Trash2, 
  ExternalLink, ArrowLeft, Save, X, Tag, MonitorPlay, 
  DollarSign, Globe, Loader2, CheckCircle2, AlertCircle, Award, 
  BookOpen, Video, ListTodo, ChevronRight, GripVertical, ChevronDown, ChevronUp, Image as ImageIcon,
  Info, Upload
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { Product, CertificateModel, CourseModule, CourseLesson } from '../types';

interface ProductsManagerProps {
  onBack: () => void;
}

const CATEGORIES = ['Curso Online', 'E-book', 'Mentoria', 'Webinar', 'Assinatura/Comunidade', 'Workshop Online'];
const PLATFORMS = ['Hotmart', 'Eduzz', 'Monetizze', 'Kiwify', 'Plataforma Própria', 'Outros'];

export const ProductsManager: React.FC<ProductsManagerProps> = ({ onBack }) => {
  const [viewMode, setViewMode] = useState<'list' | 'builder'>('list');
  const [products, setProducts] = useState<Product[]>([]);
  const [certificates, setCertificates] = useState<CertificateModel[]>([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Builder States
  const [selectedCourse, setSelectedCourse] = useState<Product | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Record<string, CourseLesson[]>>({}); // Key: ModuleId
  const [isLoadingBuilder, setIsLoadingBuilder] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const initialFormState: Product = {
      id: '',
      name: '',
      category: 'Curso Online',
      platform: 'Plataforma Própria',
      price: 0,
      url: '',
      status: 'active',
      description: '',
      certificateTemplateId: '',
      createdAt: '',
      thumbnailUrl: ''
  };
  const [formData, setFormData] = useState<Product>(initialFormState);

  useEffect(() => {
      fetchProducts();
      fetchCertificates();
  }, []);

  const fetchProducts = async () => {
      setIsLoading(true);
      try {
          const { data, error } = await appBackend.client
              .from('crm_products')
              .select('*')
              .order('name', { ascending: true });

          if (error) throw error;

          const mapped = (data || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              platform: p.platform,
              price: Number(p.price || 0),
              url: p.url,
              status: p.status,
              description: p.description,
              certificateTemplateId: p.certificate_template_id,
              createdAt: p.created_at,
              thumbnailUrl: p.thumbnail_url
          }));
          setProducts(mapped);
      } catch (e: any) {
          console.error("Erro ao buscar produtos:", e);
      } finally {
          setIsLoading(false);
      }
  };

  const fetchCertificates = async () => {
      try {
          const data = await appBackend.getCertificates();
          setCertificates(data);
      } catch (e) {
          console.error("Erro ao buscar certificados", e);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setFormData(prev => ({ ...prev, thumbnailUrl: reader.result as string }));
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleSave = async () => {
      if (!formData.name) {
          alert("O nome do produto é obrigatório.");
          return;
      }

      setIsSaving(true);
      
      const payload = {
          name: formData.name,
          category: formData.category,
          platform: formData.platform,
          price: parseFloat(String(formData.price)) || 0,
          url: formData.url,
          status: formData.status,
          description: formData.description,
          certificate_template_id: formData.certificateTemplateId || null,
          thumbnail_url: formData.thumbnailUrl || null
      };

      try {
          const isUpdate = !!formData.id;
          if (isUpdate) {
              const { error } = await appBackend.client.from('crm_products').update(payload).eq('id', formData.id);
              if (error) throw error;
              await appBackend.logActivity({ action: 'update', module: 'products', details: `Editou produto digital: ${formData.name}`, recordId: formData.id });
          } else {
              const { data, error } = await appBackend.client.from('crm_products').insert([payload]).select().single();
              if (error) throw error;
              await appBackend.logActivity({ action: 'create', module: 'products', details: `Cadastrou produto digital: ${formData.name}`, recordId: data?.id });
          }
          await fetchProducts();
          setShowModal(false);
          setFormData(initialFormState);
          alert("Produto digital salvo com sucesso!");
      } catch (e: any) {
          console.error("Erro detalhado ao salvar produto:", e);
          alert(`Erro ao salvar produto: ${e.message || 'Verifique sua conexão e tente novamente.'}`);
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async (id: string) => {
      const target = products.find(p => p.id === id);
      if (window.confirm("Tem certeza que deseja excluir este produto?")) {
          try {
              const { error } = await appBackend.client.from('crm_products').delete().eq('id', id);
              if (error) throw error;
              await appBackend.logActivity({ action: 'delete', module: 'products', details: `Excluiu produto digital: ${target?.name}`, recordId: id });
              setProducts(prev => prev.filter(p => p.id !== id));
          } catch (e: any) {
              alert(`Erro ao excluir: ${e.message}`);
          }
      }
      setActiveMenuId(null);
  };

  const handleEdit = (product: Product) => {
      setFormData({ ...product });
      setActiveMenuId(null);
      setShowModal(true);
  };

  const openCourseBuilder = async (course: Product) => {
      setSelectedCourse(course);
      setIsLoadingBuilder(true);
      setViewMode('builder');
      try {
          const mods = await appBackend.getCourseModules(course.id);
          setModules(mods);
          const lessonsMap: Record<string, CourseLesson[]> = {};
          for (const m of mods) {
              const les = await appBackend.getCourseLessons(m.id);
              lessonsMap[m.id] = les;
          }
          setLessons(lessonsMap);
          setExpandedModules(mods.map(m => m.id));
      } catch (e) {
          alert("Erro ao carregar grade do curso.");
      } finally {
          setIsLoadingBuilder(false);
      }
  };

  const handleAddModule = async () => {
      if (!selectedCourse) return;
      const title = prompt("Título do Módulo:");
      if (!title) return;
      
      const newModule: Partial<CourseModule> = {
          courseId: selectedCourse.id,
          title,
          order: modules.length + 1
      };
      await appBackend.saveCourseModule(newModule);
      const updated = await appBackend.getCourseModules(selectedCourse.id);
      setModules(updated);
      setExpandedModules(prev => [...prev, updated[updated.length-1].id]);
  };

  const handleAddLesson = async (moduleId: string) => {
      const title = prompt("Título da Aula:");
      if (!title) return;
      const videoUrl = prompt("Link do YouTube da Aula:");
      const description = prompt("Descrição da Aula:");

      const newLesson: Partial<CourseLesson> = {
          moduleId,
          title,
          videoUrl: videoUrl || '',
          description: description || '',
          order: (lessons[moduleId]?.length || 0) + 1
      };

      await appBackend.saveCourseLesson(newLesson);
      const updatedLes = await appBackend.getCourseLessons(moduleId);
      setLessons(prev => ({ ...prev, [moduleId]: updatedLes }));
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (viewMode === 'builder' && selectedCourse) {
      return (
          <div className="animate-in fade-in duration-300 flex flex-col h-[calc(100vh-140px)]">
              <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0 shadow-sm z-10">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                          <ArrowLeft size={20} />
                      </button>
                      <div>
                          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                              <BookOpen className="text-teal-600" /> Grade do Curso: {selectedCourse.name}
                          </h2>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Estrutura LMS do Conteúdo</p>
                      </div>
                  </div>
                  <button onClick={handleAddModule} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl font-black text-sm flex items-center gap-2 active:scale-95 transition-all">
                      <Plus size={18}/> Novo Módulo
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
                  {isLoadingBuilder ? (
                      <div className="flex justify-center items-center h-64"><Loader2 size={32} className="animate-spin text-teal-600" /></div>
                  ) : (
                      <div className="max-w-4xl mx-auto space-y-4">
                          {modules.length === 0 ? (
                              <div className="text-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400">
                                  <ListTodo size={48} className="mx-auto mb-4 opacity-20" />
                                  <p className="font-bold">Nenhum módulo criado ainda.</p>
                                  <p className="text-sm mt-1">Comece adicionando o primeiro bloco de aulas.</p>
                              </div>
                          ) : (
                              modules.map(mod => (
                                  <div key={mod.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group">
                                      <div className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedModules(prev => prev.includes(mod.id) ? prev.filter(i => i !== mod.id) : [...prev, mod.id])}>
                                          <div className="flex items-center gap-4">
                                              <GripVertical size={18} className="text-slate-300" />
                                              <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-black text-sm">{mod.order}</span>
                                              <h3 className="font-black text-slate-700">{mod.title}</h3>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              <button onClick={(e) => { e.stopPropagation(); handleAddLesson(mod.id); }} className="px-3 py-1 bg-teal-50 text-teal-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-teal-100 hover:bg-teal-100">Add Aula</button>
                                              <button onClick={(e) => { e.stopPropagation(); if(window.confirm("Excluir módulo e todas as aulas?")) appBackend.deleteCourseModule(mod.id).then(() => setModules(prev => prev.filter(m => m.id !== mod.id))); }} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                              {expandedModules.includes(mod.id) ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                          </div>
                                      </div>

                                      {expandedModules.includes(mod.id) && (
                                          <div className="p-4 bg-slate-50/50 border-t border-slate-100 space-y-2">
                                              {(lessons[mod.id] || []).map(lesson => (
                                                  <div key={lesson.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group/les hover:border-teal-200 transition-all">
                                                      <div className="flex items-center gap-4 flex-1 min-w-0">
                                                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover/les:bg-teal-600 group-hover/les:text-white transition-all"><Video size={20}/></div>
                                                          <div className="min-w-0 flex-1">
                                                              <p className="font-bold text-slate-800 text-sm truncate">{lesson.title}</p>
                                                              <p className="text-[10px] text-slate-400 truncate opacity-60 font-mono">{lesson.videoUrl}</p>
                                                          </div>
                                                      </div>
                                                      <button onClick={() => { if(window.confirm("Excluir aula?")) appBackend.deleteCourseLesson(lesson.id).then(async () => { const up = await appBackend.getCourseLessons(mod.id); setLessons(prev => ({...prev, [mod.id]: up})); }); }} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/les:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                                  </div>
                                              ))}
                                              {(lessons[mod.id] || []).length === 0 && <p className="text-center py-4 text-xs text-slate-400 italic">Nenhuma aula neste módulo.</p>}
                                          </div>
                                      )}
                                  </div>
                              ))
                          )}
                      </div>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ShoppingBag className="text-indigo-600" /> Produtos Digitais
                    </h2>
                    <p className="text-slate-500 text-sm">Cursos online, e-books e conteúdos digitais.</p>
                </div>
            </div>
            <button 
                onClick={() => { setFormData(initialFormState); setShowModal(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
            >
                <Plus size={18} /> Novo Produto
            </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar produto por nome..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
                <div className="col-span-full flex justify-center py-20 flex-1 items-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
            ) : filtered.length === 0 ? (
                <div className="col-span-full text-center py-20 text-slate-400 border-2 border-dashed rounded-[2rem] bg-white border-slate-200">
                    <ImageIcon className="mx-auto mb-4 opacity-10" size={64}/>
                    <p className="font-bold">Nenhum produto digital cadastrado.</p>
                </div>
            ) : (
                filtered.map(product => (
                    <div key={product.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col group border-b-4 border-b-indigo-500">
                        <div className="h-36 bg-slate-50 relative overflow-hidden shrink-0">
                            {product.thumbnailUrl ? (
                                <img src={product.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={32}/></div>
                            )}
                            <div className="absolute top-4 left-4"><span className={clsx("text-[9px] font-black px-2 py-0.5 rounded uppercase border", product.status === 'active' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>{product.status === 'active' ? 'Ativo' : 'Inativo'}</span></div>
                        </div>

                        <div className="p-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-black text-slate-800 text-lg leading-tight truncate pr-4">{product.name}</h3>
                                <div className="relative">
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === product.id ? null : product.id); }} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 product-menu-btn"><MoreVertical size={18} /></button>
                                    {activeMenuId === product.id && (
                                        <div className="absolute right-0 top-8 w-40 bg-white rounded-xl shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                            <button onClick={() => handleEdit(product)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit2 size={14} /> Editar Produto</button>
                                            {product.category === 'Curso Online' && <button onClick={() => openCourseBuilder(product)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2"><ListTodo size={14} /> Editar Grade</button>}
                                            <div className="h-px bg-slate-100 my-1"></div>
                                            <button onClick={() => handleDelete(product.id)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Excluir</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1"><Tag size={10} className="text-indigo-400"/> {product.category}</p>
                            <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-6 flex-1">{product.description || 'Nenhuma descrição cadastrada.'}</p>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                                <span className="font-black text-slate-800 text-xl">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}</span>
                                <div className="flex gap-2">
                                    {product.category === 'Curso Online' && <button onClick={() => openCourseBuilder(product)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Editar Grade"><ListTodo size={18} /></button>}
                                    {product.url && <a href={product.url} target="_blank" rel="noreferrer" className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-800 hover:text-white transition-all shadow-sm"><ExternalLink size={18} /></a>}
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>

        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2rem] shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl"><Plus size={24}/></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 leading-tight">{formData.id ? 'Editar Produto' : 'Novo Produto Digital'}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Configuração de Venda</p>
                            </div>
                        </div>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2 transition-all"><X size={24}/></button>
                    </div>

                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome do Produto</label>
                                <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Curso de Pilates Online Completo" />
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Categoria</label>
                                <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold bg-white outline-none focus:ring-4 focus:ring-indigo-500/10" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Preço de Venda (R$)</label>
                                <div className="relative"><DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/><input type="number" step="0.01" className="w-full pl-10 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-emerald-600 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} /></div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                                <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold bg-white" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                                    <option value="active">Ativo (À Venda)</option>
                                    <option value="inactive">Inativo (Encerrado)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Plataforma</label>
                                <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold bg-white" value={formData.platform} onChange={e => setFormData({ ...formData, platform: e.target.value })}>
                                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Capa do Produto (Upload)</label>
                                <div onClick={() => fileInputRef.current?.click()} className={clsx("w-full py-8 border-2 border-dashed rounded-[1.5rem] flex flex-col items-center justify-center gap-3 cursor-pointer transition-all", formData.thumbnailUrl ? "bg-indigo-50 border-indigo-300" : "bg-slate-50 border-slate-200 hover:border-indigo-400")}>
                                    {formData.thumbnailUrl ? <img src={formData.thumbnailUrl} className="h-32 object-contain rounded-xl shadow-md border-4 border-white" /> : <><Upload size={32} className="text-slate-300" /><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Clique para selecionar imagem</span></>}
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1"><Award size={12} className="text-amber-500"/> Modelo de Certificado Associado</label>
                                <select className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl text-sm font-bold bg-white outline-none focus:ring-4 focus:ring-indigo-500/10" value={formData.certificateTemplateId || ''} onChange={e => setFormData({...formData, certificateTemplateId: e.target.value})}>
                                    <option value="">Sem Certificado Automático</option>
                                    {certificates.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Descrição Comercial</label>
                                <textarea className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm h-32 resize-none focus:bg-white outline-none leading-relaxed font-medium" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="O que o aluno recebe ao comprar este produto?" />
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-5 bg-slate-50 flex justify-between items-center gap-3 border-t rounded-b-[2rem] shrink-0">
                        <div className="text-[9px] font-black text-slate-300 uppercase">ID: {formData.id || 'NOVO'}</div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-500 font-black text-xs uppercase tracking-widest hover:underline">Cancelar</button>
                            <button onClick={handleSave} disabled={isSaving} className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar Produto
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

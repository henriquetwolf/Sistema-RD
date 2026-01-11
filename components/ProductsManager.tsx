
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Plus, Search, MoreVertical, Edit2, Trash2, 
  ExternalLink, ArrowLeft, Save, X, Tag, MonitorPlay, 
  DollarSign, Globe, Loader2, CheckCircle2, AlertCircle, Award,
  Layers, BookOpen, Video, FileText, List, ChevronRight, GripVertical, Paperclip, 
  Download, ListPlus, LayoutTemplate, Upload, Image as ImageIcon, RefreshCw, AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { Product, CertificateModel, OnlineCourse, CourseModule, CourseLesson } from '../types';

interface ProductsManagerProps {
  onBack: () => void;
}

const CATEGORIES = ['Curso Online', 'E-book', 'Mentoria', 'Webinar', 'Assinatura/Comunidade', 'Workshop Online'];
const PLATFORMS = ['Hotmart', 'Eduzz', 'Monetizze', 'Kiwify', 'Plataforma Própria', 'Outros'];

export const ProductsManager: React.FC<ProductsManagerProps> = ({ onBack }) => {
  const [activeSubView, setActiveSubView] = useState<'products' | 'course_builder'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [courses, setCourses] = useState<OnlineCourse[]>([]);
  const [certificates, setCertificates] = useState<CertificateModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const [showModal, setShowModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [editingCourse, setEditingCourse] = useState<OnlineCourse | null>(null);
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [moduleLessons, setModuleLessons] = useState<Record<string, CourseLesson[]>>({});
  const [isLoadingBuilder, setIsLoadingBuilder] = useState(false);

  const initialFormState: Product = {
      id: '', name: '', category: 'Curso Online', platform: 'Plataforma Própria', price: 0, url: '', status: 'active', description: '', certificateTemplateId: '', createdAt: ''
  };
  const [formData, setFormData] = useState<Product>(initialFormState);
  const [productImageUrl, setProductImageUrl] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleOpenNew = () => {
      setFormData(initialFormState);
      setProductImageUrl('');
      setShowModal(true);
      setActiveMenuId(null);
  };

  useEffect(() => {
      initData();
  }, []);

  const initData = async () => {
      setIsLoading(true);
      setSyncError(null);
      try {
          await fetchCertificates();
          await fetchOnlineCourses();
          await fetchProducts();
      } catch (e: any) {
          console.error("Erro no carregamento de produtos:", e);
          setSyncError("Não foi possível carregar o catálogo completo.");
      } finally {
          setIsLoading(false);
      }
  };

  const forceSyncPortal = async () => {
      setIsLoading(true);
      try {
          const loadedProducts = await fetchProducts();
          const loadedCourses = await fetchOnlineCourses();
          
          let syncCount = 0;
          for (const prod of loadedProducts) {
              if (prod.category === 'Curso Online') {
                  const hasTechnical = loadedCourses.some(c => (c.title || '').trim().toLowerCase() === (prod.name || '').trim().toLowerCase());
                  if (!hasTechnical) {
                      await appBackend.saveOnlineCourse({
                          title: prod.name,
                          description: prod.description,
                          price: prod.price,
                          paymentLink: prod.url,
                          imageUrl: (prod as any).image_url || (prod as any).imageUrl
                      });
                      syncCount++;
                  }
              }
          }
          if (syncCount > 0) await fetchOnlineCourses();
          alert(`${syncCount} cursos sincronizados com o portal técnico.`);
      } catch (e: any) {
          alert(`Erro na sincronização: ${e.message}`);
      } finally {
          setIsLoading(false);
      }
  };

  const fetchProducts = async () => {
      try {
          const { data, error } = await appBackend.client.from('crm_products').select('*').order('name', { ascending: true });
          if (error) throw error;
          
          const mapped = (data || []).map((p: any) => ({ 
              ...p, 
              price: Number(p.price || 0), 
              category: p.category || 'Curso Online',
              certificateTemplateId: p.certificate_template_id, 
              createdAt: p.created_at,
              imageUrl: p.image_url 
          }));
          setProducts(mapped);
          return mapped;
      } catch (e: any) { 
          console.error(e);
          return [];
      }
  };

  const fetchOnlineCourses = async () => {
      try {
          const data = await appBackend.getOnlineCourses();
          setCourses(data || []);
          return data || [];
      } catch (e) {
          return [];
      }
  };

  const fetchCertificates = async () => {
      try { const data = await appBackend.getCertificates(); setCertificates(data); } catch (e) {}
  };

  const handleOpenCourseBuilder = async (course: OnlineCourse) => {
      setEditingCourse(course);
      setIsLoadingBuilder(true);
      setActiveSubView('course_builder');
      try {
          const mods = await appBackend.getCourseModules(course.id);
          setCourseModules(mods);
          const lessonsMap: Record<string, CourseLesson[]> = {};
          for (const mod of mods) {
              const lessons = await appBackend.getModuleLessons(mod.id);
              lessonsMap[mod.id] = lessons;
          }
          setModuleLessons(lessonsMap);
      } catch (e) {
          alert("Erro ao carregar conteúdo.");
      } finally {
          setIsLoadingBuilder(false);
      }
  };

  const handleAddModule = async () => {
      if (!editingCourse) return;
      const title = prompt("Título do Módulo:");
      if (!title) return;
      try {
          await appBackend.saveCourseModule({ courseId: editingCourse.id, title, orderIndex: courseModules.length });
          handleOpenCourseBuilder(editingCourse);
      } catch (e: any) { 
          if (e.message?.includes('foreign key')) {
              alert("Erro Crítico: Este curso perdeu o vínculo com o banco de dados. \n\nSolução: Volte, clique no botão 'Sincronizar' no topo da tela e tente novamente.");
          } else if (e.message?.includes('RLS')) {
              alert("Erro de Permissão: Você precisa rodar o script de reparo do Banco de Dados em 'Configurações'.");
          } else {
              alert(`Erro: ${e.message}`); 
          }
      }
  };

  const handleAddLesson = async (moduleId: string) => {
      const title = prompt("Título da Aula:");
      if (!title) return;
      try {
          await appBackend.saveCourseLesson({ moduleId, title, orderIndex: (moduleLessons[moduleId] || []).length, description: '', videoUrl: '' });
          handleOpenCourseBuilder(editingCourse!);
      } catch (e: any) { alert(e.message); }
  };

  const handleEditLesson = async (lesson: CourseLesson) => {
      const newTitle = prompt("Novo título:", lesson.title);
      if (newTitle === null) return;
      const newVideo = prompt("URL YouTube:", lesson.videoUrl);
      try {
          await appBackend.saveCourseLesson({ ...lesson, title: newTitle, videoUrl: newVideo || '' });
          handleOpenCourseBuilder(editingCourse!);
      } catch (e) { alert("Erro ao editar."); }
  };

  const handleDeleteLesson = async (id: string) => {
      if (window.confirm("Excluir aula?")) {
          await appBackend.deleteCourseLesson(id);
          handleOpenCourseBuilder(editingCourse!);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onloadend = () => setProductImageUrl(reader.result as string);
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleSaveProduct = async () => {
      if (!formData.name) { alert("Nome é obrigatório."); return; }
      setIsSaving(true);
      
      const payload: any = { 
          name: formData.name, 
          category: formData.category, 
          platform: formData.platform, 
          price: formData.price, 
          url: formData.url, 
          status: formData.status, 
          description: formData.description, 
          certificate_template_id: formData.certificateTemplateId || null,
          image_url: productImageUrl 
      };

      try {
          if (formData.id) {
              await appBackend.client.from('crm_products').update(payload).eq('id', formData.id);
          } else {
              await appBackend.client.from('crm_products').insert([payload]);
          }
          
          if (formData.category === 'Curso Online') {
              await appBackend.saveOnlineCourse({
                  title: formData.name,
                  description: formData.description,
                  price: formData.price,
                  paymentLink: formData.url,
                  certificateTemplateId: formData.certificateTemplateId,
                  imageUrl: productImageUrl
              });
          }

          await fetchProducts();
          await fetchOnlineCourses();
          setShowModal(false);
          setFormData(initialFormState);
          setProductImageUrl('');
      } catch (e: any) { 
          alert(`Erro ao salvar: ${e.message}`); 
      } finally { 
          setIsSaving(false); 
      }
  };

  const handleDeleteProduct = async (id: string) => {
      if (window.confirm("Excluir produto do catálogo?")) {
          await appBackend.client.from('crm_products').delete().eq('id', id);
          fetchProducts();
      }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const category = (p.category || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      return name.includes(search) || category.includes(search);
    });
  }, [products, searchTerm]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
        
        {activeSubView === 'products' ? (
            <>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ShoppingBag className="text-indigo-600" /> Produtos Digitais</h2>
                            <p className="text-slate-500 text-sm">Gerencie o catálogo comercial sincronizado com o Portal.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={forceSyncPortal} 
                            disabled={isLoading}
                            className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-xl transition-all shadow-sm flex items-center gap-2 font-bold text-xs"
                        >
                            <RefreshCw size={18} className={clsx(isLoading && "animate-spin")} />
                            {isLoading ? 'Sincronizando...' : 'Sincronizar'}
                        </button>
                        <button onClick={handleOpenNew} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95"><Plus size={18} /> Novo Produto</button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar por nome ou categoria..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium" 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
                            <Loader2 size={48} className="animate-spin text-indigo-600" />
                            <p className="font-black animate-pulse uppercase text-xs tracking-widest">Sincronizando Catálogo...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="col-span-full py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center">
                            <ShoppingBag size={40} className="text-slate-200 mb-4" />
                            <h3 className="text-lg font-black text-slate-800">Catálogo Vazio</h3>
                            <p className="text-sm text-slate-400 mt-1">Crie um novo produto ou sincronize para ver os itens.</p>
                        </div>
                    ) : (
                        filteredProducts.map(product => (
                            <div key={product.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all overflow-hidden flex flex-col group animate-in fade-in zoom-in-95 duration-300">
                                <div className="h-48 bg-slate-50 relative overflow-hidden shrink-0 border-b border-slate-100">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                                            <ImageIcon size={64} />
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3">
                                        <div className="relative">
                                            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === product.id ? null : product.id); }} className="bg-white/90 backdrop-blur-md text-slate-600 p-2 rounded-full shadow-lg hover:bg-white menu-btn transition-all"><MoreVertical size={16} /></button>
                                            {activeMenuId === product.id && (
                                                <div className="absolute right-0 top-10 w-36 bg-white rounded-xl shadow-2xl border border-slate-200 z-20 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                                                    <button onClick={() => { setFormData(product); setProductImageUrl((product as any).imageUrl || ''); setShowModal(true); setActiveMenuId(null); }} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b"><Edit2 size={14} /> Editar</button>
                                                    <button onClick={() => handleDeleteProduct(product.id)} className="w-full text-left px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Excluir</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-3 left-3 flex gap-2">
                                        <span className={clsx("text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-sm", product.status === 'active' ? "bg-green-600 text-white" : "bg-slate-400 text-white")}>{product.status === 'active' ? 'Ativo' : 'Inativo'}</span>
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <p className="text-[10px] font-black text-indigo-600 mb-1 uppercase tracking-widest flex items-center gap-1"><Tag size={12}/> {product.category}</p>
                                    <h3 className="font-black text-slate-800 text-lg mb-2 line-clamp-1">{product.name}</h3>
                                    <p className="text-xs text-slate-400 line-clamp-2 mb-6 font-medium leading-relaxed">{product.description || 'Sem descrição cadastrada.'}</p>
                                    
                                    {product.category === 'Curso Online' && (
                                        <button 
                                            onClick={async () => {
                                                let course = courses.find(c => (c.title || '').toLowerCase() === (product.name || '').toLowerCase());
                                                if (!course) {
                                                    await forceSyncPortal();
                                                    const updatedCourses = await fetchOnlineCourses();
                                                    course = updatedCourses.find(c => (c.title || '').toLowerCase() === (product.name || '').toLowerCase());
                                                }

                                                if (course) handleOpenCourseBuilder(course);
                                                else alert("Erro: Registro técnico não sincronizado. Clique no botão 'Sincronizar' no topo.");
                                            }}
                                            className="mt-auto w-full py-3 bg-slate-900 text-white hover:bg-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                                        >
                                            <Layers size={16}/> Montar Aulas no Portal
                                        </button>
                                    )}
                                </div>
                                <div className="px-6 py-4 bg-slate-50 border-t flex items-center justify-between">
                                    <span className="font-black text-slate-800 text-lg">{formatCurrency(product.price)}</span>
                                    {product.url && <a href={product.url} target="_blank" className="text-indigo-600 hover:text-indigo-800 p-2 hover:bg-white rounded-lg transition-all" title="Ver Link de Venda"><ExternalLink size={18} /></a>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </>
        ) : (
            <div className="animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveSubView('products')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">Builder: {editingCourse?.title}</h2>
                            <p className="text-sm text-slate-500 font-medium">Configure os módulos e aulas que o aluno acessará no portal.</p>
                        </div>
                    </div>
                    <button onClick={handleAddModule} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-xl flex items-center gap-2 transition-all active:scale-95"><Plus size={18}/> Novo Módulo</button>
                </div>

                {isLoadingBuilder ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>
                ) : (
                    <div className="space-y-6">
                        {courseModules.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 text-slate-400">
                                <LayoutTemplate size={64} className="mx-auto mb-4 opacity-10"/>
                                <p className="font-bold text-lg">Curso em Branco</p>
                                <p className="text-sm">Clique em "+ Novo Módulo" para começar.</p>
                            </div>
                        ) : courseModules.map(mod => (
                            <div key={mod.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                <div className="bg-slate-50 px-8 py-5 border-b flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-xl border shadow-sm flex items-center justify-center font-black text-indigo-600">{(mod.orderIndex || 0) + 1}</div>
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight">{mod.title}</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAddLesson(mod.id)} className="bg-white border border-slate-200 hover:border-indigo-300 text-indigo-600 px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2"><Plus size={14}/> Add Aula</button>
                                        <button onClick={() => appBackend.deleteCourseModule(mod.id).then(() => handleOpenCourseBuilder(editingCourse!))} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                                <div className="p-4 space-y-2">
                                    {(moduleLessons[mod.id] || []).map((lesson) => (
                                        <div key={lesson.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-sm transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"><Video size={20}/></div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">{lesson.title}</h4>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        {lesson.videoUrl && <span className="text-[10px] text-red-500 font-bold uppercase flex items-center gap-1"><ExternalLink size={10}/> Vídeo Vinculado</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditLesson(lesson)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDeleteLesson(lesson.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    ))}
                                    {(moduleLessons[mod.id] || []).length === 0 && <p className="text-center py-6 text-xs text-slate-300 italic font-medium">Nenhuma aula neste módulo.</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh] overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3"><MonitorPlay size={24} className="text-indigo-600" /> {formData.id ? 'Ficha do Produto' : 'Novo Cadastro Comercial'}</h3>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200 rounded-full transition-all"><X size={24}/></button>
                    </div>
                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Capa do Produto (Vitrine do Portal)</label>
                                <div className="flex flex-col md:flex-row gap-6 items-center bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200 group hover:border-indigo-300 transition-all">
                                    <div className="w-36 h-36 bg-white rounded-2xl border flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                                        {productImageUrl ? (
                                            <img src={productImageUrl} className="w-full h-full object-cover" alt="Preview" />
                                        ) : (
                                            <ImageIcon className="text-slate-100" size={64} />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-3 text-center md:text-left">
                                        <p className="text-xs text-slate-500 font-medium">Selecione uma imagem quadrada para melhor visualização.</p>
                                        <button 
                                            type="button" 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-600 shadow-sm flex items-center gap-2 transition-all mx-auto md:mx-0 active:scale-95"
                                        >
                                            <Upload size={16}/> Escolher Arquivo
                                        </button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Nome de Venda do Produto *</label>
                                <input type="text" className="w-full px-5 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-base font-black transition-all outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Pilates Masterclass 2.0" />
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Tipo / Categoria</label>
                                <select className="w-full px-5 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all outline-none appearance-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Plataforma de Checkout</label>
                                <input type="text" list="platforms-modal" className="w-full px-5 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all outline-none" value={formData.platform} onChange={e => setFormData({ ...formData, platform: e.target.value })} placeholder="Ex: Hotmart" />
                                <datalist id="platforms-modal">{PLATFORMS.map(p => <option key={p} value={p} />)}</datalist>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Preço de Venda (R$)</label>
                                <div className="relative">
                                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="number" className="w-full pl-10 pr-4 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-emerald-500 rounded-2xl text-sm font-black text-emerald-700 transition-all outline-none" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Status Comercial</label>
                                <select className="w-full px-5 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all outline-none appearance-none" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                                    <option value="active">🟢 Ativo (Venda Liberada)</option>
                                    <option value="inactive">🔴 Inativo (Venda Pausada)</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 flex items-center gap-2">
                                    <Award size={14} className="text-amber-500" /> Emissão Automática de Certificado
                                </label>
                                <select className="w-full px-5 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-amber-500 rounded-2xl text-sm font-bold transition-all outline-none appearance-none" value={formData.certificateTemplateId || ''} onChange={e => setFormData({ ...formData, certificateTemplateId: e.target.value })}>
                                    <option value="">Não emitir certificado</option>
                                    {certificates.map(cert => (<option key={cert.id} value={cert.id}>{cert.title}</option>))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Link Externo / Checkout</label>
                                <div className="relative">
                                    <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input type="text" className="w-full pl-10 pr-4 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-xs font-mono text-blue-600 transition-all outline-none" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} placeholder="https://..." />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Resumo do Conteúdo</label>
                                <textarea className="w-full px-5 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-sm h-28 resize-none transition-all outline-none font-medium leading-relaxed" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Descreva o produto..." ></textarea>
                            </div>
                        </div>
                    </div>
                    <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 shrink-0 rounded-b-[2rem]">
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-sm transition-all">Cancelar</button>
                            <button onClick={handleSaveProduct} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-xl active:scale-95 disabled:opacity-50 transition-all">
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                                Salvar Dados
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

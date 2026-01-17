
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Plus, Search, MoreVertical, Edit2, Trash2, 
  ExternalLink, ArrowLeft, Save, X, Tag, MonitorPlay, 
  DollarSign, Globe, Loader2, CheckCircle2, AlertCircle, Award,
  Layers, BookOpen, Video, FileText, List, ChevronRight, GripVertical, Paperclip, 
  Download, ListPlus, LayoutTemplate, Upload, Image as ImageIcon, RefreshCw, AlertTriangle,
  Settings, Layout, PlayCircle, Code,
  // Fix: Add missing icons
  GraduationCap, School, Building2, Store
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
  const [builderTab, setBuilderTab] = useState<'content' | 'settings'>('content');
  const [products, setProducts] = useState<Product[]>([]);
  const [courses, setCourses] = useState<OnlineCourse[]>([]);
  const [certificates, setCertificates] = useState<CertificateModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Course Builder States
  const [editingCourse, setEditingCourse] = useState<OnlineCourse | null>(null);
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [moduleLessons, setModuleLessons] = useState<Record<string, CourseLesson[]>>({});
  const [isLoadingBuilder, setIsLoadingBuilder] = useState(false);

  // New Modals for Builder
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Partial<CourseModule> | null>(null);
  
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Partial<CourseLesson> | null>(null);

  const initialFormState: Product = {
      id: '', name: '', category: 'Curso Online', platform: 'Plataforma Própria', price: 0, url: '', status: 'active', description: '', certificateTemplateId: '', createdAt: '', targetAreas: []
  };
  const [formData, setFormData] = useState<Product>(initialFormState);
  const [productImageUrl, setProductImageUrl] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      try {
          await fetchCertificates();
          await fetchOnlineCourses();
          await fetchProducts();
      } catch (e: any) {
          console.error("Erro no carregamento de produtos:", e);
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
              imageUrl: p.image_url,
              targetAreas: p.target_areas || []
          }));
          setProducts(mapped);
          return mapped;
      } catch (e: any) { return []; }
  };

  const fetchOnlineCourses = async () => {
      try {
          const data = await appBackend.getOnlineCourses();
          setCourses(data || []);
          return data || [];
      } catch (e) { return []; }
  };

  const fetchCertificates = async () => {
      try { const data = await appBackend.getCertificates(); setCertificates(data); } catch (e) {}
  };

  const handleOpenCourseBuilder = async (course: OnlineCourse) => {
      setEditingCourse(course);
      setIsLoadingBuilder(true);
      setActiveSubView('course_builder');
      setBuilderTab('content');
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

  const handleOpenModuleModal = (mod?: CourseModule) => {
      setEditingModule(mod || { title: '', orderIndex: courseModules.length });
      setShowModuleModal(true);
  };

  const handleSaveModule = async () => {
      if (!editingCourse || !editingModule?.title) return;
      setIsSaving(true);
      try {
          await appBackend.saveCourseModule({ 
              ...editingModule, 
              courseId: editingCourse.id 
          });
          await handleOpenCourseBuilder(editingCourse);
          setShowModuleModal(false);
      } catch (e: any) {
          alert("Erro ao salvar módulo: " + e.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeleteModule = async (id: string) => {
      if (window.confirm("Deseja excluir este módulo e todas as suas aulas?")) {
          await appBackend.deleteCourseModule(id);
          handleOpenCourseBuilder(editingCourse!);
      }
  };

  const handleDeleteLesson = async (id: string) => {
      if (window.confirm("Deseja excluir esta aula?")) {
          await appBackend.deleteCourseLesson(id);
          if (editingCourse) handleOpenCourseBuilder(editingCourse);
      }
  };

  const handleOpenLessonModal = (moduleId: string, lesson?: CourseLesson) => {
      setEditingLesson(lesson || { 
          moduleId, 
          title: '', 
          description: '', 
          videoUrl: '', 
          orderIndex: (moduleLessons[moduleId] || []).length,
          materials: [] 
      });
      setShowLessonModal(true);
  };

  const handleSaveLesson = async () => {
      if (!editingLesson?.title || !editingLesson?.moduleId) return;
      setIsSaving(true);
      try {
          await appBackend.saveCourseLesson(editingLesson);
          await handleOpenCourseBuilder(editingCourse!);
          setShowLessonModal(false);
      } catch (e: any) {
          alert("Erro ao salvar aula: " + e.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleSaveCourseMetadata = async () => {
      if (!editingCourse) return;
      setIsSaving(true);
      try {
          await appBackend.saveOnlineCourse(editingCourse);
          const product = products.find(p => p.name === editingCourse.title);
          if (product) {
              await appBackend.client.from('crm_products').update({
                  name: editingCourse.title,
                  description: editingCourse.description,
                  price: editingCourse.price,
                  image_url: editingCourse.imageUrl,
                  certificate_template_id: editingCourse.certificateTemplateId || null
              }).eq('id', product.id);
          }
          await fetchOnlineCourses();
          await fetchProducts();
          alert("Configurações do curso salvas com sucesso!");
      } catch (e: any) {
          alert("Erro ao salvar: " + e.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isForBuilder = false) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              if (isForBuilder && editingCourse) {
                  setEditingCourse({ ...editingCourse, imageUrl: result });
              } else {
                  setProductImageUrl(result);
              }
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleSaveProduct = async () => {
      if (!formData.name) { alert("Nome é obrigatório."); return; }
      setIsSaving(true);
      const payload: any = { 
          name: formData.name, category: formData.category, platform: formData.platform, 
          price: formData.price, url: formData.url, status: formData.status, 
          description: formData.description, certificate_template_id: formData.certificateTemplateId || null,
          image_url: productImageUrl,
          target_areas: formData.targetAreas || []
      };
      try {
          if (formData.id) await appBackend.client.from('crm_products').update(payload).eq('id', formData.id);
          else await appBackend.client.from('crm_products').insert([payload]);
          
          if (formData.category === 'Curso Online') {
              await appBackend.saveOnlineCourse({
                  title: formData.name, description: formData.description, price: formData.price,
                  paymentLink: formData.url, certificateTemplateId: formData.certificateTemplateId, imageUrl: productImageUrl
              });
          }
          await fetchProducts(); await fetchOnlineCourses();
          setShowModal(false); setFormData(initialFormState); setProductImageUrl('');
      } catch (e: any) { alert(`Erro: ${e.message}`); } finally { setIsSaving(false); }
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
                          title: prod.name, description: prod.description, price: prod.price,
                          paymentLink: prod.url, imageUrl: (prod as any).image_url || (prod as any).imageUrl,
                          certificateTemplateId: prod.certificateTemplateId
                      });
                      syncCount++;
                  }
              }
          }
          if (syncCount > 0) await fetchOnlineCourses();
          alert(`${syncCount} cursos sincronizados.`);
      } catch (e: any) { alert(`Erro: ${e.message}`); } finally { setIsLoading(false); }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const category = (p.category || '').toLowerCase();
      return name.includes(searchTerm.toLowerCase()) || category.includes(searchTerm.toLowerCase());
    });
  }, [products, searchTerm]);

  return (
    <div className="animate-in fade-in h-full flex flex-col pb-20">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ShoppingBag className="text-indigo-600" /> Produtos Digitais</h2>
                    <p className="text-slate-500 text-sm">Catálogo comercial sincronizado com o Portal Técnico.</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={forceSyncPortal} className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-xl transition-all shadow-sm flex items-center gap-2 font-bold text-xs"><RefreshCw size={18} className={clsx(isLoading && "animate-spin")} /> {isLoading ? 'Sincronizando...' : 'Sincronizar'}</button>
                <button onClick={handleOpenNew} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95"><Plus size={18} /> Novo Produto</button>
            </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Buscar por nome ou categoria..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium" />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
                <div className="col-span-full flex flex-col items-center justify-center py-24 gap-4 text-slate-400"><Loader2 size={48} className="animate-spin text-indigo-600" /><p className="font-black uppercase text-xs tracking-widest">Carregando...</p></div>
            ) : (
                filteredProducts.map(product => (
                    <div key={product.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all overflow-hidden flex flex-col group animate-in fade-in zoom-in-95 duration-300">
                        <div className="h-48 bg-slate-50 relative overflow-hidden shrink-0 border-b border-slate-100">
                            {product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><ImageIcon size={64} /></div>}
                            <div className="absolute top-3 right-3"><div className="relative"><button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === product.id ? null : product.id); }} className="bg-white/90 backdrop-blur-md text-slate-600 p-2 rounded-full shadow-lg hover:bg-white transition-all"><MoreVertical size={16} /></button>{activeMenuId === product.id && (<div className="absolute right-0 top-10 w-36 bg-white rounded-xl shadow-2xl border border-slate-200 z-20 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"><button onClick={() => { setFormData(product); setProductImageUrl((product as any).imageUrl || (product as any).image_url || ''); setShowModal(true); setActiveMenuId(null); }} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b"><Edit2 size={14} /> Editar</button><button onClick={() => { if(window.confirm("Excluir produto?")) appBackend.client.from('crm_products').delete().eq('id', product.id).then(fetchProducts); }} className="w-full text-left px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Excluir</button></div>)}</div></div>
                            <div className="absolute bottom-3 left-3 flex gap-2"><span className={clsx("text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-sm", product.status === 'active' ? "bg-green-600 text-white" : "bg-slate-400 text-white")}>{product.status === 'active' ? 'Ativo' : 'Inativo'}</span></div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <p className="text-[10px] font-black text-indigo-600 mb-1 uppercase tracking-widest flex items-center gap-1"><Tag size={12}/> {product.category}</p>
                            <h3 className="font-black text-slate-800 text-lg mb-2 line-clamp-1">{product.name}</h3>
                            <p className="text-xs text-slate-400 line-clamp-2 mb-6 font-medium leading-relaxed">{product.description || 'Sem descrição cadastrada.'}</p>
                            {product.category === 'Curso Online' && (
                                <button 
                                    onClick={async () => {
                                        let course = courses.find(c => (c.title || '').toLowerCase() === (product.name || '').toLowerCase());
                                        if (course) handleOpenCourseBuilder(course);
                                        else alert("Erro: Este curso precisa ser sincronizado primeiro.");
                                    }}
                                    className="mt-auto w-full py-3 bg-slate-900 text-white hover:bg-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                                >
                                    <Layers size={16}/> Builder: Aulas & Módulos
                                </button>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* MODAL: NOVO PRODUTO COMERCIAL */}
        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in-95 flex flex-col max-h-[95vh] overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3"><MonitorPlay size={24} className="text-indigo-600" /> {formData.id ? 'Ficha do Produto' : 'Novo Cadastro Comercial'}</h3>
                        <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-all"><X size={24}/></button>
                    </div>
                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Capa do Produto</label>
                                <div className="flex flex-col md:flex-row gap-6 items-center bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
                                    <div className="w-36 h-36 bg-white rounded-2xl border flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                                        {productImageUrl ? <img src={productImageUrl} className="w-full h-full object-cover" alt="Product" /> : <ImageIcon className="text-slate-100" size={64} />}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-2.5 rounded-xl text-xs font-black uppercase hover:border-indigo-500 shadow-sm flex items-center gap-2 transition-all active:scale-95">Escolher Arquivo</button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e)} />
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Nome Comercial *</label>
                                <input type="text" className="w-full px-5 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-base font-black transition-all outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Categoria</label>
                                <select className="w-full px-5 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-sm font-bold outline-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Preço (R$)</label>
                                <input type="number" className="w-full px-5 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-sm font-black text-emerald-700 outline-none" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Link de Venda / Checkout</label>
                                <input type="text" className="w-full px-5 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-2xl text-xs font-mono" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Direcionamento (Áreas de Exibição)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'student', label: 'Área do Aluno', icon: GraduationCap },
                                        { id: 'instructor', label: 'Área do Instrutor', icon: School },
                                        { id: 'studio', label: 'Studio Parceiro', icon: Building2 },
                                        { id: 'franchise', label: 'Franqueado', icon: Store }
                                    ].map(area => (
                                        <label key={area.id} className={clsx(
                                            "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                                            (formData.targetAreas || []).includes(area.id) ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                                        )}>
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-0" 
                                                checked={(formData.targetAreas || []).includes(area.id)}
                                                onChange={e => {
                                                    const current = formData.targetAreas || [];
                                                    const updated = e.target.checked ? [...current, area.id] : current.filter(a => a !== area.id);
                                                    setFormData({...formData, targetAreas: updated});
                                                }}
                                            />
                                            <div className="flex items-center gap-2">
                                                <area.icon size={14} className={clsx((formData.targetAreas || []).includes(area.id) ? "text-indigo-600" : "text-slate-400")} />
                                                <span className="text-[10px] font-bold uppercase tracking-tight">{area.label}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {formData.category === 'Curso Online' && (
                                <div className="md:col-span-2 animate-in slide-in-from-top-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Modelo de Certificado</label>
                                    <div className="relative">
                                        <Award className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={18}/>
                                        <select 
                                            className="w-full pl-12 pr-10 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-amber-500 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer"
                                            value={formData.certificateTemplateId || ''}
                                            onChange={e => setFormData({ ...formData, certificateTemplateId: e.target.value })}
                                        >
                                            <option value="">Nenhum certificado vinculado</option>
                                            {certificates.map(cert => (
                                                <option key={cert.id} value={cert.id}>{cert.title}</option>
                                            ))}
                                        </select>
                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={18}/>
                                    </div>
                                </div>
                            )}

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Descrição Comercial</label>
                                <textarea className="w-full px-5 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-2xl text-sm h-24 resize-none outline-none leading-relaxed" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Resumo do produto para a equipe de vendas..." />
                            </div>
                        </div>
                    </div>
                    <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3 rounded-b-[2rem]">
                        <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-sm">Cancelar</button>
                        <button onClick={handleSaveProduct} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-xl active:scale-95 disabled:opacity-50">{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Produto</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

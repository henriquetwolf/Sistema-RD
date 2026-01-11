
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Plus, Search, MoreVertical, Edit2, Trash2, 
  ExternalLink, ArrowLeft, Save, X, Tag, MonitorPlay, 
  DollarSign, Globe, Loader2, CheckCircle2, AlertCircle, Award,
  Layers, BookOpen, Video, FileText, List, ChevronRight, GripVertical, Paperclip, 
  Download, ListPlus, LayoutTemplate
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
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // --- Course Builder State ---
  const [editingCourse, setEditingCourse] = useState<OnlineCourse | null>(null);
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [moduleLessons, setModuleLessons] = useState<Record<string, CourseLesson[]>>({});
  const [isLoadingBuilder, setIsLoadingBuilder] = useState(false);

  // Form State (Products)
  const initialFormState: Product = {
      id: '', name: '', category: 'Curso Online', platform: '', price: 0, url: '', status: 'active', description: '', certificateTemplateId: '', createdAt: ''
  };
  const [formData, setFormData] = useState<Product>(initialFormState);

  // --- Effects ---
  useEffect(() => {
      fetchProducts();
      fetchCertificates();
      fetchOnlineCourses();
  }, []);

  const fetchProducts = async () => {
      setIsLoading(true);
      try {
          const { data, error } = await appBackend.client.from('crm_products').select('*').order('name', { ascending: true });
          if (error) throw error;
          setProducts((data || []).map((p: any) => ({ ...p, price: Number(p.price || 0), certificateTemplateId: p.certificate_template_id, createdAt: p.created_at })));
      } catch (e: any) { console.error(e); } finally { setIsLoading(false); }
  };

  const fetchOnlineCourses = async () => {
      const data = await appBackend.getOnlineCourses();
      setCourses(data);
  };

  const fetchCertificates = async () => {
      try { const data = await appBackend.getCertificates(); setCertificates(data); } catch (e) { console.error(e); }
  };

  // --- Course Builder Logic ---

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
          console.error(e);
      } finally {
          setIsLoadingBuilder(false);
      }
  };

  const handleAddModule = async () => {
      if (!editingCourse) return;
      const title = prompt("Título do Módulo:");
      if (!title) return;
      const newIndex = courseModules.length;
      await appBackend.saveCourseModule({ courseId: editingCourse.id, title, orderIndex: newIndex });
      handleOpenCourseBuilder(editingCourse);
  };

  const handleAddLesson = async (moduleId: string) => {
      const title = prompt("Título da Aula:");
      if (!title) return;
      const newIndex = (moduleLessons[moduleId] || []).length;
      await appBackend.saveCourseLesson({ moduleId, title, orderIndex: newIndex, description: '', videoUrl: '' });
      handleOpenCourseBuilder(editingCourse!);
  };

  const handleEditLesson = async (lesson: CourseLesson) => {
      const newTitle = prompt("Novo título:", lesson.title);
      const newVideo = prompt("URL YouTube:", lesson.videoUrl);
      if (newTitle === null) return;
      await appBackend.saveCourseLesson({ ...lesson, title: newTitle, videoUrl: newVideo || '' });
      handleOpenCourseBuilder(editingCourse!);
  };

  const handleDeleteLesson = async (id: string) => {
      if (window.confirm("Excluir aula?")) {
          await appBackend.deleteCourseLesson(id);
          handleOpenCourseBuilder(editingCourse!);
      }
  };

  const handleSaveProduct = async () => {
      if (!formData.name) { alert("Nome é obrigatório."); return; }
      setIsSaving(true);
      const payload = { name: formData.name, category: formData.category, platform: formData.platform, price: formData.price, url: formData.url, status: formData.status, description: formData.description, certificate_template_id: formData.certificateTemplateId || null };
      try {
          if (formData.id) await appBackend.client.from('crm_products').update(payload).eq('id', formData.id);
          else await appBackend.client.from('crm_products').insert([payload]);
          
          // Se for categoria Curso Online e não existir na tabela de cursos, criamos o esqueleto
          if (formData.category === 'Curso Online') {
              await appBackend.saveOnlineCourse({
                  title: formData.name,
                  description: formData.description,
                  price: formData.price,
                  paymentLink: formData.url,
                  certificateTemplateId: formData.certificateTemplateId
              });
          }

          fetchProducts();
          fetchOnlineCourses();
          setShowModal(false);
          setFormData(initialFormState);
      } catch (e: any) { alert(`Erro: ${e.message}`); } finally { setIsSaving(false); }
  };

  const handleDeleteProduct = async (id: string) => {
      if (window.confirm("Excluir produto?")) {
          await appBackend.client.from('crm_products').delete().eq('id', id);
          fetchProducts();
      }
  };

  /* FIXED: Added handleEdit and handleOpenNew inside component scope */
  const handleEdit = (product: Product) => {
      setFormData(product);
      setShowModal(true);
      setActiveMenuId(null);
  };

  const handleOpenNew = () => {
      setFormData(initialFormState);
      setShowModal(true);
      setActiveMenuId(null);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
        
        {activeSubView === 'products' ? (
            <>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ShoppingBag className="text-indigo-600" /> Produtos Digitais</h2>
                            <p className="text-slate-500 text-sm">Gerencie infoprodutos e cursos online da VOLL.</p>
                        </div>
                    </div>
                    <button onClick={handleOpenNew} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"><Plus size={18} /> Novo Produto</button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Buscar produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" /></div></div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? <div className="col-span-full flex justify-center py-20"><Loader2 size={40} className="animate-spin text-indigo-600" /></div> : products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
                        <div key={product.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={clsx("text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide", product.status === 'active' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>{product.status === 'active' ? 'Ativo' : 'Inativo'}</span>
                                    <div className="relative">
                                        <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === product.id ? null : product.id); }} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"><MoreVertical size={18} /></button>
                                        {activeMenuId === product.id && (
                                            <div className="absolute right-0 top-8 w-32 bg-white rounded-lg shadow-xl border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                                <button onClick={() => handleEdit(product)} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit2 size={12} /> Editar</button>
                                                <button onClick={() => handleDeleteProduct(product.id)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={12} /> Excluir</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <h3 className="font-bold text-slate-800 text-lg mb-1">{product.name}</h3>
                                <p className="text-xs text-slate-500 mb-4 flex items-center gap-1"><Tag size={12} /> {product.category} • {product.platform}</p>
                                
                                {product.category === 'Curso Online' && (
                                    <button 
                                        onClick={() => {
                                            const course = courses.find(c => c.title === product.name);
                                            if (course) handleOpenCourseBuilder(course);
                                            else alert("Curso online não localizado na base técnica. Verifique o nome.");
                                        }}
                                        className="mb-4 w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 border border-indigo-100 transition-all"
                                    >
                                        <Layers size={14}/> Montar Conteúdo do Curso
                                    </button>
                                )}
                            </div>
                            <div className="px-5 py-4 bg-slate-50 border-t flex items-center justify-between"><span className="font-bold text-slate-800">{formatCurrency(product.price)}</span>{product.url && <a href={product.url} target="_blank" className="text-indigo-600 hover:text-indigo-800 p-2"><ExternalLink size={18} /></a>}</div>
                        </div>
                    ))}
                </div>
            </>
        ) : (
            <div className="animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveSubView('products')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">Builder de Curso: {editingCourse?.title}</h2>
                            <p className="text-sm text-slate-500 font-medium">Estruture os módulos e aulas que o aluno verá no portal.</p>
                        </div>
                    </div>
                    <button onClick={handleAddModule} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-xl flex items-center gap-2 transition-all active:scale-95"><Plus size={18}/> Novo Módulo</button>
                </div>

                {isLoadingBuilder ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>
                ) : (
                    <div className="space-y-6">
                        {courseModules.length === 0 ? (
                            <div className="text-center py-20 bg-white border-2 border-dashed rounded-[2rem] text-slate-400">
                                <LayoutTemplate size={64} className="mx-auto mb-4 opacity-10"/>
                                <p className="font-bold text-lg">Este curso ainda não tem conteúdo</p>
                                <p className="text-sm">Comece criando the primeiro módulo acima.</p>
                            </div>
                        ) : courseModules.map(mod => (
                            <div key={mod.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                                <div className="bg-slate-50 px-8 py-5 border-b flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-xl border shadow-sm flex items-center justify-center font-black text-indigo-600">{(mod.orderIndex || 0) + 1}</div>
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight">{mod.title}</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAddLesson(mod.id)} className="bg-white border border-slate-200 hover:border-indigo-300 text-indigo-600 px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2"><Plus size={14}/> Add Aula</button>
                                        <button onClick={() => appBackend.deleteCourseModule(mod.id).then(() => handleOpenCourseBuilder(editingCourse!))} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                                <div className="p-4 space-y-2">
                                    {(moduleLessons[mod.id] || []).map((lesson, lIdx) => (
                                        <div key={lesson.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-sm transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"><Video size={20}/></div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">{lesson.title}</h4>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        {lesson.videoUrl && <span className="text-[10px] text-red-500 font-bold uppercase flex items-center gap-1"><ExternalLink size={10}/> YouTube OK</span>}
                                                        {(lesson.materials || []).length > 0 && <span className="text-[10px] text-teal-600 font-bold uppercase flex items-center gap-1"><Paperclip size={10}/> {lesson.materials.length} Materiais</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditLesson(lesson)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDeleteLesson(lesson.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><MonitorPlay size={20} className="text-indigo-600" /> {formData.id ? 'Editar Produto' : 'Novo Produto Digital'}</h3>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={20}/></button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-5 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">Nome do Produto</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Formação em Pilates Online" /></div>
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">Categoria</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">Plataforma</label><input type="text" list="platforms" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.platform} onChange={e => setFormData({ ...formData, platform: e.target.value })} placeholder="Ex: Hotmart" /><datalist id="platforms">{PLATFORMS.map(p => <option key={p} value={p} />)}</datalist></div>
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">Preço (R$)</label><div className="relative"><DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="number" className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} /></div></div>
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">Status</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}><option value="active">Ativo (À Venda)</option><option value="inactive">Inativo (Encerrado)</option></select></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><Award size={12} className="text-amber-500" /> Modelo de Certificado</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.certificateTemplateId || ''} onChange={e => setFormData({ ...formData, certificateTemplateId: e.target.value })}><option value="">Sem Certificado</option>{certificates.map(cert => (<option key={cert.id} value={cert.id}>{cert.title}</option>))}</select></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">Link de Venda / Página</label><div className="relative"><Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" /><input type="text" className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} placeholder="https://..." /></div></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">Descrição</label><textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-24 resize-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Detalhes sobre o produto..." ></textarea></div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100 rounded-b-xl shrink-0"><button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button><button onClick={handleSaveProduct} disabled={isSaving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm flex items-center gap-2">{isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar Produto</button></div>
                </div>
            </div>
        )}
    </div>
  );
};

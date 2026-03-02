import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Plus, Search, MoreVertical, Edit2, Trash2, 
  ExternalLink, ArrowLeft, Save, X, Tag, MonitorPlay, 
  DollarSign, Globe, Loader2, CheckCircle2, AlertCircle, Award,
  Layers, BookOpen, Video, FileText, List, ChevronRight, GripVertical, Paperclip, 
  Download, ListPlus, LayoutTemplate, Upload, Image as ImageIcon, RefreshCw, AlertTriangle,
  Settings, Layout, PlayCircle, Code,
  GraduationCap, School, Building2, Store, Mic, Calendar, MapPin,
  Landmark, SplitSquareHorizontal, Percent, Package, Briefcase
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { Product, CertificateModel, OnlineCourse, CourseModule, CourseLesson, ContaAzulProductMapping, ContaAzulSplitMode, CatalogItemType } from '../types';
import { contaAzulService } from '../services/contaAzulService';

interface ProductsManagerProps {
  onBack: () => void;
}

const CATEGORIES = ['Curso Online', 'E-book', 'Mentoria', 'Webinar', 'Assinatura/Comunidade', 'Workshop Online'];
const PLATFORMS = ['Hotmart', 'Eduzz', 'Monetizze', 'Kiwify', 'Plataforma Própria', 'Outros'];

type CatalogTab = 'all' | 'produto_digital' | 'turma' | 'evento';

interface UnifiedItem {
  id: string;
  name: string;
  type: CatalogItemType;
  category?: string;
  price?: number;
  status?: string;
  description?: string;
  imageUrl?: string;
  extra?: Record<string, any>;
}

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

  // Unified catalog
  const [catalogTab, setCatalogTab] = useState<CatalogTab>('all');
  const [classesData, setClassesData] = useState<any[]>([]);
  const [eventsData, setEventsData] = useState<any[]>([]);

  // Conta Azul mapping
  const [mappings, setMappings] = useState<ContaAzulProductMapping[]>([]);
  const [showContaAzulModal, setShowContaAzulModal] = useState(false);
  const [contaAzulEditItem, setContaAzulEditItem] = useState<UnifiedItem | null>(null);
  const [contaAzulCategories, setContaAzulCategories] = useState<{ id: string; id_conta_azul: string; nome: string; tipo: string }[]>([]);
  const [mappingForm, setMappingForm] = useState<Partial<ContaAzulProductMapping>>({});
  const [companiesList, setCompaniesList] = useState<{ id: string; legalName: string; cnpj: string }[]>([]);

  // Course Builder States
  const [editingCourse, setEditingCourse] = useState<OnlineCourse | null>(null);
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [moduleLessons, setModuleLessons] = useState<Record<string, CourseLesson[]>>({});
  const [isLoadingBuilder, setIsLoadingBuilder] = useState(false);

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
          await Promise.all([
              fetchCertificates(),
              fetchOnlineCourses(),
              fetchProducts(),
              fetchClasses(),
              fetchEvents(),
              fetchMappings(),
              fetchContaAzulCategories(),
              fetchCompanies(),
          ]);
      } catch (e: any) {
          console.error("Erro no carregamento:", e);
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

  const fetchClasses = async () => {
      try {
          const { data, error } = await appBackend.client.from('crm_classes').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          setClassesData(data || []);
      } catch (e) { setClassesData([]); }
  };

  const fetchEvents = async () => {
      try {
          const { data, error } = await appBackend.client.from('crm_events').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          setEventsData(data || []);
      } catch (e) { setEventsData([]); }
  };

  const fetchMappings = async () => {
      try {
          const data = await appBackend.getContaAzulProductMappings();
          setMappings(data);
      } catch (e) { setMappings([]); }
  };

  const fetchContaAzulCategories = async () => {
      try {
          const cats = await contaAzulService.getCategories();
          setContaAzulCategories(cats.filter((c: any) => c.tipo === 'RECEITA' || c.tipo === 'AMBOS'));
      } catch (e) { setContaAzulCategories([]); }
  };

  const fetchCompanies = async () => {
      try {
          const data = await appBackend.getCompanies();
          setCompaniesList(data.map((c: any) => ({ id: c.id, legalName: c.legalName, cnpj: c.cnpj })));
      } catch (e) { setCompaniesList([]); }
  };

  const unifiedItems = useMemo((): UnifiedItem[] => {
      const items: UnifiedItem[] = [];
      for (const p of products) {
          items.push({
              id: p.id,
              name: p.name,
              type: 'produto_digital',
              category: p.category,
              price: p.price,
              status: p.status,
              description: p.description,
              imageUrl: p.imageUrl,
              extra: p as any,
          });
      }
      for (const c of classesData) {
          items.push({
              id: c.id,
              name: c.course || `Turma ${c.class_code || ''}`,
              type: 'turma',
              category: c.course,
              status: c.status,
              description: `${c.city || ''} - ${c.state || ''} | Turma ${c.class_code || ''}`,
              extra: c,
          });
      }
      for (const e of eventsData) {
          items.push({
              id: e.id,
              name: e.name,
              type: 'evento',
              category: 'Evento',
              status: e.registration_open ? 'active' : 'inactive',
              description: e.description || e.location || '',
              extra: e,
          });
      }
      return items;
  }, [products, classesData, eventsData]);

  const filteredItems = useMemo(() => {
      return unifiedItems.filter(item => {
          if (catalogTab !== 'all' && item.type !== catalogTab) return false;
          if (!searchTerm) return true;
          const s = searchTerm.toLowerCase();
          return (item.name || '').toLowerCase().includes(s) || (item.category || '').toLowerCase().includes(s) || (item.description || '').toLowerCase().includes(s);
      });
  }, [unifiedItems, catalogTab, searchTerm]);

  const getMappingForItem = (item: UnifiedItem): ContaAzulProductMapping | undefined => {
      return mappings.find(m => m.itemType === item.type && m.itemName === item.name);
  };

  const handleOpenContaAzulModal = (item: UnifiedItem) => {
      setContaAzulEditItem(item);
      const existing = getMappingForItem(item);
      if (existing) {
          setMappingForm({ ...existing });
      } else {
          const isFormacao = item.name.toLowerCase().includes('formação completa em pilates');
          setMappingForm({
              itemType: item.type,
              itemId: item.id,
              itemName: item.name,
              contaAzulCategoryId: '',
              splitMode: item.type === 'turma' ? 'divided' : 'all_service',
              productPercentage: item.type === 'turma' ? 30 : 0,
              servicePercentage: item.type === 'turma' ? 70 : 100,
              contaAzulServiceName: isFormacao ? `${item.name} - Espaço Vida Pilates` : `${item.name}`,
              contaAzulProductName: isFormacao ? `MATERIAL DIDÁTICO ${item.name.toUpperCase()}` : `MATERIAL DIDÁTICO ${item.name.toUpperCase()}`,
              billingCompanyName: '',
              billingCnpj: '',
          });
      }
      setShowContaAzulModal(true);
  };

  const handleSaveMapping = async () => {
      if (!mappingForm.itemName) return;
      setIsSaving(true);
      try {
          await appBackend.saveContaAzulProductMapping(mappingForm);
          await fetchMappings();
          setShowContaAzulModal(false);
          setContaAzulEditItem(null);
      } catch (e: any) {
          alert('Erro ao salvar configuração: ' + e.message);
      } finally {
          setIsSaving(false);
      }
  };

  // ── Course Builder (preserved) ───────────────────
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
          await appBackend.saveCourseModule({ ...editingModule, courseId: editingCourse.id });
          await handleOpenCourseBuilder(editingCourse);
          setShowModuleModal(false);
      } catch (e: any) { alert("Erro ao salvar módulo: " + e.message); } finally { setIsSaving(false); }
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
      setEditingLesson(lesson || { moduleId, title: '', description: '', videoUrl: '', orderIndex: (moduleLessons[moduleId] || []).length, materials: [] });
      setShowLessonModal(true);
  };

  const handleSaveLesson = async () => {
      if (!editingLesson?.title || !editingLesson?.moduleId) return;
      setIsSaving(true);
      try {
          await appBackend.saveCourseLesson(editingLesson);
          await handleOpenCourseBuilder(editingCourse!);
          setShowLessonModal(false);
      } catch (e: any) { alert("Erro ao salvar aula: " + e.message); } finally { setIsSaving(false); }
  };

  const handleSaveCourseMetadata = async () => {
      if (!editingCourse) return;
      setIsSaving(true);
      try {
          await appBackend.saveOnlineCourse(editingCourse);
          const product = products.find(p => p.name === editingCourse.title);
          if (product) {
              await appBackend.client.from('crm_products').update({
                  name: editingCourse.title, description: editingCourse.description,
                  price: editingCourse.price, image_url: editingCourse.imageUrl,
                  certificate_template_id: editingCourse.certificateTemplateId || null
              }).eq('id', product.id);
          }
          await fetchOnlineCourses(); await fetchProducts();
          alert("Configurações do curso salvas com sucesso!");
      } catch (e: any) { alert("Erro ao salvar: " + e.message); } finally { setIsSaving(false); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isForBuilder = false) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              if (isForBuilder && editingCourse) setEditingCourse({ ...editingCourse, imageUrl: result });
              else setProductImageUrl(result);
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
          image_url: productImageUrl, target_areas: formData.targetAreas || []
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

  const getTypeBadge = (type: CatalogItemType) => {
      switch (type) {
          case 'produto_digital': return { label: 'Produto Digital', color: 'bg-indigo-100 text-indigo-700', icon: ShoppingBag };
          case 'turma': return { label: 'Turma', color: 'bg-emerald-100 text-emerald-700', icon: GraduationCap };
          case 'evento': return { label: 'Evento', color: 'bg-amber-100 text-amber-700', icon: Mic };
      }
  };

  const tabCounts = useMemo(() => ({
      all: unifiedItems.length,
      produto_digital: unifiedItems.filter(i => i.type === 'produto_digital').length,
      turma: unifiedItems.filter(i => i.type === 'turma').length,
      evento: unifiedItems.filter(i => i.type === 'evento').length,
  }), [unifiedItems]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
        
        {activeSubView === 'products' ? (
            <>
                {/* ── HEADER ── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ShoppingBag className="text-indigo-600" /> Produtos e Serviços</h2>
                            <p className="text-slate-500 text-sm">Catálogo unificado com configuração Conta Azul.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={forceSyncPortal} className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-xl transition-all shadow-sm flex items-center gap-2 font-bold text-xs"><RefreshCw size={18} className={clsx(isLoading && "animate-spin")} /> {isLoading ? 'Sincronizando...' : 'Sincronizar'}</button>
                        <button onClick={handleOpenNew} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95"><Plus size={18} /> Novo Produto</button>
                    </div>
                </div>

                {/* ── SUB-TABS ── */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner">
                        {([
                            { key: 'all' as CatalogTab, label: 'Todos', icon: List },
                            { key: 'produto_digital' as CatalogTab, label: 'Produtos Digitais', icon: ShoppingBag },
                            { key: 'turma' as CatalogTab, label: 'Turmas', icon: GraduationCap },
                            { key: 'evento' as CatalogTab, label: 'Eventos', icon: Mic },
                        ]).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setCatalogTab(tab.key)}
                                className={clsx(
                                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-all",
                                    catalogTab === tab.key ? "bg-white text-indigo-700 shadow-md" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                                <span className={clsx("ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-black", catalogTab === tab.key ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-500")}>{tabCounts[tab.key]}</span>
                            </button>
                        ))}
                    </div>

                    <div className="relative flex-1 w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Buscar por nome, categoria..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium shadow-sm" />
                    </div>
                </div>

                {/* ── GRID ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-24 gap-4 text-slate-400"><Loader2 size={48} className="animate-spin text-indigo-600" /><p className="font-black uppercase text-xs tracking-widest">Carregando...</p></div>
                    ) : filteredItems.length === 0 ? (
                        <div className="col-span-full text-center py-24 text-slate-400">
                            <Package size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="font-bold">Nenhum item encontrado</p>
                        </div>
                    ) : (
                        filteredItems.map(item => {
                            const badge = getTypeBadge(item.type);
                            const mapping = getMappingForItem(item);
                            const BadgeIcon = badge.icon;
                            return (
                                <div key={`${item.type}-${item.id}`} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all overflow-hidden flex flex-col group animate-in fade-in zoom-in-95 duration-300">
                                    <div className="h-36 bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden shrink-0 border-b border-slate-100">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <BadgeIcon size={48} className="text-slate-200" />
                                            </div>
                                        )}
                                        {/* Type badge */}
                                        <div className="absolute top-3 left-3">
                                            <span className={clsx("text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1", badge.color)}>
                                                <BadgeIcon size={10} /> {badge.label}
                                            </span>
                                        </div>
                                        {/* Menu (only for products) */}
                                        {item.type === 'produto_digital' && (
                                            <div className="absolute top-3 right-3">
                                                <div className="relative">
                                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }} className="bg-white/90 backdrop-blur-md text-slate-600 p-2 rounded-full shadow-lg hover:bg-white transition-all"><MoreVertical size={16} /></button>
                                                    {activeMenuId === item.id && (
                                                        <div className="absolute right-0 top-10 w-36 bg-white rounded-xl shadow-2xl border border-slate-200 z-20 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                                                            <button onClick={() => { const p = item.extra as Product; setFormData(p); setProductImageUrl(p.imageUrl || (p as any).image_url || ''); setShowModal(true); setActiveMenuId(null); }} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b"><Edit2 size={14} /> Editar</button>
                                                            <button onClick={() => { if(window.confirm("Excluir produto?")) appBackend.client.from('crm_products').delete().eq('id', item.id).then(fetchProducts); }} className="w-full text-left px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Excluir</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {/* Conta Azul status */}
                                        {mapping && (
                                            <div className="absolute bottom-3 right-3">
                                                <span className="text-[9px] font-black px-2 py-1 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1 shadow-sm">
                                                    <Landmark size={10} /> Conta Azul
                                                </span>
                                            </div>
                                        )}
                                        {item.status && (
                                            <div className="absolute bottom-3 left-3 flex gap-2">
                                                <span className={clsx("text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-sm",
                                                    item.status === 'active' || item.status === 'Confirmado' ? "bg-green-600 text-white" : "bg-slate-400 text-white"
                                                )}>{item.status === 'active' ? 'Ativo' : item.status === 'inactive' ? 'Inativo' : item.status}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest flex items-center gap-1"><Tag size={10}/> {item.category}</p>
                                        <h3 className="font-black text-slate-800 text-base mb-1 line-clamp-2">{item.name}</h3>
                                        <p className="text-xs text-slate-400 line-clamp-2 mb-4 font-medium leading-relaxed">{item.description || 'Sem descrição.'}</p>
                                        
                                        {item.price !== undefined && item.price > 0 && (
                                            <p className="text-sm font-black text-emerald-600 mb-3">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        )}

                                        <div className="mt-auto flex flex-col gap-2">
                                            {item.type === 'produto_digital' && item.category === 'Curso Online' && (
                                                <button 
                                                    onClick={async () => {
                                                        let course = courses.find(c => (c.title || '').toLowerCase() === (item.name || '').toLowerCase());
                                                        if (course) handleOpenCourseBuilder(course);
                                                        else alert("Erro: Este curso precisa ser sincronizado primeiro.");
                                                    }}
                                                    className="w-full py-2.5 bg-slate-900 text-white hover:bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                                                >
                                                    <Layers size={14}/> Builder: Aulas & Módulos
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleOpenContaAzulModal(item)}
                                                className={clsx(
                                                    "w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95",
                                                    mapping 
                                                        ? "bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100" 
                                                        : "bg-white text-slate-500 border-2 border-dashed border-slate-200 hover:border-blue-300 hover:text-blue-600"
                                                )}
                                            >
                                                <Landmark size={14}/> {mapping ? 'Conta Azul Configurado' : 'Configurar Conta Azul'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </>
        ) : (
            /* ── COURSE BUILDER (preserved) ── */
            <div className="animate-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveSubView('products')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">{editingCourse?.title}</h2>
                            <p className="text-sm text-slate-500 font-medium">Editor de Estrutura do Aluno</p>
                        </div>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner shrink-0">
                        <button onClick={() => setBuilderTab('content')} className={clsx("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all", builderTab === 'content' ? "bg-white text-indigo-700 shadow-md" : "text-slate-500")}>Conteúdo</button>
                        <button onClick={() => setBuilderTab('settings')} className={clsx("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all", builderTab === 'settings' ? "bg-white text-indigo-700 shadow-md" : "text-slate-500")}>Configurações</button>
                    </div>
                </div>

                {builderTab === 'content' ? (
                    isLoadingBuilder ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>
                    ) : (
                        <div className="space-y-8 pb-20">
                            <div className="flex justify-between items-center px-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><List size={16}/> Grade Curricular</h3>
                                <button onClick={() => handleOpenModuleModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-600/10"><Plus size={18}/> Novo Módulo</button>
                            </div>
                            {courseModules.length === 0 ? (
                                <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 text-slate-400">
                                    <LayoutTemplate size={64} className="mx-auto mb-4 opacity-10"/>
                                    <p className="font-bold text-lg">Curso sem estrutura definida</p>
                                    <p className="text-sm">Inicie criando o primeiro módulo de ensino.</p>
                                </div>
                            ) : courseModules.map(mod => (
                                <div key={mod.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-slate-50 px-8 py-5 border-b flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl border shadow-sm flex items-center justify-center font-black text-indigo-600 text-xs">{(mod.orderIndex || 0) + 1}</div>
                                            <h3 className="font-black text-slate-800 uppercase tracking-tight">{mod.title}</h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleOpenLessonModal(mod.id)} className="bg-white border border-slate-200 hover:border-indigo-300 text-indigo-600 px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2"><Plus size={14}/> Add Aula</button>
                                            <button onClick={() => handleOpenModuleModal(mod)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDeleteModule(mod.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                    <div className="p-6 space-y-3">
                                        {(moduleLessons[mod.id] || []).map((lesson) => (
                                            <div key={lesson.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"><Video size={20}/></div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm">{lesson.title}</h4>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            {lesson.videoUrl && <span className="text-[9px] text-red-500 font-black uppercase flex items-center gap-1"><PlayCircle size={10}/> Vídeo Vinculado</span>}
                                                            {(lesson.materials || []).length > 0 && <span className="text-[9px] text-teal-600 font-black uppercase flex items-center gap-1"><Paperclip size={16}/> {lesson.materials?.length} Anexo(s)</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleOpenLessonModal(mod.id, lesson)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={18}/></button>
                                                    <button onClick={() => handleDeleteLesson(lesson.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                                </div>
                                            </div>
                                        ))}
                                        {(moduleLessons[mod.id] || []).length === 0 && <p className="text-center py-6 text-xs text-slate-300 italic font-medium">Nenhuma aula neste módulo.</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="max-w-4xl mx-auto bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 space-y-10 animate-in fade-in">
                        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                            <div className="p-4 bg-indigo-50 rounded-3xl text-indigo-600"><Settings size={32}/></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Metadados do Curso</h3>
                                <p className="text-sm text-slate-400">Configurações técnicas exibidas no Portal do Aluno.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Imagem de Capa (Portal)</label>
                                <div className="flex flex-col md:flex-row gap-6 items-center bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
                                    <div className="w-48 h-32 bg-white rounded-2xl border flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                                        {editingCourse?.imageUrl ? <img src={editingCourse.imageUrl} className="w-full h-full object-cover" alt="Course" /> : <ImageIcon className="text-slate-100" size={48} />}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <p className="text-xs text-slate-500">Esta imagem será vista pelos alunos na vitrine.</p>
                                        <button onClick={() => fileInputRef.current?.click()} className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-2.5 rounded-xl text-xs font-black uppercase hover:border-indigo-500 shadow-sm flex items-center gap-2 transition-all">Alterar Imagem</button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Título do Curso</label>
                                <input type="text" className="w-full px-5 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-2xl text-base font-black outline-none transition-all" value={editingCourse?.title} onChange={e => setEditingCourse(prev => prev ? {...prev, title: e.target.value} : null)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Descrição Curta</label>
                                <textarea className="w-full px-5 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-2xl text-sm h-32 resize-none outline-none transition-all leading-relaxed" value={editingCourse?.description} onChange={e => setEditingCourse(prev => prev ? {...prev, description: e.target.value} : null)} placeholder="Resumo do curso para o aluno..." />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Valor Sugerido (R$)</label>
                                <input type="number" className="w-full px-5 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-2xl text-sm font-bold outline-none" value={editingCourse?.price} onChange={e => setEditingCourse(prev => prev ? {...prev, price: parseFloat(e.target.value) || 0} : null)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Link de Pagamento / Renovação</label>
                                <input type="text" className="w-full px-5 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-2xl text-xs font-mono outline-none" value={editingCourse?.paymentLink} onChange={e => setEditingCourse(prev => prev ? {...prev, paymentLink: e.target.value} : null)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Modelo de Certificado (Automático)</label>
                                <div className="relative">
                                    <Award className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={18}/>
                                    <select className="w-full pl-12 pr-10 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-amber-500 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer transition-all" value={editingCourse?.certificateTemplateId || ''} onChange={e => setEditingCourse(prev => prev ? {...prev, certificateTemplateId: e.target.value} : null)}>
                                        <option value="">Nenhum certificado vinculado</option>
                                        {certificates.map(cert => (<option key={cert.id} value={cert.id}>{cert.title}</option>))}
                                    </select>
                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={18}/>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 ml-1">Este modelo será emitido para o aluno ao atingir 100% de progresso no curso.</p>
                            </div>
                        </div>
                        <div className="pt-8 border-t flex justify-end">
                            <button onClick={handleSaveCourseMetadata} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all">
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Configurações
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* ══════ MODAL: NOVO PRODUTO COMERCIAL ══════ */}
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
                                            <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-0" checked={(formData.targetAreas || []).includes(area.id)}
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
                                        <select className="w-full pl-12 pr-10 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-amber-500 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer" value={formData.certificateTemplateId || ''} onChange={e => setFormData({ ...formData, certificateTemplateId: e.target.value })}>
                                            <option value="">Nenhum certificado vinculado</option>
                                            {certificates.map(cert => (<option key={cert.id} value={cert.id}>{cert.title}</option>))}
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

        {/* ══════ MODAL: CONFIGURAÇÃO CONTA AZUL ══════ */}
        {showContaAzulModal && contaAzulEditItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl animate-in zoom-in-95 flex flex-col max-h-[95vh] overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-slate-50 shrink-0">
                        <div>
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-xl"><Landmark size={20} className="text-blue-700" /></div>
                                Configuração Conta Azul
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 ml-12">{contaAzulEditItem.name}</p>
                        </div>
                        <button onClick={() => { setShowContaAzulModal(false); setContaAzulEditItem(null); }} className="p-1.5 hover:bg-slate-200 rounded-full transition-all"><X size={24}/></button>
                    </div>
                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                        {/* Tipo do item */}
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            {(() => { const b = getTypeBadge(contaAzulEditItem.type); const I = b.icon; return <span className={clsx("text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1", b.color)}><I size={12}/> {b.label}</span>; })()}
                            <span className="text-sm font-bold text-slate-700">{contaAzulEditItem.name}</span>
                        </div>

                        {/* Categoria Conta Azul */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Categoria no Conta Azul</label>
                            <select
                                value={mappingForm.contaAzulCategoryId || ''}
                                onChange={e => setMappingForm(f => ({ ...f, contaAzulCategoryId: e.target.value }))}
                                className="w-full px-5 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all"
                            >
                                <option value="">Selecione uma categoria...</option>
                                {contaAzulCategories.map(cat => (
                                    <option key={cat.id} value={cat.id_conta_azul}>{cat.nome}</option>
                                ))}
                            </select>
                            {contaAzulCategories.length === 0 && <p className="text-[10px] text-amber-600 mt-1 ml-1 font-medium">Sincronize as categorias no painel Conta Azul primeiro.</p>}
                        </div>

                        {/* Empresa de Faturamento / CNPJ */}
                        <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Building2 size={16} className="text-blue-600" />
                                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">Empresa de Faturamento</span>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1">Selecionar Empresa</label>
                                <select
                                    value={mappingForm.billingCnpj || ''}
                                    onChange={e => {
                                        const cnpj = e.target.value;
                                        const company = companiesList.find(c => c.cnpj === cnpj);
                                        setMappingForm(f => ({
                                            ...f,
                                            billingCnpj: cnpj,
                                            billingCompanyName: company?.legalName || '',
                                        }));
                                    }}
                                    className="w-full px-5 py-3 border-2 border-blue-200 bg-white focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all"
                                >
                                    <option value="">Selecione a empresa de faturamento...</option>
                                    {companiesList.map(comp => (
                                        <option key={comp.id} value={comp.cnpj}>{comp.legalName} — {comp.cnpj}</option>
                                    ))}
                                </select>
                                {companiesList.length === 0 && <p className="text-[10px] text-amber-600 mt-1 ml-1 font-medium">Cadastre empresas em Configurações &gt; Empresas do Grupo.</p>}
                            </div>
                            {mappingForm.billingCompanyName && (
                                <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Empresa (Auto)</label>
                                        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-blue-200 text-xs font-bold text-blue-900">
                                            <Building2 size={14} className="text-blue-500 shrink-0" /> {mappingForm.billingCompanyName}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">CNPJ de Venda (Auto)</label>
                                        <div className="bg-white px-4 py-2.5 rounded-xl border border-blue-200 text-xs font-mono text-slate-700">
                                            {mappingForm.billingCnpj}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modo de Divisão (para todos os tipos) */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                                Classificação no Conta Azul
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {([
                                    { value: 'all_service' as ContaAzulSplitMode, label: 'Tudo como Serviço', desc: 'Lançado integralmente como serviço', icon: Briefcase, color: 'blue' },
                                    { value: 'all_product' as ContaAzulSplitMode, label: 'Tudo como Produto', desc: 'Lançado integralmente como produto', icon: Package, color: 'emerald' },
                                    { value: 'divided' as ContaAzulSplitMode, label: 'Dividido: Material Didático + Serviço', desc: 'Parte como produto (material) e parte como serviço', icon: SplitSquareHorizontal, color: 'violet' },
                                ]).map(opt => (
                                    <label
                                        key={opt.value}
                                        className={clsx(
                                            "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            mappingForm.splitMode === opt.value
                                                ? `bg-${opt.color}-50 border-${opt.color}-400 ring-1 ring-${opt.color}-200`
                                                : "bg-white border-slate-100 hover:bg-slate-50"
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="splitMode"
                                            value={opt.value}
                                            checked={mappingForm.splitMode === opt.value}
                                            onChange={() => {
                                                const update: Partial<ContaAzulProductMapping> = { splitMode: opt.value };
                                                if (opt.value === 'all_service') { update.productPercentage = 0; update.servicePercentage = 100; }
                                                else if (opt.value === 'all_product') { update.productPercentage = 100; update.servicePercentage = 0; }
                                                else { update.productPercentage = 30; update.servicePercentage = 70; }
                                                setMappingForm(f => ({ ...f, ...update }));
                                            }}
                                            className="w-4 h-4 text-blue-600"
                                        />
                                        <opt.icon size={18} className={clsx(mappingForm.splitMode === opt.value ? "text-blue-600" : "text-slate-400")} />
                                        <div>
                                            <p className="text-sm font-black text-slate-700">{opt.label}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{opt.desc}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Percentuais (quando dividido) */}
                        {mappingForm.splitMode === 'divided' && (
                            <div className="animate-in slide-in-from-top-2 duration-200 space-y-4 p-5 bg-violet-50 rounded-2xl border border-violet-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Percent size={16} className="text-violet-600" />
                                    <span className="text-xs font-black text-violet-700 uppercase tracking-widest">Divisão Percentual</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1">% Produto (Material)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min={0} max={100} step={1}
                                                value={mappingForm.productPercentage ?? 30}
                                                onChange={e => {
                                                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                    setMappingForm(f => ({ ...f, productPercentage: val, servicePercentage: 100 - val }));
                                                }}
                                                className="w-full px-5 py-3 border-2 border-violet-200 bg-white rounded-2xl text-lg font-black text-violet-700 outline-none focus:border-violet-500"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-violet-400 font-black text-sm">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1">% Serviço</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min={0} max={100} step={1}
                                                value={mappingForm.servicePercentage ?? 70}
                                                onChange={e => {
                                                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                    setMappingForm(f => ({ ...f, servicePercentage: val, productPercentage: 100 - val }));
                                                }}
                                                className="w-full px-5 py-3 border-2 border-blue-200 bg-white rounded-2xl text-lg font-black text-blue-700 outline-none focus:border-blue-500"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 font-black text-sm">%</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Visual bar */}
                                <div className="h-3 rounded-full overflow-hidden flex bg-slate-200">
                                    <div className="bg-violet-500 transition-all duration-300" style={{ width: `${mappingForm.productPercentage || 0}%` }} />
                                    <div className="bg-blue-500 transition-all duration-300" style={{ width: `${mappingForm.servicePercentage || 0}%` }} />
                                </div>
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                    <span className="text-violet-600">Produto: {mappingForm.productPercentage}%</span>
                                    <span className="text-blue-600">Serviço: {mappingForm.servicePercentage}%</span>
                                </div>
                            </div>
                        )}

                        {/* Nomes no Conta Azul */}
                        {(mappingForm.splitMode === 'divided' || mappingForm.splitMode === 'all_service') && (
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    Nome do Item (Serviço) no Conta Azul
                                </label>
                                <input
                                    type="text"
                                    value={mappingForm.contaAzulServiceName || ''}
                                    onChange={e => setMappingForm(f => ({ ...f, contaAzulServiceName: e.target.value }))}
                                    className="w-full px-5 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all"
                                    placeholder="Ex: Formação Completa em Pilates - Espaço Vida Pilates"
                                />
                            </div>
                        )}

                        {(mappingForm.splitMode === 'divided' || mappingForm.splitMode === 'all_product') && (
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    Nome do Item (Produto) no Conta Azul
                                </label>
                                <input
                                    type="text"
                                    value={mappingForm.contaAzulProductName || ''}
                                    onChange={e => setMappingForm(f => ({ ...f, contaAzulProductName: e.target.value }))}
                                    className="w-full px-5 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-emerald-500 rounded-2xl text-sm font-bold outline-none transition-all"
                                    placeholder="Ex: MATERIAL DIDÁTICO FORMAÇÃO COMPLETA EM PILATES"
                                />
                            </div>
                        )}

                        {/* Preview */}
                        {mappingForm.splitMode === 'divided' && (
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Prévia de Lançamento</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black px-2 py-1 rounded-full bg-blue-100 text-blue-700">SERVIÇO</span>
                                    <span className="text-xs font-bold text-slate-600">{mappingForm.contaAzulServiceName || '—'}</span>
                                    <span className="text-xs text-slate-400 ml-auto">{mappingForm.servicePercentage}% do valor</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black px-2 py-1 rounded-full bg-violet-100 text-violet-700">PRODUTO</span>
                                    <span className="text-xs font-bold text-slate-600">{mappingForm.contaAzulProductName || '—'}</span>
                                    <span className="text-xs text-slate-400 ml-auto">{mappingForm.productPercentage}% do valor</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="px-8 py-5 bg-slate-50 border-t flex justify-between items-center rounded-b-[2rem]">
                        {mappingForm.id && (
                            <button
                                onClick={async () => {
                                    if (window.confirm('Remover configuração Conta Azul deste item?')) {
                                        await appBackend.deleteContaAzulProductMapping(mappingForm.id!);
                                        await fetchMappings();
                                        setShowContaAzulModal(false);
                                    }
                                }}
                                className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                            >
                                <Trash2 size={14} /> Remover
                            </button>
                        )}
                        <div className={clsx("flex gap-3", !mappingForm.id && "ml-auto")}>
                            <button onClick={() => { setShowContaAzulModal(false); setContaAzulEditItem(null); }} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-sm">Cancelar</button>
                            <button onClick={handleSaveMapping} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-xl active:scale-95 disabled:opacity-50 transition-all">
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Configuração
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ══════ MODAL: MÓDULO ══════ */}
        {showModuleModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                    <div className="px-8 py-6 border-b bg-slate-50 flex justify-between items-center">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Layout size={20} className="text-indigo-600"/> {editingModule?.id ? 'Editar Módulo' : 'Novo Módulo'}</h3>
                        <button onClick={() => setShowModuleModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                    </div>
                    <div className="p-8 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Título do Módulo</label>
                            <input type="text" className="w-full px-5 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-base font-bold outline-none transition-all" value={editingModule?.title} onChange={e => setEditingModule(prev => prev ? {...prev, title: e.target.value} : null)} placeholder="Ex: Fundamentos do Pilates" autoFocus />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Ordem de Exibição</label>
                            <input type="number" className="w-full px-5 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-sm outline-none transition-all" value={editingModule?.orderIndex} onChange={e => setEditingModule(prev => prev ? {...prev, orderIndex: parseInt(e.target.value) || 0} : null)} />
                        </div>
                        <button onClick={handleSaveModule} disabled={isSaving || !editingModule?.title} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Módulo
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* ══════ MODAL: AULA ══════ */}
        {showLessonModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                    <div className="px-8 py-6 border-b bg-slate-50 flex justify-between items-center shrink-0">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Video size={20} className="text-indigo-600"/> {editingLesson?.id ? 'Editar Aula' : 'Nova Aula'}</h3>
                        <button onClick={() => setShowLessonModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                    </div>
                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Título da Aula *</label>
                            <input type="text" className="w-full px-5 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-base font-bold outline-none transition-all" value={editingLesson?.title} onChange={e => setEditingLesson(prev => prev ? {...prev, title: e.target.value} : null)} placeholder="Ex: Exercícios de Solo Nível 1" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Código de Incorporação (YouTube Embed Code)</label>
                            <div className="relative">
                                <Code className="absolute left-4 top-4 text-indigo-500" size={18}/>
                                <textarea className="w-full pl-12 pr-5 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-sm outline-none transition-all font-mono h-32" value={editingLesson?.videoUrl} onChange={e => setEditingLesson(prev => prev ? {...prev, videoUrl: e.target.value} : null)} placeholder="<iframe ...></iframe>" />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 ml-1">{"Copie o código completo do botão 'Compartilhar' > 'Incorporar' no YouTube."}</p>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descrição / Instruções</label>
                            <textarea className="w-full px-5 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-sm h-32 resize-none outline-none transition-all leading-relaxed" value={editingLesson?.description} onChange={e => setEditingLesson(prev => prev ? {...prev, description: e.target.value} : null)} placeholder="O que o aluno aprenderá nesta aula?" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-3 px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Materiais de Apoio (Links)</label>
                                <button type="button" onClick={() => setEditingLesson(prev => prev ? {...prev, materials: [...(prev.materials || []), { name: '', url: '' }]} : null)} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">+ Adicionar Anexo</button>
                            </div>
                            <div className="space-y-2">
                                {editingLesson?.materials?.map((mat, mIdx) => (
                                    <div key={mIdx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100 animate-in slide-in-from-left-2">
                                        <input type="text" placeholder="Nome (Ex: PDF Aula)" className="w-1/3 px-3 py-1.5 border rounded-lg text-xs" value={mat.name} onChange={e => { const newMats = [...(editingLesson.materials || [])]; newMats[mIdx].name = e.target.value; setEditingLesson({...editingLesson, materials: newMats}); }} />
                                        <input type="text" placeholder="URL do arquivo" className="flex-1 px-3 py-1.5 border rounded-lg text-xs font-mono" value={mat.url} onChange={e => { const newMats = [...(editingLesson.materials || [])]; newMats[mIdx].url = e.target.value; setEditingLesson({...editingLesson, materials: newMats}); }} />
                                        <button onClick={() => { const newMats = [...(editingLesson.materials || [])].filter((_, i) => i !== mIdx); setEditingLesson({...editingLesson, materials: newMats}); }} className="p-1.5 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                                {(!editingLesson?.materials || editingLesson.materials.length === 0) && (
                                    <p className="text-[10px] text-slate-300 italic text-center py-2">Nenhum material de apoio vinculado.</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3 rounded-b-[2.5rem]">
                        <button onClick={() => setShowLessonModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-sm">Cancelar</button>
                        <button onClick={handleSaveLesson} disabled={isSaving || !editingLesson?.title} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-2.5 rounded-xl font-black text-sm shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2">
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Aula
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

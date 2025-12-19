
import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Plus, Search, MoreVertical, Edit2, Trash2, 
  ExternalLink, ArrowLeft, Save, X, Tag, MonitorPlay, 
  DollarSign, Globe, Loader2, CheckCircle2, AlertCircle, Award
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { Product, CertificateModel } from '../types';

interface ProductsManagerProps {
  onBack: () => void;
}

const CATEGORIES = ['Curso Online', 'E-book', 'Mentoria', 'Webinar', 'Assinatura/Comunidade', 'Workshop Online'];
const PLATFORMS = ['Hotmart', 'Eduzz', 'Monetizze', 'Kiwify', 'Plataforma Própria', 'Outros'];

export const ProductsManager: React.FC<ProductsManagerProps> = ({ onBack }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [certificates, setCertificates] = useState<CertificateModel[]>([]); // New: Certificates List
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Form State
  const initialFormState: Product = {
      id: '',
      name: '',
      category: 'Curso Online',
      platform: '',
      price: 0,
      url: '',
      status: 'active',
      description: '',
      certificateTemplateId: '', // New field
      createdAt: ''
  };
  const [formData, setFormData] = useState<Product>(initialFormState);

  // --- Effects ---
  useEffect(() => {
      fetchProducts();
      fetchCertificates();
  }, []);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.product-menu-btn') === null) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // --- Actions ---
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
              certificateTemplateId: p.certificate_template_id, // Map new field
              createdAt: p.created_at
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
          price: formData.price,
          url: formData.url,
          status: formData.status,
          description: formData.description,
          certificate_template_id: formData.certificateTemplateId || null
      };

      try {
          const isUpdate = !!formData.id;
          if (isUpdate) {
              await appBackend.client.from('crm_products').update(payload).eq('id', formData.id);
              await appBackend.logActivity({ action: 'update', module: 'products', details: `Editou produto digital: ${formData.name}`, recordId: formData.id });
          } else {
              const { data } = await appBackend.client.from('crm_products').insert([payload]).select().single();
              await appBackend.logActivity({ action: 'create', module: 'products', details: `Cadastrou produto digital: ${formData.name}`, recordId: data?.id });
          }
          await fetchProducts();
          setShowModal(false);
          setFormData(initialFormState);
      } catch (e: any) {
          alert(`Erro ao salvar: ${e.message}`);
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

  const handleOpenNew = () => {
      setFormData(initialFormState);
      setShowModal(true);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
        
        {/* Header */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ShoppingBag className="text-indigo-600" /> Produtos Digitais
                    </h2>
                    <p className="text-slate-500 text-sm">Gerencie seus cursos online, e-books e infoprodutos.</p>
                </div>
            </div>
            <button 
                onClick={handleOpenNew}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
            >
                <Plus size={18} /> Novo Produto
            </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar produto por nome..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
            </div>
        </div>

        {/* Grid List */}
        {isLoading ? (
            <div className="flex justify-center py-20">
                <Loader2 size={40} className="animate-spin text-indigo-600" />
            </div>
        ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                <MonitorPlay size={48} className="mx-auto mb-4 opacity-50" />
                <p>Nenhum produto digital cadastrado.</p>
                <button onClick={handleOpenNew} className="text-indigo-600 font-bold hover:underline mt-2">Cadastrar o primeiro</button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(product => (
                    <div key={product.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                        <div className="p-5 flex-1">
                            <div className="flex justify-between items-start mb-3">
                                <span className={clsx("text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide", product.status === 'active' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>
                                    {product.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                                <div className="relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === product.id ? null : product.id);
                                        }}
                                        className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 product-menu-btn"
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                    {activeMenuId === product.id && (
                                        <div className="absolute right-0 top-8 w-32 bg-white rounded-lg shadow-xl border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                            <button onClick={() => handleEdit(product)} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                                <Edit2 size={12} /> Editar
                                            </button>
                                            <button onClick={() => handleDelete(product.id)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                <Trash2 size={12} /> Excluir
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-800 text-lg mb-1">{product.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                                <Tag size={12} /> {product.category}
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span>{product.platform}</span>
                            </div>

                            {product.certificateTemplateId && (
                                <div className="mb-3">
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-100 font-medium">
                                        <Award size={10} /> Com Certificado
                                    </span>
                                </div>
                            )}

                            <p className="text-sm text-slate-600 line-clamp-2 h-10 mb-2">
                                {product.description || 'Sem descrição.'}
                            </p>
                        </div>

                        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-lg">{formatCurrency(product.price)}</span>
                            {product.url && (
                                <a href={product.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 p-2 hover:bg-indigo-50 rounded-full transition-colors" title="Ver Link">
                                    <ExternalLink size={18} />
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <MonitorPlay size={20} className="text-indigo-600" />
                            {formData.id ? 'Editar Produto' : 'Novo Produto Digital'}
                        </h3>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={20}/></button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Produto</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Formação em Pilates Online"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Categoria</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Plataforma</label>
                                <input 
                                    type="text" 
                                    list="platforms"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                                    value={formData.platform}
                                    onChange={e => setFormData({ ...formData, platform: e.target.value })}
                                    placeholder="Ex: Hotmart"
                                />
                                <datalist id="platforms">
                                    {PLATFORMS.map(p => <option key={p} value={p} />)}
                                </datalist>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Preço (R$)</label>
                                <div className="relative">
                                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="number" 
                                        className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm" 
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                >
                                    <option value="active">Ativo (À Venda)</option>
                                    <option value="inactive">Inativo (Encerrado)</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                                    <Award size={12} className="text-amber-500" /> Modelo de Certificado
                                </label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    value={formData.certificateTemplateId || ''}
                                    onChange={e => setFormData({ ...formData, certificateTemplateId: e.target.value })}
                                >
                                    <option value="">Sem Certificado</option>
                                    {certificates.map(cert => (
                                        <option key={cert.id} value={cert.id}>{cert.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-600 mb-1">Link de Venda / Página</label>
                                <div className="relative">
                                    <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm" 
                                        value={formData.url}
                                        onChange={e => setFormData({ ...formData, url: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-600 mb-1">Descrição</label>
                                <textarea 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-24 resize-none"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Detalhes sobre o produto..."
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100 rounded-b-xl shrink-0">
                        <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                        <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm flex items-center gap-2">
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Salvar Produto
                        </button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

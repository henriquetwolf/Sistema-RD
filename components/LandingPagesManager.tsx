
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, MoreVertical, Edit2, Trash2, Globe, Monitor, 
  ArrowLeft, Layout, MousePointer2, CheckCircle, Clock, ExternalLink, 
  Eye, Save, Send, ChevronRight, X, Sparkles, Filter, List, Grid,
  BarChart3, Settings, Loader2
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { LandingPage } from '../types';
import { LandingPageEditor } from './LandingPageEditor';
import clsx from 'clsx';

interface LandingPagesManagerProps {
  onBack: () => void;
}

const CATEGORIES = [
  'Todos', 'Recomendados', 'Geração de Leads', 'Agradecimento', 'Página de Vendas', 'Educação', 'Eventos'
];

const TEMPLATE_CONTENTS: Record<string, any> = {
  'free-class': {
    sections: [
      {
        id: 'fold-1',
        bgColor: '#f8fafc',
        padding: '80px',
        elements: [
          { id: 'e1', type: 'heading', content: 'Sua Primeira Aula de Pilates é Por Nossa Conta!', style: { fontSize: 42, color: '#1e293b', textAlign: 'center', fontWeight: 'bold' } },
          { id: 'e2', type: 'text', content: 'Experimente a transformação no seu corpo e mente com o método VOLL.', style: { fontSize: 18, color: '#64748b', textAlign: 'center' } },
          { id: 'e3', type: 'button', content: 'Quero Minha Aula Grátis', style: { bgColor: '#0d9488', color: '#ffffff', borderRadius: 8, align: 'center' } }
        ]
      }
    ]
  },
  'course-presential': {
    sections: [
      {
        id: 'fold-1',
        bgColor: '#1e293b',
        padding: '100px',
        elements: [
          { id: 'e1', type: 'heading', content: 'Formação Profissional em Pilates', style: { fontSize: 48, color: '#ffffff', textAlign: 'center', fontWeight: '900' } },
          { id: 'e2', type: 'text', content: 'Torne-se um instrutor de elite com a maior escola de Pilates do mundo.', style: { fontSize: 20, color: '#94a3b8', textAlign: 'center' } },
          { id: 'e3', type: 'button', content: 'Ver Próximas Turmas', style: { bgColor: '#0d9488', color: '#ffffff', borderRadius: 50, align: 'center' } }
        ]
      }
    ]
  },
  'discount-cupom': {
    sections: [
      {
        id: 'fold-1',
        bgColor: '#fff',
        padding: '60px',
        elements: [
          { id: 'e1', type: 'image', content: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=800', style: { width: '300px', align: 'center' } },
          { id: 'e2', type: 'heading', content: 'Você Ganhou um Presente!', style: { fontSize: 32, color: '#b91c1c', textAlign: 'center', fontWeight: 'bold' } },
          { id: 'e3', type: 'text', content: 'Use o cupom VOLL10 para garantir 10% de desconto em qualquer curso.', style: { fontSize: 16, color: '#444', textAlign: 'center' } }
        ]
      }
    ]
  },
  'thank-you': {
    sections: [
      {
        id: 'fold-1',
        bgColor: '#f0fdf4',
        padding: '80px',
        elements: [
          { id: 'e1', type: 'heading', content: 'Inscrição Confirmada!', style: { fontSize: 36, color: '#166534', textAlign: 'center', fontWeight: 'bold' } },
          { id: 'e2', type: 'text', content: 'Verifique seu e-mail para mais detalhes. Estamos ansiosos para te ver!', style: { fontSize: 18, color: '#166534', textAlign: 'center' } }
        ]
      }
    ]
  },
  'webinar-live': {
    sections: [
      {
        id: 'fold-1',
        bgColor: '#000000',
        padding: '80px',
        elements: [
          { id: 'e1', type: 'heading', content: 'MASTERCLASS AO VIVO', style: { fontSize: 24, color: '#0d9488', textAlign: 'center', fontWeight: 'bold' } },
          { id: 'e2', type: 'heading', content: 'Os 7 Segredos para um Studio de Sucesso', style: { fontSize: 42, color: '#ffffff', textAlign: 'center', fontWeight: 'bold' } },
          { id: 'e3', type: 'button', content: 'Garantir meu Lugar', style: { bgColor: '#0d9488', color: '#ffffff', borderRadius: 8, align: 'center' } }
        ]
      }
    ]
  }
};

export const LandingPagesManager: React.FC<LandingPagesManagerProps> = ({ onBack }) => {
  const [view, setView] = useState<'list' | 'editor' | 'templates'>('list');
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [showWizard, setShowWizard] = useState(false);
  
  const [lpName, setLpName] = useState('');
  const [lpSlug, setLpSlug] = useState('');
  const [lpDomain, setLpDomain] = useState(window.location.origin);
  const [activeLp, setActiveLp] = useState<LandingPage | null>(null);

  useEffect(() => {
    fetchLPs();
  }, []);

  const fetchLPs = async () => {
    setIsLoading(true);
    try {
      const data = await appBackend.getLandingPages();
      setLandingPages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setView('templates');
  };

  const slugify = (text: string) => {
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLpName(val);
    setLpSlug(slugify(val));
  };

  const handleSelectTemplate = (templateId: string, category: string) => {
    setLpName('');
    setLpSlug('');
    setLpDomain(window.location.origin);
    setShowWizard(true);
    (window as any)._pendingTemplate = { templateId, category };
  };

  const confirmWizard = async () => {
    if (!lpName || !lpSlug) {
      alert("Preencha o nome e o caminho do link.");
      return;
    }
    
    const { templateId, category } = (window as any)._pendingTemplate || {};
    const content = templateId ? TEMPLATE_CONTENTS[templateId] : { sections: [] };
    
    const newLp: LandingPage = {
      id: crypto.randomUUID(),
      name: lpName,
      domain: lpDomain,
      slug: lpSlug,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: content,
      templateId,
      category,
      visits: 0,
      conversions: 0
    };

    try {
      await appBackend.saveLandingPage(newLp);
      setActiveLp(newLp);
      setView('editor');
      setShowWizard(false);
    } catch (e) {
      alert("Erro ao criar Landing Page.");
    }
  };

  const handleEdit = (lp: LandingPage) => {
    setActiveLp(lp);
    setView('editor');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja realmente excluir esta Landing Page?")) {
      try {
        await appBackend.deleteLandingPage(id);
        setLandingPages(prev => prev.filter(p => p.id !== id));
      } catch (e) {
        alert("Erro ao excluir.");
      }
    }
  };

  const filteredLPs = landingPages.filter(lp => {
    const matchesSearch = lp.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || lp.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (view === 'editor' && activeLp) {
    return <LandingPageEditor lp={activeLp} onBack={() => { setView('list'); fetchLPs(); }} />;
  }

  if (view === 'templates') {
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-8">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Escolha um Modelo</h2>
                    <p className="text-slate-500 text-sm">Use um modelo profissional para acelerar sua criação.</p>
                </div>
            </div>
        </div>

        <div className="flex gap-8">
          <aside className="w-64 shrink-0 space-y-1">
             {CATEGORIES.map(cat => (
               <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                  "w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  selectedCategory === cat ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-white"
                )}
               >
                 {cat}
               </button>
             ))}
          </aside>

          <div className="flex-1">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { id: 'free-class', title: 'Primeira aula grátis', category: 'Geração de Leads', img: 'https://images.unsplash.com/photo-1518611012118-2960520ee86c?auto=format&fit=crop&q=80&w=800' },
                  { id: 'course-presential', title: 'Formação Profissional', category: 'Página de Vendas', img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=800' },
                  { id: 'discount-cupom', title: 'Cupom de Desconto', category: 'Geração de Leads', img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=800' },
                  { id: 'thank-you', title: 'Agradecimento Padrão', category: 'Agradecimento', img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800' },
                  { id: 'webinar-live', title: 'Inscrição para Live', category: 'Eventos', img: 'https://images.unsplash.com/photo-1540575861501-7ad05823c9f5?auto=format&fit=crop&q=80&w=800' },
                ].filter(t => selectedCategory === 'Todos' || t.category === selectedCategory).map(template => (
                  <div 
                    key={template.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all group cursor-pointer"
                    onClick={() => handleSelectTemplate(template.id, template.category)}
                  >
                    <div className="h-48 relative overflow-hidden">
                      <img src={template.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={template.title} />
                      <div className="absolute inset-0 bg-teal-600/0 group-hover:bg-teal-600/20 transition-all flex items-center justify-center">
                        <button className="bg-white text-teal-700 px-6 py-2 rounded-full font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                          Usar este modelo
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{template.category}</span>
                      <h3 className="font-bold text-slate-800">{template.title}</h3>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {showWizard && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
               <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                  <h3 className="text-xl font-black text-slate-800">Criar Landing Page</h3>
                  <button onClick={() => setShowWizard(false)} className="p-2 text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
               </div>
               <div className="p-8 space-y-6">
                 <p className="text-sm text-slate-500">Defina os detalhes da sua nova página.</p>
                 
                 <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nome Interno</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white transition-all"
                        placeholder="Ex: Campanha de Inverno"
                        value={lpName}
                        onChange={handleNameChange}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Link Final</label>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:bg-white focus-within:border-teal-500 transition-all">
                        <span className="pl-4 py-3 text-xs text-slate-400 font-medium select-none">{lpDomain}/</span>
                        <input 
                          type="text"
                          className="flex-1 pr-4 py-3 bg-transparent border-none text-sm font-bold outline-none text-teal-700"
                          placeholder="minha-pagina"
                          value={lpSlug}
                          onChange={e => setLpSlug(slugify(e.target.value))}
                        />
                      </div>
                    </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button onClick={() => setShowWizard(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
                    <button 
                      onClick={confirmWizard}
                      disabled={!lpName || !lpSlug}
                      className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold shadow-lg hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-50"
                    >
                      Criar Agora
                    </button>
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Monitor className="text-teal-600" /> Landing Pages
          </h2>
          <p className="text-slate-500 text-sm">Gestão de páginas de vendas e captura de leads.</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
        >
          <Plus size={20} /> Criar Landing Page
        </button>
      </div>

      <div className="flex bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar páginas..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <select 
          className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none"
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-teal-600" size={40} /></div>
      ) : filteredLPs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
          <Layout size={64} className="mx-auto mb-4 opacity-10" />
          <p className="font-bold text-lg">Nenhuma página encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredLPs.map(lp => (
            <div key={lp.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden">
               <div className="h-40 bg-slate-100 relative">
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Monitor size={48} className="opacity-20" />
                  </div>
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(lp)} className="p-2 bg-white text-teal-600 rounded-lg shadow-lg hover:bg-teal-50"><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(lp.id)} className="p-2 bg-white text-red-600 rounded-lg shadow-lg hover:bg-red-50"><Trash2 size={16}/></button>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className={clsx(
                      "text-[10px] font-black uppercase px-2 py-1 rounded-full shadow-sm",
                      lp.status === 'published' ? "bg-green-600 text-white" : "bg-slate-400 text-white"
                    )}>
                      {lp.status === 'published' ? 'Publicada' : 'Rascunho'}
                    </span>
                  </div>
               </div>
               <div className="p-5">
                  <h3 className="font-bold text-slate-800 mb-1 truncate">{lp.name}</h3>
                  <p className="text-xs text-slate-400 mb-4 truncate font-mono">
                    <a href={`${lp.domain}/${lp.slug}`} target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 hover:underline flex items-center gap-1">
                       <ExternalLink size={10} /> {lp.domain}/${lp.slug}
                    </a>
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Visitas</p>
                      <p className="text-sm font-bold text-slate-700">{lp.visits}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Conversões</p>
                      <p className="text-sm font-bold text-teal-600">{lp.conversions}</p>
                    </div>
                  </div>
               </div>
               <div className="p-4 bg-slate-50 border-t border-slate-100">
                 <button 
                  onClick={() => handleEdit(lp)}
                  className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-teal-600 hover:text-white hover:border-teal-600 transition-all flex items-center justify-center gap-2"
                 >
                   <Edit2 size={14}/> Editar Página
                 </button>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

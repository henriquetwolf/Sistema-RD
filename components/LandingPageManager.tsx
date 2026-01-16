
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Edit2, Trash2, ExternalLink, ArrowLeft, 
  Save, X, Loader2, Sparkles, MonitorPlay, Copy, CheckCircle, 
  // Add missing Check import
  RefreshCw, Layout, Globe, Smartphone, CreditCard, MessageSquare, 
  HelpCircle, ListChecks, Target, Info, Link2, Upload, ImageIcon, FileText,
  ArrowUp, ArrowDown, Type, MousePointer2, Settings, PlusCircle, Check
} from 'lucide-react';
import { appBackend, slugify } from '../services/appBackend';
import { LandingPage, LandingPageContent, LandingPageSection } from '../types';
import { GoogleGenAI, Type as SchemaType } from "@google/genai";
import clsx from 'clsx';

interface LandingPageManagerProps {
  onBack: () => void;
}

export const LandingPageManager: React.FC<LandingPageManagerProps> = ({ onBack }) => {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'visual_editor'>('list');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [editingPage, setEditingPage] = useState<Partial<LandingPage> | null>(null);
  const [aiPrompt, setAiPrompt] = useState({
      productName: '',
      productDescription: '',
      targetAudience: '',
      mainBenefits: '',
      price: '',
      offerDetails: ''
  });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setIsLoading(true);
    try {
      const data = await appBackend.getLandingPages();
      setPages(data || []);
    } catch (e) {
      console.error(e);
      setPages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWithAi = async () => {
    if (!aiPrompt.productName || !aiPrompt.targetAudience) {
      alert("Informe pelo menos o nome do produto e o público-alvo.");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `Crie uma página de vendas persuasiva para o produto "${aiPrompt.productName}".
      Descrição do produto: ${aiPrompt.productDescription}
      Público-alvo: ${aiPrompt.targetAudience}
      Benefícios principais: ${aiPrompt.mainBenefits}
      Preço/Oferta: ${aiPrompt.price}
      
      Retorne um JSON com: 
      - title: nome da página
      - sections: array de objetos { id, type, content } onde type pode ser 'hero', 'text', 'features', 'pricing', 'faq'.
      Responda EXCLUSIVAMENTE o JSON, sem markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              sections: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    id: { type: SchemaType.STRING },
                    type: { type: SchemaType.STRING },
                    content: { type: SchemaType.OBJECT }
                  }
                }
              }
            }
          }
        }
      });

      const text = response.text || "{}";
      const generated = JSON.parse(text);
      
      const newPage: Partial<LandingPage> = {
        title: generated.title || aiPrompt.productName,
        productName: aiPrompt.productName,
        slug: slugify(generated.title || aiPrompt.productName),
        content: { sections: generated.sections || [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        theme: 'modern'
      };

      setEditingPage(newPage);
      setView('visual_editor');
      setShowModal(false);
    } catch (e: any) {
      console.error(e);
      alert("Erro ao gerar com IA: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!editingPage) return;
    setIsLoading(true);
    try {
      await appBackend.saveLandingPage(editingPage as LandingPage);
      await fetchPages();
      setView('list');
      setEditingPage(null);
    } catch (e: any) {
      alert(`Erro ao salvar: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir esta página?")) return;
    try {
      await appBackend.deleteLandingPage(id);
      setPages(prev => prev.filter(p => p.id !== id));
    } catch (e) { alert("Erro ao excluir."); }
  };

  const addComponent = (type: LandingPageSection['type']) => {
    if (!editingPage) return;
    const newSection: LandingPageSection = {
      id: crypto.randomUUID(),
      type,
      content: getInitialContentForType(type)
    };
    setEditingPage({
      ...editingPage,
      content: {
        ...editingPage.content!,
        sections: [...(editingPage.content?.sections || []), newSection]
      }
    });
  };

  const getInitialContentForType = (type: string) => {
    switch(type) {
      case 'hero': return { headline: 'Título Impactante', subheadline: 'Descrição curta persuasiva.', ctaText: 'Quero Garantir', imageUrl: '' };
      case 'text': return { title: 'Sobre o Produto', text: 'Escreva detalhes aqui...' };
      case 'features': return { mainTitle: 'Por que escolher?', items: [{ title: 'Destaque 1', description: 'Explicação.' }] };
      case 'pricing': return { price: 'R$ 997,00', installments: '12x R$ 97,00', ctaText: 'Comprar Agora' };
      case 'faq': return { items: [{ question: 'Como funciona?', answer: 'Explicação detalhada.' }] };
      case 'image': return { url: '' };
      default: return {};
    }
  };

  const updateSection = (id: string, newContent: any) => {
    if (!editingPage) return;
    setEditingPage({
      ...editingPage,
      content: {
        ...editingPage.content!,
        sections: editingPage.content!.sections.map(s => s.id === id ? { ...s, content: newContent } : s)
      }
    });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (!editingPage) return;
    const newSections = [...(editingPage.content?.sections || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    setEditingPage({
      ...editingPage,
      content: { ...editingPage.content!, sections: newSections }
    });
  };

  const removeSection = (id: string) => {
    if (!editingPage) return;
    setEditingPage({
      ...editingPage,
      content: {
        ...editingPage.content!,
        sections: editingPage.content!.sections.filter(s => s.id !== id)
      }
    });
  };

  if (view === 'visual_editor' && editingPage) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col animate-in fade-in">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft size={20}/></button>
            <div className="h-6 w-px bg-slate-200"></div>
            <h2 className="font-bold text-slate-800">{editingPage.title} <span className="text-xs text-slate-400 font-normal ml-2">Editor Visual</span></h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95">
              {isLoading ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} Salvar Página
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Toolbar Lateral */}
          <aside className="w-64 bg-white border-r border-slate-200 p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Componentes</h3>
            <div className="grid grid-cols-1 gap-2">
              {[
                { type: 'hero', label: 'Hero (Topo)', icon: Layout },
                { type: 'text', label: 'Texto/Sobre', icon: Type },
                { type: 'features', label: 'Benefícios', icon: ListChecks },
                { type: 'pricing', label: 'Oferta/Preço', icon: CreditCard },
                { type: 'faq', label: 'FAQ', icon: HelpCircle },
                { type: 'image', label: 'Imagem', icon: ImageIcon }
              ].map(comp => (
                <button 
                  key={comp.type} 
                  onClick={() => addComponent(comp.type as any)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50 text-xs font-bold text-slate-600 transition-all text-left"
                >
                  <comp.icon size={16} className="text-orange-500" /> {comp.label}
                </button>
              ))}
            </div>
            
            <div className="pt-6 border-t space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configurações Gerais</h3>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Título da Página</label>
                <input className="w-full text-xs p-2 border rounded mt-1" value={editingPage.title} onChange={e => setEditingPage({...editingPage, title: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Endereço (Slug)</label>
                <input className="w-full text-xs p-2 border rounded mt-1 font-mono" value={editingPage.slug} onChange={e => setEditingPage({...editingPage, slug: slugify(e.target.value)})} />
              </div>
            </div>
          </aside>

          {/* Área de Visualização/Edição */}
          <main className="flex-1 bg-slate-200 p-10 overflow-y-auto custom-scrollbar flex flex-col items-center">
            <div className="bg-white w-full max-w-5xl shadow-2xl rounded-3xl overflow-hidden min-h-screen relative">
               {editingPage.content?.sections?.map((section, idx) => (
                 <div key={section.id} className="relative group/section border-2 border-transparent hover:border-orange-400 transition-all">
                    {/* Controles de Seção */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity z-50">
                       <button onClick={() => moveSection(idx, 'up')} className="p-1.5 bg-white border shadow-md rounded-lg text-slate-600 hover:text-orange-600"><ArrowUp size={14}/></button>
                       <button onClick={() => moveSection(idx, 'down')} className="p-1.5 bg-white border shadow-md rounded-lg text-slate-600 hover:text-orange-600"><ArrowDown size={14}/></button>
                       <button onClick={() => removeSection(section.id)} className="p-1.5 bg-white border shadow-md rounded-lg text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                    </div>

                    <div className="pointer-events-none">
                      {/* Renderização Simplificada para o Editor */}
                      {section.type === 'hero' && (
                        <div className="bg-slate-50 p-16 text-center lg:text-left grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                           <div>
                              <h1 className="text-4xl font-black text-slate-800 mb-4">{section.content.headline}</h1>
                              <p className="text-slate-500 mb-8">{section.content.subheadline}</p>
                              <div className="inline-block bg-orange-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase">{section.content.ctaText}</div>
                           </div>
                           <div className="bg-slate-200 rounded-[2rem] aspect-video flex items-center justify-center">
                              {section.content.imageUrl ? <img src={section.content.imageUrl} className="w-full h-full object-cover rounded-[2rem]"/> : <ImageIcon className="text-slate-300" size={48}/>}
                           </div>
                        </div>
                      )}
                      {section.type === 'text' && (
                        <div className="p-16">
                           <h2 className="text-2xl font-black text-slate-800 mb-4">{section.content.title}</h2>
                           <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{section.content.text}</p>
                        </div>
                      )}
                      {section.type === 'features' && (
                        <div className="p-16 bg-white border-y">
                           <h2 className="text-center text-2xl font-black mb-10">{section.content.mainTitle}</h2>
                           <div className="grid grid-cols-3 gap-6">
                              {section.content.items?.map((f: any, i: number) => (
                                <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                   <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg mb-4 flex items-center justify-center"><Check size={16}/></div>
                                   <p className="font-bold text-slate-800 text-sm">{f.title}</p>
                                   <p className="text-xs text-slate-500 mt-2">{f.description}</p>
                                </div>
                              ))}
                           </div>
                        </div>
                      )}
                      {section.type === 'pricing' && (
                         <div className="p-16 bg-slate-900 text-white text-center">
                            <h2 className="text-xl font-bold opacity-60 uppercase mb-4 tracking-widest">Oferta Especial</h2>
                            <div className="text-6xl font-black mb-2">{section.content.price}</div>
                            <p className="text-orange-400 font-bold mb-10">Ou até {section.content.installments}</p>
                            <div className="inline-block bg-orange-600 text-white px-12 py-5 rounded-2xl font-black text-base uppercase shadow-2xl">{section.content.ctaText}</div>
                         </div>
                      )}
                    </div>

                    {/* Overlay de Edição Direta */}
                    <div className="absolute inset-0 z-20 cursor-pointer" onClick={() => {
                        const newContent = prompt("Edição Rápida (JSON) - Melhore no formulário futuro:", JSON.stringify(section.content));
                        if (newContent) {
                          try { updateSection(section.id, JSON.parse(newContent)); } catch(e) { alert("JSON Inválido"); }
                        }
                    }}></div>
                 </div>
               ))}

               {editingPage.content?.sections?.length === 0 && (
                 <div className="h-screen flex flex-col items-center justify-center text-slate-300">
                    <MonitorPlay size={100} className="opacity-10 mb-6" />
                    <p className="font-bold">A página está vazia.</p>
                    <p className="text-sm">Selecione componentes na lateral para começar.</p>
                 </div>
               )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <MonitorPlay className="text-orange-600" /> Páginas de Venda
            </h2>
            <p className="text-slate-500 text-sm">Crie landing pages persuasivas com inteligência artificial.</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setAiPrompt({ productName: '', productDescription: '', targetAudience: '', mainBenefits: '', price: '' });
            setEditingPage(null);
            setShowModal(true);
          }}
          className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95"
        >
          <Sparkles size={18} /> Gerar com IA
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar páginas..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
          />
        </div>
        <button onClick={fetchPages} className="p-2 text-slate-400 hover:text-orange-600 transition-all"><RefreshCw size={20} className={isLoading ? "animate-spin" : ""} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && pages.length === 0 ? (
          <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-orange-600" size={40} /></div>
        ) : pages.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
            <Layout size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold">Nenhuma página de venda criada.</p>
          </div>
        ) : (
          pages.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase())).map(page => (
            <div key={page.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
              <div className="h-32 bg-gradient-to-br from-orange-50 to-indigo-600 p-6 flex items-end relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Globe size={80}/></div>
                <h3 className="text-white font-black text-lg line-clamp-1">{page.title}</h3>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <p className="text-xs text-slate-500 font-medium mb-1">Produto: <span className="font-bold text-slate-700">{page.productName}</span></p>
                <div className="flex items-center gap-1 mb-4">
                    <Globe size={10} className="text-teal-500" />
                    <span className="text-[10px] font-mono text-slate-400">/{page.slug}</span>
                </div>
                
                <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => {
                      setEditingPage(page);
                      setView('visual_editor');
                    }}
                    className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-slate-200 transition-all"
                  >
                    <Edit2 size={14}/> Visualizar / Editar
                  </button>
                  <button 
                    onClick={() => {
                      const url = `${window.location.origin}/?landingPageId=${page.id}`;
                      navigator.clipboard.writeText(url);
                      setCopiedId(page.id);
                      setTimeout(() => setCopiedId(null), 2000);
                    }}
                    className={clsx(
                      "flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all border",
                      copiedId === page.id ? "bg-green-50 border-green-200 text-green-600" : "bg-orange-50 border-orange-100 text-orange-600 hover:bg-orange-100"
                    )}
                  >
                    {copiedId === page.id ? <CheckCircle size={14}/> : <ExternalLink size={14}/>} {copiedId === page.id ? 'Copiado!' : 'Link Público'}
                  </button>
                  <button onClick={() => handleDelete(page.id)} className="p-2 text-slate-300 hover:text-red-600 rounded-lg"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl my-8 animate-in zoom-in-95 flex flex-col">
            <div className="px-10 py-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Criar com Inteligência Artificial</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={32}/></button>
            </div>
            <div className="p-10 space-y-8">
               <div className="grid grid-cols-1 gap-6">
                  <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Nome do Produto</label>
                      <input className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-orange-500 rounded-[1.5rem] text-base font-bold outline-none" value={aiPrompt.productName} onChange={e => setAiPrompt({...aiPrompt, productName: e.target.value})} placeholder="Ex: Formação Pilates Completa" />
                  </div>
                  <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Descrição do Produto</label>
                      <textarea className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-orange-500 rounded-[1.5rem] text-sm h-24 resize-none outline-none" value={aiPrompt.productDescription} onChange={e => setAiPrompt({...aiPrompt, productDescription: e.target.value})} placeholder="Fale sobre os benefícios e o que o aluno aprende..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase mb-2.5 ml-1">Público-Alvo</label>
                          <input className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-[1.5rem] text-sm font-bold" value={aiPrompt.targetAudience} onChange={e => setAiPrompt({...aiPrompt, targetAudience: e.target.value})} placeholder="Ex: Fisioterapeutas" />
                      </div>
                      <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase mb-2.5 ml-1">Preço / Oferta</label>
                          <input className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-[1.5rem] text-sm font-bold" value={aiPrompt.price} onChange={e => setAiPrompt({...aiPrompt, price: e.target.value})} placeholder="Ex: R$ 1.997,00" />
                      </div>
                  </div>
               </div>
               <button 
                  onClick={handleCreateWithAi}
                  disabled={isGenerating || !aiPrompt.productName}
                  className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
               >
                  {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
                  {isGenerating ? 'Criando Estrutura Persuasiva...' : 'Gerar Página Completa'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

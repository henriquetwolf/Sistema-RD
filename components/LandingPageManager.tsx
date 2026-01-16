
import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, ExternalLink, ArrowLeft, 
  Save, X, Loader2, Sparkles, MonitorPlay, Copy, CheckCircle, 
  RefreshCw, Layout, Globe, Smartphone, CreditCard, MessageSquare, 
  HelpCircle, ListChecks, Target, Info
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { LandingPage, LandingPageContent } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
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

  // Form State
  const [editingPage, setEditingPage] = useState<Partial<LandingPage> | null>(null);
  const [aiPrompt, setAiPrompt] = useState({
      productName: '',
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
      
      const prompt = `Crie uma página de vendas poderosa e persuasiva para o produto "${aiPrompt.productName}".
      Público-alvo: ${aiPrompt.targetAudience}
      Benefícios principais: ${aiPrompt.mainBenefits}
      Preço/Oferta: ${aiPrompt.price}
      Detalhes adicionais: ${aiPrompt.offerDetails}
      
      Use gatilhos mentais de escassez, autoridade e prova social.
      Traduza tudo para um tom profissional e inspirador.
      Responda EXCLUSIVAMENTE o JSON, sem markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Título chamativo da página" },
              hero: {
                type: Type.OBJECT,
                properties: {
                  headline: { type: Type.STRING },
                  subheadline: { type: Type.STRING },
                  ctaText: { type: Type.STRING }
                },
                required: ["headline", "subheadline", "ctaText"]
              },
              features: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["title", "description"]
                }
              },
              pricing: {
                type: Type.OBJECT,
                properties: {
                  price: { type: Type.STRING },
                  installments: { type: Type.STRING },
                  ctaText: { type: Type.STRING }
                },
                required: ["price", "installments", "ctaText"]
              },
              faq: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    answer: { type: Type.STRING }
                  },
                  required: ["question", "answer"]
                }
              }
            },
            required: ["title", "hero", "features", "pricing", "faq"]
          }
        }
      });

      const text = response.text || "{}";
      const generatedContent = JSON.parse(text);
      
      const newPage: Partial<LandingPage> = {
        id: undefined, // Garantir id como undefined para nova inserção
        title: generatedContent.title || aiPrompt.productName,
        productName: aiPrompt.productName,
        content: generatedContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        theme: 'modern'
      };

      setEditingPage(newPage);
    } catch (e: any) {
      console.error(e);
      alert("Erro ao gerar página com IA: " + e.message);
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
      setShowModal(false);
      setEditingPage(null);
    } catch (e) {
      console.error("Save failure:", e);
      alert("Erro ao salvar no banco. Verifique se rodou o script SQL no Supabase.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir esta página permanentemente?")) return;
    try {
      await appBackend.deleteLandingPage(id);
      setPages(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      alert("Erro ao excluir.");
    }
  };

  const copyPublicLink = (id: string) => {
    const url = `${window.location.origin}/?landingPageId=${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPages = pages.filter(p => 
    (p.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            setAiPrompt({ productName: '', targetAudience: '', mainBenefits: '', price: '', offerDetails: '' });
            setEditingPage(null);
            setShowModal(true);
          }}
          className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95"
        >
          <Plus size={18} /> Criar com IA
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
        <button onClick={fetchPages} className="p-2 text-slate-400 hover:text-orange-600"><RefreshCw size={20} className={isLoading ? "animate-spin" : ""} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && pages.length === 0 ? (
          <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-orange-600" size={40} /></div>
        ) : pages.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
            <Layout size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold">Nenhuma página de venda criada.</p>
            <p className="text-sm">Use o botão acima para gerar sua primeira página com IA.</p>
          </div>
        ) : (
          filteredPages.map(page => (
            <div key={page.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
              <div className="h-32 bg-gradient-to-br from-orange-500 to-indigo-600 p-6 flex items-end relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Globe size={80}/></div>
                <h3 className="text-white font-black text-lg line-clamp-1">{page.title || 'Sem Título'}</h3>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <p className="text-xs text-slate-500 font-medium mb-1">Produto: <span className="font-bold text-slate-700">{page.productName || '--'}</span></p>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-6">Criada em: {page.createdAt ? new Date(page.createdAt).toLocaleDateString() : '--'}</p>
                
                <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => {
                      setEditingPage(page);
                      setShowModal(true);
                    }}
                    className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-slate-200 transition-all"
                  >
                    <Edit2 size={14}/> Editar
                  </button>
                  <button 
                    onClick={() => copyPublicLink(page.id)}
                    className={clsx(
                      "flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all border",
                      copiedId === page.id ? "bg-green-50 border-green-200 text-green-600" : "bg-orange-50 border-orange-100 text-orange-600 hover:bg-orange-100"
                    )}
                  >
                    {copiedId === page.id ? <CheckCircle size={14}/> : <ExternalLink size={14}/>} {copiedId === page.id ? 'Copiado!' : 'Link Público'}
                  </button>
                  <button 
                    onClick={() => handleDelete(page.id)}
                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: CREATE/EDIT LANDING PAGE */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl my-8 animate-in zoom-in-95 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-600 text-white rounded-2xl shadow-xl shadow-orange-600/20">
                  <span className="text-white font-black text-2xl">V</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Gerador de Páginas de Venda</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transforme ofertas em lucros com Copywriting IA</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={32}/></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-white">
              {!editingPage ? (
                <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex gap-4 text-orange-800">
                    <Info size={24} className="shrink-0" />
                    <p className="text-sm font-medium leading-relaxed">
                      Preencha os campos abaixo com os dados da sua oferta. Nossa IA criará uma estrutura completa incluindo Headline matadora, quebra de objeções, FAQ e botões de chamada para ação.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Nome do Produto/Curso</label>
                      <input 
                        className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-orange-500 rounded-[1.5rem] text-base font-bold outline-none transition-all" 
                        value={aiPrompt.productName} 
                        onChange={e => setAiPrompt({...aiPrompt, productName: e.target.value})} 
                        placeholder="Ex: Formação Completa em Pilates 2024" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Público-Alvo</label>
                      <input 
                        className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-orange-500 rounded-[1.5rem] text-sm font-bold outline-none transition-all" 
                        value={aiPrompt.targetAudience} 
                        onChange={e => setAiPrompt({...aiPrompt, targetAudience: e.target.value})} 
                        placeholder="Ex: Fisioterapeutas e Educadores Físicos" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase mb-2.5 ml-1">Preço / Oferta</label>
                      <input 
                        className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-orange-500 rounded-[1.5rem] text-sm font-bold outline-none transition-all" 
                        value={aiPrompt.price} 
                        onChange={e => setAiPrompt({...aiPrompt, price: e.target.value})} 
                        placeholder="Ex: R$ 1.997,00 em até 12x" 
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase mb-2.5 ml-1">Benefícios Principais (Gatilhos)</label>
                      <textarea 
                        className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-orange-500 rounded-[1.5rem] text-sm h-32 resize-none outline-none transition-all" 
                        value={aiPrompt.mainBenefits} 
                        onChange={e => setAiPrompt({...aiPrompt, mainBenefits: e.target.value})} 
                        placeholder="Ex: Certificado Internacional, Mentoria ao vivo, Acesso vitalício..." 
                      />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      onClick={handleCreateWithAi}
                      disabled={isGenerating || !aiPrompt.productName}
                      className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-orange-600/30 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
                      {isGenerating ? 'A Inteligência Artificial está escrevendo...' : 'Gerar Página de Vendas'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between border-b pb-6">
                    <h4 className="text-xl font-black text-slate-800">Editor de Conteúdo</h4>
                    <button onClick={() => setEditingPage(null)} className="text-xs font-bold text-orange-600 hover:underline">Reiniciar Geração</button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Título da Página</label>
                          <input className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold" value={editingPage.title || ''} onChange={e => setEditingPage({...editingPage, title: e.target.value})} />
                        </div>
                        
                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                          <h5 className="font-black text-xs uppercase tracking-widest text-indigo-600 flex items-center gap-2"><Layout size={16}/> Hero Section (Destaque)</h5>
                          <input className="w-full px-4 py-2 border rounded-lg text-sm font-bold" value={editingPage.content?.hero?.headline || ''} onChange={e => setEditingPage({...editingPage, content: {...(editingPage.content as any), hero: {...(editingPage.content?.hero as any), headline: e.target.value}}})} placeholder="Headline" />
                          <textarea className="w-full px-4 py-2 border rounded-lg text-xs h-20 resize-none" value={editingPage.content?.hero?.subheadline || ''} onChange={e => setEditingPage({...editingPage, content: {...(editingPage.content as any), hero: {...(editingPage.content?.hero as any), subheadline: e.target.value}}})} placeholder="Subheadline" />
                          <input className="w-full px-4 py-2 border rounded-lg text-xs font-black uppercase" value={editingPage.content?.hero?.ctaText || ''} onChange={e => setEditingPage({...editingPage, content: {...(editingPage.content as any), hero: {...(editingPage.content?.hero as any), ctaText: e.target.value}}})} placeholder="Texto do Botão" />
                        </div>

                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                          <h5 className="font-black text-xs uppercase tracking-widest text-indigo-600 flex items-center gap-2"><CreditCard size={16}/> Preço e Oferta</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <input className="w-full px-4 py-2 border rounded-lg text-sm font-bold" value={editingPage.content?.pricing?.price || ''} onChange={e => setEditingPage({...editingPage, content: {...(editingPage.content as any), pricing: {...(editingPage.content?.pricing as any), price: e.target.value}}})} placeholder="Preço" />
                            <input className="w-full px-4 py-2 border rounded-lg text-sm" value={editingPage.content?.pricing?.installments || ''} onChange={e => setEditingPage({...editingPage, content: {...(editingPage.content as any), pricing: {...(editingPage.content?.pricing as any), installments: e.target.value}}})} placeholder="Parcelamento" />
                          </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                           <div className="flex justify-between items-center">
                              <h5 className="font-black text-xs uppercase tracking-widest text-indigo-600 flex items-center gap-2"><ListChecks size={16}/> Benefícios</h5>
                              <button onClick={() => setEditingPage({...editingPage, content: {...(editingPage.content as any), features: [...(editingPage.content?.features || []), { title: 'Novo Benefício', description: 'Descrição aqui' }]}})} className="text-[10px] font-black uppercase text-indigo-600">+ Add</button>
                           </div>
                           {(editingPage.content?.features || []).map((f, i) => (
                             <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 relative">
                                <button onClick={() => setEditingPage({...editingPage, content: {...(editingPage.content as any), features: (editingPage.content?.features || []).filter((_, idx) => idx !== i)}})} className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full border shadow-sm p-1"><X size={12}/></button>
                                <input className="w-full mb-1 text-xs font-bold outline-none border-none p-0" value={f.title || ''} onChange={e => {
                                  const newFeat = [...(editingPage.content?.features || [])];
                                  newFeat[i].title = e.target.value;
                                  setEditingPage({...editingPage, content: {...(editingPage.content as any), features: newFeat}});
                                }} />
                                <textarea className="w-full text-[10px] text-slate-500 outline-none border-none p-0 resize-none h-12" value={f.description || ''} onChange={e => {
                                  const newFeat = [...(editingPage.content?.features || [])];
                                  newFeat[i].description = e.target.value;
                                  setEditingPage({...editingPage, content: {...(editingPage.content as any), features: newFeat}});
                                }} />
                             </div>
                           ))}
                        </div>

                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                           <div className="flex justify-between items-center">
                              <h5 className="font-black text-xs uppercase tracking-widest text-indigo-600 flex items-center gap-2"><HelpCircle size={16}/> FAQ</h5>
                              <button onClick={() => setEditingPage({...editingPage, content: {...(editingPage.content as any), faq: [...(editingPage.content?.faq || []), { question: 'Pergunta?', answer: 'Resposta aqui' }]}})} className="text-[10px] font-black uppercase text-indigo-600">+ Add</button>
                           </div>
                           {(editingPage.content?.faq || []).map((item, i) => (
                             <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 relative">
                                <button onClick={() => setEditingPage({...editingPage, content: {...(editingPage.content as any), faq: (editingPage.content?.faq || []).filter((_, idx) => idx !== i)}})} className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full border shadow-sm p-1"><X size={12}/></button>
                                <input className="w-full mb-1 text-xs font-bold outline-none border-none p-0" value={item.question || ''} onChange={e => {
                                  const newFaq = [...(editingPage.content?.faq || [])];
                                  newFaq[i].question = e.target.value;
                                  setEditingPage({...editingPage, content: {...(editingPage.content as any), faq: newFaq}});
                                }} />
                                <textarea className="w-full text-[10px] text-slate-500 outline-none border-none p-0 resize-none h-12" value={item.answer || ''} onChange={e => {
                                  const newFaq = [...(editingPage.content?.faq || [])];
                                  newFaq[i].answer = e.target.value;
                                  setEditingPage({...editingPage, content: {...(editingPage.content as any), faq: newFaq}});
                                }} />
                             </div>
                           ))}
                        </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-6 border-t">
                    <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-500 font-bold text-sm">Cancelar</button>
                    <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all">
                      <Save size={18}/> Salvar Página Final
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

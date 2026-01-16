import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Edit2, Trash2, ExternalLink, ArrowLeft, 
  Save, X, Loader2, Sparkles, MonitorPlay, Copy, CheckCircle, 
  RefreshCw, Layout, Globe, Smartphone, CreditCard, MessageSquare, 
  HelpCircle, ListChecks, Target, Info, Link2, Upload, ImageIcon, FileText,
  ArrowUp, ArrowDown, Type, MousePointer2, Settings, PlusCircle, Check,
  Award, ShieldCheck, CheckCircle2, ChevronRight, Wand2, AlignLeft, AlignCenter, AlignRight,
  Type as TypeIcon
} from 'lucide-react';
import { appBackend, slugify } from '../services/appBackend';
import { LandingPage, LandingPageContent, LandingPageSection, FormModel } from '../types';
import { GoogleGenAI, Type as SchemaType } from "@google/genai";
import clsx from 'clsx';

interface LandingPageManagerProps {
  onBack: () => void;
}

export const LandingPageManager: React.FC<LandingPageManagerProps> = ({ onBack }) => {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [availableForms, setAvailableForms] = useState<FormModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefiningField, setIsRefiningField] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'visual_editor'>('list');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [editingPage, setEditingPage] = useState<Partial<LandingPage> | null>(null);
  const [currentDraft, setCurrentDraft] = useState<Partial<LandingPage> | null>(null);
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
    fetchForms();
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

  const fetchForms = async () => {
    try {
      const data = await appBackend.getForms();
      setAvailableForms(data || []);
    } catch (e) {
      console.error(e);
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
      
      Retorne um JSON estruturado seguindo o esquema solicitado. 
      Responda EXCLUSIVAMENTE o JSON, sem markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING, description: "Título interno da página" },
              sections: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    id: { type: SchemaType.STRING },
                    type: { type: SchemaType.STRING, enum: ['hero', 'text', 'features', 'pricing', 'faq'] },
                    content: { 
                        type: SchemaType.OBJECT,
                        properties: {
                            headline: { type: SchemaType.STRING },
                            subheadline: { type: SchemaType.STRING },
                            ctaText: { type: SchemaType.STRING },
                            title: { type: SchemaType.STRING },
                            text: { type: SchemaType.STRING },
                            mainTitle: { type: SchemaType.STRING },
                            price: { type: SchemaType.STRING },
                            installments: { type: SchemaType.STRING },
                            items: {
                                type: SchemaType.ARRAY,
                                items: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        title: { type: SchemaType.STRING },
                                        description: { type: SchemaType.STRING },
                                        question: { type: SchemaType.STRING },
                                        answer: { type: SchemaType.STRING }
                                    }
                                }
                            }
                        }
                    }
                  },
                  required: ["id", "type", "content"]
                }
              }
            },
            required: ["title", "sections"]
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

      setCurrentDraft(newPage);
    } catch (e: any) {
      console.error(e);
      alert("Erro ao gerar com IA: " + (e.message || JSON.stringify(e)));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineFieldWithAi = async (sectionId: string, fieldKey: string, currentVal: string) => {
    if (!aiPrompt.productName) return;
    
    const fieldIdentifier = `${sectionId}-${fieldKey}`;
    setIsRefiningField(fieldIdentifier);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `Melhore e torne extremamente persuasivo o seguinte campo para uma página de vendas do produto "${aiPrompt.productName}":
      Contexto do Produto: ${aiPrompt.productDescription}
      Público-alvo: ${aiPrompt.targetAudience}
      
      Campo a ser otimizado: "${fieldKey}"
      Texto atual: "${currentVal}"
      
      Retorne APENAS o novo texto sugerido, sem aspas, focado em conversão e gatilhos mentais adequados para o campo "${fieldKey}".`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      const refinedText = (response.text || currentVal).trim();

      if (currentDraft && currentDraft.content) {
          const newSections = currentDraft.content.sections.map(s => {
              if (s.id === sectionId) {
                  const content = { ...s.content };
                  // Suporte para campos aninhados como "items.0.title"
                  if (fieldKey.includes('.')) {
                      const parts = fieldKey.split('.');
                      if (parts.length === 3) {
                          const [listKey, index, subKey] = parts;
                          const idx = parseInt(index);
                          const newList = [...(content[listKey] || [])];
                          if (newList[idx]) {
                              newList[idx] = { ...newList[idx], [subKey]: refinedText };
                              content[listKey] = newList;
                          }
                      }
                  } else {
                      content[fieldKey] = refinedText;
                  }
                  return { ...s, content };
              }
              return s;
          });
          setCurrentDraft({ ...currentDraft, content: { sections: newSections } });
      }
    } catch (e: any) {
      console.error(e);
      alert("Erro ao refinar com IA: " + e.message);
    } finally {
      setIsRefiningField(null);
    }
  };

  const confirmDraft = () => {
    if (currentDraft) {
      setEditingPage(currentDraft);
      setView('visual_editor');
      setShowModal(false);
      setCurrentDraft(null);
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
      setSelectedSectionId(null);
    } catch (e: any) {
      alert(`Erro ao salvar: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja realmente excluir esta página permanentemente?")) {
      try {
        await appBackend.deleteLandingPage(id);
        setPages(prev => prev.filter(p => p.id !== id));
      } catch (e: any) {
        alert("Erro ao excluir: " + e.message);
      }
    }
  };

  const handleImageUploadForSection = (sectionId: string) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (file) {
              const reader = new FileReader();
              reader.onloadend = () => {
                  const base64 = reader.result as string;
                  updateSection(sectionId, { 
                      ...(editingPage?.content?.sections.find(s => s.id === sectionId)?.content || {}),
                      imageUrl: base64,
                      url: base64
                  });
              };
              reader.readAsDataURL(file);
          }
      };
      input.click();
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
    setSelectedSectionId(newSection.id);
  };

  const getInitialContentForType = (type: string) => {
    switch(type) {
      case 'hero': return { headline: 'Título Impactante', subheadline: 'Descrição curta persuasiva.', ctaText: 'Quero Garantir', ctaUrl: '', imageUrl: '', textAlign: 'left', fontSize: 'base', fontFamily: 'sans' };
      case 'text': return { title: 'Sobre o Produto', text: 'Escreva detalhes aqui...', textAlign: 'left', fontSize: 'base', fontFamily: 'sans' };
      case 'features': return { mainTitle: 'Por que escolher?', items: [{ title: 'Destaque 1', description: 'Explicação.' }], textAlign: 'center', fontSize: 'base', fontFamily: 'sans' };
      case 'pricing': return { price: 'R$ 997,00', installments: '12x R$ 97,00', ctaText: 'Comprar Agora', ctaUrl: '', formId: '', textAlign: 'center', fontSize: 'base', fontFamily: 'sans' };
      case 'faq': return { items: [{ question: 'Como funciona?', answer: 'Explicação detalhada.' }], textAlign: 'center', fontSize: 'base', fontFamily: 'sans' };
      case 'image': return { url: '', textAlign: 'center' };
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
    if (selectedSectionId === id) setSelectedSectionId(null);
  };

  const activeSection = editingPage?.content?.sections.find(s => s.id === selectedSectionId);

  if (view === 'visual_editor' && editingPage) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col animate-in fade-in">
        <header className="h-16 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
            <div className="h-6 w-px bg-slate-200"></div>
            <h2 className="font-bold text-slate-800">{editingPage.title} <span className="text-xs text-slate-400 font-normal ml-2 tracking-widest uppercase">Editor de Alta Fidelidade</span></h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-2 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95">
              {isLoading ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} Salvar Página
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Toolbar Lateral Dinâmica */}
          <aside className="w-80 bg-white border-r border-slate-200 p-6 space-y-8 overflow-y-auto custom-scrollbar shadow-lg z-20">
            {selectedSectionId && activeSection ? (
              <div className="animate-in slide-in-from-left-2 duration-300">
                <div className="flex items-center justify-between border-b pb-4 mb-6">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Edit2 size={14} className="text-orange-600" /> Editando: {activeSection.type}
                  </h3>
                  <button onClick={() => setSelectedSectionId(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><X size={16}/></button>
                </div>

                <div className="space-y-6">
                  {/* Estilos Gerais do Bloco */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Estilos do Bloco</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Fonte</label>
                        <select 
                          className="w-full text-xs p-2.5 border rounded-xl mt-1 bg-white outline-none focus:ring-2 focus:ring-orange-500"
                          value={activeSection.content.fontFamily || 'sans'}
                          onChange={e => updateSection(activeSection.id, {...activeSection.content, fontFamily: e.target.value})}
                        >
                          <option value="sans">Sans Serif (Inter)</option>
                          <option value="serif">Serif (Times)</option>
                          <option value="mono">Monospace</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Tamanho Texto</label>
                        <select 
                          className="w-full text-xs p-2.5 border rounded-xl mt-1 bg-white outline-none focus:ring-2 focus:ring-orange-500"
                          value={activeSection.content.fontSize || 'base'}
                          onChange={e => updateSection(activeSection.id, {...activeSection.content, fontSize: e.target.value})}
                        >
                          <option value="xs">Extra Pequeno</option>
                          <option value="sm">Pequeno</option>
                          <option value="base">Normal</option>
                          <option value="lg">Grande</option>
                          <option value="xl">Extra Grande</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Alinhamento</label>
                        <div className="flex bg-slate-50 p-1 rounded-xl mt-1 border">
                           <button onClick={() => updateSection(activeSection.id, {...activeSection.content, textAlign: 'left'})} className={clsx("flex-1 py-2 flex justify-center rounded-lg transition-all", activeSection.content.textAlign === 'left' ? "bg-white shadow-sm text-orange-600" : "text-slate-400")}><AlignLeft size={16}/></button>
                           <button onClick={() => updateSection(activeSection.id, {...activeSection.content, textAlign: 'center'})} className={clsx("flex-1 py-2 flex justify-center rounded-lg transition-all", activeSection.content.textAlign === 'center' ? "bg-white shadow-sm text-orange-600" : "text-slate-400")}><AlignCenter size={16}/></button>
                           <button onClick={() => updateSection(activeSection.id, {...activeSection.content, textAlign: 'right'})} className={clsx("flex-1 py-2 flex justify-center rounded-lg transition-all", activeSection.content.textAlign === 'right' ? "bg-white shadow-sm text-orange-600" : "text-slate-400")}><AlignRight size={16}/></button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Campos Específicos por Tipo */}
                  <div className="space-y-4 pt-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Conteúdo do Bloco</h4>
                    
                    {/* Campos Comuns de Texto */}
                    {(activeSection.type === 'hero' || activeSection.type === 'text') && (
                      <div className="space-y-4">
                        <div>
                           <label className="text-[10px] font-bold text-slate-500 uppercase">Título / Headline</label>
                           <textarea className="w-full text-xs p-2.5 border rounded-xl mt-1 h-20 outline-none focus:ring-2 focus:ring-orange-500" value={activeSection.content.headline || activeSection.content.title} onChange={e => updateSection(activeSection.id, {...activeSection.content, [activeSection.type === 'hero' ? 'headline' : 'title']: e.target.value})} />
                        </div>
                        {activeSection.type === 'text' && (
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Texto Longo</label>
                            <textarea className="w-full text-xs p-2.5 border rounded-xl mt-1 h-40 outline-none focus:ring-2 focus:ring-orange-500" value={activeSection.content.text} onChange={e => updateSection(activeSection.id, {...activeSection.content, text: e.target.value})} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botão de Venda e Redirect */}
                    {(activeSection.type === 'hero' || activeSection.type === 'pricing') && (
                      <div className="space-y-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                        <p className="text-[10px] font-black text-orange-700 uppercase flex items-center gap-2"><Target size={12}/> Chamada para Ação (CTA)</p>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Texto do Botão</label>
                          <input type="text" className="w-full text-xs p-2.5 border rounded-xl mt-1 bg-white outline-none focus:ring-2 focus:ring-orange-500" value={activeSection.content.ctaText} onChange={e => updateSection(activeSection.id, {...activeSection.content, ctaText: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Link de Redirecionamento</label>
                          <input type="text" className="w-full text-xs p-2.5 border rounded-xl mt-1 bg-white outline-none focus:ring-2 focus:ring-orange-500" value={activeSection.content.ctaUrl || ''} onChange={e => updateSection(activeSection.id, {...activeSection.content, ctaUrl: e.target.value})} placeholder="https://..." />
                        </div>
                      </div>
                    )}

                    {/* Vínculo com Formulário */}
                    {(activeSection.type === 'pricing') && (
                      <div className="space-y-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <p className="text-[10px] font-black text-indigo-700 uppercase flex items-center gap-2"><FileText size={12}/> Vínculo com Formulário</p>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Selecionar Formulário</label>
                          <select 
                            className="w-full text-xs p-2.5 border rounded-xl mt-1 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                            value={activeSection.content.formId || ''}
                            onChange={e => updateSection(activeSection.id, {...activeSection.content, formId: e.target.value})}
                          >
                            <option value="">Nenhum formulário</option>
                            {availableForms.map(f => (
                              <option key={f.id} value={f.id}>{f.title}</option>
                            ))}
                          </select>
                          <p className="text-[9px] text-indigo-400 mt-2">O formulário será exibido após o botão ou como parte da oferta.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Novo Componente</h3>
                    <div className="grid grid-cols-1 gap-2">
                    {[
                        { type: 'hero', label: 'Hero (Topo)', icon: Layout },
                        { type: 'text', label: 'Texto/Sobre', icon: TypeIcon },
                        { type: 'features', label: 'Benefícios', icon: ListChecks },
                        { type: 'pricing', label: 'Oferta/Preço', icon: CreditCard },
                        { type: 'faq', label: 'FAQ', icon: HelpCircle },
                        { type: 'image', label: 'Imagem', icon: ImageIcon }
                    ].map(comp => (
                        <button 
                        key={comp.type} 
                        onClick={() => addComponent(comp.type as any)}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50 text-xs font-bold text-slate-600 transition-all text-left group"
                        >
                        <comp.icon size={16} className="text-orange-500 group-hover:scale-110 transition-transform" /> {comp.label}
                        </button>
                    ))}
                    </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Propriedades da Página</h3>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Título da Página</label>
                    <input className="w-full text-xs p-2.5 border rounded-xl mt-1 focus:ring-2 focus:ring-orange-500 outline-none" value={editingPage.title} onChange={e => setEditingPage({...editingPage, title: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Slug amigável</label>
                    <input className="w-full text-xs p-2.5 border rounded-xl mt-1 font-mono focus:ring-2 focus:ring-orange-500 outline-none" value={editingPage.slug} onChange={e => setEditingPage({...editingPage, slug: slugify(e.target.value)})} />
                  </div>
                </div>
              </div>
            )}
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 mt-auto">
                <p className="text-[10px] text-orange-800 leading-relaxed"><Info size={12} className="inline mr-1"/> <strong>Dica:</strong> Clique em qualquer bloco na visualização para abrir os detalhes de edição na lateral.</p>
            </div>
          </aside>

          {/* Área de Visualização/Edição de ALTA FIDELIDADE */}
          <main className="flex-1 bg-slate-200 p-8 overflow-y-auto custom-scrollbar flex flex-col items-center">
            <div className="bg-white w-full max-w-6xl shadow-2xl rounded-[3rem] overflow-hidden min-h-screen relative font-sans">
               {/* Navbar Dummy para Editor */}
               <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
                  <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-8 object-contain" />
                  <div className="bg-slate-900 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest opacity-50 cursor-not-allowed">Visualização do Site</div>
               </nav>

               {editingPage.content?.sections?.map((section, idx) => {
                 const isSelected = selectedSectionId === section.id;
                 const sectionStyles = {
                   textAlign: section.content.textAlign || 'left',
                   fontFamily: section.content.fontFamily === 'serif' ? 'serif' : section.content.fontFamily === 'mono' ? 'monospace' : 'sans-serif',
                   fontSize: section.content.fontSize === 'xs' ? '0.75rem' : section.content.fontSize === 'sm' ? '0.875rem' : section.content.fontSize === 'lg' ? '1.25rem' : section.content.fontSize === 'xl' ? '1.5rem' : '1rem'
                 } as any;

                 return (
                   <div 
                    key={section.id} 
                    onClick={() => setSelectedSectionId(section.id)}
                    className={clsx(
                      "relative group/section border-4 transition-all cursor-pointer", 
                      isSelected ? "border-orange-400" : "border-transparent hover:border-orange-200"
                    )}
                   >
                    {/* Controles de Seção Modernos */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity z-50">
                       <div className="bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-2xl border border-slate-100 flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-orange-600 transition-all" title="Mover para Cima"><ArrowUp size={16}/></button>
                            <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-orange-600 transition-all" title="Mover para Baixo"><ArrowDown size={16}/></button>
                            <div className="w-px h-4 bg-slate-200 self-center mx-1"></div>
                            <button onClick={(e) => { e.stopPropagation(); removeSection(section.id); }} className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-all" title="Excluir Seção"><Trash2 size={16}/></button>
                       </div>
                       <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">{section.type}</span>
                    </div>

                    <div className="relative" style={sectionStyles}>
                      {/* RENDERIZAÇÃO DE ALTA FIDELIDADE */}
                      {section.type === 'hero' && (
                        <header className="pt-24 pb-16 px-6 bg-gradient-to-br from-slate-50 to-white overflow-hidden relative">
                          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-orange-100/50 rounded-full blur-3xl"></div>
                          <div className={clsx(
                            "max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10",
                            section.content.textAlign === 'center' ? 'text-center' : section.content.textAlign === 'right' ? 'text-right' : 'text-left'
                          )}>
                            <div className="space-y-6">
                              <div className={clsx(
                                "inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                section.content.textAlign === 'center' ? 'mx-auto' : section.content.textAlign === 'right' ? 'ml-auto' : ''
                              )}>
                                  <Award size={14}/> Formação Profissional Premium
                              </div>
                              <h1 className="w-full text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.1]">
                                {section.content.headline}
                              </h1>
                              <p className="w-full text-lg text-slate-500 leading-relaxed font-medium">
                                {section.content.subheadline}
                              </p>
                              <div className={clsx(
                                "flex flex-col sm:flex-row items-center gap-4",
                                section.content.textAlign === 'center' ? 'justify-center' : section.content.textAlign === 'right' ? 'justify-end' : 'justify-start'
                              )}>
                                  <div className="bg-orange-600 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-orange-600/20 hover:bg-orange-700 transition-all cursor-text outline-none">
                                    {section.content.ctaText}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                    <ShieldCheck size={16} className="text-teal-500" /> Garantia incondicional de 7 dias
                                  </div>
                              </div>
                            </div>

                            <div className="relative group/img-hero">
                                <div className="rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-100 aspect-video flex items-center justify-center relative">
                                    {section.content.imageUrl ? (
                                        <img src={section.content.imageUrl} className="w-full h-full object-cover" alt="Hero" />
                                    ) : (
                                        <div className="text-slate-300 flex flex-col items-center gap-2">
                                            <ImageIcon size={64}/>
                                            <span className="text-[10px] font-black uppercase">Imagem do Topo</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                          </div>
                        </header>
                      )}

                      {section.type === 'text' && (
                        <section className="py-20 px-8 bg-slate-50 border-y border-slate-100">
                            <div className="max-w-4xl mx-auto space-y-6">
                              <div className={clsx("flex items-center gap-2", section.content.textAlign === 'center' ? 'justify-center' : section.content.textAlign === 'right' ? 'justify-end' : '')}>
                                <Info className="text-orange-500" size={24}/>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                    {section.content.title}
                                </h2>
                              </div>
                              <p className="w-full text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {section.content.text}
                              </p>
                            </div>
                        </section>
                      )}

                      {section.type === 'features' && (
                        <section className="py-20 px-8 bg-white">
                          <div className="max-w-7xl mx-auto">
                            <div className="text-center mb-16">
                              <h2 className="w-full text-3xl font-black text-slate-900 tracking-tight mb-4">
                                {section.content.mainTitle}
                              </h2>
                              <div className="h-1.5 w-24 bg-orange-500 mx-auto rounded-full"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              {section.content.items?.map((feature: any, i: number) => (
                                <div key={i} className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:border-orange-200 transition-all group/feat text-center relative">
                                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-orange-600 mb-6 group-hover/feat:scale-110 transition-transform mx-auto">
                                    <CheckCircle2 size={24} />
                                  </div>
                                  <h3 className="w-full font-black text-slate-800 mb-3 text-xl">{feature.title}</h3>
                                  <p className="w-full text-slate-500 leading-relaxed font-medium">{feature.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>
                      )}

                      {section.type === 'pricing' && (
                        <section className="py-24 px-8 bg-slate-900 text-white overflow-hidden relative">
                          <div className="absolute top-0 right-0 -mt-32 -mr-32 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl"></div>
                          <div className="max-w-4xl mx-auto text-center relative z-10">
                            <h2 className="text-4xl font-black mb-12 tracking-tight">Comece sua transformação hoje</h2>
                            <div className="bg-white rounded-[3rem] p-10 md:p-16 text-slate-900 shadow-2xl relative">
                              <div className="absolute top-0 right-10 -mt-5 bg-orange-500 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">Oferta por tempo limitado</div>
                              <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Acesso Imediato por apenas:</p>
                              <div className="mb-4">
                                <h3 className="w-full text-5xl md:text-7xl font-black tracking-tighter text-slate-900">
                                    {section.content.price}
                                </h3>
                              </div>
                              <div className="flex justify-center items-center gap-2 mb-10">
                                <span className="text-lg font-bold text-indigo-400">Ou em até</span>
                                <span className="text-lg font-bold text-indigo-600">{section.content.installments}</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-10 border-y border-slate-100 py-8">
                                <div className="flex items-center gap-3 text-sm font-bold text-slate-600"><CheckCircle2 className="text-teal-500" size={18}/> Acesso completo à plataforma</div>
                                <div className="flex items-center gap-3 text-sm font-bold text-slate-600"><CheckCircle2 className="text-teal-500" size={18}/> Suporte direto com instrutores</div>
                              </div>
                              <div className="w-full bg-orange-600 text-white py-6 rounded-2xl font-black text-xl uppercase tracking-widest shadow-2xl shadow-orange-600/30 transition-all text-center">
                                {section.content.ctaText}
                              </div>
                              
                              {section.content.formId && (
                                <div className="mt-8 pt-8 border-t border-slate-100">
                                  <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-indigo-200 flex flex-col items-center gap-2">
                                     <FileText className="text-indigo-600" size={24}/>
                                     <p className="text-xs font-bold text-indigo-900">Formulário Vinculado:</p>
                                     <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-white px-2 py-0.5 rounded border">
                                       {availableForms.find(f => f.id === section.content.formId)?.title || 'ID: ' + section.content.formId}
                                     </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </section>
                      )}

                      {section.type === 'faq' && (
                        <section className="py-20 px-8 bg-slate-50">
                          <div className="max-w-3xl mx-auto">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight text-center mb-16 uppercase tracking-widest">Dúvidas Frequentes</h2>
                            <div className="space-y-4">
                              {section.content.items?.map((item: any, i: number) => (
                                <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 group/faq relative">
                                  <h4 className="w-full font-black text-slate-800 mb-3">{item.question}</h4>
                                  <p className="w-full text-sm text-slate-500 leading-relaxed font-medium">{item.answer}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>
                      )}

                      {section.type === 'image' && (
                         <div className="py-12 flex justify-center bg-white px-8">
                            <div className="max-w-7xl w-full aspect-video bg-slate-100 rounded-[3rem] overflow-hidden flex items-center justify-center relative group/img2 shadow-xl border-4 border-slate-50">
                                {section.content.url ? (
                                    <img src={section.content.url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-slate-300 flex flex-col items-center gap-2">
                                        <ImageIcon size={64}/>
                                        <span className="text-[10px] font-black uppercase">Clique para subir imagem</span>
                                    </div>
                                )}
                            </div>
                         </div>
                      )}
                    </div>
                 </div>
               )})}

               {editingPage.content?.sections?.length === 0 && (
                 <div className="h-screen flex flex-col items-center justify-center text-slate-300">
                    <MonitorPlay size={100} className="opacity-10 mb-6" />
                    <p className="font-bold">Sua página poderosa ainda não tem blocos.</p>
                    <p className="text-sm">Selecione componentes na lateral para começar a construir agora.</p>
                 </div>
               )}

               {/* Footer Dummy */}
               <footer className="bg-white py-16 px-8 border-t border-slate-100 text-center space-y-6">
                    <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-8 mx-auto grayscale opacity-20" />
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.3em]">Visualização do Rodapé</p>
               </footer>
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
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
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
            setAiPrompt({ productName: '', productDescription: '', targetAudience: '', mainBenefits: '', price: '', offerDetails: '' });
            setEditingPage(null);
            setCurrentDraft(null);
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
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
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
              <div className="h-32 bg-gradient-to-br from-orange-500 to-indigo-600 p-6 flex items-end relative overflow-hidden">
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
                  <button onClick={() => handleDelete(page.id)} className="p-2 text-slate-300 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl my-8 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-10 py-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Criar com Inteligência Artificial</h3>
              <button onClick={() => { setShowModal(false); setCurrentDraft(null); }} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={32}/></button>
            </div>
            
            <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
               {!currentDraft ? (
                  <div className="space-y-8">
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
                        {isGenerating ? 'Criando Estrutura Persuasiva...' : 'Gerar Estrutura e Textos'}
                     </button>
                  </div>
               ) : (
                  <div className="space-y-8 animate-in slide-in-from-right-4">
                      <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-center gap-4 mb-4">
                          <div className="p-3 bg-indigo-600 text-white rounded-2xl"><Sparkles size={24}/></div>
                          <div>
                              <h4 className="font-black text-indigo-900 uppercase text-xs tracking-widest">Rascunho Gerado!</h4>
                              <p className="text-sm text-indigo-700 font-medium">Revise e ajuste os textos principais abaixo antes de criar a página visual.</p>
                          </div>
                      </div>

                      <div className="space-y-6">
                          <div>
                              <label className="block text-[11px] font-black text-slate-400 uppercase mb-1.5 ml-1">Título da Página</label>
                              <input className="w-full px-5 py-3 border rounded-2xl font-bold" value={currentDraft.title} onChange={e => setCurrentDraft({...currentDraft, title: e.target.value})} />
                          </div>

                          <div className="space-y-4">
                              {currentDraft.content?.sections.map((section, sIdx) => (
                                  <div key={section.id} className="p-6 bg-slate-50 border rounded-3xl space-y-4">
                                      <div className="flex items-center gap-2 mb-2">
                                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[9px] font-black uppercase rounded">{section.type}</span>
                                      </div>
                                      
                                      {section.type === 'hero' && (
                                          <div className="space-y-4">
                                              <div className="relative group">
                                                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Headline Principal</label>
                                                  <input className="w-full px-4 py-2 border rounded-xl text-sm font-bold pr-10" value={section.content.headline} onChange={e => {
                                                      const newSections = [...currentDraft.content!.sections];
                                                      newSections[sIdx].content.headline = e.target.value;
                                                      setCurrentDraft({...currentDraft, content: { sections: newSections }});
                                                  }} placeholder="Headline" />
                                                  <button 
                                                    onClick={() => handleRefineFieldWithAi(section.id, 'headline', section.content.headline)}
                                                    disabled={isRefiningField === `${section.id}-headline`}
                                                    className="absolute right-2 top-[22px] p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-all"
                                                    title="Melhorar com IA"
                                                  >
                                                      {isRefiningField === `${section.id}-headline` ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12}/>}
                                                  </button>
                                              </div>
                                              <div className="relative group">
                                                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Subheadline de Apoio</label>
                                                  <textarea className="w-full px-4 py-2 border rounded-xl text-xs h-20 resize-none pr-10" value={section.content.subheadline} onChange={e => {
                                                      const newSections = [...currentDraft.content!.sections];
                                                      newSections[sIdx].content.subheadline = e.target.value;
                                                      setCurrentDraft({...currentDraft, content: { sections: newSections }});
                                                  }} placeholder="Subheadline" />
                                                  <button 
                                                    onClick={() => handleRefineFieldWithAi(section.id, 'subheadline', section.content.subheadline)}
                                                    disabled={isRefiningField === `${section.id}-subheadline`}
                                                    className="absolute right-2 top-[22px] p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-all"
                                                    title="Melhorar com IA"
                                                  >
                                                      {isRefiningField === `${section.id}-subheadline` ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12}/>}
                                                  </button>
                                              </div>
                                          </div>
                                      )}

                                      {section.type === 'text' && (
                                          <div className="space-y-4">
                                              <div className="relative group">
                                                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Título do Bloco</label>
                                                  <input className="w-full px-4 py-2 border rounded-xl text-sm font-bold pr-10" value={section.content.title} onChange={e => {
                                                      const newSections = [...currentDraft.content!.sections];
                                                      newSections[sIdx].content.title = e.target.value;
                                                      setCurrentDraft({...currentDraft, content: { sections: newSections }});
                                                  }} placeholder="Título do Bloco" />
                                                  <button 
                                                    onClick={() => handleRefineFieldWithAi(section.id, 'title', section.content.title)}
                                                    disabled={isRefiningField === `${section.id}-title`}
                                                    className="absolute right-2 top-[22px] p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-all"
                                                    title="Melhorar com IA"
                                                  >
                                                      {isRefiningField === `${section.id}-title` ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12}/>}
                                                  </button>
                                              </div>
                                              <div className="relative group">
                                                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Texto de Conteúdo</label>
                                                  <textarea className="w-full px-4 py-2 border rounded-xl text-xs h-32 resize-none pr-10 leading-relaxed" value={section.content.text} onChange={e => {
                                                      const newSections = [...currentDraft.content!.sections];
                                                      newSections[sIdx].content.text = e.target.value;
                                                      setCurrentDraft({...currentDraft, content: { sections: newSections }});
                                                  }} placeholder="Conteúdo" />
                                                  <button 
                                                    onClick={() => handleRefineFieldWithAi(section.id, 'text', section.content.text)}
                                                    disabled={isRefiningField === `${section.id}-text`}
                                                    className="absolute right-2 top-[22px] p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-all"
                                                    title="Melhorar com IA"
                                                  >
                                                      {isRefiningField === `${section.id}-text` ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12}/>}
                                                  </button>
                                              </div>
                                          </div>
                                      )}

                                      {section.type === 'features' && (
                                          <div className="space-y-6">
                                              <div className="relative group">
                                                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Título da Seção de Benefícios</label>
                                                  <input className="w-full px-4 py-2 border rounded-xl text-sm font-bold pr-10" value={section.content.mainTitle} onChange={e => {
                                                      const newSections = [...currentDraft.content!.sections];
                                                      newSections[sIdx].content.mainTitle = e.target.value;
                                                      setCurrentDraft({...currentDraft, content: { sections: newSections }});
                                                  }} placeholder="Ex: Por que escolher este treinamento?" />
                                                  <button 
                                                    onClick={() => handleRefineFieldWithAi(section.id, 'mainTitle', section.content.mainTitle)}
                                                    disabled={isRefiningField === `${section.id}-mainTitle`}
                                                    className="absolute right-2 top-[22px] p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-all"
                                                    title="Melhorar com IA"
                                                  >
                                                      {isRefiningField === `${section.id}-mainTitle` ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12}/>}
                                                  </button>
                                              </div>
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  {section.content.items?.map((item: any, iIdx: number) => (
                                                      <div key={iIdx} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
                                                          <div className="relative group">
                                                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Título {iIdx + 1}</label>
                                                              <input className="w-full px-3 py-1.5 border rounded-lg text-xs font-bold pr-8" value={item.title} onChange={e => {
                                                                  const newSections = [...currentDraft.content!.sections];
                                                                  newSections[sIdx].content.items[iIdx].title = e.target.value;
                                                                  setCurrentDraft({...currentDraft, content: { sections: newSections }});
                                                              }} placeholder="Título" />
                                                              <button 
                                                                onClick={() => handleRefineFieldWithAi(section.id, `items.${iIdx}.title`, item.title)}
                                                                disabled={isRefiningField === `${section.id}-items.${iIdx}.title`}
                                                                className="absolute right-1 top-[18px] p-1 text-indigo-600 hover:text-indigo-800 transition-all"
                                                              >
                                                                  {isRefiningField === `${section.id}-items.${iIdx}.title` ? <Loader2 size={10} className="animate-spin"/> : <Wand2 size={10}/>}
                                                              </button>
                                                          </div>
                                                          <div className="relative group">
                                                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Descrição {iIdx + 1}</label>
                                                              <textarea className="w-full px-3 py-1.5 border rounded-lg text-[10px] h-16 resize-none pr-8 leading-tight" value={item.description} onChange={e => {
                                                                  const newSections = [...currentDraft.content!.sections];
                                                                  newSections[sIdx].content.items[iIdx].description = e.target.value;
                                                                  setCurrentDraft({...currentDraft, content: { sections: newSections }});
                                                              }} placeholder="Descrição" />
                                                              <button 
                                                                onClick={() => handleRefineFieldWithAi(section.id, `items.${iIdx}.description`, item.description)}
                                                                disabled={isRefiningField === `${section.id}-items.${iIdx}.description`}
                                                                className="absolute right-1 top-[18px] p-1 text-indigo-600 hover:text-indigo-800 transition-all"
                                                              >
                                                                  {isRefiningField === `${section.id}-items.${iIdx}.description` ? <Loader2 size={10} className="animate-spin"/> : <Wand2 size={10}/>}
                                                              </button>
                                                          </div>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      )}

                                      {section.type === 'pricing' && (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              <div>
                                                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Preço Principal</label>
                                                  <input className="w-full px-4 py-2 border rounded-xl text-sm font-bold" value={section.content.price} onChange={e => {
                                                      const newSections = [...currentDraft.content!.sections];
                                                      newSections[sIdx].content.price = e.target.value;
                                                      setCurrentDraft({...currentDraft, content: { sections: newSections }});
                                                  }} placeholder="Preço" />
                                              </div>
                                              <div>
                                                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Texto de Parcelas</label>
                                                  <input className="w-full px-4 py-2 border rounded-xl text-sm font-bold" value={section.content.installments} onChange={e => {
                                                      const newSections = [...currentDraft.content!.sections];
                                                      newSections[sIdx].content.installments = e.target.value;
                                                      setCurrentDraft({...currentDraft, content: { sections: newSections }});
                                                  }} placeholder="Parcelas" />
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="flex gap-4 pt-6 border-t">
                          <button onClick={() => setCurrentDraft(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Voltar</button>
                          <button onClick={confirmDraft} className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-600/20 hover:bg-orange-700 transition-all active:scale-95">Criar Página e Abrir Editor</button>
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

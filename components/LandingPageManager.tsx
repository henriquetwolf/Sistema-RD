
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Edit2, Trash2, ExternalLink, ArrowLeft, 
  Save, X, Loader2, Sparkles, MonitorPlay, Copy, CheckCircle, 
  RefreshCw, Layout, Globe, Smartphone, CreditCard, MessageSquare, 
  HelpCircle, ListChecks, Target, Info, Link2, Upload, ImageIcon, FileText,
  ArrowUp, ArrowDown, Type, MousePointer2, Settings, PlusCircle, Check,
  Award, ShieldCheck, CheckCircle2, ChevronRight, Wand2, AlignLeft, AlignCenter, AlignRight,
  Palette, FormInput, Building
} from 'lucide-react';
import { appBackend, slugify } from '../services/appBackend';
import { LandingPage, LandingPageContent, LandingPageSection, ElementStyles, FormModel } from '../types';
import { GoogleGenAI, Type as SchemaType } from "@google/genai";
import clsx from 'clsx';

interface LandingPageManagerProps {
  onBack: () => void;
}

const FONT_FAMILIES = [
    { label: 'Padrão (Sans)', value: 'ui-sans-serif, system-ui, -apple-system' },
    { label: 'Elegante (Serif)', value: 'ui-serif, Georgia, Cambria, "Times New Roman"' },
    { label: 'Moderno (Inter)', value: '"Inter", sans-serif' },
    { label: 'Impacto', value: '"Oswald", sans-serif' }
];

const REFERENCE_TEMPLATES = [
    { id: 'alura', name: 'Alura', url: 'https://www.alura.com.br/', description: 'Cursos e formações tecnológicas', imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=400&auto=format&fit=crop' },
    { id: 'rocketseat', name: 'Rocketseat', url: 'https://www.rocketseat.com.br/', description: 'Comunidade e eventos de dev', imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=400&auto=format&fit=crop' },
    { id: 'ebac', name: 'EBAC Online', url: 'https://ebaconline.com.br/', description: 'Design e Artes digitais', imageUrl: 'https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=400&auto=format&fit=crop' },
    { id: 'descomplica', name: 'Descomplica', url: 'https://www.descomplica.com.br/', description: 'Educação universitária e pós', imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=400&auto=format&fit=crop' },
    { id: 'conquer', name: 'Conquer', url: 'https://escolaconquer.com.br/', description: 'Soft skills e imersões', imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=400&auto=format&fit=crop' },
    { id: 'g4', name: 'G4 Educação', url: 'https://g4educacao.com/', description: 'Liderança e gestão executiva', imageUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=400&auto=format&fit=crop' },
    { id: 'dnc', name: 'DNC', url: 'https://www.escoladnc.com.br/', description: 'Foco em empregabilidade', imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=400&auto=format&fit=crop' },
    { id: 'tera', name: 'Tera', url: 'https://somostera.com/', description: 'Habilidades da economia digital', imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=400&auto=format&fit=crop' },
    { id: 'k21', name: 'K21', url: 'https://k21.global/pt/cursos', description: 'Agilidade e transformação digital', imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=400&auto=format&fit=crop' },
    { id: 'insper', name: 'Insper', url: 'https://www.insper.edu.br/educacao-executiva/', description: 'Executiva de alto nível', imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=400&auto=format&fit=crop' },
    { id: 'fgv', name: 'FGV', url: 'https://educacao-executiva.fgv.br/', description: 'Referência em gestão e economia', imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=400&auto=format&fit=crop' },
    { id: 'rdsummit', name: 'RD Summit', url: 'https://rdsummit.com.br/', description: 'Grandes eventos de marketing', imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?q=80&w=400&auto=format&fit=crop' },
    { id: 'pipefy', name: 'Pipefy', url: 'https://www.pipefy.com/pt-br/', description: 'SaaS e produtividade corporativa', imageUrl: 'https://images.unsplash.com/photo-1551288049-bbbda536339a?q=80&w=400&auto=format&fit=crop' },
    { id: 'nuvemshop', name: 'Nuvemshop', url: 'https://www.nuvemshop.com.br/', description: 'E-commerce e planos SaaS', imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=400&auto=format&fit=crop' },
    { id: 'novomercado', name: 'O Novo Mercado', url: 'https://onovomercado.com/assinatura-pv-10/', description: 'Vendas e marketing digital', imageUrl: 'https://images.unsplash.com/photo-1454165833767-0279c29c896d?q=80&w=400&auto=format&fit=crop' }
];

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

  // Form State
  const [editingPage, setEditingPage] = useState<Partial<LandingPage> | null>(null);
  const [currentDraft, setCurrentDraft] = useState<Partial<LandingPage> | null>(null);
  const [aiPrompt, setAiPrompt] = useState({
      productName: '',
      productDescription: '',
      targetAudience: '',
      mainBenefits: '',
      price: '',
      offerDetails: '',
      referenceTemplate: ''
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
      } catch (e) {}
  };

  const handleCreateWithAi = async () => {
    if (!aiPrompt.productName || !aiPrompt.targetAudience) {
      alert("Informe pelo menos o nome do produto e o público-alvo.");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const templateReference = aiPrompt.referenceTemplate 
        ? `IMPORTANTE: Baseie a estrutura, ordem das seções e o tom de voz no modelo de página de referência: ${aiPrompt.referenceTemplate}.` 
        : '';

      const prompt = `Crie uma página de vendas persuasiva para o produto "${aiPrompt.productName}".
      Descrição do produto: ${aiPrompt.productDescription}
      Público-alvo: ${aiPrompt.targetAudience}
      Benefícios principais: ${aiPrompt.mainBenefits}
      Preço/Oferta: ${aiPrompt.price}
      ${templateReference}
      
      Retorne um JSON estruturado seguindo o esquema solicitado. 
      Responda EXCLUSIVAMENTE o JSON, sem markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
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
                            ctaUrl: { type: SchemaType.STRING },
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
      console.error("Erro na geração:", e);
      alert("Erro ao gerar com IA. Verifique sua conexão ou tente novamente.");
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
  };

  const getInitialContentForType = (type: string) => {
    switch(type) {
      case 'hero': return { headline: 'Título Impactante', subheadline: 'Descrição curta persuasiva.', ctaText: 'Quero Garantir', ctaUrl: '', imageUrl: '' };
      case 'text': return { title: 'Sobre o Produto', text: 'Escreva detalhes aqui...' };
      case 'features': return { mainTitle: 'Por que escolher?', items: [{ title: 'Destaque 1', description: 'Explicação.' }] };
      case 'pricing': return { price: 'R$ 997,00', installments: '12x R$ 97,00', ctaText: 'Comprar Agora', ctaUrl: '' };
      case 'faq': return { items: [{ question: 'Como funciona?', answer: 'Explicação detalhada.' }] };
      case 'image': return { url: '' };
      case 'form': return { title: 'Inscreva-se', formId: '' };
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

  const updateSectionStyles = (sectionId: string, elementKey: string, newStyles: Partial<ElementStyles>) => {
      if (!editingPage) return;
      setEditingPage({
          ...editingPage,
          content: {
              ...editingPage.content!,
              sections: editingPage.content!.sections.map(s => {
                  if (s.id === sectionId) {
                      const styles = { ...(s.styles || {}) };
                      styles[elementKey] = { ...(styles[elementKey] || {}), ...newStyles };
                      return { ...s, styles };
                  }
                  return s;
              })
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

  const selectedSection = editingPage?.content?.sections.find(s => s.id === selectedSectionId);

  if (view === 'visual_editor' && editingPage) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col animate-in fade-in">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
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
          {/* Toolbar Lateral Esquerda */}
          <aside className="w-72 bg-white border-r border-slate-200 p-6 space-y-8 overflow-y-auto custom-scrollbar shadow-lg z-20">
            <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Novo Componente</h3>
                <div className="grid grid-cols-1 gap-2">
                {[
                    { type: 'hero', label: 'Hero (Topo)', icon: Layout },
                    { type: 'text', label: 'Texto/Sobre', icon: Type },
                    { type: 'features', label: 'Benefícios', icon: ListChecks },
                    { type: 'pricing', label: 'Oferta/Preço', icon: CreditCard },
                    { type: 'faq', label: 'FAQ', icon: HelpCircle },
                    { type: 'image', label: 'Imagem', icon: ImageIcon },
                    { type: 'form', label: 'Formulário', icon: FormInput }
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
          </aside>

          {/* Área de Visualização/Edição de ALTA FIDELIDADE */}
          <main className="flex-1 bg-slate-200 p-8 overflow-y-auto custom-scrollbar flex flex-col items-center">
            <div className="bg-white w-full max-w-6xl shadow-2xl rounded-[3rem] min-h-screen relative font-sans pb-40">
               <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-40 rounded-t-[3rem]">
                  <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-8 object-contain" />
               </nav>

               {editingPage.content?.sections?.map((section, idx) => {
                 const isSelected = selectedSectionId === section.id;
                 return (
                 <div 
                    key={section.id} 
                    onClick={(e) => { e.stopPropagation(); setSelectedSectionId(section.id); }}
                    className={clsx(
                        "relative group/section border-4 transition-all cursor-pointer",
                        isSelected ? "border-orange-500" : "border-transparent hover:border-orange-200"
                    )}
                 >
                    {/* Controles de Seção */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity z-50">
                       <div className="bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-2xl border border-slate-100 flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-orange-600 transition-all"><ArrowUp size={16}/></button>
                            <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-orange-600 transition-all"><ArrowDown size={16}/></button>
                            <div className="w-px h-4 bg-slate-200 self-center mx-1"></div>
                            <button onClick={(e) => { e.stopPropagation(); removeSection(section.id); }} className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-all"><Trash2 size={16}/></button>
                       </div>
                    </div>

                    <div className="relative">
                      {section.type === 'hero' && (
                        <header className="pt-24 pb-16 px-6 bg-gradient-to-br from-slate-50 to-white overflow-hidden relative">
                          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                            <div className="space-y-6">
                              <textarea 
                                style={{
                                    fontSize: section.styles?.headline?.fontSize || '48px',
                                    fontFamily: section.styles?.headline?.fontFamily,
                                    textAlign: section.styles?.headline?.textAlign || 'left'
                                }}
                                className="w-full font-black tracking-tight text-slate-900 leading-[1.1] bg-transparent border-none focus:ring-0 resize-none h-auto p-0" 
                                value={section.content.headline} 
                                onChange={e => updateSection(section.id, {...section.content, headline: e.target.value})}
                              />
                              <textarea 
                                style={{
                                    fontSize: section.styles?.subheadline?.fontSize || '18px',
                                    fontFamily: section.styles?.subheadline?.fontFamily,
                                    textAlign: section.styles?.subheadline?.textAlign || 'left'
                                }}
                                className="w-full text-slate-500 leading-relaxed font-medium bg-transparent border-none focus:ring-0 resize-none h-auto p-0" 
                                value={section.content.subheadline} 
                                onChange={e => updateSection(section.id, {...section.content, subheadline: e.target.value})}
                              />
                              <div className="flex flex-col sm:flex-row items-center gap-4">
                                  <input 
                                    className="bg-orange-600 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-orange-700 transition-all outline-none text-center" 
                                    value={section.content.ctaText} 
                                    onChange={e => updateSection(section.id, {...section.content, ctaText: e.target.value})}
                                  />
                              </div>
                            </div>
                            <div className="rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-100 aspect-video flex items-center justify-center relative">
                                {section.content.imageUrl && <img src={section.content.imageUrl} className="w-full h-full object-cover" alt="Hero" />}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" onClick={() => handleImageUploadForSection(section.id)}>
                                    <Upload className="text-white" size={32}/>
                                </div>
                            </div>
                          </div>
                        </header>
                      )}

                      {section.type === 'text' && (
                        <section className="py-20 px-8 bg-slate-50 border-y border-slate-100">
                            <div className="max-w-4xl mx-auto space-y-6">
                              <input 
                                style={{
                                    fontSize: section.styles?.title?.fontSize || '24px',
                                    fontFamily: section.styles?.title?.fontFamily,
                                    textAlign: section.styles?.title?.textAlign || 'left'
                                }}
                                className="font-black text-slate-800 tracking-tight bg-transparent border-none focus:ring-0 p-0 w-full" 
                                value={section.content.title} 
                                onChange={e => updateSection(section.id, {...section.content, title: e.target.value})}
                              />
                              <textarea 
                                style={{
                                    fontSize: section.styles?.text?.fontSize || '16px',
                                    fontFamily: section.styles?.text?.fontFamily,
                                    textAlign: section.styles?.text?.textAlign || 'left'
                                }}
                                className="w-full text-slate-600 leading-relaxed whitespace-pre-wrap bg-transparent border-none focus:ring-0 p-0 h-48" 
                                value={section.content.text} 
                                onChange={e => updateSection(section.id, {...section.content, text: e.target.value})}
                              />
                            </div>
                        </section>
                      )}

                      {section.type === 'pricing' && (
                        <section className="py-24 px-8 bg-slate-900 text-white overflow-hidden relative text-center">
                          <div className="max-w-4xl mx-auto bg-white rounded-[3rem] p-10 text-slate-900 shadow-2xl">
                              <input 
                                style={{ fontSize: section.styles?.price?.fontSize || '60px' }}
                                className="w-full text-center font-black tracking-tighter text-slate-900 bg-transparent border-none focus:ring-0 p-0" 
                                value={section.content.price} 
                                onChange={e => updateSection(section.id, {...section.content, price: e.target.value})}
                              />
                              <input 
                                style={{ fontSize: section.styles?.installments?.fontSize || '18px' }}
                                className="w-full text-center font-bold text-indigo-600 bg-transparent border-none focus:ring-0 p-0" 
                                value={section.content.installments}
                                onChange={e => updateSection(section.id, {...section.content, installments: e.target.value})}
                              />
                              <div className="h-px bg-slate-100 my-8"></div>
                              <input 
                                className="w-full bg-orange-600 text-white py-6 rounded-2xl font-black text-xl uppercase tracking-widest shadow-2xl hover:bg-orange-700 outline-none text-center" 
                                value={section.content.ctaText}
                                onChange={e => updateSection(section.id, {...section.content, ctaText: e.target.value})}
                              />
                          </div>
                        </section>
                      )}

                      {section.type === 'form' && (
                          <section className="py-20 px-8 bg-white border-y border-slate-100">
                               <div className="max-w-xl mx-auto p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-center space-y-6">
                                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-teal-600 mx-auto">
                                        <FormInput size={32}/>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800">{section.content.title || 'Formulário de Inscrição'}</h3>
                                    <div className="py-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold uppercase text-xs tracking-widest">
                                        Espaço Reservado para o Formulário: <br/> 
                                        <span className="text-teal-600">{section.content.formId ? `Form: ${availableForms.find(f => f.id === section.content.formId)?.title}` : 'Selecione no painel lateral'}</span>
                                    </div>
                               </div>
                          </section>
                      )}

                      {/* Outras seções como features, faq, image continuam simplificadas conforme original ou expansíveis */}
                    </div>
                 </div>
               )})}
            </div>
          </main>

          {/* Sidebar Lateral Direita: Edição do Bloco */}
          <aside className="w-80 bg-white border-l border-slate-200 p-6 overflow-y-auto custom-scrollbar shadow-2xl z-30">
              {selectedSection ? (
                  <div className="space-y-8 animate-in slide-in-from-right-2">
                      <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                              <Palette size={16} className="text-orange-500" /> Configurar {selectedSection.type}
                          </h3>
                          <button onClick={() => setSelectedSectionId(null)} className="p-1 hover:bg-slate-100 rounded text-slate-400"><X size={16}/></button>
                      </div>

                      {/* Links e IDs Técnicos */}
                      {(selectedSection.type === 'hero' || selectedSection.type === 'pricing') && (
                          <div className="space-y-4 pt-4 border-t border-slate-100">
                               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Link do Botão (CTA)</h4>
                               <div className="relative">
                                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                                    <input 
                                        type="text" 
                                        className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs font-mono"
                                        placeholder="URL de redirecionamento..."
                                        value={selectedSection.content.ctaUrl || ''}
                                        onChange={e => updateSection(selectedSection.id, { ...selectedSection.content, ctaUrl: e.target.value })}
                                    />
                               </div>
                          </div>
                      )}

                      {selectedSection.type === 'form' && (
                          <div className="space-y-4 pt-4 border-t border-slate-100">
                               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Integrar Formulário</h4>
                               <select 
                                    className="w-full p-2.5 border rounded-xl text-xs font-bold bg-slate-50"
                                    value={selectedSection.content.formId || ''}
                                    onChange={e => updateSection(selectedSection.id, { ...selectedSection.content, formId: e.target.value })}
                               >
                                   <option value="">-- Selecione um formulário --</option>
                                   {availableForms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                               </select>
                          </div>
                      )}

                      {/* Estilização de Elementos do Bloco */}
                      <div className="space-y-6 pt-6 border-t border-slate-100">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estilos de Texto</h4>
                          
                          {/* Mapear elementos editáveis por tipo de seção */}
                          {(['headline', 'subheadline', 'title', 'text', 'price', 'installments'] as const).filter(key => selectedSection.content[key] !== undefined).map(elKey => (
                              <div key={elKey} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Estilo: {elKey}</p>
                                  
                                  <div>
                                      <label className="text-[9px] font-bold text-slate-400 uppercase">Família da Fonte</label>
                                      <select 
                                          className="w-full mt-1 p-2 border rounded-lg text-[11px] bg-white"
                                          value={selectedSection.styles?.[elKey]?.fontFamily || ''}
                                          onChange={e => updateSectionStyles(selectedSection.id, elKey, { fontFamily: e.target.value })}
                                      >
                                          <option value="">Padrão</option>
                                          {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                      </select>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                      <div>
                                          <label className="text-[9px] font-bold text-slate-400 uppercase">Tamanho (px)</label>
                                          <input 
                                              type="text" 
                                              className="w-full mt-1 p-2 border rounded-lg text-[11px]" 
                                              placeholder="Ex: 48px"
                                              value={selectedSection.styles?.[elKey]?.fontSize || ''}
                                              onChange={e => updateSectionStyles(selectedSection.id, elKey, { fontSize: e.target.value })}
                                          />
                                      </div>
                                      <div>
                                          <label className="text-[9px] font-bold text-slate-400 uppercase">Alinhamento</label>
                                          <div className="flex bg-white border rounded-lg mt-1 overflow-hidden">
                                              <button onClick={() => updateSectionStyles(selectedSection.id, elKey, { textAlign: 'left' })} className={clsx("flex-1 p-2 flex justify-center", selectedSection.styles?.[elKey]?.textAlign === 'left' ? "bg-indigo-100 text-indigo-600" : "text-slate-400")}><AlignLeft size={14}/></button>
                                              <button onClick={() => updateSectionStyles(selectedSection.id, elKey, { textAlign: 'center' })} className={clsx("flex-1 p-2 flex justify-center", selectedSection.styles?.[elKey]?.textAlign === 'center' ? "bg-indigo-100 text-indigo-600" : "text-slate-400")}><AlignCenter size={14}/></button>
                                              <button onClick={() => updateSectionStyles(selectedSection.id, elKey, { textAlign: 'right' })} className={clsx("flex-1 p-2 flex justify-center", selectedSection.styles?.[elKey]?.textAlign === 'right' ? "bg-indigo-100 text-indigo-600" : "text-slate-400")}><AlignRight size={14}/></button>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-300 space-y-4">
                      <MousePointer2 size={48} className="opacity-10" />
                      <p className="text-sm font-bold uppercase tracking-widest">Selecione um bloco<br/>para editar</p>
                  </div>
              )}
          </aside>
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
            setAiPrompt({ productName: '', productDescription: '', targetAudience: '', mainBenefits: '', price: '', offerDetails: '', referenceTemplate: '' });
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
                    <Edit2 size={14}/> Editar Visual
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
                    {copiedId === page.id ? <CheckCircle size={14}/> : <ExternalLink size={14}/>} {copiedId === page.id ? 'Copiado!' : 'Link'}
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
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl my-8 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-10 py-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Criar com Inteligência Artificial</h3>
              <button onClick={() => { setShowModal(false); setCurrentDraft(null); }} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={32}/></button>
            </div>
            
            <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
               {!currentDraft ? (
                  <div className="space-y-8">
                     <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Selecione um Modelo de Referência (Opcional)</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                                {REFERENCE_TEMPLATES.map((tmpl) => (
                                    <button
                                        key={tmpl.id}
                                        type="button"
                                        onClick={() => setAiPrompt({...aiPrompt, referenceTemplate: tmpl.url})}
                                        className={clsx(
                                            "flex flex-col rounded-2xl border-2 transition-all group overflow-hidden bg-white text-left",
                                            aiPrompt.referenceTemplate === tmpl.url 
                                                ? "border-orange-500 ring-4 ring-orange-50 shadow-lg scale-[1.02]" 
                                                : "border-slate-100 hover:border-orange-200"
                                        )}
                                    >
                                        <div className="h-24 w-full overflow-hidden relative border-b border-slate-100">
                                            <img src={tmpl.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={tmpl.name} />
                                            {aiPrompt.referenceTemplate === tmpl.url && (
                                              <div className="absolute inset-0 bg-orange-600/20 flex items-center justify-center">
                                                <div className="bg-orange-600 text-white p-1 rounded-full"><Check size={12}/></div>
                                              </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={clsx("text-[10px] font-black uppercase tracking-tight", aiPrompt.referenceTemplate === tmpl.url ? "text-orange-700" : "text-slate-800")}>{tmpl.name}</span>
                                            </div>
                                            <p className="text-[9px] text-slate-400 font-medium leading-tight line-clamp-2">{tmpl.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Nome do Produto</label>
                            <input className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-orange-500 rounded-[1.5rem] text-base font-bold outline-none transition-all" value={aiPrompt.productName} onChange={e => setAiPrompt({...aiPrompt, productName: e.target.value})} placeholder="Ex: Formação Pilates Completa" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Descrição do Produto</label>
                            <textarea className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-orange-500 rounded-[1.5rem] text-sm h-24 resize-none outline-none transition-all" value={aiPrompt.productDescription} onChange={e => setAiPrompt({...aiPrompt, productDescription: e.target.value})} placeholder="Fale sobre os benefícios e o que o aluno aprende..." />
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

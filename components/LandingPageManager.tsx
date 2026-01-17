
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Edit2, Trash2, ExternalLink, ArrowLeft, 
  Save, X, Loader2, Sparkles, MonitorPlay, Copy, CheckCircle, 
  RefreshCw, Layout, Globe, Smartphone, CreditCard, MessageSquare, 
  HelpCircle, ListChecks, Target, Info, Link2, Upload, ImageIcon, FileText,
  ArrowUp, ArrowDown, Type, MousePointer2, Settings, PlusCircle, Check,
  Award, ShieldCheck, CheckCircle2, ChevronRight, Wand2, AlignLeft, AlignCenter, AlignRight,
  Palette, FormInput, Building, Move, Maximize2, Zap, BrainCircuit,
  Eye, GripVertical, PlusSquare,
  // Added List icon to imports
  List
} from 'lucide-react';
import { appBackend, slugify } from '../services/appBackend';
import { LandingPage, LandingPageContent, LandingPageSection, ElementStyles, FormModel, LandingPageField } from '../types';
import { GoogleGenAI, Type as SchemaType } from "@google/genai";
import clsx from 'clsx';

interface LandingPageManagerProps {
  onBack: () => void;
}

const SECTION_TYPES = [
    { type: 'hero', label: 'Destaque (Hero)' },
    { type: 'pain', label: 'Problema / Dor' },
    { type: 'method', label: 'Método / Diferencial' },
    { type: 'benefits', label: 'Benefícios' },
    { type: 'modules', label: 'Módulos / Grade' },
    { type: 'bonuses', label: 'Bônus' },
    { type: 'testimonials', label: 'Depoimentos' },
    { type: 'pricing', label: 'Oferta / Preço' },
    { type: 'guarantee', label: 'Garantia' },
    { type: 'faq', label: 'FAQ' },
    { type: 'footer', label: 'Rodapé' }
];

const REFERENCE_TEMPLATES = [
    { id: 'alura', name: 'Alura', url: 'https://www.alura.com.br/', description: 'Cursos e formações tecnológicas', imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=400&auto=format&fit=crop' },
    { id: 'rocketseat', name: 'Rocketseat', url: 'https://www.rocketseat.com.br/', description: 'Comunidade e eventos de dev', imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=400&auto=format&fit=crop' },
    { id: 'ebac', name: 'EBAC Online', url: 'https://ebaconline.com.br/', description: 'Design e Artes digitais', imageUrl: 'https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=400&auto=format&fit=crop' },
    { id: 'descomplica', name: 'Descomplica', url: 'https://www.descomplica.com.br/', description: 'Educação universitária e pós', imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=400&auto=format&fit=crop' },
    { id: 'conquer', name: 'Conquer', url: 'https://escolaconquer.com.br/', description: 'Soft skills e imersões', imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=400&auto=format&fit=crop' },
    { id: 'g4', name: 'G4 Educação', url: 'https://g4educacao.com/', description: 'Liderança e gestão executiva', imageUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=400&auto=format&fit=crop' }
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
  const [selectedElementKey, setSelectedElementKey] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const elementStartPosRef = useRef<{ x: number, y: number } | null>(null);

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

  const [editingPage, setEditingPage] = useState<Partial<LandingPage> | null>(null);
  const [currentDraft, setCurrentDraft] = useState<Partial<LandingPage> | null>(null);
  const [aiPrompt, setAiPrompt] = useState({
      productName: '',
      brandName: 'VOLL Pilates',
      productDescription: '',
      targetAudience: '',
      mainBenefits: '',
      price: '',
      offerDetails: '',
      guarantee: '7 dias',
      scarcity: 'Vagas limitadas para este lote',
      tone: 'Profissional e Persuasivo',
      referenceTemplate: ''
  });

  const handleCreateWithAi = async () => {
    if (!aiPrompt.productName || !aiPrompt.targetAudience) {
      alert("Informe pelo menos o nome do produto e o público-alvo.");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const templateReference = aiPrompt.referenceTemplate 
        ? `IMPORTANTE: Baseie a estrutura e o tom de voz no modelo: ${aiPrompt.referenceTemplate}.` 
        : '';

      const prompt = `Você é um especialista em copywriting de alta conversão e design premium.
      Crie uma Landing Page COMPLETA usando as estruturas AIDA (Atenção, Interesse, Desejo, Ação) e PAS (Problema, Agitação, Solução).
      
      DADOS:
      Curso: ${aiPrompt.productName}
      Marca: ${aiPrompt.brandName}
      Público: ${aiPrompt.targetAudience}
      Descrição: ${aiPrompt.productDescription}
      Promessa: ${aiPrompt.mainBenefits}
      Preço: ${aiPrompt.price}
      Garantia: ${aiPrompt.guarantee}
      Escassez: ${aiPrompt.scarcity}
      Tom: ${aiPrompt.tone}
      ${templateReference}
      
      ESTRUTURA OBRIGATÓRIA:
      Hero, Dor, Método, Benefícios, Para quem é, Módulos, Bônus, Depoimentos, Oferta, Garantia, FAQ e Rodapé.

      IMPORTANTE:
      - Cada campo de texto deve ser um objeto: { "value": "Texto persuasivo aqui", "ai": ["variations", "more_persuasive"] }.
      - As listas devem ser arrays de objetos com "id", "value" (ou "title" e "description") e campo "ai".
      
      Retorne APENAS o JSON.`;

      const fieldSchema = {
        type: SchemaType.OBJECT,
        properties: {
          value: { type: SchemaType.STRING },
          ai: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
        },
        required: ["value", "ai"]
      };

      const listItemSchema = {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          value: { type: SchemaType.STRING }, 
          title: fieldSchema,
          description: fieldSchema,
          question: fieldSchema,
          answer: fieldSchema,
          ai: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
        }
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              meta: {
                  type: SchemaType.OBJECT,
                  properties: {
                      title: { type: SchemaType.STRING },
                      status: { type: SchemaType.STRING }
                  },
                  required: ["title"]
              },
              theme: {
                  type: SchemaType.OBJECT,
                  properties: {
                      brand_name: { type: SchemaType.STRING },
                      tone: { type: SchemaType.STRING },
                      primary_color: { type: SchemaType.STRING }
                  },
                  required: ["brand_name", "primary_color"]
              },
              sections: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    id: { type: SchemaType.STRING },
                    type: { type: SchemaType.STRING },
                    enabled: { type: SchemaType.BOOLEAN },
                    content: { 
                        type: SchemaType.OBJECT,
                        properties: {
                            headline: fieldSchema,
                            subheadline: fieldSchema,
                            description: fieldSchema,
                            bullets: { type: SchemaType.ARRAY, items: fieldSchema },
                            cta: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    label: fieldSchema,
                                    href: { type: SchemaType.STRING },
                                    microcopy: fieldSchema
                                }
                            },
                            consequences: { type: SchemaType.ARRAY, items: fieldSchema },
                            items: { type: SchemaType.ARRAY, items: listItemSchema },
                            original_price: fieldSchema,
                            price: fieldSchema,
                            features: { type: SchemaType.ARRAY, items: fieldSchema },
                            cta_label: fieldSchema,
                            cta_url: fieldSchema
                        }
                    }
                  },
                  required: ["id", "type", "enabled", "content"]
                }
              }
            },
            required: ["meta", "theme", "sections"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("A IA retornou um conteúdo vazio.");
      
      const generated = JSON.parse(text);
      
      const newPage: Partial<LandingPage> = {
        title: generated.meta?.title || aiPrompt.productName,
        productName: aiPrompt.productName,
        slug: slugify(generated.meta?.title || aiPrompt.productName),
        content: generated,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        theme: 'modern'
      };

      setCurrentDraft(newPage);
    } catch (e: any) {
      console.error("Erro detalhado na geração:", e);
      alert(`Houve uma falha na geração da página: ${e.message || 'Erro de comunicação com a IA'}. Por favor, tente novamente.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAiAction = async (sectionId: string, fieldKey: string, action: string, currentVal: string) => {
    const fieldIdentifier = `${sectionId}-${fieldKey}`;
    setIsRefiningField(fieldIdentifier);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Aja como um Copywriter. Melhore o texto a seguir usando a técnica "${action}":
      Texto: "${currentVal}"
      Produto: "${aiPrompt.productName}"
      Retorne apenas o texto final melhorado, sem aspas ou explicações.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      const refinedText = (response.text || currentVal).trim();

      if (editingPage && editingPage.content) {
          const newSections = [...editingPage.content.sections];
          const sectionIdx = newSections.findIndex(s => s.id === sectionId);
          if (sectionIdx !== -1) {
              const section = { ...newSections[sectionIdx] };
              const content = { ...section.content };
              
              if (fieldKey.includes('.')) {
                  const parts = fieldKey.split('.');
                  if (parts.length === 3) {
                      const [listKey, index, subKey] = parts;
                      const idx = parseInt(index);
                      const newList = [...(content[listKey] || [])];
                      if (newList[idx]) {
                          if (newList[idx][subKey] && typeof newList[idx][subKey] === 'object') {
                              newList[idx][subKey].value = refinedText;
                          } else {
                              newList[idx][subKey] = refinedText;
                          }
                          content[listKey] = newList;
                      }
                  }
              } else {
                  if (content[fieldKey]) content[fieldKey].value = refinedText;
              }
              section.content = content;
              newSections[sectionIdx] = section;
              setEditingPage({ ...editingPage, content: { ...editingPage.content, sections: newSections } });
          }
      }
    } catch (e: any) {
      console.error(e);
      alert("Erro na IA: " + e.message);
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
      alert(`Erro ao salvar no banco de dados: ${e.message}`);
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

  const updateSectionStyles = (sectionId: string, elementKey: string, newStyles: Partial<ElementStyles>) => {
      if (!editingPage || !editingPage.content) return;
      const newSections = editingPage.content.sections.map((s: LandingPageSection) => {
          if (s.id === sectionId) {
              const styles = { ...(s.styles || {}) };
              styles[elementKey] = { ...(styles[elementKey] || {}), ...newStyles };
              return { ...s, styles };
          }
          return s;
      });
      setEditingPage({ ...editingPage, content: { ...editingPage.content, sections: newSections } });
  };

  const handleElementMouseDown = (e: React.MouseEvent, sectionId: string, elementKey: string) => {
    e.stopPropagation();
    setIsDragging(true);
    setSelectedSectionId(sectionId);
    setSelectedElementKey(elementKey);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    
    const section = editingPage?.content?.sections.find((s: any) => s.id === sectionId);
    const styles = section?.styles?.[elementKey];
    
    elementStartPosRef.current = { 
        x: styles?.x !== undefined ? styles.x : 50, 
        y: styles?.y !== undefined ? styles.y : 50 
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedSectionId || !selectedElementKey || !dragStartRef.current || !elementStartPosRef.current) return;
    
    const targetSectionEl = document.getElementById(`lp-section-${selectedSectionId}`);
    if (!targetSectionEl) return;

    const rect = targetSectionEl.getBoundingClientRect();
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const percentX = (deltaX / rect.width) * 100;
    const percentY = (deltaY / rect.height) * 100;

    const newX = Math.max(0, Math.min(100, elementStartPosRef.current.x + percentX));
    const newY = Math.max(0, Math.min(100, elementStartPosRef.current.y + percentY));

    updateSectionStyles(selectedSectionId, selectedElementKey, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
    // Corrected typo: elementStartPosPosRef -> elementStartPosRef
    elementStartPosRef.current = null;
  };

  // --- Funções de Manipulação de Seções e Itens ---

  const handleDeleteSection = (index: number) => {
      if (!editingPage || !editingPage.content) return;
      if (!window.confirm("Remover esta seção?")) return;
      const newSections = [...editingPage.content.sections];
      newSections.splice(index, 1);
      setEditingPage({ ...editingPage, content: { ...editingPage.content, sections: newSections } });
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
      if (!editingPage || !editingPage.content) return;
      const newSections = [...editingPage.content.sections];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newSections.length) return;
      
      const temp = newSections[index];
      newSections[index] = newSections[targetIndex];
      newSections[targetIndex] = temp;
      setEditingPage({ ...editingPage, content: { ...editingPage.content, sections: newSections } });
  };

  const handleAddSection = (index: number, type: string) => {
      if (!editingPage || !editingPage.content) return;
      const newSection: LandingPageSection = {
          id: crypto.randomUUID(),
          type: type as any,
          enabled: true,
          content: {
              headline: { value: 'Título Novo', ai: ['persuasive'] },
              subheadline: { value: 'Subtítulo Novo', ai: ['persuasive'] }
          }
      };
      
      // Ajuste de conteúdo padrão por tipo
      if (['modules', 'benefits', 'bonuses', 'testimonials', 'pricing', 'faq'].includes(type)) {
          newSection.content.items = [];
      }
      
      const newSections = [...editingPage.content.sections];
      newSections.splice(index + 1, 0, newSection);
      setEditingPage({ ...editingPage, content: { ...editingPage.content, sections: newSections } });
  };

  const handleAddItemToList = (sectionId: string, listKey: string) => {
      if (!editingPage || !editingPage.content) return;
      const newSections = [...editingPage.content.sections];
      const section = newSections.find(s => s.id === sectionId);
      if (!section) return;
      
      if (!Array.isArray(section.content[listKey])) section.content[listKey] = [];
      
      const newItem = {
          id: crypto.randomUUID(),
          value: 'Novo Item',
          title: { value: 'Novo Item', ai: ['persuasive'] },
          description: { value: 'Descrição do item', ai: ['persuasive'] },
          ai: ['persuasive']
      };
      
      section.content[listKey].push(newItem);
      setEditingPage({ ...editingPage, content: { ...editingPage.content, sections: newSections } });
  };

  const handleRemoveItemFromList = (sectionId: string, listKey: string, itemIdx: number) => {
      if (!editingPage || !editingPage.content) return;
      const newSections = [...editingPage.content.sections];
      const section = newSections.find(s => s.id === sectionId);
      if (section && Array.isArray(section.content[listKey])) {
          section.content[listKey].splice(itemIdx, 1);
          setEditingPage({ ...editingPage, content: { ...editingPage.content, sections: newSections } });
      }
  };

  const renderInteractableField = (sectionId: string, fieldKey: string, field: LandingPageField, styles: ElementStyles = {}, isMultiline = false) => {
      if (!field || typeof field.value !== 'string') return null;
      const isSelected = selectedSectionId === sectionId && selectedElementKey === fieldKey;
      const isRefining = isRefiningField === `${sectionId}-${fieldKey}`;

      return (
          <div 
              className={clsx(
                  "relative group/field transition-all border border-transparent hover:border-indigo-300 hover:bg-indigo-50/10 rounded-lg",
                  isSelected ? "border-indigo-500 bg-indigo-50/20 shadow-sm z-30" : ""
              )}
              style={{
                  position: (styles.x !== undefined || styles.y !== undefined) ? 'absolute' : 'relative',
                  left: styles.x !== undefined ? `${styles.x}%` : undefined,
                  top: styles.y !== undefined ? `${styles.y}%` : undefined,
                  transform: (styles.x !== undefined || styles.y !== undefined) ? 'translate(-50%, -50%)' : undefined,
                  width: styles.width ? `${styles.width}%` : '100%',
                  fontSize: styles.fontSize,
                  fontFamily: styles.fontFamily,
                  textAlign: styles.textAlign,
                  color: styles.color
              }}
              onClick={(e) => { e.stopPropagation(); setSelectedSectionId(sectionId); setSelectedElementKey(fieldKey); }}
          >
              <div className="absolute -top-9 left-0 hidden group-hover/field:flex items-center gap-1 bg-white p-1 rounded-lg shadow-xl border border-indigo-100 z-[60]">
                  <button onMouseDown={(e) => handleElementMouseDown(e, sectionId, fieldKey)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 cursor-move"><Move size={12}/></button>
                  <div className="h-3 w-px bg-slate-200 mx-0.5"></div>
                  {field.ai?.map(action => (
                      <button 
                          key={action}
                          disabled={isRefining}
                          onClick={() => handleAiAction(sectionId, fieldKey, action, field.value)}
                          className="px-2 py-1 text-[8px] font-black uppercase tracking-tighter bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 disabled:opacity-50"
                      >
                          {isRefining ? <Loader2 size={10} className="animate-spin"/> : action.replace('_', ' ')}
                      </button>
                  ))}
              </div>

              {isMultiline ? (
                  <textarea 
                    className="w-full bg-transparent border-none focus:ring-0 p-1 resize-none outline-none overflow-hidden" 
                    value={field.value}
                    rows={field.value.split('\n').length}
                    onChange={e => {
                        const content = { ...editingPage?.content };
                        const sIdx = content.sections.findIndex((s: any) => s.id === sectionId);
                        if (sIdx === -1) return;
                        const section = content.sections[sIdx];
                        
                        if (fieldKey.includes('.')) {
                            const [listKey, itemIdx, subKey] = fieldKey.split('.');
                            const newList = [...section.content[listKey]];
                            newList[parseInt(itemIdx)][subKey].value = e.target.value;
                            section.content[listKey] = newList;
                        } else {
                            section.content[fieldKey].value = e.target.value;
                        }
                        setEditingPage({ ...editingPage!, content });
                    }}
                  />
              ) : (
                  <input 
                    className="w-full bg-transparent border-none focus:ring-0 p-1 outline-none font-bold" 
                    value={field.value}
                    onChange={e => {
                        const content = { ...editingPage?.content };
                        const sIdx = content.sections.findIndex((s: any) => s.id === sectionId);
                        if (sIdx === -1) return;
                        const section = content.sections[sIdx];
                        
                        if (fieldKey.includes('.')) {
                            const [listKey, itemIdx, subKey] = fieldKey.split('.');
                            const newList = [...section.content[listKey]];
                            newList[parseInt(itemIdx)][subKey].value = e.target.value;
                            section.content[listKey] = newList;
                        } else {
                            section.content[fieldKey].value = e.target.value;
                        }
                        setEditingPage({ ...editingPage!, content });
                    }}
                  />
              )}
          </div>
      );
  };

  if (view === 'visual_editor' && editingPage) {
    const content = editingPage.content as LandingPageContent;
    return (
      <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col animate-in fade-in h-screen overflow-hidden" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-50 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
            <div className="h-6 w-px bg-slate-200"></div>
            <h2 className="font-bold text-slate-800">{editingPage.title}</h2>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full border border-indigo-100">
                <BrainCircuit size={16} className="text-indigo-600 animate-pulse" />
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Editor Visual</span>
             </div>
            <button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-2 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95">
              {isLoading ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} Salvar Página
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-80 bg-white border-r border-slate-200 p-6 space-y-8 overflow-y-auto custom-scrollbar shadow-lg z-40">
             <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Aparência Global</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Nome da Marca</label>
                        <input className="w-full text-xs p-2.5 border rounded-xl mt-1" value={content.theme.brand_name} onChange={e => {
                            const newContent = {...content};
                            newContent.theme.brand_name = e.target.value;
                            setEditingPage({...editingPage, content: newContent});
                        }} />
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Cor Primária</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input type="color" className="w-10 h-10 rounded border p-1" value={content.theme.primary_color} onChange={e => {
                                const newContent = {...content};
                                newContent.theme.primary_color = e.target.value;
                                setEditingPage({...editingPage, content: newContent});
                            }} />
                            <span className="text-xs font-mono font-bold text-slate-500 uppercase">{content.theme.primary_color}</span>
                        </div>
                    </div>
                </div>
             </div>

             <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Navegação Estrutural</h3>
                <div className="space-y-2">
                    {content.sections.map((s, idx) => (
                        <div key={s.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 group/nav">
                           <div className="flex items-center gap-3">
                               <span className="text-[10px] font-black text-slate-300">#{idx+1}</span>
                               <span className="text-xs font-bold text-slate-700 uppercase tracking-tighter truncate max-w-[100px]">{s.type}</span>
                           </div>
                           <div className="flex gap-1">
                               <button onClick={() => handleMoveSection(idx, 'up')} disabled={idx === 0} className="p-1 text-slate-300 hover:text-indigo-600 disabled:opacity-0"><ArrowUp size={14}/></button>
                               <button onClick={() => handleMoveSection(idx, 'down')} disabled={idx === content.sections.length -1} className="p-1 text-slate-300 hover:text-indigo-600 disabled:opacity-0"><ArrowDown size={14}/></button>
                           </div>
                        </div>
                    ))}
                </div>
             </div>
          </aside>

          <main className="flex-1 bg-slate-200 p-8 overflow-y-auto custom-scrollbar flex flex-col items-center">
            <div className="bg-white w-full max-w-5xl shadow-2xl rounded-[3rem] min-h-screen relative font-sans pb-[300px]">
                
                {content.sections.map((section, sIdx) => (
                    <div key={section.id} id={`lp-section-${section.id}`} className="relative group/section border-b border-slate-100 hover:bg-slate-50/30 transition-all">
                        
                        {/* Controles de Seção (Flutuantes no Hover) */}
                        <div className="absolute right-4 top-4 z-40 opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center gap-2 bg-white/90 backdrop-blur-md p-1.5 rounded-xl shadow-xl border border-indigo-100">
                            <div className="flex flex-col gap-1 pr-2 mr-2 border-r border-slate-200">
                                <button onClick={() => handleMoveSection(sIdx, 'up')} disabled={sIdx === 0} className="p-1 hover:bg-indigo-50 text-indigo-600 disabled:text-slate-200"><ArrowUp size={16}/></button>
                                <button onClick={() => handleMoveSection(sIdx, 'down')} disabled={sIdx === content.sections.length - 1} className="p-1 hover:bg-indigo-50 text-indigo-600 disabled:text-slate-200"><ArrowDown size={16}/></button>
                            </div>
                            <div className="text-[10px] font-black text-slate-400 uppercase pr-3">{section.type}</div>
                            <button onClick={() => handleDeleteSection(sIdx)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Remover Seção"><Trash2 size={16}/></button>
                        </div>

                        {/* Botão Flutuante: Adicionar Seção Acima */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-40 opacity-0 group-hover/section:opacity-100 transition-opacity">
                            <div className="relative group/add">
                                <button className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform active:scale-95"><Plus size={16}/></button>
                                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 hidden group-hover/add:block animate-in zoom-in-95">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center mb-1 border-b pb-1">Inserir Seção</p>
                                    {SECTION_TYPES.map(st => (
                                        <button key={st.type} onClick={() => handleAddSection(sIdx - 1, st.type)} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">{st.label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Renderização de Conteúdo Baseado no Tipo */}
                        <div className={clsx("relative p-4", !section.enabled && "opacity-50 grayscale")}>
                            {section.type === 'hero' && (
                                <section className="pt-24 pb-20 px-12 bg-gradient-to-br from-slate-50 to-white relative text-center">
                                    <div className="max-w-4xl mx-auto space-y-8">
                                        {renderInteractableField(section.id, 'headline', section.content.headline, section.styles?.headline, true)}
                                        {renderInteractableField(section.id, 'subheadline', section.content.subheadline, section.styles?.subheadline, true)}
                                        <div className="flex justify-center">
                                            <div className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl">
                                                {section.content.cta?.label?.value || 'QUERO ME INSCREVER'}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {!['hero'].includes(section.type) && (
                                <section className="py-12 px-12 relative">
                                    <div className="space-y-6">
                                        {Object.keys(section.content).map(key => {
                                            const field = section.content[key];
                                            
                                            // Campos de Texto Simples
                                            if (field && typeof field === 'object' && field.value !== undefined && !Array.isArray(field)) {
                                                return <div key={key}>{renderInteractableField(section.id, key, field as LandingPageField, section.styles?.[key])}</div>
                                            }

                                            // Listas (Módulos, Benefícios, etc.)
                                            if (Array.isArray(field)) {
                                                return (
                                                    <div key={key} className="space-y-4 pt-6">
                                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                                                <List size={14}/> {key.replace('_', ' ')}
                                                            </h4>
                                                            <button 
                                                                onClick={() => handleAddItemToList(section.id, key)}
                                                                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase hover:bg-indigo-100 transition-all"
                                                            >
                                                                <Plus size={12}/> Adicionar Item
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {field.map((item, itemIdx) => (
                                                                <div key={item.id || itemIdx} className="group/item relative p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 hover:border-indigo-200 transition-all space-y-4">
                                                                    <button 
                                                                        onClick={() => handleRemoveItemFromList(section.id, key, itemIdx)}
                                                                        className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-600 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                                    >
                                                                        <X size={14}/>
                                                                    </button>
                                                                    {Object.keys(item).map(subKey => {
                                                                        if (item[subKey] && typeof item[subKey] === 'object' && item[subKey].value !== undefined) {
                                                                            return (
                                                                                <div key={subKey}>
                                                                                    <label className="text-[8px] font-black text-slate-300 uppercase ml-1">{subKey}</label>
                                                                                    {renderInteractableField(section.id, `${key}.${itemIdx}.${subKey}`, item[subKey])}
                                                                                </div>
                                                                            )
                                                                        }
                                                                        return null;
                                                                    })}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            return null;
                                        })}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Botão Flutuante: Adicionar Seção Abaixo */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-40 opacity-0 group-hover/section:opacity-100 transition-opacity">
                            <div className="relative group/add">
                                <button className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform active:scale-95"><Plus size={16}/></button>
                                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 hidden group-hover/add:block animate-in zoom-in-95">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center mb-1 border-b pb-1">Inserir Seção</p>
                                    {SECTION_TYPES.map(st => (
                                        <button key={st.type} onClick={() => handleAddSection(sIdx, st.type)} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">{st.label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                ))}

                {/* Bloco Vazio de Rodapé do Editor */}
                <div className="p-20 text-center text-slate-300">
                    <Sparkles size={40} className="mx-auto mb-4 opacity-20"/>
                    <p className="text-sm font-medium">Fim da página. Use os botões flutuantes para adicionar mais seções.</p>
                </div>

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
            <p className="text-slate-500 text-sm">IA Copywriter & Design Premium.</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setAiPrompt({ ...aiPrompt, productName: '', productDescription: '' });
            setEditingPage(null);
            setCurrentDraft(null);
            setShowModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95"
        >
          <Sparkles size={18} /> Criar Página com IA
        </button>
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
            <div key={page.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col group border-t-8 border-t-indigo-600">
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-black text-slate-800 text-lg mb-1">{page.title}</h3>
                <p className="text-xs text-slate-400 mb-4 font-bold uppercase tracking-widest">{page.productName}</p>
                <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                  <button onClick={() => { setEditingPage(page); setView('visual_editor'); }} className="flex-1 py-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-slate-200"><Edit2 size={14}/> Editar</button>
                  <button onClick={() => { const url = `${window.location.origin}/?landingPageId=${page.id}`; navigator.clipboard.writeText(url); setCopiedId(page.id); setTimeout(() => setCopiedId(null), 2000); }} className={clsx("flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border", copiedId === page.id ? "bg-green-50 border-green-200 text-green-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>{copiedId === page.id ? <CheckCircle size={14}/> : <ExternalLink size={14}/>} Link</button>
                  <button onClick={() => handleDelete(page.id)} className="p-2 text-slate-300 hover:text-red-600 rounded-xl transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-10 py-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Criar com Inteligência Artificial</h3>
              <button onClick={() => { setShowModal(false); setCurrentDraft(null); }} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={32}/></button>
            </div>
            <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
               {!currentDraft ? (
                  <div className="space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Modelo de Referência</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                                {REFERENCE_TEMPLATES.map((tmpl) => (
                                    <button
                                        key={tmpl.id}
                                        onClick={() => setAiPrompt({...aiPrompt, referenceTemplate: tmpl.url})}
                                        className={clsx(
                                            "flex flex-col rounded-2xl border-2 transition-all group overflow-hidden bg-white text-left",
                                            aiPrompt.referenceTemplate === tmpl.url ? "border-indigo-600 ring-4 ring-indigo-50 shadow-lg scale-105" : "border-slate-100 hover:border-indigo-200"
                                        )}
                                    >
                                        <div className="h-20 w-full overflow-hidden relative border-b border-slate-100">
                                            <img src={tmpl.imageUrl} className="w-full h-full object-cover" alt={tmpl.name} />
                                        </div>
                                        <div className="p-2 text-center"><span className="text-[10px] font-black uppercase text-slate-800">{tmpl.name}</span></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Nome do Produto</label>
                            <input type="text" className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-[1.5rem] text-base font-bold outline-none transition-all" value={aiPrompt.productName} onChange={e => setAiPrompt({...aiPrompt, productName: e.target.value})} placeholder="Ex: Formação Pilates Completa" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Público-Alvo</label>
                            <input type="text" className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-[1.5rem] text-sm font-bold" value={aiPrompt.targetAudience} onChange={e => setAiPrompt({...aiPrompt, targetAudience: e.target.value})} placeholder="Ex: Fisioterapeutas" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Promessa / Dor Principal</label>
                            <textarea className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-[1.5rem] text-sm h-24 resize-none outline-none transition-all" value={aiPrompt.productDescription} onChange={e => setAiPrompt({...aiPrompt, productDescription: e.target.value})} placeholder="Qual o problema principal que resolvemos?" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:col-span-2">
                            <div><label className="block text-[11px] font-black text-slate-400 uppercase mb-2.5 ml-1">Preço</label><input type="text" className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-2xl text-xs font-bold" value={aiPrompt.price} onChange={e => setAiPrompt({...aiPrompt, price: e.target.value})} placeholder="R$ 1.997,00" /></div>
                            <div><label className="block text-[11px] font-black text-slate-400 uppercase mb-2.5 ml-1">Garantia</label><input type="text" className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-2xl text-xs font-bold" value={aiPrompt.guarantee} onChange={e => setAiPrompt({...aiPrompt, guarantee: e.target.value})} placeholder="7 dias" /></div>
                            <div className="md:col-span-2"><label className="block text-[11px] font-black text-slate-400 uppercase mb-2.5 ml-1">Tom de Voz</label><select className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-2xl text-xs font-bold" value={aiPrompt.tone} onChange={e => setAiPrompt({...aiPrompt, tone: e.target.value})}><option value="Profissional e Persuasivo">Profissional e Persuasivo</option><option value="Elegante e Premium">Elegante e Premium</option></select></div>
                        </div>
                     </div>
                     <button onClick={handleCreateWithAi} disabled={isGenerating || !aiPrompt.productName} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                        {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} />}
                        {isGenerating ? 'IA Consultora Gerando Estratégia...' : 'Gerar Estrutura Premium'}
                     </button>
                  </div>
               ) : (
                  <div className="space-y-8 animate-in slide-in-from-right-4">
                      <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-8 opacity-10"><Zap size={100}/></div>
                          <h4 className="text-xl font-black mb-2 uppercase tracking-tighter">Estrutura Pronta!</h4>
                          <p className="text-indigo-100 font-medium leading-relaxed">A IA gerou uma estrutura persuasiva completa. Você poderá revisar e editar cada bloco no editor visual a seguir.</p>
                      </div>
                      <div className="flex gap-4 pt-6 border-t">
                          <button onClick={() => setCurrentDraft(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Voltar</button>
                          <button onClick={confirmDraft} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95">Abrir Editor Visual</button>
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

// UseMemo Helper
function useMemo<T>(factory: () => T, deps: any[]): T {
    return React.useMemo(factory, deps);
}

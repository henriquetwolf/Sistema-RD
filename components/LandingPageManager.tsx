import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Edit2, Trash2, ExternalLink, ArrowLeft, 
  Save, X, Loader2, Sparkles, MonitorPlay, Copy, CheckCircle, 
  RefreshCw, Layout, Globe, Smartphone, CreditCard, MessageSquare, 
  HelpCircle, ListChecks, Target, Info, Link2, Upload, ImageIcon, FileText,
  ArrowUp, ArrowDown, Type as TypeIcon, MousePointer2, Settings, PlusCircle, Check,
  Award, ShieldCheck, CheckCircle2, ChevronRight, Wand2, AlignLeft, AlignCenter, AlignRight,
  Palette, FormInput, Building, Move, Maximize2, Zap, BrainCircuit,
  Eye, GripVertical, PlusSquare, List, Video, Image as LucideImage,
  Maximize, Minimize, Anchor, CopySlash, MousePointerClick, FileEdit, Code, FileUp, Sparkle,
  LayoutGrid, MoveDiagonal, Type
} from 'lucide-react';
import { appBackend, slugify } from '../services/appBackend';
import { LandingPage, LandingPageContent, LandingPageSection, ElementStyles, FormModel, LandingPageField, FormFolder } from '../types';
import { GoogleGenAI, Type as GenAiType } from "@google/genai";
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
  const [folders, setFolders] = useState<FormFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState<LandingPage | null>(null);
  const [creationStep, setCreationStep] = useState<'choice' | 'form'>('choice');
  const [creationMode, setCreationMode] = useState<'standard' | 'prompt'>('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefiningField, setIsRefiningField] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'visual_editor'>('list');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedElementKey, setSelectedElementKey] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const elementStartRef = useRef<{ x: number, y: number } | null>(null);

  const [editingPage, setEditingPage] = useState<Partial<LandingPage> | null>(null);
  const [currentDraft, setCurrentDraft] = useState<Partial<LandingPage> | null>(null);
  const [htmlRefineInstruction, setHtmlRefineInstruction] = useState('');
  const [isRewritingHtml, setIsRewritingHtml] = useState(false);
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
      referenceTemplate: '',
      referenceUrl: '',
      customPrompt: '',
      selectedFormId: '',
      ctaLink: '',
      briefFileBase64: '' as string | null,
      briefFileName: '' as string | null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const htmlEditorRef = useRef<HTMLDivElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        alert("Por favor, selecione apenas arquivos PDF.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAiPrompt(prev => ({ ...prev, briefFileBase64: base64, briefFileName: file.name }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRewriteHtml = async () => {
      if (!htmlRefineInstruction.trim() || !editingPage?.content?.htmlCode) return;
      setIsRewritingHtml(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `Você é um desenvolvedor frontend expert em Tailwind CSS e Landing Pages.
          Seu objetivo é REESCREVER o código HTML abaixo seguindo estas INSTRUÇÕES:
          "${htmlRefineInstruction}"

          CÓDIGO ATUAL:
          ${editingPage.content.htmlCode}

          REQUISITOS:
          1. Mantenha as tags {{form}} e {{cta_link}} se elas já existirem no código.
          2. Retorne APENAS o código HTML completo. Não inclua conversas ou markdown.
          3. Garanta que a página continue responsiva e moderna.`;

          const response = await ai.models.generateContent({
              model: "gemini-3-pro-preview",
              contents: prompt
          });

          const generatedHtml = response.text || "";
          const cleanedHtml = generatedHtml.replace(/```html/gi, '').replace(/```/g, '').trim();

          setEditingPage({
              ...editingPage,
              content: {
                  ...editingPage.content,
                  htmlCode: cleanedHtml
              }
          });
          setHtmlRefineInstruction('');
      } catch (e: any) {
          console.error("Erro ao reescrever HTML:", e);
          alert("Erro na IA: " + e.message);
      } finally {
          setIsRewritingHtml(false);
      }
  };

  const handleCreateWithAi = async () => {
    if (creationMode === 'standard' && !aiPrompt.productName) {
      alert("Informe o nome do produto.");
      return;
    }

    if (creationMode === 'prompt' && !aiPrompt.customPrompt && !aiPrompt.briefFileBase64) {
      alert("Descreva a página ou anexe o briefing em PDF para continuar.");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      if (creationMode === 'prompt') {
          let htmlPrompt = `Você é um mestre em design de conversão e copywriting.
          Sua missão é criar o CÓDIGO HTML COMPLETO de uma Landing Page de Alta Performance.
          
          REQUISITOS TÉCNICOS:
          1. Use Tailwind CSS via CDN para estilização.
          2. A página deve ser responsiva e moderna.
          3. Use a tag {{form}} no local onde deve aparecer o formulário de captura.
          4. Use a tag {{cta_link}} nos links dos botões de compra/CTA.
          
          REFERÊNCIAS:
          - Site de Referência Visual: ${aiPrompt.referenceUrl || 'Nenhum informado. Use um estilo moderno e limpo.'}
          - Link do CTA: ${aiPrompt.ctaLink || '#'}
          
          INSTRUÇÕES ADICIONAIS:
          ${aiPrompt.customPrompt || 'Crie uma página persuasiva baseada no briefing anexado.'}
          
          Retorne APENAS o código HTML completo dentro de uma estrutura básica HTML5. Não inclua explicações fora do código.`;

          const contentsParts: any[] = [{ text: htmlPrompt }];
          if (aiPrompt.briefFileBase64) {
              contentsParts.push({
                  inlineData: {
                      mimeType: 'application/pdf',
                      data: aiPrompt.briefFileBase64
                  }
              });
          }

          const response = await ai.models.generateContent({
              model: "gemini-3-pro-preview",
              contents: { parts: contentsParts }
          });

          const generatedHtml = response.text || "";
          const cleanedHtml = generatedHtml.replace(/```html/gi, '').replace(/```/g, '').trim();

          const newPage: Partial<LandingPage> = {
            title: "Página Gerada via IA - " + new Date().toLocaleDateString(),
            productName: aiPrompt.productName || "Produto Personalizado",
            slug: slugify("pagina-ia-" + Date.now()),
            content: {
                meta: { page_id: crypto.randomUUID(), title: "Página via IA", status: "active", version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                theme: { brand_name: "VOLL", tone: "Custom", primary_color: "#000000", text_color: "#000000", bg_color: "#FFFFFF", font_family: "sans" },
                ai_defaults: { enabled: false, max_suggestions: 0, rules: "" },
                sections: [],
                htmlCode: cleanedHtml,
                selectedFormId: aiPrompt.selectedFormId,
                ctaLink: aiPrompt.ctaLink
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
            theme: 'modern'
          };
          setCurrentDraft(newPage);
          setIsGenerating(false);
          return;
      }

      let basePrompt = `Você é um arquiteto sênior de design de conversão e expert em copywriting.
      Sua missão é criar uma Landing Page Premium em formato JSON.
      
      INFORMAÇÕES DA NOVA OFERTA:
      Nome: ${aiPrompt.productName}
      Marca: ${aiPrompt.brandName}
      Público: ${aiPrompt.targetAudience}
      Descrição: ${aiPrompt.productDescription}
      Preço: ${aiPrompt.price}
      Garantia: ${aiPrompt.guarantee}
      Tom de Voz: ${aiPrompt.tone}
      Link de destino (CTA): ${aiPrompt.ctaLink}
      
      ESTRUTURA SUGERIDA: Hero, Dor, Método, Benefícios, Módulos, Bônus, Depoimentos, Oferta, Garantia, FAQ e Rodapé.`;

      if (aiPrompt.referenceTemplate) {
          basePrompt += `\n\nInspire-se no estilo visual do site: ${aiPrompt.referenceTemplate}.`;
      }

      const fieldSchema = {
        type: GenAiType.OBJECT,
        properties: {
          value: { type: GenAiType.STRING },
          ai: { type: GenAiType.ARRAY, items: { type: GenAiType.STRING } }
        },
        required: ["value", "ai"]
      };

      const listItemSchema = {
        type: GenAiType.OBJECT,
        properties: {
          id: { type: GenAiType.STRING },
          value: { type: GenAiType.STRING }, 
          title: fieldSchema,
          description: fieldSchema,
          question: fieldSchema,
          answer: fieldSchema,
          author: fieldSchema,
          role: fieldSchema,
          content: fieldSchema,
          ai: { type: GenAiType.ARRAY, items: { type: GenAiType.STRING } }
        }
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: basePrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: GenAiType.OBJECT,
            properties: {
              meta: {
                  type: GenAiType.OBJECT,
                  properties: {
                      title: { type: GenAiType.STRING },
                      status: { type: GenAiType.STRING }
                  },
                  required: ["title"]
              },
              theme: {
                  type: GenAiType.OBJECT,
                  properties: {
                      brand_name: { type: GenAiType.STRING },
                      tone: { type: GenAiType.STRING },
                      primary_color: { type: GenAiType.STRING },
                      secondary_color: { type: GenAiType.STRING },
                      bg_color: { type: GenAiType.STRING },
                      font_family: { type: GenAiType.STRING }
                  },
                  required: ["brand_name", "primary_color"]
              },
              sections: {
                type: GenAiType.ARRAY,
                items: {
                  type: GenAiType.OBJECT,
                  properties: {
                    id: { type: GenAiType.STRING },
                    type: { type: GenAiType.STRING },
                    enabled: { type: GenAiType.BOOLEAN },
                    content: { 
                        type: GenAiType.OBJECT,
                        properties: {
                            headline: fieldSchema,
                            subheadline: fieldSchema,
                            description: fieldSchema,
                            bullets: { type: GenAiType.ARRAY, items: fieldSchema },
                            cta: {
                                type: GenAiType.OBJECT,
                                properties: {
                                    label: fieldSchema,
                                    href: { type: GenAiType.STRING },
                                    microcopy: fieldSchema
                                }
                            },
                            consequences: { type: GenAiType.ARRAY, items: fieldSchema },
                            items: { type: GenAiType.ARRAY, items: listItemSchema },
                            original_price: fieldSchema,
                            price: fieldSchema,
                            features: { type: GenAiType.ARRAY, items: fieldSchema },
                            cta_label: fieldSchema,
                            cta_url: fieldSchema,
                            value: { type: GenAiType.STRING }
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
      
      if (aiPrompt.ctaLink && generated.sections) {
          generated.sections.forEach((s: any) => {
              if (s.content && s.content.cta) {
                  s.content.cta.href = aiPrompt.ctaLink;
              }
              if (s.content && s.content.cta_url) {
                  s.content.cta_url.value = aiPrompt.ctaLink;
              }
          });
      }

      const newPage: Partial<LandingPage> = {
        title: generated.meta?.title || aiPrompt.productName,
        productName: aiPrompt.productName,
        slug: slugify(generated.meta?.title || aiPrompt.productName),
        content: {
            ...generated,
            ctaLink: aiPrompt.ctaLink
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        theme: 'modern'
      };
      setCurrentDraft(newPage);
    } catch (e: any) {
      console.error("Gemini API Error in generation:", e);
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
      console.error("Gemini API Error in refinement:", e);
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
    
    // Se estiver no modo HTML, precisamos sincronizar o conteúdo do canvas visual para o htmlCode antes de salvar
    if (editingPage.content?.htmlCode && htmlEditorRef.current) {
        const updatedHtml = htmlEditorRef.current.innerHTML;
        editingPage.content.htmlCode = updatedHtml;
    }

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
    
    elementStartRef.current = { 
        x: styles?.x !== undefined ? styles.x : 50, 
        y: styles?.y !== undefined ? styles.y : 50 
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedSectionId || !selectedElementKey || !dragStartRef.current || !elementStartRef.current) return;
    
    const targetSectionEl = document.getElementById(`lp-section-${selectedSectionId}`);
    if (!targetSectionEl) return;

    const rect = targetSectionEl.getBoundingClientRect();
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const percentX = (deltaX / rect.width) * 100;
    const percentY = (deltaY / rect.height) * 100;

    const newX = Math.max(0, Math.min(100, elementStartRef.current.x + percentX));
    const newY = Math.max(0, Math.min(100, elementStartRef.current.y + percentY));

    updateSectionStyles(selectedSectionId, selectedElementKey, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
    elementStartRef.current = null;
  };

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

  const handleAddFieldToSection = (sectionId: string, type: 'text' | 'image' | 'video' | 'form') => {
      if (!editingPage || !editingPage.content) return;
      const newSections = [...editingPage.content.sections];
      const section = newSections.find(s => s.id === sectionId);
      if (!section) return;

      const newKey = `${type}_${Date.now()}`;
      if (type === 'text') {
          section.content[newKey] = { value: 'Novo Texto', ai: ['persuasive'] };
      } else if (type === 'image') {
          section.content[newKey] = { value: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1000&auto=format&fit=crop', type: 'image' };
      } else if (type === 'video') {
          section.content[newKey] = { value: '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0"></iframe>', type: 'video' };
      } else if (type === 'form') {
          section.content[newKey] = { value: availableForms[0]?.id || '', type: 'form' };
      }

      setEditingPage({ ...editingPage, content: { ...editingPage.content, sections: newSections } });
  };

  const renderInteractableField = (sectionId: string, fieldKey: string, field: any, styles: ElementStyles = {}, isMultiline = false) => {
      if (!field) return null;
      
      const isSelected = selectedSectionId === sectionId && selectedElementKey === fieldKey;
      const isRefining = isRefiningField === `${sectionId}-${fieldKey}`;
      const isMedia = field.type === 'image' || field.type === 'video' || field.type === 'form';
      const value = typeof field === 'object' ? field.value : field;

      return (
          <div 
              className={clsx(
                  "relative group/field transition-all rounded-sm",
                  isSelected ? "ring-2 ring-blue-500 ring-offset-2 z-30" : "hover:ring-1 hover:ring-blue-300 ring-offset-1"
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
              {/* Canva-style resize handles */}
              {isSelected && (
                  <>
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full z-40"></div>
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full z-40"></div>
                    <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full z-40"></div>
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full z-40"></div>
                  </>
              )}

              {/* Floating Toolbar (Canva Style) */}
              {isSelected && (
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900 text-white p-1 rounded-xl shadow-2xl z-[60] animate-in fade-in zoom-in-95 duration-200">
                    <button onMouseDown={(e) => handleElementMouseDown(e, sectionId, fieldKey)} className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-move"><Move size={16}/></button>
                    <div className="w-px h-4 bg-white/20 mx-1"></div>
                    
                    <button onClick={(e) => { e.stopPropagation(); updateSectionStyles(sectionId, fieldKey, { width: Math.max(10, (styles.width || 100) - 5) }); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><Minimize size={16}/></button>
                    <button onClick={(e) => { e.stopPropagation(); updateSectionStyles(sectionId, fieldKey, { width: Math.min(100, (styles.width || 100) + 5) }); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><Maximize size={16}/></button>
                    <div className="w-px h-4 bg-white/20 mx-1"></div>

                    {!isMedia && field.ai?.map((action: string) => (
                        <button 
                            key={action}
                            disabled={isRefining}
                            onClick={() => handleAiAction(sectionId, fieldKey, action, value)}
                            className="px-3 py-1 text-[9px] font-black uppercase tracking-tighter hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {isRefining ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
                            {action.replace('_', ' ')}
                        </button>
                    ))}
                    <div className="w-px h-4 bg-white/20 mx-1"></div>
                    <button onClick={(e) => {
                        e.stopPropagation();
                        const newSections = [...editingPage!.content!.sections];
                        const s = newSections.find(s => s.id === sectionId);
                        delete s.content[fieldKey];
                        setEditingPage({ ...editingPage!, content: { ...editingPage!.content!, sections: newSections } });
                    }} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"><Trash2 size={16}/></button>
                  </div>
              )}

              {field.type === 'image' ? (
                  <div className="space-y-2 p-2">
                      <img src={value} className="max-w-full h-auto rounded-lg shadow-sm" alt="Preview" />
                      {isSelected && (
                          <div className="bg-white/90 backdrop-blur-md p-2 rounded-xl border border-slate-200 shadow-xl mt-2 animate-in slide-in-from-top-2">
                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">URL da Imagem</label>
                            <input className="w-full text-[10px] bg-slate-50 border-none p-2 rounded-lg focus:ring-2 focus:ring-blue-500" value={value} onChange={e => {
                                const content = { ...editingPage?.content };
                                const s = content.sections.find((s: any) => s.id === sectionId);
                                s.content[fieldKey].value = e.target.value;
                                setEditingPage({ ...editingPage!, content: content as LandingPageContent });
                            }} placeholder="https://..." />
                          </div>
                      )}
                  </div>
              ) : field.type === 'video' ? (
                  <div className="space-y-2 p-2">
                      <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden" dangerouslySetInnerHTML={{ __html: value }}></div>
                      {isSelected && (
                          <div className="bg-white/90 backdrop-blur-md p-2 rounded-xl border border-slate-200 shadow-xl mt-2">
                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Código Embed</label>
                            <textarea className="w-full text-[10px] bg-slate-50 border-none p-2 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono" rows={3} value={value} onChange={e => {
                                const content = { ...editingPage?.content };
                                const s = content.sections.find((s: any) => s.id === sectionId);
                                s.content[fieldKey].value = e.target.value;
                                setEditingPage({ ...editingPage!, content: content as LandingPageContent });
                            }} placeholder="Iframe..." />
                          </div>
                      )}
                  </div>
              ) : field.type === 'form' ? (
                  <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] text-center">
                      <FormInput className="mx-auto mb-2 text-slate-300" size={32} />
                      <p className="text-xs font-bold text-slate-500 mb-4">Formulário Integrado</p>
                      <select 
                        className="w-full text-[11px] p-3 border-none bg-white rounded-2xl font-bold shadow-sm focus:ring-2 focus:ring-blue-500"
                        value={value}
                        onChange={e => {
                            const content = { ...editingPage?.content };
                            const s = content.sections.find((s: any) => s.id === sectionId);
                            s.content[fieldKey].value = e.target.value;
                            setEditingPage({ ...editingPage!, content: content as LandingPageContent });
                        }}
                      >
                          <option value="">Selecione um formulário...</option>
                          {availableForms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                      </select>
                  </div>
              ) : isMultiline ? (
                  <textarea 
                    className="w-full bg-transparent border-none focus:ring-0 p-1 resize-none outline-none overflow-hidden placeholder-slate-300" 
                    value={value}
                    rows={value.split('\n').length || 1}
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
                            if (typeof section.content[fieldKey] === 'object') {
                                section.content[fieldKey].value = e.target.value;
                            } else {
                                section.content[fieldKey] = e.target.value;
                            }
                        }
                        setEditingPage({ ...editingPage!, content: content as LandingPageContent });
                    }}
                  />
              ) : (
                  <input 
                    className="w-full bg-transparent border-none focus:ring-0 p-1 outline-none font-inherit placeholder-slate-300" 
                    value={value}
                    style={{ fontWeight: 'inherit', fontSize: 'inherit', color: 'inherit', textAlign: 'inherit' }}
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
                            if (typeof section.content[fieldKey] === 'object') {
                                section.content[fieldKey].value = e.target.value;
                            } else {
                                section.content[fieldKey] = e.target.value;
                            }
                        }
                        setEditingPage({ ...editingPage!, content: content as LandingPageContent });
                    }}
                  />
              )}
          </div>
      );
  };

  if (view === 'visual_editor' && editingPage) {
    const content = editingPage.content as LandingPageContent;
    const isHtmlMode = !!content.htmlCode;

    return (
      <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col animate-in fade-in h-screen overflow-hidden" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-50 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
            <div className="h-6 w-px bg-slate-200"></div>
            <h2 className="font-bold text-slate-800">{editingPage.title} {isHtmlMode && "(Modo HTML Visual)"}</h2>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full border border-indigo-100">
                <BrainCircuit size={16} className="text-indigo-600 animate-pulse" />
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Canvas de Alta Performance</span>
             </div>
            <button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95">
              {isLoading ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} Salvar Alterações
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Left - Tools & Structure */}
          <aside className="w-80 bg-white border-r border-slate-200 p-6 space-y-8 overflow-y-auto custom-scrollbar shadow-lg z-40">
             {isHtmlMode ? (
                 <div className="space-y-6">
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Configuração HTML</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Link Global do CTA</label>
                                <div className="relative group/link mt-1">
                                    <Anchor className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={12}/>
                                    <input 
                                        className="w-full pl-9 pr-3 py-2 border rounded-xl text-[10px] font-mono outline-none focus:border-orange-500" 
                                        value={content.ctaLink || ''} 
                                        onChange={e => {
                                            const newContent = {...content};
                                            newContent.ctaLink = e.target.value;
                                            setEditingPage({...editingPage, content: newContent});
                                        }}
                                        placeholder="https://..."
                                    />
                                </div>
                                <p className="text-[8px] text-slate-400 mt-1 italic">Use a tag <strong>{"{{cta_link}}"}</strong> para injetar este link.</p>
                            </div>

                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Formulário Vinculado</label>
                                <select 
                                    className="w-full text-[10px] p-2 border rounded-xl bg-white font-bold mt-1"
                                    value={content.selectedFormId || ''}
                                    onChange={e => {
                                        const newContent = {...content};
                                        newContent.selectedFormId = e.target.value;
                                        setEditingPage({...editingPage, content: newContent});
                                    }}
                                >
                                    <option value="">Nenhum formulário</option>
                                    {availableForms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                                </select>
                                <p className="text-[8px] text-slate-400 mt-1 italic">Use a tag <strong>{"{{form}}"}</strong> para injetar o formulário.</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Sparkle size={14} className="text-orange-500" /> Refinar com IA
                        </h3>
                        <div className="space-y-3">
                            <textarea 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium resize-none h-24 focus:bg-white focus:border-orange-500 outline-none transition-all"
                                placeholder="Descreva aqui o que deseja mudar no código (ex: Mude a cor do botão para verde, adicione uma seção de depoimentos...)"
                                value={htmlRefineInstruction}
                                onChange={e => setHtmlRefineInstruction(e.target.value)}
                            />
                            <button 
                                onClick={handleRewriteHtml}
                                disabled={isRewritingHtml || !htmlRefineInstruction.trim()}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-md"
                            >
                                {isRewritingHtml ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16}/>}
                                Reescrever Código com IA
                            </button>
                        </div>
                    </div>
                 </div>
             ) : (
                 <>
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Design Global</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Nome da Marca</label>
                                <input className="w-full text-xs p-3 bg-slate-50 border-none rounded-xl mt-1 focus:ring-2 focus:ring-blue-500" value={content.theme.brand_name} onChange={e => {
                                    const newContent = {...content};
                                    newContent.theme.brand_name = e.target.value;
                                    setEditingPage({...editingPage, content: newContent});
                                }} />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Cor Identidade</label>
                                <div className="flex items-center gap-3 mt-1">
                                    <input type="color" className="w-12 h-12 rounded-xl border-none p-1 bg-white shadow-sm cursor-pointer" value={content.theme.primary_color} onChange={e => {
                                        const newContent = {...content};
                                        newContent.theme.primary_color = e.target.value;
                                        setEditingPage({...editingPage, content: newContent});
                                    }} />
                                    <span className="text-xs font-mono font-bold text-slate-400 uppercase">{content.theme.primary_color}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Camadas da Página</h3>
                        <div className="space-y-2">
                            {content.sections.map((s, idx) => (
                                <div key={s.id} onClick={() => setSelectedSectionId(s.id)} className={clsx("flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer", selectedSectionId === s.id ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50")}>
                                    <div className="flex items-center gap-3">
                                        <GripVertical size={14} className="text-slate-300"/>
                                        <span className="text-xs font-bold uppercase tracking-tighter truncate max-w-[120px]">{s.type}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                        <button onClick={(e) => { e.stopPropagation(); handleMoveSection(idx, 'up'); }} disabled={idx === 0} className="p-1 hover:text-blue-600 disabled:opacity-0"><ArrowUp size={12}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleMoveSection(idx, 'down'); }} disabled={idx === content.sections.length -1} className="p-1 hover:text-blue-600 disabled:opacity-0"><ArrowDown size={12}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={() => setView('preview')} className="w-full py-4 border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-500 hover:text-blue-500 rounded-3xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                        <Eye size={18}/> Abrir Modo Preview
                    </button>
                </>
             )}
          </aside>

          {/* Canvas Main - "Canva Workspace" */}
          <main className="flex-1 bg-slate-100 p-12 overflow-y-auto custom-scrollbar flex flex-col items-center">
            <div className="bg-white w-full max-w-[1200px] shadow-[0_10px_100px_rgba(0,0,0,0.1)] rounded-sm min-h-screen relative font-sans pb-[500px] animate-in fade-in zoom-in-95 duration-500">
                
                {isHtmlMode ? (
                    <div className="p-0 relative min-h-screen flex flex-col">
                        <div className="bg-amber-50 p-3 flex items-center justify-center gap-2 border-b border-amber-100 text-[10px] font-black text-amber-700 uppercase tracking-widest">
                           <MousePointerClick size={14} /> Modo Edição Visual Ativo: Clique nos textos para alterar
                        </div>
                        <div 
                            ref={htmlEditorRef}
                            contentEditable
                            suppressContentEditableWarning
                            className="w-full min-h-screen p-0 outline-none hover:[&_*]:ring-1 hover:[&_*]:ring-blue-400/50 transition-all cursor-text selection:bg-blue-100"
                            dangerouslySetInnerHTML={{ __html: content.htmlCode || '' }}
                            onBlur={(e) => {
                                const newContent = {...content};
                                newContent.htmlCode = e.currentTarget.innerHTML;
                                setEditingPage({...editingPage, content: newContent});
                            }}
                        />
                        <div className="p-10 bg-slate-50 border-t border-slate-200">
                             <div className="max-w-xl mx-auto bg-blue-50 border border-blue-100 p-5 rounded-[2rem] flex gap-4 text-sm text-blue-800 shadow-sm">
                                <Info size={24} className="shrink-0 text-blue-600" />
                                <p>Você está editando o design gerado pela IA. Use o <strong>painel lateral</strong> para mudanças de layout por comando de voz/IA ou <strong>digite diretamente</strong> nos blocos para alterar o conteúdo.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    content.sections.map((section, sIdx) => (
                        <div key={section.id} id={`lp-section-${section.id}`} className={clsx("relative group/section transition-all", selectedSectionId === section.id ? "ring-2 ring-blue-500 ring-inset" : "hover:bg-slate-50/30")}>
                            
                            {/* Section Controls (Always Visible when Hover/Select) */}
                            <div className="absolute right-[-60px] top-4 z-40 opacity-0 group-hover/section:opacity-100 transition-opacity flex flex-col gap-2">
                                <button onClick={() => handleDeleteSection(sIdx)} className="bg-white text-red-500 p-2.5 rounded-xl shadow-xl border border-red-100 hover:bg-red-50 transition-all"><Trash2 size={18}/></button>
                                <button onClick={() => handleMoveSection(sIdx, 'up')} disabled={sIdx === 0} className="bg-white text-slate-600 p-2.5 rounded-xl shadow-xl border border-slate-100 hover:bg-slate-50 disabled:opacity-30"><ArrowUp size={18}/></button>
                                <button onClick={() => handleMoveSection(sIdx, 'down')} disabled={sIdx === content.sections.length - 1} className="bg-white text-slate-600 p-2.5 rounded-xl shadow-xl border border-slate-100 hover:bg-slate-50 disabled:opacity-30"><ArrowDown size={18}/></button>
                            </div>

                            <div className="absolute left-[-60px] top-4 z-40 opacity-0 group-hover/section:opacity-100 transition-opacity flex flex-col gap-2">
                                <button onClick={() => handleAddFieldToSection(section.id, 'text')} className="bg-white text-blue-600 p-2.5 rounded-xl shadow-xl border border-blue-100 hover:bg-blue-50" title="Add Texto"><TypeIcon size={18}/></button>
                                <button onClick={() => handleAddFieldToSection(section.id, 'image')} className="bg-white text-blue-600 p-2.5 rounded-xl shadow-xl border border-blue-100 hover:bg-blue-50" title="Add Imagem"><LucideImage size={18}/></button>
                                <button onClick={() => handleAddFieldToSection(section.id, 'video')} className="bg-white text-blue-600 p-2.5 rounded-xl shadow-xl border border-blue-100 hover:bg-blue-50" title="Add Vídeo"><Video size={18}/></button>
                                <button onClick={() => handleAddFieldToSection(section.id, 'form')} className="bg-white text-blue-600 p-2.5 rounded-xl shadow-xl border border-blue-100 hover:bg-blue-50" title="Add Formulário"><FormInput size={18}/></button>
                            </div>

                            {/* Section Inserter */}
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-40 opacity-0 group-hover/section:opacity-100 transition-opacity">
                                <div className="relative group/add">
                                    <button className="bg-blue-600 text-white p-2.5 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95 flex items-center justify-center"><Plus size={20}/></button>
                                    <div className="absolute top-12 left-1/2 -translate-x-1/2 w-56 bg-slate-900 text-white rounded-3xl shadow-2xl py-3 hidden group-hover/add:grid grid-cols-1 gap-1 animate-in zoom-in-95 p-2">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-2 border-b border-white/10 pb-2">Inserir Seção</p>
                                        {SECTION_TYPES.map(st => (
                                            <button key={st.type} onClick={() => handleAddSection(sIdx - 1, st.type)} className="w-full text-left px-4 py-2 text-[11px] font-bold hover:bg-white/10 rounded-xl transition-colors flex items-center justify-between group/item">
                                                {st.label}
                                                <ChevronRight size={14} className="opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className={clsx("relative p-12 transition-all", !section.enabled && "opacity-30 grayscale")}>
                                <div className="space-y-10">
                                    {Object.keys(section.content).map(key => {
                                        const field = section.content[key];
                                        
                                        if (key === 'cta') {
                                            return (
                                                <div key={key} className="flex flex-col items-center gap-6 p-10 bg-slate-50/50 rounded-[3rem] border border-slate-100 hover:bg-white transition-all group/cta">
                                                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Botão de Chamada para Ação (CTA)</div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block">Texto do Botão</label>
                                                            {renderInteractableField(section.id, 'cta.label', field.label)}
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block">Link de Destino</label>
                                                            <div className="relative group/link">
                                                                <Anchor className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                                                                <input 
                                                                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-xs font-mono outline-none focus:border-blue-400 shadow-sm" 
                                                                    value={field.href || '#'} 
                                                                    onChange={e => {
                                                                        const content = { ...editingPage?.content };
                                                                        const s = content.sections.find((s: any) => s.id === section.id);
                                                                        s.content.cta.href = e.target.value;
                                                                        setEditingPage({ ...editingPage!, content: content as LandingPageContent });
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (Array.isArray(field)) {
                                            return (
                                                <div key={key} className="space-y-6 pt-10 border-t border-slate-100">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-[10px] font-black text-blue-50 uppercase tracking-widest flex items-center gap-3">
                                                            <LayoutGrid size={16}/> Lista: {key.replace('_', ' ')}
                                                        </h4>
                                                        <button 
                                                            onClick={() => handleAddItemToList(section.id, key)}
                                                            className="flex items-center gap-2 px-5 py-2 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                        >
                                                            <Plus size={14}/> Novo Item da Lista
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        {field.map((item, itemIdx) => (
                                                            <div key={item.id || itemIdx} className="group/item relative p-8 bg-white rounded-[3rem] border border-slate-100 hover:border-blue-500 hover:shadow-2xl transition-all space-y-4">
                                                                <button 
                                                                    onClick={() => handleRemoveItemFromList(section.id, key, itemIdx)}
                                                                    className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                                >
                                                                    <Trash2 size={16}/>
                                                                </button>
                                                                <div className="text-[9px] font-black text-blue-300 uppercase tracking-[0.2em] mb-4">Elemento {itemIdx + 1}</div>
                                                                {Object.keys(item).map(subKey => {
                                                                    if (item[subKey] && (typeof item[subKey] === 'object' || typeof item[subKey] === 'string') && subKey !== 'id' && subKey !== 'ai') {
                                                                        return (
                                                                            <div key={subKey}>
                                                                                <label className="text-[9px] font-black text-slate-300 uppercase ml-1 mb-1 block">{subKey}</label>
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

                                        if (field && (typeof field === 'object' || typeof field === 'string')) {
                                            return <div key={key} className="relative">{renderInteractableField(section.id, key, field, section.styles?.[key])}</div>
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>

                        </div>
                    ))
                )}

                <div className="p-32 text-center text-slate-300 flex flex-col items-center gap-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center"><MonitorPlay size={40} className="opacity-10"/></div>
                    <p className="text-sm font-black uppercase tracking-[0.4em] opacity-30">Fim do Canvas</p>
                    <p className="text-xs font-medium max-w-sm leading-relaxed opacity-40">Arraste novos elements ou use a IA para expandir seu conteúdo a qualquer momento.</p>
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
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><MonitorPlay className="text-orange-600" /> Páginas de Venda</h2>
            <p className="text-slate-500 text-sm">IA Copywriter & Design Premium.</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setAiPrompt({ ...aiPrompt, productName: '', productDescription: '', referenceUrl: '', referenceTemplate: '', customPrompt: '', selectedFormId: '', ctaLink: '', briefFileBase64: null, briefFileName: null });
            setEditingPage(null);
            setCurrentDraft(null);
            setCreationStep('choice');
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
               {creationStep === 'choice' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-10">
                   <button onClick={() => { setCreationMode('standard'); setCreationStep('form'); }} className="group bg-white p-10 rounded-[3rem] border-2 border-slate-100 hover:border-indigo-600 hover:shadow-2xl transition-all flex flex-col items-center text-center gap-6"><div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform"><Sparkles size={40}/></div><div><h4 className="text-xl font-black text-slate-800 mb-2">Formato Padrão</h4><p className="text-sm text-slate-500 leading-relaxed">Cria uma página persuasiva do zero usando copywriting de alta conversão baseado na sua descrição.</p></div><div className="mt-4 px-6 py-2 bg-slate-100 rounded-full text-[10px] font-black uppercase text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">Selecionar</div></button>
                   <button onClick={() => { setCreationMode('prompt'); setCreationStep('form'); }} className="group bg-white p-10 rounded-[3rem] border-2 border-slate-100 hover:border-indigo-600 hover:shadow-2xl transition-all flex flex-col items-center text-center gap-6"><div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform"><FileEdit size={40}/></div><div><h4 className="text-xl font-black text-slate-800 mb-2">Gerar Código HTML (Avançado)</h4><p className="text-sm text-slate-500 leading-relaxed">Forneça site de referência e briefing do produto e a IA criará o código HTML completo da página.</p></div><div className="mt-4 px-6 py-2 bg-slate-100 rounded-full text-[10px] font-black uppercase text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">Selecionar</div></button>
                 </div>
               ) : !currentDraft ? (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                     <div className="flex items-center gap-4 mb-4"><button onClick={() => setCreationStep('choice')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={18}/></button><h4 className="text-sm font-black text-indigo-600 uppercase tracking-widest">{creationMode === 'standard' ? 'Criação Padrão' : 'Geração de Código HTML Personalizado'}</h4></div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {creationMode === 'prompt' ? (
                          <div className="md:col-span-2 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1 flex items-center gap-2"><Globe size={14} className="text-orange-500"/> Link do Site de Referência Visual</label><input type="text" className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-orange-500 rounded-[1.5rem] text-sm font-bold outline-none transition-all" value={aiPrompt.referenceUrl} onChange={e => setAiPrompt({...aiPrompt, referenceUrl: e.target.value})} placeholder="https://..." /></div>
                                <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1 flex items-center gap-2"><FileUp size={14} className="text-orange-500"/> PDF do Briefing do Produto</label><div className="flex gap-2"><button type="button" onClick={() => fileInputRef.current?.click()} className={clsx("flex-1 px-6 py-4 border-2 border-dashed rounded-[1.5rem] text-xs font-bold transition-all flex items-center justify-center gap-3", aiPrompt.briefFileBase64 ? "bg-orange-50 border-orange-500 text-orange-700" : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-white hover:border-orange-300")}>{aiPrompt.briefFileBase64 ? <><Check size={18}/> {aiPrompt.briefFileName}</> : <><FileText size={18}/> Selecionar PDF</>}</button>{aiPrompt.briefFileBase64 && (<button onClick={() => setAiPrompt({...aiPrompt, briefFileBase64: null, briefFileName: null})} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100"><X size={20}/></button>)}</div><input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileChange} /></div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1 flex items-center gap-2"><Link2 size={14} className="text-orange-500"/> Link do Botão CTA (Destino de Compra)</label><input type="text" className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-orange-500 rounded-[1.5rem] text-sm font-bold outline-none transition-all" value={aiPrompt.ctaLink} onChange={e => setAiPrompt({...aiPrompt, ctaLink: e.target.value})} placeholder="https://..." /></div>
                                <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1 flex items-center gap-2"><FormInput size={14} className="text-orange-500"/> Formulário de Captura (Injetado via {"{{form}}"})</label><select className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-orange-500 rounded-[1.5rem] text-sm font-bold outline-none transition-all appearance-none cursor-pointer" value={aiPrompt.selectedFormId} onChange={e => setAiPrompt({...aiPrompt, selectedFormId: e.target.value})}><option value="">Não incluir formulário</option>{availableForms.map(f => (<option key={f.id} value={f.id}>{f.title}</option>))}</select></div>
                              </div>
                              <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1 flex items-center gap-2"><Code size={14} className="text-orange-500"/> Instruções Adicionais para o Layout</label><textarea className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-orange-500 rounded-[1.5rem] text-xs font-medium h-32 resize-none outline-none transition-all leading-relaxed" value={aiPrompt.customPrompt} onChange={e => setAiPrompt({...aiPrompt, customPrompt: e.target.value})} placeholder="Ex: Use tons de azul escuro e branco, destaque a garantia de 30 dias, coloque o vídeo no topo..." /><p className="text-[10px] text-slate-400 mt-2 ml-1 italic">* A IA usará o PDF e o link de referência para estruturar o código final.</p></div>
                          </div>
                        ) : (
                          <>
                            <div className="md:col-span-2"><label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Modelo de Referência Interno</label><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{REFERENCE_TEMPLATES.map((tmpl) => (<button key={tmpl.id} onClick={() => setAiPrompt({...aiPrompt, referenceTemplate: tmpl.url})} className={clsx("flex flex-col rounded-2xl border-2 transition-all group overflow-hidden bg-white text-left", aiPrompt.referenceTemplate === tmpl.url ? "border-indigo-600 ring-4 ring-indigo-50 shadow-lg scale-105" : "border-slate-100 hover:border-indigo-200")}><div className="h-20 w-full overflow-hidden relative border-b border-slate-100"><img src={tmpl.imageUrl} className="w-full h-full object-cover" alt={tmpl.name} /></div><div className="p-2 text-center"><span className="text-[10px] font-black uppercase text-slate-800">{tmpl.name}</span></div></button>))}</div></div>
                            <div><label className="block text-[11px] font-black text-slate-400 uppercase mb-2.5 ml-1">Nome do Produto</label><input type="text" className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-[1.5rem] text-base font-bold outline-none transition-all" value={aiPrompt.productName} onChange={e => setAiPrompt({...aiPrompt, productName: e.target.value})} placeholder="Ex: Formação Pilates Completa" /></div>
                            <div><label className="block text-[11px] font-black text-slate-400 uppercase mb-2.5 ml-1">Público-Alvo</label><input type="text" className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-[1.5rem] text-sm font-bold" value={aiPrompt.targetAudience} onChange={e => setAiPrompt({...aiPrompt, targetAudience: e.target.value})} placeholder="Ex: Fisioterapeutas" /></div>
                            <div className="md:col-span-2"><label className="block text-[11px] font-black text-slate-400 uppercase mb-2.5 ml-1">Link do Botão CTA (Destino de Compra)</label><input type="text" className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-[1.5rem] text-sm font-bold outline-none transition-all" value={aiPrompt.ctaLink} onChange={e => setAiPrompt({...aiPrompt, ctaLink: e.target.value})} placeholder="https://..." /></div>
                            <div className="md:col-span-2"><label className="block text-[11px] font-black text-slate-400 uppercase mb-2.5 ml-1">Descrição do Produto / Benefício Principal</label><textarea className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white rounded-[1.5rem] text-sm h-24 resize-none outline-none transition-all" value={aiPrompt.productDescription} onChange={e => setAiPrompt({...aiPrompt, productDescription: e.target.value})} placeholder="O que seu product faz e qual a maior promessa?" /></div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:col-span-2">
                                <div><label className="block text-[11px] font-black text-slate-400 uppercase mb-2.5 ml-1">Preço</label><input type="text" className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-2xl text-xs font-bold" value={aiPrompt.price} onChange={e => setAiPrompt({...aiPrompt, price: e.target.value})} placeholder="R$ 1.997,00" /></div>
                                <div><label className="block text-[11px] font-black text-slate-400 uppercase mb-2.5 ml-1">Garantia</label><input type="text" className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-2xl text-xs font-bold" value={aiPrompt.guarantee} onChange={e => setAiPrompt({...aiPrompt, guarantee: e.target.value})} placeholder="7 dias" /></div>
                                <div className="md:col-span-2"><label className="block text-[11px] font-black text-slate-400 uppercase mb-2.5 ml-1">Tom de Voz</label><select className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-2xl text-xs font-bold" value={aiPrompt.tone} onChange={e => setAiPrompt({...aiPrompt, tone: e.target.value})}><option value="Profissional e Persuasivo">Profissional e Persuasivo</option><option value="Elegante e Premium">Elegante e Premium</option></select></div>
                            </div>
                          </>
                        )}
                     </div>
                     <button onClick={handleCreateWithAi} disabled={isGenerating || (creationMode === 'standard' && !aiPrompt.productName) || (creationMode === 'prompt' && !aiPrompt.customPrompt && !aiPrompt.briefFileBase64)} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">{isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} />}{isGenerating ? 'Criando Código e Estrutura...' : 'Gerar Página com IA'}</button>
                  </div>
               ) : (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-300"><div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden"><div className="absolute top-0 right-0 p-8 opacity-10"><Zap size={100}/></div><h4 className="text-xl font-black mb-2 uppercase tracking-tighter">Estrutura Pronta!</h4><p className="text-indigo-100 font-medium leading-relaxed">Sua página foi gerada conforme as instruções fornecidas. Clique abaixo para salvar e revisar.</p></div><div className="flex gap-4 pt-6 border-t"><button onClick={() => setCurrentDraft(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Voltar</button><button onClick={confirmDraft} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95">Revisar e Publicar</button></div></div>
               )}
            </div>
          </div>
        </div>
      )}

      {showMoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">Mover Página</div>
                  <div className="p-6">
                      <p className="text-sm text-slate-700 mb-4 font-bold">Mover para:</p>
                      <div className="space-y-1">
                          <button 
                              onClick={() => {
                                if (editingPage) {
                                  setEditingPage({ ...editingPage, id: showMoveModal.id });
                                }
                                setShowMoveModal(null);
                              }}
                              className={clsx("w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors", !showMoveModal.id ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-50")}
                          >
                              <LayoutGrid size={16} /> Sem Pasta (Raiz)
                          </button>
                          {folders.map(f => (
                              <button 
                                  key={f.id}
                                  onClick={() => setShowMoveModal(null)}
                                  className={clsx("w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors", showMoveModal.id === f.id ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-50")}
                              >
                                  <LayoutGrid size={16} /> {f.name}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const XCircleIcon = () => (
    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
        <X size={24} />
    </div>
);

const CheckCircleIcon = () => (
    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
        <Check size={24} />
    </div>
);
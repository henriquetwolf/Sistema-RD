import React, { useState, useEffect } from 'react';
import { FormModel, FormQuestion, QuestionType, FormStyle } from '../types';
import { FormViewer } from './FormViewer';
import { 
  FileText, Plus, MoreVertical, Trash2, Eye, Edit2, 
  ArrowLeft, Save, GripVertical, Copy, Settings,
  Type, AlignLeft, Mail, Phone, Calendar, Hash, CheckSquare, Target, Share2, CheckCircle,
  LayoutTemplate, Monitor, Smartphone, Palette, Columns, X, Image as ImageIcon, Grid, Ban
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

interface FormsManagerProps {
  onBack: () => void;
}

const INITIAL_FORM: FormModel = {
  id: '',
  title: 'Formulário sem título',
  description: '',
  isLeadCapture: false,
  questions: [],
  createdAt: '',
  submissionsCount: 0,
  style: {
      backgroundType: 'color',
      backgroundColor: '#f1f5f9',
      cardTransparent: false
  }
};

// Templates baseados na imagem do RD Station
const TEMPLATES = [
    {
        id: 'classic',
        title: 'Clássico',
        description: 'Formulário padrão para contato.',
        previewColor: 'bg-slate-200',
        questions: [
            { id: 't1', title: 'Nome', type: 'text', required: true, placeholder: 'Seu nome' },
            { id: 't2', title: 'Email', type: 'email', required: true, placeholder: 'Seu email' },
            { id: 't3', title: 'Empresa', type: 'text', required: false, placeholder: 'Sua empresa' },
            { id: 't4', title: 'Cargo', type: 'text', required: false, placeholder: 'Seu cargo' }
        ]
    },
    {
        id: 'ebook',
        title: 'Baixar eBook gratuito',
        description: 'Focado em conversão de materiais ricos.',
        previewColor: 'bg-pink-100',
        questions: [
            { id: 't1', title: 'Nome', type: 'text', required: true, placeholder: 'Digite seu nome' },
            { id: 't2', title: 'Email', type: 'email', required: true, placeholder: 'Digite seu melhor email' }
        ]
    },
    {
        id: 'newsletter',
        title: 'Assinar Newsletter',
        description: 'Captura rápida de leads para nutrição.',
        previewColor: 'bg-blue-100',
        questions: [
            { id: 't1', title: 'Email', type: 'email', required: true, placeholder: 'seu@email.com' }
        ]
    }
];

const TEXTURES = [
    { id: 'dots', name: 'Pontilhado' },
    { id: 'grid', name: 'Grade' },
    { id: 'diagonal', name: 'Diagonal' },
];

export const FormsManager: React.FC<FormsManagerProps> = ({ onBack }) => {
  // Navigation State
  const [view, setView] = useState<'list' | 'templates' | 'editor' | 'preview'>('list');
  const [editorStep, setEditorStep] = useState<'editor' | 'design' | 'settings'>('editor');
  
  // Data State
  const [forms, setForms] = useState<FormModel[]>([]);
  const [currentForm, setCurrentForm] = useState<FormModel>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
      setLoading(true);
      const data = await appBackend.getForms();
      setForms(data);
      setLoading(false);
  };

  // --- ACTIONS ---

  const startCreation = () => {
      setView('templates');
  };

  const selectTemplate = (template: any) => {
      const newForm: FormModel = {
          ...INITIAL_FORM,
          id: crypto.randomUUID(),
          title: template.id === 'classic' ? 'Fale Conosco' : template.title,
          description: template.description,
          questions: template.questions.map((q: any) => ({ ...q, id: crypto.randomUUID() })),
          createdAt: new Date().toISOString(),
          isLeadCapture: true // Default to CRM capture
      };
      setCurrentForm(newForm);
      setView('editor');
      setEditorStep('editor');
  };

  const handleEdit = (form: FormModel) => {
      setCurrentForm(form);
      setView('editor');
      setEditorStep('editor');
  };

  const handlePreview = (form: FormModel) => {
      setCurrentForm(form);
      setView('preview');
  };

  const handleDelete = async (id: string) => {
      if(window.confirm("Excluir este formulário e todas as respostas?")) {
          await appBackend.deleteForm(id);
          loadForms();
      }
  };

  const handleSaveForm = async () => {
      await appBackend.saveForm(currentForm);
      loadForms();
      setView('list');
  };

  const handleShare = (form: FormModel) => {
      const publicLink = `${window.location.origin}${window.location.pathname}?publicFormId=${form.id}`;
      navigator.clipboard.writeText(publicLink);
      setCopiedId(form.id);
      setTimeout(() => setCopiedId(null), 3000);
  };

  // --- STYLE ACTIONS ---
  const updateStyle = (key: keyof FormStyle, value: any) => {
      setCurrentForm(prev => ({
          ...prev,
          style: {
              ...prev.style!,
              [key]: value
          }
      }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              updateStyle('backgroundImage', reader.result as string);
              updateStyle('backgroundType', 'image');
          };
          reader.readAsDataURL(file);
      }
  };

  // Helper to generate styles for the editor preview
  const getPreviewContainerStyle = () => {
      const style = currentForm.style || { backgroundType: 'color', backgroundColor: '#f1f5f9' };

      if (style.backgroundType === 'image' && style.backgroundImage) {
          return { backgroundImage: `url(${style.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' };
      }
      
      if (style.backgroundType === 'color') {
          return { backgroundColor: style.backgroundColor };
      }

      if (style.backgroundType === 'texture' && style.backgroundTexture) {
          switch(style.backgroundTexture) {
              case 'dots': 
                  return { 
                      backgroundColor: '#f8fafc',
                      backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                      backgroundSize: '20px 20px' 
                  };
              case 'grid':
                  return {
                      backgroundColor: '#f8fafc',
                      backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                  };
              case 'diagonal':
                  return {
                      backgroundColor: '#f1f5f9',
                      backgroundImage: 'repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 10px, #f1f5f9 10px, #f1f5f9 20px)'
                  };
              default: return { backgroundColor: '#f1f5f9' };
          }
      }

      return { backgroundColor: '#ffffff' };
  };

  // --- BUILDER ACTIONS ---
  const addQuestion = (type: QuestionType) => {
      const titles: Record<string, string> = {
          text: 'Texto Curto',
          email: 'Email',
          phone: 'Telefone',
          paragraph: 'Mensagem',
          number: 'Número',
          date: 'Data'
      };

      const newQ: FormQuestion = {
          id: crypto.randomUUID(),
          title: titles[type] || 'Nova Pergunta',
          type: type,
          required: false,
          placeholder: 'Sua resposta...'
      };
      setCurrentForm(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
  };

  const updateQuestion = (id: string, field: keyof FormQuestion, value: any) => {
      setCurrentForm(prev => ({
          ...prev,
          questions: prev.questions.map(q => q.id === id ? { ...q, [field]: value } : q)
      }));
  };

  const removeQuestion = (id: string) => {
      setCurrentForm(prev => ({
          ...prev,
          questions: prev.questions.filter(q => q.id !== id)
      }));
  };

  // --- RENDERERS ---

  if (view === 'preview') {
      return <FormViewer form={currentForm} onBack={() => setView('list')} />;
  }

  // 1. TEMPLATE SELECTION VIEW (RD Style)
  if (view === 'templates') {
      return (
        <div className="max-w-6xl mx-auto pb-20 animate-in fade-in zoom-in-95 duration-200">
            {/* Header RD Style */}
            <div className="bg-white border-b border-slate-200 py-3 px-6 sticky top-0 z-20 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('list')} className="flex items-center gap-1 text-slate-500 hover:text-teal-600 font-medium text-sm border border-slate-300 rounded px-3 py-1.5 hover:bg-slate-50 transition-colors">
                        <ArrowLeft size={16} /> Voltar
                    </button>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div className="flex items-center text-sm">
                        <span className="font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">1. Modelos</span>
                        <span className="mx-2 text-slate-300">/</span>
                        <span className="text-slate-400">2. Editor</span>
                        <span className="mx-2 text-slate-300">/</span>
                        <span className="text-slate-400">3. Configurações</span>
                    </div>
                </div>
                <div className="text-sm text-slate-500">
                    VOLL Pilates <span className="font-bold">Marketing</span>
                </div>
            </div>

            <div className="p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Escolha um modelo</h2>
                <p className="text-slate-500 mb-8">Comece com um modelo pré-configurado para agilizar sua criação.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Blank */}
                    <div className="group bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-xl hover:border-teal-500 transition-all cursor-pointer flex flex-col h-full" onClick={() => selectTemplate({ id: 'blank', title: 'Em branco', description: '', questions: [] })}>
                        <div className="h-40 bg-slate-50 border-b border-slate-100 flex items-center justify-center group-hover:bg-teal-50 transition-colors">
                            <Plus size={48} className="text-slate-300 group-hover:text-teal-500" />
                        </div>
                        <div className="p-5 flex-1">
                            <h3 className="font-bold text-slate-800 mb-1">Em Branco</h3>
                            <p className="text-xs text-slate-500">Crie seu formulário do zero.</p>
                        </div>
                        <div className="p-5 pt-0">
                            <button className="w-full py-2 border border-teal-600 text-teal-600 rounded font-bold text-sm group-hover:bg-teal-600 group-hover:text-white transition-all">Criar do zero</button>
                        </div>
                    </div>

                    {/* Templates */}
                    {TEMPLATES.map(tpl => (
                        <div key={tpl.id} className="group bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-xl hover:border-teal-500 transition-all cursor-pointer flex flex-col h-full" onClick={() => selectTemplate(tpl)}>
                            <div className={clsx("h-40 border-b border-slate-100 p-6 flex flex-col justify-center gap-2 group-hover:opacity-90 transition-opacity relative overflow-hidden", tpl.previewColor)}>
                                {/* Mock UI Form */}
                                <div className="bg-white w-full h-full shadow-lg rounded-t-lg p-3 space-y-2 translate-y-2 mx-auto max-w-[80%] opacity-80">
                                    <div className="h-2 w-1/2 bg-slate-200 rounded"></div>
                                    <div className="h-6 w-full border border-slate-200 rounded bg-slate-50"></div>
                                    <div className="h-6 w-full border border-slate-200 rounded bg-slate-50"></div>
                                    <div className="h-6 w-1/3 bg-green-500 rounded mt-2"></div>
                                </div>
                            </div>
                            <div className="p-5 flex-1">
                                <h3 className="font-bold text-slate-800 mb-1">{tpl.title}</h3>
                                <p className="text-xs text-slate-500">{tpl.description}</p>
                            </div>
                            <div className="p-5 pt-0">
                                <button className="w-full py-2 border border-teal-600 text-teal-600 rounded font-bold text-sm group-hover:bg-teal-600 group-hover:text-white transition-all">Escolher modelo</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      );
  }

  // 2. EDITOR VIEW (RD Style)
  if (view === 'editor') {
      return (
        <div className="flex flex-col h-screen bg-slate-100 overflow-hidden animate-in fade-in">
            
            {/* Top Bar Navigation */}
            <div className="bg-white border-b border-slate-200 py-3 px-6 flex items-center justify-between shadow-sm z-30">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('list')} className="text-slate-500 hover:text-teal-600 text-sm font-medium border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50">
                        Voltar
                    </button>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div className="flex bg-slate-100 rounded p-1">
                        <button 
                            onClick={() => setEditorStep('editor')}
                            className={clsx("px-4 py-1 text-sm font-medium rounded transition-all", editorStep === 'editor' ? "bg-white shadow text-teal-700" : "text-slate-500 hover:text-slate-700")}
                        >
                            Editor
                        </button>
                        <button 
                            onClick={() => setEditorStep('design')}
                            className={clsx("px-4 py-1 text-sm font-medium rounded transition-all flex items-center gap-1", editorStep === 'design' ? "bg-white shadow text-teal-700" : "text-slate-500 hover:text-slate-700")}
                        >
                            <Palette size={14} /> Design
                        </button>
                        <button 
                            onClick={() => setEditorStep('settings')}
                            className={clsx("px-4 py-1 text-sm font-medium rounded transition-all", editorStep === 'settings' ? "bg-white shadow text-teal-700" : "text-slate-500 hover:text-slate-700")}
                        >
                            Configurações
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setView('preview')} className="text-slate-500 hover:text-teal-600 flex items-center gap-2 text-sm font-medium">
                        <Eye size={16} /> <span className="hidden sm:inline">Visualizar</span>
                    </button>
                    <button onClick={handleSaveForm} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded font-bold text-sm shadow-sm transition-all flex items-center gap-2">
                        <Save size={16} /> Salvar e Sair
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                
                {/* STEP: EDITOR & DESIGN */}
                {(editorStep === 'editor' || editorStep === 'design') && (
                    <>
                        {/* LEFT SIDEBAR */}
                        <div className="w-80 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                            
                            {/* --- FIELDS TAB --- */}
                            {editorStep === 'editor' && (
                                <>
                                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                                        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Campos disponíveis</h3>
                                    </div>
                                    <div className="p-4 overflow-y-auto flex-1 space-y-2">
                                        <p className="text-xs text-slate-400 mb-3">Clique para adicionar ao formulário</p>
                                        <button onClick={() => addQuestion('text')} className="w-full flex items-center gap-3 p-3 rounded border border-slate-200 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 text-slate-600 transition-all bg-white shadow-sm text-sm font-medium text-left group">
                                            <Type size={18} className="text-slate-400 group-hover:text-teal-500" /> Texto Curto
                                        </button>
                                        <button onClick={() => addQuestion('email')} className="w-full flex items-center gap-3 p-3 rounded border border-slate-200 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 text-slate-600 transition-all bg-white shadow-sm text-sm font-medium text-left group">
                                            <Mail size={18} className="text-slate-400 group-hover:text-teal-500" /> Email
                                        </button>
                                        <button onClick={() => addQuestion('phone')} className="w-full flex items-center gap-3 p-3 rounded border border-slate-200 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 text-slate-600 transition-all bg-white shadow-sm text-sm font-medium text-left group">
                                            <Phone size={18} className="text-slate-400 group-hover:text-teal-500" /> Telefone
                                        </button>
                                        <button onClick={() => addQuestion('paragraph')} className="w-full flex items-center gap-3 p-3 rounded border border-slate-200 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 text-slate-600 transition-all bg-white shadow-sm text-sm font-medium text-left group">
                                            <AlignLeft size={18} className="text-slate-400 group-hover:text-teal-500" /> Texto Longo
                                        </button>
                                        <button onClick={() => addQuestion('number')} className="w-full flex items-center gap-3 p-3 rounded border border-slate-200 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 text-slate-600 transition-all bg-white shadow-sm text-sm font-medium text-left group">
                                            <Hash size={18} className="text-slate-400 group-hover:text-teal-500" /> Número
                                        </button>
                                        <button onClick={() => addQuestion('date')} className="w-full flex items-center gap-3 p-3 rounded border border-slate-200 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 text-slate-600 transition-all bg-white shadow-sm text-sm font-medium text-left group">
                                            <Calendar size={18} className="text-slate-400 group-hover:text-teal-500" /> Data
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* --- DESIGN TAB --- */}
                            {editorStep === 'design' && (
                                <>
                                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                                        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Aparência do Fundo</h3>
                                    </div>
                                    <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                        
                                        {/* Background Type Selector */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Tipo de Fundo</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button 
                                                    onClick={() => updateStyle('backgroundType', 'color')}
                                                    className={clsx("p-2 text-xs border rounded flex items-center justify-center gap-1", currentForm.style?.backgroundType === 'color' ? "bg-teal-50 border-teal-500 text-teal-700" : "bg-white hover:bg-slate-50")}
                                                >
                                                    <Palette size={14} /> Cor Sólida
                                                </button>
                                                <button 
                                                    onClick={() => updateStyle('backgroundType', 'texture')}
                                                    className={clsx("p-2 text-xs border rounded flex items-center justify-center gap-1", currentForm.style?.backgroundType === 'texture' ? "bg-teal-50 border-teal-500 text-teal-700" : "bg-white hover:bg-slate-50")}
                                                >
                                                    <Grid size={14} /> Textura
                                                </button>
                                                <button 
                                                    onClick={() => updateStyle('backgroundType', 'image')}
                                                    className={clsx("p-2 text-xs border rounded flex items-center justify-center gap-1", currentForm.style?.backgroundType === 'image' ? "bg-teal-50 border-teal-500 text-teal-700" : "bg-white hover:bg-slate-50")}
                                                >
                                                    <ImageIcon size={14} /> Imagem
                                                </button>
                                                <button 
                                                    onClick={() => updateStyle('backgroundType', 'none')}
                                                    className={clsx("p-2 text-xs border rounded flex items-center justify-center gap-1", currentForm.style?.backgroundType === 'none' ? "bg-teal-50 border-teal-500 text-teal-700" : "bg-white hover:bg-slate-50")}
                                                >
                                                    <Ban size={14} /> Sem Cor
                                                </button>
                                            </div>
                                        </div>

                                        {/* Color Picker */}
                                        {currentForm.style?.backgroundType === 'color' && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Cor de Fundo</label>
                                                <div className="flex items-center gap-3">
                                                    <input 
                                                        type="color" 
                                                        value={currentForm.style?.backgroundColor || '#f1f5f9'}
                                                        onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                                                        className="w-10 h-10 p-0.5 rounded border border-slate-200 cursor-pointer"
                                                    />
                                                    <span className="text-sm font-mono text-slate-600 uppercase">{currentForm.style?.backgroundColor}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Texture Picker */}
                                        {currentForm.style?.backgroundType === 'texture' && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Padrão</label>
                                                <div className="space-y-2">
                                                    {TEXTURES.map(tex => (
                                                        <button 
                                                            key={tex.id}
                                                            onClick={() => updateStyle('backgroundTexture', tex.id)}
                                                            className={clsx(
                                                                "w-full text-left px-3 py-2 text-sm border rounded hover:bg-slate-50 flex justify-between",
                                                                currentForm.style?.backgroundTexture === tex.id ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600"
                                                            )}
                                                        >
                                                            {tex.name}
                                                            {currentForm.style?.backgroundTexture === tex.id && <CheckCircle size={14} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Image Upload */}
                                        {currentForm.style?.backgroundType === 'image' && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Upload Imagem</label>
                                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors relative">
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                    />
                                                    <ImageIcon className="mx-auto text-slate-400 mb-2" size={24} />
                                                    <p className="text-xs text-slate-500">Clique para enviar</p>
                                                </div>
                                                {currentForm.style?.backgroundImage && (
                                                    <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                                                        <CheckCircle size={12} /> Imagem carregada
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-slate-100">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={currentForm.style?.cardTransparent || false}
                                                    onChange={(e) => updateStyle('cardTransparent', e.target.checked)}
                                                    className="rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                                                />
                                                <span className="text-sm text-slate-700 font-medium">Fundo do Formulário Transparente</span>
                                            </label>
                                            <p className="text-xs text-slate-400 mt-1 ml-6">Torna a área branca das perguntas semitransparente.</p>
                                        </div>

                                    </div>
                                </>
                            )}
                        </div>

                        {/* CENTER: PREVIEW CANVAS */}
                        <div className="flex-1 bg-slate-100 overflow-y-auto p-8 relative flex flex-col items-center transition-all" style={getPreviewContainerStyle()}>
                            {/* Device Toggle (Visual only) */}
                            <div className="absolute top-4 flex bg-white rounded-lg shadow-sm border border-slate-200 p-1 gap-1 z-10">
                                <div className="p-1.5 rounded bg-teal-50 text-teal-600"><Monitor size={16} /></div>
                                <div className="p-1.5 rounded text-slate-400"><Smartphone size={16} /></div>
                            </div>

                            {/* The "Paper" Form */}
                            <div className={clsx("w-full max-w-xl min-h-[500px] mt-8 flex flex-col transition-all", 
                                currentForm.style?.cardTransparent ? "bg-white/90 backdrop-blur-sm rounded-xl shadow-xl" : "bg-white rounded-xl shadow-xl border border-slate-200")}>
                                {/* Header Editable Area */}
                                <div className="p-8 border-b border-slate-100 group relative hover:bg-slate-50/50 transition-colors rounded-t-xl">
                                    <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 text-slate-400">
                                        <Edit2 size={16} />
                                    </div>
                                    <input 
                                        type="text" 
                                        className="text-2xl font-bold text-slate-800 w-full bg-transparent border-none focus:ring-0 p-0 placeholder-slate-300"
                                        value={currentForm.title}
                                        onChange={(e) => setCurrentForm({...currentForm, title: e.target.value})}
                                        placeholder="Título do Formulário"
                                    />
                                    <textarea 
                                        className="w-full text-sm text-slate-600 bg-transparent border-none focus:ring-0 p-0 mt-2 resize-none placeholder-slate-300"
                                        value={currentForm.description}
                                        onChange={(e) => setCurrentForm({...currentForm, description: e.target.value})}
                                        placeholder="Descrição do formulário"
                                        rows={2}
                                    />
                                </div>

                                {/* Form Body */}
                                <div className={clsx("p-8 space-y-6 flex-1 rounded-b-xl", currentForm.style?.cardTransparent ? "bg-white/60" : "bg-white")}>
                                    {currentForm.questions.length === 0 && (
                                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                                            <p className="text-slate-400 text-sm">Seu formulário está vazio.</p>
                                            <p className="text-slate-400 text-xs">Adicione campos usando o menu à esquerda.</p>
                                        </div>
                                    )}

                                    {currentForm.questions.map((q) => (
                                        <div key={q.id} className="relative group border border-transparent hover:border-teal-200 hover:bg-teal-50/30 rounded-lg p-3 -mx-3 transition-all">
                                            {/* Field Controls */}
                                            <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm border border-slate-100 rounded p-1 z-10">
                                                <button onClick={() => removeQuestion(q.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                                    <Trash2 size={14} />
                                                </button>
                                                <div className="w-px bg-slate-200 mx-1"></div>
                                                <div className="p-1 cursor-move text-slate-400 hover:text-slate-600">
                                                    <GripVertical size={14} />
                                                </div>
                                            </div>

                                            {/* Field Edit Mode */}
                                            <div className="space-y-2">
                                                <input 
                                                    value={q.title}
                                                    onChange={(e) => updateQuestion(q.id, 'title', e.target.value)}
                                                    className="block w-full text-sm font-semibold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-teal-500 focus:outline-none transition-all px-1"
                                                />
                                                
                                                {/* Visual Mock of Input */}
                                                <div className="relative pointer-events-none opacity-60">
                                                    {q.type === 'paragraph' ? (
                                                        <div className="h-20 w-full border border-slate-300 rounded bg-slate-50"></div>
                                                    ) : (
                                                        <div className="h-10 w-full border border-slate-300 rounded bg-slate-50 flex items-center px-3 text-sm text-slate-400">
                                                            {q.placeholder || 'Resposta...'}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 mt-2">
                                                    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer hover:text-teal-600">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={q.required}
                                                            onChange={(e) => updateQuestion(q.id, 'required', e.target.checked)}
                                                            className="rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                                                        />
                                                        Campo Obrigatório
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="pt-4">
                                        <button disabled className="w-full bg-slate-300 text-white font-bold py-3 rounded cursor-default opacity-50">
                                            ENVIAR
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-4 text-xs text-slate-400 bg-white/50 px-2 py-1 rounded backdrop-blur-sm">
                                Preview Desktop
                            </div>
                        </div>
                    </>
                )}

                {/* STEP: SETTINGS */}
                {editorStep === 'settings' && (
                    <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
                        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-200">
                                <h2 className="text-lg font-bold text-slate-800">Configurações do Formulário</h2>
                                <p className="text-sm text-slate-500">Defina como seu formulário deve se comportar.</p>
                            </div>
                            
                            <div className="p-6 space-y-8">
                                {/* Lead Capture */}
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 mt-1">
                                        <Target size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-slate-800">Integração CRM (Captação de Leads)</h3>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={currentForm.isLeadCapture}
                                                    onChange={(e) => setCurrentForm({...currentForm, isLeadCapture: e.target.checked})}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                            </label>
                                        </div>
                                        <p className="text-sm text-slate-600 mb-2">
                                            Quando ativado, as respostas serão enviadas automaticamente para o quadro de oportunidades do CRM.
                                        </p>
                                        {currentForm.isLeadCapture && (
                                            <div className="bg-indigo-50 text-indigo-800 text-xs p-3 rounded border border-indigo-100 flex items-start gap-2">
                                                <CheckSquare size={14} className="mt-0.5" />
                                                Para melhor funcionamento, certifique-se de ter campos como "Nome", "Email" e "Empresa".
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100"></div>

                                {/* Notifications (Mock) */}
                                <div className="flex items-start gap-4 opacity-50">
                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500 mt-1">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 mb-1">Notificações por Email</h3>
                                        <p className="text-sm text-slate-500">
                                            Receba um alerta a cada nova conversão (Em breve).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
      );
  }

  // 3. LIST VIEW (DASHBOARD)
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="text-teal-600" /> Meus Formulários
                </h2>
                <p className="text-slate-500 text-sm">Crie formulários para pesquisa ou captação de leads.</p>
            </div>
        </div>
        <button 
            onClick={startCreation}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
        >
            <Plus size={18} /> Criar Formulário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* New Form Card (Visual Shortcut) */}
          <div 
            onClick={startCreation}
            className="bg-white rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 cursor-pointer hover:border-teal-300 hover:bg-teal-50 transition-all group min-h-[240px]"
          >
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-teal-200 group-hover:text-teal-700 text-slate-300 transition-colors shadow-inner">
                  <Plus size={32} />
              </div>
              <span className="font-bold text-slate-600 group-hover:text-teal-700 text-lg">Criar Novo</span>
              <span className="text-xs text-slate-400 mt-1">Começar do zero ou usar modelo</span>
          </div>

          {forms.map(form => (
              <div key={form.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group h-[240px]">
                  <div className="h-2 bg-slate-100 group-hover:bg-teal-500 transition-colors"></div>
                  
                  <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                          <div className={clsx("p-1.5 rounded", form.isLeadCapture ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500")}>
                              {form.isLeadCapture ? <Target size={16} /> : <FileText size={16} />}
                          </div>
                          {/* Actions Dropdown Trigger (Simplified for now) */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEdit(form)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="Editar"><Edit2 size={14}/></button>
                              <button onClick={() => handleShare(form)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="Link"><Share2 size={14}/></button>
                              <button onClick={() => handleDelete(form.id)} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-slate-400" title="Excluir"><Trash2 size={14}/></button>
                          </div>
                      </div>

                      <h3 className="font-bold text-slate-800 mb-1 line-clamp-2 leading-tight" title={form.title}>{form.title}</h3>
                      <p className="text-xs text-slate-400 mb-4 line-clamp-2 h-8">
                          {form.description || 'Sem descrição.'}
                      </p>
                      
                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                              <span className="font-bold text-slate-800 text-lg">{form.submissionsCount || 0}</span> conv.
                          </span>
                          <span>{new Date(form.createdAt).toLocaleDateString()}</span>
                      </div>
                  </div>
                  
                  {/* Copy Feedback Overlay */}
                  {copiedId === form.id && (
                      <div className="absolute inset-0 bg-teal-600/90 flex items-center justify-center text-white font-bold animate-in fade-in duration-200">
                          <CheckCircle size={24} className="mr-2" /> Link Copiado!
                      </div>
                  )}
              </div>
          ))}
      </div>
    </div>
  );
};
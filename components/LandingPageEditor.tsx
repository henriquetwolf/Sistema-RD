
import React, { useState } from 'react';
import { 
  ArrowLeft, Type, MousePointer2, Image as ImageIcon, 
  Settings, Plus, Layout, Loader2, Trash2, ArrowUp, ArrowDown,
  AlignCenter, AlignLeft, AlignRight, PlayCircle, Save, X, Info,
  Smartphone as MobileIcon, Monitor as DesktopIcon, ChevronRight
} from 'lucide-react';
import { LandingPage } from '../types';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

interface LandingPageEditorProps {
  lp: LandingPage;
  onBack: () => void;
}

interface ElementStyle {
  fontSize?: number;
  color?: string;
  bgColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  borderRadius?: number;
  width?: string;
  align?: 'left' | 'center' | 'right';
  fontWeight?: string;
}

interface Element {
  id: string;
  type: 'heading' | 'text' | 'image' | 'button' | 'spacer' | 'video';
  content: string;
  style: ElementStyle;
}

interface SectionFold {
  id: string;
  bgColor: string;
  padding: string;
  elements: Element[];
}

export const LandingPageEditor: React.FC<LandingPageEditorProps> = ({ lp, onBack }) => {
  const [activeView, setActiveView] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [sections, setSections] = useState<SectionFold[]>(lp.content?.sections || []);
  const [selectedFoldId, setSelectedFoldId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const selectedFold = sections.find(s => s.id === selectedFoldId);
  const selectedElement = selectedFold?.elements.find(e => e.id === selectedElementId);

  const addFold = () => {
    const newFold: SectionFold = {
      id: crypto.randomUUID(),
      bgColor: '#ffffff',
      padding: '60px',
      elements: []
    };
    setSections([...sections, newFold]);
    setSelectedFoldId(newFold.id);
    setSelectedElementId(null);
  };

  const removeFold = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Deseja excluir esta dobra inteira?")) {
        setSections(sections.filter(s => s.id !== id));
        if (selectedFoldId === id) {
            setSelectedFoldId(null);
            setSelectedElementId(null);
        }
    }
  };

  const addElement = (type: Element['type']) => {
    if (!selectedFoldId) {
        alert("Selecione ou crie uma dobra primeiro.");
        return;
    }
    
    const newElement: Element = {
      id: crypto.randomUUID(),
      type,
      content: type === 'heading' ? 'Novo Título' : 
               type === 'text' ? 'Seu texto editável aqui...' : 
               type === 'button' ? 'Clique Aqui' : 
               type === 'image' ? 'https://via.placeholder.com/400x300' : '',
      style: type === 'button' ? { bgColor: '#0d9488', color: '#ffffff', borderRadius: 8, align: 'center' } :
             type === 'heading' ? { fontSize: 32, fontWeight: 'bold', textAlign: 'center' } :
             { textAlign: 'center' }
    };

    setSections(prev => prev.map(f => f.id === selectedFoldId ? { ...f, elements: [...f.elements, newElement] } : f));
    setSelectedElementId(newElement.id);
  };

  const removeElement = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSections(prev => prev.map(f => {
        if (f.id === selectedFoldId) {
            return { ...f, elements: f.elements.filter(e => e.id !== elementId) };
        }
        return f;
    }));
    if (selectedElementId === elementId) setSelectedElementId(null);
  };

  const moveElement = (elementId: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedFold) return;
    const idx = selectedFold.elements.findIndex(e => e.id === elementId);
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= selectedFold.elements.length) return;

    const newElements = [...selectedFold.elements];
    const [moved] = newElements.splice(idx, 1);
    newElements.splice(newIdx, 0, moved);

    setSections(prev => prev.map(f => f.id === selectedFoldId ? { ...f, elements: newElements } : f));
  };

  const updateElement = (field: string, value: any) => {
    setSections(prev => prev.map(f => {
        if (f.id === selectedFoldId) {
            return {
                ...f,
                elements: f.elements.map(e => e.id === selectedElementId ? { ...e, [field]: value } : e)
            };
        }
        return f;
    }));
  };

  const updateElementStyle = (field: string, value: any) => {
    setSections(prev => prev.map(f => {
        if (f.id === selectedFoldId) {
            return {
                ...f,
                elements: f.elements.map(e => e.id === selectedElementId ? { ...e, style: { ...e.style, [field]: value } } : e)
            };
        }
        return f;
    }));
  };

  const updateFold = (field: string, value: any) => {
    setSections(prev => prev.map(f => f.id === selectedFoldId ? { ...f, [field]: value } : f));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await appBackend.saveLandingPage({
        ...lp,
        content: { sections },
        updatedAt: new Date().toISOString()
      });
      alert("Página salva!");
    } catch (e) {
      alert("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const publish = async () => {
    if (!window.confirm("Publicar esta página agora?")) return;
    setIsSaving(true);
    try {
      await appBackend.saveLandingPage({
        ...lp,
        content: { sections },
        status: 'published',
        updatedAt: new Date().toISOString()
      });
      alert("Página publicada!");
    } catch (e) {
      alert("Erro ao publicar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-teal-600 font-bold text-sm transition-colors border border-slate-200 px-3 py-1.5 rounded-lg">
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <div>
            <h1 className="text-sm font-black text-slate-800 leading-none">{lp.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shadow-inner">
          <button onClick={() => setActiveView('desktop')} className={clsx("p-2 rounded-lg transition-all", activeView === 'desktop' ? "bg-white text-teal-600 shadow-sm" : "text-slate-400")}><DesktopIcon size={18}/></button>
          <button onClick={() => setActiveView('mobile')} className={clsx("p-2 rounded-lg transition-all", activeView === 'mobile' ? "bg-white text-teal-600 shadow-sm" : "text-slate-400")}><MobileIcon size={18}/></button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={isSaving} className="text-teal-600 hover:bg-teal-50 border border-teal-200 font-bold text-xs px-4 py-2 rounded-xl">
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Salvar'}
          </button>
          <button onClick={publish} className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs px-6 py-2 rounded-xl shadow-lg">Publicar</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Components & Structure */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            {/* Add Elements */}
            <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Adicionar Elementos</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'heading', label: 'Título', icon: Type },
                  { id: 'text', label: 'Texto', icon: AlignLeft },
                  { id: 'image', label: 'Imagem', icon: ImageIcon },
                  { id: 'button', label: 'Botão', icon: MousePointer2 },
                  { id: 'video', label: 'Vídeo', icon: PlayCircle },
                  { id: 'spacer', label: 'Espaço', icon: Layout },
                ].map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => addElement(item.id as any)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:border-teal-300 hover:bg-teal-50 transition-all group"
                  >
                    <item.icon size={20} className="text-slate-400 group-hover:text-teal-600 mb-1" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase">{item.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Structure */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estrutura da Página</h3>
                <button onClick={addFold} className="p-1 text-teal-600 hover:bg-teal-50 rounded-lg"><Plus size={16}/></button>
              </div>
              <div className="space-y-3">
                {sections.map((fold, idx) => (
                  <div key={fold.id} className="space-y-1">
                    <div 
                      onClick={() => { setSelectedFoldId(fold.id); setSelectedElementId(null); }}
                      className={clsx(
                        "flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                        selectedFoldId === fold.id ? "bg-teal-50 border-teal-500 text-teal-700 shadow-sm" : "bg-slate-50 border-slate-100 text-slate-500"
                      )}
                    >
                      <span className="flex items-center gap-2"><Layout size={14}/> Dobra {idx + 1}</span>
                      <button onClick={(e) => removeFold(fold.id, e)} className="p-1 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                    </div>
                    {selectedFoldId === fold.id && (
                        <div className="pl-4 border-l-2 border-teal-200 space-y-1 mt-1">
                            {fold.elements.map((el, elIdx) => (
                                <div 
                                    key={el.id}
                                    onClick={() => setSelectedElementId(el.id)}
                                    className={clsx(
                                        "flex items-center justify-between p-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                                        selectedElementId === el.id ? "bg-white border-teal-400 border text-teal-600" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    <span className="truncate">{el.type.toUpperCase()}: {el.content.substring(0, 15)}...</span>
                                    <div className="flex gap-1">
                                        <button onClick={(e) => moveElement(el.id, 'up', e)} disabled={elIdx === 0} className="disabled:opacity-20"><ArrowUp size={10}/></button>
                                        <button onClick={(e) => moveElement(el.id, 'down', e)} disabled={elIdx === fold.elements.length - 1} className="disabled:opacity-20"><ArrowDown size={10}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </aside>

        {/* Editor Area */}
        <main className="flex-1 overflow-auto bg-slate-200 p-12 flex flex-col items-center custom-scrollbar">
          <div 
            className={clsx(
              "bg-white shadow-2xl transition-all duration-500 min-h-full relative",
              activeView === 'desktop' ? "w-[1100px]" : "w-[375px]"
            )}
          >
            {sections.length === 0 ? (
                <div className="h-96 flex flex-col items-center justify-center text-slate-300">
                    <Layout size={64} className="opacity-10 mb-4" />
                    <p className="font-bold">Crie uma dobra para começar</p>
                </div>
            ) : (
                sections.map((fold) => (
                    <div 
                        key={fold.id} 
                        onClick={(e) => { e.stopPropagation(); setSelectedFoldId(fold.id); setSelectedElementId(null); }}
                        className={clsx(
                            "relative transition-all border-2",
                            selectedFoldId === fold.id ? "border-teal-500" : "border-transparent hover:border-teal-100"
                        )}
                        style={{ backgroundColor: fold.bgColor, padding: fold.padding }}
                    >
                        {fold.elements.map((el) => (
                            <div 
                                key={el.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedFoldId(fold.id); setSelectedElementId(el.id); }}
                                className={clsx(
                                    "relative transition-all p-2 mb-2 rounded border-2",
                                    selectedElementId === el.id ? "border-amber-400 bg-amber-50/10" : "border-transparent hover:border-slate-200"
                                )}
                                style={{
                                    textAlign: el.style.textAlign as any || 'left'
                                }}
                            >
                                {el.type === 'heading' && <h2 style={{ fontSize: el.style.fontSize, color: el.style.color, fontWeight: el.style.fontWeight as any }}>{el.content}</h2>}
                                {el.type === 'text' && <p style={{ fontSize: el.style.fontSize, color: el.style.color, whiteSpace: 'pre-wrap' }}>{el.content}</p>}
                                {el.type === 'image' && (
                                    <div className={clsx("flex", el.style.align === 'center' ? 'justify-center' : el.style.align === 'right' ? 'justify-end' : 'justify-start')}>
                                        <img src={el.content} style={{ width: el.style.width || 'auto' }} alt="Content" className="rounded-lg" />
                                    </div>
                                )}
                                {el.type === 'button' && (
                                    <div className={clsx("flex", el.style.align === 'center' ? 'justify-center' : el.style.align === 'right' ? 'justify-end' : 'justify-start')}>
                                        <button 
                                            style={{ backgroundColor: el.style.bgColor, color: el.style.color, borderRadius: el.style.borderRadius, padding: '12px 32px', fontWeight: 'bold' }}
                                        >
                                            {el.content}
                                        </button>
                                    </div>
                                )}
                                {el.type === 'spacer' && <div style={{ height: el.style.fontSize || 40 }}></div>}
                                {el.type === 'video' && (
                                    <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
                                        <PlayCircle size={48} className="text-white opacity-50" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))
            )}
          </div>
        </main>

        {/* Right Sidebar: Properties */}
        <aside className="w-80 bg-white border-l border-slate-200 p-6 overflow-y-auto custom-scrollbar shrink-0">
          {selectedElement ? (
              <div className="space-y-6 animate-in slide-in-from-right-2">
                  <div className="flex items-center justify-between border-b pb-4">
                      <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <Settings size={14} className="text-teal-600" /> Propriedades: {selectedElement.type.toUpperCase()}
                      </h3>
                      <button onClick={() => setSelectedElementId(null)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                  </div>

                  <div className="space-y-4">
                      {/* Content Edit */}
                      {selectedElement.type !== 'spacer' && (
                          <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Conteúdo</label>
                            {selectedElement.type === 'text' ? (
                                <textarea className="w-full border rounded-lg p-2 text-xs h-32" value={selectedElement.content} onChange={e => updateElement('content', e.target.value)} />
                            ) : (
                                <input type="text" className="w-full border rounded-lg p-2 text-xs" value={selectedElement.content} onChange={e => updateElement('content', e.target.value)} />
                            )}
                          </div>
                      )}

                      {/* Common Style Edits */}
                      {['heading', 'text', 'spacer'].includes(selectedElement.type) && (
                          <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Tamanho / Altura (px)</label>
                            <input type="number" className="w-full border rounded-lg p-2 text-xs" value={selectedElement.style.fontSize} onChange={e => updateElementStyle('fontSize', parseInt(e.target.value))} />
                          </div>
                      )}

                      {['heading', 'text'].includes(selectedElement.type) && (
                          <>
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Cor do Texto</label>
                                <input type="color" className="w-full h-8 border rounded cursor-pointer" value={selectedElement.style.color || '#000000'} onChange={e => updateElementStyle('color', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Alinhamento</label>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button onClick={() => updateElementStyle('textAlign', 'left')} className={clsx("flex-1 p-1 rounded", selectedElement.style.textAlign === 'left' ? "bg-white shadow text-teal-600" : "text-slate-400")}><AlignLeft size={14} className="mx-auto"/></button>
                                    <button onClick={() => updateElementStyle('textAlign', 'center')} className={clsx("flex-1 p-1 rounded", selectedElement.style.textAlign === 'center' ? "bg-white shadow text-teal-600" : "text-slate-400")}><AlignCenter size={14} className="mx-auto"/></button>
                                    <button onClick={() => updateElementStyle('textAlign', 'right')} className={clsx("flex-1 p-1 rounded", selectedElement.style.textAlign === 'right' ? "bg-white shadow text-teal-600" : "text-slate-400")}><AlignRight size={14} className="mx-auto"/></button>
                                </div>
                            </div>
                          </>
                      )}

                      {selectedElement.type === 'button' && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Cor Fundo</label>
                                    <input type="color" className="w-full h-8 border rounded cursor-pointer" value={selectedElement.style.bgColor} onChange={e => updateElementStyle('bgColor', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Cor Texto</label>
                                    <input type="color" className="w-full h-8 border rounded cursor-pointer" value={selectedElement.style.color} onChange={e => updateElementStyle('color', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Arredondamento</label>
                                <input type="range" min="0" max="50" className="w-full accent-teal-600" value={selectedElement.style.borderRadius} onChange={e => updateElementStyle('borderRadius', parseInt(e.target.value))} />
                            </div>
                          </>
                      )}

                      {['button', 'image'].includes(selectedElement.type) && (
                          <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Posicionamento</label>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button onClick={() => updateElementStyle('align', 'left')} className={clsx("flex-1 p-1 rounded", selectedElement.style.align === 'left' ? "bg-white shadow text-teal-600" : "text-slate-400")}><AlignLeft size={14} className="mx-auto"/></button>
                                    <button onClick={() => updateElementStyle('align', 'center')} className={clsx("flex-1 p-1 rounded", selectedElement.style.align === 'center' ? "bg-white shadow text-teal-600" : "text-slate-400")}><AlignCenter size={14} className="mx-auto"/></button>
                                    <button onClick={() => updateElementStyle('align', 'right')} className={clsx("flex-1 p-1 rounded", selectedElement.style.align === 'right' ? "bg-white shadow text-teal-600" : "text-slate-400")}><AlignRight size={14} className="mx-auto"/></button>
                                </div>
                            </div>
                      )}
                  </div>
              </div>
          ) : selectedFold ? (
              <div className="space-y-6 animate-in slide-in-from-right-2">
                  <div className="flex items-center justify-between border-b pb-4">
                      <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <Layout size={14} className="text-teal-600" /> Configuração da Dobra
                      </h3>
                      <button onClick={() => setSelectedFoldId(null)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Cor de Fundo da Dobra</label>
                          <input type="color" className="w-full h-10 border rounded cursor-pointer" value={selectedFold.bgColor} onChange={e => updateFold('bgColor', e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Espaçamento Vertical (Padding)</label>
                          <input type="text" className="w-full border rounded-lg p-2 text-xs" value={selectedFold.padding} onChange={e => updateFold('padding', e.target.value)} placeholder="Ex: 80px" />
                      </div>
                  </div>
              </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-300">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Settings size={16} /> Configurações Gerais
              </h3>
              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex flex-col items-center text-center gap-3">
                 <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600"><Info size={20}/></div>
                 <p className="text-[10px] font-bold text-indigo-700 leading-relaxed uppercase tracking-tighter">Clique em uma dobra ou elemento no centro para editar.</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

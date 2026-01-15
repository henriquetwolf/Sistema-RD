import React, { useState } from 'react';
import { 
  ArrowLeft, Type, MousePointer2, Image as ImageIcon, 
  ChevronRight, Settings, Plus, Layout, Grid, MoreVertical,
  Smartphone as MobileIcon, Monitor as DesktopIcon,
  Palette, Check, AlertCircle, Loader2, Trash2, ArrowUp, ArrowDown,
  AlignCenter, AlignLeft, Info, PlayCircle, Video, Save, X
} from 'lucide-react';
import { LandingPage } from '../types';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

interface LandingPageEditorProps {
  lp: LandingPage;
  onBack: () => void;
}

interface Section {
  id: string;
  type: 'hero' | 'text' | 'image' | 'cta' | 'video';
  content: any;
}

const SECTION_TEMPLATES: Record<string, any> = {
  hero: {
    title: 'Título de Impacto da sua Página',
    subtitle: 'Uma descrição convincente para prender a atenção do seu lead logo de cara.',
    buttonText: 'Quero Garantir Minha Vaga',
    buttonLink: '#',
    bgColor: '#1e293b',
    textColor: '#ffffff',
    primaryColor: '#0d9488'
  },
  text: {
    title: 'Nossa Metodologia',
    body: 'Escreva aqui o conteúdo detalhado sobre o que você está oferecendo. Foque nos benefícios e na transformação que o aluno terá.',
    align: 'left'
  },
  image: {
    url: 'https://images.unsplash.com/photo-1518611012118-2960520ee86c?auto=format&fit=crop&q=80&w=1200',
    caption: 'Legenda da imagem opcional'
  },
  cta: {
    text: 'Ainda tem dúvidas? Fale com um consultor agora mesmo!',
    buttonText: 'Chamar no WhatsApp',
    buttonLink: 'https://wa.me/555199999999',
    bgColor: '#f8fafc'
  },
  video: {
    embedCode: '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe>'
  }
};

const COMPONENTS = [
  { id: 'hero', label: 'Capa / Hero', icon: Layout },
  { id: 'text', label: 'Texto / Conteúdo', icon: Type },
  { id: 'image', label: 'Imagem', icon: ImageIcon },
  { id: 'video', label: 'Vídeo (YouTube)', icon: PlayCircle },
  { id: 'cta', label: 'Chamada (CTA)', icon: MousePointer2 },
];

export const LandingPageEditor: React.FC<LandingPageEditorProps> = ({ lp, onBack }) => {
  const [activeView, setActiveView] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [sections, setSections] = useState<Section[]>(lp.content?.sections || []);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const selectedSection = sections.find(s => s.id === selectedSectionId);

  const addSection = (type: string) => {
    const newSection: Section = {
      id: crypto.randomUUID(),
      type: type as any,
      content: { ...SECTION_TEMPLATES[type] }
    };
    setSections([...sections, newSection]);
    setSelectedSectionId(newSection.id);
  };

  const removeSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSections(sections.filter(s => s.id !== id));
    if (selectedSectionId === id) setSelectedSectionId(null);
  };

  const moveSection = (id: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const index = sections.findIndex(s => s.id === id);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    const newSections = [...sections];
    const [removed] = newSections.splice(index, 1);
    newSections.splice(newIndex, 0, removed);
    setSections(newSections);
  };

  const updateSectionContent = (id: string, field: string, value: any) => {
    setSections(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, content: { ...s.content, [field]: value } };
      }
      return s;
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await appBackend.saveLandingPage({
        ...lp,
        content: { sections },
        updatedAt: new Date().toISOString()
      });
      alert("Landing Page salva com sucesso!");
    } catch (e) {
      alert("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const publish = async () => {
    if (!window.confirm("Publicar esta página agora? Ela ficará visível publicamente.")) return;
    setIsSaving(true);
    try {
      await appBackend.saveLandingPage({
        ...lp,
        content: { sections },
        status: 'published',
        updatedAt: new Date().toISOString()
      });
      alert("Página publicada com sucesso!");
    } catch (e) {
      alert("Erro ao publicar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col animate-in fade-in duration-300">
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-teal-600 font-bold text-sm transition-colors border border-slate-200 px-3 py-1.5 rounded-lg">
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Editor de Landing Page</span>
            <h1 className="text-sm font-black text-slate-800 leading-none">{lp.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shadow-inner">
          <button 
            onClick={() => setActiveView('desktop')}
            className={clsx("p-2 rounded-lg transition-all", activeView === 'desktop' ? "bg-white text-teal-600 shadow-sm" : "text-slate-400")}
          >
            <DesktopIcon size={20} />
          </button>
          <button 
            onClick={() => setActiveView('mobile')}
            className={clsx("p-2 rounded-lg transition-all", activeView === 'mobile' ? "bg-white text-teal-600 shadow-sm" : "text-slate-400")}
          >
            <MobileIcon size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="text-teal-600 hover:bg-teal-50 border border-teal-200 font-bold text-sm px-6 py-2 rounded-xl transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Salvar Alterações'}
          </button>
          <button 
            onClick={publish}
            className="bg-teal-600 hover:bg-teal-700 text-white font-black text-sm px-8 py-2 rounded-xl shadow-lg transition-all active:scale-95"
          >
            Publicar Página
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Adicionar Elementos</h3>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            <div className="grid grid-cols-1 gap-3">
              {COMPONENTS.map(comp => (
                <button 
                  key={comp.id}
                  onClick={() => addSection(comp.id)}
                  className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:border-teal-400 hover:shadow-md transition-all active:scale-95 group text-left"
                >
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                    <comp.icon size={20} />
                  </div>
                  <span className="text-xs font-black text-slate-500 group-hover:text-slate-700 uppercase tracking-widest">{comp.label}</span>
                </button>
              ))}
            </div>
            
            <div className="mt-8 pt-8 border-t border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Camadas da Página</h3>
              <div className="space-y-2">
                {sections.map((s, i) => (
                  <div 
                    key={s.id}
                    onClick={() => setSelectedSectionId(s.id)}
                    className={clsx(
                      "flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                      selectedSectionId === s.id ? "bg-teal-50 border-teal-500 text-teal-700" : "bg-white border-slate-100 text-slate-500"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="opacity-30">{i + 1}</span> {s.type.toUpperCase()}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={(e) => removeSection(s.id, e)} className="p-1 hover:text-red-500"><Trash2 size={12}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto bg-slate-200 p-8 flex flex-col items-center custom-scrollbar relative">
          <div 
            className={clsx(
              "bg-white shadow-2xl transition-all duration-500 min-h-full border border-slate-200 relative",
              activeView === 'desktop' ? "w-[1140px]" : "w-[375px]"
            )}
            onClick={() => setSelectedSectionId(null)}
          >
            {sections.length === 0 ? (
              <div className="h-96 flex flex-col items-center justify-center text-slate-300 gap-4">
                <Layout size={64} className="opacity-10" />
                <p className="font-bold text-lg">Sua página está vazia</p>
                <p className="text-sm">Clique em um componente à esquerda para começar.</p>
              </div>
            ) : (
              sections.map((section, idx) => (
                <div 
                  key={section.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedSectionId(section.id); }}
                  className={clsx(
                    "relative group cursor-pointer border-2 transition-all",
                    selectedSectionId === section.id ? "border-teal-500" : "border-transparent hover:border-teal-200"
                  )}
                >
                  <div className="absolute -left-12 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                    <button onClick={(e) => moveSection(section.id, 'up', e)} className="p-1.5 bg-white shadow-md rounded-lg text-slate-500 hover:text-teal-600 disabled:opacity-30" disabled={idx === 0}><ArrowUp size={16}/></button>
                    <button onClick={(e) => moveSection(section.id, 'down', e)} className="p-1.5 bg-white shadow-md rounded-lg text-slate-500 hover:text-teal-600 disabled:opacity-30" disabled={idx === sections.length - 1}><ArrowDown size={16}/></button>
                    <button onClick={(e) => removeSection(section.id, e)} className="p-1.5 bg-white shadow-md rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={16}/></button>
                  </div>

                  {section.type === 'hero' && (
                    <div style={{ backgroundColor: section.content.bgColor, color: section.content.textColor }} className="py-20 px-10 text-center">
                      <h1 className="text-5xl font-black mb-6 leading-tight" style={{ color: section.content.textColor }}>{section.content.title}</h1>
                      <p className="text-xl opacity-80 mb-10 max-w-2xl mx-auto">{section.content.subtitle}</p>
                      <button className="px-10 py-4 rounded-full font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: section.content.primaryColor, color: '#fff' }}>
                        {section.content.buttonText}
                      </button>
                    </div>
                  )}

                  {section.type === 'text' && (
                    <div className={clsx("py-16 px-12 bg-white", section.content.align === 'center' ? 'text-center' : 'text-left')}>
                      <h2 className="text-3xl font-black text-slate-800 mb-6">{section.content.title}</h2>
                      <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">{section.content.body}</p>
                    </div>
                  )}

                  {section.type === 'image' && (
                    <div className="bg-white">
                      <img src={section.content.url} className="w-full h-auto" alt="landing content" />
                      {section.content.caption && <p className="p-4 text-center text-xs text-slate-400">{section.content.caption}</p>}
                    </div>
                  )}

                  {section.type === 'video' && (
                    <div className="p-12 bg-slate-50 flex justify-center">
                       <div className="w-full max-w-4xl aspect-video rounded-3xl overflow-hidden shadow-2xl border-8 border-white bg-black flex items-center justify-center">
                          <div dangerouslySetInnerHTML={{ __html: section.content.embedCode }} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                       </div>
                    </div>
                  )}

                  {section.type === 'cta' && (
                    <div style={{ backgroundColor: section.content.bgColor }} className="py-16 px-12 border-y border-slate-100 text-center">
                      <h3 className="text-2xl font-bold text-slate-800 mb-8">{section.content.text}</h3>
                      <button className="bg-teal-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-teal-700 transition-all">
                        {section.content.buttonText}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </main>

        <aside className="w-80 bg-white border-l border-slate-200 p-6 overflow-y-auto custom-scrollbar shrink-0">
          {selectedSection ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-200">
               <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Settings size={16} className="text-teal-600" /> Propriedades: {selectedSection.type.toUpperCase()}
                  </h3>
                  <button onClick={() => setSelectedSectionId(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><X size={16}/></button>
               </div>

               <div className="space-y-6">
                  {selectedSection.type === 'hero' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Título Principal</label>
                        <textarea className="w-full border rounded-xl p-3 text-sm font-bold h-24" value={selectedSection.content.title} onChange={e => updateSectionContent(selectedSection.id, 'title', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Subtítulo</label>
                        <textarea className="w-full border rounded-xl p-3 text-sm h-24" value={selectedSection.content.subtitle} onChange={e => updateSectionContent(selectedSection.id, 'subtitle', e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Cor Fundo</label>
                          <input type="color" className="w-full h-10 border rounded-lg" value={selectedSection.content.bgColor} onChange={e => updateSectionContent(selectedSection.id, 'bgColor', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Cor Texto</label>
                          <input type="color" className="w-full h-10 border rounded-lg" value={selectedSection.content.textColor} onChange={e => updateSectionContent(selectedSection.id, 'textColor', e.target.value)} />
                        </div>
                      </div>
                    </>
                  )}

                  {selectedSection.type === 'text' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Título da Seção</label>
                        <input type="text" className="w-full border rounded-xl p-3 text-sm font-bold" value={selectedSection.content.title} onChange={e => updateSectionContent(selectedSection.id, 'title', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Alinhamento</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button onClick={() => updateSectionContent(selectedSection.id, 'align', 'left')} className={clsx("flex-1 py-1 rounded transition-all", selectedSection.content.align === 'left' ? "bg-white shadow text-teal-600" : "text-slate-400")}><AlignLeft size={16} className="mx-auto"/></button>
                          <button onClick={() => updateSectionContent(selectedSection.id, 'align', 'center')} className={clsx("flex-1 py-1 rounded transition-all", selectedSection.content.align === 'center' ? "bg-white shadow text-teal-600" : "text-slate-400")}><AlignCenter size={16} className="mx-auto"/></button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Conteúdo do Texto</label>
                        <textarea className="w-full border rounded-xl p-3 text-sm h-64 leading-relaxed" value={selectedSection.content.body} onChange={e => updateSectionContent(selectedSection.id, 'body', e.target.value)} />
                      </div>
                    </>
                  )}

                  {selectedSection.type === 'image' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">URL da Imagem</label>
                        <input type="text" className="w-full border rounded-xl p-3 text-xs font-mono" value={selectedSection.content.url} onChange={e => updateSectionContent(selectedSection.id, 'url', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Legenda (Alt Text)</label>
                        <input type="text" className="w-full border rounded-xl p-3 text-sm" value={selectedSection.content.caption} onChange={e => updateSectionContent(selectedSection.id, 'caption', e.target.value)} />
                      </div>
                    </>
                  )}

                  {selectedSection.type === 'video' && (
                    <>
                       <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Código Embed do YouTube</label>
                        <textarea className="w-full border rounded-xl p-3 text-xs font-mono h-32" value={selectedSection.content.embedCode} onChange={e => updateSectionContent(selectedSection.id, 'embedCode', e.target.value)} />
                        <p className="text-[9px] text-slate-400 mt-2 font-medium leading-relaxed">Vá no YouTube, clique em Compartilhar &gt; Incorporar e cole o código iframe aqui.</p>
                      </div>
                    </>
                  )}

                  {selectedSection.type === 'cta' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Texto da Chamada</label>
                        <input type="text" className="w-full border rounded-xl p-3 text-sm font-bold" value={selectedSection.content.text} onChange={e => updateSectionContent(selectedSection.id, 'text', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Texto do Botão</label>
                        <input type="text" className="w-full border rounded-xl p-3 text-sm" value={selectedSection.content.buttonText} onChange={e => updateSectionContent(selectedSection.id, 'buttonText', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Link de Destino</label>
                        <input type="text" className="w-full border rounded-xl p-3 text-xs font-mono" value={selectedSection.content.buttonLink} onChange={e => updateSectionContent(selectedSection.id, 'buttonLink', e.target.value)} />
                      </div>
                    </>
                  )}
               </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-300">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Settings size={16} /> Configurações Gerais
              </h3>
              <section className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800">SEO & Compartilhamento</h4>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Título da Página (Meta Title)</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-xl text-sm" defaultValue={lp.name} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Descrição (Meta Description)</label>
                  <textarea className="w-full px-4 py-2 border rounded-xl text-sm h-24 resize-none" placeholder="Descrição para os buscadores..." />
                </div>
              </section>

              <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex flex-col items-center text-center gap-4">
                 <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-600">
                    <Info size={24}/>
                 </div>
                 <p className="text-xs font-medium text-indigo-700 leading-relaxed">Selecione um bloco no centro para editar suas propriedades específicas.</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { 
  ArrowLeft, Monitor, Smartphone, Save, Send, Eye, X, 
  Layers, List, Type, MousePointer2, Image as ImageIcon, Box, 
  ChevronRight, Settings, Plus, Layout, Grid, MoreVertical,
  Undo, Redo, Smartphone as MobileIcon, Monitor as DesktopIcon,
  Search, Palette, Check, AlertCircle, Loader2
} from 'lucide-react';
import { LandingPage } from '../types';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

interface LandingPageEditorProps {
  lp: LandingPage;
  onBack: () => void;
}

const COMPONENTS = [
  { id: 'section', label: 'Seção', icon: Layout },
  { id: 'line', label: 'Linha', icon: List },
  { id: 'column', label: 'Coluna', icon: Grid },
  { id: 'box', label: 'Caixa', icon: Box },
  { id: 'text', label: 'Texto', icon: Type },
  { id: 'button', label: 'Botão (CTA)', icon: MousePointer2 },
  { id: 'image', label: 'Imagem', icon: ImageIcon },
];

export const LandingPageEditor: React.FC<LandingPageEditorProps> = ({ lp, onBack }) => {
  const [activeView, setActiveView] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'components' | 'page'>('components');
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState(lp.content || { sections: [] });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await appBackend.saveLandingPage({
        ...lp,
        content,
        updatedAt: new Date().toISOString()
      });
      alert("Salvo com sucesso!");
    } catch (e) {
      alert("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const publish = async () => {
    if (!window.confirm("Publicar esta página agora? Ela ficará visível no domínio selecionado.")) return;
    setIsSaving(true);
    try {
      await appBackend.saveLandingPage({
        ...lp,
        content,
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
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-teal-600 font-bold text-sm transition-colors border border-slate-200 px-3 py-1.5 rounded-lg">
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Página</span>
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
          <button className="text-slate-500 hover:text-teal-600 font-bold text-sm px-4">Pré-visualizar</button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="text-teal-600 hover:bg-teal-50 border border-teal-200 font-bold text-sm px-6 py-2 rounded-xl transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Salvar'}
          </button>
          <button 
            onClick={publish}
            className="bg-teal-600 hover:bg-teal-700 text-white font-black text-sm px-8 py-2 rounded-xl shadow-lg transition-all active:scale-95"
          >
            Salvar e avançar
          </button>
        </div>
      </header>

      {/* Editor Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Components */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="flex border-b border-slate-100">
            <button 
              onClick={() => setActiveTab('components')}
              className={clsx(
                "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2",
                activeTab === 'components' ? "border-teal-600 text-teal-700 bg-teal-50/30" : "border-transparent text-slate-400"
              )}
            >
              Componentes
            </button>
            <button 
              onClick={() => setActiveTab('page')}
              className={clsx(
                "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2",
                activeTab === 'page' ? "border-teal-600 text-teal-700 bg-teal-50/30" : "border-transparent text-slate-400"
              )}
            >
              Página
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            {activeTab === 'components' ? (
              <div className="space-y-6">
                <p className="text-xs text-slate-500 leading-relaxed">Escolha o componente que deseja adicionar no documento e arraste até a área da direita</p>
                <div className="grid grid-cols-2 gap-4">
                  {COMPONENTS.map(comp => (
                    <div 
                      key={comp.id}
                      className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm hover:border-teal-400 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                        <comp.icon size={24} />
                      </div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{comp.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cor de Fundo da Página</label>
                   <input type="color" className="w-full h-10 border rounded-lg" defaultValue="#ffffff" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Largura Máxima</label>
                   <select className="w-full border rounded-lg p-2 text-sm">
                     <option>1140px (Padrão)</option>
                     <option>960px</option>
                     <option>100% (Fluido)</option>
                   </select>
                 </div>
              </div>
            )}
          </div>
        </aside>

        {/* Editor Workspace */}
        <main className="flex-1 overflow-auto bg-slate-100 p-8 flex flex-col items-center custom-scrollbar relative">
          <div 
            className={clsx(
              "bg-white shadow-2xl transition-all duration-500 min-h-full border border-slate-200 relative group",
              activeView === 'desktop' ? "w-[1140px]" : "w-[375px]"
            )}
          >
            {/* Canvas Header / Template Preview */}
            <div className="bg-[#1e1e1e] p-10 text-center relative overflow-hidden">
               <div className="absolute top-4 left-4 p-2 border-2 border-white/20 rounded-lg text-white/40 text-[8px] font-bold uppercase tracking-[0.4em]">
                  LOGO
               </div>
               <h1 className="text-4xl font-black text-amber-500 leading-tight mb-4">
                 Primeira aula grátis <br/>
                 <span className="text-white">[NOME DO CURSO]</span>
               </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
               <div className="p-12 space-y-6">
                 <h2 className="text-3xl font-black text-slate-800 leading-tight">Quer ter certeza que este curso é o melhor para você?</h2>
                 <p className="text-lg text-slate-500 leading-relaxed">Assista gratuitamente a primeira aula e tenha a certeza de que este curso é exatamente o que você está buscando.</p>
                 <div className="h-48 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center">
                    <ImageIcon size={48} className="text-slate-200" />
                 </div>
               </div>
               <div className="bg-amber-500 p-12 flex flex-col items-center justify-center">
                  <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm space-y-6">
                     <h3 className="text-xl font-black text-slate-800 text-center leading-tight">Preencha o formulário abaixo para receber a aula</h3>
                     <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">Nome*</label>
                          <input type="text" className="w-full border rounded-lg p-2 text-sm" placeholder="Seu nome" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">Email*</label>
                          <input type="email" className="w-full border rounded-lg p-2 text-sm" placeholder="seu@email.com" />
                        </div>
                        <button className="w-full bg-teal-600 text-white font-black py-4 rounded-xl shadow-lg shadow-teal-600/20">Receber aula agora</button>
                     </div>
                  </div>
               </div>
            </div>

            {/* Empty Area Overlay when nothing selected */}
            <div className="absolute inset-0 border-2 border-transparent hover:border-teal-500/30 transition-all pointer-events-none"></div>
          </div>

          {/* Quick Floating Controls */}
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl z-50">
             <button className="p-2 hover:bg-white/10 rounded-lg"><Undo size={18}/></button>
             <button className="p-2 hover:bg-white/10 rounded-lg"><Redo size={18}/></button>
             <div className="h-4 w-px bg-white/20 mx-2"></div>
             <span className="text-xs font-bold opacity-60">Pronto para publicar?</span>
             <button onClick={publish} className="bg-teal-50 hover:bg-teal-400 text-white px-6 py-1.5 rounded-full font-black text-xs uppercase tracking-widest transition-all">Publicar Agora</button>
          </div>
        </main>

        {/* Right Sidebar: Settings (Contextual) */}
        <aside className="w-80 bg-white border-l border-slate-200 p-6 overflow-y-auto custom-scrollbar shrink-0">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Settings size={16} /> Configurações Gerais
          </h3>
          <div className="space-y-8">
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

            <section className="space-y-4 pt-8 border-t">
              <h4 className="text-sm font-bold text-slate-800">Script de Rastreamento</h4>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Adicione códigos do Google Analytics, Facebook Pixel ou Tag Manager.</p>
              <textarea className="w-full px-4 py-2 border rounded-xl text-[10px] font-mono h-32 bg-slate-50" placeholder="<script>...</script>" />
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
};


import React from 'react';
import { LandingPage, LandingPageSection } from '../types';
import { 
  CheckCircle2, ArrowRight, MessageSquare, ChevronRight, 
  HelpCircle, ShieldCheck, CreditCard, Award, GraduationCap, Smartphone, AlertCircle, Edit2, Info, CheckCircle
} from 'lucide-react';
import clsx from 'clsx';

interface LandingPagePublicViewerProps {
  landingPage: LandingPage | null;
}

export const LandingPagePublicViewer: React.FC<LandingPagePublicViewerProps> = ({ landingPage }) => {
  if (!landingPage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="animate-spin text-orange-600 mb-4 h-10 w-10 border-4 border-current border-t-transparent rounded-full" />
        <h1 className="text-xl font-bold text-slate-800">Carregando conteúdo...</h1>
      </div>
    );
  }

  const sections = landingPage.content?.sections || [];

  const renderSection = (section: LandingPageSection) => {
    switch (section.type) {
      case 'hero':
        const hero = section.content;
        return (
          <header key={section.id} className="pt-32 pb-20 px-6 bg-gradient-to-br from-slate-50 to-white overflow-hidden relative">
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-orange-100/50 rounded-full blur-3xl"></div>
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10 text-center lg:text-left">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mx-auto lg:mx-0">
                    <Award size={14}/> Formação Profissional Premium
                </div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
                    {hero.headline}
                </h1>
                {hero.subheadline && (
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                    {hero.subheadline}
                    </p>
                )}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                    <a href="#pricing" className="w-full sm:w-auto bg-orange-600 text-white px-10 py-5 rounded-2xl font-black text-base uppercase tracking-widest shadow-2xl shadow-orange-600/20 hover:bg-orange-700 transition-all transform hover:scale-105 text-center">
                    {hero.ctaText}
                    </a>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <ShieldCheck size={16} className="text-teal-500" /> Garantia incondicional de 7 dias
                    </div>
                </div>
              </div>

              <div className="relative">
                  {hero.imageUrl ? (
                      <div className="rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white animate-in zoom-in-95 duration-700">
                          <img src={hero.imageUrl} className="w-full h-auto" alt="Destaque" />
                      </div>
                  ) : (
                      <div className="aspect-video bg-slate-100 rounded-[3rem] flex items-center justify-center text-slate-300">
                          <div className="text-slate-200"><Info size={80} /></div>
                      </div>
                  )}
                  <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-xl border border-slate-100 hidden md:block">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">100%</div>
                          <p className="text-xs font-black text-slate-800 uppercase leading-tight">Satisfação<br/>Garantida</p>
                      </div>
                  </div>
              </div>
            </div>
          </header>
        );

      case 'text':
        return (
          <section key={section.id} className="py-24 px-6 bg-slate-50 border-y border-slate-100">
              <div className="max-w-4xl mx-auto text-center lg:text-left space-y-6">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center justify-center lg:justify-start gap-2">
                    <Info className="text-orange-500" size={24}/> {section.content.title || 'Sobre o Produto'}
                </h2>
                <div className="prose prose-lg prose-slate max-w-none">
                    <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {section.content.text}
                    </p>
                </div>
              </div>
          </section>
        );

      case 'features':
        return (
          <section key={section.id} className="py-24 px-6 bg-white">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">{section.content.mainTitle || 'Por que escolher esta formação?'}</h2>
                <div className="h-1.5 w-24 bg-orange-500 mx-auto rounded-full"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {section.content.items?.map((feature: any, i: number) => (
                  <div key={i} className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:border-orange-200 transition-all group text-center lg:text-left">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform mx-auto lg:mx-0">
                      <CheckCircle2 size={24} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-3">{feature.title}</h3>
                    <p className="text-slate-500 leading-relaxed font-medium">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'pricing':
        const pricing = section.content;
        return (
          <section key={section.id} id="pricing" className="py-24 px-6 bg-slate-900 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 -mt-32 -mr-32 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl"></div>
            <div className="max-w-4xl mx-auto text-center relative z-10">
              <h2 className="text-4xl font-black mb-12 tracking-tight">Comece sua transformação hoje</h2>
              <div className="bg-white rounded-[3rem] p-10 md:p-16 text-slate-900 shadow-2xl relative">
                <div className="absolute top-0 right-10 -mt-5 bg-orange-500 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">Oferta por tempo limitado</div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Acesso Imediato por apenas:</p>
                <div className="mb-4">
                  <span className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900">{pricing.price}</span>
                </div>
                {pricing.installments && <p className="text-lg font-bold text-indigo-600 mb-10">Ou em até {pricing.installments}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-10 border-y border-slate-100 py-8">
                   <div className="flex items-center gap-3 text-sm font-bold text-slate-600"><CheckCircle2 className="text-teal-500" size={18}/> Acesso completo à plataforma</div>
                   <div className="flex items-center gap-3 text-sm font-bold text-slate-600"><CheckCircle2 className="text-teal-500" size={18}/> Suporte direto com instrutores</div>
                   <div className="flex items-center gap-3 text-sm font-bold text-slate-600"><CheckCircle2 className="text-teal-500" size={18}/> Certificado Reconhecido</div>
                </div>
                <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 rounded-2xl font-black text-xl uppercase tracking-widest shadow-2xl shadow-orange-600/30 transition-all active:scale-95 mb-6">
                  {pricing.ctaText}
                </button>
                <div className="flex items-center justify-center gap-6 opacity-40">
                    <div className="flex items-center gap-2"><CreditCard size={20}/> <span className="text-[10px] font-black uppercase">Cartão em 12x</span></div>
                    <div className="flex items-center gap-2"><Smartphone size={20}/> <span className="text-[10px] font-black uppercase">Pix à vista</span></div>
                </div>
              </div>
            </div>
          </section>
        );

      case 'faq':
        return (
          <section key={section.id} className="py-24 px-6 bg-slate-50">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight text-center mb-16">Dúvidas Frequentes</h2>
              <div className="space-y-4">
                {section.content.items?.map((item: any, i: number) => (
                  <details key={i} className="bg-white rounded-3xl border border-slate-200 group transition-all">
                    <summary className="p-6 cursor-pointer flex items-center justify-between outline-none">
                      <span className="font-bold text-slate-800">{item.question}</span>
                      <ChevronRight size={20} className="text-slate-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="px-6 pb-6 text-sm text-slate-500 font-medium leading-relaxed">
                      {item.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        );

      case 'image':
        return (
          <section key={section.id} className="py-12 px-6 bg-white flex justify-center">
            <div className="max-w-7xl w-full rounded-[3rem] overflow-hidden shadow-xl border-4 border-slate-50">
               <img src={section.content.url} className="w-full h-auto" alt="Imagem" />
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      {/* Navbar Minimalist */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-8 object-contain" />
          <a href="#pricing" className="bg-slate-900 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all">Quero me inscrever</a>
        </div>
      </nav>

      <main>
        {sections.map(renderSection)}
      </main>

      {/* Footer */}
      <footer className="bg-white py-20 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto text-center space-y-10">
          <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-8 mx-auto grayscale opacity-30" />
          <div className="flex justify-center gap-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-slate-900 transition-colors">Políticas de Privacidade</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Contato</a>
          </div>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} VOLL PILATES GROUP. TODOS OS DIREITOS RESERVADOS.
          </p>
        </div>
      </footer>
    </div>
  );
};

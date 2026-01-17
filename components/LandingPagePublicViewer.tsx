
import React from 'react';
import { LandingPage, LandingPageSection, ElementStyles, LandingPageContent } from '../types';
import { 
  CheckCircle2, ArrowRight, MessageSquare, ChevronRight, 
  HelpCircle, ShieldCheck, CreditCard, Award, GraduationCap, Smartphone, AlertCircle, Info, CheckCircle, Zap, TrendingUp, UserCheck, Star, Users, ListChecks,
  // Fix: Added missing XCircle icon import
  XCircle
} from 'lucide-react';
import { FormViewer } from './FormViewer';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

interface LandingPagePublicViewerProps {
  landingPage: LandingPage | null;
}

export const LandingPagePublicViewer: React.FC<LandingPagePublicViewerProps> = ({ landingPage }) => {
  const [formModel, setFormModel] = React.useState<any>(null);

  React.useEffect(() => {
      const formSection = landingPage?.content?.sections?.find(s => s.type === 'form' && s.content.formId);
      if (formSection) {
          appBackend.getFormById(formSection.content.formId).then(setFormModel);
      }
  }, [landingPage]);

  if (!landingPage || !landingPage.content) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="animate-spin text-indigo-600 mb-4 h-10 w-10 border-4 border-current border-t-transparent rounded-full" />
        <h1 className="text-xl font-bold text-slate-800">Carregando experiência premium...</h1>
      </div>
    );
  }

  const content = landingPage.content as LandingPageContent;
  const sections = content.sections.filter(s => s.enabled);

  const getStyles = (section: LandingPageSection, key: string): React.CSSProperties => {
      const s = section.styles?.[key] || {};
      return {
          fontSize: s.fontSize || undefined,
          fontFamily: s.fontFamily || undefined,
          textAlign: s.textAlign || undefined,
          color: s.color || undefined,
          position: (s.x !== undefined || s.y !== undefined) ? 'absolute' : 'relative',
          left: s.x !== undefined ? `${s.x}%` : undefined,
          top: s.y !== undefined ? `${s.y}%` : undefined,
          transform: (s.x !== undefined || s.y !== undefined) ? 'translate(-50%, -50%)' : undefined,
          width: s.width !== undefined ? `${s.width}%` : undefined,
          maxWidth: '100%'
      };
  };

  const renderSection = (section: LandingPageSection) => {
    const c = section.content;
    const primaryColor = content.theme.primary_color || '#4f46e5';

    switch (section.type) {
      case 'hero':
        return (
          <header key={section.id} className="pt-32 pb-24 px-6 bg-gradient-to-br from-slate-50 to-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-[100px]"></div>
            <div className="max-w-6xl mx-auto text-center relative z-10">
              <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 animate-in slide-in-from-top-4 duration-1000">
                  <Award size={14}/> {content.theme.brand_name} • Certificação Internacional
              </div>
              <h1 
                  style={getStyles(section, 'headline')}
                  className="text-4xl md:text-7xl font-black tracking-tighter text-slate-900 leading-[1.05] mb-8"
              >
                  {c.headline.value}
              </h1>
              <p 
                  style={getStyles(section, 'subheadline')}
                  className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto leading-relaxed font-medium mb-12"
              >
                  {c.subheadline.value}
              </p>
              
              <div className="flex flex-col items-center gap-6">
                  <a 
                      href="#oferta" 
                      className="w-full sm:w-auto px-16 py-6 rounded-3xl font-black text-lg uppercase tracking-widest shadow-2xl transition-all transform hover:scale-105 active:scale-95 text-center text-white"
                      style={{ backgroundColor: primaryColor }}
                  >
                      {c.cta.label.value}
                  </a>
                  <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-teal-500"/> {c.cta.microcopy.value}</span>
                  </div>
              </div>

              <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  {c.bullets?.map((b: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                          <CheckCircle2 size={20} className="text-teal-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-700 text-left">{b.value}</span>
                      </div>
                  ))}
              </div>
            </div>
          </header>
        );

      case 'pain':
        return (
          <section key={section.id} className="py-24 px-6 bg-slate-900 text-white relative">
              <div className="max-w-4xl mx-auto text-center space-y-12">
                  <h2 className="text-3xl md:text-5xl font-black tracking-tight" style={getStyles(section, 'headline')}>{c.headline.value}</h2>
                  <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed" style={getStyles(section, 'description')}>{c.description.value}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {c.consequences?.map((item: any, idx: number) => (
                          <div key={idx} className="flex gap-4 p-6 bg-white/5 border border-white/10 rounded-[2rem] text-left hover:bg-white/10 transition-all">
                              <XCircle className="text-red-500 shrink-0" size={24} />
                              <span className="text-sm font-medium text-slate-200">{item.value}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </section>
        );

      case 'benefits':
        return (
          <section key={section.id} className="py-24 px-6 bg-white">
              <div className="max-w-6xl mx-auto text-center">
                  <h2 className="text-3xl md:text-5xl font-black mb-16 tracking-tight">{c.headline.value}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {c.items?.map((item: any, idx: number) => (
                          <div key={idx} className="p-10 rounded-[3rem] bg-slate-50 border border-slate-100 flex flex-col items-center text-center group hover:bg-white hover:shadow-2xl transition-all">
                              <div className="w-16 h-16 bg-white rounded-3xl shadow-md flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-110 transition-transform">
                                  <Star size={32} />
                              </div>
                              <h3 className="text-xl font-black text-slate-800 mb-4">{item.title.value}</h3>
                              <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.description.value}</p>
                          </div>
                      ))}
                  </div>
              </div>
          </section>
        );

      case 'modules':
        return (
            <section key={section.id} className="py-24 px-6 bg-slate-50">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-black text-center mb-16 tracking-tight">{c.headline.value}</h2>
                    <div className="space-y-4">
                        {c.items?.map((item: any, idx: number) => (
                            <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex gap-6 items-center hover:shadow-md transition-all">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center font-black text-indigo-600 text-lg shrink-0">
                                    {idx + 1}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-slate-800 uppercase tracking-tighter text-base">{item.title.value}</h4>
                                    <p className="text-xs text-slate-400 font-bold mt-1">{item.description.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );

      case 'pricing':
        return (
          <section key={section.id} id="oferta" className="py-24 px-6 bg-indigo-600 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-24 -mr-24 w-[600px] h-[600px] bg-white/10 rounded-full blur-[120px]"></div>
              <div className="max-w-4xl mx-auto text-center relative z-10">
                  <h2 className="text-3xl md:text-6xl font-black mb-12 tracking-tight">{c.headline.value}</h2>
                  <div className="bg-white rounded-[4rem] p-12 md:p-20 text-slate-900 shadow-2xl shadow-black/30">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Acesso Imediato por apenas:</p>
                      <div className="mb-10 flex flex-col md:flex-row items-center justify-center gap-2">
                          <span className="text-2xl md:text-4xl font-bold text-slate-400 line-through opacity-50">{c.original_price?.value}</span>
                          <span className="text-5xl md:text-8xl font-black tracking-tighter text-indigo-600">{c.price.value}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-12 border-y border-slate-100 py-10">
                         {c.features?.map((f: any, idx: number) => (
                             <div key={idx} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                 <CheckCircle2 className="text-teal-500" size={20}/> {f.value}
                             </div>
                         ))}
                      </div>
                      <a 
                          href={c.cta_url.value || "#"}
                          className="block w-full py-7 rounded-[2rem] font-black text-xl uppercase tracking-[0.15em] shadow-2xl transition-all transform hover:scale-[1.02] active:scale-95 text-white"
                          style={{ backgroundColor: primaryColor }}
                      >
                        {c.cta_label.value}
                      </a>
                      <div className="mt-8 flex items-center justify-center gap-8 opacity-40 grayscale">
                          <CreditCard size={32} />
                          <Smartphone size={32} />
                          <CheckCircle size={32} />
                      </div>
                  </div>
              </div>
          </section>
        );

      case 'faq':
        return (
          <section key={section.id} className="py-24 px-6 bg-white">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight text-center mb-16">Dúvidas Frequentes</h2>
              <div className="space-y-4">
                {c.items?.map((item: any, idx: number) => (
                  <details key={idx} className="bg-slate-50 rounded-[2rem] border border-slate-100 group transition-all">
                    <summary className="p-8 cursor-pointer flex items-center justify-between outline-none">
                      <span className="font-bold text-slate-800 text-lg leading-tight">{item.question.value}</span>
                      <ChevronRight size={20} className="text-slate-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="px-8 pb-8 text-slate-500 font-medium leading-relaxed">
                      {item.answer.value}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        );

      case 'footer':
        return (
            <footer key={section.id} className="py-16 px-6 bg-slate-50 border-t border-slate-100 text-center">
                <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="Logo" className="h-8 mx-auto mb-8 grayscale opacity-40" />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
                    &copy; {new Date().getFullYear()} {content.theme.brand_name} • Todos os Direitos Reservados
                </p>
            </footer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-4 flex justify-between items-center">
          <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-6 object-contain" />
          <a href="#oferta" className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95">Inscrição Imediata</a>
      </nav>

      <main>
        {sections.map(renderSection)}
      </main>
    </div>
  );
};

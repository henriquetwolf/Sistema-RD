
import React from 'react';
import { LandingPage, LandingPageSection, ElementStyles, LandingPageContent } from '../types';
import { 
  CheckCircle2, ArrowRight, MessageSquare, ChevronRight, 
  HelpCircle, ShieldCheck, CreditCard, Award, GraduationCap, Smartphone, AlertCircle, Info, CheckCircle, Zap, TrendingUp, UserCheck, Star, Users, ListChecks,
  XCircle, PlayCircle, BookOpen, Quote, Shield, Check, X
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { FormViewer } from './FormViewer';
import clsx from 'clsx';

interface LandingPagePublicViewerProps {
  landingPage: LandingPage | null;
}

export const LandingPagePublicViewer: React.FC<LandingPagePublicViewerProps> = ({ landingPage }) => {
  if (!landingPage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="animate-spin text-indigo-600 mb-4 h-10 w-10 border-4 border-current border-t-transparent rounded-full" />
        <h1 className="text-xl font-bold text-slate-800">Carregando experiência premium...</h1>
      </div>
    );
  }

  const content = React.useMemo(() => {
    if (!landingPage.content) return null;
    return typeof landingPage.content === 'string' ? JSON.parse(landingPage.content) : landingPage.content;
  }, [landingPage.content]) as LandingPageContent;

  const [availableForms, setAvailableForms] = React.useState<any[]>([]);

  React.useEffect(() => {
      appBackend.getForms().then(setAvailableForms);
  }, []);

  if (!content || !content.sections) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <AlertCircle className="text-amber-500 mb-4" size={48} />
          <h1 className="text-xl font-bold text-slate-800">Página sem conteúdo</h1>
          <p className="text-slate-500">Esta landing page ainda não foi configurada.</p>
        </div>
    );
  }

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

  const renderDynamicContent = (section: LandingPageSection, key: string, field: any) => {
      if (!field) return null;
      const value = typeof field === 'object' ? field.value : field;
      const styles = getStyles(section, key);

      if (field.type === 'image') {
          return <img key={key} src={value} style={styles} className="rounded-2xl shadow-lg mx-auto" alt="Page element" />;
      }
      if (field.type === 'video') {
          return <div key={key} style={styles} className="aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black mx-auto" dangerouslySetInnerHTML={{ __html: value }}></div>;
      }
      if (field.type === 'form') {
          const formData = availableForms.find(f => f.id === value);
          if (!formData) return null;
          return (
              <div key={key} style={styles} className="mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 p-8">
                  <FormViewer form={formData} isPublic={true} />
              </div>
          );
      }
      return null;
  };

  const renderSection = (section: LandingPageSection) => {
    const c = section.content;
    const primaryColor = content.theme.primary_color || '#4f46e5';

    if (!c) return null;

    const dynamicKeys = Object.keys(c).filter(k => k.includes('_'));

    switch (section.type) {
      case 'hero':
        return (
          <header key={section.id} className="pt-32 pb-24 px-6 bg-gradient-to-br from-slate-50 to-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-[100px]"></div>
            <div className="max-w-6xl mx-auto text-center relative z-10">
              <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 animate-in slide-in-from-top-4 duration-1000">
                  <Award size={14}/> {content.theme.brand_name} • Certificação Internacional
              </div>
              <h1 style={getStyles(section, 'headline')} className="text-4xl md:text-7xl font-black tracking-tighter text-slate-900 leading-[1.05] mb-8">{c.headline?.value}</h1>
              <p style={getStyles(section, 'subheadline')} className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto leading-relaxed font-medium mb-12">{c.subheadline?.value}</p>
              
              <div className="flex flex-col items-center gap-6">
                  <a href={c.cta?.href || "#oferta"} className="w-full sm:w-auto px-16 py-6 rounded-3xl font-black text-lg uppercase tracking-widest shadow-2xl transition-all transform hover:scale-105 active:scale-95 text-center text-white" style={{ backgroundColor: primaryColor }}>{c.cta?.label?.value || 'QUERO ME INSCREVER'}</a>
                  <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-teal-500"/> {c.cta?.microcopy?.value}</span>
                  </div>
              </div>

              {dynamicKeys.map(k => renderDynamicContent(section, k, c[k]))}

              <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  {c.bullets?.map((b: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-left">
                          <CheckCircle2 size={20} className="text-teal-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-700">{b.value}</span>
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
                  <h2 className="text-3xl md:text-5xl font-black tracking-tight" style={getStyles(section, 'headline')}>{c.headline?.value}</h2>
                  <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed" style={getStyles(section, 'description')}>{c.description?.value}</p>
                  
                  {dynamicKeys.map(k => renderDynamicContent(section, k, c[k]))}

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

      case 'method':
        return (
            <section key={section.id} className="py-24 px-6 bg-white">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div className="space-y-6">
                        <div className="inline-block bg-indigo-50 text-indigo-700 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">O Diferencial</div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">{c.headline?.value}</h2>
                        <p className="text-lg text-slate-500 leading-relaxed">{c.description?.value}</p>
                        
                        {dynamicKeys.map(k => renderDynamicContent(section, k, c[k]))}

                        <div className="space-y-4 pt-4">
                            {c.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-white"><Check size={14} /></div>
                                    <span className="font-bold text-slate-700">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-slate-100 rounded-[3rem] aspect-square flex items-center justify-center relative overflow-hidden">
                        <PlayCircle size={80} className="text-white/50 absolute z-10" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-teal-500/20"></div>
                        <img src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover" alt="Method" />
                    </div>
                </div>
            </section>
        );

      case 'benefits':
        return (
          <section key={section.id} className="py-24 px-6 bg-slate-50">
              <div className="max-w-6xl mx-auto text-center">
                  <h2 className="text-3xl md:text-5xl font-black mb-16 tracking-tight">{c.headline?.value}</h2>
                  
                  {dynamicKeys.map(k => renderDynamicContent(section, k, c[k]))}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                      {c.items?.map((item: any, idx: number) => (
                          <div key={idx} className="p-10 rounded-[3rem] bg-white border border-slate-100 flex flex-col items-center text-center group hover:shadow-2xl transition-all">
                              <div className="w-16 h-16 bg-indigo-50 rounded-3xl shadow-sm flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-110 transition-transform">
                                  <Star size={32} />
                              </div>
                              <h3 className="text-xl font-black text-slate-800 mb-4">{item.title?.value || item.title}</h3>
                              <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.description?.value || item.description}</p>
                          </div>
                      ))}
                  </div>
              </div>
          </section>
        );

      case 'modules':
        return (
            <section key={section.id} className="py-24 px-6 bg-white">
                <div className="max-w-5xl mx-auto text-center">
                    <h2 className="text-3xl md:text-5xl font-black text-center mb-16 tracking-tight">{c.headline?.value}</h2>
                    
                    {dynamicKeys.map(k => renderDynamicContent(section, k, c[k]))}

                    <div className="space-y-4 mt-12">
                        {c.items?.map((item: any, idx: number) => (
                            <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm flex gap-6 items-center hover:bg-white hover:shadow-md transition-all text-left">
                                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center font-black text-indigo-600 text-lg shrink-0">
                                    {idx + 1}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-slate-800 uppercase tracking-tighter text-base">{item.title?.value || item.title}</h4>
                                    <p className="text-xs text-slate-400 font-bold mt-1">{item.description?.value || item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );

      case 'bonuses':
        return (
            <section key={section.id} className="py-24 px-6 bg-indigo-900 text-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-block bg-orange-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">Presentes Exclusivos</div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight">{c.headline?.value}</h2>
                        {dynamicKeys.map(k => renderDynamicContent(section, k, c[k]))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {c.items?.map((item: any, idx: number) => (
                            <div key={idx} className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-[2.5rem] relative overflow-hidden group hover:bg-white/20 transition-all text-left">
                                <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-orange-500 text-white px-6 py-2 rounded-bl-3xl font-black text-[10px] uppercase tracking-widest z-10">Bônus {idx+1}</div>
                                <div className="p-3 bg-white/10 rounded-2xl w-fit mb-6 text-orange-400 group-hover:scale-110 transition-transform"><Zap size={24}/></div>
                                <h4 className="text-xl font-black mb-2">{item.title?.value || item.title}</h4>
                                <p className="text-sm text-indigo-100/70 leading-relaxed">{item.description?.value || item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );

      case 'testimonials':
        return (
            <section key={section.id} className="py-24 px-6 bg-white">
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-3xl md:text-5xl font-black mb-16 tracking-tight">{c.headline?.value}</h2>
                    {dynamicKeys.map(k => renderDynamicContent(section, k, c[k]))}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
                        {c.items?.map((item: any, idx: number) => (
                            <div key={idx} className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 flex flex-col items-start text-left">
                                <Quote size={40} className="text-indigo-200 mb-6" />
                                <p className="text-slate-600 italic mb-8 flex-1 leading-relaxed">"{item.content?.value || item.content}"</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-100"></div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{item.author?.value || item.author}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-black">{item.role?.value || item.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );

      case 'pricing':
        return (
          <section key={section.id} id="oferta" className="py-24 px-6 bg-slate-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-24 -mr-24 w-[600px] h-[600px] bg-indigo-100 rounded-full blur-[120px]"></div>
              <div className="max-w-4xl mx-auto text-center relative z-10">
                  <h2 className="text-3xl md:text-6xl font-black mb-12 tracking-tight text-slate-900">{c.headline?.value}</h2>
                  {dynamicKeys.map(k => renderDynamicContent(section, k, c[k]))}
                  <div className="bg-white rounded-[4rem] p-12 md:p-20 text-slate-900 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.15)] border border-slate-100 mt-12">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Investimento com desconto:</p>
                      <div className="mb-10 flex flex-col md:flex-row items-center justify-center gap-2">
                          {c.original_price?.value && <span className="text-2xl md:text-4xl font-bold text-slate-300 line-through">{c.original_price.value}</span>}
                          <span className="text-5xl md:text-8xl font-black tracking-tighter text-indigo-600">{c.price?.value}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-12 border-y border-slate-100 py-10">
                         {c.features?.map((f: any, idx: number) => (
                             <div key={idx} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                 <CheckCircle2 className="text-teal-500" size={20}/> {f.value || f}
                             </div>
                         ))}
                      </div>
                      <a 
                          href={c.cta_url?.value || "#"}
                          className="block w-full py-7 rounded-[2rem] font-black text-xl uppercase tracking-[0.15em] shadow-2xl transition-all transform hover:scale-[1.02] active:scale-95 text-white text-center"
                          style={{ backgroundColor: primaryColor }}
                      >
                        {c.cta_label?.value || 'GARANTIR MINHA VAGA'}
                      </a>
                      <div className="mt-8 flex items-center justify-center gap-8 opacity-30 grayscale">
                          <CreditCard size={32} />
                          <Smartphone size={32} />
                          <CheckCircle size={32} />
                      </div>
                  </div>
              </div>
          </section>
        );

      case 'guarantee':
        return (
            <section key={section.id} className="py-24 px-6 bg-white">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12 bg-slate-50 p-12 rounded-[3rem] border border-slate-100">
                    <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center shadow-xl shrink-0">
                        <Shield className="text-teal-500" size={80} />
                    </div>
                    <div className="text-center md:text-left space-y-4">
                        <h2 className="text-3xl font-black text-slate-900">{c.headline?.value}</h2>
                        <p className="text-lg text-slate-600 leading-relaxed">{c.description?.value}</p>
                        {dynamicKeys.map(k => renderDynamicContent(section, k, c[k]))}
                    </div>
                </div>
            </section>
        );

      case 'faq':
        return (
          <section key={section.id} className="py-24 px-6 bg-slate-50">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight text-center mb-16">Dúvidas Frequentes</h2>
              {dynamicKeys.map(k => renderDynamicContent(section, k, c[k]))}
              <div className="space-y-4 mt-12">
                {c.items?.map((item: any, idx: number) => (
                  <details key={idx} className="bg-white rounded-[2rem] border border-slate-100 group transition-all text-left shadow-sm">
                    <summary className="p-8 cursor-pointer flex items-center justify-between outline-none list-none">
                      <span className="font-bold text-slate-800 text-lg leading-tight">{item.question?.value || item.question}</span>
                      <ChevronRight size={20} className="text-slate-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="px-8 pb-8 text-slate-500 font-medium leading-relaxed">
                      {item.answer?.value || item.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        );

      case 'footer':
        return (
            <footer key={section.id} className="py-16 px-6 bg-slate-900 text-center text-white">
                <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="Logo" className="h-8 mx-auto mb-8 invert opacity-50" />
                {dynamicKeys.map(k => renderDynamicContent(section, k, c[k]))}
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-8">
                    &copy; {new Date().getFullYear()} {content.theme.brand_name} • Todos os Direitos Reservados
                </p>
                <div className="mt-8 flex justify-center gap-6 text-slate-500">
                    <a href="#" className="hover:text-white transition-colors">Políticas de Privacidade</a>
                    <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
                </div>
            </footer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-4 flex justify-between items-center shadow-sm">
          <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-6 object-contain" />
          <a href="#oferta" className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95">Inscrição Imediata</a>
      </nav>

      <main>
        {sections.map(renderSection)}
      </main>
    </div>
  );
};

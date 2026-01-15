
import React from 'react';
import { LandingPage } from '../types';
import { 
  CheckCircle2, ArrowRight, MessageSquare, ChevronRight, 
  HelpCircle, ShieldCheck, CreditCard, Award, GraduationCap, Smartphone
} from 'lucide-react';
import clsx from 'clsx';

interface LandingPagePublicViewerProps {
  landingPage: LandingPage;
}

export const LandingPagePublicViewer: React.FC<LandingPagePublicViewerProps> = ({ landingPage }) => {
  const content = landingPage?.content || {
      hero: { headline: 'Carregando...', subheadline: '', ctaText: 'Saiba Mais' },
      features: [],
      pricing: { price: 'Sob Consulta', installments: '', ctaText: 'Comprar Agora' },
      faq: []
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

      {/* Hero Section */}
      <header className="pt-32 pb-20 px-6 bg-gradient-to-br from-slate-50 to-white overflow-hidden relative">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-orange-100/50 rounded-full blur-3xl"></div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-8 animate-bounce-subtle">
            <Award size={14}/> Formação Profissional Premium
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-8 leading-[1.1]">
            {content.hero?.headline || 'Headline'}
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            {content.hero?.subheadline || ''}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#pricing" className="w-full sm:w-auto bg-orange-600 text-white px-10 py-5 rounded-2xl font-black text-base uppercase tracking-widest shadow-2xl shadow-orange-600/20 hover:bg-orange-700 transition-all transform hover:scale-105">
              {content.hero?.ctaText || 'CTA'}
            </a>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
               <ShieldCheck size={16} className="text-teal-500" /> Garantia incondicional de 7 dias
            </div>
          </div>
        </div>
      </header>

      {/* Features/Benefits */}
      {content.features && content.features.length > 0 && (
          <section className="py-24 px-6 bg-white">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Por que escolher esta formação?</h2>
                <div className="h-1.5 w-24 bg-orange-500 mx-auto rounded-full"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {content.features.map((feature, i) => (
                  <div key={i} className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:border-orange-200 transition-all group">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                      <CheckCircle2 size={24} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-3">{feature.title || ''}</h3>
                    <p className="text-slate-500 leading-relaxed font-medium">{feature.description || ''}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
      )}

      {/* Pricing / Offer */}
      <section id="pricing" className="py-24 px-6 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 -mt-32 -mr-32 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl font-black mb-12 tracking-tight">Comece sua transformação hoje</h2>
          
          <div className="bg-white rounded-[3rem] p-10 md:p-16 text-slate-900 shadow-2xl relative">
            <div className="absolute top-0 right-10 -mt-5 bg-orange-500 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">Oferta por tempo limitado</div>
            
            <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Acesso Imediato por apenas:</p>
            <div className="mb-4">
              <span className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900">{content.pricing?.price || 'Sob Consulta'}</span>
            </div>
            {content.pricing?.installments && <p className="text-lg font-bold text-indigo-600 mb-10">Ou em até {content.pricing.installments}</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-10 border-y border-slate-100 py-8">
               <div className="flex items-center gap-3 text-sm font-bold text-slate-600"><CheckCircle2 className="text-teal-500" size={18}/> Acesso completo à plataforma</div>
               <div className="flex items-center gap-3 text-sm font-bold text-slate-600"><CheckCircle2 className="text-teal-500" size={18}/> Suporte direto com instrutores</div>
               <div className="flex items-center gap-3 text-sm font-bold text-slate-600"><CheckCircle2 className="text-teal-500" size={18}/> Certificado Reconhecido</div>
               <div className="flex items-center gap-3 text-sm font-bold text-slate-600"><CheckCircle2 className="text-teal-500" size={18}/> Materiais para download</div>
            </div>

            <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 rounded-2xl font-black text-xl uppercase tracking-widest shadow-2xl shadow-orange-600/30 transition-all active:scale-95 mb-6">
              {content.pricing?.ctaText || 'Matricular-se'}
            </button>
            
            <div className="flex items-center justify-center gap-6 opacity-40">
                <div className="flex items-center gap-2"><CreditCard size={20}/> <span className="text-[10px] font-black uppercase">Cartão em 12x</span></div>
                <div className="flex items-center gap-2"><Smartphone size={20}/> <span className="text-[10px] font-black uppercase">Pix à vista</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      {content.faq && content.faq.length > 0 && (
          <section className="py-24 px-6 bg-slate-50">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight text-center mb-16">Dúvidas Frequentes</h2>
              <div className="space-y-4">
                {content.faq.map((item, i) => (
                  <details key={i} className="bg-white rounded-3xl border border-slate-200 group transition-all">
                    <summary className="p-6 cursor-pointer flex items-center justify-between">
                      <span className="font-bold text-slate-800">{item.question || ''}</span>
                      <ChevronRight size={20} className="text-slate-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="px-6 pb-6 text-sm text-slate-500 font-medium leading-relaxed">
                      {item.answer || ''}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>
      )}

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

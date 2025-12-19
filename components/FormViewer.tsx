
import React, { useState, useEffect } from 'react';
import { FormModel, FormAnswer } from '../types';
import { CheckCircle, ArrowLeft, Loader2, Send } from 'lucide-react';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

interface FormViewerProps {
  form: FormModel;
  onBack?: () => void;
  isPublic?: boolean;
}

export const FormViewer: React.FC<FormViewerProps> = ({ form, onBack, isPublic = false }) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEmbed, setIsEmbed] = useState(false);

  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('embed') === 'true') {
          setIsEmbed(true);
      }
  }, []);

  const handleInputChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
      const current = (answers[questionId] as string[]) || [];
      const updated = checked ? [...current, option] : current.filter(o => o !== option);
      handleInputChange(questionId, updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formattedAnswers: FormAnswer[] = form.questions.map(q => {
          let val = answers[q.id];
          if (Array.isArray(val)) val = val.join(', ');
          return {
              questionId: q.id,
              questionTitle: q.title,
              value: String(val || '')
          };
      });

      await appBackend.submitForm(form.id, formattedAnswers, form.isLeadCapture);
      setIsSuccess(true);
    } catch (err) {
      alert("Erro ao enviar formulário. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const style = form.style || { 
      backgroundType: 'color', 
      backgroundColor: '#f1f5f9',
      primaryColor: '#0d9488',
      textColor: '#1e293b',
      fontFamily: 'sans',
      titleAlignment: 'left',
      borderRadius: 'medium',
      buttonText: 'Enviar Formulário',
      shadowIntensity: 'soft'
  };

  const getBackgroundStyle = () => {
      if (isEmbed) return { backgroundColor: 'transparent' };
      if (style.backgroundType === 'image' && style.backgroundImage) {
          return { backgroundImage: `url(${style.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' };
      }
      if (style.backgroundType === 'color') return { backgroundColor: style.backgroundColor };
      if (style.backgroundType === 'texture' && style.backgroundTexture) {
          switch(style.backgroundTexture) {
              case 'dots': return { backgroundColor: '#f8fafc', backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' };
              case 'grid': return { backgroundColor: '#f8fafc', backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' };
              case 'diagonal': return { backgroundColor: '#f1f5f9', backgroundImage: 'repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 10px, #f1f5f9 10px, #f1f5f9 20px)' };
              default: return { backgroundColor: '#f1f5f9' };
          }
      }
      return { backgroundColor: '#ffffff' }; 
  };

  const borderRadiusClass = {
      none: 'rounded-none',
      small: 'rounded-lg',
      medium: 'rounded-2xl',
      large: 'rounded-[2.5rem]',
      full: 'rounded-[3.5rem]'
  }[style.borderRadius || 'medium'];

  const inputRadiusClass = {
      none: 'rounded-none',
      small: 'rounded-md',
      medium: 'rounded-xl',
      large: 'rounded-2xl',
      full: 'rounded-full'
  }[style.borderRadius || 'medium'];

  const shadowClass = {
      none: '',
      soft: 'shadow-xl',
      strong: 'shadow-[0_20px_50px_rgba(0,0,0,0.2)]'
  }[style.shadowIntensity || 'soft'];

  const fontFamily = {
      sans: 'font-sans',
      serif: 'font-serif',
      modern: 'font-sans tracking-tight'
  }[style.fontFamily || 'sans'];

  if (isSuccess) {
    return (
      <div className={clsx("min-h-screen w-full px-4 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4")} style={getBackgroundStyle()}>
        <div 
            className={clsx("max-w-xl w-full p-12 text-center", style.cardTransparent || isEmbed ? "bg-white/80 backdrop-blur-sm shadow-xl border border-slate-100" : "bg-white shadow-xl", borderRadiusClass, fontFamily)}
            style={{ color: style.textColor }}
        >
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                <CheckCircle size={48} />
            </div>
            <h2 className="text-3xl font-black mb-2">Enviado com Sucesso!</h2>
            <p className="opacity-70 mb-10 text-lg">Recebemos suas informações. Entraremos em contato em breve.</p>
            {!isPublic && onBack && <button onClick={onBack} className="hover:underline font-bold block mx-auto mb-2 text-sm opacity-60">Voltar ao Painel</button>}
            {isPublic && <button onClick={() => window.location.reload()} className="text-white px-8 py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all" style={{ backgroundColor: style.primaryColor }}>Enviar outra resposta</button>}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("min-h-screen w-full flex flex-col items-center", (isPublic || isEmbed) ? "justify-center py-8" : "py-12", fontFamily)} style={getBackgroundStyle()}>
      <div className={clsx("w-full px-4 animate-in fade-in slide-in-from-bottom-2", isEmbed ? "max-w-full" : "max-w-2xl")}>
        {!isPublic && onBack && !isEmbed && (
            <button onClick={onBack} className="mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors bg-white/50 px-4 py-2 rounded-xl backdrop-blur-sm shadow-sm font-bold text-sm">
                <ArrowLeft size={18} /> Sair do Visualizador
            </button>
        )}

        <div className={clsx("transition-all", (style.cardTransparent || isEmbed) ? "" : clsx("bg-white border border-slate-100", borderRadiusClass, shadowClass))}>
            <div 
                className={clsx("p-10 border-b border-slate-100", (style.cardTransparent || isEmbed) ? "bg-white/90 backdrop-blur-md shadow-sm" : "bg-white", borderRadiusClass)}
                style={{ textAlign: style.titleAlignment, color: style.textColor }}
            >
                {style.logoUrl ? (
                    <div className={clsx("flex mb-6", style.titleAlignment === 'center' ? 'justify-center' : 'justify-start')}>
                        <img src={style.logoUrl} alt="Logo" className="h-10 object-contain" />
                    </div>
                ) : (
                    <div className={clsx("flex mb-6 opacity-20", style.titleAlignment === 'center' ? 'justify-center' : 'justify-start')}>
                        <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-8 grayscale" />
                    </div>
                )}
                <h1 className="text-4xl font-black mb-3 tracking-tight">{form.title}</h1>
                {form.description && <p className="text-lg opacity-70 whitespace-pre-wrap leading-relaxed">{form.description}</p>}
            </div>

            <form onSubmit={handleSubmit} className={clsx("p-10 space-y-10", (style.cardTransparent || isEmbed) ? "bg-white/80 backdrop-blur-sm shadow-sm mt-1" : "bg-white", borderRadiusClass)}>
                {form.questions.map(q => (
                <div key={q.id} className="space-y-4">
                    <label className="block text-lg font-bold" style={{ color: style.textColor }}>
                    {q.title} {q.required && <span className="text-red-500">*</span>}
                    </label>
                    
                    {q.type === 'paragraph' ? (
                        <textarea required={q.required} className={clsx("w-full border-2 border-slate-100 focus:outline-none focus:ring-4 focus:ring-opacity-5 p-4 min-h-[140px] transition-all bg-slate-50/50 text-base", inputRadiusClass)} style={{ focusRingColor: style.primaryColor, focusBorderColor: style.primaryColor }} placeholder="Escreva sua resposta longa aqui..." value={answers[q.id] || ''} onChange={e => handleInputChange(q.id, e.target.value)} />
                    ) : q.type === 'select' ? (
                        <select required={q.required} className={clsx("w-full border-2 border-slate-100 focus:outline-none focus:ring-4 focus:ring-opacity-5 px-4 py-3.5 transition-all bg-slate-50/50 text-base font-medium", inputRadiusClass)} value={answers[q.id] || ''} onChange={e => handleInputChange(q.id, e.target.value)}>
                            <option value="">Escolha uma opção...</option>
                            {q.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                    ) : q.type === 'checkbox' ? (
                        <div className="space-y-2">
                            {q.options?.map((opt, i) => (
                                <label key={i} className={clsx("flex items-center gap-3 p-3 bg-slate-50/50 border-2 border-slate-100 cursor-pointer hover:bg-white transition-all", inputRadiusClass)}>
                                    <input type="checkbox" className="w-5 h-5 rounded" style={{ color: style.primaryColor }} checked={((answers[q.id] as string[]) || []).includes(opt)} onChange={e => handleCheckboxChange(q.id, opt, e.target.checked)} />
                                    <span className="font-medium text-slate-700">{opt}</span>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <input type={q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : 'text'} required={q.required} className={clsx("w-full border-2 border-slate-100 focus:outline-none focus:ring-4 focus:ring-opacity-5 px-4 py-3.5 transition-all bg-slate-50/50 text-base", inputRadiusClass)} placeholder={q.placeholder || "Sua resposta..."} value={answers[q.id] || ''} onChange={e => handleInputChange(q.id, e.target.value)} />
                    )}
                </div>
                ))}

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-50">
                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className={clsx("text-white w-full sm:w-auto px-12 py-4 font-black text-lg shadow-xl disabled:opacity-70 transition-all transform active:scale-95 flex items-center justify-center gap-3", borderRadiusClass)}
                        style={{ backgroundColor: style.primaryColor }}
                    >
                        {isSubmitting ? <Loader2 size={24} className="animate-spin"/> : <Send size={24} />} {style.buttonText || 'Enviar Formulário'}
                    </button>
                    <button type="button" onClick={() => setAnswers({})} className="text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors uppercase tracking-widest">Limpar Tudo</button>
                </div>
            </form>
        </div>
        {isPublic && !isEmbed && <div className="text-center mt-10 text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-40">VOLL Pilates Group &copy; {new Date().getFullYear()}</div>}
      </div>
    </div>
  );
};

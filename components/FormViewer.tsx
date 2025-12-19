
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

  const getBackgroundStyle = () => {
      if (isEmbed) return { backgroundColor: 'transparent' };
      const style = form.style || { backgroundType: 'color', backgroundColor: '#f1f5f9' };
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

  const wrapperStyle = getBackgroundStyle();
  const cardTransparent = form.style?.cardTransparent || false;

  if (isSuccess) {
    return (
      <div className={clsx("min-h-screen w-full px-4 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4")} style={wrapperStyle}>
        <div className={clsx("max-w-xl w-full p-12 rounded-3xl text-center", cardTransparent || isEmbed ? "bg-white/80 backdrop-blur-sm shadow-xl border border-slate-100" : "bg-white shadow-xl")}>
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <CheckCircle size={48} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Enviado com Sucesso!</h2>
            <p className="text-slate-500 mb-10 text-lg">Recebemos suas informações. Entraremos em contato em breve.</p>
            {!isPublic && onBack && <button onClick={onBack} className="text-teal-600 hover:underline font-bold block mx-auto mb-2 text-sm">Voltar ao Painel</button>}
            {isPublic && <button onClick={() => window.location.reload()} className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-teal-600/20 active:scale-95 transition-all">Enviar outra resposta</button>}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("min-h-screen w-full flex flex-col items-center", (isPublic || isEmbed) ? "justify-center py-8" : "py-12")} style={wrapperStyle}>
      <div className={clsx("w-full px-4 animate-in fade-in slide-in-from-bottom-2", isEmbed ? "max-w-full" : "max-w-2xl")}>
        {!isPublic && onBack && !isEmbed && (
            <button onClick={onBack} className="mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors bg-white/50 px-4 py-2 rounded-xl backdrop-blur-sm shadow-sm font-bold text-sm">
                <ArrowLeft size={18} /> Sair do Visualizador
            </button>
        )}

        <div className={clsx("overflow-hidden transition-all", (cardTransparent || isEmbed) ? "" : "bg-white rounded-2xl shadow-2xl border border-slate-100")}>
            <div className={clsx("p-10 border-b border-slate-100", (cardTransparent || isEmbed) ? "bg-white/90 backdrop-blur-md rounded-t-2xl shadow-sm" : "bg-white")}>
                <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">{form.title}</h1>
                {form.description && <p className="text-slate-500 text-lg whitespace-pre-wrap leading-relaxed">{form.description}</p>}
            </div>

            <form onSubmit={handleSubmit} className={clsx("p-10 space-y-10", (cardTransparent || isEmbed) ? "bg-white/80 backdrop-blur-sm rounded-b-2xl shadow-sm mt-1" : "bg-white")}>
                {form.questions.map(q => (
                <div key={q.id} className="space-y-4">
                    <label className="block text-lg font-bold text-slate-800">
                    {q.title} {q.required && <span className="text-red-500">*</span>}
                    </label>
                    
                    {q.type === 'paragraph' ? (
                        <textarea required={q.required} className="w-full border-2 border-slate-100 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 p-4 min-h-[140px] transition-all bg-slate-50/50 text-base" placeholder="Escreva sua resposta longa aqui..." value={answers[q.id] || ''} onChange={e => handleInputChange(q.id, e.target.value)} />
                    ) : q.type === 'select' ? (
                        <select required={q.required} className="w-full border-2 border-slate-100 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 px-4 py-3.5 transition-all bg-slate-50/50 text-base font-medium" value={answers[q.id] || ''} onChange={e => handleInputChange(q.id, e.target.value)}>
                            <option value="">Escolha uma opção...</option>
                            {q.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                    ) : q.type === 'checkbox' ? (
                        <div className="space-y-2">
                            {q.options?.map((opt, i) => (
                                <label key={i} className="flex items-center gap-3 p-3 bg-slate-50/50 border-2 border-slate-100 rounded-xl cursor-pointer hover:bg-white hover:border-teal-200 transition-all">
                                    <input type="checkbox" className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500" checked={((answers[q.id] as string[]) || []).includes(opt)} onChange={e => handleCheckboxChange(q.id, opt, e.target.checked)} />
                                    <span className="font-medium text-slate-700">{opt}</span>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <input type={q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : 'text'} required={q.required} className="w-full border-2 border-slate-100 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 px-4 py-3.5 transition-all bg-slate-50/50 text-base" placeholder={q.placeholder || "Sua resposta..."} value={answers[q.id] || ''} onChange={e => handleInputChange(q.id, e.target.value)} />
                    )}
                </div>
                ))}

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-50">
                    <button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto px-12 py-4 rounded-2xl font-black text-lg shadow-xl shadow-teal-600/20 flex items-center justify-center gap-3 disabled:opacity-70 transition-all transform active:scale-95">
                        {isSubmitting ? <Loader2 size={24} className="animate-spin"/> : <Send size={24} />} Enviar Formulário
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

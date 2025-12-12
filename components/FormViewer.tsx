import React, { useState } from 'react';
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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formattedAnswers: FormAnswer[] = form.questions.map(q => ({
          questionId: q.id,
          questionTitle: q.title,
          value: answers[q.id] || ''
      }));

      await appBackend.submitForm(form.id, formattedAnswers, form.isLeadCapture);
      setIsSuccess(true);
    } catch (err) {
      alert("Erro ao enviar formulário. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Style Logic ---
  const getBackgroundStyle = () => {
      const style = form.style || { backgroundType: 'color', backgroundColor: '#f1f5f9' }; // Default slate-100

      if (style.backgroundType === 'image' && style.backgroundImage) {
          return { 
              backgroundImage: `url(${style.backgroundImage})`, 
              backgroundSize: 'cover', 
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed'
          };
      }
      
      if (style.backgroundType === 'color') {
          return { backgroundColor: style.backgroundColor };
      }

      if (style.backgroundType === 'texture' && style.backgroundTexture) {
          // Pre-defined textures mapped to CSS gradients/patterns
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

      return { backgroundColor: '#ffffff' }; // None
  };

  const wrapperStyle = getBackgroundStyle();
  const cardTransparent = form.style?.cardTransparent || false;

  if (isSuccess) {
    return (
      <div 
        className={clsx("min-h-screen w-full px-4 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4")}
        style={wrapperStyle}
      >
        <div className={clsx("max-w-xl w-full p-8 rounded-2xl text-center", cardTransparent ? "bg-white/80 backdrop-blur-sm shadow-xl" : "bg-white shadow-xl")}>
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Resposta enviada!</h2>
            <p className="text-slate-500 mb-8">Obrigado por preencher este formulário.</p>
            
            {!isPublic && onBack && (
                <button 
                onClick={onBack}
                className="text-indigo-600 hover:underline font-medium block mx-auto mb-2"
                >
                Voltar para o sistema
                </button>
            )}
            {isPublic && (
                <button 
                    onClick={() => window.location.reload()}
                    className="text-indigo-600 hover:underline font-medium"
                >
                    Enviar outra resposta
                </button>
            )}
        </div>
      </div>
    );
  }

  return (
    <div 
        className={clsx("min-h-screen w-full flex flex-col items-center", isPublic ? "justify-center py-12" : "py-8")}
        style={wrapperStyle}
    >
      <div className="w-full max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-2">
        {!isPublic && onBack && (
            <button onClick={onBack} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors bg-white/50 px-3 py-1.5 rounded-lg backdrop-blur-sm shadow-sm">
                <ArrowLeft size={16} /> Voltar
            </button>
        )}

        <div className={clsx("overflow-hidden transition-all", cardTransparent ? "" : "bg-white rounded-xl shadow-xl border border-slate-100")}>
            {/* Header Section */}
            <div className={clsx("p-8 border-b border-slate-100", cardTransparent ? "bg-white/90 backdrop-blur-md rounded-t-xl shadow-sm" : "bg-white")}>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{form.title}</h1>
                {form.description && (
                    <p className="text-slate-600 whitespace-pre-wrap">{form.description}</p>
                )}
                {form.isLeadCapture && !isPublic && (
                    <span className="inline-block mt-4 bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded font-medium border border-indigo-100">
                        Interesse Comercial
                    </span>
                )}
            </div>

            {/* Questions Section */}
            <form onSubmit={handleSubmit} className={clsx("p-8 space-y-6", cardTransparent ? "bg-white/80 backdrop-blur-sm rounded-b-xl shadow-sm mt-1" : "bg-white")}>
                {form.questions.map(q => (
                <div key={q.id} className="space-y-2">
                    <label className="block text-base font-semibold text-slate-700">
                    {q.title} {q.required && <span className="text-red-500">*</span>}
                    </label>
                    
                    {q.type === 'paragraph' ? (
                    <textarea 
                        required={q.required}
                        className="w-full border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 p-3 min-h-[100px] transition-all bg-white"
                        placeholder="Sua resposta"
                        value={answers[q.id] || ''}
                        onChange={e => handleInputChange(q.id, e.target.value)}
                    />
                    ) : (
                    <input 
                        type={q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : 'text'}
                        required={q.required}
                        className="w-full border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 px-4 py-2.5 transition-all bg-white"
                        placeholder={q.placeholder || "Sua resposta"}
                        value={answers[q.id] || ''}
                        onChange={e => handleInputChange(q.id, e.target.value)}
                    />
                    )}
                </div>
                ))}

                <div className="flex justify-between items-center pt-4">
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-70 transition-all transform active:scale-95"
                    >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} />}
                        Enviar Resposta
                    </button>
                    
                    <button 
                        type="button" 
                        onClick={() => setAnswers({})}
                        className="text-slate-400 text-sm hover:text-slate-600 font-medium"
                    >
                        Limpar formulário
                    </button>
                </div>
            </form>
        </div>

        {isPublic && (
            <div className="text-center mt-8 text-xs text-slate-500 font-medium opacity-60 bg-white/50 inline-block px-3 py-1 rounded-full mx-auto backdrop-blur-sm">
                Desenvolvido com Sincronizador VOLL
            </div>
        )}
      </div>
    </div>
  );
};
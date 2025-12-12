import React, { useState } from 'react';
import { FormModel, FormAnswer } from '../types';
import { CheckCircle, ArrowLeft, Loader2, Send } from 'lucide-react';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

interface FormViewerProps {
  form: FormModel;
  onBack: () => void;
}

export const FormViewer: React.FC<FormViewerProps> = ({ form, onBack }) => {
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

  if (isSuccess) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Resposta enviada!</h2>
        <p className="text-slate-500 mb-8">Obrigado por preencher este formulário.</p>
        <button 
          onClick={onBack}
          className="text-indigo-600 hover:underline font-medium"
        >
          Voltar para o sistema
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-2">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="bg-white border-t-8 border-t-indigo-600 rounded-xl shadow-sm border-x border-b border-slate-200 overflow-hidden mb-6">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{form.title}</h1>
          {form.description && (
            <p className="text-slate-600 whitespace-pre-wrap">{form.description}</p>
          )}
          {form.isLeadCapture && (
            <span className="inline-block mt-4 bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded font-medium border border-indigo-100">
                Interesse Comercial
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {form.questions.map(q => (
          <div key={q.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <label className="block text-base font-medium text-slate-800 mb-3">
              {q.title} {q.required && <span className="text-red-500">*</span>}
            </label>
            
            {q.type === 'paragraph' ? (
              <textarea 
                required={q.required}
                className="w-full border border-slate-300 rounded focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-3 min-h-[100px] transition-all"
                placeholder="Sua resposta"
                value={answers[q.id] || ''}
                onChange={e => handleInputChange(q.id, e.target.value)}
              />
            ) : (
              <input 
                type={q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : 'text'}
                required={q.required}
                className="w-full border-b border-slate-300 focus:border-indigo-600 focus:outline-none py-2 transition-all bg-transparent"
                placeholder={q.placeholder || "Sua resposta"}
                value={answers[q.id] || ''}
                onChange={e => handleInputChange(q.id, e.target.value)}
              />
            )}
          </div>
        ))}

        <div className="flex justify-between items-center mt-6">
             <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-70 transition-all"
             >
                {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} />}
                Enviar Resposta
             </button>
             
             <button 
                type="button" 
                onClick={() => setAnswers({})}
                className="text-slate-400 text-sm hover:text-slate-600"
             >
                 Limpar formulário
             </button>
        </div>
      </form>
    </div>
  );
};
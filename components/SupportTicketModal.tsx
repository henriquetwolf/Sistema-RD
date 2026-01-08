
import React, { useState } from 'react';
import { LifeBuoy, X, Send, Loader2, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { SupportTicket } from '../types';

interface SupportTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    senderId: string;
    senderName: string;
    senderEmail: string;
    senderRole: SupportTicket['senderRole'];
}

export const SupportTicketModal: React.FC<SupportTicketModalProps> = ({ isOpen, onClose, senderId, senderName, senderEmail, senderRole }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      await appBackend.saveSupportTicket({
        senderId,
        senderName,
        senderEmail,
        senderRole,
        subject: subject.trim(),
        message: message.trim(),
        status: 'open'
      });
      setIsSuccess(true);
      setTimeout(() => {
          setIsSuccess(false);
          setSubject('');
          setMessage('');
          onClose();
      }, 3000);
    } catch (e) {
      alert("Erro ao enviar chamado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
        <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><LifeBuoy size={20}/></div>
              <h3 className="text-lg font-black text-slate-800">Suporte Técnico Interno</h3>
          </div>
          {!isSuccess && <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>}
        </div>

        {isSuccess ? (
            <div className="p-12 text-center space-y-6 animate-in zoom-in-90 duration-300">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><CheckCircle2 size={40}/></div>
                <div>
                    <h4 className="text-xl font-black text-slate-800">Chamado Aberto com Sucesso!</h4>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">Nossa equipe de suporte analisará sua solicitação e responderá o mais breve possível.</p>
                </div>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3 text-xs text-blue-800">
                    <AlertCircle className="shrink-0 text-blue-600" size={16}/>
                    <p>Olá <strong>{senderName}</strong>, descreva abaixo seu problema ou dúvida técnica.</p>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Assunto / Tópico</label>
                    <input 
                        type="text" 
                        required 
                        className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold" 
                        placeholder="Ex: Problema com certificado, Erro no login..." 
                        value={subject} 
                        onChange={e => setSubject(e.target.value)} 
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Mensagem Detalhada</label>
                    <textarea 
                        required 
                        className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all h-40 resize-none leading-relaxed" 
                        placeholder="Descreva aqui o que está acontecendo..." 
                        value={message} 
                        onChange={e => setMessage(e.target.value)} 
                    />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-slate-500 font-bold text-sm">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                        {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>} Enviar Chamado
                    </button>
                </div>
            </form>
        )}
      </div>
    </div>
  );
};

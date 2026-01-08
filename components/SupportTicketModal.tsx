
import React, { useState, useEffect, useRef } from 'react';
import { LifeBuoy, X, Send, Loader2, MessageSquare, AlertCircle, CheckCircle2, History, ChevronRight, Clock, MessageCircle, User } from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { SupportTicket, SupportMessage } from '../types';
import clsx from 'clsx';

interface SupportTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    senderId: string;
    senderName: string;
    senderEmail: string;
    senderRole: SupportTicket['senderRole'];
}

export const SupportTicketModal: React.FC<SupportTicketModalProps> = ({ isOpen, onClose, senderId, senderName, senderEmail, senderRole }) => {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [thread, setThread] = useState<SupportMessage[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      fetchHistory();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
      if (selectedTicket) {
          fetchThread(selectedTicket.id);
      }
  }, [selectedTicket]);

  useEffect(() => {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await appBackend.getSupportTicketsBySender(senderId);
      setMyTickets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchThread = async (ticketId: string) => {
      setIsLoadingThread(true);
      try {
          const data = await appBackend.getSupportTicketMessages(ticketId);
          setThread(data);
      } catch (e) { console.error(e); } finally { setIsLoadingThread(false); }
  };

  const handleSendReply = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!replyText.trim() || !selectedTicket) return;
      setIsSendingReply(true);
      try {
          await appBackend.addSupportMessage({
              ticketId: selectedTicket.id,
              senderId: senderId,
              senderName: senderName,
              senderRole: senderRole,
              content: replyText.trim()
          });
          setReplyText('');
          await fetchThread(selectedTicket.id);
      } catch (e) { alert("Erro ao enviar mensagem."); } finally { setIsSendingReply(false); }
  };

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
          setActiveTab('history');
          fetchHistory();
      }, 2500);
    } catch (e) {
      alert("Erro ao enviar chamado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[85vh]">
        <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><LifeBuoy size={20}/></div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Central de Suporte</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Atendimento Interno VOLL</p>
              </div>
          </div>
          {!isSuccess && <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>}
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-50 border-b px-8 gap-6 shrink-0">
            <button 
                onClick={() => { setActiveTab('new'); setSelectedTicket(null); }}
                className={clsx(
                    "py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all",
                    activeTab === 'new' ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
            >
                Abrir Novo Chamado
            </button>
            <button 
                onClick={() => { setActiveTab('history'); setSelectedTicket(null); }}
                className={clsx(
                    "py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2",
                    activeTab === 'history' ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
            >
                Meus Chamados 
                {myTickets.length > 0 && <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px]">{myTickets.length}</span>}
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            {activeTab === 'new' ? (
                <div className="flex-1 overflow-y-auto">
                {isSuccess ? (
                    <div className="p-12 text-center space-y-6 animate-in zoom-in-90 duration-300">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><CheckCircle2 size={40}/></div>
                        <div>
                            <h4 className="text-xl font-black text-slate-800">Chamado Aberto!</h4>
                            <p className="text-sm text-slate-500 mt-2 leading-relaxed">Sua solicitação foi enviada. Você poderá acompanhar a resposta na aba "Meus Chamados".</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3 text-xs text-blue-800">
                            <AlertCircle className="shrink-0 text-blue-600" size={16}/>
                            <p>Olá <strong>{senderName}</strong>, descreva abaixo seu problema ou dúvida técnica para que nossa equipe administrativa possa te auxiliar.</p>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Assunto do Chamado</label>
                            <input 
                                type="text" 
                                required 
                                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold" 
                                placeholder="Ex: Problema com certificado, Dúvida sobre aula..." 
                                value={subject} 
                                onChange={e => setSubject(e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Mensagem Detalhada</label>
                            <textarea 
                                required 
                                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all h-40 resize-none leading-relaxed" 
                                placeholder="Explique o que está acontecendo..." 
                                value={message} 
                                onChange={e => setMessage(e.target.value)} 
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                                {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>} Enviar Chamado para o Administrativo
                            </button>
                        </div>
                    </form>
                )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                    {selectedTicket ? (
                        <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
                            <div className="bg-white px-8 py-4 border-b flex justify-between items-center shrink-0">
                                <button 
                                    onClick={() => setSelectedTicket(null)}
                                    className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1 hover:underline"
                                >
                                    <ChevronRight size={14} className="rotate-180" /> Voltar ao Histórico
                                </button>
                                <span className={clsx(
                                    "text-[9px] font-black px-2 py-1 rounded border uppercase",
                                    selectedTicket.status === 'open' ? "bg-red-50 text-red-700 border-red-100" :
                                    selectedTicket.status === 'pending' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                    "bg-green-50 text-green-700 border-green-100"
                                )}>
                                    {selectedTicket.status === 'open' ? 'Aberto' : selectedTicket.status === 'pending' ? 'Em Análise' : 'Resolvido'}
                                </span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                                <div>
                                    <h4 className="text-xl font-black text-slate-800">{selectedTicket.subject}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Protocolo #{selectedTicket.id.split('-')[0]}</p>
                                </div>

                                <div className="space-y-4">
                                    {/* Mensagem Inicial */}
                                    <div className="flex justify-start">
                                        <div className="bg-white p-5 rounded-2xl rounded-tl-none border shadow-sm max-w-[85%]">
                                            <span className="block text-[10px] font-black text-slate-400 uppercase mb-2">Mensagem Inicial:</span>
                                            <p className="text-sm text-slate-600 leading-relaxed italic">{selectedTicket.message}</p>
                                            <span className="block text-right text-[9px] text-slate-400 mt-2">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Thread de Conversa */}
                                    {thread.map(msg => (
                                        <div key={msg.id} className={clsx("flex", msg.senderRole === 'admin' ? "justify-start" : "justify-end")}>
                                            <div className={clsx(
                                                "p-4 rounded-2xl shadow-sm max-w-[85%] relative border",
                                                msg.senderRole === 'admin' ? "bg-indigo-50 border-indigo-100 rounded-tl-none" : "bg-white border-slate-100 rounded-tr-none"
                                            )}>
                                                <span className={clsx(
                                                    "block text-[10px] font-black uppercase mb-2",
                                                    msg.senderRole === 'admin' ? "text-indigo-600" : "text-slate-400"
                                                )}>
                                                    {msg.senderRole === 'admin' ? <span className="flex items-center gap-1"><MessageCircle size={12}/> Resposta da Administração</span> : 'Réplica do Usuário'}
                                                </span>
                                                <p className="text-sm text-slate-700 leading-relaxed font-medium">{msg.content}</p>
                                                <span className="block text-right text-[9px] text-slate-400 mt-2">{new Date(msg.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Resposta Legada (Se existir no campo response antigo) */}
                                    {selectedTicket.response && thread.length === 0 && (
                                        <div className="flex justify-start">
                                            <div className="bg-indigo-50 p-5 rounded-2xl rounded-tl-none border border-indigo-100 shadow-sm max-w-[85%]">
                                                <span className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase mb-3">
                                                    <MessageCircle size={14}/> Resposta da Administração:
                                                </span>
                                                <p className="text-sm text-indigo-900 leading-relaxed font-medium">{selectedTicket.response}</p>
                                                <span className="block text-right text-[9px] text-indigo-300 mt-2">{new Date(selectedTicket.updatedAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )}

                                    {isLoadingThread && (
                                        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-indigo-600" /></div>
                                    )}
                                    <div ref={threadEndRef} />
                                </div>
                            </div>

                            {/* Campo de Réplica */}
                            <div className="bg-white p-4 border-t shrink-0">
                                <form onSubmit={handleSendReply} className="flex gap-2">
                                    <textarea 
                                        className="flex-1 px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-12 transition-all"
                                        placeholder="Digite aqui para continuar a conversa..."
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        required
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={isSendingReply || !replyText.trim()}
                                        className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                                    >
                                        {isSendingReply ? <Loader2 size={20} className="animate-spin" /> : <Send size={20}/>}
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                            {isLoadingHistory ? (
                                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div>
                            ) : myTickets.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                    <History size={48} className="mx-auto text-slate-200 mb-4" />
                                    <h4 className="font-bold text-slate-400 uppercase text-xs">Nenhum chamado anterior</h4>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {myTickets.map(t => (
                                        <div 
                                            key={t.id} 
                                            onClick={() => setSelectedTicket(t)}
                                            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={clsx(
                                                    "w-3 h-3 rounded-full shrink-0 shadow-sm",
                                                    t.status === 'open' ? "bg-red-500" : t.status === 'pending' ? "bg-amber-400" : "bg-green-500"
                                                )}></div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{t.subject}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                                        {new Date(t.createdAt).toLocaleDateString()} • {t.status === 'closed' ? 'Resolvido' : 'Pendente'}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

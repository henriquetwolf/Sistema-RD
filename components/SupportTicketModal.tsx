
import React, { useState, useEffect, useRef } from 'react';
import { LifeBuoy, X, Send, Loader2, MessageSquare, AlertCircle, CheckCircle2, History, ChevronRight, Clock, MessageCircle, User, Paperclip, Image as ImageIcon, Download, FileText, Tag } from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { SupportTicket, SupportMessage, SupportTag } from '../types';
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
  const [selectedTag, setSelectedTag] = useState('');
  const [message, setMessage] = useState('');
  const [tags, setTags] = useState<SupportTag[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [thread, setThread] = useState<SupportMessage[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string, name: string } | null>(null);

  const threadEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        if (activeTab === 'history') fetchHistory();
        fetchTags();
    }
  }, [isOpen, activeTab, senderRole]);

  useEffect(() => {
      if (selectedTicket) fetchThread(selectedTicket.id);
  }, [selectedTicket]);

  useEffect(() => {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const fetchTags = async () => {
      try {
          const data = await appBackend.getSupportTags(senderRole as any);
          setTags(data);
      } catch (e) { console.error(e); }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await appBackend.getSupportTicketsBySender(senderId);
      setMyTickets(data);
    } catch (e) { console.error(e); } finally { setIsLoadingHistory(false); }
  };

  const fetchThread = async (ticketId: string) => {
      setIsLoadingThread(true);
      try {
          const data = await appBackend.getSupportTicketMessages(ticketId);
          setThread(data);
      } catch (e) { console.error(e); } finally { setIsLoadingThread(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              setAttachment({ url: reader.result as string, name: file.name });
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSendReply = async (e: React.FormEvent) => {
      e.preventDefault();
      if ((!replyText.trim() && !attachment) || !selectedTicket) return;
      setIsSendingReply(true);
      try {
          await appBackend.addSupportMessage({
              ticketId: selectedTicket.id,
              senderId: senderId,
              senderName: senderName,
              senderRole: senderRole,
              content: replyText.trim(),
              attachmentUrl: attachment?.url,
              attachmentName: attachment?.name
          } as any);
          setReplyText('');
          setAttachment(null);
          await fetchThread(selectedTicket.id);
      } catch (e) { alert("Erro ao enviar mensagem."); } finally { setIsSendingReply(false); }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || !selectedTag) {
        alert("Por favor, preencha o assunto, a categoria e a mensagem.");
        return;
    }
    setIsSubmitting(true);
    try {
      await appBackend.saveSupportTicket({
        senderId, senderName, senderEmail, senderRole,
        subject: subject.trim(), message: message.trim(), tag: selectedTag, status: 'open'
      });
      setIsSuccess(true);
      setTimeout(() => {
          setIsSuccess(false); setSubject(''); setMessage(''); setSelectedTag(''); setActiveTab('history'); fetchHistory();
      }, 2500);
    } catch (e) { alert("Erro ao enviar chamado."); } finally { setIsSubmitting(false); }
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

        <div className="flex bg-slate-50 border-b px-8 gap-6 shrink-0">
            <button onClick={() => { setActiveTab('new'); setSelectedTicket(null); }} className={clsx("py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all", activeTab === 'new' ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-400 hover:text-slate-600")}>Abrir Novo Chamado</button>
            <button onClick={() => { setActiveTab('history'); setSelectedTicket(null); }} className={clsx("py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2", activeTab === 'history' ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-400 hover:text-slate-600")}>Meus Chamados {myTickets.length > 0 && <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px]">{myTickets.length}</span>}</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            {activeTab === 'new' ? (
                <div className="flex-1 overflow-y-auto p-8">
                {isSuccess ? (
                    <div className="py-12 text-center space-y-6 animate-in zoom-in-90 duration-300">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><CheckCircle2 size={40}/></div>
                        <div><h4 className="text-xl font-black text-slate-800">Chamado Aberto!</h4><p className="text-sm text-slate-500 mt-2 leading-relaxed">Você poderá acompanhar a resposta na aba "Meus Chamados".</p></div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3 text-xs text-blue-800"><AlertCircle className="shrink-0 text-blue-600" size={16}/><p>Olá <strong>{senderName}</strong>, descreva abaixo sua necessidade.</p></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Assunto</label>
                                <input type="text" required className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold" placeholder="Assunto do chamado..." value={subject} onChange={e => setSubject(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Categoria / Assunto</label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                    <select 
                                        required 
                                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold bg-white appearance-none"
                                        value={selectedTag}
                                        onChange={e => setSelectedTag(e.target.value)}
                                    >
                                        <option value="">Selecione uma categoria...</option>
                                        {tags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                        {tags.length === 0 && <option value="Geral">Geral</option>}
                                    </select>
                                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 rotate-90" size={16} />
                                </div>
                            </div>
                        </div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Mensagem Detalhada</label><textarea required className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all h-32 resize-none leading-relaxed" placeholder="Explique o que está acontecendo..." value={message} onChange={e => setMessage(e.target.value)} /></div>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70">{isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>} Enviar Chamado</button>
                    </form>
                )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                    {selectedTicket ? (
                        <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
                            <div className="bg-white px-8 py-4 border-b flex justify-between items-center shrink-0">
                                <button onClick={() => setSelectedTicket(null)} className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1 hover:underline"><ChevronRight size={14} className="rotate-180" /> Histórico</button>
                                <div className="flex flex-col items-end">
                                    <span className={clsx("text-[9px] font-black px-2 py-1 rounded border uppercase", selectedTicket.status === 'open' ? "bg-red-50 text-red-700 border-red-100" : selectedTicket.status === 'pending' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-green-50 text-green-700 border-green-100")}>{selectedTicket.status}</span>
                                    {selectedTicket.assignedName && <span className="text-[8px] font-bold text-slate-400 mt-1">Atendente: {selectedTicket.assignedName}</span>}
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">{selectedTicket.tag || 'Geral'}</span>
                                </div>
                                <h4 className="text-xl font-black text-slate-800">{selectedTicket.subject}</h4>
                                <div className="space-y-4">
                                    <div className="flex justify-start"><div className="bg-white p-5 rounded-2xl rounded-tl-none border shadow-sm max-w-[85%]"><span className="block text-[10px] font-black text-slate-400 uppercase mb-2">Mensagem Inicial:</span><p className="text-sm text-slate-600 leading-relaxed italic">{selectedTicket.message}</p><span className="block text-right text-[9px] text-slate-400 mt-2">{new Date(selectedTicket.createdAt).toLocaleString()}</span></div></div>
                                    {thread.map(msg => (
                                        <div key={msg.id} className={clsx("flex", msg.senderRole === 'admin' ? "justify-start" : "justify-end")}>
                                            <div className={clsx("p-4 rounded-2xl shadow-sm max-w-[85%] relative border", msg.senderRole === 'admin' ? "bg-indigo-50 border-indigo-100 rounded-tl-none" : "bg-white border-slate-100 rounded-tr-none")}>
                                                <span className={clsx("block text-[10px] font-black uppercase mb-2", msg.senderRole === 'admin' ? "text-indigo-600" : "text-slate-400")}>{msg.senderRole === 'admin' ? <span className="flex items-center gap-1"><MessageCircle size={12}/> Adm VOLL ({msg.senderName})</span> : 'Réplica'}</span>
                                                <p className="text-sm text-slate-700 leading-relaxed font-medium">{msg.content}</p>
                                                {msg.attachmentUrl && (
                                                    <div className="mt-3 p-2 bg-white/50 rounded-xl border border-slate-200/50">
                                                        {msg.attachmentUrl.startsWith('data:image') ? (
                                                            <div className="relative group/img"><img src={msg.attachmentUrl} className="max-w-full rounded-lg shadow-sm" alt="anexo" /><a href={msg.attachmentUrl} download={msg.attachmentName} className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity rounded-lg text-white"><Download size={24}/></a></div>
                                                        ) : (
                                                            <a href={msg.attachmentUrl} download={msg.attachmentName} className="flex items-center gap-2 p-2 text-xs font-bold text-slate-600 hover:text-indigo-600"><FileText size={14}/> {msg.attachmentName} <Download size={14} className="ml-auto"/></a>
                                                        )}
                                                    </div>
                                                )}
                                                <span className="block text-right text-[9px] text-slate-400 mt-2">{new Date(msg.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {isLoadingThread && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-indigo-600" /></div>}
                                    <div ref={threadEndRef} />
                                </div>
                            </div>

                            <div className="bg-white p-4 border-t shrink-0">
                                {attachment && (
                                    <div className="mb-2 p-2 bg-slate-50 border rounded-xl flex justify-between items-center animate-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><Paperclip size={14}/> {attachment.name}</div>
                                        <button onClick={() => setAttachment(null)} className="p-1 hover:bg-red-50 text-red-500 rounded"><X size={14}/></button>
                                    </div>
                                )}
                                <form onSubmit={handleSendReply} className="flex gap-2">
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"><Paperclip size={20}/></button>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                    <textarea className="flex-1 px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-12 transition-all" placeholder="Continuar conversa..." value={replyText} onChange={e => setReplyText(e.target.value)} />
                                    <button type="submit" disabled={isSendingReply || (!replyText.trim() && !attachment)} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-600/20">{isSendingReply ? <Loader2 size={20} className="animate-spin" /> : <Send size={20}/>}</button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                            {isLoadingHistory ? (<div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div>) : 
                            myTickets.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200"><History size={48} className="mx-auto text-slate-200 mb-4" /><h4 className="font-bold text-slate-400 uppercase text-xs">Sem chamados anteriores</h4></div>
                            ) : (
                                <div className="space-y-3">
                                    {myTickets.map(t => (
                                        <div key={t.id} onClick={() => setSelectedTicket(t)} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex items-center justify-between group">
                                            <div className="flex items-center gap-4"><div className={clsx("w-3 h-3 rounded-full shrink-0", t.status === 'open' ? "bg-red-50" : t.status === 'pending' ? "bg-amber-400" : "bg-green-500")}></div><div><h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{t.subject}</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{t.tag || 'Geral'} • {new Date(t.createdAt).toLocaleDateString()} • {t.status}</p></div></div>
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

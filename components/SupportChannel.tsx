
import React, { useState, useEffect, useRef } from 'react';
import { 
  LifeBuoy, Send, Plus, Search, Filter, MessageSquare, 
  Clock, CheckCircle2, XCircle, MoreVertical, Paperclip, 
  ChevronRight, ArrowLeft, Loader2, User, Building2, School, 
  GraduationCap, Inbox, AlertTriangle, Trash2, CheckCircle,
  /* Added Lock and X to imports */
  Lock, X
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { SupportTicket, SupportMessage, SupportStatus, SupportPriority, SupportCategory } from '../types';
import clsx from 'clsx';

interface SupportChannelProps {
  onBack?: () => void;
  isAdmin?: boolean;
  userId?: string;
  userName?: string;
  userType?: 'student' | 'instructor' | 'studio';
}

export const SupportChannel: React.FC<SupportChannelProps> = ({ 
  onBack, isAdmin = false, userId, userName, userType 
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  // Modal State
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
      title: '',
      description: '',
      category: 'Geral' as SupportCategory,
      priority: 'medium' as SupportPriority
  });

  // Filters (Admin)
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTickets();
  }, [isAdmin, userId, statusFilter, typeFilter]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      // Poll para mensagens novas a cada 10 segundos se o ticket estiver aberto
      const interval = setInterval(() => fetchMessages(selectedTicket.id, true), 10000);
      return () => clearInterval(interval);
    }
  }, [selectedTicket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const filters = isAdmin 
        ? { status: statusFilter, senderType: typeFilter } 
        : { senderId: userId };
      const data = await appBackend.getTickets(filters);
      setTickets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string, isSilent = false) => {
    if (!isSilent) setLoadingMessages(true);
    try {
      const data = await appBackend.getTicketMessages(ticketId);
      setMessages(data);
    } catch (e) {
      console.error(e);
    } finally {
      if (!isSilent) setLoadingMessages(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketForm.title || !newTicketForm.description) return;
    
    setIsSending(true);
    try {
      await appBackend.createTicket({
        title: newTicketForm.title,
        description: newTicketForm.description,
        category: newTicketForm.category,
        priority: newTicketForm.priority,
        senderId: userId || 'admin',
        senderName: userName || 'Administrador',
        senderType: userType || 'admin'
      });
      setShowNewTicketModal(false);
      setNewTicketForm({ title: '', description: '', category: 'Geral', priority: 'medium' });
      fetchTickets();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setIsSending(true);
    try {
      await appBackend.addSupportMessage({
        ticketId: selectedTicket.id,
        senderId: isAdmin ? 'admin' : (userId || ''),
        senderName: isAdmin ? 'Suporte VOLL' : (userName || ''),
        senderType: isAdmin ? 'admin' : 'user',
        content: replyText
      });
      
      // Se Admin respondeu, e o status era "open", move para "in_progress"
      if (isAdmin && selectedTicket.status === 'open') {
          await handleUpdateStatus(selectedTicket.id, 'in_progress');
      }
      
      setReplyText('');
      fetchMessages(selectedTicket.id, true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: SupportStatus) => {
      try {
          await appBackend.updateTicketStatus(ticketId, status);
          if (selectedTicket?.id === ticketId) {
              setSelectedTicket({ ...selectedTicket, status });
          }
          fetchTickets();
      } catch (e) { console.error(e); }
  };

  const getStatusBadge = (status: SupportStatus) => {
    const config = {
      open: { color: 'bg-red-100 text-red-700', label: 'Aberto' },
      in_progress: { color: 'bg-blue-100 text-blue-700', label: 'Em Atendimento' },
      waiting: { color: 'bg-amber-100 text-amber-700', label: 'Aguardando Resposta' },
      resolved: { color: 'bg-green-100 text-green-700', label: 'Resolvido' },
      closed: { color: 'bg-slate-100 text-slate-500', label: 'Fechado' }
    };
    const s = config[status] || config.open;
    return <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest", s.color)}>{s.label}</span>;
  };

  const getPriorityBadge = (priority: SupportPriority) => {
    const config = {
      low: 'bg-slate-50 text-slate-400',
      medium: 'bg-blue-50 text-blue-500',
      high: 'bg-orange-50 text-orange-600',
      urgent: 'bg-red-50 text-red-600 font-black'
    };
    return <span className={clsx("px-1.5 py-0.5 rounded text-[9px] uppercase tracking-tighter", config[priority])}>{priority}</span>;
  };

  const getUserTypeIcon = (type: string) => {
      switch(type) {
          case 'student': return <GraduationCap size={14} className="text-purple-500" />;
          case 'instructor': return <School size={14} className="text-orange-500" />;
          case 'studio': return <Building2 size={14} className="text-teal-500" />;
          default: return <User size={14} className="text-slate-400" />;
      }
  };

  const filteredTickets = tickets.filter(t => 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.senderName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
      
      {/* SIDEBAR: Lista de Chamados */}
      <div className={clsx("flex flex-col border-r border-slate-200 w-full md:w-80 lg:w-96 shrink-0", selectedTicket ? "hidden md:flex" : "flex")}>
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <LifeBuoy className="text-indigo-600" /> Suporte VOLL
                </h2>
                {!isAdmin && (
                    <button onClick={() => setShowNewTicketModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-lg shadow-lg active:scale-95 transition-all">
                        <Plus size={20} />
                    </button>
                )}
            </div>
            
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Buscar chamado..." 
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {isAdmin && (
                <div className="flex gap-2">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="flex-1 bg-white border border-slate-200 text-[10px] font-bold uppercase rounded-lg px-2 py-1.5 outline-none">
                        <option value="all">Todos Status</option>
                        <option value="open">Abertos</option>
                        <option value="in_progress">Em Atendimento</option>
                        <option value="waiting">Aguardando Resposta</option>
                        <option value="resolved">Resolvidos</option>
                    </select>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="flex-1 bg-white border border-slate-200 text-[10px] font-bold uppercase rounded-lg px-2 py-1.5 outline-none">
                        <option value="all">Todos Pilares</option>
                        <option value="student">Alunos</option>
                        <option value="instructor">Instrutores</option>
                        <option value="studio">Studios</option>
                    </select>
                </div>
            )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
            {loading && tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-30"><Loader2 className="animate-spin mb-2" size={32} /><p className="text-xs font-bold uppercase">Sincronizando...</p></div>
            ) : filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 px-10 text-center">
                    <Inbox size={48} className="opacity-10 mb-4" />
                    <p className="text-sm font-bold">Nenhum chamado localizado</p>
                    <p className="text-[10px] mt-1">Sua caixa de suporte está limpa.</p>
                </div>
            ) : (
                filteredTickets.map(ticket => (
                    <div 
                        key={ticket.id} 
                        onClick={() => setSelectedTicket(ticket)}
                        className={clsx(
                            "p-5 border-b border-slate-50 cursor-pointer transition-all hover:bg-slate-50 relative group border-l-4",
                            selectedTicket?.id === ticket.id ? "bg-indigo-50/30 border-l-indigo-500" : "border-l-transparent"
                        )}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-1.5">
                                {getUserTypeIcon(ticket.senderType)}
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{ticket.senderName}</span>
                            </div>
                            <span className="text-[9px] text-slate-300 font-mono">#{ticket.id.substring(0,6)}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">{ticket.title}</h4>
                        <div className="flex items-center justify-between mt-3">
                            {getStatusBadge(ticket.status)}
                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-300">
                                {getPriorityBadge(ticket.priority)}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* ÁREA DE CHAT / DETALHES */}
      <div className="flex-1 flex flex-col bg-slate-50 relative min-w-0">
          {selectedTicket ? (
              <>
                {/* Chat Header */}
                <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button className="md:hidden p-2 text-slate-400 hover:text-slate-600" onClick={() => setSelectedTicket(null)}><ArrowLeft size={24} /></button>
                        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                            {getUserTypeIcon(selectedTicket.senderType)}
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-base leading-tight">{selectedTicket.title}</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs font-bold text-slate-400">{selectedTicket.senderName}</span>
                                <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                <span className="text-[10px] font-black text-indigo-500 uppercase">{selectedTicket.category}</span>
                            </div>
                        </div>
                    </div>
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <select 
                                className="bg-slate-100 border-none rounded-lg text-[10px] font-black uppercase px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={selectedTicket.status}
                                onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value as any)}
                            >
                                <option value="open">Aberto</option>
                                <option value="in_progress">Em Atendimento</option>
                                <option value="waiting">Esperando Cliente</option>
                                <option value="resolved">Resolvido</option>
                                <option value="closed">Encerrar e Arquivar</option>
                            </select>
                        </div>
                    )}
                    {!isAdmin && selectedTicket.status === 'resolved' && (
                         <button 
                            onClick={() => handleUpdateStatus(selectedTicket.id, 'closed')}
                            className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2"
                         >
                             Confirmar Solução <CheckCircle size={14}/>
                         </button>
                    )}
                </div>

                {/* Timeline de Mensagens */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50">
                    {loadingMessages ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300"><Loader2 className="animate-spin mb-2" size={24}/> <span className="text-xs font-bold uppercase tracking-widest">Carregando conversa...</span></div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            <div className="text-center"><span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">Ticket Criado em {new Date(selectedTicket.createdAt).toLocaleString()}</span></div>
                            
                            {messages.map((msg) => {
                                const isMe = isAdmin ? msg.senderType === 'admin' : (msg.senderId === userId);
                                return (
                                    <div key={msg.id} className={clsx("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "items-start")}>
                                        <div className="flex items-center gap-2 mb-1 px-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{msg.senderName}</span>
                                            <span className="text-[9px] text-slate-300">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className={clsx(
                                            "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                                            isMe 
                                                ? "bg-indigo-600 text-white rounded-tr-none" 
                                                : "bg-white text-slate-700 border border-slate-200 rounded-tl-none"
                                        )}>
                                            {msg.content}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>
                    )}
                </div>

                {/* Barra de Resposta */}
                <div className="bg-white p-5 border-t border-slate-200">
                    {selectedTicket.status === 'closed' ? (
                        <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex items-center justify-center gap-3 text-slate-500">
                            {/* Corrected: Lock and X are now imported and usable as JSX components */}
                            <Lock size={16}/> <span className="text-sm font-bold uppercase tracking-widest">Este chamado foi encerrado.</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSendMessage} className="flex gap-4">
                            <textarea 
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none h-[54px] custom-scrollbar" 
                                placeholder="Digite sua resposta..." 
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e as any);
                                    }
                                }}
                            />
                            <div className="flex flex-col gap-2">
                                <button 
                                    type="submit" 
                                    disabled={isSending || !replyText.trim()} 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-black text-sm uppercase shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-70"
                                >
                                    {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
              </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center animate-in fade-in zoom-in-95">
                <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-indigo-500 mb-8 border border-slate-100">
                    <MessageSquare size={48} className="opacity-20" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Suporte Centralizado VOLL</h3>
                <p className="text-sm max-w-sm font-medium leading-relaxed">Selecione um chamado na lista lateral ou inicie um novo atendimento para resolver suas dúvidas.</p>
            </div>
          )}
      </div>

      {/* MODAL NOVO CHAMADO */}
      {showNewTicketModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg animate-in zoom-in-95 flex flex-col">
                  <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2.5rem]">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Plus size={20} className="text-indigo-600" /> Abrir Novo Chamado</h3>
                      <button onClick={() => setShowNewTicketModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24} /></button>
                  </div>
                  <form onSubmit={handleCreateTicket} className="p-10 space-y-6">
                      <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Assunto / Título *</label>
                          <input type="text" required className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-sm font-bold outline-none transition-all" value={newTicketForm.title} onChange={e => setNewTicketForm({...newTicketForm, title: e.target.value})} placeholder="Do que se trata seu chamado?" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Categoria</label>
                              <select className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold outline-none" value={newTicketForm.category} onChange={e => setNewTicketForm({...newTicketForm, category: e.target.value as any})}>
                                  <option value="Geral">Geral</option>
                                  <option value="Financeiro">Financeiro</option>
                                  <option value="Técnico">Técnico</option>
                                  <option value="Pedagógico">Pedagógico</option>
                                  <option value="Logística">Logística</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Prioridade</label>
                              <select className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold outline-none" value={newTicketForm.priority} onChange={e => setNewTicketForm({...newTicketForm, priority: e.target.value as any})}>
                                  <option value="low">Baixa</option>
                                  <option value="medium">Média</option>
                                  <option value="high">Alta</option>
                                  <option value="urgent">Urgente</option>
                              </select>
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Descrição Detalhada *</label>
                          <textarea required className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-sm h-32 resize-none outline-none leading-relaxed" value={newTicketForm.description} onChange={e => setNewTicketForm({...newTicketForm, description: e.target.value})} placeholder="Explique seu caso da melhor forma possível..." />
                      </div>
                      <button type="submit" disabled={isSending} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-95">
                          {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Enviar Solicitação
                      </button>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

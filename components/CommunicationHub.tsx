
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Send, Plus, Search, Filter, Mail, Bell, Sparkles, 
  ArrowLeft, Save, Trash2, History, User, Building2, School, 
  GraduationCap, Loader2, Image as ImageIcon, X, ChevronRight, 
  Users, CheckCircle2, MessageSquare, Tag, Clock, Megaphone, Target,
  MessageCircle, LifeBuoy, AlertCircle, CheckCircle, MoreHorizontal, Inbox
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { Ticket, TicketMessage } from '../types';
import clsx from 'clsx';

interface CommunicationHubProps {
  onBack: () => void;
}

export const CommunicationHub: React.FC<CommunicationHubProps> = ({ onBack }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedTicket) {
        fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
        const data = await appBackend.getTickets({ status: statusFilter });
        setTickets(data);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
        const data = await appBackend.getTicketMessages(ticketId);
        setMessages(data);
    } catch (e) { console.error(e); }
  };

  const handleSendReply = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!replyText.trim() || !selectedTicket || isSending) return;

      setIsSending(true);
      try {
          const savedCollab = sessionStorage.getItem('collaborator_session');
          const senderName = savedCollab ? JSON.parse(savedCollab).name : 'Administrador';

          await appBackend.addTicketMessage(selectedTicket.id, replyText, senderName, 'agent');
          setReplyText('');
          await fetchMessages(selectedTicket.id);
          
          // Se estava "open", move para "in_progress" automaticamente ao responder
          if (selectedTicket.status === 'open') {
              handleUpdateStatus('in_progress');
          }
      } catch (e: any) {
          alert(`Erro ao responder: ${e.message}`);
      } finally {
          setIsSending(false);
      }
  };

  const handleUpdateStatus = async (newStatus: Ticket['status']) => {
      if (!selectedTicket) return;
      try {
          await appBackend.updateTicketStatus(selectedTicket.id, newStatus);
          setSelectedTicket({ ...selectedTicket, status: newStatus });
          setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: newStatus } : t));
      } catch (e) { console.error(e); }
  };

  const filteredTickets = tickets.filter(t => 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.senderName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'open': return <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border border-red-100">Aberto</span>;
          case 'in_progress': return <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border border-blue-100">Em Atendimento</span>;
          case 'resolved': return <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border border-green-100">Resolvido</span>;
          case 'closed': return <span className="bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border border-slate-100">Arquivado</span>;
          default: return null;
      }
  };

  const getPilarIcon = (type: string) => {
      switch(type) {
          case 'student': return <GraduationCap size={14} className="text-purple-500" />;
          case 'instructor': return <School size={14} className="text-orange-500" />;
          case 'studio': return <Building2 size={14} className="text-teal-500" />;
          default: return <User size={14} />;
      }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
      
      {/* SIDEBAR: Ticket List */}
      <div className={clsx("flex flex-col border-r border-slate-200 w-full md:w-80 lg:w-[400px] shrink-0", selectedTicket ? "hidden md:flex" : "flex")}>
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <LifeBuoy className="text-indigo-600" /> Central de Suporte
                </h2>
                <button onClick={onBack} className="md:hidden p-2 text-slate-400 hover:text-slate-600"><X size={20}/></button>
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

            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {[
                    { id: 'all', label: 'Todos' },
                    { id: 'open', label: 'Abertos' },
                    { id: 'in_progress', label: 'Em curso' },
                    { id: 'resolved', label: 'Resolvidos' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        className={clsx(
                            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                            statusFilter === tab.id ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
            {isLoading && tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-30"><Loader2 className="animate-spin mb-2" size={32} /><p className="text-xs font-bold uppercase">Sincronizando...</p></div>
            ) : filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 px-10 text-center">
                    <Inbox size={48} className="opacity-10 mb-4" />
                    <p className="text-sm font-bold">Nenhum chamado localizado</p>
                    <p className="text-[10px] mt-1">Experimente mudar o filtro ou termo de busca.</p>
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
                                {getPilarIcon(ticket.senderType)}
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{ticket.senderName}</span>
                            </div>
                            <span className="text-[9px] text-slate-300 font-mono">#{ticket.id.substring(0,6)}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">{ticket.title}</h4>
                        <div className="flex items-center justify-between mt-3">
                            {getStatusBadge(ticket.status)}
                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-300">
                                <Clock size={10} />
                                {new Date(ticket.updatedAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col bg-slate-50 relative min-w-0">
          {selectedTicket ? (
              <>
                {/* Chat Header */}
                <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button className="md:hidden p-2 text-slate-400 hover:text-slate-600" onClick={() => setSelectedTicket(null)}><ChevronRight size={24} className="rotate-180" /></button>
                        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                            {getPilarIcon(selectedTicket.senderType)}
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
                    <div className="flex items-center gap-2">
                        <select 
                            className="bg-slate-100 border-none rounded-lg text-[10px] font-black uppercase px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={selectedTicket.status}
                            onChange={(e) => handleUpdateStatus(e.target.value as any)}
                        >
                            <option value="open">Reabrir Chamado</option>
                            <option value="in_progress">Em Atendimento</option>
                            <option value="resolved">Marcar Resolvido</option>
                            <option value="closed">Arquivar</option>
                        </select>
                    </div>
                </div>

                {/* Messages Timeline */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50">
                    <div className="flex flex-col gap-6">
                        {messages.map((msg) => (
                            <div key={msg.id} className={clsx("flex flex-col max-w-[85%]", msg.senderType === 'agent' ? "ml-auto items-end" : "items-start")}>
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{msg.senderName}</span>
                                    <span className="text-[9px] text-slate-300">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className={clsx(
                                    "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                                    msg.senderType === 'agent' 
                                        ? "bg-indigo-600 text-white rounded-tr-none" 
                                        : "bg-white text-slate-700 border border-slate-200 rounded-tl-none"
                                )}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                </div>

                {/* Reply Bar */}
                <div className="bg-white p-5 border-t border-slate-200">
                    {selectedTicket.status === 'closed' || selectedTicket.status === 'resolved' ? (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-amber-800">
                                <AlertCircle size={20} />
                                <span className="text-sm font-bold">Este chamado está {selectedTicket.status === 'resolved' ? 'Resolvido' : 'Arquivado'}.</span>
                            </div>
                            <button onClick={() => handleUpdateStatus('in_progress')} className="text-xs font-black text-indigo-600 uppercase hover:underline">Reabrir para responder</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSendReply} className="flex gap-4">
                            <textarea 
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none h-[54px] custom-scrollbar" 
                                placeholder="Digite sua resposta técnica aqui..." 
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendReply(e as any);
                                    }
                                }}
                            />
                            <button 
                                type="submit" 
                                disabled={isSending || !replyText.trim()} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                <span className="hidden sm:inline">Responder</span>
                            </button>
                        </form>
                    )}
                </div>
              </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center animate-in fade-in zoom-in-95">
                <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-indigo-500 mb-8 border border-slate-100">
                    <MessageCircle size={48} className="opacity-20" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Suporte Centralizado VOLL</h3>
                <p className="text-sm max-w-sm font-medium leading-relaxed">Selecione um chamado na lista lateral para gerenciar as solicitações dos pilares Alunos, Instrutores e Studios.</p>
                <div className="mt-8 flex gap-3">
                    <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border text-[10px] font-bold text-slate-400 uppercase tracking-widest"><CheckCircle size={12}/> Respostas Rápidas</div>
                    <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border text-[10px] font-bold text-slate-400 uppercase tracking-widest"><History size={12}/> Histórico Completo</div>
                </div>
            </div>
          )}
      </div>

    </div>
  );
};

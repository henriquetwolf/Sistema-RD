
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SupportTicket, TicketMessage } from '../types';
import { appBackend } from '../services/appBackend';
import { 
    MessageCircle, Search, Filter, RefreshCw, Loader2, Send, 
    CheckCircle, Clock, Inbox, User, UserCheck, Shield, ChevronRight, 
    ArrowLeft, MoreVertical, X, Globe, Mail, Phone, Tag, Building2, School, GraduationCap
} from 'lucide-react';
import clsx from 'clsx';

export const SupportManager: React.FC = () => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');

    const [chatInput, setChatInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const selectedTicket = tickets.find(t => t.id === selectedTicketId);

    useEffect(() => {
        fetchTickets();
        const interval = setInterval(() => fetchTickets(false), 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedTicketId) {
            fetchMessages(selectedTicketId);
            const interval = setInterval(() => fetchMessages(selectedTicketId, false), 10000);
            return () => clearInterval(interval);
        }
    }, [selectedTicketId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchTickets = async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            const data = await appBackend.getSupportTickets();
            setTickets(data);
        } catch (e) {} finally { setIsLoading(false); }
    };

    const fetchMessages = async (ticketId: string, showLoading = true) => {
        if (showLoading) setIsLoadingMessages(true);
        try {
            const data = await appBackend.getTicketMessages(ticketId);
            setMessages(data);
        } catch (e) {} finally { if (showLoading) setIsLoadingMessages(false); }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !selectedTicketId) return;
        setIsSending(true);
        const text = chatInput;
        setChatInput('');
        try {
            // Pegar nome do agente logado
            let agentName = "Atendente VOLL";
            const savedCollab = sessionStorage.getItem('collaborator_session');
            if (savedCollab) {
                agentName = JSON.parse(savedCollab).name;
            }

            await appBackend.addTicketMessage({
                ticketId: selectedTicketId, senderName: agentName, senderType: 'agent', text
            });
            if (selectedTicket?.status === 'open') {
                await appBackend.updateTicketStatus(selectedTicketId, 'in_progress');
                fetchTickets(false);
            }
            await fetchMessages(selectedTicketId, false);
        } catch (e: any) { alert(e.message); setChatInput(text); } finally { setIsSending(false); }
    };

    const handleUpdateStatus = async (status: string) => {
        if (!selectedTicketId) return;
        try {
            await appBackend.updateTicketStatus(selectedTicketId, status);
            fetchTickets(false);
        } catch (e) {}
    };

    const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
            const search = searchTerm.toLowerCase();
            const matchesSearch = t.subject.toLowerCase().includes(search) || t.userName.toLowerCase().includes(search) || t.userEmail.toLowerCase().includes(search);
            const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
            const matchesType = typeFilter === 'all' || t.userType === typeFilter;
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [tickets, searchTerm, statusFilter, typeFilter]);

    const getStatusStyle = (status: string) => {
        switch(status) {
            case 'open': return "bg-blue-100 text-blue-700 border-blue-200";
            case 'in_progress': return "bg-amber-100 text-amber-700 border-amber-200";
            case 'closed': return "bg-green-100 text-green-700 border-green-200";
            default: return "bg-slate-100 text-slate-500";
        }
    };

    const getUserTypeIcon = (type: string) => {
        switch(type) {
            case 'student': return <GraduationCap size={14} className="text-purple-500" />;
            case 'instructor': return <School size={14} className="text-orange-500" />;
            case 'studio': return <Building2 size={14} className="text-teal-500" />;
            default: return <User size={14} />;
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
            {/* Ticket List Sidebar */}
            <aside className={clsx("flex flex-col border-r border-slate-200 w-full md:w-80 lg:w-96 shrink-0", selectedTicketId ? "hidden md:flex" : "flex")}>
                <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><MessageCircle className="text-teal-600" /> Suporte Unificado</h2>
                        <button onClick={() => fetchTickets()} className="p-2 text-slate-400 hover:text-teal-600"><RefreshCw size={18} className={clsx(isLoading && "animate-spin")} /></button>
                    </div>
                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="Buscar chamados..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                        </div>
                        <div className="flex gap-2">
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase px-2 py-1.5 outline-none">
                                <option value="all">Status: Todos</option>
                                <option value="open">Abertos</option>
                                <option value="in_progress">Em Atendimento</option>
                                <option value="closed">Finalizados</option>
                            </select>
                            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase px-2 py-1.5 outline-none">
                                <option value="all">Tipos: Todos</option>
                                <option value="student">Alunos</option>
                                <option value="instructor">Instrutores</option>
                                <option value="studio">Studios</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-white custom-scrollbar divide-y divide-slate-50">
                    {isLoading && tickets.length === 0 ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-teal-600" /></div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="p-10 text-center text-slate-400">
                            <Inbox className="mx-auto opacity-10 mb-4" size={48}/>
                            <p className="text-sm font-bold">Inbox Vazio</p>
                        </div>
                    ) : (
                        filteredTickets.map(t => (
                            <div 
                                key={t.id} 
                                onClick={() => setSelectedTicketId(t.id)}
                                className={clsx(
                                    "p-4 cursor-pointer hover:bg-slate-50 transition-all border-l-4",
                                    selectedTicketId === t.id ? "bg-teal-50/30 border-l-teal-600 shadow-inner" : "border-l-transparent"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={clsx("text-[9px] font-black px-1.5 py-0.5 rounded uppercase border", getStatusStyle(t.status))}>{t.status}</span>
                                    <span className="text-[10px] text-slate-400">{new Date(t.updatedAt).toLocaleDateString()}</span>
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm truncate">{t.subject}</h4>
                                <div className="flex items-center gap-2 mt-2">
                                    {getUserTypeIcon(t.userType)}
                                    <span className="text-[10px] font-bold text-slate-500 truncate">{t.userName}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </aside>

            {/* Chat Area */}
            <main className="flex-1 flex flex-col bg-[#F1F3F4] relative min-w-0">
                {selectedTicket ? (
                    <>
                        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0 z-20">
                            <div className="flex items-center gap-4">
                                <button className="md:hidden p-2 text-slate-500" onClick={() => setSelectedTicketId(null)}><ArrowLeft size={20} /></button>
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200">
                                    {getUserTypeIcon(selectedTicket.userType)}
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800">{selectedTicket.userName}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedTicket.userEmail} • {selectedTicket.userType}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {selectedTicket.status !== 'closed' ? (
                                    <button onClick={() => handleUpdateStatus('closed')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all shadow-md active:scale-95">
                                        <CheckCircle size={16}/> Finalizar Chamado
                                    </button>
                                ) : (
                                    <button onClick={() => handleUpdateStatus('in_progress')} className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all">
                                        <RefreshCw size={16}/> Reabrir Chamado
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50">
                            {isLoadingMessages ? (
                                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-600" /></div>
                            ) : (
                                messages.map(msg => (
                                    <div key={msg.id} className={clsx("flex", msg.senderType === 'user' ? "justify-start" : "justify-end")}>
                                        <div className={clsx("max-w-[70%] px-4 py-3 rounded-2xl shadow-sm text-sm relative", msg.senderType === 'user' ? "bg-white text-slate-800 rounded-tl-none border border-slate-100" : "bg-indigo-600 text-white rounded-tr-none shadow-indigo-600/10")}>
                                            <p className="whitespace-pre-wrap">{msg.text}</p>
                                            <div className={clsx("text-[9px] mt-2 font-black uppercase flex justify-between gap-4", msg.senderType === 'user' ? "text-slate-400" : "text-indigo-200")}>
                                                <span>{msg.senderName}</span>
                                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {selectedTicket.status !== 'closed' && (
                            <div className="p-4 bg-white border-t border-slate-200 shadow-2xl">
                                <form onSubmit={handleSendReply} className="flex gap-2">
                                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm" placeholder="Responda ao chamado aqui..." />
                                    <button type="submit" disabled={isSending || !chatInput.trim()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all font-black uppercase text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20">
                                        {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Responder
                                    </button>
                                </form>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <Shield size={80} className="opacity-5 mb-4" />
                        <h4 className="text-xl font-bold">Inbox Central de Suporte</h4>
                        <p className="text-sm">Selecione uma conversa à esquerda para gerenciar.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

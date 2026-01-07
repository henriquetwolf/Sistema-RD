
import React, { useState, useEffect, useRef } from 'react';
import { SupportTicket, TicketMessage, UserType } from '../types';
import { appBackend } from '../services/appBackend';
import { 
    MessageCircle, Send, Plus, ChevronRight, ArrowLeft, 
    Loader2, CheckCircle2, Clock, AlertCircle, MessageSquare
} from 'lucide-react';
import clsx from 'clsx';

interface SupportChannelProps {
    userId: string;
    userName: string;
    userEmail: string;
    userType: UserType;
}

export const SupportChannel: React.FC<SupportChannelProps> = ({ userId, userName, userEmail, userType }) => {
    const [view, setView] = useState<'list' | 'chat' | 'new'>('list');
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    
    // New Ticket Form
    const [newSubject, setNewSubject] = useState('');
    const [newCategory, setNewCategory] = useState('Dúvida Geral');
    const [newMessage, setNewMessage] = useState('');
    
    // Chat Input
    const [chatInput, setChatInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTickets();
    }, []);

    useEffect(() => {
        if (selectedTicket) {
            fetchMessages(selectedTicket.id);
            const interval = setInterval(() => fetchMessages(selectedTicket.id, false), 10000);
            return () => clearInterval(interval);
        }
    }, [selectedTicket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            const data = await appBackend.getSupportTickets(userId, userType);
            setTickets(data);
        } catch (e) {} finally { setIsLoading(false); }
    };

    const fetchMessages = async (ticketId: string, showLoading = true) => {
        try {
            const data = await appBackend.getTicketMessages(ticketId);
            setMessages(data);
        } catch (e) {}
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubject || !newMessage) return;
        setIsSending(true);
        try {
            const ticket = await appBackend.saveSupportTicket({
                userType, userId, userName, userEmail,
                subject: newSubject, category: newCategory, status: 'open'
            });
            await appBackend.addTicketMessage({
                ticketId: ticket.id, senderId: userId, senderName: userName, senderType: 'user', message: newMessage
            });
            await fetchTickets();
            setSelectedTicket(ticket);
            setView('chat');
            setNewSubject('');
            setNewMessage('');
        } catch (e: any) { alert(e.message); } finally { setIsSending(false); }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !selectedTicket) return;
        setIsSending(true);
        const text = chatInput;
        setChatInput('');
        try {
            await appBackend.addTicketMessage({
                ticketId: selectedTicket.id, senderId: userId, senderName: userName, senderType: 'user', message: text
            });
            await fetchMessages(selectedTicket.id, false);
        } catch (e: any) { alert(e.message); setChatInput(text); } finally { setIsSending(false); }
    };

    const getStatusLabel = (status: string) => {
        switch(status) {
            case 'open': return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-blue-100">Aberto</span>;
            case 'in_progress': return <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-amber-100">Em Atendimento</span>;
            case 'closed': return <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-green-100">Finalizado</span>;
            default: return null;
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px] animate-in fade-in">
            {/* Header */}
            <header className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    {view !== 'list' && (
                        <button onClick={() => { setView('list'); setSelectedTicket(null); fetchTickets(); }} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <div>
                        <h3 className="font-black text-slate-800 flex items-center gap-2">
                            <MessageCircle className="text-teal-600" size={20}/> 
                            Canal de Suporte VOLL
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fale Conosco</p>
                    </div>
                </div>
                {view === 'list' && (
                    <button onClick={() => setView('new')} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase shadow-lg shadow-teal-600/20 transition-all active:scale-95 flex items-center gap-2">
                        <Plus size={16}/> Abrir Chamado
                    </button>
                )}
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                {view === 'list' && (
                    <div className="p-4 space-y-3">
                        {isLoading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-teal-600" size={32}/></div>
                        ) : tickets.length === 0 ? (
                            <div className="py-20 text-center text-slate-400">
                                <MessageSquare className="mx-auto opacity-10 mb-4" size={64}/>
                                <p className="font-bold">Nenhum chamado aberto</p>
                                <p className="text-xs mt-1">Precisa de ajuda? Abra um novo chamado no botão acima.</p>
                            </div>
                        ) : (
                            tickets.map(ticket => (
                                <div 
                                    key={ticket.id} 
                                    onClick={() => { setSelectedTicket(ticket); setView('chat'); }}
                                    className="p-4 rounded-2xl border border-slate-100 hover:border-teal-300 hover:bg-teal-50/20 transition-all cursor-pointer group flex items-center justify-between"
                                >
                                    <div className="flex-1 min-w-0 mr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            {getStatusLabel(ticket.status)}
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{ticket.category}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-sm truncate">{ticket.subject}</h4>
                                        <p className="text-[10px] text-slate-400 mt-1">{new Date(ticket.updatedAt).toLocaleString()}</p>
                                    </div>
                                    <ChevronRight className="text-slate-300 group-hover:text-teal-500 transition-colors" size={20}/>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {view === 'new' && (
                    <form onSubmit={handleCreateTicket} className="p-8 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Assunto / Título</label>
                            <input type="text" required value={newSubject} onChange={e => setNewSubject(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-2xl focus:bg-white focus:border-teal-500 outline-none font-bold" placeholder="Ex: Problema no acesso ao portal" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                            <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-2xl outline-none focus:bg-white focus:border-teal-500 font-bold">
                                <option>Dúvida Geral</option>
                                <option>Financeiro / Cobrança</option>
                                <option>Material / Logística</option>
                                <option>Certificados</option>
                                <option>Cursos Presenciais</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mensagem Inicial</label>
                            <textarea required value={newMessage} onChange={e => setNewMessage(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-2xl h-32 resize-none outline-none focus:bg-white focus:border-teal-500" placeholder="Descreva o que está acontecendo..." />
                        </div>
                        <button type="submit" disabled={isSending} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-teal-600/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                            {isSending ? <Loader2 size={24} className="animate-spin"/> : <Send size={24}/>}
                            Enviar Chamado
                        </button>
                    </form>
                )}

                {view === 'chat' && selectedTicket && (
                    <div className="flex flex-col h-full bg-slate-100">
                        <div className="bg-white p-3 border-b flex items-center justify-between shadow-sm z-10 shrink-0">
                            <div>
                                <h4 className="text-sm font-bold text-slate-800">{selectedTicket.subject}</h4>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{selectedTicket.category}</p>
                            </div>
                            {getStatusLabel(selectedTicket.status)}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {messages.map(msg => (
                                <div key={msg.id} className={clsx("flex", msg.senderType === 'agent' ? "justify-start" : "justify-end")}>
                                    <div className={clsx("max-w-[85%] px-4 py-2 rounded-2xl shadow-sm text-sm", msg.senderType === 'agent' ? "bg-white text-slate-800 rounded-tl-none" : "bg-teal-600 text-white rounded-tr-none")}>
                                        <p className="whitespace-pre-wrap">{msg.message}</p>
                                        <div className={clsx("text-[9px] mt-1 font-bold uppercase", msg.senderType === 'agent' ? "text-slate-400" : "text-teal-100")}>
                                            {msg.senderName} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {selectedTicket.status !== 'closed' ? (
                            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t flex gap-2 shrink-0">
                                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500 text-sm" placeholder="Escreva uma resposta..." />
                                <button type="submit" disabled={isSending || !chatInput.trim()} className="bg-teal-600 text-white p-2.5 rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-all">
                                    {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                </button>
                            </form>
                        ) : (
                            <div className="p-4 bg-slate-100 text-center text-xs font-bold text-slate-500 flex items-center justify-center gap-2 border-t shrink-0">
                                <CheckCircle2 size={16}/> Este chamado foi finalizado.
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

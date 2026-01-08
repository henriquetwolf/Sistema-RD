
import React, { useState, useEffect } from 'react';
/* Added ChevronRight to imports */
import { LifeBuoy, Search, Filter, Clock, CheckCircle, AlertTriangle, User, Mail, MessageSquare, Trash2, Loader2, RefreshCw, X, Send, ChevronRight } from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { SupportTicket } from '../types';
import clsx from 'clsx';

export const SupportManager: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'pending' | 'closed'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'instructor' | 'studio'>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [response, setResponse] = useState('');
  const [isSavingResponse, setIsSavingResponse] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const data = await appBackend.getSupportTickets();
      setTickets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (ticket: SupportTicket, newStatus: SupportTicket['status']) => {
    try {
      await appBackend.saveSupportTicket({ ...ticket, status: newStatus });
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: newStatus } : t));
    } catch (e) {
      alert("Erro ao atualizar status.");
    }
  };

  const handleSaveResponse = async () => {
    if (!selectedTicket || !response.trim()) return;
    setIsSavingResponse(true);
    try {
      const updatedTicket = { 
        ...selectedTicket, 
        response: response.trim(), 
        status: 'closed' as const,
        updatedAt: new Date().toISOString()
      };
      await appBackend.saveSupportTicket(updatedTicket);
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updatedTicket : t));
      setSelectedTicket(updatedTicket);
      setResponse('');
      alert("Resposta enviada e chamado finalizado.");
    } catch (e) {
      alert("Erro ao salvar resposta.");
    } finally {
      setIsSavingResponse(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir chamado permanentemente?")) return;
    try {
      await appBackend.deleteSupportTicket(id);
      setTickets(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      alert("Erro ao excluir.");
    }
  };

  const filtered = tickets.filter(t => {
    const matchesSearch = t.senderName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesRole = roleFilter === 'all' || t.senderRole === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LifeBuoy className="text-indigo-600" /> Suporte Interno
          </h2>
          <p className="text-slate-500 text-sm">Gerencie solicitações de ajuda de alunos, instrutores e studios.</p>
        </div>
        <button onClick={fetchTickets} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
          <RefreshCw size={20} className={clsx(isLoading && "animate-spin")} />
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar nos chamados..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
          />
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-3 py-2 outline-none">
            <option value="all">Todos Status</option>
            <option value="open">Abertos</option>
            <option value="pending">Em Análise</option>
            <option value="closed">Fechados</option>
          </select>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)} className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-3 py-2 outline-none">
            <option value="all">Todas Origens</option>
            <option value="student">Alunos</option>
            <option value="instructor">Instrutores</option>
            <option value="studio">Studios</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-widest border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Usuário / Origem</th>
              <th className="px-6 py-4">Assunto</th>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && tickets.length === 0 ? (
              <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-20 text-center text-slate-400 italic">Nenhum chamado localizado.</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedTicket(t)}>
                <td className="px-6 py-4">
                  <span className={clsx(
                    "text-[9px] font-black px-2 py-1 rounded border uppercase",
                    t.status === 'open' ? "bg-red-50 text-red-700 border-red-100" :
                    t.status === 'pending' ? "bg-amber-50 text-amber-700 border-amber-100" :
                    "bg-green-50 text-green-700 border-green-100"
                  )}>
                    {t.status === 'open' ? 'Aberto' : t.status === 'pending' ? 'Em Análise' : 'Fechado'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{t.senderName}</span>
                    <span className={clsx(
                      "text-[9px] font-black uppercase tracking-tighter w-fit px-1 rounded",
                      t.senderRole === 'student' ? "text-purple-600 bg-purple-50" :
                      t.senderRole === 'instructor' ? "text-orange-600 bg-orange-50" :
                      "text-teal-600 bg-teal-50"
                    )}>{t.senderRole === 'student' ? 'Aluno' : t.senderRole === 'instructor' ? 'Instrutor' : 'Studio'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-slate-600 truncate max-w-xs">{t.subject}</td>
                <td className="px-6 py-4 text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTicket && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700"><MessageSquare size={20}/></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Visualizar Chamado</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Protocolo: {selectedTicket.id.split('-')[0]}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"><X size={24}/></button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border">
                    <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center text-indigo-600 font-bold"><User size={20}/></div>
                    <div><p className="text-xs font-black text-slate-400 uppercase">Solicitante</p><p className="text-sm font-bold text-slate-800">{selectedTicket.senderName}</p><p className="text-[10px] text-slate-500">{selectedTicket.senderEmail}</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border">
                    <Clock className="text-slate-400 ml-2" size={20}/>
                    <div><p className="text-xs font-black text-slate-400 uppercase">Data Abertura</p><p className="text-sm font-bold text-slate-800">{new Date(selectedTicket.createdAt).toLocaleString()}</p></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <p className="text-xs font-black text-indigo-700 uppercase mb-2">Ações de Status</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateStatus(selectedTicket, 'open')} className={clsx("flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", selectedTicket.status === 'open' ? "bg-red-600 text-white shadow-md" : "bg-white text-red-600 border border-red-200")}>Aberto</button>
                      <button onClick={() => handleUpdateStatus(selectedTicket, 'pending')} className={clsx("flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", selectedTicket.status === 'pending' ? "bg-amber-500 text-white shadow-md" : "bg-white text-amber-500 border border-amber-200")}>Análise</button>
                      <button onClick={() => handleUpdateStatus(selectedTicket, 'closed')} className={clsx("flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", selectedTicket.status === 'closed' ? "bg-green-600 text-white shadow-md" : "bg-white text-green-600 border border-green-200")}>Fechado</button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mensagem do Usuário</h4>
                <div className="bg-slate-50 p-6 rounded-2xl border text-sm text-slate-700 leading-relaxed font-medium">
                  <p className="font-black text-slate-900 mb-3 text-base">Assunto: {selectedTicket.subject}</p>
                  {selectedTicket.message}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Resposta da Administração</h4>
                {selectedTicket.response ? (
                  <div className="bg-green-50 p-6 rounded-2xl border border-green-100 text-sm text-green-800 leading-relaxed italic">
                    {selectedTicket.response}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea 
                      className="w-full h-32 p-4 border rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                      placeholder="Escreva a resposta para o usuário..." 
                      value={response} 
                      onChange={e => setResponse(e.target.value)} 
                    />
                    <button 
                      onClick={handleSaveResponse} 
                      disabled={isSavingResponse || !response.trim()} 
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSavingResponse ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>} Enviar Resposta e Finalizar Chamado
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

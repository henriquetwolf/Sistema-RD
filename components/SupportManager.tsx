
import React, { useState, useEffect, useRef, useMemo } from 'react';
// Added 'Users' to the import list from lucide-react
import { LifeBuoy, Search, Filter, Clock, CheckCircle, AlertTriangle, User, Users, Mail, MessageSquare, Trash2, Loader2, RefreshCw, X, Send, ChevronRight, LayoutGrid, Kanban, BarChart3, TrendingUp, Download, Paperclip, FileText, Image as ImageIcon, Timer, BarChart } from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { SupportTicket, SupportMessage, CollaboratorSession } from '../types';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, Legend } from 'recharts';
import clsx from 'clsx';

export const SupportManager: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'dashboard'>('dashboard');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'pending' | 'closed' | 'waiting'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'instructor' | 'studio'>('all');
  const [responderFilter, setResponderFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  
  const [thread, setThread] = useState<SupportMessage[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [response, setResponse] = useState('');
  const [isSavingResponse, setIsSavingResponse] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string, name: string } | null>(null);

  const threadEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentAdmin = useMemo(() => {
    const saved = sessionStorage.getItem('collaborator_session');
    return saved ? JSON.parse(saved) as CollaboratorSession : { name: 'Administrador', id: 'admin' };
  }, []);

  useEffect(() => { fetchTickets(); }, []);
  useEffect(() => { if (selectedTicket) fetchThread(selectedTicket.id); }, [selectedTicket]);
  useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread]);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const data = await appBackend.getSupportTickets();
      setTickets(data);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const fetchThread = async (ticketId: string) => {
      setIsLoadingThread(true);
      try {
          const data = await appBackend.getSupportTicketMessages(ticketId);
          setThread(data);
      } catch (e) { console.error(e); } finally { setIsLoadingThread(false); }
  };

  const handleUpdateStatus = async (ticket: SupportTicket, newStatus: SupportTicket['status']) => {
    try {
      const updated: SupportTicket = { ...ticket, status: newStatus, updatedAt: new Date().toISOString() };
      if (!ticket.assignedId) {
          updated.assignedId = currentAdmin.id;
          updated.assignedName = currentAdmin.name;
      }
      await appBackend.saveSupportTicket(updated);
      setTickets(prev => prev.map(t => t.id === ticket.id ? updated : t));
      if (selectedTicket?.id === ticket.id) setSelectedTicket(updated);
    } catch (e) { alert("Erro ao atualizar."); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => setAttachment({ url: reader.result as string, name: file.name });
          reader.readAsDataURL(file);
      }
  };

  const handleSaveResponse = async () => {
    if (!selectedTicket || (!response.trim() && !attachment)) return;
    setIsSavingResponse(true);
    try {
      await appBackend.addSupportMessage({
          ticketId: selectedTicket.id,
          senderId: currentAdmin.id,
          senderName: currentAdmin.name,
          senderRole: 'admin',
          content: response.trim(),
          attachmentUrl: attachment?.url,
          attachmentName: attachment?.name
      } as any);

      const updatedTicket: SupportTicket = { 
        ...selectedTicket, 
        status: 'pending' as const, 
        assignedId: selectedTicket.assignedId || currentAdmin.id,
        assignedName: selectedTicket.assignedName || currentAdmin.name,
        updatedAt: new Date().toISOString()
      };
      await appBackend.saveSupportTicket(updatedTicket);
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updatedTicket : t));
      setSelectedTicket(updatedTicket);
      setResponse('');
      setAttachment(null);
      await fetchThread(selectedTicket.id);
    } catch (e) { alert("Erro ao salvar."); } finally { setIsSavingResponse(false); }
  };

  const handleDragStartActual = (id: string) => setDraggedTicketId(id);
  const handleDrop = async (newStatus: SupportTicket['status']) => {
      if (!draggedTicketId) return;
      const ticket = tickets.find(t => t.id === draggedTicketId);
      if (ticket && ticket.status !== newStatus) {
          await handleUpdateStatus(ticket, newStatus);
      }
      setDraggedTicketId(null);
  };

  // --- ESTATÍSTICAS AVANÇADAS ---
  const dashStats = useMemo(() => {
      const now = new Date();
      const thisMonth = now.getMonth();
      const todayStr = now.toISOString().split('T')[0];
      
      const ticketsInScope = tickets.filter(t => responderFilter === 'all' || t.assignedName === responderFilter);

      const monthly = ticketsInScope.filter(t => new Date(t.createdAt).getMonth() === thisMonth).length;
      const today = ticketsInScope.filter(t => t.createdAt.split('T')[0] === todayStr).length;
      const solved = ticketsInScope.filter(t => t.status === 'closed').length;

      // 1. Tempo Médio de Resposta (Minutos)
      const respondedTickets = ticketsInScope.filter(t => t.status !== 'open' && t.createdAt !== t.updatedAt);
      let totalMinutes = 0;
      respondedTickets.forEach(t => {
          const start = new Date(t.createdAt).getTime();
          const end = new Date(t.updatedAt).getTime();
          totalMinutes += Math.max(0, (end - start) / (1000 * 60));
      });
      const avgResponseMinutes = respondedTickets.length > 0 ? Math.round(totalMinutes / respondedTickets.length) : 0;

      // 2. Chamados por Horário (Distribuição 00h - 23h)
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
          hour: `${String(i).padStart(2, '0')}:00`,
          count: 0
      }));
      ticketsInScope.forEach(t => {
          const hour = new Date(t.createdAt).getHours();
          hourlyData[hour].count++;
      });

      // 3. Atendimentos por Dia por Responsável (Últimos 7 dias)
      const responders = Array.from(new Set(tickets.map(t => t.assignedName).filter(Boolean))) as string[];
      const trendData: any[] = [];
      for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = d.toISOString().split('T')[0];
          const dayLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          
          const dayEntry: any = { date: dayLabel };
          responders.forEach(r => {
              // Conta quantos tickets foram atualizados (atendidos) por esse responsável nesse dia
              dayEntry[r] = tickets.filter(t => t.assignedName === r && t.updatedAt.split('T')[0] === dStr).length;
          });
          trendData.push(dayEntry);
      }

      return { monthly, today, solved, avgResponseMinutes, trendData, hourlyData, responders };
  }, [tickets, responderFilter]);

  const uniqueResponders = useMemo(() => {
      const names = tickets.map(t => t.assignedName).filter(Boolean) as string[];
      return Array.from(new Set(names)).sort();
  }, [uniqueResponders]);

  const filtered = tickets.filter(t => {
    const matchesSearch = t.senderName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesRole = roleFilter === 'all' || t.senderRole === roleFilter;
    const matchesResponder = responderFilter === 'all' || t.assignedName === responderFilter;
    return matchesSearch && matchesStatus && matchesRole && matchesResponder;
  });

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="animate-in fade-in duration-500 space-y-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LifeBuoy className="text-indigo-600" /> Suporte Interno
          </h2>
          <p className="text-slate-500 text-sm">Painel Administrativo de Atendimento Corporativo.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner shrink-0">
            <button onClick={() => setViewMode('dashboard')} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", viewMode === 'dashboard' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><BarChart3 size={14}/> Dashboard</button>
            <button onClick={() => setViewMode('board')} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", viewMode === 'board' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Kanban size={14}/> Quadro Kanban</button>
            <button onClick={() => setViewMode('list')} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", viewMode === 'list' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><LayoutGrid size={14}/> Lista</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar por assunto ou solicitante..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div className="flex flex-wrap gap-2">
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)} className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-3 py-2 outline-none"><option value="all">Origem: Todos</option><option value="student">Alunos</option><option value="instructor">Instrutores</option><option value="studio">Studios</option></select>
            <select value={responderFilter} onChange={e => setResponderFilter(e.target.value)} className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-3 py-2 outline-none"><option value="all">Atendente: Todos</option>{uniqueResponders.map(r => <option key={r} value={r}>{r}</option>)}</select>
            <button onClick={fetchTickets} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><RefreshCw size={20} className={clsx(isLoading && "animate-spin")} /></button>
        </div>
      </div>

      {/* VIEW: DASHBOARD */}
      {viewMode === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300 pb-10">
              {/* KPIs de Topo */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chamados no Mês</p>
                      <h3 className="text-3xl font-black text-slate-800">{dashStats.monthly}</h3>
                      <div className="absolute top-0 right-0 p-4 opacity-5 text-indigo-600"><TrendingUp size={64}/></div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chamados Hoje</p>
                      <h3 className="text-3xl font-black text-slate-800">{dashStats.today}</h3>
                      <div className="absolute top-0 right-0 p-4 opacity-5 text-teal-600"><Clock size={64}/></div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">T. Médio Resposta</p>
                      <h3 className="text-3xl font-black text-indigo-600">{dashStats.avgResponseMinutes} <span className="text-xs font-normal text-slate-400">min</span></h3>
                      <div className="absolute top-0 right-0 p-4 opacity-5 text-indigo-600"><Timer size={64}/></div>
                  </div>
                  <div className="bg-indigo-600 p-6 rounded-3xl shadow-xl shadow-indigo-600/20 text-white relative overflow-hidden">
                      <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">Resolvidos Total</p>
                      <h3 className="text-3xl font-black">{dashStats.solved}</h3>
                      <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle size={64}/></div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico de Atendimentos por Responsável */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                          <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                              {/* Corrected: Users icon is now imported and available */}
                              <Users size={16} className="text-indigo-500" /> Atendimentos por Responsável (7 dias)
                          </h3>
                      </div>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <ReBarChart data={dashStats.trendData}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                  <Tooltip 
                                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                                    cursor={{fill: '#f8fafc'}}
                                  />
                                  <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', paddingTop: '10px'}} />
                                  {dashStats.responders.map((r, i) => (
                                      <Bar key={r} dataKey={r} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === dashStats.responders.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                                  ))}
                              </ReBarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Gráfico de Distribuição por Horário */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                          <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                              <Clock size={16} className="text-teal-500" /> Volume de Chamados por Horário
                          </h3>
                      </div>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={dashStats.hourlyData}>
                                  <defs>
                                      <linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fontSize: 9}} interval={3} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                  <Area type="monotone" dataKey="count" name="Chamados" stroke="#14b8a6" fillOpacity={1} fill="url(#colorHour)" strokeWidth={3} />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* VIEW: BOARD (Kanban) */}
      {viewMode === 'board' && (
          <div className="flex-1 overflow-x-auto overflow-y-hidden flex gap-6 pb-4 custom-scrollbar">
              {[
                  { id: 'open', label: 'Abertos', color: 'bg-red-500' },
                  { id: 'pending', label: 'Em Análise', color: 'bg-amber-400' },
                  { id: 'waiting', label: 'Aguardando Aluno', color: 'bg-blue-500' },
                  { id: 'closed', label: 'Resolvidos', color: 'bg-green-500' }
              ].map(col => (
                  <div 
                    key={col.id} 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(col.id as any)}
                    className="w-80 flex flex-col h-full bg-slate-100/50 rounded-2xl border border-slate-200 shadow-inner shrink-0"
                  >
                      <div className="p-4 flex items-center justify-between border-b border-slate-200">
                          <div className="flex items-center gap-2">
                              <div className={clsx("w-3 h-3 rounded-full", col.color)}></div>
                              <h4 className="font-black text-xs text-slate-700 uppercase tracking-widest">{col.label}</h4>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-full border">{filtered.filter(t => t.status === (col.id as any)).length}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                          {filtered.filter(t => t.status === (col.id as any)).map(t => (
                              <div 
                                key={t.id} 
                                draggable
                                onDragStart={() => handleDragStartActual(t.id)}
                                onClick={() => setSelectedTicket(t)}
                                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-grab active:cursor-grabbing group"
                              >
                                  <div className="flex justify-between items-start mb-2">
                                      <span className={clsx("text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border", 
                                        t.senderRole === 'student' ? "text-purple-600 border-purple-100 bg-purple-50" :
                                        t.senderRole === 'instructor' ? "text-orange-600 border-orange-100 bg-orange-50" :
                                        "text-teal-600 border-teal-100 bg-teal-50"
                                      )}>{t.senderRole}</span>
                                      <span className="text-[9px] text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <h5 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">{t.subject}</h5>
                                  <p className="text-[10px] text-slate-500 font-bold mb-3">{t.senderName}</p>
                                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                      <div className="flex items-center gap-1.5">
                                          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400 border">{t.assignedName ? t.assignedName.charAt(0) : '?'}</div>
                                          <span className="text-[9px] font-black text-slate-400 uppercase truncate max-w-[100px]">{t.assignedName || 'S/ Atendente'}</span>
                                      </div>
                                      <ChevronRight size={14} className="text-slate-200 group-hover:text-indigo-300 transition-colors" />
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* VIEW: LIST */}
      {viewMode === 'list' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Usuário / Origem</th>
                  <th className="px-6 py-4">Assunto</th>
                  <th className="px-6 py-4">Responsável</th>
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
                      <span className={clsx("text-[9px] font-black px-2 py-1 rounded border uppercase", t.status === 'open' ? "bg-red-50 text-red-700 border-red-100" : t.status === 'pending' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-green-50 text-green-700 border-green-100")}>{t.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col"><span className="font-bold text-slate-800">{t.senderName}</span><span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">{t.senderRole}</span></div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 truncate max-w-xs">{t.subject}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-bold">{t.assignedName || '--'}</td>
                    <td className="px-6 py-4 text-right"><ChevronRight size={18} className="text-slate-200 group-hover:text-indigo-600 ml-auto transition-colors" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      )}

      {/* DETAIL MODAL (Chat) */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8 animate-in zoom-in-95 flex flex-col h-[90vh]">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700"><MessageSquare size={20}/></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Atendimento ao Chamado</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Protocolo: {selectedTicket.id.split('-')[0]}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"><X size={24}/></button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <aside className="w-80 border-r border-slate-100 p-8 space-y-6 hidden lg:block overflow-y-auto custom-scrollbar bg-slate-50/50">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-slate-100 border flex items-center justify-center text-indigo-600 font-bold text-lg">{(selectedTicket.senderName || '?').charAt(0)}</div>
                            <div><p className="text-[10px] font-black text-slate-400 uppercase">Solicitante</p><p className="text-sm font-bold text-slate-800 truncate max-w-[140px]">{selectedTicket.senderName}</p><p className="text-[10px] text-slate-500">{selectedTicket.senderEmail}</p></div>
                        </div>
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                            <p className="text-[10px] font-black text-indigo-700 uppercase mb-3">Status e Fluxo</p>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => handleUpdateStatus(selectedTicket, 'open')} className={clsx("w-full py-2 rounded-lg text-[10px] font-black uppercase transition-all", selectedTicket.status === 'open' ? "bg-red-600 text-white shadow-md" : "bg-white text-red-600 border border-red-100")}>Aberto</button>
                                <button onClick={() => handleUpdateStatus(selectedTicket, 'pending')} className={clsx("w-full py-2 rounded-lg text-[10px] font-black uppercase transition-all", selectedTicket.status === 'pending' ? "bg-amber-500 text-white shadow-md" : "bg-white text-amber-500 border border-amber-100")}>Em Análise</button>
                                <button onClick={() => handleUpdateStatus(selectedTicket, 'waiting')} className={clsx("w-full py-2 rounded-lg text-[10px] font-black uppercase transition-all", selectedTicket.status === 'waiting' ? "bg-blue-500 text-white shadow-md" : "bg-white text-blue-500 border border-blue-100")}>Aguardando Aluno</button>
                                <button onClick={() => handleUpdateStatus(selectedTicket, 'closed')} className="w-full py-2 rounded-lg text-[10px] font-black uppercase bg-green-600 text-white hover:bg-green-700 transition-all shadow-md mt-2">Resolvido / Fechar</button>
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="flex-1 flex flex-col bg-white overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-50/20">
                        <div className="flex justify-start"><div className="bg-white p-5 rounded-2xl rounded-tl-none border shadow-sm max-w-[85%]"><span className="block text-[10px] font-black text-slate-400 uppercase mb-2">Mensagem do Solicitante:</span><p className="text-sm text-slate-700 leading-relaxed font-medium italic">{selectedTicket.message}</p><span className="block text-right text-[9px] text-slate-400 mt-2">{new Date(selectedTicket.createdAt).toLocaleString()}</span></div></div>
                        {thread.map(msg => (
                            <div key={msg.id} className={clsx("flex", msg.senderRole === 'admin' ? "justify-end" : "justify-start")}>
                                <div className={clsx(
                                    "p-5 rounded-2xl shadow-sm max-w-[85%] relative border",
                                    msg.senderRole === 'admin' ? "bg-indigo-600 text-white border-indigo-700 rounded-tr-none" : "bg-white border-slate-100 rounded-tl-none"
                                )}>
                                    <span className={clsx(
                                        "block text-[9px] font-black uppercase mb-2",
                                        msg.senderRole === 'admin' ? "text-indigo-100" : "text-slate-400"
                                    )}>
                                        {msg.senderRole === 'admin' ? `Adm VOLL (${msg.senderName})` : 'Réplica do Usuário'}
                                    </span>
                                    <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
                                    {msg.attachmentUrl && (
                                        <div className="mt-3 p-2 bg-black/5 rounded-xl border border-white/20">
                                            {msg.attachmentUrl.startsWith('data:image') ? (
                                                <div className="relative group/img"><img src={msg.attachmentUrl} className="max-w-full rounded-lg shadow-sm" alt="anexo" /><a href={msg.attachmentUrl} download={msg.attachmentName} className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity rounded-lg text-white"><Download size={24}/></a></div>
                                            ) : (
                                                <a href={msg.attachmentUrl} download={msg.attachmentName} className={clsx("flex items-center gap-2 p-2 text-xs font-bold", msg.senderRole === 'admin' ? "text-indigo-100 hover:text-white" : "text-slate-600 hover:text-indigo-600")}><FileText size={14}/> {msg.attachmentName} <Download size={14} className="ml-auto"/></a>
                                            )}
                                        </div>
                                    )}
                                    <span className={clsx(
                                        "block text-right text-[9px] mt-2",
                                        msg.senderRole === 'admin' ? "text-indigo-200" : "text-slate-400"
                                    )}>{new Date(msg.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                        {isLoadingThread && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-indigo-600" /></div>}
                        <div ref={threadEndRef} />
                    </div>

                    <div className="bg-white p-6 border-t shrink-0">
                        {attachment && (
                            <div className="mb-3 p-2 bg-indigo-50 border border-indigo-100 rounded-xl flex justify-between items-center animate-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600"><Paperclip size={14}/> {attachment.name}</div>
                                <button onClick={() => setAttachment(null)} className="p-1 hover:bg-red-50 text-red-500 rounded"><X size={14}/></button>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all border border-slate-200"><Paperclip size={24}/></button>
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                            <textarea className="flex-1 px-4 py-3 bg-slate-50 border rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20 transition-all" placeholder="Escreva sua resposta..." value={response} onChange={e => setResponse(e.target.value)} />
                            <button onClick={handleSaveResponse} disabled={isSavingResponse || (!response.trim() && !attachment)} className="bg-indigo-600 text-white px-8 rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-indigo-600/20">{isSavingResponse ? <Loader2 size={24} className="animate-spin"/> : <Send size={24}/>}</button>
                        </div>
                    </div>
                </main>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

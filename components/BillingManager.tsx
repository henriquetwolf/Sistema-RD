
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CreditCard, Search, Filter, Download, Loader2, RefreshCw, 
  TrendingUp, AlertCircle, Calendar, DollarSign, User, ArrowRight,
  CheckCircle2, XCircle, MoreHorizontal, Mail, Phone, Clock, Info,
  Copy, ExternalLink, FileText, X, Hash, Tag, ArrowUpRight, ArrowDownRight, Eraser,
  ChevronLeft, ChevronRight, Users, Plus, Save, Link as LinkIcon, List, LayoutGrid, FileSpreadsheet,
  Edit2, Trash2
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { BillingRecord, BillingNegotiation } from '../types';
import clsx from 'clsx';

export const BillingManager: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<'conciliacao' | 'consultoria'>('conciliacao');
  const [records, setRecords] = useState<any[]>([]);
  const [negotiations, setNegotiations] = useState<BillingNegotiation[]>([]);
  const [billingTeam, setBillingTeam] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | number | null>(null);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<any | null>(null);
  
  // Negotiation Modal
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [isSavingNegotiation, setIsSavingNegotiation] = useState(false);
  const [negotiationFormData, setNegotiationFormData] = useState<Partial<BillingNegotiation>>({
      status: 'EDIÇÃO PENDENTE',
      openInstallments: 0,
      totalNegotiatedValue: 0,
      totalInstallments: 0,
      originalValue: 0,
      createdAt: new Date().toISOString()
  });

  // Paging state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    fetchNegotiations();
    fetchBillingTeam();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const isMenuButton = (event.target as HTMLElement).closest('.menu-trigger');
        if (!isMenuButton) {
          setActiveMenuId(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, startDate, endDate, activeMainTab]);

  const fetchBillingTeam = async () => {
      try {
          const { data, error } = await appBackend.client
              .from('crm_collaborators')
              .select('id, full_name')
              .eq('department', 'Cobrança')
              .eq('status', 'active')
              .order('full_name', { ascending: true });
          
          if (error) throw error;
          setBillingTeam(data || []);
      } catch (e) {
          console.error("Erro ao carregar equipe de cobrança:", e);
      }
  };

  const fetchData = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      let allData: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;
      let safetyCounter = 0;

      while (hasMore && safetyCounter < 20) {
        const { data, error } = await appBackend.client
          .from('Conta_Azul_Receber')
          .select('*')
          .order('id', { ascending: false })
          .range(from, from + step - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < step) hasMore = false;
          else from += step;
        } else {
          hasMore = false;
        }
        safetyCounter++;
      }
      setRecords(allData);
    } catch (e) {
      console.error("Erro ao buscar dados de cobrança:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNegotiations = async () => {
      try {
          const data = await appBackend.getBillingNegotiations();
          setNegotiations(data);
      } catch (e) { console.error(e); }
  };

  const handleSaveNegotiation = async () => {
      if (!negotiationFormData.fullName) {
          alert("Nome Completo é obrigatório.");
          return;
      }
      setIsSavingNegotiation(true);
      try {
          await appBackend.saveBillingNegotiation(negotiationFormData);
          await fetchNegotiations();
          setShowNegotiationModal(false);
          setNegotiationFormData({ status: 'EDIÇÃO PENDENTE', openInstallments: 0, totalNegotiatedValue: 0, totalInstallments: 0, originalValue: 0 });
      } catch (e: any) {
          alert(`Erro ao salvar: ${e.message}`);
      } finally {
          setIsSavingNegotiation(false);
      }
  };

  const handleDeleteNegotiation = async (id: string) => {
      if (window.confirm("Excluir esta negociação?")) {
          await appBackend.deleteBillingNegotiation(id);
          fetchNegotiations();
      }
  };

  const getFlexibleField = (obj: any, variations: string[]) => {
    const keys = Object.keys(obj);
    for (const variation of variations) {
      const found = keys.find(k => {
        const normalizedKey = k.toLowerCase().trim();
        const normalizedVar = variation.toLowerCase().trim();
        return normalizedKey === normalizedVar || normalizedKey === `${normalizedVar} (r$)`;
      });
      if (found) return obj[found];
    }
    return null;
  };

  const parseToNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let clean = String(val).replace('R$', '').replace(/\s/g, '');
    if (clean.includes(',')) clean = clean.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const processedRecords = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return records.map(r => {
      const valOrig = parseToNumber(getFlexibleField(r, ['Valor original da parcela', 'Valor original', 'Valor nominal']));
      const valRec = parseToNumber(getFlexibleField(r, ['Valor recebido da parcela', 'Valor recebido', 'Valor pago']));
      const rawStatus = getFlexibleField(r, ['Status', 'Situação']) || 'Pendente';
      const vencStr = getFlexibleField(r, ['Vencimento', 'Data de vencimento', 'Vencimento original']);
      
      let finalStatus = rawStatus;
      const isPaidRaw = rawStatus === 'Pago' || rawStatus === 'Liquidado' || rawStatus === 'Liquidado antecipadamente';

      if (!isPaidRaw && valOrig > 0) {
        if (valRec >= valOrig) finalStatus = 'Pago';
        else if (valRec > 0) finalStatus = 'Pago';
        else if (vencStr) {
          const parts = vencStr.split('/');
          if (parts.length === 3) {
            const vencDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            if (vencDate < now) finalStatus = 'Atrasado';
            else finalStatus = 'Pendente';
          }
        }
      }

      return {
        ...r,
        _display_name: getFlexibleField(r, ['Nome do cliente', 'Cliente', 'Nome']),
        _display_id_cliente: getFlexibleField(r, ['Identificador do cliente', 'Identificador', 'ID Cliente']),
        _display_ref: getFlexibleField(r, ['Código referência', 'Referência', 'Ref']),
        _display_comp: getFlexibleField(r, ['Data de competência', 'Competência']),
        _display_venc: vencStr,
        _display_valor_original: valOrig,
        _display_valor_recebido: valRec,
        _display_status: finalStatus
      };
    });
  }, [records]);

  const filteredRecords = useMemo(() => {
    return processedRecords.filter(r => {
      const name = String(r._display_name || '').toLowerCase();
      const id = String(r._display_id_cliente || '').toLowerCase();
      const ref = String(r._display_ref || '').toLowerCase();
      const search = searchTerm.toLowerCase();

      const matchesSearch = name.includes(search) || id.includes(search) || ref.includes(search);
      const matchesStatus = statusFilter === 'all' || r._display_status === statusFilter;

      let matchesDate = true;
      if (startDate || endDate) {
        const dateStr = r._display_venc;
        if (dateStr) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const recordDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            if (startDate && recordDate < startDate) matchesDate = false;
            if (endDate && recordDate > endDate) matchesDate = false;
          } else matchesDate = false;
        } else matchesDate = false;
      }
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [processedRecords, searchTerm, statusFilter, startDate, endDate]);

  const filteredNegotiations = useMemo(() => {
      const search = searchTerm.toLowerCase();
      return negotiations.filter(n => 
          (n.fullName || '').toLowerCase().includes(search) ||
          (n.identifierCode || '').toLowerCase().includes(search) ||
          (n.responsibleAgent || '').toLowerCase().includes(search)
      );
  }, [negotiations, searchTerm]);

  const stats = useMemo(() => {
    const totalValueOriginal = filteredRecords.reduce((acc, curr) => acc + curr._display_valor_original, 0);
    const totalRecebido = filteredRecords.reduce((acc, curr) => acc + curr._display_valor_recebido, 0);
    const paidCount = filteredRecords.filter(r => r._display_status === 'Pago' || r._display_status === 'Liquidado').length;
    const overdueCount = filteredRecords.filter(r => r._display_status === 'Atrasado' || r._display_status === 'Vencido').length;

    return { 
      total: filteredRecords.length, 
      totalOriginal: totalValueOriginal, 
      totalRecebido: totalRecebido, 
      paid: paidCount, 
      overdue: overdueCount,
      pending: filteredRecords.length - paidCount - overdueCount
    };
  }, [filteredRecords]);

  // Pagination Logic
  const currentFilteredList = activeMainTab === 'conciliacao' ? filteredRecords : filteredNegotiations;
  const totalPages = Math.ceil(currentFilteredList.length / itemsPerPage);
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return currentFilteredList.slice(start, start + itemsPerPage);
  }, [currentFilteredList, currentPage]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="animate-in fade-in duration-500 space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="text-teal-600" /> Gestão de Cobrança
          </h2>
          <p className="text-slate-500 text-sm">Controle de faturamento e negociações de inadimplência.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner shrink-0">
            <button onClick={() => setActiveMainTab('conciliacao')} className={clsx("px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", activeMainTab === 'conciliacao' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                <RefreshCw size={14}/> Conciliação Bancária
            </button>
            <button onClick={() => setActiveMainTab('consultoria')} className={clsx("px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", activeMainTab === 'consultoria' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                <Users size={14}/> Consultoria de Cobrança
            </button>
        </div>
      </div>

      {activeMainTab === 'conciliacao' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5"><DollarSign size={64} className="text-teal-600" /></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Recebido</p>
                <h3 className="text-2xl font-black text-emerald-600">{formatCurrency(stats.totalRecebido)}</h3>
                <p className="text-[10px] text-slate-500 mt-2">De um total original de {formatCurrency(stats.totalOriginal)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5"><CheckCircle2 size={64} className="text-green-600" /></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Liquidados</p>
                <h3 className="text-2xl font-black text-green-600">{stats.paid}</h3>
                <p className="text-[10px] text-green-500 mt-2">Pagamentos confirmados</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5"><Clock size={64} className="text-amber-600" /></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Pendentes</p>
                <h3 className="text-2xl font-black text-amber-600">{stats.pending}</h3>
                <p className="text-[10px] text-slate-500 mt-2">Aguardando vencimento</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5"><XCircle size={64} className="text-red-600" /></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Atrasados</p>
                <h3 className="text-2xl font-black text-red-600">{stats.overdue}</h3>
                <p className="text-[10px] text-red-500 mt-2">Urgente: Inadimplência</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Buscar por cliente, identificador ou referência..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white border border-slate-200 text-slate-600 text-sm rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="all">Todos os Status</option>
                    <option value="Pago">Pago</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Atrasado">Atrasado</option>
                </select>
                </div>
                <div className="flex flex-col md:flex-row items-end md:items-center gap-4 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 mr-2">
                    <Filter size={16} />
                    <span className="text-xs font-bold uppercase ml-1">Filtro de Vencimento:</span>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">De:</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Até:</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                {(searchTerm || statusFilter !== 'all' || startDate || endDate) && (
                    <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setStartDate(''); setEndDate(''); }} className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 transition-colors ml-auto px-3 py-1.5 hover:bg-red-50 rounded-lg"><Eraser size={14} /> Limpar Filtros</button>
                )}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="flex-1 overflow-x-auto overflow-visible">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-teal-600" size={40} /></div>
                ) : paginatedList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400"><AlertCircle size={48} className="opacity-20 mb-2" /><p>Nenhum registro encontrado para os filtros atuais.</p></div>
                ) : (
                    <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">ID</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Vencimento</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Valor Original</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Valor Recebido</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                        <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedList.map((record: any) => (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4 font-mono text-[11px] text-slate-400">#{record.id}</td>
                            <td className="px-6 py-4"><div className="flex flex-col"><span className="font-bold text-slate-800">{record._display_name}</span><span className="text-[10px] text-slate-400 font-mono">Ref: {record._display_ref || '--'}</span></div></td>
                            <td className="px-6 py-4 font-bold text-slate-700 text-xs">{record._display_venc || '--/--/----'}</td>
                            <td className="px-6 py-4 font-medium text-slate-600 text-right">{formatCurrency(record._display_valor_original)}</td>
                            <td className="px-6 py-4 font-black text-emerald-600 text-right">{formatCurrency(record._display_valor_recebido)}</td>
                            <td className="px-6 py-4 text-center">
                            <span className={clsx("text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter border", (record._display_status === 'Pago' || record._display_status === 'Liquidado') ? "bg-green-50 text-green-700 border-green-200" : (record._display_status === 'Atrasado' || record._display_status === 'Vencido') ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200")}>{record._display_status}</span>
                            </td>
                            <td className="px-6 py-4 text-right relative">
                            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === record.id ? null : record.id); }} className="menu-trigger p-2 text-slate-400 hover:text-teal-600 rounded-lg transition-colors"><MoreHorizontal size={18} /></button>
                            {activeMenuId === record.id && (
                                <div ref={menuRef} className="absolute right-10 top-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] py-1 animate-in fade-in zoom-in-95 duration-100">
                                <button onClick={() => { navigator.clipboard.writeText(record._display_id_cliente); alert("ID Copiado!"); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Copy size={14} /> Copiar ID Cliente</button>
                                <button onClick={() => { setSelectedDetailRecord(record); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><FileText size={14} /> Ver Detalhes</button>
                                </div>
                            )}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                )}
                </div>
            </div>
          </>
      ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
              {/* TOOLBAR CONSULTORIA */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                  <div className="relative max-w-sm w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" placeholder="Buscar por aluno ou consultor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <button onClick={() => { setNegotiationFormData({ status: 'EDIÇÃO PENDENTE', openInstallments: 0, totalNegotiatedValue: 0, totalInstallments: 0, originalValue: 0, createdAt: new Date().toISOString() }); setShowNegotiationModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95">
                      <Plus size={18} /> Registrar Negociação
                  </button>
              </div>

              {/* LISTAGEM CONSULTORIA */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Aluno / Produto</th>
                                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Consultor</th>
                                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Vencimento</th>
                                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase text-right">V. Negociado</th>
                                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase text-center">Status</th>
                                  <th className="px-6 py-4"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {paginatedList.map((neg: BillingNegotiation) => (
                                  <tr key={neg.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4">
                                          <div className="flex flex-col">
                                              <span className="font-bold text-slate-800">{neg.fullName}</span>
                                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter flex items-center gap-1"><Tag size={10}/> {neg.productName}</span>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-xs font-bold text-slate-600">{neg.responsibleAgent || '--'}</td>
                                      <td className="px-6 py-4 text-xs font-bold text-red-600">{neg.dueDate ? new Date(neg.dueDate).toLocaleDateString() : '--'}</td>
                                      <td className="px-6 py-4 text-right font-black text-indigo-700">{formatCurrency(neg.totalNegotiatedValue)}</td>
                                      <td className="px-6 py-4 text-center">
                                          <span className={clsx("text-[9px] font-black px-2 py-1 rounded border uppercase", neg.status === 'PAGO' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700")}>{neg.status}</span>
                                      </td>
                                      <td className="px-6 py-4 text-right relative">
                                          <button onClick={() => setActiveMenuId(activeMenuId === neg.id ? null : neg.id)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors"><MoreHorizontal size={18}/></button>
                                          {activeMenuId === neg.id && (
                                              <div ref={menuRef} className="absolute right-10 top-0 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] py-1 animate-in fade-in zoom-in-95 duration-100">
                                                  <button onClick={() => { setNegotiationFormData(neg); setShowNegotiationModal(true); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit2 size={14}/> Editar</button>
                                                  <button onClick={() => handleDeleteNegotiation(neg.id)} className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14}/> Excluir</button>
                                              </div>
                                          )}
                                      </td>
                                  </tr>
                              ))}
                              {paginatedList.length === 0 && (
                                  <tr><td colSpan={6} className="p-20 text-center text-slate-400 italic">Nenhum registro de negociação encontrado.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* FOOTER PAGING */}
      {totalPages > 1 && (
        <div className="px-6 py-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm shrink-0 mt-4">
          <p className="text-xs text-slate-500">Mostrando {paginatedList.length} de {currentFilteredList.length} registros</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border bg-white disabled:opacity-50"><ChevronLeft size={18} /></button>
            <span className="px-4 text-xs font-bold text-slate-600">Página {currentPage} de {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border bg-white disabled:opacity-50"><ChevronRight size={18} /></button>
          </div>
        </div>
      )}

      {/* MODAL CADASTRO CONSULTORIA */}
      {showNegotiationModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[95vh]">
                  <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700"><Users size={20}/></div>
                          <div><h3 className="text-xl font-bold text-slate-800">Ficha de Negociação de Cobrança</h3><p className="text-xs text-slate-500 uppercase font-black tracking-widest">Consultoria Interna</p></div>
                      </div>
                      <button onClick={() => setShowNegotiationModal(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg transition-colors"><X size={24}/></button>
                  </div>

                  <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10">
                      {/* INDICADORES COLORIDOS (Topo do Modal) */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                              <label className="block text-[10px] font-black text-amber-700 uppercase mb-1">🟡 Parcelas em Aberto</label>
                              <input type="number" className="w-full bg-transparent border-none p-0 text-xl font-black text-amber-900 focus:ring-0" value={negotiationFormData.openInstallments} onChange={e => setNegotiationFormData({...negotiationFormData, openInstallments: parseInt(e.target.value) || 0})} />
                          </div>
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                              <label className="block text-[10px] font-black text-blue-700 uppercase mb-1">🔵 Valor Total Negociado</label>
                              <input type="number" className="w-full bg-transparent border-none p-0 text-xl font-black text-blue-900 focus:ring-0" value={negotiationFormData.totalNegotiatedValue} onChange={e => setNegotiationFormData({...negotiationFormData, totalNegotiatedValue: parseFloat(e.target.value) || 0})} />
                          </div>
                          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                              <label className="block text-[10px] font-black text-green-700 uppercase mb-1">🟢 Número de Parcelas</label>
                              <input type="number" className="w-full bg-transparent border-none p-0 text-xl font-black text-green-900 focus:ring-0" value={negotiationFormData.totalInstallments} onChange={e => setNegotiationFormData({...negotiationFormData, totalInstallments: parseInt(e.target.value) || 0})} />
                          </div>
                          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                              <label className="block text-[10px] font-black text-red-700 uppercase mb-1">🔴 Vencimento da Acordo</label>
                              <input type="date" className="w-full bg-transparent border-none p-0 text-sm font-black text-red-900 focus:ring-0" value={negotiationFormData.dueDate} onChange={e => setNegotiationFormData({...negotiationFormData, dueDate: e.target.value})} />
                          </div>
                      </div>

                      {/* DADOS DO CLIENTE E PRODUTO */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo do Aluno *</label>
                              <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm font-bold" value={negotiationFormData.fullName} onChange={e => setNegotiationFormData({...negotiationFormData, fullName: e.target.value})} placeholder="Insira o nome aqui" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código Identificador</label>
                              <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={negotiationFormData.identifierCode} onChange={e => setNegotiationFormData({...negotiationFormData, identifierCode: e.target.value})} placeholder="Ex: 7976" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Produto / Curso</label>
                              <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={negotiationFormData.productName} onChange={e => setNegotiationFormData({...negotiationFormData, productName: e.target.value})} placeholder="Insira o produto aqui" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Original (R$)</label>
                              <input type="number" className="w-full px-3 py-2 border rounded-lg text-sm font-bold" value={negotiationFormData.originalValue} onChange={e => setNegotiationFormData({...negotiationFormData, originalValue: parseFloat(e.target.value) || 0})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Responsável Atendimento</label>
                              <select 
                                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white" 
                                  value={negotiationFormData.responsibleAgent || ''} 
                                  onChange={e => setNegotiationFormData({...negotiationFormData, responsibleAgent: e.target.value})}
                              >
                                  <option value="">Selecione...</option>
                                  {billingTeam.map(member => (
                                      <option key={member.id} value={member.full_name}>{member.full_name}</option>
                                  ))}
                              </select>
                          </div>
                          <div className="md:col-span-1">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Forma de Pagamento</label>
                              <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={negotiationFormData.paymentMethod} onChange={e => setNegotiationFormData({...negotiationFormData, paymentMethod: e.target.value})} placeholder="—" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status da Negociação</label>
                              <select className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white" value={negotiationFormData.status} onChange={e => setNegotiationFormData({...negotiationFormData, status: e.target.value})}>
                                  <option value="EDIÇÃO PENDENTE">EDIÇÃO PENDENTE</option>
                                  <option value="AGUARDANDO PAGAMENTO">AGUARDANDO PAGAMENTO</option>
                                  <option value="PAGO">PAGO</option>
                                  <option value="QUEBRA DE ACORDO">QUEBRA DE ACORDO</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Equipe</label>
                              <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={negotiationFormData.team} onChange={e => setNegotiationFormData({...negotiationFormData, team: e.target.value})} placeholder="—" />
                          </div>
                          <div className="md:col-span-3 border-t pt-6">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Negociação Referente à</label>
                              <textarea className="w-full px-3 py-2 border rounded-lg text-sm h-20 resize-none" value={negotiationFormData.negotiationReference} onChange={e => setNegotiationFormData({...negotiationFormData, negotiationReference: e.target.value})} placeholder="Insira o valor aqui" />
                          </div>
                          <div className="md:col-span-3">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações Gerais</label>
                              <textarea className="w-full px-3 py-2 border rounded-lg text-sm h-32 resize-none" value={negotiationFormData.observations} onChange={e => setNegotiationFormData({...negotiationFormData, observations: e.target.value})} placeholder="Insira o valor aqui" />
                          </div>
                      </div>

                      {/* LINKS E COMPROVANTES */}
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><LinkIcon size={14}/> Links e Documentação</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Comprovante de Pagamento (LINK)</label>
                                  <div className="flex gap-2"><input type="text" className="flex-1 px-3 py-2 border rounded-lg text-xs font-mono" value={negotiationFormData.voucherLink1} onChange={e => setNegotiationFormData({...negotiationFormData, voucherLink1: e.target.value})} placeholder="Inserir uma URL" />{negotiationFormData.voucherLink1 && <a href={negotiationFormData.voucherLink1} target="_blank" className="p-2 bg-white border rounded-lg text-blue-600"><ExternalLink size={14}/></a>}</div>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Comprovante de Pagamento (LINK 2)</label>
                                  <div className="flex gap-2"><input type="text" className="flex-1 px-3 py-2 border rounded-lg text-xs font-mono" value={negotiationFormData.voucherLink2} onChange={e => setNegotiationFormData({...negotiationFormData, voucherLink2: e.target.value})} placeholder="Inserir uma URL" />{negotiationFormData.voucherLink2 && <a href={negotiationFormData.voucherLink2} target="_blank" className="p-2 bg-white border rounded-lg text-blue-600"><ExternalLink size={14}/></a>}</div>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Comprovante de Pagamento (LINK 3)</label>
                                  <div className="flex gap-2"><input type="text" className="flex-1 px-3 py-2 border rounded-lg text-xs font-mono" value={negotiationFormData.voucherLink3} onChange={e => setNegotiationFormData({...negotiationFormData, voucherLink3: e.target.value})} placeholder="Inserir uma URL" />{negotiationFormData.voucherLink3 && <a href={negotiationFormData.voucherLink3} target="_blank" className="p-2 bg-white border rounded-lg text-blue-600"><ExternalLink size={14}/></a>}</div>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Boletos para Envio (LINK)</label>
                                  <div className="flex gap-2"><input type="text" className="flex-1 px-3 py-2 border rounded-lg text-xs font-mono" value={negotiationFormData.boletosLink} onChange={e => setNegotiationFormData({...negotiationFormData, boletosLink: e.target.value})} placeholder="Inserir uma URL" />{negotiationFormData.boletosLink && <a href={negotiationFormData.boletosLink} target="_blank" className="p-2 bg-white border rounded-lg text-blue-600"><ExternalLink size={14}/></a>}</div>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Data Teste</label>
                                  <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={negotiationFormData.testDate} onChange={e => setNegotiationFormData({...negotiationFormData, testDate: e.target.value})} placeholder="Insira o valor aqui" />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Anexos / Documentos (Cloud)</label>
                                  <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={negotiationFormData.attachments} onChange={e => setNegotiationFormData({...negotiationFormData, attachments: e.target.value})} placeholder="Adicionar anexos" />
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="px-8 py-5 bg-slate-50 flex justify-between items-center gap-3 shrink-0 border-t">
                      <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-400 uppercase">Criado em:</span>
                              <span className="text-xs font-bold text-slate-600">{new Date(negotiationFormData.createdAt!).toLocaleDateString('pt-BR')}</span>
                          </div>
                      </div>
                      <div className="flex gap-3">
                          <button onClick={() => setShowNegotiationModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-bold text-sm">Cancelar</button>
                          <button onClick={handleSaveNegotiation} disabled={isSavingNegotiation} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-2.5 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 active:scale-95 transition-all">
                              {isSavingNegotiation ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                              Salvar Negociação
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL DETALHES CONCILIACAO (Existente) */}
      {selectedDetailRecord && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3"><div className="bg-teal-100 p-2 rounded-lg text-teal-600"><CreditCard size={20} /></div><div><h3 className="font-bold text-slate-800">Detalhes do Recebimento</h3><p className="text-xs text-slate-500">ID Lançamento: #{selectedDetailRecord.id}</p></div></div>
              <button onClick={() => setSelectedDetailRecord(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4"><div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center text-teal-600 shadow-sm"><User size={24} /></div><div><h4 className="font-black text-slate-800 text-lg leading-tight">{selectedDetailRecord._display_name}</h4><p className="text-xs text-slate-500 font-mono">ID Cliente: {selectedDetailRecord._display_id_cliente || '--'}</p></div></div>
                <div className={clsx("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border w-fit", (selectedDetailRecord._display_status === 'Pago' || selectedDetailRecord._display_status === 'Liquidado') ? "bg-green-50 text-green-700 border-green-200" : (selectedDetailRecord._display_status === 'Atrasado' || selectedDetailRecord._display_status === 'Vencido') ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200")}>{selectedDetailRecord._display_status}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b pb-2"><Tag size={12} /> Dados do Título</h5>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-bold uppercase">Referência</span><span className="text-sm font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{selectedDetailRecord._display_ref || '--'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-bold uppercase">Competência</span><span className="text-sm font-bold text-slate-800">{selectedDetailRecord._display_comp || '--'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-bold uppercase">Data Vencimento</span><span className="text-sm font-bold text-red-600">{selectedDetailRecord._display_venc || '--'}</span></div>
                  </div>
                </div>
                <div className="space-y-6">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b pb-2"><DollarSign size={12} /> Comparativo de Valores</h5>
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><div className="flex justify-between items-center mb-1"><span className="text-[10px] text-slate-400 font-black uppercase">Valor Faturado</span><ArrowUpRight size={14} className="text-slate-300" /></div><p className="text-xl font-black text-slate-700">{formatCurrency(selectedDetailRecord._display_valor_original)}</p></div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100"><div className="flex justify-between items-center mb-1"><span className="text-[10px] text-emerald-600 font-black uppercase">Valor Recebido (Líquido)</span><ArrowDownRight size={14} className="text-emerald-500" /></div><p className="text-xl font-black text-emerald-700">{formatCurrency(selectedDetailRecord._display_valor_recebido)}</p></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0"><button onClick={() => setSelectedDetailRecord(null)} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-sm shadow-lg transition-all active:scale-95">Fechar Detalhes</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

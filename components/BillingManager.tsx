
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CreditCard, Search, Filter, Loader2, RefreshCw,
  AlertCircle, DollarSign, User,
  CheckCircle2, XCircle, MoreHorizontal, Clock,
  Copy, ExternalLink, FileText, X, Tag, ArrowUpRight, ArrowDownRight, Eraser,
  ChevronLeft, ChevronRight, Users, Plus, Save, Link as LinkIcon,
  Edit2, Trash2
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { contaAzulService } from '../services/contaAzulService';
import type { ReceivableStats } from '../services/contaAzulService';
import { BillingNegotiation, ContaAzulReceivable } from '../types';
import clsx from 'clsx';

const getDisplayStatus = (record: ContaAzulReceivable): string => {
  const status = (record.status || '').toLowerCase();
  if (status.includes('liquidado')) return 'Pago';
  if (record.valor > 0 && Number(record.valor_pago || 0) >= Number(record.valor)) return 'Pago';
  const today = new Date().toISOString().split('T')[0];
  if (record.data_vencimento && record.data_vencimento < today) return 'Atrasado';
  return 'Pendente';
};

const getStatusStyle = (displayStatus: string): string => {
  if (displayStatus === 'Pago') return 'bg-green-50 text-green-700 border-green-200';
  if (displayStatus === 'Atrasado') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '--';
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('pt-BR');
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const BillingManager: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<'conciliacao' | 'consultoria'>('conciliacao');

  // Conciliação
  const [records, setRecords] = useState<ContaAzulReceivable[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [receivableStats, setReceivableStats] = useState<ReceivableStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Consultoria
  const [negotiations, setNegotiations] = useState<BillingNegotiation[]>([]);
  const [billingTeam, setBillingTeam] = useState<any[]>([]);
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

  // Shared
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | number | null>(null);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<ContaAzulReceivable | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const menuRef = useRef<HTMLDivElement>(null);
  const fetchIdRef = useRef(0);

  // ── Debounce search ──────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ── Initial load ─────────────────────────────────────────
  useEffect(() => {
    fetchStats();
    fetchNegotiations();
    fetchBillingTeam();

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const isMenuButton = (event.target as HTMLElement).closest('.menu-trigger');
        if (!isMenuButton) setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Reset page on filter / tab change ────────────────────
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, startDate, endDate, activeMainTab]);

  // ── Server-side fetch for conciliação ────────────────────
  useEffect(() => {
    if (activeMainTab !== 'conciliacao') return;
    let cancelled = false;
    const id = ++fetchIdRef.current;

    const load = async () => {
      setIsLoading(true);
      try {
        const { data, count } = await contaAzulService.getReceivables({
          search: debouncedSearch || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          limit: itemsPerPage,
          offset: (currentPage - 1) * itemsPerPage,
        });
        if (!cancelled && fetchIdRef.current === id) {
          setRecords(data);
          setTotalCount(count);
        }
      } catch (e) {
        console.error('Erro ao buscar dados de cobrança:', e);
      } finally {
        if (!cancelled && fetchIdRef.current === id) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [debouncedSearch, statusFilter, startDate, endDate, currentPage, activeMainTab, refreshTrigger]);

  // ── Data fetchers ────────────────────────────────────────
  const fetchStats = async () => {
    try {
      const stats = await contaAzulService.getReceivableStats();
      setReceivableStats(stats);
    } catch (e) {
      console.error('Erro ao carregar estatísticas:', e);
    }
  };

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
      console.error('Erro ao carregar equipe de cobrança:', e);
    }
  };

  const fetchNegotiations = async () => {
    try {
      const data = await appBackend.getBillingNegotiations();
      setNegotiations(data);
    } catch (e) { console.error(e); }
  };

  // ── Sync handler ─────────────────────────────────────────
  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncProgress('Iniciando sincronização...');
    try {
      const result = await contaAzulService.triggerSyncChunked('receivables', (chunk, total) => {
        setSyncProgress(`Sincronizando lote ${chunk} de ${total}...`);
      });
      setSyncProgress(`${result.sincronizados} registros sincronizados.`);
      fetchStats();
      setRefreshTrigger(n => n + 1);
      setTimeout(() => setSyncProgress(''), 4000);
    } catch (e: any) {
      setSyncProgress(`Erro: ${e.message}`);
      setTimeout(() => setSyncProgress(''), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Negotiation handlers ─────────────────────────────────
  const handleSaveNegotiation = async () => {
    if (!negotiationFormData.fullName) {
      alert('Nome Completo é obrigatório.');
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
    if (window.confirm('Excluir esta negociação?')) {
      await appBackend.deleteBillingNegotiation(id);
      fetchNegotiations();
    }
  };

  // ── Consultoria filtering (client-side) ──────────────────
  const filteredNegotiations = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return negotiations.filter(n =>
      (n.fullName || '').toLowerCase().includes(search) ||
      (n.identifierCode || '').toLowerCase().includes(search) ||
      (n.responsibleAgent || '').toLowerCase().includes(search)
    );
  }, [negotiations, searchTerm]);

  // ── Pagination ───────────────────────────────────────────
  const conciliacaoTotalPages = Math.ceil(totalCount / itemsPerPage);
  const consultoriaTotalPages = Math.ceil(filteredNegotiations.length / itemsPerPage);
  const totalPages = activeMainTab === 'conciliacao' ? conciliacaoTotalPages : consultoriaTotalPages;

  const paginatedNegotiations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredNegotiations.slice(start, start + itemsPerPage);
  }, [filteredNegotiations, currentPage]);

  const displayTotalCount = activeMainTab === 'conciliacao' ? totalCount : filteredNegotiations.length;
  const displayPageCount = activeMainTab === 'conciliacao' ? records.length : paginatedNegotiations.length;

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="animate-in fade-in duration-500 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="text-teal-600" /> Gestão de Cobrança
          </h2>
          <p className="text-slate-500 text-sm">Controle de faturamento e negociações de inadimplência.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeMainTab === 'conciliacao' && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm border',
                isSyncing
                  ? 'bg-amber-50 text-amber-700 border-amber-200 cursor-wait'
                  : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 active:scale-95'
              )}
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? syncProgress : 'Sincronizar Conta Azul'}
            </button>
          )}
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner shrink-0">
            <button onClick={() => setActiveMainTab('conciliacao')} className={clsx('px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2', activeMainTab === 'conciliacao' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              <RefreshCw size={14} /> Conciliação Bancária
            </button>
            <button onClick={() => setActiveMainTab('consultoria')} className={clsx('px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2', activeMainTab === 'consultoria' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              <Users size={14} /> Consultoria de Cobrança
            </button>
          </div>
        </div>
      </div>

      {syncProgress && !isSyncing && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2">
          <CheckCircle2 size={14} /> {syncProgress}
        </div>
      )}

      {activeMainTab === 'conciliacao' ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5"><DollarSign size={64} className="text-teal-600" /></div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Recebido</p>
              <h3 className="text-2xl font-black text-emerald-600">{formatCurrency(receivableStats?.totalRecebido ?? 0)}</h3>
              <p className="text-[10px] text-slate-500 mt-2">De um total original de {formatCurrency(receivableStats?.totalOriginal ?? 0)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5"><CheckCircle2 size={64} className="text-green-600" /></div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Liquidados</p>
              <h3 className="text-2xl font-black text-green-600">{receivableStats?.paidCount ?? 0}</h3>
              <p className="text-[10px] text-green-500 mt-2">Pagamentos confirmados</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5"><Clock size={64} className="text-amber-600" /></div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Pendentes</p>
              <h3 className="text-2xl font-black text-amber-600">{receivableStats?.pendingCount ?? 0}</h3>
              <p className="text-[10px] text-slate-500 mt-2">Aguardando vencimento</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5"><XCircle size={64} className="text-red-600" /></div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Atrasados</p>
              <h3 className="text-2xl font-black text-red-600">{receivableStats?.overdueCount ?? 0}</h3>
              <p className="text-[10px] text-red-500 mt-2">Urgente: Inadimplência</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Buscar por cliente, descrição ou referência..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
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

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="flex-1 overflow-x-auto overflow-visible">
              {isLoading ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-teal-600" size={40} /></div>
              ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400"><AlertCircle size={48} className="opacity-20 mb-2" /><p>Nenhum registro encontrado para os filtros atuais.</p></div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                      <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Vencimento</th>
                      <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Categoria</th>
                      <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Parcela</th>
                      <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Valor</th>
                      <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Recebido</th>
                      <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                      <th className="px-4 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((record) => {
                      const displayStatus = getDisplayStatus(record);
                      return (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">{record.contato_nome || '--'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Ref: {record.numero_documento || '--'}</span>
                              {record.descricao && <span className="text-[10px] text-slate-400 truncate max-w-[220px]">{record.descricao}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-bold text-slate-700 text-xs whitespace-nowrap">{formatDate(record.data_vencimento)}</td>
                          <td className="px-4 py-4 text-xs text-slate-500 max-w-[140px] truncate">{record.categoria_nome || '--'}</td>
                          <td className="px-4 py-4 text-xs text-slate-500 text-center whitespace-nowrap">
                            {record.parcela_numero && record.total_parcelas
                              ? `${record.parcela_numero}/${record.total_parcelas}`
                              : '--'}
                          </td>
                          <td className="px-4 py-4 font-medium text-slate-600 text-right whitespace-nowrap">{formatCurrency(Number(record.valor || 0))}</td>
                          <td className="px-4 py-4 font-black text-emerald-600 text-right whitespace-nowrap">{formatCurrency(Number(record.valor_pago || 0))}</td>
                          <td className="px-4 py-4 text-center">
                            <span className={clsx('text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter border', getStatusStyle(displayStatus))}>{displayStatus}</span>
                          </td>
                          <td className="px-4 py-4 text-right relative">
                            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === record.id ? null : record.id); }} className="menu-trigger p-2 text-slate-400 hover:text-teal-600 rounded-lg transition-colors"><MoreHorizontal size={18} /></button>
                            {activeMenuId === record.id && (
                              <div ref={menuRef} className="absolute right-10 top-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] py-1 animate-in fade-in zoom-in-95 duration-100">
                                <button onClick={() => { navigator.clipboard.writeText(record.contato_id || record.id_conta_azul || ''); alert('ID Copiado!'); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Copy size={14} /> Copiar ID Cliente</button>
                                <button onClick={() => { setSelectedDetailRecord(record); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><FileText size={14} /> Ver Detalhes</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
                  {paginatedNegotiations.map((neg: BillingNegotiation) => (
                    <tr key={neg.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{neg.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter flex items-center gap-1"><Tag size={10} /> {neg.productName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">{neg.responsibleAgent || '--'}</td>
                      <td className="px-6 py-4 text-xs font-bold text-red-600">{neg.dueDate ? new Date(neg.dueDate).toLocaleDateString() : '--'}</td>
                      <td className="px-6 py-4 text-right font-black text-indigo-700">{formatCurrency(neg.totalNegotiatedValue)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={clsx('text-[9px] font-black px-2 py-1 rounded border uppercase', neg.status === 'PAGO' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>{neg.status}</span>
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button onClick={() => setActiveMenuId(activeMenuId === neg.id ? null : neg.id)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors"><MoreHorizontal size={18} /></button>
                        {activeMenuId === neg.id && (
                          <div ref={menuRef} className="absolute right-10 top-0 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] py-1 animate-in fade-in zoom-in-95 duration-100">
                            <button onClick={() => { setNegotiationFormData(neg); setShowNegotiationModal(true); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit2 size={14} /> Editar</button>
                            <button onClick={() => handleDeleteNegotiation(neg.id)} className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Excluir</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {paginatedNegotiations.length === 0 && (
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
          <p className="text-xs text-slate-500">Mostrando {displayPageCount} de {displayTotalCount} registros</p>
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
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700"><Users size={20} /></div>
                <div><h3 className="text-xl font-bold text-slate-800">Ficha de Negociação de Cobrança</h3><p className="text-xs text-slate-500 uppercase font-black tracking-widest">Consultoria Interna</p></div>
              </div>
              <button onClick={() => setShowNegotiationModal(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg transition-colors"><X size={24} /></button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <label className="block text-[10px] font-black text-amber-700 uppercase mb-1">Parcelas em Aberto</label>
                  <input type="number" className="w-full bg-transparent border-none p-0 text-xl font-black text-amber-900 focus:ring-0" value={negotiationFormData.openInstallments} onChange={e => setNegotiationFormData({ ...negotiationFormData, openInstallments: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <label className="block text-[10px] font-black text-blue-700 uppercase mb-1">Valor Total Negociado</label>
                  <input type="number" className="w-full bg-transparent border-none p-0 text-xl font-black text-blue-900 focus:ring-0" value={negotiationFormData.totalNegotiatedValue} onChange={e => setNegotiationFormData({ ...negotiationFormData, totalNegotiatedValue: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                  <label className="block text-[10px] font-black text-green-700 uppercase mb-1">Número de Parcelas</label>
                  <input type="number" className="w-full bg-transparent border-none p-0 text-xl font-black text-green-900 focus:ring-0" value={negotiationFormData.totalInstallments} onChange={e => setNegotiationFormData({ ...negotiationFormData, totalInstallments: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <label className="block text-[10px] font-black text-red-700 uppercase mb-1">Vencimento da Acordo</label>
                  <input type="date" className="w-full bg-transparent border-none p-0 text-sm font-black text-red-900 focus:ring-0" value={negotiationFormData.dueDate} onChange={e => setNegotiationFormData({ ...negotiationFormData, dueDate: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo do Aluno *</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm font-bold" value={negotiationFormData.fullName} onChange={e => setNegotiationFormData({ ...negotiationFormData, fullName: e.target.value })} placeholder="Insira o nome aqui" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código Identificador</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={negotiationFormData.identifierCode} onChange={e => setNegotiationFormData({ ...negotiationFormData, identifierCode: e.target.value })} placeholder="Ex: 7976" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Produto / Curso</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={negotiationFormData.productName} onChange={e => setNegotiationFormData({ ...negotiationFormData, productName: e.target.value })} placeholder="Insira o produto aqui" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Original (R$)</label>
                  <input type="number" className="w-full px-3 py-2 border rounded-lg text-sm font-bold" value={negotiationFormData.originalValue} onChange={e => setNegotiationFormData({ ...negotiationFormData, originalValue: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Responsável Atendimento</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    value={negotiationFormData.responsibleAgent || ''}
                    onChange={e => setNegotiationFormData({ ...negotiationFormData, responsibleAgent: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {billingTeam.map(member => (
                      <option key={member.id} value={member.full_name}>{member.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Forma de Pagamento</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={negotiationFormData.paymentMethod} onChange={e => setNegotiationFormData({ ...negotiationFormData, paymentMethod: e.target.value })} placeholder="—" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status da Negociação</label>
                  <select className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white" value={negotiationFormData.status} onChange={e => setNegotiationFormData({ ...negotiationFormData, status: e.target.value })}>
                    <option value="EDIÇÃO PENDENTE">EDIÇÃO PENDENTE</option>
                    <option value="AGUARDANDO PAGAMENTO">AGUARDANDO PAGAMENTO</option>
                    <option value="PAGO">PAGO</option>
                    <option value="QUEBRA DE ACORDO">QUEBRA DE ACORDO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Equipe</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={negotiationFormData.team} onChange={e => setNegotiationFormData({ ...negotiationFormData, team: e.target.value })} placeholder="—" />
                </div>
                <div className="md:col-span-3 border-t pt-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Negociação Referente à</label>
                  <textarea className="w-full px-3 py-2 border rounded-lg text-sm h-20 resize-none" value={negotiationFormData.negotiationReference} onChange={e => setNegotiationFormData({ ...negotiationFormData, negotiationReference: e.target.value })} placeholder="Insira o valor aqui" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações Gerais</label>
                  <textarea className="w-full px-3 py-2 border rounded-lg text-sm h-32 resize-none" value={negotiationFormData.observations} onChange={e => setNegotiationFormData({ ...negotiationFormData, observations: e.target.value })} placeholder="Insira o valor aqui" />
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><LinkIcon size={14} /> Links e Documentação</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Comprovante de Pagamento (LINK)</label>
                    <div className="flex gap-2"><input type="text" className="flex-1 px-3 py-2 border rounded-lg text-xs font-mono" value={negotiationFormData.voucherLink1} onChange={e => setNegotiationFormData({ ...negotiationFormData, voucherLink1: e.target.value })} placeholder="Inserir uma URL" />{negotiationFormData.voucherLink1 && <a href={negotiationFormData.voucherLink1} target="_blank" className="p-2 bg-white border rounded-lg text-blue-600"><ExternalLink size={14} /></a>}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Comprovante de Pagamento (LINK 2)</label>
                    <div className="flex gap-2"><input type="text" className="flex-1 px-3 py-2 border rounded-lg text-xs font-mono" value={negotiationFormData.voucherLink2} onChange={e => setNegotiationFormData({ ...negotiationFormData, voucherLink2: e.target.value })} placeholder="Inserir uma URL" />{negotiationFormData.voucherLink2 && <a href={negotiationFormData.voucherLink2} target="_blank" className="p-2 bg-white border rounded-lg text-blue-600"><ExternalLink size={14} /></a>}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Comprovante de Pagamento (LINK 3)</label>
                    <div className="flex gap-2"><input type="text" className="flex-1 px-3 py-2 border rounded-lg text-xs font-mono" value={negotiationFormData.voucherLink3} onChange={e => setNegotiationFormData({ ...negotiationFormData, voucherLink3: e.target.value })} placeholder="Inserir uma URL" />{negotiationFormData.voucherLink3 && <a href={negotiationFormData.voucherLink3} target="_blank" className="p-2 bg-white border rounded-lg text-blue-600"><ExternalLink size={14} /></a>}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Boletos para Envio (LINK)</label>
                    <div className="flex gap-2"><input type="text" className="flex-1 px-3 py-2 border rounded-lg text-xs font-mono" value={negotiationFormData.boletosLink} onChange={e => setNegotiationFormData({ ...negotiationFormData, boletosLink: e.target.value })} placeholder="Inserir uma URL" />{negotiationFormData.boletosLink && <a href={negotiationFormData.boletosLink} target="_blank" className="p-2 bg-white border rounded-lg text-blue-600"><ExternalLink size={14} /></a>}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Data Teste</label>
                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={negotiationFormData.testDate} onChange={e => setNegotiationFormData({ ...negotiationFormData, testDate: e.target.value })} placeholder="Insira o valor aqui" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Anexos / Documentos (Cloud)</label>
                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={negotiationFormData.attachments} onChange={e => setNegotiationFormData({ ...negotiationFormData, attachments: e.target.value })} placeholder="Adicionar anexos" />
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
                  {isSavingNegotiation ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Salvar Negociação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES CONCILIACAO */}
      {selectedDetailRecord && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-teal-100 p-2 rounded-lg text-teal-600"><CreditCard size={20} /></div>
                <div>
                  <h3 className="font-bold text-slate-800">Detalhes do Recebimento</h3>
                  <p className="text-xs text-slate-500">ID Conta Azul: {selectedDetailRecord.id_conta_azul || `#${selectedDetailRecord.id}`}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDetailRecord(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              {/* Client info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center text-teal-600 shadow-sm"><User size={24} /></div>
                  <div>
                    <h4 className="font-black text-slate-800 text-lg leading-tight">{selectedDetailRecord.contato_nome || '--'}</h4>
                    <p className="text-xs text-slate-500 font-mono">ID Cliente: {selectedDetailRecord.contato_id || '--'}</p>
                  </div>
                </div>
                <div className={clsx('px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border w-fit', getStatusStyle(getDisplayStatus(selectedDetailRecord)))}>{getDisplayStatus(selectedDetailRecord)}</div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Dados do Título */}
                <div className="space-y-6">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b pb-2"><Tag size={12} /> Dados do Título</h5>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-bold uppercase">Referência</span><span className="text-sm font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{selectedDetailRecord.numero_documento || '--'}</span></div>
                    {selectedDetailRecord.descricao && (
                      <div className="flex justify-between items-start gap-4"><span className="text-xs text-slate-500 font-bold uppercase shrink-0">Descrição</span><span className="text-sm font-bold text-slate-800 text-right">{selectedDetailRecord.descricao}</span></div>
                    )}
                    <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-bold uppercase">Competência</span><span className="text-sm font-bold text-slate-800">{formatDate(selectedDetailRecord.data_competencia)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-bold uppercase">Data Vencimento</span><span className="text-sm font-bold text-red-600">{formatDate(selectedDetailRecord.data_vencimento)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-bold uppercase">Data Pagamento</span><span className="text-sm font-bold text-slate-800">{formatDate(selectedDetailRecord.data_pagamento)}</span></div>
                    {selectedDetailRecord.parcela_numero && selectedDetailRecord.total_parcelas && (
                      <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-bold uppercase">Parcela</span><span className="text-sm font-bold text-slate-800">{selectedDetailRecord.parcela_numero} de {selectedDetailRecord.total_parcelas}</span></div>
                    )}
                  </div>
                </div>

                {/* Right: Valores e Classificação */}
                <div className="space-y-6">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b pb-2"><DollarSign size={12} /> Valores e Classificação</h5>
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-1"><span className="text-[10px] text-slate-400 font-black uppercase">Valor Faturado</span><ArrowUpRight size={14} className="text-slate-300" /></div>
                      <p className="text-xl font-black text-slate-700">{formatCurrency(Number(selectedDetailRecord.valor || 0))}</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <div className="flex justify-between items-center mb-1"><span className="text-[10px] text-emerald-600 font-black uppercase">Valor Recebido (Líquido)</span><ArrowDownRight size={14} className="text-emerald-500" /></div>
                      <p className="text-xl font-black text-emerald-700">{formatCurrency(Number(selectedDetailRecord.valor_pago || 0))}</p>
                    </div>
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-bold uppercase">Categoria</span><span className="text-sm font-bold text-slate-800">{selectedDetailRecord.categoria_nome || '--'}</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-bold uppercase">Centro de Custo</span><span className="text-sm font-bold text-slate-800">{selectedDetailRecord.centro_custo_nome || '--'}</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-bold uppercase">Conta Financeira</span><span className="text-sm font-bold text-slate-800">{selectedDetailRecord.conta_financeira_nome || '--'}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {selectedDetailRecord.observacoes && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <h5 className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">Observações</h5>
                  <p className="text-sm text-amber-900">{selectedDetailRecord.observacoes}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setSelectedDetailRecord(null)} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-sm shadow-lg transition-all active:scale-95">Fechar Detalhes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

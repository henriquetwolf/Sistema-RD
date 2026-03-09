import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText, Search, RefreshCw, ChevronLeft, ChevronRight, Loader2,
  CheckCircle, AlertTriangle, Clock, XCircle, Download, Filter as FilterIcon,
  Settings, Send, ChevronDown, ChevronUp, FileSpreadsheet, ExternalLink,
  DollarSign, TrendingUp, AlertCircle, Save, X, Eye, Ban
} from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import type { NfReceivableRow, NfInvoice, NfConfig } from '../services/invoiceService';
import { contaAzulService } from '../services/contaAzulService';
import clsx from 'clsx';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatDate = (d?: string | null) => d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('pt-BR') : '--';
const formatCpf = (cpf?: string | null) => {
  if (!cpf) return '--';
  const d = cpf.replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return cpf;
};

type TabId = 'pending' | 'issued' | 'config';

export const InvoiceManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('pending');

  // Pending tab state
  const [receivables, setReceivables] = useState<NfReceivableRow[]>([]);
  const [isLoadingReceivables, setIsLoadingReceivables] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'eligible' | 'partial' | 'complete' | 'all'>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [emittingIds, setEmittingIds] = useState<Set<string>>(new Set());
  const [selectedProvider, setSelectedProvider] = useState<'enotas' | 'conta_azul'>('enotas');

  // Issued tab state
  const [invoices, setInvoices] = useState<NfInvoice[]>([]);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState('all');
  const [invoiceProviderFilter, setInvoiceProviderFilter] = useState('all');
  const [invoicePage, setInvoicePage] = useState(1);

  // Config tab state
  const [config, setConfig] = useState<NfConfig | null>(null);
  const [configForm, setConfigForm] = useState<Partial<NfConfig>>({});
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [caAccounts, setCaAccounts] = useState<any[]>([]);

  // Stats
  const [stats, setStats] = useState<any>(null);

  // Conta Azul accounts for filter
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const PAGE_SIZE = 30;

  // ── Load data ─────────────────────────────────────────────

  const loadAccounts = useCallback(async () => {
    try {
      const accs = await contaAzulService.getAccounts();
      setAccountsList(accs);
      setCaAccounts(accs);
      if (accs.length > 0 && !selectedAccountId) setSelectedAccountId(accs[0].id);
    } catch { /* ignore */ }
  }, [selectedAccountId]);

  const loadReceivables = useCallback(async () => {
    setIsLoadingReceivables(true);
    try {
      const { data } = await invoiceService.getEligibleReceivables({
        accountId: selectedAccountId || undefined,
        search: searchTerm || undefined,
        statusFilter,
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
      });
      setReceivables(data);
    } catch (e: any) {
      console.error('Erro ao carregar recebíveis:', e);
    } finally {
      setIsLoadingReceivables(false);
    }
  }, [selectedAccountId, searchTerm, statusFilter, currentPage]);

  const loadInvoices = useCallback(async () => {
    setIsLoadingInvoices(true);
    try {
      const { data, count } = await invoiceService.getIssuedInvoices({
        search: invoiceSearch || undefined,
        status: invoiceStatusFilter !== 'all' ? invoiceStatusFilter : undefined,
        type: invoiceTypeFilter !== 'all' ? invoiceTypeFilter : undefined,
        provider: invoiceProviderFilter !== 'all' ? invoiceProviderFilter : undefined,
        limit: PAGE_SIZE,
        offset: (invoicePage - 1) * PAGE_SIZE,
      });
      setInvoices(data);
      setInvoiceCount(count);
    } catch (e: any) {
      console.error('Erro ao carregar NFs:', e);
    } finally {
      setIsLoadingInvoices(false);
    }
  }, [invoiceSearch, invoiceStatusFilter, invoiceTypeFilter, invoiceProviderFilter, invoicePage]);

  const loadConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    try {
      const cfg = await invoiceService.getConfig();
      setConfig(cfg);
      if (cfg) setConfigForm(cfg);
    } catch { /* ignore */ }
    finally { setIsLoadingConfig(false); }
  }, []);

  const loadStats = useCallback(async () => {
    try { setStats(await invoiceService.getStats()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { if (activeTab === 'pending') loadReceivables(); }, [activeTab, loadReceivables]);
  useEffect(() => { if (activeTab === 'issued') loadInvoices(); }, [activeTab, loadInvoices]);
  useEffect(() => { if (activeTab === 'config') { loadConfig(); loadAccounts(); } }, [activeTab]);
  useEffect(() => { loadStats(); }, []);
  useEffect(() => {
    if (config?.default_provider) setSelectedProvider(config.default_provider);
  }, [config]);

  // ── Emit handlers ─────────────────────────────────────────

  const handleEmitSingle = async (row: NfReceivableRow) => {
    if (!row.is_eligible) {
      alert('Este recebível não está apto para emissão.\nMotivo: ' + row.eligibility_reason);
      return;
    }
    const nfType = row.split_mode === 'all_product' ? 'nfe' : 'nfse';
    setEmittingIds(prev => new Set(prev).add(row.receivable_id));
    try {
      await invoiceService.emitInvoice({
        receivable_id: row.receivable_id,
        provider: selectedProvider,
        type: nfType,
        deal_id: row.deal_id || undefined,
        descricao: row.receivable_descricao || undefined,
        valor: row.receivable_valor,
        tomador_nome: row.receivable_contato_nome || undefined,
        tomador_cpf_cnpj: row.receivable_contato_cpf || undefined,
      });
      alert('NF enviada para emissão com sucesso!');
      loadReceivables();
      loadStats();
    } catch (e: any) {
      alert('Erro ao emitir NF: ' + e.message);
    } finally {
      setEmittingIds(prev => { const s = new Set(prev); s.delete(row.receivable_id); return s; });
    }
  };

  const handleEmitDivided = async (row: NfReceivableRow) => {
    if (!row.is_eligible) {
      alert('Este recebível não está apto para emissão.\nMotivo: ' + row.eligibility_reason);
      return;
    }
    setEmittingIds(prev => new Set(prev).add(row.receivable_id));
    try {
      await invoiceService.emitDividedInvoice({
        receivable_id: row.receivable_id,
        provider: selectedProvider,
        deal_id: row.deal_id || undefined,
        descricao: row.receivable_descricao || undefined,
        valor_total: row.receivable_valor,
        service_pct: row.service_pct,
        product_pct: row.product_pct,
        tomador_nome: row.receivable_contato_nome || undefined,
        tomador_cpf_cnpj: row.receivable_contato_cpf || undefined,
      });
      alert('NFS-e + NF-e enviadas para emissão com sucesso!');
      loadReceivables();
      loadStats();
    } catch (e: any) {
      alert('Erro ao emitir NFs: ' + e.message);
    } finally {
      setEmittingIds(prev => { const s = new Set(prev); s.delete(row.receivable_id); return s; });
    }
  };

  const handleEmitBatch = async () => {
    const selected = receivables.filter(r => selectedRows.has(r.receivable_id) && r.is_eligible);
    if (selected.length === 0) { alert('Nenhum item elegível selecionado.'); return; }
    if (!confirm(`Emitir NF para ${selected.length} item(ns) via ${selectedProvider === 'enotas' ? 'eNotas' : 'Conta Azul'}?`)) return;

    for (const row of selected) {
      if (row.split_mode === 'divided') {
        await handleEmitDivided(row);
      } else {
        await handleEmitSingle(row);
      }
    }
    setSelectedRows(new Set());
  };

  const handleCancelInvoice = async (inv: NfInvoice) => {
    if (!confirm(`Cancelar NF ${inv.numero_nf || inv.id.substring(0, 8)}?`)) return;
    try {
      await invoiceService.cancelInvoice(inv.id);
      alert('NF cancelada.');
      loadInvoices();
      loadStats();
    } catch (e: any) { alert('Erro: ' + e.message); }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await invoiceService.saveConfig(configForm);
      alert('Configurações salvas!');
      loadConfig();
    } catch (e: any) { alert('Erro: ' + e.message); }
    finally { setIsSavingConfig(false); }
  };

  // ── Helpers ───────────────────────────────────────────────

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedRows(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === receivables.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(receivables.map(r => r.receivable_id)));
  };

  const statusBadge = (row: NfReceivableRow) => {
    if (row.nf_status === 'complete') return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-green-100 text-green-700">Emitida</span>;
    if (row.nf_status === 'partial') return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700">Parcial</span>;
    if (row.is_eligible) return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-700">Apto</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500">Não Apto</span>;
  };

  const splitBadge = (mode: string) => {
    if (mode === 'divided') return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-violet-100 text-violet-700">Dividido</span>;
    if (mode === 'all_product') return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700">Produto</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">Serviço</span>;
  };

  const invoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'issued': return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle size={10} /> Emitida</span>;
      case 'processing': return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 flex items-center gap-1"><Clock size={10} /> Processando</span>;
      case 'error': return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 flex items-center gap-1"><XCircle size={10} /> Erro</span>;
      case 'cancelled': return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 flex items-center gap-1"><Ban size={10} /> Cancelada</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500">{status}</span>;
    }
  };

  // ── Render ────────────────────────────────────────────────

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'pending', label: 'Pendentes', icon: <Clock size={14} /> },
    { id: 'issued', label: 'Emitidas', icon: <CheckCircle size={14} /> },
    { id: 'config', label: 'Configurações', icon: <Settings size={14} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <FileText className="text-orange-600" size={22} />
            </div>
            Emissão de Notas Fiscais
          </h2>
          <p className="text-sm text-slate-500 mt-1">NFS-e e NF-e via eNotas ou Conta Azul</p>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase">Emitidas</p>
              <p className="text-lg font-black text-green-600">{stats.total_issued}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase">Processando</p>
              <p className="text-lg font-black text-blue-600">{stats.total_pending}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase">Erros</p>
              <p className="text-lg font-black text-red-600">{stats.total_error}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase">Valor Emitido</p>
              <p className="text-sm font-black text-slate-700">{formatCurrency(stats.valor_emitido)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === t.id ? "bg-orange-100 text-orange-700 shadow-sm" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── PENDING TAB ────────────────────────────────────── */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Account selector */}
              {accountsList.length > 1 && (
                <select
                  value={selectedAccountId || ''}
                  onChange={e => { setSelectedAccountId(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                >
                  {accountsList.map(a => <option key={a.id} value={a.id}>{a.nome || a.cnpj}</option>)}
                </select>
              )}

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Buscar por nome, CPF ou descrição..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
              >
                <option value="pending">Pendentes</option>
                <option value="eligible">Aptos</option>
                <option value="partial">Parciais</option>
                <option value="complete">Completos</option>
                <option value="all">Todos</option>
              </select>

              <select
                value={selectedProvider}
                onChange={e => setSelectedProvider(e.target.value as any)}
                className="px-3 py-2 border border-orange-200 rounded-xl text-xs font-bold bg-orange-50 text-orange-700"
              >
                <option value="enotas">Emitir via eNotas</option>
                <option value="conta_azul">Emitir via Conta Azul</option>
              </select>

              <button onClick={loadReceivables} disabled={isLoadingReceivables} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                <RefreshCw size={14} className={clsx("text-slate-500", isLoadingReceivables && "animate-spin")} />
              </button>

              {selectedRows.size > 0 && (
                <button
                  onClick={handleEmitBatch}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all"
                >
                  <Send size={14} /> Emitir {selectedRows.size} selecionado(s)
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {isLoadingReceivables ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-orange-500" />
              </div>
            ) : receivables.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold">Nenhum recebível encontrado</p>
                <p className="text-xs mt-1">Ajuste os filtros ou sincronize o Conta Azul</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left">
                        <input type="checkbox" checked={selectedRows.size === receivables.length && receivables.length > 0} onChange={toggleSelectAll} className="rounded" />
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Contato</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">CPF</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Descrição</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Valor</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Presença</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivables.map(row => (
                      <React.Fragment key={row.receivable_id}>
                        <tr className={clsx("border-b border-slate-100 hover:bg-orange-50/30 transition-colors", selectedRows.has(row.receivable_id) && "bg-orange-50/50")}>
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selectedRows.has(row.receivable_id)} onChange={() => toggleSelect(row.receivable_id)} className="rounded" />
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-800 text-xs">{row.receivable_contato_nome || '--'}</span>
                            {row.deal_product_name && <span className="block text-[10px] text-slate-400 mt-0.5">{row.deal_product_name}</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 font-mono">{formatCpf(row.receivable_contato_cpf)}</td>
                          <td className="px-4 py-3 text-xs text-slate-600 max-w-[180px] truncate">{row.receivable_descricao || '--'}</td>
                          <td className="px-4 py-3 text-xs font-black text-slate-700 text-right">{formatCurrency(row.receivable_valor)}</td>
                          <td className="px-4 py-3 text-center">
                            {splitBadge(row.split_mode)}
                            {row.split_mode === 'divided' && (
                              <button onClick={() => toggleRow(row.receivable_id)} className="ml-1 text-slate-400 hover:text-slate-600">
                                {expandedRows.has(row.receivable_id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.deal_product_type === 'Presencial' && row.attendance_pct !== null ? (
                              <span className={clsx(
                                "text-xs font-black",
                                row.attendance_pct >= 70 ? "text-green-600" : "text-red-500"
                              )}>
                                {row.attendance_pct}%
                              </span>
                            ) : row.deal_product_type === 'Presencial' ? (
                              <span className="text-[10px] text-slate-400">--</span>
                            ) : (
                              <span className="text-[10px] text-slate-400">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">{statusBadge(row)}</td>
                          <td className="px-4 py-3 text-center">
                            {row.nf_status === 'complete' ? (
                              <span className="text-[10px] text-green-600 font-bold">Concluído</span>
                            ) : emittingIds.has(row.receivable_id) ? (
                              <Loader2 size={16} className="animate-spin text-orange-500 mx-auto" />
                            ) : row.is_eligible ? (
                              row.split_mode === 'divided' ? (
                                <button
                                  onClick={() => handleEmitDivided(row)}
                                  className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto transition-all"
                                  title="Emitir NFS-e + NF-e"
                                >
                                  <Send size={10} /> NFS-e + NF-e
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleEmitSingle(row)}
                                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto transition-all"
                                >
                                  <Send size={10} /> Emitir
                                </button>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-400" title={row.eligibility_reason}>
                                <AlertCircle size={14} className="mx-auto text-slate-300" />
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Expanded row for divided sales */}
                        {row.split_mode === 'divided' && expandedRows.has(row.receivable_id) && (
                          <tr className="bg-violet-50/50">
                            <td colSpan={9} className="px-8 py-3">
                              <div className="flex items-center gap-6 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-700">NFS-e</span>
                                  <span className="font-bold text-slate-700">Serviço ({row.service_pct}%)</span>
                                  <span className="font-black text-blue-700">{formatCurrency(row.receivable_valor * row.service_pct / 100)}</span>
                                  {row.nf_status === 'partial' && row.existing_nf_count === 1 && (
                                    <CheckCircle size={12} className="text-green-500" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-700">NF-e</span>
                                  <span className="font-bold text-slate-700">Produto ({row.product_pct}%)</span>
                                  <span className="font-black text-purple-700">{formatCurrency(row.receivable_valor * row.product_pct / 100)}</span>
                                </div>
                                <div className="ml-auto text-[10px] text-slate-400">
                                  Vencimento: {formatDate(row.receivable_data_vencimento)}
                                </div>
                              </div>
                              {!row.deal_id && (
                                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-600 font-bold">
                                  <AlertTriangle size={10} /> Sem vínculo com deal — CPF não encontrado
                                </div>
                              )}
                              {row.eligibility_reason && row.eligibility_reason !== 'Apto para emissão' && (
                                <div className="mt-1 text-[10px] text-slate-400 italic">{row.eligibility_reason}</div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {receivables.length > 0 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">{receivables.length} registros na página</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-bold text-slate-600">Página {currentPage}</span>
                  <button onClick={() => setCurrentPage(p => p + 1)} disabled={receivables.length < PAGE_SIZE} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ISSUED TAB ─────────────────────────────────────── */}
      {activeTab === 'issued' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input
                  type="text"
                  value={invoiceSearch}
                  onChange={e => { setInvoiceSearch(e.target.value); setInvoicePage(1); }}
                  placeholder="Buscar por nome, descrição ou número..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <select value={invoiceStatusFilter} onChange={e => { setInvoiceStatusFilter(e.target.value); setInvoicePage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white">
                <option value="all">Todos Status</option>
                <option value="issued">Emitida</option>
                <option value="processing">Processando</option>
                <option value="error">Erro</option>
                <option value="cancelled">Cancelada</option>
              </select>

              <select value={invoiceTypeFilter} onChange={e => { setInvoiceTypeFilter(e.target.value); setInvoicePage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white">
                <option value="all">Todos Tipos</option>
                <option value="nfse">NFS-e</option>
                <option value="nfe">NF-e</option>
              </select>

              <select value={invoiceProviderFilter} onChange={e => { setInvoiceProviderFilter(e.target.value); setInvoicePage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white">
                <option value="all">Todos Provedores</option>
                <option value="enotas">eNotas</option>
                <option value="conta_azul">Conta Azul</option>
              </select>

              <button onClick={loadInvoices} disabled={isLoadingInvoices} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                <RefreshCw size={14} className={clsx("text-slate-500", isLoadingInvoices && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {isLoadingInvoices ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-orange-500" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold">Nenhuma nota fiscal encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Número</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Tomador</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Descrição</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Provedor</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Valor</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Data</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800 text-xs">{inv.numero_nf || '--'}</span>
                          {inv.split_part && (
                            <span className={clsx(
                              "ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black",
                              inv.split_part === 'service' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                            )}>
                              {inv.split_part === 'service' ? 'SVC' : 'PROD'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">{inv.tomador_nome || '--'}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-[180px] truncate">{inv.descricao || '--'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={clsx(
                            "px-2 py-0.5 rounded-full text-[10px] font-black",
                            inv.type === 'nfse' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                          )}>
                            {inv.type === 'nfse' ? 'NFS-e' : 'NF-e'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={clsx(
                            "px-2 py-0.5 rounded-full text-[10px] font-black",
                            inv.provider === 'enotas' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                          )}>
                            {inv.provider === 'enotas' ? 'eNotas' : 'Conta Azul'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-black text-slate-700 text-right">{formatCurrency(inv.valor)}</td>
                        <td className="px-4 py-3 text-center">{invoiceStatusBadge(inv.status)}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 text-center">{formatDate(inv.issued_at || inv.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {inv.pdf_url && (
                              <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-slate-100 transition-colors" title="Download PDF">
                                <Download size={14} className="text-slate-500" />
                              </a>
                            )}
                            {inv.xml_url && (
                              <a href={inv.xml_url} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-slate-100 transition-colors" title="Download XML">
                                <FileSpreadsheet size={14} className="text-slate-500" />
                              </a>
                            )}
                            {inv.status === 'error' && inv.error_message && (
                              <button className="p-1 rounded hover:bg-red-50 transition-colors" title={inv.error_message}>
                                <AlertTriangle size={14} className="text-red-400" />
                              </button>
                            )}
                            {(inv.status === 'issued' || inv.status === 'processing') && (
                              <button onClick={() => handleCancelInvoice(inv)} className="p-1 rounded hover:bg-red-50 transition-colors" title="Cancelar NF">
                                <XCircle size={14} className="text-red-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {invoices.length > 0 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">{invoiceCount} nota(s) fiscal(is)</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setInvoicePage(p => Math.max(1, p - 1))} disabled={invoicePage === 1} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-bold text-slate-600">Página {invoicePage}</span>
                  <button onClick={() => setInvoicePage(p => p + 1)} disabled={invoices.length < PAGE_SIZE} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONFIG TAB ─────────────────────────────────────── */}
      {activeTab === 'config' && (
        <div className="max-w-3xl space-y-6">
          {isLoadingConfig ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-orange-500" />
            </div>
          ) : (
            <>
              {/* Default provider */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-700 flex items-center gap-2"><Settings size={16} className="text-orange-500" /> Provedor Padrão</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(['enotas', 'conta_azul'] as const).map(p => (
                    <label
                      key={p}
                      className={clsx(
                        "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        configForm.default_provider === p ? "bg-orange-50 border-orange-400" : "bg-white border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      <input type="radio" name="provider" checked={configForm.default_provider === p} onChange={() => setConfigForm(f => ({ ...f, default_provider: p }))} className="w-4 h-4 text-orange-600" />
                      <div>
                        <p className="text-sm font-black text-slate-700">{p === 'enotas' ? 'eNotas' : 'Conta Azul'}</p>
                        <p className="text-[10px] text-slate-400">{p === 'enotas' ? 'API eNotas Gateway' : 'Emissão via Conta Azul'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* eNotas config */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                  <span className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center text-[10px] font-black text-orange-600">eN</span>
                  Configuração eNotas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">API Key</label>
                    <input
                      type="password"
                      value={configForm.enotas_api_key || ''}
                      onChange={e => setConfigForm(f => ({ ...f, enotas_api_key: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="Sua API Key do eNotas"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">ID da Empresa</label>
                    <input
                      type="text"
                      value={configForm.enotas_empresa_id || ''}
                      onChange={e => setConfigForm(f => ({ ...f, enotas_empresa_id: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="UUID da empresa no eNotas"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Ambiente</label>
                    <select
                      value={configForm.enotas_ambiente || 'homologacao'}
                      onChange={e => setConfigForm(f => ({ ...f, enotas_ambiente: e.target.value as any }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      <option value="homologacao">Homologação (testes)</option>
                      <option value="producao">Produção</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Conta Azul config */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-[10px] font-black text-blue-600">CA</span>
                  Configuração Conta Azul
                </h3>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Conta Conta Azul para Emissão</label>
                  <select
                    value={configForm.conta_azul_account_id || ''}
                    onChange={e => setConfigForm(f => ({ ...f, conta_azul_account_id: e.target.value || null }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Selecione uma conta...</option>
                    {caAccounts.map(a => <option key={a.id} value={a.id}>{a.nome} — {a.cnpj}</option>)}
                  </select>
                </div>
              </div>

              {/* Business rules */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-700 flex items-center gap-2"><FilterIcon size={16} className="text-orange-500" /> Regras de Negócio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">% Presença Mínima (Presencial)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0} max={100} step={5}
                        value={configForm.min_attendance_pct ?? 70}
                        onChange={e => setConfigForm(f => ({ ...f, min_attendance_pct: Number(e.target.value) }))}
                        className="flex-1 accent-orange-500"
                      />
                      <span className="text-sm font-black text-orange-600 w-12 text-right">{configForm.min_attendance_pct ?? 70}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={configForm.auto_emit ?? false}
                        onChange={e => setConfigForm(f => ({ ...f, auto_emit: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Emissão Automática</p>
                      <p className="text-[10px] text-slate-400">Emitir NF automaticamente quando elegível</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSavingConfig ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvar Configurações
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};


import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Landmark, Search, RefreshCw, ChevronLeft, ChevronRight,
  DollarSign, CheckCircle, Clock, Loader2, Filter as FilterIcon,
  AlertTriangle, Zap, CheckCircle2 as CheckIcon, BarChart3,
  PieChart as PieIcon, TrendingUp, Monitor, BarChart, Wallet, ArrowDownToLine,
  ArrowUpRight, ArrowDownRight, Plus, Save, X, Link2, Unlink,
  CreditCard, Layers, Building2, Tag, FileText, List
} from 'lucide-react';
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { contaAzulService } from '../services/contaAzulService';
import type {
  ContaAzulAuthStatus, ContaAzulReceivable, ContaAzulPayable,
  ContaAzulCategory, ContaAzulCostCenter, ContaAzulFinancialAccount,
  ContaAzulSyncLog, ContaAzulCreateReceivablePayload, ContaAzulCreatePayablePayload
} from '../types';
import clsx from 'clsx';

const COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatDate = (d?: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '--';

type TabId = 'overview' | 'receivables' | 'payables' | 'accounts' | 'categories' | 'create' | 'powerbi';

export const ContaAzulManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [authStatus, setAuthStatus] = useState<ContaAzulAuthStatus | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Overview stats
  const [stats, setStats] = useState<any>(null);

  // Receivables
  const [receivables, setReceivables] = useState<ContaAzulReceivable[]>([]);
  const [recCount, setRecCount] = useState(0);
  const [recPage, setRecPage] = useState(1);

  // Payables
  const [payables, setPayables] = useState<ContaAzulPayable[]>([]);
  const [payCount, setPayCount] = useState(0);
  const [payPage, setPayPage] = useState(1);

  // Shared filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Auxiliaries
  const [categories, setCategories] = useState<ContaAzulCategory[]>([]);
  const [costCenters, setCostCenters] = useState<ContaAzulCostCenter[]>([]);
  const [accounts, setAccounts] = useState<ContaAzulFinancialAccount[]>([]);
  const [syncLogs, setSyncLogs] = useState<ContaAzulSyncLog[]>([]);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStep, setSyncStep] = useState('');

  // Loading states
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Create form
  const [createType, setCreateType] = useState<'receivable' | 'payable'>('receivable');
  const [createForm, setCreateForm] = useState<Partial<ContaAzulCreateReceivablePayload>>({
    descricao: '', valor: 0, parcelas: 1, data_vencimento: '', data_competencia: '', observacoes: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  const PAGE_SIZE = 30;

  // ── Auth check ──────────────────────────────────────────

  const checkAuth = useCallback(async () => {
    setIsCheckingAuth(true);
    try {
      const status = await contaAzulService.getAuthStatus();
      setAuthStatus(status);
      return status;
    } catch {
      const fallback = { connected: false, lastSync: null } as ContaAzulAuthStatus;
      setAuthStatus(fallback);
      return fallback;
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  const handleConnect = useCallback(() => {
    contaAzulService.startOAuthFlow();
    const pollInterval = setInterval(async () => {
      try {
        const status = await contaAzulService.getAuthStatus();
        if (status.connected) {
          setAuthStatus(status);
          clearInterval(pollInterval);
        }
      } catch { /* ignore polling errors */ }
    }, 3000);
    setTimeout(() => clearInterval(pollInterval), 300000);
  }, []);

  useEffect(() => {
    checkAuth();
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'CONTA_AZUL_AUTH_SUCCESS') {
        checkAuth();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [checkAuth]);

  // ── Data loading ────────────────────────────────────────

  const loadOverview = useCallback(async () => {
    if (!authStatus?.connected) return;
    try {
      const [s, logs] = await Promise.all([
        contaAzulService.getFinancialStats(),
        contaAzulService.getSyncLogs(10),
      ]);
      setStats(s);
      setSyncLogs(logs);
    } catch (e) {
      console.error('Error loading overview:', e);
    }
  }, [authStatus?.connected]);

  const loadReceivables = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const { data, count } = await contaAzulService.getReceivables({
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: PAGE_SIZE,
        offset: (recPage - 1) * PAGE_SIZE,
      });
      setReceivables(data);
      setRecCount(count);
    } catch (e) {
      console.error('Error loading receivables:', e);
    } finally {
      setIsLoadingData(false);
    }
  }, [searchTerm, statusFilter, startDate, endDate, recPage]);

  const loadPayables = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const { data, count } = await contaAzulService.getPayables({
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: PAGE_SIZE,
        offset: (payPage - 1) * PAGE_SIZE,
      });
      setPayables(data);
      setPayCount(count);
    } catch (e) {
      console.error('Error loading payables:', e);
    } finally {
      setIsLoadingData(false);
    }
  }, [searchTerm, statusFilter, startDate, endDate, payPage]);

  const loadAuxiliaries = useCallback(async () => {
    try {
      const [cats, ccs, accs] = await Promise.all([
        contaAzulService.getCategories(),
        contaAzulService.getCostCenters(),
        contaAzulService.getFinancialAccounts(),
      ]);
      setCategories(cats);
      setCostCenters(ccs);
      setAccounts(accs);
    } catch (e) {
      console.error('Error loading auxiliaries:', e);
    }
  }, []);

  useEffect(() => {
    if (!authStatus?.connected) return;
    loadOverview();
    loadAuxiliaries();
  }, [authStatus?.connected, loadOverview, loadAuxiliaries]);

  useEffect(() => {
    if (activeTab === 'receivables' && authStatus?.connected) loadReceivables();
  }, [activeTab, loadReceivables, authStatus?.connected]);

  useEffect(() => {
    if (activeTab === 'payables' && authStatus?.connected) loadPayables();
  }, [activeTab, loadPayables, authStatus?.connected]);

  // ── Sync ────────────────────────────────────────────────

  const syncSteps: { type: 'categories' | 'cost-centers' | 'accounts' | 'receivables' | 'payables'; label: string }[] = [
    { type: 'categories', label: 'Categorias' },
    { type: 'cost-centers', label: 'Centros de Custo' },
    { type: 'accounts', label: 'Contas Financeiras' },
    { type: 'receivables', label: 'Contas a Receber' },
    { type: 'payables', label: 'Contas a Pagar' },
  ];

  const handleSync = async (type: 'all' | 'receivables' | 'payables' | 'categories' | 'cost-centers' | 'accounts') => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStep('');

    if (type === 'all') {
      let totalSynced = 0;
      let errors: string[] = [];
      for (let i = 0; i < syncSteps.length; i++) {
        const step = syncSteps[i];
        setSyncProgress(Math.round((i / syncSteps.length) * 100));
        setSyncStep(step.label);

        if (step.type === 'receivables' || step.type === 'payables') {
          setSyncMessage(`Sincronizando ${step.label} (em partes trimestrais)... (${i + 1}/${syncSteps.length})`);
          try {
            const result = await contaAzulService.triggerSyncChunked(step.type, (chunk, total) => {
              const baseProgress = Math.round((i / syncSteps.length) * 100);
              const chunkProgress = Math.round((chunk / total) * (100 / syncSteps.length));
              setSyncProgress(baseProgress + chunkProgress);
              setSyncMessage(`Sincronizando ${step.label}... parte ${chunk}/${total} (${i + 1}/${syncSteps.length})`);
            });
            totalSynced += result.sincronizados ?? 0;
          } catch (e: any) {
            errors.push(`${step.label}: ${e.message}`);
          }
        } else {
          setSyncMessage(`Sincronizando ${step.label}... (${i + 1}/${syncSteps.length})`);
          try {
            const result = await contaAzulService.triggerSync(step.type);
            totalSynced += result.sincronizados ?? 0;
          } catch (e: any) {
            errors.push(`${step.label}: ${e.message}`);
          }
        }
      }
      setSyncProgress(100);
      setSyncStep('');
      if (errors.length > 0) {
        setSyncMessage(`Concluído com ${errors.length} erro(s). ${totalSynced} registros sincronizados.`);
        console.warn('Sync errors:', errors);
      } else {
        setSyncMessage(`Sincronização completa: ${totalSynced} registros sincronizados!`);
      }
      await loadOverview();
      loadAuxiliaries();
      if (activeTab === 'receivables') loadReceivables();
      if (activeTab === 'payables') loadPayables();
    } else {
      const stepLabel = syncSteps.find(s => s.type === type)?.label || type;

      if (type === 'receivables' || type === 'payables') {
        setSyncMessage(`Sincronizando ${stepLabel} (em partes trimestrais)...`);
        setSyncProgress(10);
        setSyncStep(stepLabel);
        try {
          const result = await contaAzulService.triggerSyncChunked(type, (chunk, total) => {
            setSyncProgress(Math.round((chunk / total) * 100));
            setSyncMessage(`Sincronizando ${stepLabel}... parte ${chunk}/${total}`);
          });
          setSyncProgress(100);
          setSyncMessage(`${stepLabel}: ${result.sincronizados ?? 'OK'} registros sincronizados`);
          await loadOverview();
          if (type === 'receivables') loadReceivables();
          else loadPayables();
        } catch (e: any) {
          setSyncMessage(`Erro em ${stepLabel}: ${e.message}`);
        }
      } else {
        setSyncMessage(`Sincronizando ${stepLabel}...`);
        setSyncProgress(50);
        setSyncStep(stepLabel);
        try {
          const result = await contaAzulService.triggerSync(type);
          setSyncProgress(100);
          setSyncMessage(`${stepLabel}: ${result.sincronizados ?? 'OK'} registros sincronizados`);
          await loadOverview();
          if (type === 'receivables') loadReceivables();
          else if (type === 'payables') loadPayables();
          else loadAuxiliaries();
        } catch (e: any) {
          setSyncMessage(`Erro em ${stepLabel}: ${e.message}`);
        }
      }
    }

    setIsSyncing(false);
    setTimeout(() => { setSyncMessage(''); setSyncProgress(0); setSyncStep(''); }, 6000);
  };

  // ── Create ──────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createForm.descricao || !createForm.valor) {
      alert('Descrição e Valor são obrigatórios.');
      return;
    }
    setIsCreating(true);
    try {
      if (createType === 'receivable') {
        await contaAzulService.createReceivable(createForm as ContaAzulCreateReceivablePayload);
      } else {
        await contaAzulService.createPayable(createForm as ContaAzulCreatePayablePayload);
      }
      alert(`${createType === 'receivable' ? 'Conta a Receber' : 'Conta a Pagar'} criada com sucesso no Conta Azul!`);
      setCreateForm({ descricao: '', valor: 0, parcelas: 1, data_vencimento: '', data_competencia: '', observacoes: '' });
      handleSync(createType === 'receivable' ? 'receivables' : 'payables');
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // ── Chart data ──────────────────────────────────────────

  const overviewCharts = useMemo(() => {
    if (!stats) return { pie: [], bar: [] };
    return {
      pie: [
        { name: 'Recebido', value: stats.totalReceberPago },
        { name: 'A Receber', value: stats.totalReceberPendente },
        { name: 'Pago (Despesa)', value: stats.totalPagarPago },
        { name: 'A Pagar', value: stats.totalPagarPendente },
      ].filter(i => i.value > 0),
      bar: [
        { name: 'Receitas', total: stats.totalReceber, pago: stats.totalReceberPago },
        { name: 'Despesas', total: stats.totalPagar, pago: stats.totalPagarPago },
      ],
    };
  }, [stats]);

  // ── Tabs config ─────────────────────────────────────────

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Visão Geral', icon: <BarChart size={15} /> },
    { id: 'receivables', label: 'A Receber', icon: <ArrowDownRight size={15} /> },
    { id: 'payables', label: 'A Pagar', icon: <ArrowUpRight size={15} /> },
    { id: 'accounts', label: 'Saldos', icon: <Wallet size={15} /> },
    { id: 'categories', label: 'Categorias', icon: <Tag size={15} /> },
    { id: 'create', label: 'Criar Lançamento', icon: <Plus size={15} /> },
    { id: 'powerbi', label: 'Power BI', icon: <Monitor size={15} /> },
  ];

  const recTotalPages = Math.ceil(recCount / PAGE_SIZE);
  const payTotalPages = Math.ceil(payCount / PAGE_SIZE);

  const lastSuccessfulSync = useMemo(() => {
    const successLog = syncLogs.find(l => l.status === 'success');
    return successLog?.finished_at || null;
  }, [syncLogs]);

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 pb-20">
      {/* Header + Connection Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit">
            <div className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white shadow-md flex items-center gap-2">
              <Landmark size={18} /> Conta Azul Intelligence
            </div>
          </div>

          {/* Connection badge */}
          {isCheckingAuth ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border text-slate-400 text-[10px] font-black uppercase">
              <Loader2 size={12} className="animate-spin" /> Verificando...
            </div>
          ) : authStatus?.connected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-xl border border-green-100 text-green-700 text-[10px] font-black uppercase">
              <Link2 size={12} /> Conectado
              {lastSuccessfulSync && (
                <span className="text-green-500 font-bold normal-case ml-1">
                  Ultima sync: {new Date(lastSuccessfulSync).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 text-amber-700 text-[10px] font-black uppercase transition-all"
            >
              <Unlink size={12} /> Conectar ao Conta Azul
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {authStatus?.connected && (
            <>
              <button
                onClick={() => handleSync('all')}
                disabled={isSyncing}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center gap-2"
              >
                {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Sincronizar Tudo
              </button>
              <button
                onClick={() => contaAzulService.disconnect().then(checkAuth)}
                className="p-2.5 text-slate-400 hover:text-red-500 bg-white border border-slate-200 rounded-xl transition-all shadow-sm"
                title="Desconectar"
              >
                <Unlink size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sync Progress Bar */}
      {(isSyncing || syncMessage) && (
        <div className="mb-4 shrink-0 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isSyncing && <Loader2 size={14} className="animate-spin text-blue-600" />}
                <span className={clsx(
                  "text-[11px] font-black uppercase tracking-wider",
                  syncMessage.includes('Erro') || syncMessage.includes('erro') ? "text-red-600" : syncProgress === 100 ? "text-green-600" : "text-blue-600"
                )}>
                  {syncMessage}
                </span>
              </div>
              {isSyncing && syncProgress > 0 && (
                <span className="text-[11px] font-black text-slate-500">{syncProgress}%</span>
              )}
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  syncMessage.includes('Erro') || syncMessage.includes('erro')
                    ? "bg-gradient-to-r from-red-400 to-red-500"
                    : syncProgress === 100
                    ? "bg-gradient-to-r from-green-400 to-emerald-500"
                    : "bg-gradient-to-r from-blue-400 to-indigo-500"
                )}
                style={{ width: `${syncProgress}%` }}
              />
            </div>
            {isSyncing && syncStep && (
              <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">
                Etapa atual: {syncStep}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner mb-6 shrink-0 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 whitespace-nowrap",
              activeTab === tab.id
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Not connected state */}
      {!authStatus?.connected && !isCheckingAuth && activeTab !== 'powerbi' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
          <Landmark size={80} className="text-slate-200 mb-6" />
          <h3 className="text-xl font-black text-slate-400 mb-2">Conta Azul não conectada</h3>
          <p className="text-sm text-slate-400 mb-6 max-w-md">
            Conecte sua conta do Conta Azul para visualizar dados financeiros em tempo real, criar lançamentos e manter tudo sincronizado.
          </p>
          <button
            onClick={handleConnect}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center gap-3"
          >
            <Zap size={18} /> Conectar ao Conta Azul
          </button>
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1">
        {/* ═══ OVERVIEW ═══ */}
        {activeTab === 'overview' && authStatus?.connected && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
            {/* Last Sync Info */}
            {lastSuccessfulSync && (
              <div className="flex items-center gap-3 px-5 py-3 bg-blue-50 rounded-2xl border border-blue-100">
                <Clock size={16} className="text-blue-500" />
                <span className="text-xs font-bold text-blue-700">
                  Dados sincronizados em: {new Date(lastSuccessfulSync).toLocaleString('pt-BR')}
                </span>
                <button
                  onClick={() => handleSync('all')}
                  disabled={isSyncing}
                  className="ml-auto text-[10px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center gap-1"
                >
                  {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Atualizar
                </button>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard
                label="Saldo em Contas"
                value={formatCurrency(stats?.saldoContas || 0)}
                sub="Todas as contas financeiras"
                icon={<Wallet size={56} />}
                color="blue"
              />
              <KpiCard
                label="Total a Receber"
                value={formatCurrency(stats?.totalReceberPendente || 0)}
                sub={`${stats?.countReceber || 0} lançamentos`}
                icon={<ArrowDownRight size={56} />}
                color="green"
              />
              <KpiCard
                label="Total a Pagar"
                value={formatCurrency(stats?.totalPagarPendente || 0)}
                sub={`${stats?.countPagar || 0} lançamentos`}
                icon={<ArrowUpRight size={56} />}
                color="red"
              />
              <KpiCard
                label="Resultado Líquido"
                value={formatCurrency((stats?.totalReceberPago || 0) - (stats?.totalPagarPago || 0))}
                sub="Receitas - Despesas (realizadas)"
                icon={<TrendingUp size={56} />}
                color="dark"
              />
            </div>

            {/* Charts */}
            {stats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-[380px] flex flex-col">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <PieIcon size={14} className="text-blue-500" /> Composição Financeira
                  </h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={overviewCharts.pie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                          {overviewCharts.pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-[380px] flex flex-col">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <BarChart3 size={14} className="text-indigo-500" /> Receitas vs Despesas
                  </h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={overviewCharts.bar} barGap={8}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                        <Bar dataKey="total" name="Total" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
                        <Bar dataKey="pago" name="Realizado" fill="#0d9488" radius={[8, 8, 0, 0]} barSize={40} />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Sync Logs */}
            {syncLogs.length > 0 && (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <List size={14} /> Histórico de Sincronizações
                </h3>
                <div className="space-y-2">
                  {syncLogs.map(log => (
                    <div key={log.id} className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className={clsx(
                          "w-2 h-2 rounded-full",
                          log.status === 'success' ? "bg-green-500" : log.status === 'error' ? "bg-red-500" : "bg-amber-500 animate-pulse"
                        )} />
                        <span className="text-xs font-bold text-slate-700 uppercase">{log.tipo_sync}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-slate-400">
                        <span>{log.registros_sincronizados} registros</span>
                        <span>{log.finished_at ? new Date(log.finished_at).toLocaleString('pt-BR') : 'Em andamento...'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ RECEIVABLES ═══ */}
        {activeTab === 'receivables' && authStatus?.connected && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
            <FilterBar
              searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              startDate={startDate} setStartDate={setStartDate}
              endDate={endDate} setEndDate={setEndDate}
              onSync={() => handleSync('receivables')}
              isSyncing={isSyncing}
              syncLabel="Sync Receber"
            />

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[500px]">
              <div className="px-8 py-5 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-green-600 text-white rounded-2xl shadow-lg shadow-green-100"><ArrowDownRight size={22} /></div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Contas a Receber</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{recCount} registros sincronizados</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {isLoadingData ? (
                  <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
                ) : receivables.length === 0 ? (
                  <div className="py-32 text-center text-slate-300">
                    <ArrowDownToLine size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="font-bold">Nenhum registro encontrado. Sincronize os dados primeiro.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm border-collapse min-w-[900px]">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr className="border-b border-slate-200">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Contato</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Vencimento</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Valor</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Recebido</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Categoria</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receivables.map(r => (
                        <tr key={r.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-6 py-3">
                            <span className="font-bold text-slate-800 text-xs">{r.contato_nome || '--'}</span>
                          </td>
                          <td className="px-6 py-3 text-xs text-slate-600 max-w-[200px] truncate">{r.descricao || '--'}</td>
                          <td className="px-6 py-3 text-xs font-bold text-slate-700">{formatDate(r.data_vencimento)}</td>
                          <td className="px-6 py-3 text-xs font-bold text-slate-700 text-right">{formatCurrency(r.valor)}</td>
                          <td className="px-6 py-3 text-xs font-black text-emerald-600 text-right">{formatCurrency(r.valor_pago)}</td>
                          <td className="px-6 py-3 text-[10px] text-slate-500">{r.categoria_nome || '--'}</td>
                          <td className="px-6 py-3 text-center">
                            <StatusBadge status={r.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {recTotalPages > 1 && (
                <Pagination page={recPage} totalPages={recTotalPages} onPageChange={setRecPage} total={recCount} />
              )}
            </div>
          </div>
        )}

        {/* ═══ PAYABLES ═══ */}
        {activeTab === 'payables' && authStatus?.connected && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
            <FilterBar
              searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              startDate={startDate} setStartDate={setStartDate}
              endDate={endDate} setEndDate={setEndDate}
              onSync={() => handleSync('payables')}
              isSyncing={isSyncing}
              syncLabel="Sync Pagar"
            />

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[500px]">
              <div className="px-8 py-5 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-100"><ArrowUpRight size={22} /></div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Contas a Pagar</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{payCount} registros sincronizados</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {isLoadingData ? (
                  <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
                ) : payables.length === 0 ? (
                  <div className="py-32 text-center text-slate-300">
                    <ArrowDownToLine size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="font-bold">Nenhum registro encontrado. Sincronize os dados primeiro.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm border-collapse min-w-[900px]">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr className="border-b border-slate-200">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fornecedor</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Vencimento</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Valor</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Pago</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Categoria</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payables.map(p => (
                        <tr key={p.id} className="hover:bg-red-50/40 transition-colors">
                          <td className="px-6 py-3">
                            <span className="font-bold text-slate-800 text-xs">{p.fornecedor_nome || '--'}</span>
                          </td>
                          <td className="px-6 py-3 text-xs text-slate-600 max-w-[200px] truncate">{p.descricao || '--'}</td>
                          <td className="px-6 py-3 text-xs font-bold text-slate-700">{formatDate(p.data_vencimento)}</td>
                          <td className="px-6 py-3 text-xs font-bold text-slate-700 text-right">{formatCurrency(p.valor)}</td>
                          <td className="px-6 py-3 text-xs font-black text-emerald-600 text-right">{formatCurrency(p.valor_pago)}</td>
                          <td className="px-6 py-3 text-[10px] text-slate-500">{p.categoria_nome || '--'}</td>
                          <td className="px-6 py-3 text-center">
                            <StatusBadge status={p.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {payTotalPages > 1 && (
                <Pagination page={payPage} totalPages={payTotalPages} onPageChange={setPayPage} total={payCount} />
              )}
            </div>
          </div>
        )}

        {/* ═══ ACCOUNTS / SALDOS ═══ */}
        {activeTab === 'accounts' && authStatus?.connected && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-700 flex items-center gap-2"><Wallet size={20} className="text-blue-600" /> Contas Financeiras</h3>
              <button onClick={() => handleSync('accounts')} disabled={isSyncing} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all">
                {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar Saldos
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className="py-20 text-center text-slate-300">
                <Building2 size={48} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold">Nenhuma conta financeira sincronizada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map(acc => (
                  <div key={acc.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:rotate-12 transition-transform">
                      <Building2 size={64} />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{acc.nome}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase">{acc.tipo || 'Conta'}</p>
                      </div>
                    </div>
                    <p className={clsx("text-2xl font-black", acc.saldo_atual >= 0 ? "text-green-600" : "text-red-600")}>
                      {formatCurrency(acc.saldo_atual)}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-2 font-bold">
                      Atualizado: {acc.synced_at ? new Date(acc.synced_at).toLocaleString('pt-BR') : '--'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            {accounts.length > 0 && (
              <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Saldo Consolidado</p>
                  <p className="text-3xl font-black mt-1">
                    {formatCurrency(accounts.reduce((s, a) => s + a.saldo_atual, 0))}
                  </p>
                </div>
                <Wallet size={48} className="text-white/10" />
              </div>
            )}
          </div>
        )}

        {/* ═══ CATEGORIES & COST CENTERS ═══ */}
        {activeTab === 'categories' && authStatus?.connected && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-700 flex items-center gap-2"><Tag size={20} className="text-indigo-600" /> Categorias e Centros de Custo</h3>
              <div className="flex gap-2">
                <button onClick={() => handleSync('categories')} disabled={isSyncing} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all">
                  <RefreshCw size={14} /> Categorias
                </button>
                <button onClick={() => handleSync('cost-centers')} disabled={isSyncing} className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all">
                  <RefreshCw size={14} /> Centros
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Categories */}
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b flex items-center gap-2">
                  <Tag size={16} className="text-indigo-600" />
                  <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">Categorias ({categories.length})</h4>
                </div>
                <div className="max-h-[400px] overflow-auto">
                  {categories.length === 0 ? (
                    <p className="p-8 text-center text-slate-300 text-sm">Nenhuma categoria sincronizada.</p>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {categories.map(cat => (
                        <div key={cat.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <span className="text-sm font-bold text-slate-700">{cat.nome}</span>
                          <span className={clsx(
                            "text-[9px] font-black px-2 py-0.5 rounded uppercase border",
                            cat.tipo === 'RECEITA' ? "bg-green-50 text-green-700 border-green-100" :
                            cat.tipo === 'DESPESA' ? "bg-red-50 text-red-700 border-red-100" :
                            "bg-slate-50 text-slate-500 border-slate-100"
                          )}>{cat.tipo}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cost Centers */}
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b flex items-center gap-2">
                  <Layers size={16} className="text-violet-600" />
                  <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">Centros de Custo ({costCenters.length})</h4>
                </div>
                <div className="max-h-[400px] overflow-auto">
                  {costCenters.length === 0 ? (
                    <p className="p-8 text-center text-slate-300 text-sm">Nenhum centro de custo sincronizado.</p>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {costCenters.map(cc => (
                        <div key={cc.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div>
                            <span className="text-sm font-bold text-slate-700">{cc.nome}</span>
                            {cc.codigo && <span className="ml-2 text-[10px] text-slate-400 font-mono">#{cc.codigo}</span>}
                          </div>
                          <span className={clsx(
                            "w-2 h-2 rounded-full",
                            cc.ativo ? "bg-green-500" : "bg-slate-300"
                          )} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ CREATE ═══ */}
        {activeTab === 'create' && authStatus?.connected && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-left-4 duration-500">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="px-8 py-6 bg-slate-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg"><Plus size={22} /></div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">Criar Lançamento Financeiro</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Envia diretamente para o Conta Azul</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {/* Type toggle */}
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                  <button onClick={() => setCreateType('receivable')} className={clsx("px-5 py-2 rounded-lg text-xs font-black uppercase transition-all", createType === 'receivable' ? "bg-green-600 text-white shadow-sm" : "text-slate-500")}>
                    Conta a Receber
                  </button>
                  <button onClick={() => setCreateType('payable')} className={clsx("px-5 py-2 rounded-lg text-xs font-black uppercase transition-all", createType === 'payable' ? "bg-red-600 text-white shadow-sm" : "text-slate-500")}>
                    Conta a Pagar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição *</label>
                    <input type="text" value={createForm.descricao} onChange={e => setCreateForm(f => ({ ...f, descricao: e.target.value }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Mensalidade Aluno João" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$) *</label>
                    <input type="number" step="0.01" value={createForm.valor || ''} onChange={e => setCreateForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0,00" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parcelas</label>
                    <input type="number" min={1} value={createForm.parcelas || 1} onChange={e => setCreateForm(f => ({ ...f, parcelas: parseInt(e.target.value) || 1 }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Competência</label>
                    <input type="date" value={createForm.data_competencia || ''} onChange={e => setCreateForm(f => ({ ...f, data_competencia: e.target.value }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Vencimento</label>
                    <input type="date" value={createForm.data_vencimento || ''} onChange={e => setCreateForm(f => ({ ...f, data_vencimento: e.target.value }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>

                  {categories.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
                      <select value={createForm.categoria_id || ''} onChange={e => setCreateForm(f => ({ ...f, categoria_id: e.target.value }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Selecione...</option>
                        {categories.filter(c => createType === 'receivable' ? c.tipo !== 'DESPESA' : c.tipo !== 'RECEITA').map(c => (
                          <option key={c.id} value={c.id_conta_azul}>{c.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {costCenters.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Centro de Custo</label>
                      <select value={createForm.centro_custo_id || ''} onChange={e => setCreateForm(f => ({ ...f, centro_custo_id: e.target.value }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Selecione...</option>
                        {costCenters.map(cc => (
                          <option key={cc.id} value={cc.id_conta_azul}>{cc.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações</label>
                    <textarea value={createForm.observacoes || ''} onChange={e => setCreateForm(f => ({ ...f, observacoes: e.target.value }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Observações opcionais..." />
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 bg-slate-50 border-t flex justify-end">
                <button onClick={handleCreate} disabled={isCreating} className={clsx(
                  "px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all active:scale-95",
                  createType === 'receivable'
                    ? "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20"
                    : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                )}>
                  {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Criar {createType === 'receivable' ? 'Conta a Receber' : 'Conta a Pagar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ POWER BI ═══ */}
        {activeTab === 'powerbi' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[700px] animate-in slide-in-from-right-4 duration-500">
            <div className="bg-slate-50 border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <Monitor size={18} className="text-blue-600" /> Relatório Executivo Power BI
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Dados em tempo real</span>
            </div>
            <div className="flex-1 w-full h-full relative">
              <iframe
                title="SISTEMA VOLL PILATES GROUP 2024"
                width="100%" height="100%"
                src="https://app.powerbi.com/reportEmbed?reportId=19b9cbce-9e43-4044-9c85-fc8a5bc7edd3&autoAuth=true&ctid=d808f9e8-9013-4c78-a57f-a75ed87383d0"
                frameBorder="0" allowFullScreen={true}
                className="absolute inset-0"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────

function KpiCard({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: React.ReactNode; color: 'blue' | 'green' | 'red' | 'dark' }) {
  const colorMap = {
    blue: { bg: 'bg-white', text: 'text-blue-700', iconColor: 'text-blue-600', border: 'border-slate-200' },
    green: { bg: 'bg-white', text: 'text-green-600', iconColor: 'text-green-600', border: 'border-slate-200' },
    red: { bg: 'bg-white', text: 'text-red-600', iconColor: 'text-red-600', border: 'border-slate-200' },
    dark: { bg: 'bg-slate-900', text: 'text-white', iconColor: 'text-white/10', border: 'border-slate-800' },
  };
  const c = colorMap[color];
  return (
    <div className={clsx(c.bg, "p-6 rounded-[2rem] border shadow-sm relative overflow-hidden group", c.border)}>
      <div className={clsx("absolute right-0 top-0 p-4 opacity-5 group-hover:rotate-12 transition-transform", c.iconColor)}>{icon}</div>
      <p className={clsx("text-xs font-black uppercase tracking-widest mb-1", color === 'dark' ? "text-indigo-300" : "text-slate-400")}>{label}</p>
      <h3 className={clsx("text-2xl font-black", c.text)}>{value}</h3>
      <p className={clsx("text-[10px] mt-2 font-bold uppercase", color === 'dark' ? "text-indigo-400" : "text-slate-400")}>{sub}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const isPaid = s.includes('pago') || s.includes('liquidado') || s.includes('recebido');
  const isOverdue = s.includes('atrasa') || s.includes('vencid');
  return (
    <span className={clsx(
      "text-[9px] font-black px-2 py-1 rounded border uppercase whitespace-nowrap",
      isPaid ? "bg-green-50 text-green-700 border-green-100" :
      isOverdue ? "bg-red-50 text-red-700 border-red-100" :
      "bg-amber-50 text-amber-700 border-amber-100"
    )}>{status}</span>
  );
}

function FilterBar({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, startDate, setStartDate, endDate, setEndDate, onSync, isSyncing, syncLabel }: any) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-end gap-4">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="Buscar por nome, descrição, documento..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500">
        <option value="all">Todos os Status</option>
        <option value="PAGO">Pago</option>
        <option value="PENDENTE">Pendente</option>
        <option value="VENCIDO">Vencido</option>
      </select>
      <div className="flex items-center gap-2">
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2.5 outline-none" />
        <span className="text-slate-300">-</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2.5 outline-none" />
      </div>
      <button onClick={onSync} disabled={isSyncing} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all whitespace-nowrap">
        {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {syncLabel}
      </button>
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange, total }: { page: number; totalPages: number; onPageChange: (p: number) => void; total: number }) {
  return (
    <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total: {total.toLocaleString()} registros</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm">
          <ChevronLeft size={18} />
        </button>
        <div className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl font-black text-xs text-slate-600 shadow-sm">
          {page} / {totalPages}
        </div>
        <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

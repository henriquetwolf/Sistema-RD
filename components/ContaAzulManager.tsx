
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Landmark, Search, RefreshCw, ChevronLeft, ChevronRight,
  DollarSign, CheckCircle, Clock, Loader2, Filter as FilterIcon,
  AlertTriangle, Zap, CheckCircle2 as CheckIcon, BarChart3,
  PieChart as PieIcon, TrendingUp, Monitor, BarChart, Wallet, ArrowDownToLine,
  ArrowUpRight, ArrowDownRight, Plus, Save, X, Link2, Unlink,
  CreditCard, Layers, Building2, Tag, FileText, List, Trash2, Pencil,
  Download, Calendar, XCircle, Database
} from 'lucide-react';
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { contaAzulService } from '../services/contaAzulService';
import type {
  ContaAzulAuthStatus, ContaAzulReceivable, ContaAzulPayable,
  ContaAzulCategory, ContaAzulCostCenter, ContaAzulFinancialAccount,
  ContaAzulSyncLog, ContaAzulCreateReceivablePayload, ContaAzulCreatePayablePayload,
  ContaAzulAccount, ContaAzulAccountStatus
} from '../types';
import clsx from 'clsx';
import Papa from 'papaparse';

declare const XLSX: any;

const COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatDate = (d?: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '--';

type TabId = 'overview' | 'receivables' | 'payables' | 'accounts' | 'categories' | 'create' | 'contas' | 'powerbi';

export const ContaAzulManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [authStatus, setAuthStatus] = useState<ContaAzulAuthStatus | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Multi-account
  const [caAccounts, setCaAccounts] = useState<ContaAzulAccount[]>([]);
  const [accountStatuses, setAccountStatuses] = useState<ContaAzulAccountStatus[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ContaAzulAccount | null>(null);
  const [accountForm, setAccountForm] = useState({ nome: '', cnpj: '', client_id: '', client_secret: '', redirect_uri: '' });
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // Overview stats
  const [stats, setStats] = useState<any>(null);

  // Receivables
  const [receivables, setReceivables] = useState<ContaAzulReceivable[]>([]);
  const [recCount, setRecCount] = useState(0);
  const [recPage, setRecPage] = useState(1);
  const [recSummary, setRecSummary] = useState({ vencidos: 0, vencem_hoje: 0, a_vencer: 0, recebidos: 0, total_periodo: 0 });
  const [isExporting, setIsExporting] = useState(false);

  // Payables
  const [payables, setPayables] = useState<ContaAzulPayable[]>([]);
  const [payCount, setPayCount] = useState(0);
  const [payPage, setPayPage] = useState(1);
  const [paySummary, setPaySummary] = useState({ vencidos: 0, vencem_hoje: 0, a_vencer: 0, recebidos: 0, total_periodo: 0 });

  // Shared filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contaFilter, setContaFilter] = useState('');

  // Auxiliaries
  const [categories, setCategories] = useState<ContaAzulCategory[]>([]);
  const [costCenters, setCostCenters] = useState<ContaAzulCostCenter[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<ContaAzulFinancialAccount[]>([]);
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

  // ── Derived state ─────────────────────────────────────────

  const connectedCount = useMemo(
    () => accountStatuses.filter(s => s.connected).length,
    [accountStatuses]
  );

  const hasAnyConnected = connectedCount > 0;

  const isSelectedConnected = useMemo(() => {
    if (!selectedAccountId) return false;
    return accountStatuses.find(s => s.account_id === selectedAccountId)?.connected ?? false;
  }, [selectedAccountId, accountStatuses]);

  const selectedAccountName = useMemo(() => {
    if (!selectedAccountId) return 'Selecione uma conta';
    return caAccounts.find(a => a.id === selectedAccountId)?.nome || 'Conta';
  }, [selectedAccountId, caAccounts]);

  // ── Account Management ────────────────────────────────────

  const loadAccounts = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        contaAzulService.getAccounts(),
        contaAzulService.getAuthStatusAll(),
      ]);
      let loadedAccounts: ContaAzulAccount[] = [];
      if (results[0].status === 'fulfilled') {
        loadedAccounts = results[0].value;
        setCaAccounts(loadedAccounts);
      } else {
        console.error('Error loading accounts:', results[0].reason);
      }
      if (results[1].status === 'fulfilled') {
        setAccountStatuses(results[1].value);
      } else {
        console.error('Error loading account statuses:', results[1].reason);
      }
      setSelectedAccountId(prev => {
        if (prev && loadedAccounts.some(a => a.id === prev)) return prev;
        return loadedAccounts[0]?.id || null;
      });
    } catch (e) {
      console.error('Error loading accounts:', e);
    }
  }, []);

  const handleSaveAccount = useCallback(async () => {
    if (!accountForm.nome.trim() || !accountForm.client_id.trim()) {
      alert('Nome e Client ID são obrigatórios.');
      return;
    }
    if (!accountForm.cnpj.trim()) {
      alert('CNPJ é obrigatório.');
      return;
    }
    if (!editingAccount && !accountForm.client_secret.trim()) {
      alert('Client Secret é obrigatório ao criar uma nova conta.');
      return;
    }
    if (!accountForm.redirect_uri.trim()) {
      alert('Redirect URI é obrigatório. Exemplo: https://SEU-PROJETO.supabase.co/functions/v1/conta-azul-auth');
      return;
    }
    setIsSavingAccount(true);
    try {
      const trimmed = {
        nome: accountForm.nome.trim(),
        cnpj: accountForm.cnpj.trim(),
        client_id: accountForm.client_id.trim(),
        client_secret: accountForm.client_secret.trim(),
        redirect_uri: accountForm.redirect_uri.trim(),
      };
      if (editingAccount) {
        const updatePayload: Record<string, any> = { nome: trimmed.nome, cnpj: trimmed.cnpj, client_id: trimmed.client_id, redirect_uri: trimmed.redirect_uri };
        if (trimmed.client_secret) updatePayload.client_secret = trimmed.client_secret;
        await contaAzulService.updateAccount(editingAccount.id, updatePayload);
      } else {
        await contaAzulService.createAccount(trimmed);
      }
      setShowAccountModal(false);
      setEditingAccount(null);
      setAccountForm({ nome: '', cnpj: '', client_id: '', client_secret: '', redirect_uri: '' });
      await loadAccounts();
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setIsSavingAccount(false);
    }
  }, [accountForm, editingAccount, loadAccounts]);

  const handleDeleteAccount = useCallback(async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta? Todos os dados associados serão perdidos.')) return;
    try {
      await contaAzulService.deleteAccount(id);
      if (selectedAccountId === id) setSelectedAccountId(null);
      await loadAccounts();
    } catch (e: any) {
      alert(`Erro ao excluir: ${e.message}`);
    }
  }, [selectedAccountId, loadAccounts]);

  const openEditAccount = useCallback((acc: ContaAzulAccount) => {
    setEditingAccount(acc);
    setAccountForm({
      nome: acc.nome,
      cnpj: acc.cnpj || '',
      client_id: acc.client_id || '',
      client_secret: '',
      redirect_uri: acc.redirect_uri || '',
    });
    setShowAccountModal(true);
  }, []);

  const defaultRedirectUri = useMemo(() => {
    const base = (import.meta as any).env?.VITE_APP_SUPABASE_URL || '';
    return base ? `${base.replace(/\/+$/, '')}/functions/v1/conta-azul-auth` : '';
  }, []);

  const openNewAccount = useCallback(() => {
    setEditingAccount(null);
    setAccountForm({ nome: '', cnpj: '', client_id: '', client_secret: '', redirect_uri: defaultRedirectUri });
    setShowAccountModal(true);
  }, [defaultRedirectUri]);

  // ── Auth check ──────────────────────────────────────────

  const checkAuth = useCallback(async () => {
    setIsCheckingAuth(true);
    try {
      const status = await contaAzulService.getAuthStatus(selectedAccountId || undefined);
      setAuthStatus(status);
      return status;
    } catch {
      const fallback = { connected: false, lastSync: null } as ContaAzulAuthStatus;
      setAuthStatus(fallback);
      return fallback;
    } finally {
      setIsCheckingAuth(false);
    }
  }, [selectedAccountId]);

  const handleConnect = useCallback((accountId: string) => {
    contaAzulService.startOAuthFlow(accountId);

    setTimeout(() => {
      const lastUri = (window as any).__contaAzulLastRedirectUri;
      if (lastUri) {
        console.log('[ContaAzul] Se houver erro "redirect_mismatch", cadastre este Redirect URI no portal do Conta Azul:', lastUri);
      }
    }, 2000);

    const pollInterval = setInterval(async () => {
      try {
        const status = await contaAzulService.getAuthStatus(accountId);
        if (status.connected) {
          setAuthStatus(status);
          loadAccounts();
          clearInterval(pollInterval);
        }
      } catch { /* ignore polling errors */ }
    }, 3000);
    setTimeout(() => clearInterval(pollInterval), 300000);
  }, [loadAccounts]);

  const handleDisconnect = useCallback(async (accountId: string) => {
    await contaAzulService.disconnect(accountId);
    await Promise.all([checkAuth(), loadAccounts()]);
  }, [checkAuth, loadAccounts]);

  // ── Effects (mount + auth) ────────────────────────────────

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'CONTA_AZUL_AUTH_SUCCESS') {
        checkAuth();
        loadAccounts();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [checkAuth, loadAccounts]);

  // ── Data loading ────────────────────────────────────────

  const [allAccountsStats, setAllAccountsStats] = useState<Record<string, any>>({});

  const loadOverview = useCallback(async () => {
    if (!selectedAccountId) return;
    try {
      const statsPromises = caAccounts.map(async (acc) => {
        try {
          const s = await contaAzulService.getFinancialStats(acc.id);
          return { id: acc.id, nome: acc.nome, stats: s };
        } catch {
          return { id: acc.id, nome: acc.nome, stats: null };
        }
      });
      const logsPromise = contaAzulService.getSyncLogs(selectedAccountId, 10);

      const [accountStats, logs] = await Promise.all([
        Promise.all(statsPromises),
        logsPromise,
      ]);

      const statsMap: Record<string, any> = {};
      for (const as of accountStats) {
        statsMap[as.id] = { nome: as.nome, ...as.stats };
      }
      setAllAccountsStats(statsMap);

      const selectedStats = accountStats.find(a => a.id === selectedAccountId)?.stats;
      setStats(selectedStats || null);
      setSyncLogs(logs);
    } catch (e) {
      console.error('Error loading overview:', e);
    }
  }, [selectedAccountId, caAccounts]);

  const loadReceivables = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const { data, count } = await contaAzulService.getReceivables({
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        contaFinanceira: contaFilter || undefined,
        limit: PAGE_SIZE,
        offset: (recPage - 1) * PAGE_SIZE,
        accountId: selectedAccountId || undefined,
      });
      setReceivables(data);
      setRecCount(count);
    } catch (e) {
      console.error('Error loading receivables:', e);
    } finally {
      setIsLoadingData(false);
    }
  }, [searchTerm, statusFilter, startDate, endDate, contaFilter, recPage, selectedAccountId]);

  const loadReceivableSummary = useCallback(async () => {
    try {
      const summary = await contaAzulService.getReceivableSummary({
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        contaFinanceira: contaFilter || undefined,
        accountId: selectedAccountId || undefined,
      });
      setRecSummary(summary);
    } catch (e) {
      console.error('Error loading receivable summary:', e);
    }
  }, [searchTerm, statusFilter, startDate, endDate, contaFilter, selectedAccountId]);

  const handleExportReceivables = useCallback(async (format: 'csv' | 'xlsx') => {
    setIsExporting(true);
    try {
      const { data } = await contaAzulService.getReceivables({
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        contaFinanceira: contaFilter || undefined,
        limit: 50000,
        offset: 0,
        accountId: selectedAccountId || undefined,
      });

      const rows = data.map(r => ({
        'Contato': r.contato_nome || '',
        'Descrição': r.descricao || '',
        'Vencimento': r.data_vencimento ? new Date(r.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '',
        'Competência': r.data_competencia ? new Date(r.data_competencia + 'T00:00:00').toLocaleDateString('pt-BR') : '',
        'Valor (R$)': r.valor,
        'Recebido (R$)': r.valor_pago,
        'A Receber (R$)': r.valor - r.valor_pago,
        'Categoria': r.categoria_nome || '',
        'Centro de Custo': r.centro_custo_nome || '',
        'Conta Financeira': r.conta_financeira_nome || '',
        'Status': r.status,
        'Documento': r.numero_documento || '',
        'Observações': r.observacoes || '',
      }));

      const dateStr = new Date().toISOString().split('T')[0];

      if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Contas a Receber');
        XLSX.writeFile(workbook, `Contas_Receber_${dateStr}.xlsx`);
      } else {
        const csv = Papa.unparse(rows);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Contas_Receber_${dateStr}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Error exporting receivables:', e);
      alert('Erro ao exportar dados. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  }, [searchTerm, statusFilter, startDate, endDate, contaFilter, selectedAccountId]);

  const loadPayableSummary = useCallback(async () => {
    try {
      const summary = await contaAzulService.getPayableSummary({
        search: searchTerm || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        contaFinanceira: contaFilter || undefined,
        accountId: selectedAccountId || undefined,
      });
      setPaySummary(summary);
    } catch (e) {
      console.error('Error loading payable summary:', e);
    }
  }, [searchTerm, startDate, endDate, contaFilter, selectedAccountId]);

  const handleExportPayables = useCallback(async (format: 'csv' | 'xlsx') => {
    setIsExporting(true);
    try {
      const { data } = await contaAzulService.getPayables({
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        contaFinanceira: contaFilter || undefined,
        limit: 50000,
        offset: 0,
        accountId: selectedAccountId || undefined,
      });

      const rows = data.map(p => ({
        'Fornecedor': p.fornecedor_nome || '',
        'Descrição': p.descricao || '',
        'Vencimento': p.data_vencimento ? new Date(p.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '',
        'Competência': p.data_competencia ? new Date(p.data_competencia + 'T00:00:00').toLocaleDateString('pt-BR') : '',
        'Valor (R$)': p.valor,
        'Pago (R$)': p.valor_pago,
        'A Pagar (R$)': p.valor - p.valor_pago,
        'Categoria': p.categoria_nome || '',
        'Centro de Custo': p.centro_custo_nome || '',
        'Conta Financeira': p.conta_financeira_nome || '',
        'Status': p.status,
        'Documento': p.numero_documento || '',
        'Observações': p.observacoes || '',
      }));

      const dateStr = new Date().toISOString().split('T')[0];

      if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Contas a Pagar');
        XLSX.writeFile(workbook, `Contas_Pagar_${dateStr}.xlsx`);
      } else {
        const csv = Papa.unparse(rows);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Contas_Pagar_${dateStr}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Error exporting payables:', e);
      alert('Erro ao exportar dados. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  }, [searchTerm, statusFilter, startDate, endDate, contaFilter, selectedAccountId]);

  const loadPayables = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const { data, count } = await contaAzulService.getPayables({
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        contaFinanceira: contaFilter || undefined,
        limit: PAGE_SIZE,
        offset: (payPage - 1) * PAGE_SIZE,
        accountId: selectedAccountId || undefined,
      });
      setPayables(data);
      setPayCount(count);
    } catch (e) {
      console.error('Error loading payables:', e);
    } finally {
      setIsLoadingData(false);
    }
  }, [searchTerm, statusFilter, startDate, endDate, contaFilter, payPage, selectedAccountId]);

  const loadAuxiliaries = useCallback(async () => {
    try {
      const [cats, ccs, accs] = await Promise.all([
        contaAzulService.getCategories(selectedAccountId || undefined),
        contaAzulService.getCostCenters(selectedAccountId || undefined),
        contaAzulService.getFinancialAccounts(selectedAccountId || undefined),
      ]);
      setCategories(cats);
      setCostCenters(ccs);
      setFinancialAccounts(accs);
    } catch (e) {
      console.error('Error loading auxiliaries:', e);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    if (!isSelectedConnected) return;
    loadOverview();
    loadAuxiliaries();
  }, [isSelectedConnected, loadOverview, loadAuxiliaries]);

  useEffect(() => {
    if (activeTab === 'receivables' && isSelectedConnected) {
      loadReceivables();
      loadReceivableSummary();
    }
  }, [activeTab, loadReceivables, loadReceivableSummary, isSelectedConnected]);

  useEffect(() => {
    if (activeTab === 'payables' && isSelectedConnected) {
      loadPayables();
      loadPayableSummary();
    }
  }, [activeTab, loadPayables, loadPayableSummary, isSelectedConnected]);

  // ── Sync ────────────────────────────────────────────────

  const syncSteps: { type: 'categories' | 'cost-centers' | 'accounts' | 'receivables' | 'payables'; label: string }[] = [
    { type: 'categories', label: 'Categorias' },
    { type: 'cost-centers', label: 'Centros de Custo' },
    { type: 'accounts', label: 'Contas Financeiras' },
    { type: 'receivables', label: 'Contas a Receber' },
    { type: 'payables', label: 'Contas a Pagar' },
  ];

  const handleSync = async (type: 'all' | 'receivables' | 'payables' | 'categories' | 'cost-centers' | 'accounts', fullSync = false) => {
    if (!selectedAccountId) {
      alert('Selecione uma conta (FILIAL ou MATRIZ) antes de sincronizar.');
      return;
    }
    const isConnected = accountStatuses.find(s => s.account_id === selectedAccountId)?.connected;
    if (!isConnected) {
      alert('A conta selecionada não está conectada ao Conta Azul.');
      return;
    }
    const connectedIds = [selectedAccountId];

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStep('');

    const getAccName = (id: string) => connectedIds.length > 1
      ? (accountStatuses.find(s => s.account_id === id)?.nome || id)
      : '';

    const syncFinancial = async (
      stepType: 'receivables' | 'payables',
      accId: string,
      prefix: string,
      stepLabel: string,
    ): Promise<{ synced: number; error?: string }> => {
      if (fullSync) {
        setSyncMessage(`${prefix}Sincronizando ${stepLabel} (completa, trimestral)...`);
        const result = await contaAzulService.triggerSyncChunked(stepType, accId, (chunk, total) => {
          setSyncMessage(`${prefix}${stepLabel}... parte ${chunk}/${total}`);
        });
        return { synced: result.sincronizados ?? 0 };
      }
      setSyncMessage(`${prefix}Sincronizando ${stepLabel} (rápido)...`);
      const result = await contaAzulService.triggerSyncIncremental(stepType, accId);
      return { synced: result.sincronizados ?? 0 };
    };

    if (type === 'all') {
      let totalSynced = 0;
      let errors: string[] = [];
      const totalSteps = syncSteps.length * connectedIds.length;
      let currentStep = 0;

      for (const accId of connectedIds) {
        const accName = getAccName(accId);
        const prefix = accName ? `[${accName}] ` : '';

        for (let i = 0; i < syncSteps.length; i++) {
          const step = syncSteps[i];
          currentStep++;
          setSyncProgress(Math.round((currentStep / totalSteps) * 100));
          setSyncStep(`${prefix}${step.label}`);

          if (step.type === 'receivables' || step.type === 'payables') {
            try {
              const { synced } = await syncFinancial(step.type, accId, prefix, step.label);
              totalSynced += synced;
            } catch (e: any) {
              errors.push(`${prefix}${step.label}: ${e.message}`);
            }
          } else {
            setSyncMessage(`${prefix}Sincronizando ${step.label}... (${currentStep}/${totalSteps})`);
            try {
              const result = await contaAzulService.triggerSync(step.type, accId);
              totalSynced += result.sincronizados ?? 0;
            } catch (e: any) {
              errors.push(`${prefix}${step.label}: ${e.message}`);
            }
          }
        }
      }
      setSyncProgress(100);
      setSyncStep('');
      const modeLabel = fullSync ? 'completa' : 'incremental';
      if (errors.length > 0) {
        setSyncMessage(`Sync ${modeLabel} concluída com ${errors.length} erro(s). ${totalSynced} registros sincronizados.`);
        console.warn('Sync errors:', errors);
      } else {
        setSyncMessage(`Sync ${modeLabel}: ${totalSynced} registros sincronizados!`);
      }
      await loadOverview();
      loadAuxiliaries();
      if (activeTab === 'receivables') loadReceivables();
      if (activeTab === 'payables') loadPayables();
      loadReceivableSummary();
      loadPayableSummary();
    } else {
      const stepLabel = syncSteps.find(s => s.type === type)?.label || type;
      let totalSynced = 0;

      for (const accId of connectedIds) {
        const accName = getAccName(accId);
        const prefix = accName ? `[${accName}] ` : '';

        if (type === 'receivables' || type === 'payables') {
          setSyncProgress(10);
          setSyncStep(stepLabel);
          try {
            const { synced } = await syncFinancial(type, accId, prefix, stepLabel);
            totalSynced += synced;
          } catch (e: any) {
            setSyncMessage(`Erro em ${stepLabel}: ${e.message}`);
          }
        } else {
          setSyncMessage(`${prefix}Sincronizando ${stepLabel}...`);
          setSyncProgress(50);
          setSyncStep(stepLabel);
          try {
            const result = await contaAzulService.triggerSync(type, accId);
            totalSynced += result.sincronizados ?? 0;
          } catch (e: any) {
            setSyncMessage(`Erro em ${stepLabel}: ${e.message}`);
          }
        }
      }

      setSyncProgress(100);
      if (totalSynced === 0 && (type === 'categories' || type === 'cost-centers')) {
        setSyncMessage(`${stepLabel}: 0 registros encontrados. Verifique se a conta está conectada e tente sincronizar novamente.`);
      } else {
        const modeLabel = (type === 'receivables' || type === 'payables') ? (fullSync ? ' (completa)' : ' (rápido)') : '';
        setSyncMessage(`${stepLabel}${modeLabel}: ${totalSynced} registros sincronizados`);
      }
      await loadOverview();
      if (type === 'receivables') {
        loadReceivables();
        loadReceivableSummary();
      } else if (type === 'payables') {
        loadPayables();
        loadPayableSummary();
      } else {
        loadAuxiliaries();
      }
    }

    setIsSyncing(false);
    setTimeout(() => { setSyncMessage(''); setSyncProgress(0); setSyncStep(''); }, 6000);
  };

  // ── Create ──────────────────────────────────────────────

  const handleCreate = async () => {
    if (!selectedAccountId) {
      alert('Selecione uma conta específica antes de criar lançamentos.');
      return;
    }
    if (!createForm.descricao || !createForm.valor) {
      alert('Descrição e Valor são obrigatórios.');
      return;
    }
    if (!createForm.categoria_id) {
      alert('Categoria é obrigatória. Selecione uma categoria antes de criar.');
      return;
    }
    if (!createForm.data_vencimento) {
      alert('Data de Vencimento é obrigatória.');
      return;
    }
    setIsCreating(true);
    try {
      if (createType === 'receivable') {
        await contaAzulService.createReceivable(createForm as ContaAzulCreateReceivablePayload, selectedAccountId);
      } else {
        await contaAzulService.createPayable(createForm as ContaAzulCreatePayablePayload, selectedAccountId);
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
    { id: 'contas', label: 'Contas', icon: <Building2 size={15} /> },
    { id: 'powerbi', label: 'Power BI', icon: <Monitor size={15} /> },
  ];

  const recTotalPages = Math.ceil(recCount / PAGE_SIZE);
  const payTotalPages = Math.ceil(payCount / PAGE_SIZE);

  const lastSuccessfulSync = useMemo(() => {
    const successLog = syncLogs.find(l => l.status === 'success');
    return successLog?.finished_at || null;
  }, [syncLogs]);

  const nextAutoSyncMinutes = useMemo(() => {
    if (!lastSuccessfulSync) return null;
    const lastMs = new Date(lastSuccessfulSync).getTime();
    const nowMs = Date.now();
    const elapsedMin = (nowMs - lastMs) / 60000;
    const remaining = Math.max(0, Math.ceil(10 - (elapsedMin % 10)));
    return remaining;
  }, [lastSuccessfulSync]);

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 pb-20">
      {/* Header + Connection Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit">
            <div className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white shadow-md flex items-center gap-2">
              <Landmark size={18} /> Conta Azul Intelligence
            </div>
          </div>

          {/* Connection summary badge */}
          {isCheckingAuth ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border text-slate-400 text-[10px] font-black uppercase">
              <Loader2 size={12} className="animate-spin" /> Verificando...
            </div>
          ) : caAccounts.length === 0 ? (
            <button
              onClick={() => setActiveTab('contas')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 text-amber-700 text-[10px] font-black uppercase transition-all"
            >
              <Building2 size={12} /> Adicionar Conta
            </button>
          ) : hasAnyConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-xl border border-green-100 text-green-700 text-[10px] font-black uppercase">
              <Link2 size={12} /> {connectedCount}/{caAccounts.length} Conectadas
              {lastSuccessfulSync && (
                <span className="text-green-500 font-bold normal-case ml-1">
                  Última sync: {new Date(lastSuccessfulSync).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('contas')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 text-amber-700 text-[10px] font-black uppercase transition-all"
            >
              <Unlink size={12} /> Nenhuma conta conectada
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isSelectedConnected && (
            <>
              <button
                onClick={() => handleSync('all')}
                disabled={isSyncing}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-l-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center gap-2"
                title="Sync rápido (apenas alterações recentes)"
              >
                {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Sync Rápido
              </button>
              <button
                onClick={() => handleSync('all', true)}
                disabled={isSyncing}
                className="bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white px-3 py-2.5 rounded-r-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-600/20 transition-all flex items-center gap-1 border-l border-slate-500"
                title="Sync completa (todos os registros, mais lento)"
              >
                <Database size={14} /> Completa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Account Selector */}
      {caAccounts.length > 0 && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm mb-4 shrink-0 flex items-center gap-3">
          <Building2 size={16} className="text-blue-600 shrink-0" />
          <select
            value={selectedAccountId || ''}
            onChange={e => setSelectedAccountId(e.target.value || null)}
            className="flex-1 bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            {caAccounts.map(acc => {
              const st = accountStatuses.find(s => s.account_id === acc.id);
              return (
                <option key={acc.id} value={acc.id}>
                  {acc.nome}{acc.cnpj ? ` (${acc.cnpj})` : ''} — {st?.connected ? '● Conectada' : '○ Desconectada'}
                </option>
              );
            })}
          </select>
          {selectedAccountId && !isSelectedConnected && (
            <button
              onClick={() => handleConnect(selectedAccountId)}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <Zap size={12} /> Conectar
            </button>
          )}
          {selectedAccountId && isSelectedConnected && (
            <button
              onClick={() => handleDisconnect(selectedAccountId)}
              className="p-2 text-slate-400 hover:text-red-500 bg-white border border-slate-200 rounded-xl transition-all shadow-sm"
              title="Desconectar conta selecionada"
            >
              <Unlink size={14} />
            </button>
          )}
        </div>
      )}

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
      {!isSelectedConnected && !isCheckingAuth && activeTab !== 'powerbi' && activeTab !== 'contas' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
          <Landmark size={80} className="text-slate-200 mb-6" />
          <h3 className="text-xl font-black text-slate-400 mb-2">
            {caAccounts.length === 0 ? 'Nenhuma conta cadastrada' : 'Conta não conectada'}
          </h3>
          <p className="text-sm text-slate-400 mb-6 max-w-md">
            {caAccounts.length === 0
              ? 'Cadastre sua primeira conta do Conta Azul para começar a visualizar dados financeiros em tempo real.'
              : selectedAccountId
                ? 'Esta conta ainda não está conectada ao Conta Azul. Conecte-a na aba Contas.'
                : 'Nenhuma conta está conectada. Gerencie suas contas para conectar ao Conta Azul.'
            }
          </p>
          <button
            onClick={() => setActiveTab('contas')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center gap-3"
          >
            <Building2 size={18} /> {caAccounts.length === 0 ? 'Cadastrar Conta' : 'Gerenciar Contas'}
          </button>
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1">
        {/* ═══ OVERVIEW ═══ */}
        {activeTab === 'overview' && isSelectedConnected && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
            {lastSuccessfulSync && (
              <div className="flex items-center gap-3 px-5 py-3 bg-blue-50 rounded-2xl border border-blue-100">
                <Clock size={16} className="text-blue-500" />
                <span className="text-xs font-bold text-blue-700">
                  Dados sincronizados em: {new Date(lastSuccessfulSync).toLocaleString('pt-BR')}
                  {selectedAccountId && <span className="ml-1 text-blue-500">({selectedAccountName})</span>}
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 border border-green-200 rounded-full" title="Sincronização automática a cada 10 minutos">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-green-700">
                    Auto-sync {nextAutoSyncMinutes !== null ? `· ~${nextAutoSyncMinutes}min` : 'ativo'}
                  </span>
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

            {/* Resumo por Conta (FILIAL / MATRIZ / Consolidado) */}
            {Object.keys(allAccountsStats).length > 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {caAccounts.map(acc => {
                  const as = allAccountsStats[acc.id];
                  if (!as) return null;
                  const isActive = acc.id === selectedAccountId;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => setSelectedAccountId(acc.id)}
                      className={clsx(
                        "bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all hover:shadow-md",
                        isActive ? "border-blue-500 shadow-md ring-2 ring-blue-100" : "border-slate-200"
                      )}
                    >
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <Building2 size={12} className={isActive ? "text-blue-500" : "text-slate-400"} />
                        {acc.nome}
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 font-bold">A Receber</span>
                          <p className="text-green-700 font-black text-sm">{formatCurrency(as.totalReceberPendente || 0)}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold">A Pagar</span>
                          <p className="text-red-700 font-black text-sm">{formatCurrency(as.totalPagarPendente || 0)}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold">Saldo</span>
                          <p className="text-blue-700 font-black text-sm">{formatCurrency(as.saldoContas || 0)}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold">Registros</span>
                          <p className="text-slate-700 font-black text-sm">{((as.countReceber || 0) + (as.countPagar || 0)).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(() => {
                  const vals = Object.values(allAccountsStats) as any[];
                  const totalRecPend = vals.reduce((s, v) => s + (v?.totalReceberPendente || 0), 0);
                  const totalPagPend = vals.reduce((s, v) => s + (v?.totalPagarPendente || 0), 0);
                  const totalSaldo = vals.reduce((s, v) => s + (v?.saldoContas || 0), 0);
                  const totalCount = vals.reduce((s, v) => s + (v?.countReceber || 0) + (v?.countPagar || 0), 0);
                  return (
                    <div className="bg-slate-800 text-white rounded-2xl border-2 border-slate-700 p-5">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <TrendingUp size={12} className="text-slate-400" />
                        Consolidado
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 font-bold">A Receber</span>
                          <p className="text-green-400 font-black text-sm">{formatCurrency(totalRecPend)}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold">A Pagar</span>
                          <p className="text-red-400 font-black text-sm">{formatCurrency(totalPagPend)}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold">Saldo</span>
                          <p className="text-blue-400 font-black text-sm">{formatCurrency(totalSaldo)}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold">Registros</span>
                          <p className="text-slate-300 font-black text-sm">{totalCount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* KPI Cards (conta selecionada) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard
                label={`Saldo em Contas — ${selectedAccountName}`}
                value={formatCurrency(stats?.saldoContas || 0)}
                sub="Contas financeiras ativas"
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
        {activeTab === 'receivables' && isSelectedConnected && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
            <ReceivableFilterBar
              searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              startDate={startDate} setStartDate={setStartDate}
              endDate={endDate} setEndDate={setEndDate}
              contaFilter={contaFilter} setContaFilter={setContaFilter}
              onSync={() => handleSync('receivables')}
              onFullSync={() => handleSync('receivables', true)}
              isSyncing={isSyncing}
              financialAccounts={financialAccounts}
              onClear={() => { setSearchTerm(''); setStatusFilter('all'); setStartDate(''); setEndDate(''); setContaFilter(''); }}
            />

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <KpiCard label="Vencidos (R$)" value={formatCurrency(recSummary.vencidos)} sub="Em atraso" icon={<AlertTriangle size={48} />} color="red" />
              <KpiCard label="Vencem Hoje (R$)" value={formatCurrency(recSummary.vencem_hoje)} sub="Vencimento hoje" icon={<Clock size={48} />} color="amber" />
              <KpiCard label="A Vencer (R$)" value={formatCurrency(recSummary.a_vencer)} sub="Futuras" icon={<Calendar size={48} />} color="blue" />
              <KpiCard label="Recebidos (R$)" value={formatCurrency(recSummary.recebidos)} sub="Já recebido" icon={<CheckCircle size={48} />} color="green" />
              <KpiCard label="Total do Período (R$)" value={formatCurrency(recSummary.total_periodo)} sub={`${recCount} registros`} icon={<DollarSign size={48} />} color="dark" />
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[500px]">
              <div className="px-8 py-5 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-green-600 text-white rounded-2xl shadow-lg shadow-green-100"><ArrowDownRight size={22} /></div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Contas a Receber</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{recCount} registros sincronizados</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportReceivables('csv')}
                    disabled={isExporting || receivables.length === 0}
                    className="bg-white hover:bg-slate-50 disabled:opacity-40 border border-slate-200 text-slate-600 px-3 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} CSV
                  </button>
                  <button
                    onClick={() => handleExportReceivables('xlsx')}
                    disabled={isExporting || receivables.length === 0}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Excel
                  </button>
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
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">A Receber</th>
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
                          <td className="px-6 py-3 text-xs font-bold text-amber-600 text-right">{formatCurrency(r.valor - r.valor_pago)}</td>
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
        {activeTab === 'payables' && isSelectedConnected && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
            <ReceivableFilterBar
              searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              startDate={startDate} setStartDate={setStartDate}
              endDate={endDate} setEndDate={setEndDate}
              contaFilter={contaFilter} setContaFilter={setContaFilter}
              onSync={() => handleSync('payables')}
              onFullSync={() => handleSync('payables', true)}
              isSyncing={isSyncing}
              financialAccounts={financialAccounts}
              onClear={() => { setSearchTerm(''); setStatusFilter('all'); setStartDate(''); setEndDate(''); setContaFilter(''); }}
            />

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <KpiCard label="Vencidos (R$)" value={formatCurrency(paySummary.vencidos)} sub="Em atraso" icon={<AlertTriangle size={48} />} color="red" />
              <KpiCard label="Vencem Hoje (R$)" value={formatCurrency(paySummary.vencem_hoje)} sub="Vencimento hoje" icon={<Clock size={48} />} color="amber" />
              <KpiCard label="A Vencer (R$)" value={formatCurrency(paySummary.a_vencer)} sub="Futuras" icon={<Calendar size={48} />} color="blue" />
              <KpiCard label="Pagos (R$)" value={formatCurrency(paySummary.recebidos)} sub="Já pago" icon={<CheckCircle size={48} />} color="green" />
              <KpiCard label="Total do Período (R$)" value={formatCurrency(paySummary.total_periodo)} sub={`${payCount} registros`} icon={<DollarSign size={48} />} color="dark" />
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[500px]">
              <div className="px-8 py-5 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-100"><ArrowUpRight size={22} /></div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Contas a Pagar</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{payCount} registros sincronizados</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportPayables('csv')}
                    disabled={isExporting || payables.length === 0}
                    className="bg-white hover:bg-slate-50 disabled:opacity-40 border border-slate-200 text-slate-600 px-3 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} CSV
                  </button>
                  <button
                    onClick={() => handleExportPayables('xlsx')}
                    disabled={isExporting || payables.length === 0}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Excel
                  </button>
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
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">A Pagar</th>
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
                          <td className="px-6 py-3 text-xs font-black text-red-600 text-right">{formatCurrency(p.valor - p.valor_pago)}</td>
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
        {activeTab === 'accounts' && isSelectedConnected && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-700 flex items-center gap-2"><Wallet size={20} className="text-blue-600" /> Contas Financeiras</h3>
              <button onClick={() => handleSync('accounts')} disabled={isSyncing} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all">
                {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar Saldos
              </button>
            </div>

            {financialAccounts.length === 0 ? (
              <div className="py-20 text-center text-slate-300">
                <Building2 size={48} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold">Nenhuma conta financeira sincronizada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {financialAccounts.map(acc => (
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

            {financialAccounts.length > 0 && (
              <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Saldo Consolidado</p>
                  <p className="text-3xl font-black mt-1">
                    {formatCurrency(financialAccounts.reduce((s, a) => s + a.saldo_atual, 0))}
                  </p>
                </div>
                <Wallet size={48} className="text-white/10" />
              </div>
            )}
          </div>
        )}

        {/* ═══ CATEGORIES & COST CENTERS ═══ */}
        {activeTab === 'categories' && isSelectedConnected && (
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
        {activeTab === 'create' && isSelectedConnected && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-left-4 duration-500">
            {!selectedAccountId && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-700">Selecione uma conta específica</p>
                  <p className="text-xs text-amber-500">Para criar lançamentos, selecione uma conta no filtro acima.</p>
                </div>
              </div>
            )}

            <div className={clsx("bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden", !selectedAccountId && "opacity-50 pointer-events-none")}>
              <div className="px-8 py-6 bg-slate-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg"><Plus size={22} /></div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">Criar Lançamento Financeiro</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      {selectedAccountId ? `Conta: ${selectedAccountName}` : 'Selecione uma conta'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
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
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Vencimento *</label>
                    <input type="date" value={createForm.data_vencimento || ''} onChange={e => setCreateForm(f => ({ ...f, data_vencimento: e.target.value }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>

                  {categories.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria *</label>
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
                <button onClick={handleCreate} disabled={isCreating || !selectedAccountId} className={clsx(
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

        {/* ═══ CONTAS (Account Management) ═══ */}
        {activeTab === 'contas' && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-700 flex items-center gap-2">
                <Building2 size={20} className="text-blue-600" /> Gerenciamento de Contas
              </h3>
              <button
                onClick={openNewAccount}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
              >
                <Plus size={14} /> Nova Conta
              </button>
            </div>

            {caAccounts.length === 0 ? (
              <div className="py-20 text-center">
                <Building2 size={64} className="mx-auto mb-4 text-slate-200" />
                <h3 className="text-lg font-black text-slate-400 mb-2">Nenhuma conta cadastrada</h3>
                <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                  Cadastre sua primeira conta do Conta Azul para começar a sincronizar dados financeiros.
                </p>
                <button
                  onClick={openNewAccount}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center gap-3 mx-auto"
                >
                  <Plus size={18} /> Cadastrar Primeira Conta
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {caAccounts.map(acc => {
                  const st = accountStatuses.find(s => s.account_id === acc.id);
                  const isConnected = st?.connected ?? false;
                  return (
                    <div key={acc.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:rotate-12 transition-transform">
                        <Building2 size={64} />
                      </div>

                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            "w-12 h-12 rounded-2xl flex items-center justify-center",
                            isConnected ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                          )}>
                            <Building2 size={24} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800">{acc.nome}</p>
                            {acc.cnpj && <p className="text-[10px] text-slate-400 font-bold">{acc.cnpj}</p>}
                          </div>
                        </div>
                        <span className={clsx(
                          "text-[9px] font-black px-2.5 py-1 rounded-lg uppercase border",
                          isConnected
                            ? "bg-green-50 text-green-700 border-green-100"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        )}>
                          {isConnected ? 'Conectada' : 'Desconectada'}
                        </span>
                      </div>

                      {isConnected && st?.lastSync && (
                        <p className="text-[10px] text-slate-400 font-bold mb-3">
                          Última sync: {new Date(st.lastSync).toLocaleString('pt-BR')}
                          {st.lastSyncType && <span className="ml-1 text-slate-300">({st.lastSyncType})</span>}
                        </p>
                      )}

                      {isConnected && st?.tokenExpiresAt && (
                        <p className="text-[10px] text-slate-400 font-bold mb-3">
                          Token expira: {new Date(st.tokenExpiresAt).toLocaleString('pt-BR')}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                        {isConnected ? (
                          <button
                            onClick={() => handleDisconnect(acc.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg text-[10px] font-black uppercase transition-all"
                          >
                            <Unlink size={12} /> Desconectar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnect(acc.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg text-[10px] font-black uppercase transition-all"
                          >
                            <Zap size={12} /> Conectar
                          </button>
                        )}
                        <button
                          onClick={() => openEditAccount(acc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black uppercase transition-all"
                        >
                          <Pencil size={12} /> Editar
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg text-[10px] font-black uppercase transition-all ml-auto"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {caAccounts.length > 0 && (
              <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Resumo</p>
                  <p className="text-2xl font-black mt-1">
                    {connectedCount} de {caAccounts.length} conta{caAccounts.length !== 1 ? 's' : ''} conectada{connectedCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <Building2 size={48} className="text-white/10" />
              </div>
            )}
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

      {/* ═══ Account Modal ═══ */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-5 bg-slate-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <Building2 size={18} />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                  {editingAccount ? 'Editar Conta' : 'Nova Conta'}
                </h3>
              </div>
              <button
                onClick={() => { setShowAccountModal(false); setEditingAccount(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Conta *</label>
                <input
                  type="text"
                  value={accountForm.nome}
                  onChange={e => setAccountForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Voll Pilates - Matriz"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CNPJ</label>
                <input
                  type="text"
                  value={accountForm.cnpj}
                  onChange={e => setAccountForm(f => ({ ...f, cnpj: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client ID *</label>
                <input
                  type="text"
                  value={accountForm.client_id}
                  onChange={e => setAccountForm(f => ({ ...f, client_id: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Client ID do app OAuth"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Client Secret {editingAccount ? '(deixe vazio para manter)' : '*'}
                </label>
                <input
                  type="password"
                  value={accountForm.client_secret}
                  onChange={e => setAccountForm(f => ({ ...f, client_secret: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Client Secret do app OAuth"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Redirect URI</label>
                <input
                  type="text"
                  value={accountForm.redirect_uri}
                  onChange={e => setAccountForm(f => ({ ...f, redirect_uri: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={defaultRedirectUri || "https://SEU-PROJETO.supabase.co/functions/v1/conta-azul-auth"}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Deve terminar com <span className="font-mono font-bold text-slate-500">/conta-azul-auth</span>. Cadastre esta mesma URL no portal de desenvolvedor do Conta Azul.
                </p>
              </div>
            </div>

            <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3">
              <button
                onClick={() => { setShowAccountModal(false); setEditingAccount(null); }}
                className="px-6 py-2.5 text-slate-500 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAccount}
                disabled={isSavingAccount}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
              >
                {isSavingAccount ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editingAccount ? 'Salvar Alterações' : 'Cadastrar Conta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────

function KpiCard({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: React.ReactNode; color: 'blue' | 'green' | 'red' | 'dark' | 'amber' }) {
  const colorMap = {
    blue: { bg: 'bg-white', text: 'text-blue-700', iconColor: 'text-blue-600', border: 'border-slate-200' },
    green: { bg: 'bg-white', text: 'text-green-600', iconColor: 'text-green-600', border: 'border-slate-200' },
    red: { bg: 'bg-white', text: 'text-red-600', iconColor: 'text-red-600', border: 'border-slate-200' },
    amber: { bg: 'bg-white', text: 'text-amber-600', iconColor: 'text-amber-500', border: 'border-slate-200' },
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

function FilterBar({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, startDate, setStartDate, endDate, setEndDate, onSync, onFullSync, isSyncing, syncLabel }: any) {
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
      <div className="flex items-center gap-1">
        <button onClick={onSync} disabled={isSyncing} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-l-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all whitespace-nowrap" title="Sync rápido (apenas alterações recentes)">
          {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync Rápido
        </button>
        {onFullSync && (
          <button onClick={onFullSync} disabled={isSyncing} className="bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white px-3 py-2.5 rounded-r-xl font-black text-[10px] uppercase flex items-center gap-1 transition-all whitespace-nowrap border-l border-slate-500" title="Sync completa (todos os registros, mais lento)">
            <Database size={14} /> Completa
          </button>
        )}
      </div>
    </div>
  );
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function ReceivableFilterBar({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, startDate, setStartDate, endDate, setEndDate, contaFilter, setContaFilter, onSync, onFullSync, isSyncing, financialAccounts, onClear }: any) {
  const currentMonth = useMemo(() => {
    if (startDate) {
      const d = new Date(startDate + 'T00:00:00');
      return { month: d.getMonth(), year: d.getFullYear() };
    }
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  }, [startDate]);

  const setMonthPeriod = (month: number, year: number) => {
    const first = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const last = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setStartDate(first);
    setEndDate(last);
  };

  const navigateMonth = (dir: -1 | 1) => {
    let m = currentMonth.month + dir;
    let y = currentMonth.year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonthPeriod(m, y);
  };

  const handleContaChange = (val: string) => {
    setContaFilter(val);
  };

  const hasFilters = searchTerm || statusFilter !== 'all' || startDate || endDate || contaFilter;

  return (
    <div className="space-y-3">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-end gap-4">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 whitespace-nowrap">Vencimento</span>
          <button onClick={() => navigateMonth(-1)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setMonthPeriod(currentMonth.month, currentMonth.year)}
            className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-black min-w-[140px] text-center whitespace-nowrap"
          >
            {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
          </button>
          <button onClick={() => navigateMonth(1)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Pesquisar no período selecionado..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <select value={contaFilter} onChange={e => handleContaChange(e.target.value)} className="bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]">
          <option value="">Todas as Contas</option>
          {(financialAccounts || []).map((a: any) => (
            <option key={a.id} value={a.nome}>{a.nome}</option>
          ))}
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">Todos os Status</option>
          <option value="Pago">Pago / Liquidado</option>
          <option value="Pendente">Pendente</option>
          <option value="Atrasado">Atrasado / Vencido</option>
        </select>

        <div className="flex items-center gap-1">
          <button onClick={onSync} disabled={isSyncing} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-l-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all whitespace-nowrap" title="Sync rápido (apenas alterações recentes)">
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync Rápido
          </button>
          <button onClick={onFullSync} disabled={isSyncing} className="bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white px-3 py-2.5 rounded-r-xl font-black text-[10px] uppercase flex items-center gap-1 transition-all whitespace-nowrap border-l border-slate-500" title="Sync completa (todos os registros, mais lento)">
            <Database size={14} /> Completa
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-1">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none" />
          <span className="text-slate-300 text-xs">até</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none" />
        </div>
        {hasFilters && (
          <button onClick={onClear} className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors">
            <XCircle size={14} /> Limpar filtros
          </button>
        )}
      </div>
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

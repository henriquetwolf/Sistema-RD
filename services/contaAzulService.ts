import { createClient } from '@supabase/supabase-js';
import type {
  ContaAzulAuthStatus,
  ContaAzulAccountStatus,
  ContaAzulAccount,
  ContaAzulReceivable,
  ContaAzulPayable,
  ContaAzulCategory,
  ContaAzulCostCenter,
  ContaAzulFinancialAccount,
  ContaAzulSyncLog,
  ContaAzulSyncResult,
  ContaAzulCreateReceivablePayload,
  ContaAzulCreatePayablePayload,
  ContaAzulUpdateInstallmentPayload,
  ContaAzulCreateSalePayload,
} from '../types';

const SUPABASE_URL = (import.meta as any).env?.VITE_APP_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_APP_SUPABASE_ANON_KEY || '';
const EDGE_BASE = (import.meta as any).env?.VITE_CONTA_AZUL_EDGE_URL || `${SUPABASE_URL}/functions/v1`;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY }
    : { apikey: SUPABASE_KEY };
}

async function edgeFetch(fn: string, path: string, options: RequestInit = {}): Promise<any> {
  const headers = await getAuthHeader();
  const url = `${EDGE_BASE}/${fn}/${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(options.headers as Record<string, string> || {}),
      },
    });

    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Resposta inesperada (${res.status}): ${text.substring(0, 200)}`);
    }

    if (!res.ok) {
      throw new Error(json.error || `Edge function error: ${res.status}`);
    }
    return json;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Timeout: a sincronização demorou mais de 5 minutos. Tente sincronizar cada tipo individualmente.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper to inject account_id into POST body
function withAccountId(body: Record<string, any>, accountId?: string): string {
  const payload = accountId ? { ...body, account_id: accountId } : body;
  return JSON.stringify(payload);
}

// ── Account Management ───────────────────────────────────────

async function getAccounts(): Promise<ContaAzulAccount[]> {
  return edgeFetch('conta-azul-auth', 'accounts');
}

async function createAccount(data: { nome: string; cnpj: string; client_id: string; client_secret: string; redirect_uri: string }): Promise<ContaAzulAccount> {
  return edgeFetch('conta-azul-auth', 'create-account', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function updateAccount(id: string, data: Partial<{ nome: string; cnpj: string; client_id: string; client_secret: string; redirect_uri: string; ativo: boolean }>): Promise<void> {
  await edgeFetch('conta-azul-auth', 'update-account', {
    method: 'POST',
    body: JSON.stringify({ id, ...data }),
  });
}

async function deleteAccount(id: string): Promise<void> {
  await edgeFetch('conta-azul-auth', 'delete-account', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

// ── Auth ────────────────────────────────────────────────────

async function getAuthStatus(accountId?: string): Promise<ContaAzulAuthStatus> {
  const path = accountId ? `status?account_id=${accountId}` : 'status';
  return edgeFetch('conta-azul-auth', path);
}

async function getAuthStatusAll(): Promise<ContaAzulAccountStatus[]> {
  return edgeFetch('conta-azul-auth', 'status');
}

function startOAuthFlow(accountId: string): void {
  edgeFetch('conta-azul-auth', `authorize?account_id=${accountId}`).then((data) => {
    if (data.authorize_url) {
      window.open(data.authorize_url, 'contaazul_auth', 'width=600,height=700');
    } else if (data.error) {
      alert(`Erro ao iniciar conexão: ${data.error}`);
    }
  }).catch((err) => {
    alert(`Erro ao chamar Edge Function: ${err.message}`);
  });
}

async function disconnect(accountId: string): Promise<void> {
  await edgeFetch('conta-azul-auth', 'disconnect', {
    method: 'POST',
    body: JSON.stringify({ account_id: accountId }),
  });
}

async function refreshToken(accountId: string): Promise<void> {
  await edgeFetch('conta-azul-auth', 'refresh', {
    method: 'POST',
    body: JSON.stringify({ account_id: accountId }),
  });
}

// ── Sync ────────────────────────────────────────────────────

type SyncType = 'all' | 'receivables' | 'payables' | 'categories' | 'cost-centers' | 'accounts';

const SYNC_YEARS_BACK = 10;
const SYNC_YEARS_FORWARD = 5;

function generateQuarterlyRanges(): { data_vencimento_de: string; data_vencimento_ate: string }[] {
  const ranges: { data_vencimento_de: string; data_vencimento_ate: string }[] = [];
  const now = new Date();
  const start = new Date(now);
  start.setFullYear(start.getFullYear() - SYNC_YEARS_BACK);
  const end = new Date(now);
  end.setFullYear(end.getFullYear() + SYNC_YEARS_FORWARD);

  const cursor = new Date(start);
  while (cursor < end) {
    const rangeStart = cursor.toISOString().split('T')[0];
    cursor.setMonth(cursor.getMonth() + 3);
    const rangeEnd = (cursor < end ? cursor : end).toISOString().split('T')[0];
    ranges.push({ data_vencimento_de: rangeStart, data_vencimento_ate: rangeEnd });
  }
  return ranges;
}

async function triggerSync(type: SyncType, accountId: string, body?: Record<string, any>): Promise<ContaAzulSyncResult> {
  return edgeFetch('conta-azul-sync', type, {
    method: 'POST',
    body: withAccountId(body || {}, accountId),
  });
}

async function triggerSyncChunked(
  type: 'receivables' | 'payables',
  accountId: string,
  onProgress?: (chunk: number, total: number) => void,
): Promise<ContaAzulSyncResult> {
  const ranges = generateQuarterlyRanges();
  let totalSynced = 0;
  for (let i = 0; i < ranges.length; i++) {
    onProgress?.(i + 1, ranges.length);
    try {
      const result = await triggerSync(type, accountId, ranges[i]);
      totalSynced += result.sincronizados ?? 0;
    } catch (e: any) {
      console.warn(`Chunk ${i + 1}/${ranges.length} (${type}) error:`, e.message);
    }
  }
  return { success: true, tipo: type, sincronizados: totalSynced };
}

async function triggerSyncIncremental(
  type: 'receivables' | 'payables',
  accountId: string,
): Promise<ContaAzulSyncResult> {
  return triggerSync(type, accountId, { incremental: true });
}

async function getSyncLogs(accountId?: string, limit = 20): Promise<ContaAzulSyncLog[]> {
  let query = supabase
    .from('conta_azul_sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ── Read from Supabase (mirrored data) ─────────────────────

interface ReceivableFilters {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  categoria?: string;
  centroCusto?: string;
  contaFinanceira?: string;
  limit?: number;
  offset?: number;
  accountId?: string;
}

async function getReceivables(filters: ReceivableFilters = {}): Promise<{ data: ContaAzulReceivable[]; count: number }> {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let query = supabase
    .from('conta_azul_contas_receber')
    .select('*', { count: 'exact' })
    .neq('status', 'EXCLUIDO')
    .order('data_vencimento', { ascending: false });

  if (filters.accountId) {
    query = query.eq('account_id', filters.accountId);
  }

  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'Pago') {
      query = query.or('status.ilike.%Liquidado%,status.ilike.%Quitado%');
    } else if (filters.status === 'Pendente') {
      query = query
        .not('status', 'ilike', '%Liquidado%')
        .not('status', 'ilike', '%Quitado%')
        .not('status', 'ilike', '%Perdido%')
        .gte('data_vencimento', today);
    } else if (filters.status === 'Atrasado') {
      query = query
        .not('status', 'ilike', '%Liquidado%')
        .not('status', 'ilike', '%Quitado%')
        .not('status', 'ilike', '%Perdido%')
        .lt('data_vencimento', today);
    } else {
      query = query.ilike('status', `%${filters.status}%`);
    }
  }
  if (filters.startDate) {
    query = query.gte('data_vencimento', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('data_vencimento', filters.endDate);
  }
  if (filters.search) {
    query = query.or(`contato_nome.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%,numero_documento.ilike.%${filters.search}%`);
  }
  if (filters.categoria) {
    query = query.ilike('categoria_nome', `%${filters.categoria}%`);
  }
  if (filters.centroCusto) {
    query = query.ilike('centro_custo_nome', `%${filters.centroCusto}%`);
  }
  if (filters.contaFinanceira) {
    query = query.ilike('conta_financeira_nome', `%${filters.contaFinanceira}%`);
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], count: count || 0 };
}

async function getPayables(filters: ReceivableFilters = {}): Promise<{ data: ContaAzulPayable[]; count: number }> {
  let query = supabase
    .from('conta_azul_contas_pagar')
    .select('*', { count: 'exact' })
    .neq('status', 'EXCLUIDO')
    .order('data_vencimento', { ascending: false });

  if (filters.accountId) {
    query = query.eq('account_id', filters.accountId);
  }

  if (filters.status && filters.status !== 'all') {
    query = query.ilike('status', `%${filters.status}%`);
  }
  if (filters.startDate) {
    query = query.gte('data_vencimento', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('data_vencimento', filters.endDate);
  }
  if (filters.search) {
    query = query.or(`fornecedor_nome.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%,numero_documento.ilike.%${filters.search}%`);
  }
  if (filters.contaFinanceira) {
    query = query.ilike('conta_financeira_nome', `%${filters.contaFinanceira}%`);
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], count: count || 0 };
}

async function getCategories(accountId?: string): Promise<ContaAzulCategory[]> {
  let query = supabase
    .from('conta_azul_categorias')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getCostCenters(accountId?: string): Promise<ContaAzulCostCenter[]> {
  let query = supabase
    .from('conta_azul_centros_custo')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function createCostCenter(nome: string, accountId: string): Promise<{ id_conta_azul: string; nome: string }> {
  return edgeFetch('conta-azul-write', 'create-cost-center', {
    method: 'POST',
    body: withAccountId({ nome }, accountId),
  });
}

async function getFinancialAccounts(accountId?: string): Promise<ContaAzulFinancialAccount[]> {
  let query = supabase
    .from('conta_azul_contas_financeiras')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ── Receivable Stats (for Billing tab) ──────────────────────

export interface ReceivableStats {
  totalOriginal: number;
  totalRecebido: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
}

interface ReceivableSummary {
  vencidos: number;
  vencem_hoje: number;
  a_vencer: number;
  recebidos: number;
  total_periodo: number;
}

async function getReceivableSummary(filters: Omit<ReceivableFilters, 'limit' | 'offset'> = {}): Promise<ReceivableSummary> {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const PAGE_SIZE = 1000;
  let allRecords: any[] = [];
  let page = 0;
  while (true) {
    let query = supabase
      .from('conta_azul_contas_receber')
      .select('valor, valor_pago, status, data_vencimento')
      .neq('status', 'EXCLUIDO')
      .order('id')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filters.accountId) query = query.eq('account_id', filters.accountId);
    if (filters.startDate) query = query.gte('data_vencimento', filters.startDate);
    if (filters.endDate) query = query.lte('data_vencimento', filters.endDate);
    if (filters.search) {
      query = query.or(`contato_nome.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%,numero_documento.ilike.%${filters.search}%`);
    }
    if (filters.categoria) query = query.ilike('categoria_nome', `%${filters.categoria}%`);
    if (filters.centroCusto) query = query.ilike('centro_custo_nome', `%${filters.centroCusto}%`);
    if (filters.contaFinanceira) query = query.ilike('conta_financeira_nome', `%${filters.contaFinanceira}%`);

    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    allRecords.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    page++;
  }

  let vencidos = 0, vencem_hoje = 0, a_vencer = 0, recebidos = 0, total_periodo = 0;

  for (const r of allRecords) {
    const valor = Number(r.valor || 0);
    const valorPago = Number(r.valor_pago || 0);
    const st = (r.status || '').toLowerCase();
    const isLiquidado = st.includes('liquidado') || st.includes('recebido') || st.includes('pago') || st.includes('quitado');
    const restante = valor - valorPago;

    total_periodo += valor;
    recebidos += valorPago;

    if (!isLiquidado && restante > 0) {
      if (r.data_vencimento && r.data_vencimento < today) {
        vencidos += restante;
      } else if (r.data_vencimento === today) {
        vencem_hoje += restante;
      } else {
        a_vencer += restante;
      }
    }
  }

  return { vencidos, vencem_hoje, a_vencer, recebidos, total_periodo };
}

type PayableSummary = ReceivableSummary;

async function getPayableSummary(filters: Omit<ReceivableFilters, 'limit' | 'offset'> = {}): Promise<PayableSummary> {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const PAGE_SIZE = 1000;
  let allRecords: any[] = [];
  let page = 0;
  while (true) {
    let query = supabase
      .from('conta_azul_contas_pagar')
      .select('valor, valor_pago, status, data_vencimento')
      .neq('status', 'EXCLUIDO')
      .order('id')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filters.accountId) query = query.eq('account_id', filters.accountId);
    if (filters.startDate) query = query.gte('data_vencimento', filters.startDate);
    if (filters.endDate) query = query.lte('data_vencimento', filters.endDate);
    if (filters.search) {
      query = query.or(`fornecedor_nome.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%,numero_documento.ilike.%${filters.search}%`);
    }
    if (filters.categoria) query = query.ilike('categoria_nome', `%${filters.categoria}%`);
    if (filters.centroCusto) query = query.ilike('centro_custo_nome', `%${filters.centroCusto}%`);
    if (filters.contaFinanceira) query = query.ilike('conta_financeira_nome', `%${filters.contaFinanceira}%`);

    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    allRecords.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    page++;
  }

  const records = allRecords;

  let vencidos = 0, vencem_hoje = 0, a_vencer = 0, recebidos = 0, total_periodo = 0;

  for (const r of records) {
    const valor = Number(r.valor || 0);
    const valorPago = Number(r.valor_pago || 0);
    const st = (r.status || '').toLowerCase();
    const isLiquidado = st.includes('liquidado') || st.includes('recebido') || st.includes('pago') || st.includes('quitado');
    const restante = valor - valorPago;

    total_periodo += valor;
    recebidos += valorPago;

    if (!isLiquidado && restante > 0) {
      if (r.data_vencimento && r.data_vencimento < today) {
        vencidos += restante;
      } else if (r.data_vencimento === today) {
        vencem_hoje += restante;
      } else {
        a_vencer += restante;
      }
    }
  }

  return { vencidos, vencem_hoje, a_vencer, recebidos, total_periodo };
}

async function getReceivableStats(accountId?: string): Promise<ReceivableStats> {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const PAGE_SIZE = 1000;
  let records: any[] = [];
  let page = 0;
  while (true) {
    let query = supabase
      .from('conta_azul_contas_receber')
      .select('valor, valor_pago, status, data_vencimento')
      .neq('status', 'EXCLUIDO')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (accountId) query = query.eq('account_id', accountId);
    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    records.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    page++;
  }

  let totalOriginal = 0, totalRecebido = 0, paidCount = 0, pendingCount = 0, overdueCount = 0;

  for (const r of records) {
    const valor = Number(r.valor || 0);
    const valorPago = Number(r.valor_pago || 0);
    totalOriginal += valor;
    totalRecebido += valorPago;

    const st = (r.status || '').toLowerCase();
    const isLiquidado = st.includes('liquidado') || st.includes('recebido') || st.includes('pago') || st.includes('quitado');
    if (isLiquidado || (valor > 0 && valorPago >= valor)) {
      paidCount++;
    } else if (r.data_vencimento && r.data_vencimento < today) {
      overdueCount++;
    } else {
      pendingCount++;
    }
  }

  return { totalOriginal, totalRecebido, paidCount, pendingCount, overdueCount };
}

// ── Aggregated Stats ────────────────────────────────────────

interface FinancialStats {
  totalReceber: number;
  totalReceberPago: number;
  totalReceberPendente: number;
  totalPagar: number;
  totalPagarPago: number;
  totalPagarPendente: number;
  saldoContas: number;
  countReceber: number;
  countPagar: number;
}

async function getFinancialStats(accountId?: string): Promise<FinancialStats> {
  const PAGE_SIZE = 1000;

  async function fetchAll(table: string, select: string, extraFilter?: (q: any) => any) {
    let all: any[] = [];
    let page = 0;
    while (true) {
      let q = supabase.from(table).select(select).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (accountId) q = q.eq('account_id', accountId);
      if (extraFilter) q = extraFilter(q);
      const { data, error } = await q;
      if (error) throw error;
      const rows = data || [];
      all.push(...rows);
      if (rows.length < PAGE_SIZE) break;
      page++;
    }
    return all;
  }

  const excludeDeleted = (q: any) => q.neq('status', 'EXCLUIDO');
  const [receberData, pagarData, contasData] = await Promise.all([
    fetchAll('conta_azul_contas_receber', 'valor, valor_pago, status', excludeDeleted),
    fetchAll('conta_azul_contas_pagar', 'valor, valor_pago, status', excludeDeleted),
    fetchAll('conta_azul_contas_financeiras', 'saldo_atual', (q: any) => q.eq('ativo', true)),
  ]);

  const totalReceber = receberData.reduce((s: number, r: any) => s + Number(r.valor || 0), 0);
  const totalReceberPago = receberData.reduce((s: number, r: any) => s + Number(r.valor_pago || 0), 0);
  const totalPagar = pagarData.reduce((s: number, r: any) => s + Number(r.valor || 0), 0);
  const totalPagarPago = pagarData.reduce((s: number, r: any) => s + Number(r.valor_pago || 0), 0);
  const saldoContas = contasData.reduce((s: number, c: any) => s + Number(c.saldo_atual || 0), 0);

  return {
    totalReceber,
    totalReceberPago,
    totalReceberPendente: totalReceber - totalReceberPago,
    totalPagar,
    totalPagarPago,
    totalPagarPendente: totalPagar - totalPagarPago,
    saldoContas,
    countReceber: receberData.length,
    countPagar: pagarData.length,
  };
}

// ── Write (via Edge Functions) ──────────────────────────────

async function createReceivable(payload: ContaAzulCreateReceivablePayload, accountId: string): Promise<any> {
  return edgeFetch('conta-azul-write', 'receivable', {
    method: 'POST',
    body: withAccountId(payload, accountId),
  });
}

async function createPayable(payload: ContaAzulCreatePayablePayload, accountId: string): Promise<any> {
  return edgeFetch('conta-azul-write', 'payable', {
    method: 'POST',
    body: withAccountId(payload, accountId),
  });
}

async function updateInstallment(payload: ContaAzulUpdateInstallmentPayload, accountId: string): Promise<any> {
  return edgeFetch('conta-azul-write', 'installment', {
    method: 'POST',
    body: withAccountId(payload, accountId),
  });
}

async function getProducts(accountId: string): Promise<{ id: string; nome: string; tipo: string; valor: number }[]> {
  try {
    const result = await edgeFetch('conta-azul-write', 'products', {
      method: 'POST',
      body: withAccountId({}, accountId),
    });
    if (result?._meta) {
      console.log(`[ContaAzul] Produtos: ${result._meta.totalProd}, Serviços: ${result._meta.totalSvc}` +
        (result._meta.errors ? ` | ERROS: ${result._meta.errors.join('; ')}` : ''));
    }
    return result?.items || [];
  } catch {
    return [];
  }
}

async function createSale(payload: ContaAzulCreateSalePayload, accountId: string): Promise<any> {
  return edgeFetch('conta-azul-write', 'sale', {
    method: 'POST',
    body: withAccountId(payload, accountId),
  });
}

// ── Export ───────────────────────────────────────────────────

export const contaAzulService = {
  // Account management
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  // Auth
  getAuthStatus,
  getAuthStatusAll,
  startOAuthFlow,
  disconnect,
  refreshToken,
  // Sync
  triggerSync,
  triggerSyncChunked,
  triggerSyncIncremental,
  getSyncLogs,
  // Read
  getReceivables,
  getReceivableStats,
  getReceivableSummary,
  getPayableSummary,
  getPayables,
  getCategories,
  getCostCenters,
  createCostCenter,
  getFinancialAccounts,
  getFinancialStats,
  // Write
  createReceivable,
  createPayable,
  updateInstallment,
  getProducts,
  createSale,
};

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
    }
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

function generateQuarterlyRanges(): { data_vencimento_de: string; data_vencimento_ate: string }[] {
  const ranges: { data_vencimento_de: string; data_vencimento_ate: string }[] = [];
  const now = new Date();
  const start = new Date(now);
  start.setFullYear(start.getFullYear() - 1);
  const end = new Date(now);
  end.setFullYear(end.getFullYear() + 1);

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
  limit?: number;
  offset?: number;
  accountId?: string;
}

async function getReceivables(filters: ReceivableFilters = {}): Promise<{ data: ContaAzulReceivable[]; count: number }> {
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('conta_azul_contas_receber')
    .select('*', { count: 'exact' })
    .order('data_vencimento', { ascending: false });

  if (filters.accountId) {
    query = query.eq('account_id', filters.accountId);
  }

  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'Pago') {
      query = query.ilike('status', '%Liquidado%');
    } else if (filters.status === 'Pendente') {
      query = query.not('status', 'ilike', '%Liquidado%').gte('data_vencimento', today);
    } else if (filters.status === 'Atrasado') {
      query = query.not('status', 'ilike', '%Liquidado%').lt('data_vencimento', today);
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

async function getReceivableStats(accountId?: string): Promise<ReceivableStats> {
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('conta_azul_contas_receber')
    .select('valor, valor_pago, status, data_vencimento')
    .limit(50000);

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data, error } = await query;
  if (error) throw error;
  const records = data || [];

  let totalOriginal = 0, totalRecebido = 0, paidCount = 0, pendingCount = 0, overdueCount = 0;

  for (const r of records) {
    const valor = Number(r.valor || 0);
    const valorPago = Number(r.valor_pago || 0);
    totalOriginal += valor;
    totalRecebido += valorPago;

    const isLiquidado = (r.status || '').toLowerCase().includes('liquidado');
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
  let receberQ = supabase.from('conta_azul_contas_receber').select('valor, valor_pago, status').limit(10000);
  let pagarQ = supabase.from('conta_azul_contas_pagar').select('valor, valor_pago, status').limit(10000);
  let contasQ = supabase.from('conta_azul_contas_financeiras').select('saldo_atual').eq('ativo', true).limit(10000);

  if (accountId) {
    receberQ = receberQ.eq('account_id', accountId);
    pagarQ = pagarQ.eq('account_id', accountId);
    contasQ = contasQ.eq('account_id', accountId);
  }

  const [receber, pagar, contas] = await Promise.all([receberQ, pagarQ, contasQ]);

  const receberData = receber.data || [];
  const pagarData = pagar.data || [];
  const contasData = contas.data || [];

  const totalReceber = receberData.reduce((s, r) => s + Number(r.valor || 0), 0);
  const totalReceberPago = receberData.reduce((s, r) => s + Number(r.valor_pago || 0), 0);
  const totalPagar = pagarData.reduce((s, r) => s + Number(r.valor || 0), 0);
  const totalPagarPago = pagarData.reduce((s, r) => s + Number(r.valor_pago || 0), 0);
  const saldoContas = contasData.reduce((s, c) => s + Number(c.saldo_atual || 0), 0);

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
  getSyncLogs,
  // Read
  getReceivables,
  getReceivableStats,
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

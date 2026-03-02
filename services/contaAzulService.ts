import { createClient } from '@supabase/supabase-js';
import type {
  ContaAzulAuthStatus,
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
  const timeoutId = setTimeout(() => controller.abort(), 120000);

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
      throw new Error('Timeout: a sincronização demorou mais de 2 minutos. Tente sincronizar cada tipo individualmente.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Auth ────────────────────────────────────────────────────

async function getAuthStatus(): Promise<ContaAzulAuthStatus> {
  return edgeFetch('conta-azul-auth', 'status');
}

function startOAuthFlow(): void {
  edgeFetch('conta-azul-auth', 'authorize').then((data) => {
    if (data.authorize_url) {
      window.open(data.authorize_url, 'contaazul_auth', 'width=600,height=700');
    }
  });
}

async function disconnect(): Promise<void> {
  await edgeFetch('conta-azul-auth', 'disconnect');
}

async function refreshToken(): Promise<void> {
  await edgeFetch('conta-azul-auth', 'refresh', { method: 'POST' });
}

// ── Sync ────────────────────────────────────────────────────

type SyncType = 'all' | 'receivables' | 'payables' | 'categories' | 'cost-centers' | 'accounts';

async function triggerSync(type: SyncType, body?: Record<string, any>): Promise<ContaAzulSyncResult> {
  return edgeFetch('conta-azul-sync', type, {
    method: 'POST',
    body: JSON.stringify(body || {}),
  });
}

async function getSyncLogs(limit = 20): Promise<ContaAzulSyncLog[]> {
  const { data, error } = await supabase
    .from('conta_azul_sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

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
}

async function getReceivables(filters: ReceivableFilters = {}): Promise<{ data: ContaAzulReceivable[]; count: number }> {
  let query = supabase
    .from('conta_azul_contas_receber')
    .select('*', { count: 'exact' })
    .order('data_vencimento', { ascending: false });

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

async function getCategories(): Promise<ContaAzulCategory[]> {
  const { data, error } = await supabase
    .from('conta_azul_categorias')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  if (error) throw error;
  return data || [];
}

async function getCostCenters(): Promise<ContaAzulCostCenter[]> {
  const { data, error } = await supabase
    .from('conta_azul_centros_custo')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  if (error) throw error;
  return data || [];
}

async function getFinancialAccounts(): Promise<ContaAzulFinancialAccount[]> {
  const { data, error } = await supabase
    .from('conta_azul_contas_financeiras')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  if (error) throw error;
  return data || [];
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

async function getFinancialStats(): Promise<FinancialStats> {
  const [receber, pagar, contas] = await Promise.all([
    supabase.from('conta_azul_contas_receber').select('valor, valor_pago, status'),
    supabase.from('conta_azul_contas_pagar').select('valor, valor_pago, status'),
    supabase.from('conta_azul_contas_financeiras').select('saldo_atual').eq('ativo', true),
  ]);

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

async function createReceivable(payload: ContaAzulCreateReceivablePayload): Promise<any> {
  return edgeFetch('conta-azul-write', 'receivable', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function createPayable(payload: ContaAzulCreatePayablePayload): Promise<any> {
  return edgeFetch('conta-azul-write', 'payable', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function updateInstallment(payload: ContaAzulUpdateInstallmentPayload): Promise<any> {
  return edgeFetch('conta-azul-write', 'installment', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Export ───────────────────────────────────────────────────

export const contaAzulService = {
  getAuthStatus,
  startOAuthFlow,
  disconnect,
  refreshToken,
  triggerSync,
  getSyncLogs,
  getReceivables,
  getPayables,
  getCategories,
  getCostCenters,
  getFinancialAccounts,
  getFinancialStats,
  createReceivable,
  createPayable,
  updateInstallment,
};

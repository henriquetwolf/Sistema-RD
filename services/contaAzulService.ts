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
const SYNC_CONCURRENCY = 5;
const SESSION_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 min

type DateRange = { data_vencimento_de: string; data_vencimento_ate: string };

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

/**
 * Generates date ranges with variable granularity:
 *   >3 years back   -> annual   (~7 ranges)
 *   1-3 years back  -> quarterly (~8 ranges)
 *   last year + future -> monthly (~12 + 60 = ~72, but we use quarterly for >1yr future)
 * Total: ~35-50 ranges instead of ~180
 */
function generateSmartRanges(): DateRange[] {
  const ranges: DateRange[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const absStart = new Date(now);
  absStart.setFullYear(absStart.getFullYear() - SYNC_YEARS_BACK);
  const absEnd = new Date(now);
  absEnd.setFullYear(absEnd.getFullYear() + SYNC_YEARS_FORWARD);

  const threeYearsAgo = new Date(now);
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAhead = new Date(now);
  oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);

  function pushRanges(from: Date, to: Date, stepMonths: number) {
    const cursor = new Date(from);
    while (cursor < to) {
      const rangeStart = fmtDate(cursor);
      const next = addMonths(cursor, stepMonths);
      const capped = next < to ? next : to;
      ranges.push({ data_vencimento_de: rangeStart, data_vencimento_ate: fmtDate(capped) });
      cursor.setTime(capped.getTime());
    }
  }

  pushRanges(absStart, threeYearsAgo, 12);
  pushRanges(threeYearsAgo, oneYearAgo, 3);
  pushRanges(oneYearAgo, oneYearAhead, 1);
  pushRanges(oneYearAhead, absEnd, 3);

  return ranges;
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      results[idx] = await tasks[idx]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

let _sessionKeepAliveTimer: ReturnType<typeof setInterval> | null = null;

function startSessionKeepAlive() {
  stopSessionKeepAlive();
  supabase.auth.refreshSession();
  _sessionKeepAliveTimer = setInterval(() => {
    supabase.auth.refreshSession().catch((e) =>
      console.warn('[SessionKeepAlive] refresh failed:', e)
    );
  }, SESSION_REFRESH_INTERVAL_MS);
}

function stopSessionKeepAlive() {
  if (_sessionKeepAliveTimer) {
    clearInterval(_sessionKeepAliveTimer);
    _sessionKeepAliveTimer = null;
  }
}

async function triggerSync(type: SyncType, accountId: string, body?: Record<string, any>): Promise<ContaAzulSyncResult> {
  return edgeFetch('conta-azul-sync', type, {
    method: 'POST',
    body: withAccountId(body || {}, accountId),
  });
}

// ── Sync chunks persistence (resume capability) ─────────────

interface SyncChunkRow {
  id: string;
  session_id: string;
  sync_type: string;
  account_id: string;
  range_start: string;
  range_end: string;
  status: string;
  records_synced: number;
  error_message: string | null;
}

async function createSyncSession(
  accountId: string,
  syncType: string,
  ranges: DateRange[],
): Promise<{ sessionId: string; pendingRanges: DateRange[] }> {
  const sessionId = crypto.randomUUID();

  const rows = ranges.map((r) => ({
    session_id: sessionId,
    account_id: accountId,
    sync_type: syncType,
    range_start: r.data_vencimento_de,
    range_end: r.data_vencimento_ate,
    status: 'pending',
    records_synced: 0,
  }));

  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    await supabase.from('conta_azul_sync_chunks').insert(rows.slice(i, i + BATCH));
  }

  return { sessionId, pendingRanges: ranges };
}

async function markChunkCompleted(sessionId: string, range: DateRange, recordsSynced: number) {
  await supabase
    .from('conta_azul_sync_chunks')
    .update({ status: 'completed', records_synced: recordsSynced, completed_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('range_start', range.data_vencimento_de)
    .eq('range_end', range.data_vencimento_ate);
}

async function markChunkError(sessionId: string, range: DateRange, errorMsg: string) {
  await supabase
    .from('conta_azul_sync_chunks')
    .update({ status: 'error', error_message: errorMsg, completed_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('range_start', range.data_vencimento_de)
    .eq('range_end', range.data_vencimento_ate);
}

async function getPendingSession(
  accountId: string,
  syncType: string,
): Promise<{ sessionId: string; pendingRanges: DateRange[]; totalRanges: number; completedRanges: number } | null> {
  const { data: sessions } = await supabase
    .from('conta_azul_sync_chunks')
    .select('session_id')
    .eq('account_id', accountId)
    .eq('sync_type', syncType)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!sessions || sessions.length === 0) return null;
  const sessionId = sessions[0].session_id;

  const { data: allChunks } = await supabase
    .from('conta_azul_sync_chunks')
    .select('range_start, range_end, status')
    .eq('session_id', sessionId)
    .order('range_start', { ascending: true });

  if (!allChunks || allChunks.length === 0) return null;

  const pending = allChunks
    .filter((c: any) => c.status === 'pending')
    .map((c: any) => ({ data_vencimento_de: c.range_start, data_vencimento_ate: c.range_end }));

  if (pending.length === 0) return null;

  return {
    sessionId,
    pendingRanges: pending,
    totalRanges: allChunks.length,
    completedRanges: allChunks.filter((c: any) => c.status === 'completed').length,
  };
}

async function cleanOldSyncSessions() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('conta_azul_sync_chunks')
    .delete()
    .lt('created_at', cutoff);
}

async function triggerSyncChunked(
  type: 'receivables' | 'payables',
  accountId: string,
  onProgress?: (chunk: number, total: number, info?: string) => void,
  resumeSessionId?: string,
): Promise<ContaAzulSyncResult & { errors?: string[]; expectedTotal?: number; sessionId?: string }> {
  startSessionKeepAlive();

  try {
    cleanOldSyncSessions().catch(() => {});

    let ranges: DateRange[];
    let sessionId: string;
    let totalRanges: number;
    let completedOffset = 0;

    if (resumeSessionId) {
      const pending = await getPendingSession(accountId, type);
      if (pending && pending.sessionId === resumeSessionId) {
        sessionId = pending.sessionId;
        ranges = pending.pendingRanges;
        totalRanges = pending.totalRanges;
        completedOffset = pending.completedRanges;
        console.log(`[SyncChunked] Resuming session ${sessionId}: ${ranges.length} pending of ${totalRanges}`);
      } else {
        ranges = generateSmartRanges();
        const session = await createSyncSession(accountId, type, ranges);
        sessionId = session.sessionId;
        totalRanges = ranges.length;
      }
    } else {
      ranges = generateSmartRanges();
      const session = await createSyncSession(accountId, type, ranges);
      sessionId = session.sessionId;
      totalRanges = ranges.length;
    }

    let totalSynced = 0;
    let totalExpected = 0;
    const errors: string[] = [];
    const MAX_RETRIES = 2;
    let completedCount = completedOffset;

    const tasks = ranges.map((range, _i) => async () => {
      const label = `${range.data_vencimento_de} → ${range.data_vencimento_ate}`;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const result = await triggerSync(type, accountId, range);
          const count = result.sincronizados ?? 0;
          const expected = (result as any).esperados ?? 0;
          totalSynced += count;
          totalExpected += expected;
          completedCount++;
          onProgress?.(completedCount, totalRanges, label);
          if (count > 0) {
            console.log(`[SyncChunked] ${type} (${label}): ${count} registros`);
          }
          await markChunkCompleted(sessionId, range, count);
          return;
        } catch (e: any) {
          const isRateLimit = e.message?.includes('429') || e.message?.includes('rate');
          const delay = isRateLimit ? 5000 : 2000 * (attempt + 1);
          if (attempt < MAX_RETRIES) {
            console.warn(`[SyncChunked] ${type} (${label}) attempt ${attempt + 1} failed, retrying in ${delay}ms: ${e.message}`);
            await new Promise(r => setTimeout(r, delay));
          } else {
            const msg = `(${label}): ${e.message}`;
            errors.push(msg);
            console.error(`[SyncChunked] ${type} FAILED:`, msg);
            await markChunkError(sessionId, range, e.message);
          }
        }
      }
    });

    await runWithConcurrency(tasks, SYNC_CONCURRENCY);

    if (errors.length > 0) {
      console.warn(`[SyncChunked] ${type}: ${errors.length} chunk(s) falharam. Total sincronizado: ${totalSynced}`);
    }
    return {
      success: true,
      tipo: type,
      sincronizados: totalSynced,
      errors: errors.length > 0 ? errors : undefined,
      expectedTotal: totalExpected > 0 ? totalExpected : undefined,
      sessionId,
    };
  } finally {
    stopSessionKeepAlive();
  }
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
  // Exigir accountId para manter dados separados por conta Conta Azul (evitar mistura entre filiais/matriz).
  if (!filters.accountId) {
    return { data: [], count: 0 };
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let query = supabase
    .from('conta_azul_contas_receber')
    .select('*', { count: 'exact' })
    .order('data_vencimento', { ascending: false })
    .eq('account_id', filters.accountId);

  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'Pago') {
      query = query
        .or('status.ilike.%Liquidado%,status.ilike.%Quitado%,status.ilike.%Pago%,status.ilike.%Paid%,status.ilike.%Recebido%,status.ilike.%Settled%')
        .not('status', 'ilike', '%Parcial%');
    } else if (filters.status === 'Pendente') {
      query = query
        .not('status', 'ilike', '%Liquidado%')
        .not('status', 'ilike', '%Quitado%')
        .not('status', 'ilike', '%Paid%')
        .not('status', 'ilike', '%Settled%')
        .not('status', 'ilike', '%Perdido%')
        .not('status', 'ilike', '%Desconsiderado%')
        .not('status', 'ilike', '%Renegociado%')
        .or('status.not.ilike.%Recebido%,status.ilike.%Parcial%')
        .or('status.not.ilike.%Pago%,status.ilike.%Parcial%')
        .gte('data_vencimento', today);
    } else if (filters.status === 'Atrasado') {
      query = query
        .not('status', 'ilike', '%Liquidado%')
        .not('status', 'ilike', '%Quitado%')
        .not('status', 'ilike', '%Paid%')
        .not('status', 'ilike', '%Settled%')
        .not('status', 'ilike', '%Perdido%')
        .not('status', 'ilike', '%Desconsiderado%')
        .not('status', 'ilike', '%Renegociado%')
        .or('status.not.ilike.%Recebido%,status.ilike.%Parcial%')
        .or('status.not.ilike.%Pago%,status.ilike.%Parcial%')
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
    query = query.or(`contato_nome.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%,numero_documento.ilike.%${filters.search}%,contato_cpf.ilike.%${filters.search}%`);
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
  if (!filters.accountId) {
    return { data: [], count: 0 };
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let query = supabase
    .from('conta_azul_contas_pagar')
    .select('*', { count: 'exact' })
    .order('data_vencimento', { ascending: false })
    .eq('account_id', filters.accountId);

  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'Pago') {
      query = query
        .or('status.ilike.%Liquidado%,status.ilike.%Quitado%,status.ilike.%Pago%,status.ilike.%Paid%,status.ilike.%Recebido%,status.ilike.%Settled%')
        .not('status', 'ilike', '%Parcial%');
    } else if (filters.status === 'Pendente') {
      query = query
        .not('status', 'ilike', '%Liquidado%')
        .not('status', 'ilike', '%Quitado%')
        .not('status', 'ilike', '%Paid%')
        .not('status', 'ilike', '%Settled%')
        .not('status', 'ilike', '%Perdido%')
        .not('status', 'ilike', '%Desconsiderado%')
        .not('status', 'ilike', '%Renegociado%')
        .or('status.not.ilike.%Recebido%,status.ilike.%Parcial%')
        .or('status.not.ilike.%Pago%,status.ilike.%Parcial%')
        .gte('data_vencimento', today);
    } else if (filters.status === 'Atrasado') {
      query = query
        .not('status', 'ilike', '%Liquidado%')
        .not('status', 'ilike', '%Quitado%')
        .not('status', 'ilike', '%Paid%')
        .not('status', 'ilike', '%Settled%')
        .not('status', 'ilike', '%Perdido%')
        .not('status', 'ilike', '%Desconsiderado%')
        .not('status', 'ilike', '%Renegociado%')
        .or('status.not.ilike.%Recebido%,status.ilike.%Parcial%')
        .or('status.not.ilike.%Pago%,status.ilike.%Parcial%')
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
    query = query.or(`fornecedor_nome.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%,numero_documento.ilike.%${filters.search}%,contato_cpf.ilike.%${filters.search}%`);
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
  if (!filters.accountId) {
    return { vencidos: 0, vencem_hoje: 0, a_vencer: 0, recebidos: 0, total_periodo: 0 };
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const PAGE_SIZE = 1000;
  let allRecords: any[] = [];
  let page = 0;
  while (true) {
    let query = supabase
      .from('conta_azul_contas_receber')
      .select('valor, valor_pago, status, data_vencimento')
      .order('id')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .eq('account_id', filters.accountId);
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
    const dueDate = normalizeDate(r.data_vencimento);

    if (isExcludedStatus(st)) continue;

    total_periodo += valor;
    if (isPaidStatus(st)) {
      recebidos += valor;
    } else if (isPartiallyPaidStatus(st)) {
      recebidos += valorPago;
      const remaining = Math.max(0, valor - valorPago);
      if (dueDate && dueDate < today) {
        vencidos += remaining;
      } else if (dueDate === today) {
        vencem_hoje += remaining;
      } else {
        a_vencer += remaining;
      }
    } else if (dueDate && dueDate < today) {
      vencidos += valor;
    } else if (dueDate === today) {
      vencem_hoje += valor;
    } else {
      a_vencer += valor;
    }
  }
  return { vencidos, vencem_hoje, a_vencer, recebidos, total_periodo };
}

type PayableSummary = ReceivableSummary;

function isPaidStatus(st: string): boolean {
  if (isPartiallyPaidStatus(st)) return false;
  return st.includes('liquidado') || st.includes('quitado')
    || st.includes('pago') || st.includes('paid')
    || st.includes('recebido') || st.includes('settled');
}

function isPartiallyPaidStatus(st: string): boolean {
  return st.includes('parcial');
}

function isExcludedStatus(st: string): boolean {
  return st.includes('perdido') || st.includes('desconsiderado') || st.includes('renegociado');
}

function normalizeDate(d: string | null | undefined): string {
  if (!d) return '';
  return d.split('T')[0];
}

async function getPayableSummary(filters: Omit<ReceivableFilters, 'limit' | 'offset'> = {}): Promise<PayableSummary> {
  if (!filters.accountId) {
    return { vencidos: 0, vencem_hoje: 0, a_vencer: 0, recebidos: 0, total_periodo: 0 };
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const PAGE_SIZE = 1000;
  let allRecords: any[] = [];
  let page = 0;
  while (true) {
    let query = supabase
      .from('conta_azul_contas_pagar')
      .select('valor, valor_pago, status, data_vencimento')
      .order('id')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .eq('account_id', filters.accountId);
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

  let vencidos = 0, vencem_hoje = 0, a_vencer = 0, recebidos = 0, total_periodo = 0;
  for (const r of allRecords) {
    const valor = Number(r.valor || 0);
    const valorPago = Number(r.valor_pago || 0);
    const st = (r.status || '').toLowerCase();
    const dueDate = normalizeDate(r.data_vencimento);

    if (isExcludedStatus(st)) continue;

    total_periodo += valor;
    if (isPaidStatus(st)) {
      recebidos += valor;
    } else if (isPartiallyPaidStatus(st)) {
      recebidos += valorPago;
      const remaining = Math.max(0, valor - valorPago);
      if (dueDate && dueDate < today) {
        vencidos += remaining;
      } else if (dueDate === today) {
        vencem_hoje += remaining;
      } else {
        a_vencer += remaining;
      }
    } else if (dueDate && dueDate < today) {
      vencidos += valor;
    } else if (dueDate === today) {
      vencem_hoje += valor;
    } else {
      a_vencer += valor;
    }
  }
  return { vencidos, vencem_hoje, a_vencer, recebidos, total_periodo };
}

async function getReceivableStats(accountId?: string): Promise<ReceivableStats> {
  if (!accountId) {
    return { totalOriginal: 0, totalRecebido: 0, paidCount: 0, pendingCount: 0, overdueCount: 0 };
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const PAGE_SIZE = 1000;
  let records: any[] = [];
  let page = 0;
  while (true) {
    let query = supabase
      .from('conta_azul_contas_receber')
      .select('valor, valor_pago, status, data_vencimento')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .eq('account_id', accountId);
    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    records.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    page++;
  }

  let totalOriginal = 0, totalRecebido = 0, paidCount = 0, pendingCount = 0, overdueCount = 0;

  for (const r of records) {
    const st = (r.status || '').toLowerCase();
    if (isExcludedStatus(st)) continue;
    const valor = Number(r.valor || 0);
    const valorPago = Number(r.valor_pago || 0);
    const dueDate = normalizeDate(r.data_vencimento);
    totalOriginal += valor;
    totalRecebido += valorPago;

    if (isPaidStatus(st) || (valor > 0 && valorPago >= valor)) {
      paidCount++;
    } else if (dueDate && dueDate < today) {
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

  const [receberData, pagarData, contasData] = await Promise.all([
    fetchAll('conta_azul_contas_receber', 'valor, valor_pago, status'),
    fetchAll('conta_azul_contas_pagar', 'valor, valor_pago, status'),
    fetchAll('conta_azul_contas_financeiras', 'saldo_atual', (q: any) => q.eq('ativo', true)),
  ]);

  function computeTotals(records: any[]) {
    let total = 0, pago = 0, pendente = 0, count = 0;
    for (const r of records) {
      const st = (r.status || '').toLowerCase();
      if (isExcludedStatus(st)) continue;
      const valor = Number(r.valor || 0);
      const valorPago = Number(r.valor_pago || 0);
      count++;
      total += valor;
      if (isPaidStatus(st)) {
        pago += valor;
      } else if (isPartiallyPaidStatus(st)) {
        pago += valorPago;
        pendente += Math.max(0, valor - valorPago);
      } else {
        pendente += valor;
      }
    }
    return { total, pago, pendente, count };
  }

  const receber = computeTotals(receberData);
  const pagar = computeTotals(pagarData);
  const saldoContas = contasData.reduce((s: number, c: any) => s + Number(c.saldo_atual || 0), 0);

  return {
    totalReceber: receber.total,
    totalReceberPago: receber.pago,
    totalReceberPendente: receber.pendente,
    totalPagar: pagar.total,
    totalPagarPago: pagar.pago,
    totalPagarPendente: pagar.pendente,
    saldoContas,
    countReceber: receber.count,
    countPagar: pagar.count,
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

async function updateSaleCostCenter(saleId: string, centroCustoNome: string, accountId: string): Promise<any> {
  return edgeFetch('conta-azul-write', 'update-sale', {
    method: 'POST',
    body: withAccountId({ sale_id: saleId, centro_custo_nome: centroCustoNome }, accountId),
  });
}

// ── Per-account per-type sync timestamps ────────────────────

export interface SyncTimestamps {
  [accountId: string]: {
    receivables?: string;
    payables?: string;
    categories?: string;
  };
}

async function getLastSyncTimestamps(accountIds: string[]): Promise<SyncTimestamps> {
  if (accountIds.length === 0) return {};
  const result: SyncTimestamps = {};
  const { data, error } = await supabase
    .from('conta_azul_sync_log')
    .select('account_id, tipo_sync, finished_at')
    .in('account_id', accountIds)
    .eq('status', 'success')
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  for (const log of (data || [])) {
    if (!log.account_id) continue;
    if (!result[log.account_id]) result[log.account_id] = {};
    const tipo = log.tipo_sync.replace('-incremental', '');
    const entry = result[log.account_id];
    if (tipo === 'receivables' && !entry.receivables) entry.receivables = log.finished_at;
    if (tipo === 'payables' && !entry.payables) entry.payables = log.finished_at;
    if (tipo === 'categories' && !entry.categories) entry.categories = log.finished_at;
  }
  return result;
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
  getPendingSession,
  getLastSyncTimestamps,
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
  updateSaleCostCenter,
};

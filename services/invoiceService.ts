import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_APP_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_APP_SUPABASE_ANON_KEY || '';
const EDGE_BASE = `${SUPABASE_URL}/functions/v1`;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY }
    : { apikey: SUPABASE_KEY };
}

async function edgeFetch(action: string, method = 'GET', body?: any) {
  const headers: any = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
  const res = await fetch(`${EDGE_BASE}/nf-emit/${action}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

// ── Types ──────────────────────────────────────────────────────

export interface NfReceivableRow {
  receivable_id: string;
  receivable_id_conta_azul: string;
  receivable_descricao: string;
  receivable_valor: number;
  receivable_status: string;
  receivable_data_vencimento: string;
  receivable_data_competencia: string;
  receivable_contato_nome: string;
  receivable_contato_cpf: string;
  receivable_account_id: string;
  deal_id: string | null;
  deal_product_type: string | null;
  deal_product_name: string | null;
  deal_contact_name: string | null;
  deal_class_mod1: string | null;
  deal_class_mod2: string | null;
  class_id: string | null;
  class_date_mod2: string | null;
  class_status: string | null;
  split_mode: string;
  service_pct: number;
  product_pct: number;
  attendance_pct: number | null;
  is_eligible: boolean;
  eligibility_reason: string;
  nf_status: string | null;
  existing_nf_count: number;
}

export interface NfInvoice {
  id: string;
  conta_azul_receivable_id: string;
  deal_id: string | null;
  parent_invoice_id: string | null;
  split_part: string | null;
  provider: 'enotas' | 'conta_azul';
  type: 'nfse' | 'nfe';
  status: 'pending' | 'processing' | 'issued' | 'cancelled' | 'error';
  external_id: string | null;
  numero_nf: string | null;
  serie: string | null;
  codigo_verificacao: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  valor: number;
  descricao: string | null;
  tomador_nome: string | null;
  tomador_cpf_cnpj: string | null;
  error_message: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NfConfig {
  id?: string;
  default_provider: 'enotas' | 'conta_azul';
  enotas_api_key: string | null;
  enotas_empresa_id: string | null;
  enotas_ambiente: 'producao' | 'homologacao';
  conta_azul_account_id: string | null;
  min_attendance_pct: number;
  auto_emit: boolean;
}

export interface NfFilters {
  accountId?: string;
  search?: string;
  statusFilter?: 'pending' | 'partial' | 'complete' | 'eligible' | 'all';
  limit?: number;
  offset?: number;
}

export interface NfIssuedFilters {
  search?: string;
  status?: string;
  type?: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// ── Queries ────────────────────────────────────────────────────

async function getEligibleReceivables(filters: NfFilters = {}): Promise<{ data: NfReceivableRow[]; count: number }> {
  const { data, error } = await supabase.rpc('get_receivables_for_nf', {
    p_account_id: filters.accountId || null,
    p_search: filters.search || null,
    p_status_filter: filters.statusFilter || 'pending',
    p_limit: filters.limit || 50,
    p_offset: filters.offset || 0,
  });
  if (error) throw new Error(error.message);
  return { data: data || [], count: (data || []).length };
}

async function getIssuedInvoices(filters: NfIssuedFilters = {}): Promise<{ data: NfInvoice[]; count: number }> {
  let query = supabase
    .from('nf_invoices')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type);
  if (filters.provider && filters.provider !== 'all') query = query.eq('provider', filters.provider);
  if (filters.startDate) query = query.gte('created_at', filters.startDate);
  if (filters.endDate) query = query.lte('created_at', filters.endDate + 'T23:59:59');
  if (filters.search) {
    query = query.or(`tomador_nome.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%,numero_nf.ilike.%${filters.search}%`);
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: data || [], count: count || 0 };
}

async function getInvoicesByReceivable(receivableId: string): Promise<NfInvoice[]> {
  const { data, error } = await supabase
    .from('nf_invoices')
    .select('*')
    .eq('conta_azul_receivable_id', receivableId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return data || [];
}

async function getStats(): Promise<{
  total_pending: number;
  total_issued: number;
  total_partial: number;
  total_error: number;
  valor_emitido: number;
}> {
  const { data, error } = await supabase.from('nf_invoices').select('status, valor');
  if (error) throw new Error(error.message);
  const rows = data || [];
  const issued = rows.filter(r => r.status === 'issued');
  return {
    total_pending: rows.filter(r => r.status === 'pending' || r.status === 'processing').length,
    total_issued: issued.length,
    total_partial: 0,
    total_error: rows.filter(r => r.status === 'error').length,
    valor_emitido: issued.reduce((s, r) => s + Number(r.valor || 0), 0),
  };
}

// ── Emission ───────────────────────────────────────────────────

async function emitInvoice(params: {
  receivable_id: string;
  provider: 'enotas' | 'conta_azul';
  type: 'nfse' | 'nfe';
  deal_id?: string;
  descricao?: string;
  valor: number;
  tomador_nome?: string;
  tomador_cpf_cnpj?: string;
  split_part?: string;
}) {
  return edgeFetch('emit', 'POST', params);
}

async function emitDividedInvoice(params: {
  receivable_id: string;
  provider: 'enotas' | 'conta_azul';
  deal_id?: string;
  descricao?: string;
  valor_total: number;
  service_pct: number;
  product_pct: number;
  tomador_nome?: string;
  tomador_cpf_cnpj?: string;
}) {
  return edgeFetch('emit-divided', 'POST', params);
}

async function cancelInvoice(invoiceId: string) {
  return edgeFetch('cancel', 'POST', { invoice_id: invoiceId });
}

async function refreshInvoiceStatus(invoiceId: string): Promise<NfInvoice> {
  return edgeFetch(`status/${invoiceId}`, 'GET');
}

// ── Config ─────────────────────────────────────────────────────

async function getConfig(): Promise<NfConfig | null> {
  const { data } = await supabase.from('nf_config').select('*').limit(1).maybeSingle();
  return data;
}

async function saveConfig(config: Partial<NfConfig>) {
  return edgeFetch('config', 'POST', config);
}

// ── Export ──────────────────────────────────────────────────────

export const invoiceService = {
  supabase,
  getEligibleReceivables,
  getIssuedInvoices,
  getInvoicesByReceivable,
  getStats,
  emitInvoice,
  emitDividedInvoice,
  cancelInvoice,
  refreshInvoiceStatus,
  getConfig,
  saveConfig,
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CONTA_AZUL_BASE = "https://api-v2.contaazul.com";
const CONTA_AZUL_AUTH_BASE = "https://auth.contaazul.com/oauth2";

function getSupabaseServiceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

function getContaAzulCredentials() {
  return { clientId: Deno.env.get("CONTA_AZUL_CLIENT_ID")!, clientSecret: Deno.env.get("CONTA_AZUL_CLIENT_SECRET")!, redirectUri: Deno.env.get("CONTA_AZUL_REDIRECT_URI")! };
}

async function getValidAccessToken(): Promise<string> {
  const db = getSupabaseServiceClient();
  const { data: tokenRow, error } = await db.from("conta_azul_tokens").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !tokenRow) throw new Error("NO_TOKEN: Conta Azul nao conectada.");
  const expiresAt = new Date(tokenRow.expires_at);
  if (expiresAt.getTime() - 300000 > Date.now()) return tokenRow.access_token;
  const creds = getContaAzulCredentials();
  const basicAuth = btoa(creds.clientId + ":" + creds.clientSecret);
  const res = await fetch(CONTA_AZUL_AUTH_BASE + "/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + basicAuth }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokenRow.refresh_token }) });
  if (!res.ok) { const e = await res.text(); throw new Error("TOKEN_REFRESH_FAILED: " + res.status + " - " + e); }
  const tokens = await res.json();
  const newExp = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await db.from("conta_azul_tokens").update({ access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_at: newExp, updated_at: new Date().toISOString() }).eq("id", tokenRow.id);
  return tokens.access_token;
}

async function contaAzulFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getValidAccessToken();
  return fetch(CONTA_AZUL_BASE + path, { ...options, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...(options.headers as Record<string, string> || {}) } });
}

async function contaAzulFetchPaginated<T>(basePath: string, queryParams: Record<string, string> = {}, maxPages = 50): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  const size = 200;
  for (let i = 0; i < maxPages; i++) {
    const params = new URLSearchParams({ ...queryParams, pagina: String(page), tamanho_pagina: String(size) });
    const res = await contaAzulFetch(basePath + "?" + params.toString());
    if (!res.ok) { const e = await res.text(); throw new Error("API_ERROR: " + res.status + " on " + basePath + " - " + e); }
    const body = await res.json();
    const items: T[] = Array.isArray(body) ? body : body.itens || body.items || body.content || [];
    if (items.length === 0) break;
    all.push(...items);
    if (items.length < size) break;
    page++;
    await new Promise(r => setTimeout(r, 120));
  }
  return all;
}

function corsHeaders(origin = "*") { return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }; }
function jsonResponse(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...corsHeaders() } }); }
function errorResponse(message: string, status = 400) { return jsonResponse({ error: message }, status); }

async function createSyncLog(tipo: string) { const db = getSupabaseServiceClient(); const { data } = await db.from("conta_azul_sync_log").insert({ tipo_sync: tipo, status: "running" }).select("id").single(); return data?.id; }
async function completeSyncLog(logId: string, count: number, error?: string) { const db = getSupabaseServiceClient(); await db.from("conta_azul_sync_log").update({ status: error ? "error" : "success", registros_sincronizados: count, erro: error || null, finished_at: new Date().toISOString() }).eq("id", logId); }

function defaultDateRange() {
  const now = new Date();
  const from = new Date(now);
  from.setFullYear(from.getFullYear() - 2);
  const to = new Date(now);
  to.setFullYear(to.getFullYear() + 2);
  return {
    data_vencimento_de: from.toISOString().split("T")[0],
    data_vencimento_ate: to.toISOString().split("T")[0],
  };
}

function mapReceivableToRow(item: any) {
  const cat = Array.isArray(item.categorias) ? item.categorias[0] : item.categorias;
  const cc = Array.isArray(item.centros_custo) ? item.centros_custo[0] : item.centros_custo;
  return {
    id_conta_azul: String(item.id),
    id_evento: item.id_evento ? String(item.id_evento) : null,
    descricao: item.descricao || null,
    valor: parseFloat(item.total || item.valor || item.valor_original || 0),
    valor_pago: parseFloat(item.pago || item.valor_pago || item.valor_recebido || 0),
    data_vencimento: item.data_vencimento || null,
    data_competencia: item.data_competencia || null,
    data_pagamento: item.data_pagamento || null,
    data_alteracao: item.data_alteracao || null,
    status: item.status_traduzido || item.status || "PENDENTE",
    categoria_id: cat?.id ? String(cat.id) : null,
    categoria_nome: cat?.nome || null,
    centro_custo_id: cc?.id ? String(cc.id) : null,
    centro_custo_nome: cc?.nome || null,
    conta_financeira_id: item.conta_financeira?.id ? String(item.conta_financeira.id) : null,
    conta_financeira_nome: item.conta_financeira?.nome || null,
    parcela_numero: item.numero_parcela ?? null,
    total_parcelas: item.total_parcelas ?? null,
    contato_nome: item.cliente?.nome || item.contato?.nome || null,
    contato_id: item.cliente?.id ? String(item.cliente.id) : item.contato?.id ? String(item.contato.id) : null,
    observacoes: item.observacao || item.observacoes || null,
    numero_documento: item.numero_documento || null,
    synced_at: new Date().toISOString(),
  };
}

function mapPayableToRow(item: any) {
  const cat = Array.isArray(item.categorias) ? item.categorias[0] : item.categorias;
  const cc = Array.isArray(item.centros_custo) ? item.centros_custo[0] : item.centros_custo;
  return {
    id_conta_azul: String(item.id),
    id_evento: item.id_evento ? String(item.id_evento) : null,
    descricao: item.descricao || null,
    valor: parseFloat(item.total || item.valor || item.valor_original || 0),
    valor_pago: parseFloat(item.pago || item.valor_pago || 0),
    data_vencimento: item.data_vencimento || null,
    data_competencia: item.data_competencia || null,
    data_pagamento: item.data_pagamento || null,
    data_alteracao: item.data_alteracao || null,
    status: item.status_traduzido || item.status || "PENDENTE",
    categoria_id: cat?.id ? String(cat.id) : null,
    categoria_nome: cat?.nome || null,
    centro_custo_id: cc?.id ? String(cc.id) : null,
    centro_custo_nome: cc?.nome || null,
    conta_financeira_id: item.conta_financeira?.id ? String(item.conta_financeira.id) : null,
    conta_financeira_nome: item.conta_financeira?.nome || null,
    parcela_numero: item.numero_parcela ?? null,
    total_parcelas: item.total_parcelas ?? null,
    fornecedor_nome: item.fornecedor?.nome || item.contato?.nome || null,
    fornecedor_id: item.fornecedor?.id ? String(item.fornecedor.id) : item.contato?.id ? String(item.contato.id) : null,
    observacoes: item.observacao || item.observacoes || null,
    numero_documento: item.numero_documento || null,
    synced_at: new Date().toISOString(),
  };
}

async function syncReceivables(req: Request): Promise<Response> {
  const logId = await createSyncLog("receivables"); let count = 0;
  try {
    const body = await req.json().catch(() => ({}));
    const dateRange = defaultDateRange();
    const params: Record<string, string> = {
      data_vencimento_de: body.data_vencimento_de || dateRange.data_vencimento_de,
      data_vencimento_ate: body.data_vencimento_ate || dateRange.data_vencimento_ate,
    };
    const items = await contaAzulFetchPaginated<any>("/v1/financeiro/eventos-financeiros/contas-a-receber/buscar", params);
    const db = getSupabaseServiceClient();
    for (const item of items) { const { error } = await db.from("conta_azul_contas_receber").upsert(mapReceivableToRow(item), { onConflict: "id_conta_azul" }); if (!error) count++; }
    await completeSyncLog(logId!, count);
    return jsonResponse({ success: true, tipo: "receivables", sincronizados: count });
  } catch (err: any) { await completeSyncLog(logId!, count, err.message); throw err; }
}

async function syncPayables(req: Request): Promise<Response> {
  const logId = await createSyncLog("payables"); let count = 0;
  try {
    const body = await req.json().catch(() => ({}));
    const dateRange = defaultDateRange();
    const params: Record<string, string> = {
      data_vencimento_de: body.data_vencimento_de || dateRange.data_vencimento_de,
      data_vencimento_ate: body.data_vencimento_ate || dateRange.data_vencimento_ate,
    };
    const items = await contaAzulFetchPaginated<any>("/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar", params);
    const db = getSupabaseServiceClient();
    for (const item of items) { const { error } = await db.from("conta_azul_contas_pagar").upsert(mapPayableToRow(item), { onConflict: "id_conta_azul" }); if (!error) count++; }
    await completeSyncLog(logId!, count);
    return jsonResponse({ success: true, tipo: "payables", sincronizados: count });
  } catch (err: any) { await completeSyncLog(logId!, count, err.message); throw err; }
}

async function syncCategories(): Promise<Response> {
  const logId = await createSyncLog("categories"); let count = 0;
  try {
    const items = await contaAzulFetchPaginated<any>("/v1/categorias", { permite_apenas_filhos: "true" });
    const db = getSupabaseServiceClient();
    for (const item of items) { const { error } = await db.from("conta_azul_categorias").upsert({ id_conta_azul: String(item.id), nome: item.nome || item.descricao || "Sem nome", tipo: item.tipo || "AMBOS", ativo: true, synced_at: new Date().toISOString() }, { onConflict: "id_conta_azul" }); if (!error) count++; }
    await completeSyncLog(logId!, count);
    return jsonResponse({ success: true, tipo: "categories", sincronizados: count });
  } catch (err: any) { await completeSyncLog(logId!, count, err.message); throw err; }
}

async function syncCostCenters(): Promise<Response> {
  const logId = await createSyncLog("cost-centers"); let count = 0;
  try {
    const items = await contaAzulFetchPaginated<any>("/v1/centro-de-custo", { filtro_rapido: "TODOS" });
    const db = getSupabaseServiceClient();
    for (const item of items) { const { error } = await db.from("conta_azul_centros_custo").upsert({ id_conta_azul: String(item.id), codigo: item.codigo || null, nome: item.nome || "Sem nome", ativo: item.ativo !== false, synced_at: new Date().toISOString() }, { onConflict: "id_conta_azul" }); if (!error) count++; }
    await completeSyncLog(logId!, count);
    return jsonResponse({ success: true, tipo: "cost-centers", sincronizados: count });
  } catch (err: any) { await completeSyncLog(logId!, count, err.message); throw err; }
}

async function syncAccounts(): Promise<Response> {
  const logId = await createSyncLog("accounts"); let count = 0;
  try {
    const items = await contaAzulFetchPaginated<any>("/v1/conta-financeira", { apenas_ativo: "true" });
    const db = getSupabaseServiceClient();
    for (const item of items) {
      let saldoAtual = 0;
      try { const bRes = await contaAzulFetch("/v1/conta-financeira/" + item.id + "/saldo-atual"); if (bRes.ok) { const bd = await bRes.json(); saldoAtual = parseFloat(bd.saldo || bd.valor || 0); } await new Promise(r => setTimeout(r, 120)); } catch {}
      const { error } = await db.from("conta_azul_contas_financeiras").upsert({ id_conta_azul: String(item.id), nome: item.nome || "Sem nome", tipo: item.tipo || null, saldo_atual: saldoAtual, ativo: item.ativo !== false, synced_at: new Date().toISOString() }, { onConflict: "id_conta_azul" });
      if (!error) count++;
    }
    await completeSyncLog(logId!, count);
    return jsonResponse({ success: true, tipo: "accounts", sincronizados: count });
  } catch (err: any) { await completeSyncLog(logId!, count, err.message); throw err; }
}

async function syncAll(req: Request): Promise<Response> {
  const results: Record<string, any> = {};
  const body = await req.json().catch(() => ({}));
  const mockReq = (b: any) => new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
  try { results.categories = await (await syncCategories()).json(); } catch (e: any) { results.categories = { error: e.message }; }
  try { results.costCenters = await (await syncCostCenters()).json(); } catch (e: any) { results.costCenters = { error: e.message }; }
  try { results.accounts = await (await syncAccounts()).json(); } catch (e: any) { results.accounts = { error: e.message }; }
  try { results.receivables = await (await syncReceivables(mockReq(body))).json(); } catch (e: any) { results.receivables = { error: e.message }; }
  try { results.payables = await (await syncPayables(mockReq(body))).json(); } catch (e: any) { results.payables = { error: e.message }; }
  return jsonResponse({ success: true, results });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  if (req.method !== "POST") return errorResponse("Metodo nao permitido. Use POST.", 405);
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const action = parts[parts.length - 1];
  try {
    switch (action) {
      case "receivables": return await syncReceivables(req);
      case "payables": return await syncPayables(req);
      case "categories": return await syncCategories();
      case "cost-centers": return await syncCostCenters();
      case "accounts": return await syncAccounts();
      case "all": return await syncAll(req);
      default: return errorResponse("Sync type desconhecido: " + action, 404);
    }
  } catch (err: any) { console.error("conta-azul-sync error:", err); return errorResponse(err.message || "Erro interno", 500); }
});

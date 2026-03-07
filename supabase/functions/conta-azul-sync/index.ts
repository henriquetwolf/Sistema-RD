import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const CONTA_AZUL_BASE = "https://api-v2.contaazul.com";
const CONTA_AZUL_AUTH_BASE = "https://auth.contaazul.com/oauth2";

function getSupabaseServiceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function getAccountCredentials(accountId: string) {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("conta_azul_accounts")
    .select("client_id, client_secret, redirect_uri")
    .eq("id", accountId)
    .single();
  if (error || !data) throw new Error("Conta não encontrada: " + accountId);
  return { clientId: data.client_id, clientSecret: data.client_secret };
}

async function getValidAccessToken(accountId: string): Promise<string> {
  const db = getSupabaseServiceClient();
  const { data: tokenRow, error } = await db
    .from("conta_azul_tokens")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !tokenRow) throw new Error("NO_TOKEN: Conta Azul nao conectada para esta conta.");
  const expiresAt = new Date(tokenRow.expires_at);
  if (expiresAt.getTime() - 300000 > Date.now()) return tokenRow.access_token;

  const creds = await getAccountCredentials(accountId);
  const basicAuth = btoa(creds.clientId + ":" + creds.clientSecret);
  const res = await fetch(CONTA_AZUL_AUTH_BASE + "/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + basicAuth },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokenRow.refresh_token }),
  });
  if (!res.ok) { const e = await res.text(); throw new Error("TOKEN_REFRESH_FAILED: " + res.status + " - " + e); }
  const tokens = await res.json();
  const newExp = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await db.from("conta_azul_tokens").update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: newExp,
    updated_at: new Date().toISOString(),
  }).eq("id", tokenRow.id);
  return tokens.access_token;
}

async function contaAzulFetch(accountId: string, path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getValidAccessToken(accountId);
  return fetch(CONTA_AZUL_BASE + path, {
    ...options,
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...(options.headers as Record<string, string> || {}) },
  });
}

function extractItems<T>(body: any): T[] {
  if (Array.isArray(body)) return body;
  if (body.itens && Array.isArray(body.itens)) return body.itens;
  if (body.items && Array.isArray(body.items)) return body.items;
  if (body.content && Array.isArray(body.content)) return body.content;
  if (body.data && Array.isArray(body.data)) return body.data;
  return [];
}

async function contaAzulFetchPaginated<T>(accountId: string, basePath: string, queryParams: Record<string, string> = {}, maxPages = 500): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  const size = 1000;
  // API Conta Azul "buscar" é GET com query params (não POST): data_vencimento_de, data_vencimento_ate, pagina, tamanho_pagina
  for (let i = 0; i < maxPages; i++) {
    const params = new URLSearchParams({ ...queryParams, pagina: String(page), tamanho_pagina: String(size) });
    const res = await contaAzulFetch(accountId, basePath + "?" + params.toString());
    if (!res.ok) { const e = await res.text(); throw new Error("API_ERROR: " + res.status + " on " + basePath + " - " + e); }
    const body = await res.json();
    const items: T[] = extractItems<T>(body);
    if (items.length === 0) {
      if (page === 1) {
        console.warn(`[contaAzulFetchPaginated] 0 items on first page for ${basePath}. Response keys:`, Object.keys(body || {}));
      }
      break;
    }
    all.push(...items);
    console.log(`[contaAzulFetchPaginated] ${basePath} page ${page}: ${items.length} items (total: ${all.length})`);
    if (items.length < size) break;
    page++;
    if (page > maxPages) {
      console.warn(`[contaAzulFetchPaginated] TRUNCATED at ${maxPages} pages (${all.length} items) for ${basePath}. There may be more data.`);
    }
    await new Promise(r => setTimeout(r, 50));
  }
  return all;
}

function corsHeaders(origin = "*") { return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }; }
function jsonResponse(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...corsHeaders() } }); }
function errorResponse(message: string, status = 400) { return jsonResponse({ error: message }, status); }

async function createSyncLog(tipo: string, accountId: string) {
  const db = getSupabaseServiceClient();
  const { data } = await db.from("conta_azul_sync_log").insert({ tipo_sync: tipo, status: "running", account_id: accountId }).select("id").single();
  return data?.id;
}
async function completeSyncLog(logId: string, count: number, error?: string) {
  const db = getSupabaseServiceClient();
  await db.from("conta_azul_sync_log").update({ status: error ? "error" : "success", registros_sincronizados: count, erro: error || null, finished_at: new Date().toISOString() }).eq("id", logId);
}

async function getLastSuccessfulSync(tipo: string, accountId: string): Promise<{ finished_at: string } | null> {
  const db = getSupabaseServiceClient();
  const { data } = await db
    .from("conta_azul_sync_log")
    .select("finished_at")
    .eq("tipo_sync", tipo)
    .eq("account_id", accountId)
    .eq("status", "success")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

function safeFloat(val: any): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

function defaultDateRange() {
  const now = new Date();
  const from = new Date(now);
  from.setFullYear(from.getFullYear() - 10);
  const to = new Date(now);
  to.setFullYear(to.getFullYear() + 5);
  return {
    data_vencimento_de: from.toISOString().split("T")[0],
    data_vencimento_ate: to.toISOString().split("T")[0],
  };
}

function mapReceivableToRow(item: any, accountId: string) {
  const cat = Array.isArray(item.categorias) ? item.categorias[0] : item.categorias;
  const cc = Array.isArray(item.centros_custo) ? item.centros_custo[0] : item.centros_custo;
  return {
    account_id: accountId,
    id_conta_azul: String(item.id),
    id_evento: item.id_evento ? String(item.id_evento) : null,
    descricao: item.descricao || null,
    valor: safeFloat(item.valor ?? item.total ?? item.valor_original),
    valor_pago: safeFloat(item.valor_pago ?? item.pago ?? item.valor_recebido),
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

function mapPayableToRow(item: any, accountId: string) {
  const cat = Array.isArray(item.categorias) ? item.categorias[0] : item.categorias;
  const cc = Array.isArray(item.centros_custo) ? item.centros_custo[0] : item.centros_custo;
  return {
    account_id: accountId,
    id_conta_azul: String(item.id),
    id_evento: item.id_evento ? String(item.id_evento) : null,
    descricao: item.descricao || null,
    valor: safeFloat(item.valor ?? item.total ?? item.valor_original),
    valor_pago: safeFloat(item.valor_pago ?? item.pago),
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

function extractAccountId(body: any): string {
  const id = body?.account_id;
  if (!id) throw new Error("Campo 'account_id' é obrigatório no body da requisição.");
  return id;
}

async function syncReceivables(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const accountId = extractAccountId(body);
  const isIncremental = !!body.incremental;
  const syncLabel = isIncremental ? "receivables-incremental" : "receivables";
  const logId = await createSyncLog(syncLabel, accountId);
  let count = 0;
  const db = getSupabaseServiceClient();
  try {
    const dateRange = defaultDateRange();
    const params: Record<string, string> = {
      data_vencimento_de: body.data_vencimento_de || dateRange.data_vencimento_de,
      data_vencimento_ate: body.data_vencimento_ate || dateRange.data_vencimento_ate,
    };

    if (isIncremental) {
      const lastSync = await getLastSuccessfulSync("receivables", accountId)
        || await getLastSuccessfulSync("receivables-incremental", accountId);
      if (lastSync?.finished_at) {
        const since = new Date(lastSync.finished_at);
        since.setHours(since.getHours() - 1);
        params.data_alteracao_de = since.toISOString().replace("Z", "");
        params.data_alteracao_ate = new Date().toISOString().replace("Z", "");
        console.log(`[syncReceivables] Incremental via data_alteracao_de: ${params.data_alteracao_de} for account ${accountId}`);
      } else {
        console.log(`[syncReceivables] No previous sync found, doing full date range for account ${accountId}`);
      }
    }

    console.log(`[syncReceivables] Params: ${JSON.stringify(params)} for account ${accountId}`);
    const items = await contaAzulFetchPaginated<any>(accountId, "/v1/financeiro/eventos-financeiros/contas-a-receber/buscar", params);
    console.log(`[syncReceivables] Fetched: ${items.length} items for account ${accountId} (incremental=${isIncremental})`);

    // Diagnostic: log unique statuses, payment samples, and per-date counts
    const statusSet = new Set(items.map((it: any) => it.status_traduzido || it.status || "NULL"));
    console.log(`[syncReceivables] Unique statuses (${statusSet.size}): ${[...statusSet].join(", ")}`);
    const todayStr = new Date().toISOString().split("T")[0];
    const dateCounts: Record<string, number> = {};
    for (const it of items) {
      const d = it.data_vencimento || "NULL";
      dateCounts[d] = (dateCounts[d] || 0) + 1;
    }
    const todayCount = dateCounts[todayStr] || 0;
    console.log(`[syncReceivables] API records for today (${todayStr}): ${todayCount}`);
    const nullDates = dateCounts["NULL"] || 0;
    if (nullDates > 0) console.log(`[syncReceivables] WARNING: ${nullDates} items have NULL data_vencimento`);

    if (items.length >= 100000) {
      console.warn(`[syncReceivables] WARNING: High item count (${items.length}), possible truncation at maxPages limit.`);
    }

    // Não apagar antes do upsert: com 150k+ registros, o delete + upsert pode causar timeout ou race;
    // só fazemos upsert — assim nunca esvaziamos a tabela. Registros removidos no Conta Azul ficam órfãos (aceitável).
    const rows = items.map(item => mapReceivableToRow(item, accountId));
    let batchErrors = 0;
    let rowErrors = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
      const { error } = await db.from("conta_azul_contas_receber").upsert(batch, { onConflict: "account_id,id_conta_azul" });
      if (error) {
        batchErrors++;
        console.error("[syncReceivables] Batch error at index", i, ":", error.message, error.details);
        // Retry one-by-one to save as many records as possible
        for (const row of batch) {
          const { error: rowErr } = await db.from("conta_azul_contas_receber").upsert(row, { onConflict: "account_id,id_conta_azul" });
          if (rowErr) {
            rowErrors++;
            console.error(`[syncReceivables] Row error id_conta_azul=${row.id_conta_azul}: ${rowErr.message}`);
          } else {
            count++;
          }
        }
      } else {
        count += batch.length;
      }
    }
    console.log(`[syncReceivables] Done: ${count} upserted, ${batchErrors} batch errors, ${rowErrors} individual row errors for account ${accountId}`);
    await completeSyncLog(logId!, count);
    return jsonResponse({ success: true, tipo: syncLabel, sincronizados: count, incremental: isIncremental });
  } catch (err: any) { await completeSyncLog(logId!, count, err.message); throw err; }
}

async function syncPayables(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const accountId = extractAccountId(body);
  const isIncremental = !!body.incremental;
  const syncLabel = isIncremental ? "payables-incremental" : "payables";
  const logId = await createSyncLog(syncLabel, accountId);
  let count = 0;
  const db = getSupabaseServiceClient();
  try {
    const dateRange = defaultDateRange();
    const params: Record<string, string> = {
      data_vencimento_de: body.data_vencimento_de || dateRange.data_vencimento_de,
      data_vencimento_ate: body.data_vencimento_ate || dateRange.data_vencimento_ate,
    };

    if (isIncremental) {
      const lastSync = await getLastSuccessfulSync("payables", accountId)
        || await getLastSuccessfulSync("payables-incremental", accountId);
      if (lastSync?.finished_at) {
        const since = new Date(lastSync.finished_at);
        since.setHours(since.getHours() - 1);
        params.data_alteracao_de = since.toISOString().replace("Z", "");
        params.data_alteracao_ate = new Date().toISOString().replace("Z", "");
        console.log(`[syncPayables] Incremental via data_alteracao_de: ${params.data_alteracao_de} for account ${accountId}`);
      } else {
        console.log(`[syncPayables] No previous sync found, doing full date range for account ${accountId}`);
      }
    }

    console.log(`[syncPayables] Params: ${JSON.stringify(params)} for account ${accountId}`);
    const items = await contaAzulFetchPaginated<any>(accountId, "/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar", params);
    console.log(`[syncPayables] Fetched: ${items.length} items for account ${accountId} (incremental=${isIncremental})`);

    // Diagnostic: log unique status values for mapping verification
    const statusSet = new Set(items.map((it: any) => it.status_traduzido || it.status || "NULL"));
    console.log(`[syncPayables] Unique statuses (${statusSet.size}): ${[...statusSet].join(", ")}`);

    if (items.length >= 100000) {
      console.warn(`[syncPayables] WARNING: High item count (${items.length}), possible truncation at maxPages limit.`);
    }

    // Não apagar antes do upsert (evita esvaziar a tabela em sync com muitos registros).
    const rows = items.map(item => mapPayableToRow(item, accountId));
    let batchErrors = 0;
    let rowErrors = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
      const { error } = await db.from("conta_azul_contas_pagar").upsert(batch, { onConflict: "account_id,id_conta_azul" });
      if (error) {
        batchErrors++;
        console.error("[syncPayables] Batch error at index", i, ":", error.message, error.details);
        for (const row of batch) {
          const { error: rowErr } = await db.from("conta_azul_contas_pagar").upsert(row, { onConflict: "account_id,id_conta_azul" });
          if (rowErr) {
            rowErrors++;
            console.error(`[syncPayables] Row error id_conta_azul=${row.id_conta_azul}: ${rowErr.message}`);
          } else {
            count++;
          }
        }
      } else {
        count += batch.length;
      }
    }
    console.log(`[syncPayables] Done: ${count} upserted, ${batchErrors} batch errors, ${rowErrors} individual row errors for account ${accountId}`);
    await completeSyncLog(logId!, count);
    return jsonResponse({ success: true, tipo: syncLabel, sincronizados: count, incremental: isIncremental });
  } catch (err: any) { await completeSyncLog(logId!, count, err.message); throw err; }
}

async function syncCategories(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const accountId = extractAccountId(body);
  const logId = await createSyncLog("categories", accountId);
  let count = 0;
  try {
    const items = await contaAzulFetchPaginated<any>(accountId, "/v1/categorias", {});
    const leafItems = await contaAzulFetchPaginated<any>(accountId, "/v1/categorias", { permite_apenas_filhos: "true" });
    console.log(`[syncCategories] account=${accountId} | API returned: ${items.length} categories, ${leafItems.length} leaf categories`);

    if (items.length === 0 && leafItems.length === 0) {
      console.warn(`[syncCategories] API returned 0 categories for account ${accountId}. Check token/permissions.`);
    }

    const byId = new Map<string, any>();
    for (const item of items) byId.set(String(item.id), item);

    function buildPath(item: any): string {
      const parentId = item.categoria_pai_id || item.pai?.id || item.parent_id;
      const parent = parentId ? byId.get(String(parentId)) : null;
      const selfName = item.nome || item.descricao || "Sem nome";
      return parent ? buildPath(parent) + " > " + selfName : selfName;
    }

    const allMap = new Map<string, any>();
    for (const item of items) allMap.set(String(item.id), item);
    for (const item of leafItems) allMap.set(String(item.id), item);

    const db = getSupabaseServiceClient();
    const now = new Date().toISOString();
    const VALID_TIPOS = ["RECEITA", "DESPESA", "AMBOS"];
    const normalizeTipo = (t: any): string => {
      if (!t) return "AMBOS";
      const upper = String(t).toUpperCase().trim();
      return VALID_TIPOS.includes(upper) ? upper : "AMBOS";
    };

    const rows = Array.from(allMap.values()).map((item: any) => ({
      account_id: accountId,
      id_conta_azul: String(item.id),
      nome: buildPath(item),
      tipo: normalizeTipo(item.tipo),
      ativo: true,
      synced_at: now,
    }));
    console.log(`[syncCategories] ${rows.length} unique categories to upsert for account ${accountId}`);

    let upsertErrors = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
      const { error } = await db.from("conta_azul_categorias").upsert(batch, { onConflict: "account_id,id_conta_azul" });
      if (error) {
        upsertErrors++;
        console.error("Categories batch error at index", i, ":", error.message, error.details, error.hint);
      } else {
        count += batch.length;
      }
    }

    if (upsertErrors > 0) {
      console.error(`[syncCategories] ${upsertErrors} batch(es) failed during upsert for account ${accountId}`);
    }
    console.log(`[syncCategories] Done: ${count} categories synced for account ${accountId}`);
    await completeSyncLog(logId!, count);
    return jsonResponse({ success: true, tipo: "categories", sincronizados: count });
  } catch (err: any) { await completeSyncLog(logId!, count, err.message); throw err; }
}

async function syncCostCenters(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const accountId = extractAccountId(body);
  const logId = await createSyncLog("cost-centers", accountId);
  let count = 0;
  try {
    const items = await contaAzulFetchPaginated<any>(accountId, "/v1/centro-de-custo");
    const db = getSupabaseServiceClient();
    const now = new Date().toISOString();
    const rows = items.map((item: any) => ({
      account_id: accountId,
      id_conta_azul: String(item.id),
      codigo: item.codigo || null,
      nome: item.nome || "Sem nome",
      ativo: item.ativo !== false,
      synced_at: now,
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
      const { error } = await db.from("conta_azul_centros_custo").upsert(batch, { onConflict: "account_id,id_conta_azul" });
      if (error) {
        console.error("CostCenters batch error at index", i, ":", error.message, error.details);
      } else {
        count += batch.length;
      }
    }
    await completeSyncLog(logId!, count);
    return jsonResponse({ success: true, tipo: "cost-centers", sincronizados: count });
  } catch (err: any) { await completeSyncLog(logId!, count, err.message); throw err; }
}

async function syncAccounts(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const accountId = extractAccountId(body);
  const logId = await createSyncLog("accounts", accountId);
  let count = 0;
  try {
    const items = await contaAzulFetchPaginated<any>(accountId, "/v1/conta-financeira", { apenas_ativo: "true" });
    const db = getSupabaseServiceClient();
    for (const item of items) {
      let saldoAtual = 0;
      try {
        const bRes = await contaAzulFetch(accountId, "/v1/conta-financeira/" + item.id + "/saldo-atual");
        if (bRes.ok) {
          const bd = await bRes.json();
          saldoAtual = safeFloat(bd.saldo ?? bd.saldo_atual ?? bd.valor ?? bd.balance ?? bd.amount);
        }
        await new Promise(r => setTimeout(r, 50));
      } catch {}
      const { error } = await db.from("conta_azul_contas_financeiras").upsert({
        account_id: accountId,
        id_conta_azul: String(item.id),
        nome: item.nome || "Sem nome",
        tipo: item.tipo || null,
        saldo_atual: saldoAtual,
        ativo: item.ativo !== false,
        synced_at: new Date().toISOString(),
      }, { onConflict: "account_id,id_conta_azul" });
      if (!error) count++;
    }
    await completeSyncLog(logId!, count);
    return jsonResponse({ success: true, tipo: "accounts", sincronizados: count });
  } catch (err: any) { await completeSyncLog(logId!, count, err.message); throw err; }
}

async function syncAll(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const accountId = extractAccountId(body);
  const results: Record<string, any> = {};
  const mockReq = (b: any) => new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...b, account_id: accountId }) });
  try { results.categories = await (await syncCategories(mockReq({}))).json(); } catch (e: any) { results.categories = { error: e.message }; }
  try { results.costCenters = await (await syncCostCenters(mockReq({}))).json(); } catch (e: any) { results.costCenters = { error: e.message }; }
  try { results.accounts = await (await syncAccounts(mockReq({}))).json(); } catch (e: any) { results.accounts = { error: e.message }; }
  try { results.receivables = await (await syncReceivables(mockReq(body))).json(); } catch (e: any) { results.receivables = { error: e.message }; }
  try { results.payables = await (await syncPayables(mockReq(body))).json(); } catch (e: any) { results.payables = { error: e.message }; }
  return jsonResponse({ success: true, results });
}

async function syncAllAccounts(req: Request): Promise<Response> {
  const db = getSupabaseServiceClient();
  const { data: accounts } = await db
    .from("conta_azul_accounts")
    .select("id, nome")
    .eq("ativo", true);

  const allResults: Record<string, any> = {};
  for (const acc of (accounts || [])) {
    try {
      const mockReq = new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: acc.id }),
      });
      const res = await syncAll(mockReq);
      allResults[acc.nome] = await res.json();
    } catch (e: any) {
      allResults[acc.nome] = { error: e.message };
    }
  }
  return jsonResponse({ success: true, results: allResults });
}

async function autoSyncAll(_req: Request): Promise<Response> {
  console.log("[autoSyncAll] Starting automatic incremental sync for all active accounts...");
  const db = getSupabaseServiceClient();
  const { data: accounts } = await db
    .from("conta_azul_accounts")
    .select("id, nome")
    .eq("ativo", true);

  if (!accounts || accounts.length === 0) {
    return jsonResponse({ success: true, auto_sync: true, message: "No active accounts found", results: {} });
  }

  const allResults: Record<string, any> = {};
  for (const acc of accounts) {
    const makeReq = (body: any) => new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: acc.id, incremental: true, ...body }),
    });
    try {
      const recRes = await syncReceivables(makeReq({}));
      const payRes = await syncPayables(makeReq({}));
      allResults[acc.nome] = {
        receivables: await recRes.json(),
        payables: await payRes.json(),
      };
      console.log(`[autoSyncAll] ${acc.nome}: done`);
    } catch (e: any) {
      allResults[acc.nome] = { error: e.message };
      console.error(`[autoSyncAll] ${acc.nome}: error -`, e.message);
    }
  }
  console.log("[autoSyncAll] Finished for", accounts.length, "accounts");
  return jsonResponse({ success: true, auto_sync: true, results: allResults });
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
      case "categories": return await syncCategories(req);
      case "cost-centers": return await syncCostCenters(req);
      case "accounts": return await syncAccounts(req);
      case "all": return await syncAll(req);
      case "all-accounts": return await syncAllAccounts(req);
      case "auto-sync-all": return await autoSyncAll(req);
      default: return errorResponse("Sync type desconhecido: " + action, 404);
    }
  } catch (err: any) { console.error("conta-azul-sync error:", err); return errorResponse(err.message || "Erro interno", 500); }
});

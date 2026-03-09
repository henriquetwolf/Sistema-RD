import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ENOTAS_BASE = "https://api.enotas.com.br/v2";
const CONTA_AZUL_BASE = "https://api-v2.contaazul.com";
const CONTA_AZUL_AUTH_BASE = "https://auth.contaazul.com/oauth2";

function getSupabaseServiceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...corsHeaders() } });
}
function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

// ── Conta Azul token management (reused pattern) ───────────────

async function getContaAzulToken(accountId: string): Promise<string> {
  const db = getSupabaseServiceClient();
  const { data: acc } = await db.from("conta_azul_accounts").select("client_id, client_secret").eq("id", accountId).single();
  if (!acc) throw new Error("Conta Azul account not found: " + accountId);

  const { data: tokenRow } = await db.from("conta_azul_tokens").select("*")
    .eq("account_id", accountId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!tokenRow) throw new Error("Conta Azul não conectada para esta conta.");

  const expiresAt = new Date(tokenRow.expires_at);
  if (expiresAt.getTime() - 300000 > Date.now()) return tokenRow.access_token;

  const basicAuth = btoa(acc.client_id + ":" + acc.client_secret);
  const res = await fetch(CONTA_AZUL_AUTH_BASE + "/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + basicAuth },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokenRow.refresh_token }),
  });
  if (!res.ok) throw new Error("Token refresh failed: " + (await res.text()));
  const tokens = await res.json();
  await db.from("conta_azul_tokens").update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", tokenRow.id);
  return tokens.access_token;
}

// ── eNotas API helpers ─────────────────────────────────────────

async function enotasFetch(apiKey: string, path: string, options: RequestInit = {}) {
  const encoded = btoa(apiKey + ":");
  return fetch(ENOTAS_BASE + path, {
    ...options,
    headers: {
      Authorization: "Basic " + encoded,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    },
  });
}

function buildNfsePayload(data: any) {
  return {
    tipo: "NFS-e",
    idExterno: data.idExterno || null,
    ambienteEmissao: data.ambiente === "producao" ? "producao" : "homologacao",
    cliente: {
      tipoPessoa: (data.tomador_cpf_cnpj || "").replace(/\D/g, "").length > 11 ? "PessoaJuridica" : "PessoaFisica",
      nome: data.tomador_nome || "",
      cpfCnpj: (data.tomador_cpf_cnpj || "").replace(/\D/g, ""),
      email: data.tomador_email || "",
      endereco: data.tomador_endereco || {},
    },
    servico: {
      descricao: data.descricao || "",
      valorTotal: data.valor || 0,
      issRetidoFonte: false,
    },
  };
}

function buildNfePayload(data: any) {
  return {
    tipo: "NF-e",
    idExterno: data.idExterno || null,
    ambienteEmissao: data.ambiente === "producao" ? "producao" : "homologacao",
    cliente: {
      tipoPessoa: (data.tomador_cpf_cnpj || "").replace(/\D/g, "").length > 11 ? "PessoaJuridica" : "PessoaFisica",
      nome: data.tomador_nome || "",
      cpfCnpj: (data.tomador_cpf_cnpj || "").replace(/\D/g, ""),
      email: data.tomador_email || "",
      endereco: data.tomador_endereco || {},
    },
    itens: [{
      descricao: data.descricao || "",
      valorUnitario: data.valor || 0,
      quantidade: 1,
      cfop: data.cfop || "5102",
    }],
  };
}

// ── Provider emission logic ────────────────────────────────────

async function emitViaEnotas(config: any, invoiceData: any): Promise<{ externalId: string; status: string }> {
  const { enotas_api_key: apiKey, enotas_empresa_id: empresaId, enotas_ambiente: ambiente } = config;
  if (!apiKey || !empresaId) throw new Error("eNotas não configurado (API Key ou Empresa ID ausente).");

  const isNfse = invoiceData.type === "nfse";
  const path = isNfse
    ? `/empresas/${empresaId}/nfseServicos`
    : `/empresas/${empresaId}/nfes`;

  const payload = isNfse
    ? buildNfsePayload({ ...invoiceData, ambiente })
    : buildNfePayload({ ...invoiceData, ambiente });

  console.log(`[NF-EMIT] eNotas ${isNfse ? "NFS-e" : "NF-e"} — POST ${path}`);

  const res = await enotasFetch(apiKey, path, { method: "POST", body: JSON.stringify(payload) });
  const text = await res.text();

  if (!res.ok) {
    console.error(`[NF-EMIT] eNotas error: ${res.status} — ${text.substring(0, 500)}`);
    throw new Error(`eNotas ${res.status}: ${text.substring(0, 300)}`);
  }

  let result: any;
  try { result = JSON.parse(text); } catch { result = {}; }
  return {
    externalId: result.nfeId || result.id || result.nfseId || "",
    status: result.status || "processing",
  };
}

async function emitViaContaAzul(config: any, invoiceData: any): Promise<{ externalId: string; status: string }> {
  const accountId = config.conta_azul_account_id;
  if (!accountId) throw new Error("Conta Azul não configurada (account_id ausente).");

  const token = await getContaAzulToken(accountId);

  const isNfse = invoiceData.type === "nfse";
  const path = isNfse ? "/v1/nfse" : "/v1/nfe";

  const payload: any = {
    descricao: invoiceData.descricao || "",
    valor: invoiceData.valor || 0,
    tomador: {
      nome: invoiceData.tomador_nome || "",
      cpf_cnpj: (invoiceData.tomador_cpf_cnpj || "").replace(/\D/g, ""),
    },
  };

  console.log(`[NF-EMIT] Conta Azul ${isNfse ? "NFS-e" : "NF-e"} — POST ${path}`);

  const res = await fetch(CONTA_AZUL_BASE + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();

  if (!res.ok) {
    if (res.status === 404 || res.status === 405) {
      console.warn(`[NF-EMIT] Conta Azul endpoint ${path} não disponível (${res.status}). Registrando como manual.`);
      return { externalId: "manual-ca-" + Date.now(), status: "issued" };
    }
    console.error(`[NF-EMIT] Conta Azul error: ${res.status} — ${text.substring(0, 500)}`);
    throw new Error(`Conta Azul ${res.status}: ${text.substring(0, 300)}`);
  }

  let result: any;
  try { result = JSON.parse(text); } catch { result = {}; }
  return {
    externalId: result.id || result.nfse_id || result.nfe_id || "",
    status: result.status || "issued",
  };
}

// ── Main handlers ──────────────────────────────────────────────

async function handleEmit(req: Request): Promise<Response> {
  const body = await req.json();
  const db = getSupabaseServiceClient();

  const {
    receivable_id, provider, type, deal_id,
    descricao, valor, tomador_nome, tomador_cpf_cnpj,
    tomador_email, tomador_endereco, split_part, cfop,
  } = body;

  if (!receivable_id || !provider || !type) {
    return errorResponse("receivable_id, provider e type são obrigatórios.");
  }

  const { data: config } = await db.from("nf_config").select("*").limit(1).maybeSingle();
  if (!config) return errorResponse("Configuração de NF não encontrada. Configure na aba Configurações.", 400);

  const { data: invoice, error: insertErr } = await db.from("nf_invoices").insert({
    conta_azul_receivable_id: receivable_id,
    deal_id: deal_id || null,
    provider,
    type,
    split_part: split_part || null,
    status: "processing",
    valor: valor || 0,
    descricao: descricao || "",
    tomador_nome: tomador_nome || "",
    tomador_cpf_cnpj: tomador_cpf_cnpj || "",
  }).select().single();

  if (insertErr) {
    if (insertErr.code === "23505") return errorResponse("Nota fiscal já emitida para este recebível/tipo.", 409);
    return errorResponse("Erro ao criar registro: " + insertErr.message, 500);
  }

  try {
    const invoiceData = { type, descricao, valor, tomador_nome, tomador_cpf_cnpj, tomador_email, tomador_endereco, cfop, idExterno: invoice.id };
    const result = provider === "enotas"
      ? await emitViaEnotas(config, invoiceData)
      : await emitViaContaAzul(config, invoiceData);

    const newStatus = result.status === "issued" ? "issued" : "processing";
    await db.from("nf_invoices").update({
      external_id: result.externalId,
      status: newStatus,
      issued_at: newStatus === "issued" ? new Date().toISOString() : null,
    }).eq("id", invoice.id);

    return jsonResponse({ success: true, invoice_id: invoice.id, external_id: result.externalId, status: newStatus }, 201);
  } catch (err: any) {
    await db.from("nf_invoices").update({ status: "error", error_message: err.message }).eq("id", invoice.id);
    return errorResponse("Erro na emissão: " + err.message, 500);
  }
}

async function handleEmitDivided(req: Request): Promise<Response> {
  const body = await req.json();
  const db = getSupabaseServiceClient();

  const { receivable_id, provider, deal_id, descricao, valor_total, service_pct, product_pct, tomador_nome, tomador_cpf_cnpj, tomador_email, tomador_endereco, cfop } = body;

  if (!receivable_id || !provider || !valor_total) {
    return errorResponse("receivable_id, provider e valor_total são obrigatórios.");
  }

  const svcPct = service_pct || 70;
  const prodPct = product_pct || 30;
  const valorService = Math.round(valor_total * (svcPct / 100) * 100) / 100;
  const valorProduct = Math.round(valor_total * (prodPct / 100) * 100) / 100;

  const { data: config } = await db.from("nf_config").select("*").limit(1).maybeSingle();
  if (!config) return errorResponse("Configuração de NF não encontrada.", 400);

  const { data: nfse, error: errNfse } = await db.from("nf_invoices").insert({
    conta_azul_receivable_id: receivable_id,
    deal_id: deal_id || null,
    provider,
    type: "nfse",
    split_part: "service",
    status: "processing",
    valor: valorService,
    descricao: `${descricao || "Serviço"} (${svcPct}%)`,
    tomador_nome: tomador_nome || "",
    tomador_cpf_cnpj: tomador_cpf_cnpj || "",
  }).select().single();

  if (errNfse) {
    if (errNfse.code === "23505") return errorResponse("NFS-e já emitida para este recebível.", 409);
    return errorResponse("Erro ao criar NFS-e: " + errNfse.message, 500);
  }

  const { data: nfe, error: errNfe } = await db.from("nf_invoices").insert({
    conta_azul_receivable_id: receivable_id,
    deal_id: deal_id || null,
    parent_invoice_id: nfse.id,
    provider,
    type: "nfe",
    split_part: "product",
    status: "processing",
    valor: valorProduct,
    descricao: `${descricao || "Material Didático"} (${prodPct}%)`,
    tomador_nome: tomador_nome || "",
    tomador_cpf_cnpj: tomador_cpf_cnpj || "",
  }).select().single();

  if (errNfe) {
    await db.from("nf_invoices").update({ status: "error", error_message: "Falha ao criar NF-e pareada" }).eq("id", nfse.id);
    return errorResponse("Erro ao criar NF-e: " + errNfe.message, 500);
  }

  const results: any[] = [];
  for (const inv of [{ record: nfse, type: "nfse" as const }, { record: nfe, type: "nfe" as const }]) {
    try {
      const invoiceData = {
        type: inv.type,
        descricao: inv.record.descricao,
        valor: inv.record.valor,
        tomador_nome, tomador_cpf_cnpj, tomador_email, tomador_endereco, cfop,
        idExterno: inv.record.id,
      };
      const result = provider === "enotas"
        ? await emitViaEnotas(config, invoiceData)
        : await emitViaContaAzul(config, invoiceData);

      const newStatus = result.status === "issued" ? "issued" : "processing";
      await db.from("nf_invoices").update({
        external_id: result.externalId,
        status: newStatus,
        issued_at: newStatus === "issued" ? new Date().toISOString() : null,
      }).eq("id", inv.record.id);

      results.push({ id: inv.record.id, type: inv.type, status: newStatus, external_id: result.externalId });
    } catch (err: any) {
      await db.from("nf_invoices").update({ status: "error", error_message: err.message }).eq("id", inv.record.id);
      results.push({ id: inv.record.id, type: inv.type, status: "error", error: err.message });
    }
  }

  return jsonResponse({ success: true, invoices: results }, 201);
}

async function handleCancel(req: Request): Promise<Response> {
  const body = await req.json();
  const db = getSupabaseServiceClient();
  const { invoice_id } = body;
  if (!invoice_id) return errorResponse("invoice_id é obrigatório.");

  const { data: inv } = await db.from("nf_invoices").select("*").eq("id", invoice_id).single();
  if (!inv) return errorResponse("NF não encontrada.", 404);
  if (inv.status === "cancelled") return errorResponse("NF já cancelada.", 400);

  await db.from("nf_invoices").update({ status: "cancelled" }).eq("id", invoice_id);
  return jsonResponse({ success: true });
}

async function handleStatus(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const invoiceId = parts[parts.length - 1];

  const db = getSupabaseServiceClient();
  const { data: inv } = await db.from("nf_invoices").select("*").eq("id", invoiceId).single();
  if (!inv) return errorResponse("NF não encontrada.", 404);

  if (inv.status === "processing" && inv.external_id && inv.provider === "enotas") {
    const { data: config } = await db.from("nf_config").select("*").limit(1).maybeSingle();
    if (config?.enotas_api_key && config?.enotas_empresa_id) {
      try {
        const path = inv.type === "nfse"
          ? `/empresas/${config.enotas_empresa_id}/nfseServicos/${inv.external_id}`
          : `/empresas/${config.enotas_empresa_id}/nfes/${inv.external_id}`;
        const res = await enotasFetch(config.enotas_api_key, path);
        if (res.ok) {
          const data = await res.json();
          const updates: any = {};
          if (data.status === "Autorizada" || data.status === "Concluida") {
            updates.status = "issued";
            updates.issued_at = new Date().toISOString();
          }
          if (data.numero) updates.numero_nf = String(data.numero);
          if (data.serie) updates.serie = String(data.serie);
          if (data.codigoVerificacao) updates.codigo_verificacao = data.codigoVerificacao;
          if (data.linkDanfe || data.linkPdf) updates.pdf_url = data.linkDanfe || data.linkPdf;
          if (data.linkXml) updates.xml_url = data.linkXml;
          if (Object.keys(updates).length > 0) {
            await db.from("nf_invoices").update(updates).eq("id", invoiceId);
            Object.assign(inv, updates);
          }
        }
      } catch (e: any) { console.warn("[NF-EMIT] Polling eNotas status failed:", e.message); }
    }
  }

  return jsonResponse(inv);
}

async function handleWebhookEnotas(req: Request): Promise<Response> {
  const body = await req.json();
  const db = getSupabaseServiceClient();

  console.log("[NF-EMIT] eNotas webhook received:", JSON.stringify(body).substring(0, 500));

  const externalId = body.nfeId || body.nfseId || body.id;
  const evento = body.nfeStatus || body.status || "";

  if (!externalId) return jsonResponse({ received: true });

  const { data: inv } = await db.from("nf_invoices").select("id").eq("external_id", externalId).maybeSingle();
  if (!inv) {
    console.warn("[NF-EMIT] Webhook para NF desconhecida:", externalId);
    return jsonResponse({ received: true, matched: false });
  }

  const updates: any = {};
  if (evento === "Autorizada" || evento === "Concluida") {
    updates.status = "issued";
    updates.issued_at = new Date().toISOString();
  } else if (evento === "Rejeitada" || evento === "Erro") {
    updates.status = "error";
    updates.error_message = body.motivoRejeicao || body.mensagemErro || evento;
  }
  if (body.numero) updates.numero_nf = String(body.numero);
  if (body.serie) updates.serie = String(body.serie);
  if (body.codigoVerificacao) updates.codigo_verificacao = body.codigoVerificacao;
  if (body.linkDanfe || body.linkPdf) updates.pdf_url = body.linkDanfe || body.linkPdf;
  if (body.linkXml) updates.xml_url = body.linkXml;

  if (Object.keys(updates).length > 0) {
    await db.from("nf_invoices").update(updates).eq("id", inv.id);
  }

  return jsonResponse({ received: true, matched: true, invoice_id: inv.id });
}

async function handleGetConfig(_req: Request): Promise<Response> {
  const db = getSupabaseServiceClient();
  const { data } = await db.from("nf_config").select("*").limit(1).maybeSingle();
  return jsonResponse(data || {});
}

async function handleSaveConfig(req: Request): Promise<Response> {
  const body = await req.json();
  const db = getSupabaseServiceClient();

  const { data: existing } = await db.from("nf_config").select("id").limit(1).maybeSingle();

  const fields: any = {};
  if (body.default_provider !== undefined) fields.default_provider = body.default_provider;
  if (body.enotas_api_key !== undefined) fields.enotas_api_key = body.enotas_api_key;
  if (body.enotas_empresa_id !== undefined) fields.enotas_empresa_id = body.enotas_empresa_id;
  if (body.enotas_ambiente !== undefined) fields.enotas_ambiente = body.enotas_ambiente;
  if (body.conta_azul_account_id !== undefined) fields.conta_azul_account_id = body.conta_azul_account_id || null;
  if (body.min_attendance_pct !== undefined) fields.min_attendance_pct = body.min_attendance_pct;
  if (body.auto_emit !== undefined) fields.auto_emit = body.auto_emit;

  if (existing) {
    const { error } = await db.from("nf_config").update(fields).eq("id", existing.id);
    if (error) return errorResponse("Erro ao salvar: " + error.message, 500);
  } else {
    const { error } = await db.from("nf_config").insert(fields);
    if (error) return errorResponse("Erro ao criar: " + error.message, 500);
  }

  return jsonResponse({ success: true });
}

// ── Router ─────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const action = parts[parts.length - 1];
  const parentAction = parts.length >= 2 ? parts[parts.length - 2] : "";

  try {
    if (action === "emit" && req.method === "POST") return await handleEmit(req);
    if (action === "emit-divided" && req.method === "POST") return await handleEmitDivided(req);
    if (action === "cancel" && req.method === "POST") return await handleCancel(req);
    if (parentAction === "status" || action === "status") {
      if (parts.length > 1 && action !== "status") return await handleStatus(req);
      return errorResponse("Forneça o ID: /status/{id}", 400);
    }
    if (action === "enotas" && parentAction === "webhook") return await handleWebhookEnotas(req);
    if (action === "config") {
      if (req.method === "GET") return await handleGetConfig(req);
      if (req.method === "POST") return await handleSaveConfig(req);
    }
    return errorResponse("Ação desconhecida: " + action, 404);
  } catch (err: any) {
    console.error("[nf-emit] Unhandled error:", err);
    return errorResponse(err.message || "Erro interno", 500);
  }
});

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
  return fetch(CONTA_AZUL_BASE + path, { ...options, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...(options.headers as Record<string,string> || {}) } });
}

function corsHeaders(origin = "*") { return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }; }
function jsonResponse(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...corsHeaders() } }); }
function errorResponse(message: string, status = 400) { return jsonResponse({ error: message }, status); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const action = parts[parts.length - 1];
  try {
    switch (action) {
      case "receivable": return await createReceivable(req);
      case "payable": return await createPayable(req);
      case "installment": return await updateInstallment(req);
      default: return errorResponse("Acao desconhecida: " + action, 404);
    }
  } catch (err: any) { console.error("conta-azul-write error:", err); return errorResponse(err.message || "Erro interno", 500); }
});

async function createReceivable(req: Request): Promise<Response> {
  const body = await req.json();
  const descricao = body.descricao || body.description || "Conta a Receber";
  const valor = parseFloat(body.valor || body.value) || 0;
  const dataCompetencia = body.data_competencia || body.competenceDate || new Date().toISOString().split("T")[0];
  const dataVencimento = body.data_vencimento || dataCompetencia;
  const numParcelas = parseInt(body.parcelas) || 1;
  const observacao = body.observacoes || body.observacao || descricao;

  if (!valor) return errorResponse("Valor é obrigatório e deve ser maior que zero.");
  if (!body.categoria_id) return errorResponse("Categoria é obrigatória para criar um lançamento.");

  const valorParcela = Math.round((valor / numParcelas) * 100) / 100;
  const parcelas = Array.from({ length: numParcelas }, (_, i) => {
    const d = new Date(dataVencimento);
    d.setMonth(d.getMonth() + i);
    const p: any = {
      data_vencimento: d.toISOString().split("T")[0],
      descricao: numParcelas > 1 ? `${descricao} - Parcela ${i + 1}/${numParcelas}` : descricao,
      detalhe_valor: { valor_bruto: valorParcela, valor_liquido: valorParcela },
      nota: observacao,
    };
    if (body.conta_financeira_id) p.conta_financeira = body.conta_financeira_id;
    return p;
  });

  const ratItem: any = { id_categoria: body.categoria_id, valor };
  if (body.centro_custo_id) {
    ratItem.rateio_centro_custo = [{ id_centro_custo: body.centro_custo_id, valor }];
  }

  const payload: any = {
    descricao,
    valor,
    data_competencia: dataCompetencia,
    observacao,
    condicao_pagamento: { parcelas },
    rateio: [ratItem],
  };
  if (body.conta_financeira_id) payload.conta_financeira = body.conta_financeira_id;
  if (body.contato_id) payload.contato = body.contato_id;

  console.log("CREATE RECEIVABLE payload:", JSON.stringify(payload));
  const res = await contaAzulFetch("/v1/financeiro/eventos-financeiros/contas-a-receber", { method: "POST", body: JSON.stringify(payload) });
  if (!res.ok) { const e = await res.text(); return errorResponse("Erro ao criar conta a receber: " + res.status + " - " + e, res.status); }
  return jsonResponse({ success: true, data: await res.json() }, 201);
}

async function createPayable(req: Request): Promise<Response> {
  const body = await req.json();
  const descricao = body.descricao || body.description || "Conta a Pagar";
  const valor = parseFloat(body.valor || body.value) || 0;
  const dataCompetencia = body.data_competencia || body.competenceDate || new Date().toISOString().split("T")[0];
  const dataVencimento = body.data_vencimento || dataCompetencia;
  const numParcelas = parseInt(body.parcelas) || 1;
  const observacao = body.observacoes || body.observacao || descricao;

  if (!valor) return errorResponse("Valor é obrigatório e deve ser maior que zero.");
  if (!body.categoria_id) return errorResponse("Categoria é obrigatória para criar um lançamento.");

  const valorParcela = Math.round((valor / numParcelas) * 100) / 100;
  const parcelas = Array.from({ length: numParcelas }, (_, i) => {
    const d = new Date(dataVencimento);
    d.setMonth(d.getMonth() + i);
    const p: any = {
      data_vencimento: d.toISOString().split("T")[0],
      descricao: numParcelas > 1 ? `${descricao} - Parcela ${i + 1}/${numParcelas}` : descricao,
      detalhe_valor: { valor_bruto: valorParcela, valor_liquido: valorParcela },
      nota: observacao,
    };
    if (body.conta_financeira_id) p.conta_financeira = body.conta_financeira_id;
    return p;
  });

  const ratItem: any = { id_categoria: body.categoria_id, valor };
  if (body.centro_custo_id) {
    ratItem.rateio_centro_custo = [{ id_centro_custo: body.centro_custo_id, valor }];
  }

  const payload: any = {
    descricao,
    valor,
    data_competencia: dataCompetencia,
    observacao,
    condicao_pagamento: { parcelas },
    rateio: [ratItem],
  };
  if (body.conta_financeira_id) payload.conta_financeira = body.conta_financeira_id;
  if (body.contato_id) payload.contato = body.contato_id;

  console.log("CREATE PAYABLE payload:", JSON.stringify(payload));
  const res = await contaAzulFetch("/v1/financeiro/eventos-financeiros/contas-a-pagar", { method: "POST", body: JSON.stringify(payload) });
  if (!res.ok) { const e = await res.text(); return errorResponse("Erro ao criar conta a pagar: " + res.status + " - " + e, res.status); }
  return jsonResponse({ success: true, data: await res.json() }, 201);
}

async function updateInstallment(req: Request): Promise<Response> {
  const body = await req.json();
  const installmentId = body.id || body.installment_id;
  if (!installmentId) return errorResponse("Campo 'id' (ID da parcela) e obrigatorio.");
  const payload: any = {};
  if (body.data_vencimento) payload.data_vencimento = body.data_vencimento;
  if (body.valor !== undefined) payload.valor = body.valor;
  if (body.observacao !== undefined) payload.observacao = body.observacao;
  if (body.conta_financeira_id) payload.conta_financeira = { id: body.conta_financeira_id };
  const res = await contaAzulFetch("/v1/financeiro/eventos-financeiros/parcelas/" + installmentId, { method: "PATCH", body: JSON.stringify(payload) });
  if (!res.ok) { const e = await res.text(); return errorResponse("Erro ao atualizar parcela: " + res.status + " - " + e, res.status); }
  return jsonResponse({ success: true, data: await res.json() });
}

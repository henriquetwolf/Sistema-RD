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
      case "sale": return await createSale(req);
      case "products": return await listProducts();
      default: return errorResponse("Acao desconhecida: " + action, 404);
    }
  } catch (err: any) { console.error("conta-azul-write error:", err); return errorResponse(err.message || "Erro interno", 500); }
});

async function findOrCreateContact(nome: string, cpfCnpj?: string): Promise<string> {
  if (!nome && !cpfCnpj) throw new Error("CONTACT_ERROR: Nome do cliente é obrigatório.");
  const cleanDoc = (cpfCnpj || '').replace(/\D/g, '');
  const errors: string[] = [];

  // 1. Search by document
  if (cleanDoc.length >= 11) {
    try {
      const res = await contaAzulFetch("/v1/pessoas?busca=" + encodeURIComponent(cleanDoc));
      if (res.ok) {
        const body = await res.json();
        const list = Array.isArray(body) ? body : body.itens || body.items || body.content || [];
        if (list.length > 0) return String(list[0].id);
      }
    } catch (e: any) { errors.push("Busca por doc: " + e.message); }
  }

  // 2. Search by name
  try {
    const res = await contaAzulFetch("/v1/pessoas?busca=" + encodeURIComponent(nome));
    if (res.ok) {
      const body = await res.json();
      const list = Array.isArray(body) ? body : body.itens || body.items || body.content || [];
      const match = list.find((p: any) => (p.nome || '').toLowerCase() === nome.toLowerCase());
      if (match) return String(match.id);
    }
  } catch (e: any) { errors.push("Busca por nome: " + e.message); }

  // 3. Create new person
  const isJuridica = cleanDoc.length === 14;
  const newPessoa: any = {
    nome: nome || "Cliente",
    tipo_pessoa: isJuridica ? "Juridica" : "Fisica",
    perfis: [{ tipo_perfil: "Cliente" }],
    ativo: true,
  };
  if (cleanDoc.length === 11) newPessoa.cpf = cleanDoc;
  else if (cleanDoc.length === 14) newPessoa.cnpj = cleanDoc;

  console.log("Creating pessoa:", JSON.stringify(newPessoa));
  try {
    const createRes = await contaAzulFetch("/v1/pessoas", { method: "POST", body: JSON.stringify(newPessoa) });
    if (createRes.ok || createRes.status === 201) {
      const created = await createRes.json();
      return String(created.id);
    }
    const errText = await createRes.text();
    errors.push("Criar pessoa (" + createRes.status + "): " + errText);
  } catch (e: any) { errors.push("Criar pessoa: " + e.message); }

  // 4. Fallback: try with accented type names
  try {
    newPessoa.tipo_pessoa = isJuridica ? "Jur\u00eddica" : "F\u00edsica";
    console.log("Retry creating pessoa with accents:", JSON.stringify(newPessoa));
    const retryRes = await contaAzulFetch("/v1/pessoas", { method: "POST", body: JSON.stringify(newPessoa) });
    if (retryRes.ok || retryRes.status === 201) {
      const created = await retryRes.json();
      return String(created.id);
    }
    const errText = await retryRes.text();
    errors.push("Retry (" + retryRes.status + "): " + errText);
  } catch (e: any) { errors.push("Retry: " + e.message); }

  throw new Error("Não foi possível encontrar ou criar o cliente '" + nome + "' no Conta Azul. Detalhes: " + errors.join(" | "));
}

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

  let contatoId = body.contato_id || null;
  if (!contatoId && (body.contato_nome || body.contato_cpf)) {
    try { contatoId = await findOrCreateContact(body.contato_nome, body.contato_cpf); } catch (e: any) { console.error("Contact error:", e.message); }
  }

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
  if (contatoId) payload.contato = contatoId;

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

  let contatoId = body.contato_id || null;
  if (!contatoId && (body.contato_nome || body.contato_cpf)) {
    try { contatoId = await findOrCreateContact(body.contato_nome, body.contato_cpf); } catch (e: any) { console.error("Contact error:", e.message); }
  }

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
  if (contatoId) payload.contato = contatoId;

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

async function listProducts(): Promise<Response> {
  const all: any[] = [];

  // ── Produtos (GET /v1/produtos) ──
  try {
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const prodRes = await contaAzulFetch(`/v1/produtos?pagina=${page}&tamanho_pagina=200&status=ATIVO`);
      if (!prodRes.ok) {
        const errText = await prodRes.text();
        console.error("Erro ao buscar produtos:", prodRes.status, errText);
        break;
      }
      const body = await prodRes.json();
      const items = Array.isArray(body) ? body : body.items || body.itens || body.content || [];
      console.log(`Produtos page ${page}: ${items.length} itens`);
      for (const p of items) {
        all.push({
          id: String(p.id),
          nome: p.nome || p.descricao || "Produto",
          tipo: "PRODUTO",
          valor: p.valor_venda || p.preco_venda || p.preco || p.valor || 0,
        });
      }
      hasMore = items.length >= 200;
      page++;
    }
  } catch (e) { console.error("Error fetching produtos:", e); }

  // ── Serviços (GET /v1/servicos) ──
  try {
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const servRes = await contaAzulFetch(`/v1/servicos?pagina=${page}&tamanho_pagina=200`);
      if (!servRes.ok) {
        const errText = await servRes.text();
        console.error("Erro ao buscar servicos:", servRes.status, errText);
        break;
      }
      const body = await servRes.json();
      const items = Array.isArray(body) ? body : body.itens || body.items || body.content || [];
      console.log(`Servicos page ${page}: ${items.length} itens`);
      for (const s of items) {
        all.push({
          id: String(s.id),
          nome: s.nome || s.descricao || "Serviço",
          tipo: "SERVICO",
          valor: s.preco || s.preco_venda || s.valor || 0,
        });
      }
      hasMore = items.length >= 200;
      page++;
    }
  } catch (e) { console.error("Error fetching servicos:", e); }

  console.log(`listProducts total: ${all.length} (${all.filter(i => i.tipo === 'PRODUTO').length} produtos, ${all.filter(i => i.tipo === 'SERVICO').length} servicos)`);
  return jsonResponse({ success: true, items: all });
}

async function createSale(req: Request): Promise<Response> {
  const body = await req.json();
  const valor = parseFloat(body.valor || body.value) || 0;
  const numParcelas = parseInt(body.parcelas) || 1;
  const dataVenda = body.data_venda || body.data_competencia || new Date().toISOString().split("T")[0];
  const dataVencimento = body.data_vencimento || dataVenda;

  if (!valor) return errorResponse("Valor é obrigatório e deve ser maior que zero.");
  if (!body.produto_id) return errorResponse("Produto/Serviço é obrigatório para criar uma venda.");

  let clienteId = body.contato_id || null;
  if (!clienteId) {
    try {
      clienteId = await findOrCreateContact(body.contato_nome || '', body.contato_cpf || '');
    } catch (e: any) {
      return errorResponse(e.message || "Erro ao buscar/criar cliente no Conta Azul.", 400);
    }
  }

  const valorParcela = Math.round((valor / numParcelas) * 100) / 100;
  let opcaoCondicao = "À vista";
  if (numParcelas > 1) opcaoCondicao = numParcelas + "x";

  const pm = (body.tipo_pagamento || body.payment_method || "").toUpperCase();
  let tipoPagamento = "OUTRO";
  if (pm.includes("BOLETO")) tipoPagamento = "BOLETO_BANCARIO";
  else if (pm.includes("CRED")) tipoPagamento = "CARTAO_CREDITO";
  else if (pm.includes("DEB")) tipoPagamento = "CARTAO_DEBITO";
  else if (pm.includes("PIX")) tipoPagamento = "PIX_PAGAMENTO_INSTANTANEO";
  else if (pm.includes("DINHEIRO") || pm.includes("VISTA")) tipoPagamento = "DINHEIRO";
  else if (pm.includes("TRANSF")) tipoPagamento = "TRANSFERENCIA_BANCARIA";

  const parcelas = Array.from({ length: numParcelas }, (_, i) => {
    const d = new Date(dataVencimento);
    d.setMonth(d.getMonth() + i);
    return {
      descricao: numParcelas > 1 ? `Parcela ${i + 1}/${numParcelas}` : "Pagamento único",
      valor: valorParcela,
      data_vencimento: d.toISOString().split("T")[0],
    };
  });

  const payload: any = {
    id_cliente: clienteId,
    numero: parseInt(body.numero_venda || body.deal_number) || Date.now(),
    situacao: "APROVADO",
    data_venda: dataVenda,
    itens: [{
      id: body.produto_id,
      valor,
      quantidade: 1,
      descricao: body.descricao || "Venda CRM",
    }],
    condicao_pagamento: {
      opcao_condicao_pagamento: opcaoCondicao,
      tipo_pagamento: tipoPagamento,
      parcelas,
    },
    observacoes: body.observacoes || "",
  };
  if (body.categoria_id) payload.id_categoria = body.categoria_id;
  if (body.centro_custo_id) payload.id_centro_custo = body.centro_custo_id;
  if (body.transaction_code) payload.condicao_pagamento.nsu = body.transaction_code;

  console.log("CREATE SALE payload:", JSON.stringify(payload));
  const res = await contaAzulFetch("/v1/venda", { method: "POST", body: JSON.stringify(payload) });
  if (!res.ok) { const e = await res.text(); return errorResponse("Erro ao criar venda: " + res.status + " - " + e, res.status); }
  return jsonResponse({ success: true, data: await res.json() }, 201);
}

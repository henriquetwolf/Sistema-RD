import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CONTA_AZUL_BASE = "https://api-v2.contaazul.com";
const CONTA_AZUL_AUTH_BASE = "https://auth.contaazul.com/oauth2";

function getSupabaseServiceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function getAccountCredentials(accountId: string) {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("conta_azul_accounts")
    .select("client_id, client_secret")
    .eq("id", accountId)
    .single();
  if (error || !data) throw new Error("Conta não encontrada: " + accountId);
  return { clientId: data.client_id, clientSecret: data.client_secret };
}

let _currentAccountId = "";

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

async function contaAzulFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getValidAccessToken(_currentAccountId);
  return fetch(CONTA_AZUL_BASE + path, {
    ...options,
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...(options.headers as Record<string,string> || {}) },
  });
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
      case "products": return await listProducts(req);
      case "create-cost-center": return await createCostCenter(req);
      case "debug-services": return await debugServices(req);
      default: return errorResponse("Acao desconhecida: " + action, 404);
    }
  } catch (err: any) { console.error("conta-azul-write error:", err); return errorResponse(err.message || "Erro interno", 500); }
});

function setAccountFromBody(body: any): string {
  const accountId = body?.account_id;
  if (!accountId) throw new Error("Campo 'account_id' é obrigatório.");
  _currentAccountId = accountId;
  return accountId;
}

interface ContactExtra {
  email?: string;
  telefone?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
}

function buildAddressObj(extra: ContactExtra): any | null {
  if (!extra.endereco && !extra.cidade && !extra.cep) return null;
  const addr: any = {};
  if (extra.endereco) addr.logradouro = extra.endereco;
  if (extra.numero) addr.numero = extra.numero;
  if (extra.bairro) addr.bairro = extra.bairro;
  if (extra.cidade) addr.cidade = extra.cidade;
  if (extra.uf) addr.estado = extra.uf;
  if (extra.cep) addr.cep = (extra.cep || '').replace(/\D/g, '');
  return addr;
}

function cleanPhone(tel?: string): string | null {
  if (!tel) return null;
  const clean = tel.replace(/\D/g, '');
  if (clean.length < 8) return null;
  return clean;
}

async function patchContactIfNeeded(pessoaId: string, existing: any, extra: ContactExtra): Promise<void> {
  const updates: any = {};
  if (extra.email && !existing.email) updates.email = extra.email;
  if (extra.telefone && !existing.telefone_celular) {
    const phone = cleanPhone(extra.telefone);
    if (phone) updates.telefone_celular = phone;
  }
  const existingAddrs = existing.enderecos || [];
  const hasAddr = existingAddrs.length > 0 && (existingAddrs[0].logradouro || existingAddrs[0].cidade);
  if (!hasAddr && (extra.endereco || extra.cidade || extra.cep)) {
    const addr = buildAddressObj(extra);
    if (addr) updates.enderecos = [addr];
  }
  if (Object.keys(updates).length === 0) return;
  try {
    console.log(`PATCH /v1/pessoas/${pessoaId}:`, JSON.stringify(updates));
    await contaAzulFetch(`/v1/pessoas/${pessoaId}`, { method: "PATCH", body: JSON.stringify(updates) });
  } catch (e: any) { console.warn("patchContactIfNeeded erro:", e.message); }
}

function extractContactExtra(body: any): ContactExtra {
  return {
    email: body.contato_email || '',
    telefone: body.contato_telefone || '',
    endereco: body.contato_endereco || '',
    numero: body.contato_numero || '',
    bairro: body.contato_bairro || '',
    cidade: body.contato_cidade || '',
    uf: body.contato_uf || '',
    cep: body.contato_cep || '',
  };
}

async function findOrCreateContact(nome: string, cpfCnpj?: string, extra: ContactExtra = {}): Promise<string> {
  if (!nome && !cpfCnpj) throw new Error("CONTACT_ERROR: Nome do cliente é obrigatório.");
  const cleanDoc = (cpfCnpj || '').replace(/\D/g, '');
  const errors: string[] = [];

  if (cleanDoc.length >= 11) {
    try {
      const res = await contaAzulFetch("/v1/pessoas?busca=" + encodeURIComponent(cleanDoc));
      if (res.ok) {
        const body = await res.json();
        const list = Array.isArray(body) ? body : body.itens || body.items || body.content || [];
        if (list.length > 0) {
          const found = list[0];
          await patchContactIfNeeded(String(found.id), found, extra);
          return String(found.id);
        }
      }
    } catch (e: any) { errors.push("Busca por doc: " + e.message); }
  }

  try {
    const res = await contaAzulFetch("/v1/pessoas?busca=" + encodeURIComponent(nome));
    if (res.ok) {
      const body = await res.json();
      const list = Array.isArray(body) ? body : body.itens || body.items || body.content || [];
      const match = list.find((p: any) => (p.nome || '').toLowerCase() === nome.toLowerCase());
      if (match) {
        await patchContactIfNeeded(String(match.id), match, extra);
        return String(match.id);
      }
    }
  } catch (e: any) { errors.push("Busca por nome: " + e.message); }

  const isJuridica = cleanDoc.length === 14;
  const newPessoa: any = {
    nome: nome || "Cliente",
    tipo_pessoa: isJuridica ? "Juridica" : "Fisica",
    perfis: [{ tipo_perfil: "Cliente" }],
    ativo: true,
  };
  if (cleanDoc.length === 11) newPessoa.cpf = cleanDoc;
  else if (cleanDoc.length === 14) newPessoa.cnpj = cleanDoc;
  if (extra.email) newPessoa.email = extra.email;
  const phone = cleanPhone(extra.telefone);
  if (phone) newPessoa.telefone_celular = phone;
  const addr = buildAddressObj(extra);
  if (addr) newPessoa.enderecos = [addr];

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

async function findOrCreateSeller(nome: string): Promise<string | null> {
  if (!nome) return null;
  try {
    const res = await contaAzulFetch("/v1/pessoas?busca=" + encodeURIComponent(nome));
    if (res.ok) {
      const body = await res.json();
      const list = Array.isArray(body) ? body : body.itens || body.items || body.content || [];
      const match = list.find((p: any) => {
        const perfis = p.perfis || [];
        const isVendedor = perfis.some((pf: any) => (pf.tipo_perfil || '').toLowerCase().includes('vendedor'));
        return (p.nome || '').toLowerCase() === nome.toLowerCase() && isVendedor;
      });
      if (match) return String(match.id);
      const nameMatch = list.find((p: any) => (p.nome || '').toLowerCase() === nome.toLowerCase());
      if (nameMatch) return String(nameMatch.id);
    }
  } catch (e: any) { console.error("findOrCreateSeller busca:", e.message); }

  try {
    const newPessoa = { nome, tipo_pessoa: "Fisica", ativo: true };
    const createRes = await contaAzulFetch("/v1/pessoas", { method: "POST", body: JSON.stringify(newPessoa) });
    if (createRes.ok || createRes.status === 201) {
      const created = await createRes.json();
      console.log(`findOrCreateSeller: criado vendedor "${nome}" id=${created.id}`);
      return String(created.id);
    }
    const errText = await createRes.text();
    console.warn(`findOrCreateSeller: falha ao criar vendedor (${createRes.status}): ${errText.substring(0, 200)}`);
    if (errText.toLowerCase().includes("existe") || errText.toLowerCase().includes("duplicad")) {
      const retry = await contaAzulFetch("/v1/pessoas?busca=" + encodeURIComponent(nome));
      if (retry.ok) {
        const body = await retry.json();
        const list = Array.isArray(body) ? body : body.itens || body.items || body.content || [];
        const m = list.find((p: any) => (p.nome || '').toLowerCase() === nome.toLowerCase());
        if (m) return String(m.id);
      }
    }
  } catch (e: any) { console.error("findOrCreateSeller criar:", e.message); }

  console.warn(`findOrCreateSeller: não foi possível resolver vendedor "${nome}", prosseguindo sem.`);
  return null;
}

async function ensureCostCenterExists(centroCustoId: string, centroCustoNome: string): Promise<string | null> {
  const check = await contaAzulFetch(`/v1/centro-de-custo/${centroCustoId}`, { method: "GET" });
  if (check.ok) return centroCustoId;

  console.log(`ensureCostCenterExists: ID ${centroCustoId} não encontrado na API.`);

  const saveToDB = async (id: string, nome: string) => {
    const db = getSupabaseServiceClient();
    await db.from("conta_azul_centros_custo").upsert({
      account_id: _currentAccountId,
      id_conta_azul: id,
      nome,
      ativo: true,
      synced_at: new Date().toISOString(),
    }, { onConflict: "account_id,id_conta_azul" });
  };

  if (centroCustoNome) {
    const normalName = centroCustoNome.toLowerCase().trim();

    try {
      console.log(`ensureCostCenterExists: buscando por nome "${centroCustoNome}" na lista...`);
      const listRes = await contaAzulFetch("/v1/centro-de-custo");
      if (listRes.ok) {
        const body = await listRes.json();
        const list = Array.isArray(body) ? body : body.content || body.data || body.items || body.itens || [];
        const match = list.find((cc: any) => (cc.nome || '').toLowerCase().trim() === normalName);
        if (match) {
          const foundId = String(match.id);
          console.log(`ensureCostCenterExists: encontrado na lista com id ${foundId}`);
          await saveToDB(foundId, match.nome || centroCustoNome);
          return foundId;
        }
        console.log(`ensureCostCenterExists: não encontrado na lista (${list.length} itens), tentando criar...`);
      }
    } catch (e: any) {
      console.error("ensureCostCenterExists: erro ao buscar lista:", e.message);
    }

    try {
      const res = await contaAzulFetch("/v1/centro-de-custo", { method: "POST", body: JSON.stringify({ nome: centroCustoNome }) });
      if (res.ok) {
        const created = await res.json();
        const newId = String(created.id);
        console.log(`ensureCostCenterExists: criado "${centroCustoNome}" com id ${newId}`);
        await saveToDB(newId, created.nome || centroCustoNome);
        return newId;
      }
      const errText = await res.text();
      console.warn(`ensureCostCenterExists: POST falhou (${res.status}): ${errText.substring(0, 300)}`);
    } catch (e: any) {
      console.error("ensureCostCenterExists: erro ao criar:", e.message);
    }
  }

  console.warn(`ensureCostCenterExists: não foi possível resolver o centro de custo, prosseguindo sem ele.`);
  return null;
}

async function createReceivable(req: Request): Promise<Response> {
  const body = await req.json();
  setAccountFromBody(body);
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
    try { contatoId = await findOrCreateContact(body.contato_nome, body.contato_cpf, extractContactExtra(body)); } catch (e: any) { console.error("Contact error:", e.message); }
  }

  const valorEntrada = Math.max(parseFloat(body.valor_entrada) || 0, 0);
  const valorRestante = Math.round((valor - valorEntrada) * 100) / 100;
  const valorParcelaBase = Math.floor((valorRestante / numParcelas) * 100) / 100;
  const valorUltimaParcela = Math.round((valorRestante - valorParcelaBase * (numParcelas - 1)) * 100) / 100;

  const parcelas: any[] = [];

  if (valorEntrada > 0) {
    const pe: any = {
      data_vencimento: dataCompetencia,
      descricao: `${descricao} - Entrada`,
      detalhe_valor: { valor_bruto: valorEntrada, valor_liquido: valorEntrada },
      nota: observacao,
    };
    if (body.conta_financeira_id) pe.conta_financeira = body.conta_financeira_id;
    parcelas.push(pe);
  }

  for (let i = 0; i < numParcelas; i++) {
    const d = new Date(dataVencimento);
    d.setMonth(d.getMonth() + i);
    const isLast = i === numParcelas - 1;
    const vp = isLast ? valorUltimaParcela : valorParcelaBase;
    const p: any = {
      data_vencimento: d.toISOString().split("T")[0],
      descricao: numParcelas > 1 ? `${descricao} - Parcela ${i + 1}/${numParcelas}` : descricao,
      detalhe_valor: { valor_bruto: vp, valor_liquido: vp },
      nota: observacao,
    };
    if (body.conta_financeira_id) p.conta_financeira = body.conta_financeira_id;
    parcelas.push(p);
  }

  const ratItem: any = { id_categoria: body.categoria_id, valor };
  if (body.centro_custo_id) {
    const validCcId = await ensureCostCenterExists(body.centro_custo_id, body.centro_custo_nome || '');
    if (validCcId) ratItem.rateio_centro_custo = [{ id_centro_custo: validCcId, valor }];
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
  setAccountFromBody(body);
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
    try { contatoId = await findOrCreateContact(body.contato_nome, body.contato_cpf, extractContactExtra(body)); } catch (e: any) { console.error("Contact error:", e.message); }
  }

  const valorEntrada = Math.max(parseFloat(body.valor_entrada) || 0, 0);
  const valorRestante = Math.round((valor - valorEntrada) * 100) / 100;
  const valorParcelaBase = Math.floor((valorRestante / numParcelas) * 100) / 100;
  const valorUltimaParcela = Math.round((valorRestante - valorParcelaBase * (numParcelas - 1)) * 100) / 100;

  const parcelas: any[] = [];

  if (valorEntrada > 0) {
    const pe: any = {
      data_vencimento: dataCompetencia,
      descricao: `${descricao} - Entrada`,
      detalhe_valor: { valor_bruto: valorEntrada, valor_liquido: valorEntrada },
      nota: observacao,
    };
    if (body.conta_financeira_id) pe.conta_financeira = body.conta_financeira_id;
    parcelas.push(pe);
  }

  for (let i = 0; i < numParcelas; i++) {
    const d = new Date(dataVencimento);
    d.setMonth(d.getMonth() + i);
    const isLast = i === numParcelas - 1;
    const vp = isLast ? valorUltimaParcela : valorParcelaBase;
    const p: any = {
      data_vencimento: d.toISOString().split("T")[0],
      descricao: numParcelas > 1 ? `${descricao} - Parcela ${i + 1}/${numParcelas}` : descricao,
      detalhe_valor: { valor_bruto: vp, valor_liquido: vp },
      nota: observacao,
    };
    if (body.conta_financeira_id) p.conta_financeira = body.conta_financeira_id;
    parcelas.push(p);
  }

  const ratItem: any = { id_categoria: body.categoria_id, valor };
  if (body.centro_custo_id) {
    const validCcId = await ensureCostCenterExists(body.centro_custo_id, body.centro_custo_nome || '');
    if (validCcId) ratItem.rateio_centro_custo = [{ id_centro_custo: validCcId, valor }];
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
  setAccountFromBody(body);
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

function extractItems(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (body.itens && Array.isArray(body.itens)) return body.itens;
  if (body.items && Array.isArray(body.items)) return body.items;
  if (body.content && Array.isArray(body.content)) return body.content;
  if (body.data && Array.isArray(body.data)) return body.data;
  return [];
}

async function listProducts(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  setAccountFromBody(body);

  const all: any[] = [];
  const errors: string[] = [];

  try {
    let page = 1;
    for (let i = 0; i < 20; i++) {
      const res = await contaAzulFetch(`/v1/produtos?pagina=${page}&tamanho_pagina=200&status=ATIVO`);
      if (!res.ok) { errors.push(`produtos p${page}: ${res.status}`); break; }
      const body = await res.json();
      const items = extractItems(body);
      for (const p of items) {
        all.push({ id: String(p.id), nome: p.nome || p.descricao || "Produto", tipo: "PRODUTO", valor: p.valor_venda || p.preco_venda || p.preco || p.valor || 0 });
      }
      const totalPg = body.paginacao?.total_paginas || body.totalPages || 1;
      console.log(`Produtos page ${page}/${totalPg}: ${items.length} itens`);
      if (items.length < 200 || page >= totalPg) break;
      page++;
    }
  } catch (e: any) { errors.push("produtos exception: " + e.message); console.error("Exception produtos:", e); }

  await new Promise(r => setTimeout(r, 300));

  try {
    let page = 1;
    const svcPageSize = 100;
    for (let i = 0; i < 50; i++) {
      const res = await contaAzulFetch(`/v1/servicos?pagina=${page}&tamanho_pagina=${svcPageSize}`);
      if (!res.ok) { errors.push(`servicos p${page}: ${res.status}`); break; }
      const body = await res.json();
      const items = extractItems(body);
      for (const s of items) {
        all.push({ id: String(s.id), nome: s.nome || s.descricao || s.name || "Serviço", tipo: "SERVICO", valor: s.preco || s.preco_venda || s.valor || s.valor_venda || 0 });
      }
      const totalPg = body.paginacao?.total_paginas || body.totalPages || 1;
      console.log(`Servicos page ${page}/${totalPg}: ${items.length} itens`);
      if (items.length < svcPageSize || page >= totalPg) break;
      page++;
    }
  } catch (e: any) { errors.push("servicos exception: " + e.message); console.error("Exception servicos:", e); }

  const totalProd = all.filter(i => i.tipo === 'PRODUTO').length;
  const totalSvc = all.filter(i => i.tipo === 'SERVICO').length;
  console.log(`listProducts FINAL: ${all.length} total (${totalProd} produtos, ${totalSvc} servicos)${errors.length ? ' | errors: ' + errors.join('; ') : ''}`);

  return jsonResponse({ success: true, items: all, _meta: { totalProd, totalSvc, errors: errors.length ? errors : undefined } });
}

async function debugServices(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  setAccountFromBody(body);

  const results: any = {};
  try {
    const token = await getValidAccessToken(_currentAccountId);
    results.token_prefix = token.substring(0, 15) + "...";

    const endpoints = [
      "/v1/servicos?pagina=1&tamanho_pagina=10",
      "/v1/servicos",
      "/v1/servicos?pagina=1&tamanho_pagina=200",
    ];

    for (const ep of endpoints) {
      try {
        const url = CONTA_AZUL_BASE + ep;
        const res = await fetch(url, { headers: { Authorization: "Bearer " + token, Accept: "application/json" } });
        const text = await res.text();
        results[ep] = {
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          bodyLength: text.length,
          bodyPreview: text.substring(0, 800),
        };
      } catch (e: any) {
        results[ep] = { exception: e.message };
      }
      await new Promise(r => setTimeout(r, 200));
    }

    const prodRes = await fetch(CONTA_AZUL_BASE + "/v1/produtos?pagina=1&tamanho_pagina=5&status=ATIVO", { headers: { Authorization: "Bearer " + token, Accept: "application/json" } });
    const prodText = await prodRes.text();
    results["produtos_test"] = { status: prodRes.status, bodyLength: prodText.length, bodyPreview: prodText.substring(0, 300) };

  } catch (e: any) {
    results.error = e.message;
  }
  return jsonResponse(results);
}

async function createCostCenter(req: Request): Promise<Response> {
  const body = await req.json();
  const accountId = setAccountFromBody(body);
  const nome = (body.nome || '').trim();
  if (!nome) return errorResponse("Campo 'nome' é obrigatório para criar centro de custo.");

  const res = await contaAzulFetch("/v1/centro-de-custo", { method: "POST", body: JSON.stringify({ nome }) });
  if (!res.ok) {
    const errText = await res.text();
    return errorResponse("Erro ao criar centro de custo: " + res.status + " - " + errText, res.status);
  }
  const created = await res.json();
  const idContaAzul = String(created.id);
  console.log(`createCostCenter: criado "${nome}" com id ${idContaAzul}`);

  const db = getSupabaseServiceClient();
  await db.from("conta_azul_centros_custo").upsert({
    account_id: accountId,
    id_conta_azul: idContaAzul,
    codigo: created.codigo || null,
    nome: created.nome || nome,
    ativo: true,
    synced_at: new Date().toISOString(),
  }, { onConflict: "account_id,id_conta_azul" });

  return jsonResponse({ success: true, id_conta_azul: idContaAzul, nome: created.nome || nome }, 201);
}

async function createSale(req: Request): Promise<Response> {
  const body = await req.json();
  setAccountFromBody(body);
  const valor = parseFloat(body.valor || body.value) || 0;
  const numParcelas = parseInt(body.parcelas) || 1;
  const dataVenda = body.data_venda || body.data_competencia || new Date().toISOString().split("T")[0];
  const dataVencimento = body.data_vencimento || dataVenda;

  const hasMultipleItems = Array.isArray(body.itens) && body.itens.length > 0;

  if (!hasMultipleItems && !valor) return errorResponse("Valor é obrigatório e deve ser maior que zero.");
  if (!hasMultipleItems && !body.produto_id) return errorResponse("Produto/Serviço é obrigatório para criar uma venda.");

  let clienteId = body.contato_id || null;
  if (!clienteId) {
    try {
      clienteId = await findOrCreateContact(body.contato_nome || '', body.contato_cpf || '', extractContactExtra(body));
    } catch (e: any) {
      return errorResponse(e.message || "Erro ao buscar/criar cliente no Conta Azul.", 400);
    }
  }

  let itensPayload: any[];
  if (hasMultipleItems) {
    itensPayload = body.itens.map((item: any) => ({
      id: item.id,
      valor: parseFloat(item.valor) || 0,
      quantidade: item.quantidade || 1,
      descricao: item.descricao || "Venda CRM",
    }));
  } else {
    itensPayload = [{
      id: body.produto_id,
      valor,
      quantidade: 1,
      descricao: body.descricao || "Venda CRM",
    }];
  }

  const valorTotal = hasMultipleItems
    ? itensPayload.reduce((sum: number, it: any) => sum + (it.valor * (it.quantidade || 1)), 0)
    : valor;

  const valorEntrada = Math.max(parseFloat(body.valor_entrada) || 0, 0);
  const valorRestante = Math.round((valorTotal - valorEntrada) * 100) / 100;

  const valorParcelaBase = Math.floor((valorRestante / numParcelas) * 100) / 100;
  const valorUltimaParcela = Math.round((valorRestante - valorParcelaBase * (numParcelas - 1)) * 100) / 100;

  const totalParcelasApi = numParcelas + (valorEntrada > 0 ? 1 : 0);
  let opcaoCondicao = "À vista";
  if (totalParcelasApi > 1) opcaoCondicao = totalParcelasApi + "x";

  const pm = (body.tipo_pagamento || body.payment_method || "").toUpperCase();
  let tipoPagamento = "OUTRO";
  if (pm.includes("BOLETO")) tipoPagamento = "BOLETO_BANCARIO";
  else if (pm.includes("CRED")) tipoPagamento = "CARTAO_CREDITO";
  else if (pm.includes("DEB")) tipoPagamento = "CARTAO_DEBITO";
  else if (pm.includes("PIX")) tipoPagamento = "PIX_PAGAMENTO_INSTANTANEO";
  else if (pm.includes("DINHEIRO") || pm.includes("VISTA")) tipoPagamento = "DINHEIRO";
  else if (pm.includes("TRANSF")) tipoPagamento = "TRANSFERENCIA_BANCARIA";

  const parcelas: any[] = [];

  if (valorEntrada > 0) {
    parcelas.push({
      descricao: "Entrada",
      valor: valorEntrada,
      data_vencimento: dataVenda,
    });
  }

  for (let i = 0; i < numParcelas; i++) {
    const d = new Date(dataVencimento);
    d.setMonth(d.getMonth() + i);
    const isLast = i === numParcelas - 1;
    parcelas.push({
      descricao: numParcelas > 1 ? `Parcela ${i + 1}/${numParcelas}` : "Pagamento único",
      valor: isLast ? valorUltimaParcela : valorParcelaBase,
      data_vencimento: d.toISOString().split("T")[0],
    });
  }

  console.log(`createSale parcelas: entrada=${valorEntrada}, restante=${valorRestante}, base=${valorParcelaBase}, ultima=${valorUltimaParcela}, total_parcelas=${parcelas.length}`);

  const saleNum = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 100);

  const payload: any = {
    id_cliente: clienteId,
    numero: saleNum,
    situacao: "APROVADO",
    data_venda: dataVenda,
    itens: itensPayload,
    condicao_pagamento: {
      opcao_condicao_pagamento: opcaoCondicao,
      tipo_pagamento: tipoPagamento,
      parcelas,
    },
    observacoes: body.observacoes || "",
  };
  if (body.categoria_id) payload.id_categoria = body.categoria_id;
  if (body.centro_custo_id) {
    const validCcId = await ensureCostCenterExists(body.centro_custo_id, body.centro_custo_nome || '');
    if (validCcId) payload.id_centro_custo = validCcId;
  }
  if (body.transaction_code) payload.condicao_pagamento.nsu = body.transaction_code;

  if (body.vendedor_nome) {
    const vendedorId = await findOrCreateSeller(body.vendedor_nome);
    if (vendedorId) payload.id_vendedor = vendedorId;
  }

  console.log(`CREATE SALE payload (numero=${saleNum}):`, JSON.stringify(payload));
  let res = await contaAzulFetch("/v1/venda", { method: "POST", body: JSON.stringify(payload) });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`createSale tentativa 1 falhou: ${res.status} - ${errText.substring(0, 500)}`);

    const dupMatch = errText.match(/O n[º°]\s*(\d+)\s*[eé] o pr[oó]ximo/i);
    if (dupMatch) {
      const nextNum = parseInt(dupMatch[1]);
      console.log(`createSale: numero duplicado detectado, re-tentando com numero ${nextNum}`);
      payload.numero = nextNum;
      res = await contaAzulFetch("/v1/venda", { method: "POST", body: JSON.stringify(payload) });
      if (!res.ok) {
        const e2 = await res.text();
        return errorResponse("Erro ao criar venda (retry): " + res.status + " - " + e2, res.status);
      }
    } else {
      return errorResponse("Erro ao criar venda: " + res.status + " - " + errText, res.status);
    }
  }

  const saleData = await res.json();
  const numeroVenda = saleData.numero || saleData.numero_venda || payload.numero || null;
  console.log(`createSale SUCESSO: numero_venda=${numeroVenda}`);

  return jsonResponse({ success: true, data: saleData, numero_venda: numeroVenda }, 201);
}

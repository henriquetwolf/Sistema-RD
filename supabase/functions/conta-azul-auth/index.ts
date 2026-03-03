import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CONTA_AZUL_AUTH_BASE = "https://auth.contaazul.com/oauth2";

function getSupabaseServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function normalizeRedirectUri(uri: string): string {
  let u = (uri || "").trim().replace(/\/+$/, "");
  if (!u) return u;
  // Remove /callback suffix if present — Conta Azul portal doesn't accept it
  u = u.replace(/\/callback\/?$/, "");
  // Ensure it ends with /conta-azul-auth
  if (!u.endsWith("/conta-azul-auth")) {
    if (u.endsWith("/functions/v1")) {
      u += "/conta-azul-auth";
    }
  }
  return u;
}

async function getAccountCredentials(accountId: string) {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("conta_azul_accounts")
    .select("*")
    .eq("id", accountId)
    .single();
  if (error || !data) throw new Error("Conta não encontrada: " + accountId);
  return {
    clientId: (data.client_id || "").trim(),
    clientSecret: (data.client_secret || "").trim(),
    redirectUri: normalizeRedirectUri(data.redirect_uri),
    nome: data.nome,
    cnpj: data.cnpj,
  };
}

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(req.url);
  const action = url.pathname.split("/").pop();

  // Conta Azul redirects back to the base function URL with ?code=...&state=...
  const isOAuthCallback = url.searchParams.has("code") && url.searchParams.has("state");

  try {
    if (isOAuthCallback) {
      return await handleCallback(url);
    }

    switch (action) {
      case "authorize":
        return await handleAuthorize(url);
      case "callback":
        return await handleCallback(url);
      case "refresh":
        return await handleRefresh(req);
      case "status":
        return await handleStatus(url);
      case "disconnect":
        return await handleDisconnect(req);
      case "accounts":
        return await handleAccounts(req);
      case "create-account":
        return await handleCreateAccount(req);
      case "update-account":
        return await handleUpdateAccount(req);
      case "delete-account":
        return await handleDeleteAccount(req);
      default:
        return errorResponse("Acao desconhecida: " + action, 404);
    }
  } catch (err: any) {
    console.error("conta-azul-auth error:", err);
    return errorResponse(err.message || "Erro interno", 500);
  }
});

// ── Account CRUD ─────────────────────────────────────────────

async function handleAccounts(_req: Request): Promise<Response> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("conta_azul_accounts")
    .select("id, nome, cnpj, client_id, redirect_uri, ativo, created_at, updated_at")
    .order("nome");
  if (error) return errorResponse("Erro ao listar contas: " + error.message, 500);
  return jsonResponse(data || []);
}

async function handleCreateAccount(req: Request): Promise<Response> {
  const body = await req.json();
  if (!body.nome || !body.cnpj || !body.client_id || !body.client_secret || !body.redirect_uri) {
    return errorResponse("Campos obrigatórios: nome, cnpj, client_id, client_secret, redirect_uri");
  }
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("conta_azul_accounts")
    .insert({
      nome: body.nome.trim(),
      cnpj: body.cnpj.replace(/\D/g, "").trim(),
      client_id: body.client_id.trim(),
      client_secret: body.client_secret.trim(),
      redirect_uri: body.redirect_uri.trim(),
      ativo: body.ativo !== false,
    })
    .select("id, nome, cnpj, client_id, redirect_uri, ativo, created_at")
    .single();
  if (error) return errorResponse("Erro ao criar conta: " + error.message, 500);
  return jsonResponse(data, 201);
}

async function handleUpdateAccount(req: Request): Promise<Response> {
  const body = await req.json();
  if (!body.id) return errorResponse("Campo 'id' é obrigatório.");
  const db = getSupabaseServiceClient();
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.nome !== undefined) updates.nome = body.nome;
  if (body.cnpj !== undefined) updates.cnpj = body.cnpj.replace(/\D/g, "");
  if (body.client_id !== undefined) updates.client_id = body.client_id.trim();
  if (body.client_secret !== undefined) updates.client_secret = body.client_secret.trim();
  if (body.redirect_uri !== undefined) updates.redirect_uri = body.redirect_uri.trim();
  if (body.ativo !== undefined) updates.ativo = body.ativo;

  const { error } = await db.from("conta_azul_accounts").update(updates).eq("id", body.id);
  if (error) return errorResponse("Erro ao atualizar conta: " + error.message, 500);
  return jsonResponse({ success: true });
}

async function handleDeleteAccount(req: Request): Promise<Response> {
  const body = await req.json();
  if (!body.id) return errorResponse("Campo 'id' é obrigatório.");
  const db = getSupabaseServiceClient();
  await db.from("conta_azul_tokens").delete().eq("account_id", body.id);
  const { error } = await db.from("conta_azul_accounts").delete().eq("id", body.id);
  if (error) return errorResponse("Erro ao excluir conta: " + error.message, 500);
  return jsonResponse({ success: true, message: "Conta removida." });
}

// ── OAuth ────────────────────────────────────────────────────

async function handleAuthorize(url: URL): Promise<Response> {
  const accountId = url.searchParams.get("account_id");
  if (!accountId) return errorResponse("Parâmetro 'account_id' é obrigatório.");

  const creds = await getAccountCredentials(accountId);

  if (!creds.clientId) {
    return errorResponse("Client ID está vazio para esta conta. Edite a conta e preencha o Client ID corretamente.");
  }

  console.log(`[authorize] account=${accountId} clientId=${creds.clientId} redirectUri=${creds.redirectUri}`);

  const state = accountId + ":" + crypto.randomUUID();
  const authUrl = new URL(CONTA_AZUL_AUTH_BASE + "/authorize");
  authUrl.searchParams.set("client_id", creds.clientId);
  authUrl.searchParams.set("redirect_uri", creds.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  return jsonResponse({
    authorize_url: authUrl.toString(),
    debug_redirect_uri: creds.redirectUri,
  });
}

async function handleCallback(url: URL): Promise<Response> {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";
  if (!code) return errorResponse("Parametro 'code' ausente na URL de callback.");

  const accountId = state.split(":")[0];
  if (!accountId) return errorResponse("Não foi possível identificar a conta pelo state.");

  const creds = await getAccountCredentials(accountId);
  const basicAuth = btoa(creds.clientId + ":" + creds.clientSecret);

  const tokenRes = await fetch(CONTA_AZUL_AUTH_BASE + "/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + basicAuth,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: creds.redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    return errorResponse("Falha ao trocar codigo por token: " + tokenRes.status + " - " + errBody, 502);
  }

  const tokens = await tokenRes.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const db = getSupabaseServiceClient();

  await db.from("conta_azul_tokens").delete().eq("account_id", accountId);

  const { error: insertErr } = await db.from("conta_azul_tokens").insert({
    account_id: accountId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    scope: tokens.scope || "accounting",
  });

  if (insertErr) {
    return errorResponse("Erro ao salvar tokens: " + insertErr.message, 500);
  }

  const html = `<!DOCTYPE html><html><body><h2>${creds.nome} conectada com sucesso!</h2><p>Voce pode fechar esta janela.</p><script>if(window.opener){window.opener.postMessage({type:"CONTA_AZUL_AUTH_SUCCESS",accountId:"${accountId}"},"*");setTimeout(()=>window.close(),1500);}</script></body></html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html", ...corsHeaders() } });
}

async function handleRefresh(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const accountId = body.account_id;
  if (!accountId) return errorResponse("Campo 'account_id' é obrigatório.");

  const db = getSupabaseServiceClient();
  const { data: tokenRow } = await db
    .from("conta_azul_tokens")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!tokenRow) {
    return errorResponse("Nenhum token encontrado para esta conta. Conecte-se ao Conta Azul primeiro.", 401);
  }

  const creds = await getAccountCredentials(accountId);
  const basicAuth = btoa(creds.clientId + ":" + creds.clientSecret);

  const res = await fetch(CONTA_AZUL_AUTH_BASE + "/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + basicAuth },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokenRow.refresh_token }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    return errorResponse("Falha ao renovar token: " + res.status + " - " + errBody, 502);
  }

  const tokens = await res.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await db.from("conta_azul_tokens").update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  }).eq("id", tokenRow.id);

  return jsonResponse({ success: true, expires_at: newExpiresAt });
}

async function handleStatus(url: URL): Promise<Response> {
  const accountId = url.searchParams.get("account_id");
  const db = getSupabaseServiceClient();

  if (accountId) {
    const { data: tokenRow } = await db
      .from("conta_azul_tokens")
      .select("id, expires_at, updated_at, created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!tokenRow) {
      return jsonResponse({ connected: false, lastSync: null, account_id: accountId });
    }

    const { data: lastLog } = await db
      .from("conta_azul_sync_log")
      .select("finished_at, tipo_sync, status")
      .eq("account_id", accountId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const expiresAt = new Date(tokenRow.expires_at);
    const isExpired = expiresAt.getTime() < Date.now();

    return jsonResponse({
      connected: !isExpired,
      tokenExpiresAt: tokenRow.expires_at,
      needsRefresh: isExpired,
      connectedSince: tokenRow.created_at,
      lastSync: lastLog?.finished_at || null,
      lastSyncType: lastLog?.tipo_sync || null,
      lastSyncStatus: lastLog?.status || null,
      account_id: accountId,
    });
  }

  // Sem account_id: retorna status de todas as contas
  const { data: accounts } = await db
    .from("conta_azul_accounts")
    .select("id, nome, cnpj, ativo")
    .eq("ativo", true)
    .order("nome");

  const statuses: any[] = [];
  for (const acc of (accounts || [])) {
    const { data: tokenRow } = await db
      .from("conta_azul_tokens")
      .select("id, expires_at, created_at")
      .eq("account_id", acc.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: lastLog } = await db
      .from("conta_azul_sync_log")
      .select("finished_at, tipo_sync, status")
      .eq("account_id", acc.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isExpired = tokenRow ? new Date(tokenRow.expires_at).getTime() < Date.now() : true;

    statuses.push({
      account_id: acc.id,
      nome: acc.nome,
      cnpj: acc.cnpj,
      connected: tokenRow ? !isExpired : false,
      tokenExpiresAt: tokenRow?.expires_at || null,
      needsRefresh: tokenRow ? isExpired : false,
      connectedSince: tokenRow?.created_at || null,
      lastSync: lastLog?.finished_at || null,
      lastSyncType: lastLog?.tipo_sync || null,
      lastSyncStatus: lastLog?.status || null,
    });
  }

  return jsonResponse(statuses);
}

async function handleDisconnect(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const accountId = body.account_id;
  if (!accountId) return errorResponse("Campo 'account_id' é obrigatório.");

  const db = getSupabaseServiceClient();
  await db.from("conta_azul_tokens").delete().eq("account_id", accountId);
  return jsonResponse({ success: true, message: "Desconectado do Conta Azul." });
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CONTA_AZUL_AUTH_BASE = "https://auth.contaazul.com/oauth2";

function getSupabaseServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function getContaAzulCredentials() {
  return {
    clientId: Deno.env.get("CONTA_AZUL_CLIENT_ID")!,
    clientSecret: Deno.env.get("CONTA_AZUL_CLIENT_SECRET")!,
    redirectUri: Deno.env.get("CONTA_AZUL_REDIRECT_URI")!,
  };
}

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
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

  try {
    switch (action) {
      case "authorize":
        return handleAuthorize();
      case "callback":
        return await handleCallback(url);
      case "refresh":
        return await handleRefresh();
      case "status":
        return await handleStatus();
      case "disconnect":
        return await handleDisconnect();
      default:
        return errorResponse("Acao desconhecida: " + action, 404);
    }
  } catch (err: any) {
    console.error("conta-azul-auth error:", err);
    return errorResponse(err.message || "Erro interno", 500);
  }
});

function handleAuthorize(): Response {
  const creds = getContaAzulCredentials();
  const authUrl = new URL(CONTA_AZUL_AUTH_BASE + "/authorize");
  authUrl.searchParams.set("client_id", creds.clientId);
  authUrl.searchParams.set("redirect_uri", creds.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", crypto.randomUUID());
  return jsonResponse({ authorize_url: authUrl.toString() });
}

async function handleCallback(url: URL): Promise<Response> {
  const code = url.searchParams.get("code");
  if (!code) {
    return errorResponse("Parametro 'code' ausente na URL de callback.");
  }

  const creds = getContaAzulCredentials();
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

  await db.from("conta_azul_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const { error: insertErr } = await db.from("conta_azul_tokens").insert({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    scope: tokens.scope || "accounting",
  });

  if (insertErr) {
    return errorResponse("Erro ao salvar tokens: " + insertErr.message, 500);
  }

  const html = '<!DOCTYPE html><html><body><h2>Conta Azul conectada com sucesso!</h2><p>Voce pode fechar esta janela.</p><script>if(window.opener){window.opener.postMessage({type:"CONTA_AZUL_AUTH_SUCCESS"},"*");setTimeout(()=>window.close(),1500);}</script></body></html>';
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html", ...corsHeaders() } });
}

async function handleRefresh(): Promise<Response> {
  const db = getSupabaseServiceClient();
  const { data: tokenRow } = await db.from("conta_azul_tokens").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (!tokenRow) {
    return errorResponse("Nenhum token encontrado. Conecte-se ao Conta Azul primeiro.", 401);
  }

  const creds = getContaAzulCredentials();
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

async function handleStatus(): Promise<Response> {
  const db = getSupabaseServiceClient();
  const { data: tokenRow } = await db.from("conta_azul_tokens").select("id, expires_at, updated_at, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (!tokenRow) {
    return jsonResponse({ connected: false, lastSync: null });
  }

  const { data: lastLog } = await db.from("conta_azul_sync_log").select("finished_at, tipo_sync, status").order("started_at", { ascending: false }).limit(1).maybeSingle();

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
  });
}

async function handleDisconnect(): Promise<Response> {
  const db = getSupabaseServiceClient();
  await db.from("conta_azul_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  return jsonResponse({ success: true, message: "Desconectado do Conta Azul." });
}

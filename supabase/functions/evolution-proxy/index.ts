import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { baseUrl, apiKey, endpoint, method = "GET", body } = await req.json();

    if (!baseUrl || !apiKey || !endpoint) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: baseUrl, apiKey, endpoint" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanBase = baseUrl.replace(/\/+$/, "");
    const url = `${cleanBase}${endpoint}`;

    const fetchOpts: RequestInit = {
      method,
      headers: {
        "apikey": apiKey,
        "Content-Type": "application/json",
      },
    };

    if (body && method !== "GET") {
      fetchOpts.body = JSON.stringify(body);
    }

    const upstream = await fetch(url, fetchOpts);
    const responseText = await upstream.text();

    return new Response(responseText, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno no proxy" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

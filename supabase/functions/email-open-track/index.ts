/**
 * Rastreamento de abertura de e-mail (tracking pixel).
 * GET ?c=<campaign_id> → responde com 1x1 GIF e incrementa stats_opened da campanha.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRANSPARENT_GIF = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (c) => c.charCodeAt(0)
);

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
  }

  if (req.method !== "GET") {
    return new Response(TRANSPARENT_GIF, {
      status: 200,
      headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
    });
  }

  const url = new URL(req.url);
  const campaignId = url.searchParams.get("c")?.trim();

  if (!campaignId || !UUID_REGEX.test(campaignId)) {
    return new Response(TRANSPARENT_GIF, {
      status: 200,
      headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
    });
  }

  const supabase = getSupabase();

  try {
    const { data: campaign } = await supabase
      .from("marketing_email_campaigns")
      .select("stats_sent, stats_opened")
      .eq("id", campaignId)
      .single();

    if (campaign) {
      const sent = Number(campaign.stats_sent ?? 0);
      const current = Number(campaign.stats_opened ?? 0);
      const nextOpened = Math.min(current + 1, sent);
      await supabase
        .from("marketing_email_campaigns")
        .update({
          stats_opened: nextOpened,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);
    }
  } catch (_) {
    // sempre devolve GIF para o cliente de e-mail não quebrar
  }

  return new Response(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

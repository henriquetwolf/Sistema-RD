/**
 * Rastreamento de abertura de e-mail (tracking pixel).
 * GET ?s=<send_id> → 1x1 GIF e marca abertura única do destinatário (uma por e-mail).
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
  const sendId = url.searchParams.get("s")?.trim();

  if (!sendId || !UUID_REGEX.test(sendId)) {
    return new Response(TRANSPARENT_GIF, {
      status: 200,
      headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
    });
  }

  const supabase = getSupabase();

  try {
    const { data: sendRow } = await supabase
      .from("marketing_email_sends")
      .select("id, campaign_id, opened_at")
      .eq("id", sendId)
      .single();

    if (!sendRow) {
      return new Response(TRANSPARENT_GIF, {
        status: 200,
        headers: { "Content-Type": "image/gif", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
      });
    }

    const campaignId = sendRow.campaign_id as string;
    const alreadyOpened = !!sendRow.opened_at;

    if (!alreadyOpened) {
      const now = new Date().toISOString();
      await supabase
        .from("marketing_email_sends")
        .update({ opened_at: now, status: "opened" })
        .eq("id", sendId);

      const { count } = await supabase
        .from("marketing_email_sends")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .not("opened_at", "is", null);

      await supabase
        .from("marketing_email_campaigns")
        .update({
          stats_opened: count ?? 0,
          updated_at: now,
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

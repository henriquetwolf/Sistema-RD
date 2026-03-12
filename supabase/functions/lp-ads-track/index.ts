import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const events: any[] = Array.isArray(body) ? body : [body];

    const insertPayloads: any[] = [];
    const conversionPayloads: any[] = [];

    for (const evt of events) {
      const {
        landing_page_id, project_id, campaign_id, ab_test_id,
        event_type, event_data,
        visitor_id, session_id,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        referrer, device_type, country,
      } = evt;

      if (!landing_page_id || !project_id || !event_type) continue;

      const payload = {
        landing_page_id,
        project_id,
        campaign_id: campaign_id || null,
        ab_test_id: ab_test_id || null,
        event_type,
        event_data: event_data || {},
        visitor_id: visitor_id || "",
        session_id: session_id || "",
        utm_source: utm_source || "",
        utm_medium: utm_medium || "",
        utm_campaign: utm_campaign || "",
        utm_content: utm_content || "",
        utm_term: utm_term || "",
        referrer: referrer || "",
        device_type: device_type || "desktop",
        country: country || "",
      };
      insertPayloads.push(payload);
    }

    if (insertPayloads.length > 0) {
      const { data: inserted } = await supabase
        .from("lp_ads_page_events")
        .insert(insertPayloads)
        .select("id, project_id, landing_page_id, campaign_id, ab_test_id, event_type, visitor_id");

      if (inserted) {
        for (const evt of inserted) {
          const { data: goals } = await supabase
            .from("lp_ads_conversion_goals")
            .select("*")
            .eq("project_id", evt.project_id)
            .eq("event_type", evt.event_type);

          if (goals && goals.length > 0) {
            for (const goal of goals) {
              conversionPayloads.push({
                project_id: evt.project_id,
                landing_page_id: evt.landing_page_id,
                campaign_id: evt.campaign_id,
                ab_test_id: evt.ab_test_id,
                goal_id: goal.id,
                conversion_type: evt.event_type,
                event_id: evt.id,
                visitor_id: evt.visitor_id,
              });
            }
          }
        }

        if (conversionPayloads.length > 0) {
          await supabase.from("lp_ads_conversions").insert(conversionPayloads);
        }
      }
    }

    return new Response(null, { status: 204, headers: corsHeaders });
  } catch (err: any) {
    console.error("lp-ads-track error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

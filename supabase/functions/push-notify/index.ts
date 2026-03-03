import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushRequest {
  action: "send" | "send-bulk" | "send-to-topic";
  user_type?: "student" | "instructor";
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  image_url?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");

    if (!fcmServerKey) {
      return new Response(
        JSON.stringify({ error: "FCM_SERVER_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload: PushRequest = await req.json();

    if (!payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: "title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let tokens: string[] = [];

    if (payload.action === "send" && payload.user_id && payload.user_type) {
      const { data } = await supabase
        .from("crm_device_tokens")
        .select("token")
        .eq("user_id", payload.user_id)
        .eq("user_type", payload.user_type);

      tokens = (data || []).map((d: any) => d.token);

    } else if (payload.action === "send-bulk" && payload.user_ids && payload.user_type) {
      const { data } = await supabase
        .from("crm_device_tokens")
        .select("token")
        .in("user_id", payload.user_ids)
        .eq("user_type", payload.user_type);

      tokens = (data || []).map((d: any) => d.token);

    } else if (payload.action === "send-to-topic" && payload.user_type) {
      const { data } = await supabase
        .from("crm_device_tokens")
        .select("token")
        .eq("user_type", payload.user_type);

      tokens = (data || []).map((d: any) => d.token);
    }

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No device tokens found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = { sent: 0, failed: 0, errors: [] as string[] };

    const batchSize = 500;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      const fcmPayload: any = {
        registration_ids: batch,
        notification: {
          title: payload.title,
          body: payload.body,
          sound: "default",
          badge: 1,
        },
        data: payload.data || {},
        priority: "high",
      };

      if (payload.image_url) {
        fcmPayload.notification.image = payload.image_url;
      }

      const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${fcmServerKey}`,
        },
        body: JSON.stringify(fcmPayload),
      });

      const fcmResult = await fcmResponse.json();

      results.sent += fcmResult.success || 0;
      results.failed += fcmResult.failure || 0;

      if (fcmResult.results) {
        const invalidTokens: string[] = [];
        fcmResult.results.forEach((r: any, idx: number) => {
          if (r.error === "InvalidRegistration" || r.error === "NotRegistered") {
            invalidTokens.push(batch[idx]);
          }
        });

        if (invalidTokens.length > 0) {
          await supabase
            .from("crm_device_tokens")
            .delete()
            .in("token", invalidTokens);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_tokens: tokens.length,
        sent: results.sent,
        failed: results.failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

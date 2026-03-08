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

interface DeviceToken {
  token: string;
  platform: string;
  subscription_json: any;
}

// ─── Web Push helpers (VAPID signing with crypto.subtle) ──────────────────────

function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

async function importVapidPrivateKey(base64Key: string): Promise<CryptoKey> {
  const rawKey = base64UrlDecode(base64Key);
  return crypto.subtle.importKey(
    "pkcs8",
    rawKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64: string
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  };

  const encodedHeader = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const encodedPayload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const key = await importVapidPrivateKey(privateKeyBase64);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureBytes = new Uint8Array(signature);
  return `${unsignedToken}.${base64UrlEncode(signatureBytes)}`;
}

async function sendWebPush(
  subscription: any,
  payloadObj: object,
  vapidPrivateKey: string,
  vapidPublicKey: string,
  vapidSubject: string
): Promise<boolean> {
  try {
    const endpoint = subscription.endpoint;
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const jwt = await createVapidJwt(audience, vapidSubject, vapidPrivateKey);
    const body = JSON.stringify(payloadObj);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": "aes128gcm",
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
        TTL: "86400",
      },
      body,
    });

    return response.status === 201 || response.status === 200;
  } catch {
    return false;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@vollpilates.com.br";

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload: PushRequest = await req.json();

    if (!payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: "title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch device tokens with platform info
    let deviceTokens: DeviceToken[] = [];

    if (payload.action === "send" && payload.user_id && payload.user_type) {
      const { data } = await supabase
        .from("crm_device_tokens")
        .select("token, platform, subscription_json")
        .eq("user_id", payload.user_id)
        .eq("user_type", payload.user_type);

      deviceTokens = (data || []) as DeviceToken[];

    } else if (payload.action === "send-bulk" && payload.user_ids && payload.user_type) {
      const { data } = await supabase
        .from("crm_device_tokens")
        .select("token, platform, subscription_json")
        .in("user_id", payload.user_ids)
        .eq("user_type", payload.user_type);

      deviceTokens = (data || []) as DeviceToken[];

    } else if (payload.action === "send-to-topic" && payload.user_type) {
      const { data } = await supabase
        .from("crm_device_tokens")
        .select("token, platform, subscription_json")
        .eq("user_type", payload.user_type);

      deviceTokens = (data || []) as DeviceToken[];
    }

    if (deviceTokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No device tokens found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Separate native vs web tokens
    const nativeTokens = deviceTokens.filter((d) => d.platform !== "web");
    const webTokens = deviceTokens.filter((d) => d.platform === "web" && d.subscription_json);

    const results = { sent: 0, failed: 0, web_sent: 0, web_failed: 0 };

    // ─── FCM: send to native (iOS/Android) ────────────────────────────
    if (nativeTokens.length > 0 && fcmServerKey) {
      const tokens = nativeTokens.map((d) => d.token);
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
    }

    // ─── Web Push: send to PWA browsers ───────────────────────────────
    if (webTokens.length > 0 && vapidPrivateKey && vapidPublicKey) {
      const webPayload = {
        title: payload.title,
        body: payload.body,
        url: payload.data?.url || "/",
        image: payload.image_url || undefined,
      };

      const invalidWebTokens: string[] = [];

      for (const device of webTokens) {
        const success = await sendWebPush(
          device.subscription_json,
          webPayload,
          vapidPrivateKey,
          vapidPublicKey,
          vapidSubject
        );

        if (success) {
          results.web_sent++;
        } else {
          results.web_failed++;
          invalidWebTokens.push(device.token);
        }
      }

      // Clean up expired/invalid web subscriptions
      if (invalidWebTokens.length > 0) {
        await supabase
          .from("crm_device_tokens")
          .delete()
          .in("token", invalidWebTokens)
          .eq("platform", "web");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_tokens: deviceTokens.length,
        native: { sent: results.sent, failed: results.failed },
        web: { sent: results.web_sent, failed: results.web_failed },
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

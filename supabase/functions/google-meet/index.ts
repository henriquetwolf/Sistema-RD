import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

function getSupabaseServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
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

// ── Google Service Account JWT Auth ─────────────────────────────

function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToBase64Url(str: string): string {
  return base64UrlEncode(new TextEncoder().encode(str));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const lines = pem
    .replace(/-----BEGIN .*-----/, "")
    .replace(/-----END .*-----/, "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");
  const binary = atob(lines);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

async function getGoogleAccessToken(): Promise<string> {
  const email = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKeyPem = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

  if (!email || !privateKeyPem) {
    throw new Error(
      "Google Service Account not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = strToBase64Url(JSON.stringify(header));
  const claimB64 = strToBase64Url(JSON.stringify(claimSet));
  const signingInput = `${headerB64}.${claimB64}`;

  const keyBuffer = pemToArrayBuffer(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));

  const jwt = `${signingInput}.${signatureB64}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResp.ok) {
    const err = await tokenResp.text();
    throw new Error(`Google OAuth token error: ${err}`);
  }

  const tokenData = await tokenResp.json();
  return tokenData.access_token;
}

// ── Google Calendar API helpers ─────────────────────────────────

async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  summary: string,
  description: string,
  startTime: string,
  endTime: string,
  attendeeEmail?: string
): Promise<{ eventId: string; meetLink: string }> {
  const event: any = {
    summary,
    description,
    start: { dateTime: startTime, timeZone: "America/Sao_Paulo" },
    end: { dateTime: endTime, timeZone: "America/Sao_Paulo" },
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  if (attendeeEmail) {
    event.attendees = [{ email: attendeeEmail }];
  }

  const resp = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Google Calendar API error: ${err}`);
  }

  const data = await resp.json();
  const meetLink =
    data.conferenceData?.entryPoints?.find(
      (ep: any) => ep.entryPointType === "video"
    )?.uri || data.hangoutLink || "";

  return { eventId: data.id, meetLink };
}

async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const resp = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!resp.ok && resp.status !== 404) {
    const err = await resp.text();
    throw new Error(`Google Calendar delete error: ${err}`);
  }
}

// ── Main handler ────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const { action, ...payload } = await req.json();
    const db = getSupabaseServiceClient();

    switch (action) {
      // ── Create meeting ──────────────────────────────────────
      case "create-meeting": {
        const {
          student_cpf,
          student_name,
          student_email,
          student_phone,
          meeting_date,
          start_time,
          end_time,
        } = payload;

        if (!student_cpf || !meeting_date || !start_time || !end_time) {
          return errorResponse("Campos obrigatórios faltando.");
        }

        // Check for existing booking conflict
        const { data: conflict } = await db
          .from("franchise_meeting_bookings")
          .select("id")
          .eq("meeting_date", meeting_date)
          .eq("status", "scheduled")
          .gte("meeting_start", start_time)
          .lt("meeting_start", end_time)
          .maybeSingle();

        if (conflict) {
          return errorResponse("Este horário já está reservado.", 409);
        }

        // Check max bookings per student
        const settingsRow = await db
          .from("crm_settings")
          .select("value")
          .eq("key", "franchise_meeting_config")
          .maybeSingle();

        const settings = settingsRow.data?.value
          ? JSON.parse(settingsRow.data.value)
          : {};
        const maxBookings = settings.max_bookings_per_student || 1;

        const { count: existingCount } = await db
          .from("franchise_meeting_bookings")
          .select("id", { count: "exact", head: true })
          .eq("student_cpf", student_cpf)
          .eq("status", "scheduled");

        if ((existingCount || 0) >= maxBookings) {
          return errorResponse(
            `Você já possui ${maxBookings} reunião(ões) agendada(s). Cancele a existente para agendar outra.`,
            409
          );
        }

        // Try to create Google Calendar event
        let eventId = "";
        let meetLink = "";

        const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID");
        const hasGoogleConfig =
          Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") &&
          Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY") &&
          calendarId;

        let googleError = "";

        if (hasGoogleConfig) {
          try {
            const accessToken = await getGoogleAccessToken();
            const summary =
              settings.meeting_title || "Reunião Franquia VOLL Studios";
            const description = [
              settings.meeting_description || "Reunião de apresentação da Franquia VOLL Studios",
              "",
              `Aluno: ${student_name}`,
              `Email: ${student_email}`,
              `Telefone: ${student_phone}`,
              `CPF: ${student_cpf}`,
            ].join("\n");

            const result = await createCalendarEvent(
              accessToken,
              calendarId!,
              summary,
              description,
              start_time,
              end_time,
              student_email || undefined
            );
            eventId = result.eventId;
            meetLink = result.meetLink;
          } catch (googleErr: any) {
            googleError = googleErr.message || String(googleErr);
            console.error("Google Calendar error (continuing without Meet link):", googleError);
          }
        } else {
          googleError = "Secrets não configurados: " +
            (!Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") ? "GOOGLE_SERVICE_ACCOUNT_EMAIL " : "") +
            (!Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY") ? "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY " : "") +
            (!calendarId ? "GOOGLE_CALENDAR_ID" : "");
        }

        // Save booking
        const { data: booking, error: insertErr } = await db
          .from("franchise_meeting_bookings")
          .insert({
            student_cpf,
            student_name: student_name || "",
            student_email: student_email || "",
            student_phone: student_phone || "",
            meeting_date,
            meeting_start: start_time,
            meeting_end: end_time,
            google_event_id: eventId,
            meet_link: meetLink,
            status: "scheduled",
          })
          .select()
          .single();

        if (insertErr) {
          return errorResponse("Erro ao salvar agendamento: " + insertErr.message, 500);
        }

        return jsonResponse({
          success: true,
          booking,
          meet_link: meetLink,
          google_configured: !!hasGoogleConfig,
          google_error: googleError || undefined,
        });
      }

      // ── Cancel meeting ──────────────────────────────────────
      case "cancel-meeting": {
        const { booking_id } = payload;
        if (!booking_id) return errorResponse("booking_id obrigatório.");

        const { data: booking } = await db
          .from("franchise_meeting_bookings")
          .select("*")
          .eq("id", booking_id)
          .single();

        if (!booking) return errorResponse("Agendamento não encontrado.", 404);

        // Cancel on Google Calendar
        if (booking.google_event_id) {
          const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID");
          if (calendarId) {
            try {
              const accessToken = await getGoogleAccessToken();
              await deleteCalendarEvent(
                accessToken,
                calendarId,
                booking.google_event_id
              );
            } catch (e) {
              console.error("Error deleting Google event:", e);
            }
          }
        }

        await db
          .from("franchise_meeting_bookings")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
          })
          .eq("id", booking_id);

        return jsonResponse({ success: true });
      }

      default:
        return errorResponse(`Ação desconhecida: ${action}`, 400);
    }
  } catch (err: any) {
    console.error("google-meet error:", err);
    return errorResponse(err.message || "Internal Server Error", 500);
  }
});

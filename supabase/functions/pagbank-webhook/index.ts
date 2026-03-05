import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

function getSupabaseServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const db = getSupabaseServiceClient();

  try {
    const payload = await req.json();
    console.log("[pagbank-webhook] Received:", JSON.stringify(payload).substring(0, 1000));

    await db.from("pagbank_webhook_log").insert({
      event_type: payload.type || payload.event || "unknown",
      pagbank_id: payload.id || extractChargeId(payload),
      payload,
    });

    const charges = payload.charges || [];
    const qrCodes = payload.qr_codes || [];

    for (const charge of charges) {
      await processChargeUpdate(db, charge, payload);
    }

    for (const qr of qrCodes) {
      if (qr.arrangements) {
        for (const arr of qr.arrangements) {
          if (arr.status === "PAID") {
            await processPixPaid(db, payload.id, qr);
          }
        }
      }
    }

    if (payload.reference_id && payload.charges?.[0]?.status) {
      await processOrderUpdate(db, payload);
    }

    await db.from("pagbank_webhook_log")
      .update({ processed: true })
      .eq("pagbank_id", payload.id || extractChargeId(payload))
      .order("created_at", { ascending: false })
      .limit(1);

    return jsonResponse({ received: true });
  } catch (err: any) {
    console.error("[pagbank-webhook] Error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
});

async function processChargeUpdate(db: any, charge: any, order: any) {
  const chargeId = charge.id;
  if (!chargeId) return;

  const updates: any = {
    status: charge.status,
    updated_at: new Date().toISOString(),
  };

  if (charge.status === "PAID") {
    updates.paid_at = charge.paid_at || new Date().toISOString();
  }

  if (charge.payment_method?.card) {
    updates.card_brand = charge.payment_method.card.brand;
    updates.card_last_digits = charge.payment_method.card.last_digits;
  }

  const { data: payment } = await db
    .from("pagbank_payments")
    .update(updates)
    .eq("pagbank_charge_id", chargeId)
    .select("order_id")
    .maybeSingle();

  if (payment?.order_id) {
    await db.from("pagbank_orders")
      .update({ status: charge.status, updated_at: new Date().toISOString() })
      .eq("id", payment.order_id);

    if (charge.status === "PAID") {
      await grantCourseAccess(db, payment.order_id);
    }
  }

  if (!payment && order?.id) {
    const { data: orderByPagbank } = await db
      .from("pagbank_orders")
      .select("id")
      .eq("pagbank_order_id", order.id)
      .maybeSingle();

    if (orderByPagbank) {
      await db.from("pagbank_payments")
        .update(updates)
        .eq("order_id", orderByPagbank.id);

      await db.from("pagbank_orders")
        .update({ status: charge.status, updated_at: new Date().toISOString() })
        .eq("id", orderByPagbank.id);

      if (charge.status === "PAID") {
        await grantCourseAccess(db, orderByPagbank.id);
      }
    }
  }
}

async function processPixPaid(db: any, orderId: string, _qr: any) {
  const { data: order } = await db
    .from("pagbank_orders")
    .select("id, course_id, student_deal_id")
    .eq("pagbank_order_id", orderId)
    .maybeSingle();

  if (!order) return;

  await db.from("pagbank_payments")
    .update({
      status: "PAID",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", order.id);

  await db.from("pagbank_orders")
    .update({ status: "PAID", updated_at: new Date().toISOString() })
    .eq("id", order.id);

  await grantCourseAccess(db, order.id);
}

async function processOrderUpdate(db: any, payload: any) {
  const { data: order } = await db
    .from("pagbank_orders")
    .select("id, status")
    .eq("pagbank_order_id", payload.id)
    .maybeSingle();

  if (!order) return;

  const newStatus = payload.charges?.[0]?.status || "PENDING";
  if (newStatus !== order.status) {
    await db.from("pagbank_orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", order.id);
  }
}

async function grantCourseAccess(db: any, orderId: string) {
  const { data: order } = await db
    .from("pagbank_orders")
    .select("course_id, student_deal_id, student_name, student_email, course_title")
    .eq("id", orderId)
    .single();

  if (!order) return;

  const { data: existingAccess } = await db
    .from("crm_student_course_access")
    .select("id")
    .eq("student_deal_id", order.student_deal_id)
    .eq("course_id", order.course_id)
    .maybeSingle();

  if (existingAccess) {
    console.log("[pagbank-webhook] Access already exists for student:", order.student_deal_id, "course:", order.course_id);
    return;
  }

  const { error: accessErr } = await db.from("crm_student_course_access").insert({
    student_deal_id: order.student_deal_id,
    course_id: order.course_id,
    unlocked_at: new Date().toISOString(),
  });

  if (accessErr) {
    console.error("[pagbank-webhook] Error granting access:", accessErr);
    return;
  }

  console.log("[pagbank-webhook] Access granted for student:", order.student_deal_id, "course:", order.course_id);

  await db.from("crm_activity_logs").insert({
    user_name: "Sistema PagBank",
    action: "create",
    module: "pagbank",
    details: `Acesso liberado automaticamente ao curso "${order.course_title}" para ${order.student_name} (${order.student_email}) após pagamento confirmado.`,
    record_id: orderId,
  });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { data: tokens } = await db
      .from("crm_device_tokens")
      .select("token, platform")
      .eq("user_id", order.student_deal_id)
      .eq("user_type", "student");

    if (tokens && tokens.length > 0) {
      await fetch(`${supabaseUrl}/functions/v1/push-notify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send",
          user_id: order.student_deal_id,
          user_type: "student",
          title: "Pagamento Confirmado!",
          body: `Seu acesso ao curso "${order.course_title}" foi liberado. Bons estudos!`,
          data: { type: "course_unlocked", course_id: order.course_id },
        }),
      });
    }
  } catch (pushErr) {
    console.error("[pagbank-webhook] Push notification error (non-blocking):", pushErr);
  }
}

function extractChargeId(payload: any): string {
  return payload.charges?.[0]?.id || payload.id || "unknown";
}

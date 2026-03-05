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
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, stripe-signature",
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
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);

    console.log(
      "[stripe-webhook] Received event:",
      payload.type,
      payload.id
    );

    await db.from("pagbank_webhook_log").insert({
      event_type: `stripe:${payload.type}`,
      pagbank_id: payload.id,
      payload,
    });

    if (payload.type === "checkout.session.completed") {
      await processCheckoutCompleted(db, payload.data?.object);
    } else if (payload.type === "checkout.session.expired") {
      await processCheckoutExpired(db, payload.data?.object);
    } else if (payload.type === "payment_intent.succeeded") {
      await processPaymentSucceeded(db, payload.data?.object);
    }

    await db
      .from("pagbank_webhook_log")
      .update({ processed: true })
      .eq("pagbank_id", payload.id)
      .order("created_at", { ascending: false })
      .limit(1);

    return jsonResponse({ received: true });
  } catch (err: any) {
    console.error("[stripe-webhook] Error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
});

async function processCheckoutCompleted(db: any, session: any) {
  if (!session) return;

  const referenceId = session.metadata?.reference_id;
  const sessionId = session.id;

  let orderQuery = db
    .from("pagbank_orders")
    .select("id, status, course_id, student_deal_id, course_title, student_name, student_email");

  if (referenceId) orderQuery = orderQuery.eq("reference_id", referenceId);
  else orderQuery = orderQuery.eq("pagbank_order_id", sessionId);

  const { data: order } = await orderQuery.maybeSingle();
  if (!order) {
    console.log(
      "[stripe-webhook] Order not found for ref:",
      referenceId,
      "session:",
      sessionId
    );
    return;
  }

  if (order.status === "PAID") return;

  await db
    .from("pagbank_orders")
    .update({ status: "PAID", updated_at: new Date().toISOString() })
    .eq("id", order.id);

  await db
    .from("pagbank_payments")
    .update({
      status: "PAID",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", order.id);

  await grantCourseAccess(db, order);

  console.log(
    "[stripe-webhook] Checkout completed for order:",
    order.id,
    "ref:",
    referenceId
  );
}

async function processCheckoutExpired(db: any, session: any) {
  if (!session) return;

  const referenceId = session.metadata?.reference_id;
  const sessionId = session.id;

  let orderQuery = db.from("pagbank_orders").select("id, status");
  if (referenceId) orderQuery = orderQuery.eq("reference_id", referenceId);
  else orderQuery = orderQuery.eq("pagbank_order_id", sessionId);

  const { data: order } = await orderQuery.maybeSingle();
  if (!order || order.status === "PAID") return;

  await db
    .from("pagbank_orders")
    .update({ status: "CANCELED", updated_at: new Date().toISOString() })
    .eq("id", order.id);

  await db
    .from("pagbank_payments")
    .update({ status: "CANCELED", updated_at: new Date().toISOString() })
    .eq("order_id", order.id);
}

async function processPaymentSucceeded(db: any, paymentIntent: any) {
  if (!paymentIntent?.metadata?.reference_id) return;

  const referenceId = paymentIntent.metadata.reference_id;

  const { data: order } = await db
    .from("pagbank_orders")
    .select("id, status, course_id, student_deal_id, course_title, student_name, student_email")
    .eq("reference_id", referenceId)
    .maybeSingle();

  if (!order || order.status === "PAID") return;

  await db
    .from("pagbank_orders")
    .update({ status: "PAID", updated_at: new Date().toISOString() })
    .eq("id", order.id);

  await db
    .from("pagbank_payments")
    .update({
      status: "PAID",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", order.id);

  await grantCourseAccess(db, order);
}

async function grantCourseAccess(db: any, order: any) {
  const { data: existingAccess } = await db
    .from("crm_student_course_access")
    .select("id")
    .eq("student_deal_id", order.student_deal_id)
    .eq("course_id", order.course_id)
    .maybeSingle();

  if (existingAccess) {
    console.log(
      "[stripe-webhook] Access already exists for student:",
      order.student_deal_id
    );
    return;
  }

  const { error: accessErr } = await db
    .from("crm_student_course_access")
    .insert({
      student_deal_id: order.student_deal_id,
      course_id: order.course_id,
      unlocked_at: new Date().toISOString(),
    });

  if (accessErr) {
    console.error("[stripe-webhook] Error granting access:", accessErr);
    return;
  }

  console.log(
    "[stripe-webhook] Access granted for student:",
    order.student_deal_id,
    "course:",
    order.course_id
  );

  await db.from("crm_activity_logs").insert({
    user_name: "Sistema Stripe",
    action: "create",
    module: "stripe",
    details: `Acesso liberado automaticamente ao curso "${order.course_title}" para ${order.student_name} (${order.student_email}) após pagamento confirmado via Stripe.`,
    record_id: order.id,
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
    console.error(
      "[stripe-webhook] Push notification error (non-blocking):",
      pushErr
    );
  }
}

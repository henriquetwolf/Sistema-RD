import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const STRIPE_API_URL = "https://api.stripe.com/v1";

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

async function getStripeConfig() {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("stripe_config")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (error || !data)
    throw new Error(
      "Stripe não configurado. Cadastre as chaves nas configurações."
    );
  return data;
}

function stripeAuthHeader(secretKey: string): Record<string, string> {
  const encoded = btoa(secretKey.trim() + ":");
  return {
    Authorization: `Basic ${encoded}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

function toFormEncoded(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(req.url);
  const action = url.pathname.split("/").pop();

  try {
    switch (action) {
      case "create-session":
        return await handleCreateSession(req);
      case "check-status":
        return await handleCheckStatus(req);
      case "config":
        return await handleGetConfig();
      default:
        return errorResponse("Ação desconhecida: " + action, 404);
    }
  } catch (err: any) {
    console.error("[stripe-checkout] error:", err);
    return errorResponse(err.message || "Erro interno", 500);
  }
});

async function handleGetConfig(): Promise<Response> {
  const db = getSupabaseServiceClient();
  const { data } = await db
    .from("stripe_config")
    .select("publishable_key, is_active")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!data) {
    return jsonResponse({
      configured: false,
      publishable_key: null,
      is_active: false,
    });
  }

  return jsonResponse({
    configured: true,
    publishable_key: data.publishable_key,
    is_active: data.is_active,
  });
}

async function handleCreateSession(req: Request): Promise<Response> {
  const body = await req.json();
  const {
    course_id,
    course_title,
    student_deal_id,
    student_name,
    student_email,
    amount,
    coupon_code,
    return_url,
  } = body;

  if (!course_id || !student_deal_id || !amount) {
    return errorResponse(
      "Campos obrigatórios: course_id, student_deal_id, amount"
    );
  }

  const config = await getStripeConfig();
  const db = getSupabaseServiceClient();

  const referenceId = `VOLL-S-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  let finalAmount = amount;
  let discountAmount = 0;
  let couponId: string | null = null;

  if (coupon_code) {
    const couponResult = await validateCouponInternal(
      db,
      coupon_code,
      amount,
      course_id,
      student_deal_id,
      student_email
    );
    if (!couponResult.valid) {
      return errorResponse(couponResult.message);
    }
    finalAmount = couponResult.final_amount;
    discountAmount = couponResult.discount_amount;
    couponId = couponResult.coupon?.id || null;
  }

  const successUrl = return_url
    ? `${return_url}${return_url.includes("?") ? "&" : "?"}payment_status=success&ref=${referenceId}`
    : undefined;
  const cancelUrl = return_url || undefined;

  const sessionParams: Record<string, string> = {
    mode: "payment",
    "line_items[0][price_data][currency]": "brl",
    "line_items[0][price_data][unit_amount]": String(finalAmount),
    "line_items[0][price_data][product_data][name]": (
      course_title || "Curso Online"
    ).substring(0, 100),
    "line_items[0][quantity]": "1",
    "metadata[reference_id]": referenceId,
    "metadata[course_id]": course_id,
    "metadata[student_deal_id]": student_deal_id,
    "payment_method_types[0]": "card",
    "payment_method_types[1]": "boleto",
  };

  if (student_email) sessionParams.customer_email = student_email;
  if (student_name) sessionParams["metadata[student_name]"] = student_name;
  if (successUrl) sessionParams.success_url = successUrl;
  if (cancelUrl) sessionParams.cancel_url = cancelUrl;

  console.log(
    "[stripe-checkout] Creating session for:",
    referenceId,
    "amount:",
    finalAmount
  );

  const stripeRes = await fetch(`${STRIPE_API_URL}/checkout/sessions`, {
    method: "POST",
    headers: stripeAuthHeader(config.secret_key),
    body: toFormEncoded(sessionParams),
  });

  const rawText = await stripeRes.text();
  let stripeData: any;
  try {
    stripeData = JSON.parse(rawText);
  } catch {
    console.error(
      "[stripe-checkout] Failed to parse Stripe response:",
      rawText.substring(0, 500)
    );
    return errorResponse(
      `Resposta inesperada do Stripe (status ${stripeRes.status})`,
      502
    );
  }

  if (!stripeRes.ok) {
    console.error(
      "[stripe-checkout] Stripe error:",
      JSON.stringify(stripeData)
    );
    return errorResponse(
      `Erro Stripe: ${stripeData.error?.message || JSON.stringify(stripeData)}`,
      502
    );
  }

  const { error: orderErr } = await db.from("pagbank_orders").insert({
    reference_id: referenceId,
    pagbank_order_id: stripeData.id,
    course_id,
    course_title,
    student_deal_id,
    student_name,
    student_email,
    amount: finalAmount,
    original_amount: amount,
    discount_amount: discountAmount,
    coupon_code: coupon_code || null,
    payment_method: "STRIPE_CHECKOUT",
    payment_gateway: "stripe",
    status: "PENDING",
  });

  if (orderErr)
    console.error("[stripe-checkout] DB insert order error:", orderErr);

  const { data: insertedOrder } = await db
    .from("pagbank_orders")
    .select("id")
    .eq("reference_id", referenceId)
    .single();

  if (insertedOrder) {
    await db.from("pagbank_payments").insert({
      order_id: insertedOrder.id,
      payment_method: "STRIPE_CHECKOUT",
      amount: finalAmount,
      status: "WAITING",
    });
  }

  if (couponId && insertedOrder?.id) {
    await db.from("pagbank_coupon_usage").insert({
      coupon_id: couponId,
      order_id: insertedOrder.id,
      student_deal_id,
      student_email,
      original_amount: amount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
    });

    const { data: couponRow } = await db
      .from("pagbank_coupons")
      .select("current_uses")
      .eq("id", couponId)
      .single();
    if (couponRow) {
      await db
        .from("pagbank_coupons")
        .update({
          current_uses: (couponRow.current_uses || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", couponId);
    }
  }

  return jsonResponse({
    success: true,
    session_id: stripeData.id,
    session_url: stripeData.url,
    reference_id: referenceId,
  });
}

async function handleCheckStatus(req: Request): Promise<Response> {
  const body = await req.json();
  const { reference_id } = body;

  if (!reference_id) {
    return errorResponse("Informe reference_id");
  }

  const db = getSupabaseServiceClient();

  const { data: localOrder } = await db
    .from("pagbank_orders")
    .select("*, pagbank_payments(*)")
    .eq("reference_id", reference_id)
    .maybeSingle();

  if (!localOrder) {
    return errorResponse("Pedido não encontrado", 404);
  }

  if (
    localOrder.pagbank_order_id &&
    localOrder.payment_gateway === "stripe" &&
    localOrder.status !== "PAID"
  ) {
    try {
      const config = await getStripeConfig();
      const res = await fetch(
        `${STRIPE_API_URL}/checkout/sessions/${localOrder.pagbank_order_id}`,
        { headers: stripeAuthHeader(config.secret_key) }
      );

      if (res.ok) {
        const session = await res.json();
        const newStatus =
          session.payment_status === "paid" ? "PAID" : localOrder.status;

        if (newStatus !== localOrder.status) {
          await db
            .from("pagbank_orders")
            .update({
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", localOrder.id);

          if (newStatus === "PAID") {
            await db
              .from("pagbank_payments")
              .update({
                status: "PAID",
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("order_id", localOrder.id);
          }

          localOrder.status = newStatus;
        }
      }
    } catch (e) {
      console.error("[stripe-checkout] Error checking Stripe status:", e);
    }
  }

  const { data: updatedOrder } = await db
    .from("pagbank_orders")
    .select("*, pagbank_payments(*)")
    .eq("id", localOrder.id)
    .single();

  return jsonResponse(updatedOrder || localOrder);
}

async function validateCouponInternal(
  db: any,
  couponCode: string,
  amount: number,
  courseId?: string,
  studentDealId?: string,
  studentEmail?: string
): Promise<{
  valid: boolean;
  coupon?: any;
  discount_amount: number;
  final_amount: number;
  message: string;
}> {
  const { data: coupon } = await db
    .from("pagbank_coupons")
    .select("*")
    .ilike("code", couponCode)
    .eq("is_active", true)
    .maybeSingle();

  if (!coupon) {
    return {
      valid: false,
      discount_amount: 0,
      final_amount: amount,
      message: "Cupom não encontrado ou inativo.",
    };
  }

  const now = new Date();

  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return {
      valid: false,
      discount_amount: 0,
      final_amount: amount,
      message: "Este cupom ainda não está válido.",
    };
  }

  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return {
      valid: false,
      discount_amount: 0,
      final_amount: amount,
      message: "Este cupom expirou.",
    };
  }

  if (coupon.max_uses > 0 && coupon.current_uses >= coupon.max_uses) {
    return {
      valid: false,
      discount_amount: 0,
      final_amount: amount,
      message: "Este cupom atingiu o limite máximo de usos.",
    };
  }

  if (coupon.course_id && courseId && coupon.course_id !== courseId) {
    return {
      valid: false,
      discount_amount: 0,
      final_amount: amount,
      message: "Este cupom não é válido para este curso.",
    };
  }

  if (coupon.min_amount > 0 && amount < coupon.min_amount) {
    const minFormatted = (coupon.min_amount / 100).toFixed(2);
    return {
      valid: false,
      discount_amount: 0,
      final_amount: amount,
      message: `Valor mínimo para este cupom: R$ ${minFormatted}`,
    };
  }

  if (studentDealId || studentEmail) {
    let usageQuery = db
      .from("pagbank_coupon_usage")
      .select("id")
      .eq("coupon_id", coupon.id);
    if (studentDealId)
      usageQuery = usageQuery.eq("student_deal_id", studentDealId);
    else if (studentEmail)
      usageQuery = usageQuery.eq("student_email", studentEmail);
    const { data: existingUsage } = await usageQuery;
    if (existingUsage && existingUsage.length > 0) {
      return {
        valid: false,
        discount_amount: 0,
        final_amount: amount,
        message: "Você já utilizou este cupom.",
      };
    }
  }

  let discountAmount = 0;
  if (coupon.discount_type === "percentage") {
    discountAmount = Math.round((amount * coupon.discount_value) / 100);
  } else {
    discountAmount = Math.round(coupon.discount_value * 100);
  }

  if (coupon.max_discount && discountAmount > coupon.max_discount) {
    discountAmount = coupon.max_discount;
  }

  if (discountAmount >= amount) {
    discountAmount = amount - 1;
  }

  const finalAmount = amount - discountAmount;

  return {
    valid: true,
    coupon,
    discount_amount: discountAmount,
    final_amount: finalAmount,
    message: `Cupom aplicado! Desconto de R$ ${(discountAmount / 100).toFixed(2)}`,
  };
}

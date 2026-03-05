import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const PAGBANK_API_URL = "https://api.pagseguro.com";
const PAGBANK_SANDBOX_URL = "https://sandbox.api.pagseguro.com";

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

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

async function getPagBankConfig() {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("pagbank_config")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new Error("PagBank não configurado. Cadastre o token e a chave pública nas configurações.");
  return data;
}

function getApiUrl(sandbox: boolean): string {
  return sandbox ? PAGBANK_SANDBOX_URL : PAGBANK_API_URL;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(req.url);
  const action = url.pathname.split("/").pop();

  try {
    switch (action) {
      case "config":
        return await handleGetConfig();
      case "create-checkout":
        return await handleCreateCheckout(req);
      case "create-order":
        return await handleCreateOrder(req);
      case "check-status":
        return await handleCheckStatus(req);
      case "validate-coupon":
        return await handleValidateCoupon(req);
      default:
        return errorResponse("Ação desconhecida: " + action, 404);
    }
  } catch (err: any) {
    console.error("pagbank-orders error:", err);
    return errorResponse(err.message || "Erro interno", 500);
  }
});

// ── GET /config ──────────────────────────────────────────────

async function handleGetConfig(): Promise<Response> {
  const db = getSupabaseServiceClient();
  const { data } = await db
    .from("pagbank_config")
    .select("public_key, sandbox_mode")
    .limit(1)
    .maybeSingle();

  if (!data) {
    return jsonResponse({ configured: false, public_key: null, sandbox_mode: true });
  }

  return jsonResponse({
    configured: true,
    public_key: data.public_key,
    sandbox_mode: data.sandbox_mode,
  });
}

// ── POST /create-checkout ────────────────────────────────────

async function handleCreateCheckout(req: Request): Promise<Response> {
  const body = await req.json();
  const {
    course_id,
    course_title,
    student_deal_id,
    student_name,
    student_email,
    student_cpf,
    student_phone,
    amount,
    coupon_code,
    return_url,
  } = body;

  if (!course_id || !student_deal_id || !amount) {
    return errorResponse("Campos obrigatórios: course_id, student_deal_id, amount");
  }

  const config = await getPagBankConfig();
  const apiUrl = getApiUrl(config.sandbox_mode);
  const db = getSupabaseServiceClient();

  const referenceId = `VOLL-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  let finalAmount = amount;
  let discountAmount = 0;
  let couponId: string | null = null;

  if (coupon_code) {
    const couponResult = await validateCouponInternal(db, coupon_code, amount, course_id, student_deal_id, student_email);
    if (!couponResult.valid) {
      return errorResponse(couponResult.message);
    }
    finalAmount = couponResult.final_amount;
    discountAmount = couponResult.discount_amount;
    couponId = couponResult.coupon?.id || null;
  }

  const cleanCpf = (student_cpf || "").replace(/\D/g, "");

  const checkoutPayload: any = {
    reference_id: referenceId,
    items: [
      {
        name: (course_title || "Curso Online").substring(0, 64),
        quantity: 1,
        unit_amount: finalAmount,
      },
    ],
  };

  if (student_name || student_email) {
    const customerObj: any = {};
    if (student_name) customerObj.name = student_name;
    if (student_email) customerObj.email = student_email;
    if (cleanCpf && cleanCpf.length === 11) customerObj.tax_id = cleanCpf;
    checkoutPayload.customer = customerObj;
    checkoutPayload.customer_modifiable = true;
  }

  if (config.notification_url) {
    checkoutPayload.payment_notification_urls = [config.notification_url];
    checkoutPayload.notification_urls = [config.notification_url];
  }

  if (return_url) {
    checkoutPayload.redirect_urls = {
      return_url: return_url,
      back_url: return_url,
    };
  }

  console.log("[pagbank-orders] Creating checkout:", JSON.stringify(checkoutPayload).substring(0, 500));

  const pagbankRes = await fetch(`${apiUrl}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.api_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(checkoutPayload),
  });

  const rawText = await pagbankRes.text();
  console.log("[pagbank-orders] Checkout response status:", pagbankRes.status, "body:", rawText.substring(0, 500));

  let pagbankData: any;
  try {
    pagbankData = JSON.parse(rawText);
  } catch {
    console.error("[pagbank-orders] Failed to parse PagBank response:", rawText.substring(0, 500));
    return errorResponse(`Resposta inesperada do PagBank (status ${pagbankRes.status}): ${rawText.substring(0, 200)}`, 502);
  }

  if (!pagbankRes.ok) {
    console.error("[pagbank-orders] PagBank checkout error:", JSON.stringify(pagbankData));
    return errorResponse(
      `Erro PagBank: ${pagbankData.error_messages?.[0]?.description || pagbankData.message || JSON.stringify(pagbankData)}`,
      502
    );
  }

  const payLink = pagbankData.links?.find((l: any) => l.rel === "PAY")?.href;

  const { error: orderErr } = await db.from("pagbank_orders").insert({
    reference_id: referenceId,
    pagbank_order_id: pagbankData.id,
    course_id,
    course_title,
    student_deal_id,
    student_name,
    student_email,
    student_cpf: cleanCpf,
    amount: finalAmount,
    original_amount: amount,
    discount_amount: discountAmount,
    coupon_code: coupon_code || null,
    payment_method: "CHECKOUT",
    status: "PENDING",
  });

  if (orderErr) console.error("[pagbank-orders] DB insert order error:", orderErr);

  const { data: insertedOrder } = await db
    .from("pagbank_orders")
    .select("id")
    .eq("reference_id", referenceId)
    .single();

  if (insertedOrder) {
    await db.from("pagbank_payments").insert({
      order_id: insertedOrder.id,
      payment_method: "CHECKOUT",
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
      await db.from("pagbank_coupons")
        .update({ current_uses: (couponRow.current_uses || 0) + 1, updated_at: new Date().toISOString() })
        .eq("id", couponId);
    }
  }

  return jsonResponse({
    success: true,
    checkout_id: pagbankData.id,
    reference_id: referenceId,
    pay_url: payLink || null,
    links: pagbankData.links || [],
  });
}

// ── POST /create-order ───────────────────────────────────────

async function handleCreateOrder(req: Request): Promise<Response> {
  const body = await req.json();
  const {
    course_id,
    course_title,
    student_deal_id,
    student_name,
    student_email,
    student_cpf,
    student_phone,
    amount,
    payment_method,
    card_encrypted,
    installments,
    coupon_code,
  } = body;

  if (!course_id || !student_deal_id || !amount || !payment_method) {
    return errorResponse("Campos obrigatórios: course_id, student_deal_id, amount, payment_method");
  }

  const config = await getPagBankConfig();
  const apiUrl = getApiUrl(config.sandbox_mode);
  const db = getSupabaseServiceClient();

  const referenceId = `VOLL-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  let finalAmount = amount;
  let discountAmount = 0;
  let couponId: string | null = null;

  if (coupon_code) {
    const couponResult = await validateCouponInternal(db, coupon_code, amount, course_id, student_deal_id, student_email);
    if (!couponResult.valid) {
      return errorResponse(couponResult.message);
    }
    finalAmount = couponResult.final_amount;
    discountAmount = couponResult.discount_amount;
    couponId = couponResult.coupon?.id || null;
  }

  const phoneParts = parsePhone(student_phone || "");
  const cleanCpf = (student_cpf || "").replace(/\D/g, "");

  const orderPayload: any = {
    reference_id: referenceId,
    customer: {
      name: student_name || "Aluno",
      email: student_email || "aluno@voll.com.br",
      tax_id: cleanCpf,
      phones: phoneParts ? [phoneParts] : [],
    },
    items: [
      {
        reference_id: course_id,
        name: course_title || "Curso Online",
        quantity: 1,
        unit_amount: finalAmount,
      },
    ],
    notification_urls: config.notification_url
      ? [config.notification_url]
      : [],
  };

  if (payment_method === "CREDIT_CARD") {
    if (!card_encrypted) {
      return errorResponse("Dados criptografados do cartão são obrigatórios para pagamento com cartão.");
    }
    orderPayload.charges = [
      {
        reference_id: referenceId,
        description: course_title || "Curso Online VOLL",
        amount: { value: finalAmount, currency: "BRL" },
        payment_method: {
          type: "CREDIT_CARD",
          installments: installments || 1,
          capture: true,
          card: {
            encrypted: card_encrypted,
            store: false,
          },
        },
      },
    ];
  } else if (payment_method === "PIX") {
    orderPayload.qr_codes = [
      {
        amount: { value: finalAmount },
        expiration_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
    ];
  } else if (payment_method === "BOLETO") {
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const dueDateStr = dueDate.toISOString().split("T")[0];
    orderPayload.charges = [
      {
        reference_id: referenceId,
        description: course_title || "Curso Online VOLL",
        amount: { value: finalAmount, currency: "BRL" },
        payment_method: {
          type: "BOLETO",
          boleto: {
            due_date: dueDateStr,
            instruction_lines: {
              line_1: "Pagamento referente a curso online VOLL Pilates",
              line_2: "Não aceitar após vencimento",
            },
            holder: {
              name: student_name || "Aluno",
              tax_id: cleanCpf,
              email: student_email || "",
              address: {
                country: "BRA",
                region: "SP",
                region_code: "SP",
                city: "São Paulo",
                postal_code: "01000000",
                street: "Não informado",
                number: "0",
                locality: "Centro",
              },
            },
          },
        },
      },
    ];
  } else {
    return errorResponse("Método de pagamento inválido. Use: CREDIT_CARD, PIX ou BOLETO");
  }

  console.log("[pagbank-orders] Creating order:", JSON.stringify(orderPayload).substring(0, 500));

  const pagbankRes = await fetch(`${apiUrl}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.api_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderPayload),
  });

  const pagbankData = await pagbankRes.json();

  if (!pagbankRes.ok) {
    console.error("[pagbank-orders] PagBank error:", JSON.stringify(pagbankData));
    return errorResponse(
      `Erro PagBank: ${pagbankData.error_messages?.[0]?.description || pagbankData.message || JSON.stringify(pagbankData)}`,
      502
    );
  }

  const { error: orderErr } = await db.from("pagbank_orders").insert({
    reference_id: referenceId,
    pagbank_order_id: pagbankData.id,
    course_id,
    course_title,
    student_deal_id,
    student_name,
    student_email,
    student_cpf: cleanCpf,
    amount: finalAmount,
    original_amount: amount,
    discount_amount: discountAmount,
    coupon_code: coupon_code || null,
    payment_method,
    status: extractOrderStatus(pagbankData, payment_method),
  });

  if (orderErr) console.error("[pagbank-orders] DB insert order error:", orderErr);

  const { data: insertedOrder } = await db
    .from("pagbank_orders")
    .select("id")
    .eq("reference_id", referenceId)
    .single();

  const paymentRecord: any = {
    order_id: insertedOrder?.id,
    payment_method,
    amount: finalAmount,
    status: "WAITING",
    installments: installments || 1,
  };

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
      await db.from("pagbank_coupons")
        .update({ current_uses: (couponRow.current_uses || 0) + 1, updated_at: new Date().toISOString() })
        .eq("id", couponId);
    }
  }

  if (payment_method === "CREDIT_CARD" && pagbankData.charges?.[0]) {
    const charge = pagbankData.charges[0];
    paymentRecord.pagbank_charge_id = charge.id;
    paymentRecord.status = charge.status;
    if (charge.status === "PAID") paymentRecord.paid_at = charge.paid_at;
    if (charge.payment_method?.card) {
      paymentRecord.card_brand = charge.payment_method.card.brand;
      paymentRecord.card_last_digits = charge.payment_method.card.last_digits;
    }
  } else if (payment_method === "PIX" && pagbankData.qr_codes?.[0]) {
    const qr = pagbankData.qr_codes[0];
    paymentRecord.pagbank_charge_id = qr.id;
    paymentRecord.pix_qrcode = qr.text;
    paymentRecord.pix_qrcode_image = qr.links?.find((l: any) => l.media === "image/png")?.href;
    paymentRecord.pix_expiration = qr.expiration_date;
    paymentRecord.status = "WAITING";
  } else if (payment_method === "BOLETO" && pagbankData.charges?.[0]) {
    const charge = pagbankData.charges[0];
    paymentRecord.pagbank_charge_id = charge.id;
    paymentRecord.status = charge.status || "WAITING";
    const boletoLinks = charge.links || [];
    const pdfLink = boletoLinks.find((l: any) => l.media === "application/pdf");
    if (pdfLink) paymentRecord.boleto_url = pdfLink.href;
    if (charge.payment_method?.boleto) {
      paymentRecord.boleto_barcode = charge.payment_method.boleto.barcode;
      paymentRecord.boleto_due_date = charge.payment_method.boleto.due_date;
    }
  }

  const { error: payErr } = await db.from("pagbank_payments").insert(paymentRecord);
  if (payErr) console.error("[pagbank-orders] DB insert payment error:", payErr);

  return jsonResponse({
    success: true,
    order_id: pagbankData.id,
    reference_id: referenceId,
    status: extractOrderStatus(pagbankData, payment_method),
    payment: {
      method: payment_method,
      status: paymentRecord.status,
      pix_qrcode: paymentRecord.pix_qrcode || null,
      pix_qrcode_image: paymentRecord.pix_qrcode_image || null,
      pix_expiration: paymentRecord.pix_expiration || null,
      boleto_url: paymentRecord.boleto_url || null,
      boleto_barcode: paymentRecord.boleto_barcode || null,
      boleto_due_date: paymentRecord.boleto_due_date || null,
      card_brand: paymentRecord.card_brand || null,
      card_last_digits: paymentRecord.card_last_digits || null,
      installments: paymentRecord.installments,
      charge_id: paymentRecord.pagbank_charge_id || null,
    },
  });
}

// ── POST /check-status ───────────────────────────────────────

async function handleCheckStatus(req: Request): Promise<Response> {
  const body = await req.json();
  const { order_id, reference_id } = body;

  if (!order_id && !reference_id) {
    return errorResponse("Informe order_id ou reference_id");
  }

  const config = await getPagBankConfig();
  const db = getSupabaseServiceClient();

  let query = db.from("pagbank_orders").select("*, pagbank_payments(*)");
  if (order_id) query = query.eq("pagbank_order_id", order_id);
  else query = query.eq("reference_id", reference_id);

  const { data: localOrder } = await query.maybeSingle();

  if (!localOrder) {
    return errorResponse("Pedido não encontrado", 404);
  }

  if (localOrder.pagbank_order_id) {
    try {
      const apiUrl = getApiUrl(config.sandbox_mode);
      const res = await fetch(`${apiUrl}/orders/${localOrder.pagbank_order_id}`, {
        headers: { Authorization: `Bearer ${config.api_token}` },
      });

      if (res.ok) {
        const pagbankData = await res.json();
        const newStatus = extractOrderStatus(pagbankData, localOrder.payment_method);

        if (newStatus !== localOrder.status) {
          await db.from("pagbank_orders")
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq("id", localOrder.id);

          if (pagbankData.charges?.[0]) {
            const charge = pagbankData.charges[0];
            await db.from("pagbank_payments")
              .update({
                status: charge.status,
                paid_at: charge.paid_at || null,
                updated_at: new Date().toISOString(),
              })
              .eq("order_id", localOrder.id);
          }

          if (pagbankData.qr_codes?.[0]?.arrangements?.[0]?.status === "PAID" ||
              pagbankData.charges?.[0]?.status === "PAID") {
            await db.from("pagbank_payments")
              .update({ status: "PAID", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
              .eq("order_id", localOrder.id);
          }
        }

        localOrder.status = newStatus;
      }
    } catch (e) {
      console.error("[pagbank-orders] Error checking PagBank status:", e);
    }
  }

  const { data: updatedOrder } = await db
    .from("pagbank_orders")
    .select("*, pagbank_payments(*)")
    .eq("id", localOrder.id)
    .single();

  return jsonResponse(updatedOrder || localOrder);
}

// ── POST /validate-coupon ────────────────────────────────────

async function handleValidateCoupon(req: Request): Promise<Response> {
  const body = await req.json();
  const { coupon_code, amount, course_id, student_deal_id, student_email } = body;

  if (!coupon_code || !amount) {
    return errorResponse("Informe coupon_code e amount");
  }

  const db = getSupabaseServiceClient();
  const result = await validateCouponInternal(db, coupon_code, amount, course_id, student_deal_id, student_email);
  return jsonResponse(result);
}

async function validateCouponInternal(
  db: any,
  couponCode: string,
  amount: number,
  courseId?: string,
  studentDealId?: string,
  studentEmail?: string,
): Promise<{ valid: boolean; coupon?: any; discount_amount: number; final_amount: number; message: string }> {
  const { data: coupon } = await db
    .from("pagbank_coupons")
    .select("*")
    .ilike("code", couponCode)
    .eq("is_active", true)
    .maybeSingle();

  if (!coupon) {
    return { valid: false, discount_amount: 0, final_amount: amount, message: "Cupom não encontrado ou inativo." };
  }

  const now = new Date();

  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { valid: false, discount_amount: 0, final_amount: amount, message: "Este cupom ainda não está válido." };
  }

  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { valid: false, discount_amount: 0, final_amount: amount, message: "Este cupom expirou." };
  }

  if (coupon.max_uses > 0 && coupon.current_uses >= coupon.max_uses) {
    return { valid: false, discount_amount: 0, final_amount: amount, message: "Este cupom atingiu o limite máximo de usos." };
  }

  if (coupon.course_id && courseId && coupon.course_id !== courseId) {
    return { valid: false, discount_amount: 0, final_amount: amount, message: "Este cupom não é válido para este curso." };
  }

  if (coupon.min_amount > 0 && amount < coupon.min_amount) {
    const minFormatted = (coupon.min_amount / 100).toFixed(2);
    return { valid: false, discount_amount: 0, final_amount: amount, message: `Valor mínimo para este cupom: R$ ${minFormatted}` };
  }

  if (studentDealId || studentEmail) {
    let usageQuery = db.from("pagbank_coupon_usage").select("id").eq("coupon_id", coupon.id);
    if (studentDealId) usageQuery = usageQuery.eq("student_deal_id", studentDealId);
    else if (studentEmail) usageQuery = usageQuery.eq("student_email", studentEmail);
    const { data: existingUsage } = await usageQuery;
    if (existingUsage && existingUsage.length > 0) {
      return { valid: false, discount_amount: 0, final_amount: amount, message: "Você já utilizou este cupom." };
    }
  }

  let discountAmount = 0;
  if (coupon.discount_type === "percentage") {
    discountAmount = Math.round(amount * coupon.discount_value / 100);
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

// ── Helpers ──────────────────────────────────────────────────

function extractOrderStatus(pagbankData: any, paymentMethod: string): string {
  if (paymentMethod === "CREDIT_CARD" && pagbankData.charges?.[0]) {
    return pagbankData.charges[0].status || "PENDING";
  }
  if (paymentMethod === "PIX") {
    return "WAITING_PIX";
  }
  if (paymentMethod === "BOLETO" && pagbankData.charges?.[0]) {
    return pagbankData.charges[0].status || "WAITING_BOLETO";
  }
  return "PENDING";
}

function parsePhone(phone: string): any {
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 10) return null;
  const area = clean.substring(0, 2);
  const number = clean.substring(2);
  return {
    country: "55",
    area,
    number,
    type: number.length === 9 ? "MOBILE" : "BUSINESS",
  };
}

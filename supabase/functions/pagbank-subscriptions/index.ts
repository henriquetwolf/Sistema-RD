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
  if (error || !data) throw new Error("PagBank não configurado.");
  return data;
}

function getApiUrl(sandbox: boolean): string {
  if (Deno.env.get("FORCE_PAGBANK_SANDBOX") === "true") return PAGBANK_SANDBOX_URL;
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
      case "create-plan":
        return await handleCreatePlan(req);
      case "subscribe":
        return await handleSubscribe(req);
      case "cancel":
        return await handleCancel(req);
      case "status":
        return await handleStatus(req);
      case "list-plans":
        return await handleListPlans();
      case "list-subscriptions":
        return await handleListSubscriptions(req);
      default:
        return errorResponse("Ação desconhecida: " + action, 404);
    }
  } catch (err: any) {
    console.error("pagbank-subscriptions error:", err);
    return errorResponse(err.message || "Erro interno", 500);
  }
});

// ── POST /create-plan ────────────────────────────────────────

async function handleCreatePlan(req: Request): Promise<Response> {
  const body = await req.json();
  const { course_id, name, description, amount, interval_unit, interval_length, trial_days, billing_cycles } = body;

  if (!course_id || !name || !amount) {
    return errorResponse("Campos obrigatórios: course_id, name, amount");
  }

  const config = await getPagBankConfig();
  const apiUrl = getApiUrl(config.sandbox_mode);
  const db = getSupabaseServiceClient();

  const planPayload = {
    reference_id: `PLAN-${course_id}-${Date.now()}`,
    name,
    description: description || name,
    interval: {
      unit: interval_unit || "MONTH",
      length: interval_length || 1,
    },
    trial: trial_days ? { days: trial_days, enabled: true, hold_setup_fee: false } : undefined,
    payment_method: ["CREDIT_CARD", "BOLETO"],
    amount: { value: amount, currency: "BRL" },
  };

  const res = await fetch(`${apiUrl}/pre-approvals/request`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.api_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(planPayload),
  });

  let pagbankPlanId = null;
  if (res.ok) {
    const data = await res.json();
    pagbankPlanId = data.id || data.code;
  } else {
    const errText = await res.text();
    console.error("[pagbank-subscriptions] PagBank create plan error:", errText);
  }

  const { data: plan, error } = await db.from("pagbank_plans").insert({
    pagbank_plan_id: pagbankPlanId,
    course_id,
    name,
    description,
    amount,
    interval_unit: interval_unit || "MONTH",
    interval_length: interval_length || 1,
    trial_days: trial_days || 0,
    billing_cycles: billing_cycles || 0,
    status: "ACTIVE",
  }).select().single();

  if (error) return errorResponse("Erro ao salvar plano: " + error.message, 500);

  return jsonResponse({ success: true, plan });
}

// ── POST /subscribe ──────────────────────────────────────────

async function handleSubscribe(req: Request): Promise<Response> {
  const body = await req.json();
  const { plan_id, student_deal_id, student_name, student_email, student_cpf, card_encrypted } = body;

  if (!plan_id || !student_deal_id) {
    return errorResponse("Campos obrigatórios: plan_id, student_deal_id");
  }

  const config = await getPagBankConfig();
  const apiUrl = getApiUrl(config.sandbox_mode);
  const db = getSupabaseServiceClient();

  const { data: plan } = await db
    .from("pagbank_plans")
    .select("*")
    .eq("id", plan_id)
    .single();

  if (!plan) return errorResponse("Plano não encontrado", 404);

  let pagbankSubId = null;

  if (plan.pagbank_plan_id) {
    const subPayload: any = {
      plan: plan.pagbank_plan_id,
      reference: `SUB-${student_deal_id}-${Date.now()}`,
      sender: {
        name: student_name || "Aluno",
        email: student_email || "aluno@voll.com.br",
        phone: { areaCode: "11", number: "999999999" },
        documents: student_cpf ? [{ type: "CPF", value: student_cpf.replace(/\D/g, "") }] : [],
      },
      payment_method: {
        type: card_encrypted ? "CREDIT_CARD" : "BOLETO",
        card: card_encrypted ? { encrypted: card_encrypted } : undefined,
      },
    };

    try {
      const res = await fetch(`${apiUrl}/pre-approvals`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.api_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subPayload),
      });

      if (res.ok) {
        const data = await res.json();
        pagbankSubId = data.id || data.code;
      } else {
        console.error("[pagbank-subscriptions] PagBank subscribe error:", await res.text());
      }
    } catch (e) {
      console.error("[pagbank-subscriptions] Fetch error:", e);
    }
  }

  const nextBilling = new Date();
  nextBilling.setMonth(nextBilling.getMonth() + (plan.interval_length || 1));

  const { data: sub, error } = await db.from("pagbank_subscriptions").insert({
    pagbank_subscription_id: pagbankSubId,
    plan_id,
    student_deal_id,
    student_name,
    student_email,
    status: pagbankSubId ? "ACTIVE" : "PENDING",
    next_billing_date: nextBilling.toISOString().split("T")[0],
  }).select().single();

  if (error) return errorResponse("Erro ao salvar assinatura: " + error.message, 500);

  if (pagbankSubId || !plan.pagbank_plan_id) {
    const { data: existingAccess } = await db
      .from("crm_student_course_access")
      .select("id")
      .eq("student_deal_id", student_deal_id)
      .eq("course_id", plan.course_id)
      .maybeSingle();

    if (!existingAccess) {
      await db.from("crm_student_course_access").insert({
        student_deal_id,
        course_id: plan.course_id,
        unlocked_at: new Date().toISOString(),
      });
    }
  }

  return jsonResponse({ success: true, subscription: sub });
}

// ── POST /cancel ─────────────────────────────────────────────

async function handleCancel(req: Request): Promise<Response> {
  const body = await req.json();
  const { subscription_id } = body;

  if (!subscription_id) return errorResponse("Campo 'subscription_id' obrigatório");

  const db = getSupabaseServiceClient();

  const { data: sub } = await db
    .from("pagbank_subscriptions")
    .select("*, pagbank_plans(*)")
    .eq("id", subscription_id)
    .single();

  if (!sub) return errorResponse("Assinatura não encontrada", 404);

  if (sub.pagbank_subscription_id) {
    try {
      const config = await getPagBankConfig();
      const apiUrl = getApiUrl(config.sandbox_mode);
      await fetch(`${apiUrl}/pre-approvals/${sub.pagbank_subscription_id}/cancel`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${config.api_token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (e) {
      console.error("[pagbank-subscriptions] PagBank cancel error:", e);
    }
  }

  await db.from("pagbank_subscriptions")
    .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
    .eq("id", subscription_id);

  return jsonResponse({ success: true, message: "Assinatura cancelada." });
}

// ── GET/POST /status ─────────────────────────────────────────

async function handleStatus(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { subscription_id } = body;

  if (!subscription_id) return errorResponse("Campo 'subscription_id' obrigatório");

  const db = getSupabaseServiceClient();
  const { data } = await db
    .from("pagbank_subscriptions")
    .select("*, pagbank_plans(*)")
    .eq("id", subscription_id)
    .single();

  if (!data) return errorResponse("Assinatura não encontrada", 404);

  return jsonResponse(data);
}

// ── GET /list-plans ──────────────────────────────────────────

async function handleListPlans(): Promise<Response> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("pagbank_plans")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return errorResponse("Erro ao listar planos: " + error.message, 500);
  return jsonResponse(data || []);
}

// ── POST /list-subscriptions ─────────────────────────────────

async function handleListSubscriptions(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const db = getSupabaseServiceClient();

  let query = db.from("pagbank_subscriptions").select("*, pagbank_plans(*)").order("created_at", { ascending: false });

  if (body.student_deal_id) {
    query = query.eq("student_deal_id", body.student_deal_id);
  }
  if (body.status) {
    query = query.eq("status", body.status);
  }

  const { data, error } = await query;
  if (error) return errorResponse("Erro ao listar assinaturas: " + error.message, 500);
  return jsonResponse(data || []);
}

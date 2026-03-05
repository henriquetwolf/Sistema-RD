import { createClient } from '@supabase/supabase-js';
import type {
  PagBankConfig,
  PagBankOrder,
  PagBankPlan,
  PagBankSubscription,
  PagBankCreateOrderPayload,
  PagBankCreateOrderResponse,
  PagBankWebhookLog,
  PagBankCoupon,
  PagBankCouponUsage,
  PagBankCouponValidation,
} from '../types';

const SUPABASE_URL = (import.meta as any).env?.VITE_APP_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_APP_SUPABASE_ANON_KEY || '';
const EDGE_BASE = `${SUPABASE_URL}/functions/v1`;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY }
    : { apikey: SUPABASE_KEY };
}

async function edgeFetch(fn: string, path: string, options: RequestInit = {}): Promise<any> {
  const headers = await getAuthHeader();
  const url = `${EDGE_BASE}/${fn}/${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(options.headers as Record<string, string> || {}),
      },
    });

    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Resposta inesperada (${res.status}): ${text.substring(0, 200)}`);
    }

    if (!res.ok) {
      throw new Error(json.error || `Edge function error: ${res.status}`);
    }
    return json;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Timeout: a operação demorou mais de 60 segundos.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Configuration ────────────────────────────────────────────

async function getConfig(): Promise<{ configured: boolean; public_key: string | null; sandbox_mode: boolean }> {
  return edgeFetch('pagbank-orders', 'config', { method: 'GET' });
}

async function getFullConfig(): Promise<PagBankConfig | null> {
  const { data } = await supabase
    .from('pagbank_config')
    .select('*')
    .limit(1)
    .maybeSingle();
  return data;
}

async function saveConfig(config: {
  api_token: string;
  public_key: string;
  sandbox_mode: boolean;
  webhook_secret?: string;
  notification_url?: string;
}): Promise<void> {
  const { data: existing } = await supabase
    .from('pagbank_config')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('pagbank_config')
      .update({ ...config, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('pagbank_config').insert(config);
  }
}

// ── Orders ───────────────────────────────────────────────────

async function createOrder(payload: PagBankCreateOrderPayload): Promise<PagBankCreateOrderResponse> {
  return edgeFetch('pagbank-orders', 'create-order', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function createCheckout(payload: {
  course_id: string;
  course_title?: string;
  student_deal_id: string;
  student_name?: string;
  student_email?: string;
  student_cpf?: string;
  student_phone?: string;
  amount: number;
  coupon_code?: string;
  return_url?: string;
}): Promise<{ success: boolean; checkout_id: string; reference_id: string; pay_url: string | null }> {
  return edgeFetch('pagbank-orders', 'create-checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function checkOrderStatus(orderId?: string, referenceId?: string): Promise<PagBankOrder> {
  return edgeFetch('pagbank-orders', 'check-status', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId, reference_id: referenceId }),
  });
}

async function getOrders(filters?: {
  status?: string;
  course_id?: string;
  student_deal_id?: string;
  limit?: number;
}): Promise<PagBankOrder[]> {
  let query = supabase
    .from('pagbank_orders')
    .select('*, pagbank_payments(*)')
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.course_id) query = query.eq('course_id', filters.course_id);
  if (filters?.student_deal_id) query = query.eq('student_deal_id', filters.student_deal_id);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data } = await query;
  return (data || []) as PagBankOrder[];
}

async function getStudentOrders(studentDealId: string): Promise<PagBankOrder[]> {
  return getOrders({ student_deal_id: studentDealId });
}

// ── Plans ────────────────────────────────────────────────────

async function createPlan(plan: {
  course_id: string;
  name: string;
  description?: string;
  amount: number;
  interval_unit?: string;
  interval_length?: number;
  trial_days?: number;
  billing_cycles?: number;
}): Promise<PagBankPlan> {
  const result = await edgeFetch('pagbank-subscriptions', 'create-plan', {
    method: 'POST',
    body: JSON.stringify(plan),
  });
  return result.plan;
}

async function getPlans(): Promise<PagBankPlan[]> {
  const { data } = await supabase
    .from('pagbank_plans')
    .select('*')
    .order('created_at', { ascending: false });
  return (data || []) as PagBankPlan[];
}

async function updatePlanStatus(planId: string, status: string): Promise<void> {
  await supabase
    .from('pagbank_plans')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', planId);
}

// ── Subscriptions ────────────────────────────────────────────

async function subscribe(payload: {
  plan_id: string;
  student_deal_id: string;
  student_name?: string;
  student_email?: string;
  student_cpf?: string;
  card_encrypted?: string;
}): Promise<PagBankSubscription> {
  const result = await edgeFetch('pagbank-subscriptions', 'subscribe', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return result.subscription;
}

async function cancelSubscription(subscriptionId: string): Promise<void> {
  await edgeFetch('pagbank-subscriptions', 'cancel', {
    method: 'POST',
    body: JSON.stringify({ subscription_id: subscriptionId }),
  });
}

async function getSubscriptions(filters?: {
  student_deal_id?: string;
  status?: string;
}): Promise<PagBankSubscription[]> {
  let query = supabase
    .from('pagbank_subscriptions')
    .select('*, pagbank_plans(*)')
    .order('created_at', { ascending: false });

  if (filters?.student_deal_id) query = query.eq('student_deal_id', filters.student_deal_id);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data } = await query;
  return (data || []) as PagBankSubscription[];
}

async function getStudentSubscriptions(studentDealId: string): Promise<PagBankSubscription[]> {
  return getSubscriptions({ student_deal_id: studentDealId });
}

// ── Webhook logs ─────────────────────────────────────────────

async function getWebhookLogs(limit = 50): Promise<PagBankWebhookLog[]> {
  const { data } = await supabase
    .from('pagbank_webhook_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []) as PagBankWebhookLog[];
}

// ── Coupons ──────────────────────────────────────────────────

async function validateCoupon(
  couponCode: string,
  amount: number,
  courseId?: string,
  studentDealId?: string,
  studentEmail?: string,
): Promise<PagBankCouponValidation> {
  return edgeFetch('pagbank-orders', 'validate-coupon', {
    method: 'POST',
    body: JSON.stringify({ coupon_code: couponCode, amount, course_id: courseId, student_deal_id: studentDealId, student_email: studentEmail }),
  });
}

async function getCoupons(): Promise<PagBankCoupon[]> {
  const { data } = await supabase
    .from('pagbank_coupons')
    .select('*')
    .order('created_at', { ascending: false });
  return (data || []) as PagBankCoupon[];
}

async function getCoupon(id: string): Promise<PagBankCoupon | null> {
  const { data } = await supabase
    .from('pagbank_coupons')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data as PagBankCoupon | null;
}

async function createCoupon(coupon: {
  code: string;
  description?: string;
  discount_type: string;
  discount_value: number;
  min_amount?: number;
  max_discount?: number;
  course_id?: string;
  valid_from?: string;
  valid_until?: string;
  max_uses?: number;
  is_active?: boolean;
}): Promise<PagBankCoupon> {
  const { data, error } = await supabase
    .from('pagbank_coupons')
    .insert({
      ...coupon,
      code: coupon.code.toUpperCase().trim(),
      min_amount: coupon.min_amount ? Math.round(coupon.min_amount * 100) : 0,
      max_discount: coupon.max_discount ? Math.round(coupon.max_discount * 100) : null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PagBankCoupon;
}

async function updateCoupon(id: string, updates: Partial<{
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  min_amount: number;
  max_discount: number | null;
  course_id: string | null;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number;
  is_active: boolean;
}>): Promise<void> {
  const payload: any = { ...updates, updated_at: new Date().toISOString() };
  if (updates.code) payload.code = updates.code.toUpperCase().trim();
  if (updates.min_amount !== undefined) payload.min_amount = Math.round(updates.min_amount * 100);
  if (updates.max_discount !== undefined && updates.max_discount !== null) payload.max_discount = Math.round(updates.max_discount * 100);

  const { error } = await supabase
    .from('pagbank_coupons')
    .update(payload)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

async function deleteCoupon(id: string): Promise<void> {
  const { error } = await supabase
    .from('pagbank_coupons')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

async function getCouponUsage(couponId: string): Promise<PagBankCouponUsage[]> {
  const { data } = await supabase
    .from('pagbank_coupon_usage')
    .select('*')
    .eq('coupon_id', couponId)
    .order('created_at', { ascending: false });
  return (data || []) as PagBankCouponUsage[];
}

// ── Stats ────────────────────────────────────────────────────

async function getStats(): Promise<{
  totalOrders: number;
  totalPaid: number;
  totalRevenue: number;
  totalPending: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
}> {
  const { data: orders } = await supabase
    .from('pagbank_orders')
    .select('status, amount');

  const allOrders = orders || [];
  const paid = allOrders.filter(o => o.status === 'PAID');
  const pending = allOrders.filter(o => ['PENDING', 'WAITING_PIX', 'WAITING_BOLETO', 'IN_ANALYSIS', 'AUTHORIZED'].includes(o.status));

  const { data: subs } = await supabase
    .from('pagbank_subscriptions')
    .select('status');

  const allSubs = subs || [];

  return {
    totalOrders: allOrders.length,
    totalPaid: paid.length,
    totalRevenue: paid.reduce((acc, o) => acc + (o.amount || 0), 0),
    totalPending: pending.length,
    totalSubscriptions: allSubs.length,
    activeSubscriptions: allSubs.filter(s => s.status === 'ACTIVE').length,
  };
}

export const pagBankService = {
  getConfig,
  getFullConfig,
  saveConfig,
  createOrder,
  createCheckout,
  checkOrderStatus,
  getOrders,
  getStudentOrders,
  createPlan,
  getPlans,
  updatePlanStatus,
  subscribe,
  cancelSubscription,
  getSubscriptions,
  getStudentSubscriptions,
  getWebhookLogs,
  getStats,
  validateCoupon,
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponUsage,
};

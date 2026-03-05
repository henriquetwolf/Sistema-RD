-- ============================================================
-- PagBank (PagSeguro) Integration – Checkout Transparente
-- Pagamentos de cursos online: Cartão, PIX, Boleto
-- Suporte a compra avulsa e assinatura recorrente
-- ============================================================

-- ── Configuração da conta PagBank ────────────────────────────

CREATE TABLE IF NOT EXISTS pagbank_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_token TEXT NOT NULL,
    public_key TEXT NOT NULL,
    sandbox_mode BOOLEAN DEFAULT true,
    webhook_secret TEXT,
    notification_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pagbank_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service full access pagbank_config"
    ON pagbank_config FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated read pagbank_config"
    ON pagbank_config FOR SELECT TO authenticated USING (true);

-- View segura (sem api_token nem webhook_secret)
CREATE OR REPLACE VIEW pagbank_config_safe AS
SELECT id, public_key, sandbox_mode, notification_url, created_at, updated_at
FROM pagbank_config;

-- ── Pedidos ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pagbank_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id TEXT UNIQUE NOT NULL,
    pagbank_order_id TEXT,
    course_id TEXT NOT NULL,
    course_title TEXT,
    student_deal_id TEXT NOT NULL,
    student_name TEXT,
    student_email TEXT,
    student_cpf TEXT,
    amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pagbank_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service full access pagbank_orders"
    ON pagbank_orders FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated read pagbank_orders"
    ON pagbank_orders FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_pb_orders_student ON pagbank_orders(student_deal_id);
CREATE INDEX IF NOT EXISTS idx_pb_orders_course ON pagbank_orders(course_id);
CREATE INDEX IF NOT EXISTS idx_pb_orders_status ON pagbank_orders(status);
CREATE INDEX IF NOT EXISTS idx_pb_orders_pagbank_id ON pagbank_orders(pagbank_order_id);

-- ── Pagamentos / Charges ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS pagbank_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES pagbank_orders(id) ON DELETE CASCADE,
    pagbank_charge_id TEXT,
    status TEXT DEFAULT 'WAITING',
    paid_at TIMESTAMPTZ,
    payment_method TEXT,
    installments INTEGER DEFAULT 1,
    -- Cartão
    card_brand TEXT,
    card_last_digits TEXT,
    -- PIX
    pix_qrcode TEXT,
    pix_qrcode_image TEXT,
    pix_expiration TIMESTAMPTZ,
    -- Boleto
    boleto_url TEXT,
    boleto_barcode TEXT,
    boleto_due_date DATE,
    --
    amount INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pagbank_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service full access pagbank_payments"
    ON pagbank_payments FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated read pagbank_payments"
    ON pagbank_payments FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_pb_payments_order ON pagbank_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_pb_payments_status ON pagbank_payments(status);
CREATE INDEX IF NOT EXISTS idx_pb_payments_charge ON pagbank_payments(pagbank_charge_id);

-- ── Planos de assinatura recorrente ──────────────────────────

CREATE TABLE IF NOT EXISTS pagbank_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pagbank_plan_id TEXT,
    course_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    amount INTEGER NOT NULL,
    interval_unit TEXT DEFAULT 'MONTH',
    interval_length INTEGER DEFAULT 1,
    trial_days INTEGER DEFAULT 0,
    billing_cycles INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pagbank_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service full access pagbank_plans"
    ON pagbank_plans FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated read pagbank_plans"
    ON pagbank_plans FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_pb_plans_course ON pagbank_plans(course_id);

-- ── Assinaturas ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pagbank_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pagbank_subscription_id TEXT,
    plan_id UUID REFERENCES pagbank_plans(id) ON DELETE SET NULL,
    student_deal_id TEXT NOT NULL,
    student_name TEXT,
    student_email TEXT,
    status TEXT DEFAULT 'PENDING',
    next_billing_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pagbank_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service full access pagbank_subscriptions"
    ON pagbank_subscriptions FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated read pagbank_subscriptions"
    ON pagbank_subscriptions FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_pb_subs_student ON pagbank_subscriptions(student_deal_id);
CREATE INDEX IF NOT EXISTS idx_pb_subs_plan ON pagbank_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_pb_subs_status ON pagbank_subscriptions(status);

-- ── Log de webhooks ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pagbank_webhook_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT,
    pagbank_id TEXT,
    payload JSONB,
    processed BOOLEAN DEFAULT false,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pagbank_webhook_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service full access pagbank_webhook_log"
    ON pagbank_webhook_log FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated read pagbank_webhook_log"
    ON pagbank_webhook_log FOR SELECT TO authenticated USING (true);

-- ── Adicionar campo purchase_type em crm_online_courses ──────

ALTER TABLE crm_online_courses
    ADD COLUMN IF NOT EXISTS purchase_type TEXT DEFAULT 'one_time';

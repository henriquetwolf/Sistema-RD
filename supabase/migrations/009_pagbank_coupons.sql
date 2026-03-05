-- ============================================================
-- PagBank Coupons – Cupons de Desconto para Checkout
-- ============================================================

-- ── Cupons de desconto ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS pagbank_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL DEFAULT 'percentage',
    discount_value NUMERIC(10,2) NOT NULL,
    min_amount INTEGER DEFAULT 0,
    max_discount INTEGER,
    course_id TEXT,
    valid_from TIMESTAMPTZ DEFAULT now(),
    valid_until TIMESTAMPTZ,
    max_uses INTEGER DEFAULT 0,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pagbank_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service full access pagbank_coupons"
    ON pagbank_coupons FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated read pagbank_coupons"
    ON pagbank_coupons FOR SELECT TO authenticated USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pb_coupons_code ON pagbank_coupons(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_pb_coupons_active ON pagbank_coupons(is_active);

-- ── Registro de uso de cupons ────────────────────────────────

CREATE TABLE IF NOT EXISTS pagbank_coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID REFERENCES pagbank_coupons(id) ON DELETE CASCADE,
    order_id UUID REFERENCES pagbank_orders(id) ON DELETE SET NULL,
    student_deal_id TEXT,
    student_email TEXT,
    original_amount INTEGER NOT NULL,
    discount_amount INTEGER NOT NULL,
    final_amount INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pagbank_coupon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service full access pagbank_coupon_usage"
    ON pagbank_coupon_usage FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated read pagbank_coupon_usage"
    ON pagbank_coupon_usage FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_pb_coupon_usage_coupon ON pagbank_coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_pb_coupon_usage_student ON pagbank_coupon_usage(student_deal_id);

-- ── Adicionar campos de cupom em pagbank_orders ──────────────

ALTER TABLE pagbank_orders
    ADD COLUMN IF NOT EXISTS coupon_code TEXT,
    ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS original_amount INTEGER;

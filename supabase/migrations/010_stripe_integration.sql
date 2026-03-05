-- ============================================================
-- Stripe Integration – Checkout Hospedado
-- Gateway adicional para pagamento de cursos online
-- ============================================================

-- ── Configuração da conta Stripe ────────────────────────────

CREATE TABLE IF NOT EXISTS stripe_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publishable_key TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    webhook_secret TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stripe_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service full access stripe_config"
    ON stripe_config FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated full access stripe_config"
    ON stripe_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW stripe_config_safe AS
SELECT id, publishable_key, is_active, created_at, updated_at
FROM stripe_config;

-- ── Adicionar coluna payment_gateway em pagbank_orders ──────

ALTER TABLE pagbank_orders
    ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'pagbank';

CREATE INDEX IF NOT EXISTS idx_pb_orders_gateway ON pagbank_orders(payment_gateway);

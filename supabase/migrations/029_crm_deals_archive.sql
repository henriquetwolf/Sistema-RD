-- Add soft-delete (archive) support and Conta Azul sale ID tracking to crm_deals

ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_deals_archived ON crm_deals(archived_at) WHERE archived_at IS NOT NULL;

ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS conta_azul_sale_id TEXT DEFAULT NULL;

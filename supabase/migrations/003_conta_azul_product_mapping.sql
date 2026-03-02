-- Tabela de mapeamento: Produtos/Serviços internos → configuração Conta Azul
CREATE TABLE IF NOT EXISTS crm_conta_azul_product_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL,              -- 'produto_digital', 'turma', 'evento'
  item_id UUID,                         -- FK opcional ao registro de origem
  item_name TEXT NOT NULL,
  conta_azul_category_id TEXT,          -- id da categoria no Conta Azul
  split_mode TEXT NOT NULL DEFAULT 'all_service',  -- 'divided', 'all_service', 'all_product'
  product_percentage NUMERIC NOT NULL DEFAULT 0,
  service_percentage NUMERIC NOT NULL DEFAULT 100,
  conta_azul_service_name TEXT,
  conta_azul_service_id TEXT,           -- id do serviço no Conta Azul (API)
  conta_azul_product_name TEXT,
  conta_azul_product_id TEXT,           -- id do produto no Conta Azul (API)
  billing_company_name TEXT,            -- Empresa de Faturamento (define qual conta Conta Azul)
  billing_cnpj TEXT,                    -- CNPJ de Venda
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_type, item_name)
);

-- Adicionar colunas caso tabela já exista sem elas
DO $$ BEGIN
  ALTER TABLE crm_conta_azul_product_mapping ADD COLUMN IF NOT EXISTS billing_company_name TEXT;
  ALTER TABLE crm_conta_azul_product_mapping ADD COLUMN IF NOT EXISTS billing_cnpj TEXT;
  ALTER TABLE crm_conta_azul_product_mapping ADD COLUMN IF NOT EXISTS conta_azul_service_id TEXT;
  ALTER TABLE crm_conta_azul_product_mapping ADD COLUMN IF NOT EXISTS conta_azul_product_id TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Remover CHECK constraint restritivo da tabela de categorias (pode bloquear sync de subcategorias)
DO $$ BEGIN
  ALTER TABLE conta_azul_categorias DROP CONSTRAINT IF EXISTS conta_azul_categorias_tipo_check;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE crm_conta_azul_product_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for authenticated" ON crm_conta_azul_product_mapping;
CREATE POLICY "Allow read for authenticated" ON crm_conta_azul_product_mapping
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all for service_role" ON crm_conta_azul_product_mapping;
CREATE POLICY "Allow all for service_role" ON crm_conta_azul_product_mapping
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert for authenticated" ON crm_conta_azul_product_mapping;
CREATE POLICY "Allow insert for authenticated" ON crm_conta_azul_product_mapping
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated" ON crm_conta_azul_product_mapping;
CREATE POLICY "Allow update for authenticated" ON crm_conta_azul_product_mapping
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated" ON crm_conta_azul_product_mapping;
CREATE POLICY "Allow delete for authenticated" ON crm_conta_azul_product_mapping
  FOR DELETE TO authenticated USING (true);

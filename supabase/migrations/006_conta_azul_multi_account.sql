-- ============================================================
-- Multi-Account Conta Azul Support
-- ============================================================

-- Tabela principal de contas (cada CNPJ = uma conta Conta Azul)
CREATE TABLE IF NOT EXISTS conta_azul_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cnpj TEXT UNIQUE NOT NULL,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE conta_azul_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service full access accounts"
    ON conta_azul_accounts FOR ALL TO service_role USING (true);

-- View segura para o frontend (sem client_secret)
CREATE OR REPLACE VIEW conta_azul_accounts_safe AS
SELECT id, nome, cnpj, client_id, redirect_uri, ativo, created_at, updated_at
FROM conta_azul_accounts;

-- Authenticated pode ler a view segura
CREATE POLICY "Authenticated read accounts"
    ON conta_azul_accounts FOR SELECT TO authenticated
    USING (true);

-- ── Adicionar account_id em todas as tabelas existentes ──

ALTER TABLE conta_azul_tokens
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES conta_azul_accounts(id) ON DELETE CASCADE;

ALTER TABLE conta_azul_contas_receber
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES conta_azul_accounts(id) ON DELETE CASCADE;

ALTER TABLE conta_azul_contas_pagar
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES conta_azul_accounts(id) ON DELETE CASCADE;

ALTER TABLE conta_azul_categorias
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES conta_azul_accounts(id) ON DELETE CASCADE;

ALTER TABLE conta_azul_centros_custo
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES conta_azul_accounts(id) ON DELETE CASCADE;

ALTER TABLE conta_azul_contas_financeiras
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES conta_azul_accounts(id) ON DELETE CASCADE;

ALTER TABLE conta_azul_sync_log
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES conta_azul_accounts(id) ON DELETE CASCADE;

-- ── Indices em account_id ──

CREATE INDEX IF NOT EXISTS idx_ca_tokens_account ON conta_azul_tokens(account_id);
CREATE INDEX IF NOT EXISTS idx_ca_receber_account ON conta_azul_contas_receber(account_id);
CREATE INDEX IF NOT EXISTS idx_ca_pagar_account ON conta_azul_contas_pagar(account_id);
CREATE INDEX IF NOT EXISTS idx_ca_categorias_account ON conta_azul_categorias(account_id);
CREATE INDEX IF NOT EXISTS idx_ca_centros_account ON conta_azul_centros_custo(account_id);
CREATE INDEX IF NOT EXISTS idx_ca_financeiras_account ON conta_azul_contas_financeiras(account_id);
CREATE INDEX IF NOT EXISTS idx_ca_sync_log_account ON conta_azul_sync_log(account_id);

-- ── Atualizar UNIQUE constraints para (account_id, id_conta_azul) ──
-- Remove as constraints antigas e cria compostas

DO $$ BEGIN
    ALTER TABLE conta_azul_contas_receber DROP CONSTRAINT IF EXISTS conta_azul_contas_receber_id_conta_azul_key;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE conta_azul_contas_pagar DROP CONSTRAINT IF EXISTS conta_azul_contas_pagar_id_conta_azul_key;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE conta_azul_categorias DROP CONSTRAINT IF EXISTS conta_azul_categorias_id_conta_azul_key;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE conta_azul_centros_custo DROP CONSTRAINT IF EXISTS conta_azul_centros_custo_id_conta_azul_key;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE conta_azul_contas_financeiras DROP CONSTRAINT IF EXISTS conta_azul_contas_financeiras_id_conta_azul_key;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ca_receber_account
    ON conta_azul_contas_receber(account_id, id_conta_azul);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ca_pagar_account
    ON conta_azul_contas_pagar(account_id, id_conta_azul);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ca_categorias_account
    ON conta_azul_categorias(account_id, id_conta_azul);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ca_centros_account
    ON conta_azul_centros_custo(account_id, id_conta_azul);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ca_financeiras_account
    ON conta_azul_contas_financeiras(account_id, id_conta_azul);

-- ============================================================
-- Wipe Contas a Receber / Pagar and fix constraints
-- Fresh start with clean data from XLS exports
-- ============================================================

-- 1. Truncate financial tables (keeps structure, removes all rows)
TRUNCATE TABLE conta_azul_contas_receber CASCADE;
TRUNCATE TABLE conta_azul_contas_pagar CASCADE;

-- 2. Clean sync log history (stale timestamps cause incremental sync bugs)
DELETE FROM conta_azul_sync_log;

-- 3. Drop ALL old unique constraints/indexes that might still exist
DO $$ BEGIN
    -- Original single-column constraints from migration 001
    ALTER TABLE conta_azul_contas_receber
        DROP CONSTRAINT IF EXISTS conta_azul_contas_receber_id_conta_azul_key;
    ALTER TABLE conta_azul_contas_pagar
        DROP CONSTRAINT IF EXISTS conta_azul_contas_pagar_id_conta_azul_key;
    ALTER TABLE conta_azul_categorias
        DROP CONSTRAINT IF EXISTS conta_azul_categorias_id_conta_azul_key;
    ALTER TABLE conta_azul_centros_custo
        DROP CONSTRAINT IF EXISTS conta_azul_centros_custo_id_conta_azul_key;
    ALTER TABLE conta_azul_contas_financeiras
        DROP CONSTRAINT IF EXISTS conta_azul_contas_financeiras_id_conta_azul_key;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Some old constraints did not exist, continuing...';
END $$;

-- 4. Drop and recreate composite unique indexes cleanly
DROP INDEX IF EXISTS uq_ca_receber_account;
DROP INDEX IF EXISTS uq_ca_pagar_account;
DROP INDEX IF EXISTS uq_ca_categorias_account;
DROP INDEX IF EXISTS uq_ca_centros_account;
DROP INDEX IF EXISTS uq_ca_financeiras_account;

-- 5. Enforce NOT NULL on account_id (all data was truncated, safe to do)
ALTER TABLE conta_azul_contas_receber
    ALTER COLUMN account_id SET NOT NULL;

ALTER TABLE conta_azul_contas_pagar
    ALTER COLUMN account_id SET NOT NULL;

ALTER TABLE conta_azul_categorias
    ALTER COLUMN account_id SET NOT NULL;

ALTER TABLE conta_azul_centros_custo
    ALTER COLUMN account_id SET NOT NULL;

ALTER TABLE conta_azul_contas_financeiras
    ALTER COLUMN account_id SET NOT NULL;

-- 6. Recreate composite unique indexes
CREATE UNIQUE INDEX uq_ca_receber_account
    ON conta_azul_contas_receber(account_id, id_conta_azul);

CREATE UNIQUE INDEX uq_ca_pagar_account
    ON conta_azul_contas_pagar(account_id, id_conta_azul);

CREATE UNIQUE INDEX uq_ca_categorias_account
    ON conta_azul_categorias(account_id, id_conta_azul);

CREATE UNIQUE INDEX uq_ca_centros_account
    ON conta_azul_centros_custo(account_id, id_conta_azul);

CREATE UNIQUE INDEX uq_ca_financeiras_account
    ON conta_azul_contas_financeiras(account_id, id_conta_azul);

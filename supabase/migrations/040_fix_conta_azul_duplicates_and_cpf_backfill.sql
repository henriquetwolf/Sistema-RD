-- ============================================================
-- 1. Remover duplicatas em conta_azul_contas_receber
--    (manter apenas o registro mais recente por account_id + id_conta_azul)
-- ============================================================
DELETE FROM conta_azul_contas_receber
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY account_id, id_conta_azul
                   ORDER BY synced_at DESC NULLS LAST, id DESC
               ) AS rn
        FROM conta_azul_contas_receber
    ) ranked
    WHERE rn > 1
);

-- ============================================================
-- 2. Remover duplicatas em conta_azul_contas_pagar
-- ============================================================
DELETE FROM conta_azul_contas_pagar
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY account_id, id_conta_azul
                   ORDER BY synced_at DESC NULLS LAST, id DESC
               ) AS rn
        FROM conta_azul_contas_pagar
    ) ranked
    WHERE rn > 1
);

-- ============================================================
-- 3. Garantir que os índices únicos existem
-- ============================================================
DROP INDEX IF EXISTS uq_ca_receber_account;
DROP INDEX IF EXISTS uq_ca_pagar_account;
CREATE UNIQUE INDEX uq_ca_receber_account ON conta_azul_contas_receber(account_id, id_conta_azul);
CREATE UNIQUE INDEX uq_ca_pagar_account ON conta_azul_contas_pagar(account_id, id_conta_azul);

-- ============================================================
-- 4. Backfill contato_cpf em contas a pagar usando fornecedor_nome
--    Cruza com contas a receber que já possuem contato_cpf preenchido
-- ============================================================
UPDATE conta_azul_contas_pagar cp
SET contato_cpf = match.contato_cpf
FROM (
    SELECT DISTINCT ON (cr.contato_nome)
        cr.contato_nome,
        cr.contato_cpf
    FROM conta_azul_contas_receber cr
    WHERE cr.contato_cpf IS NOT NULL
      AND TRIM(cr.contato_cpf) <> ''
      AND cr.contato_nome IS NOT NULL
      AND TRIM(cr.contato_nome) <> ''
    ORDER BY cr.contato_nome, cr.synced_at DESC
) match
WHERE cp.contato_cpf IS NULL
  AND cp.fornecedor_nome IS NOT NULL
  AND TRIM(cp.fornecedor_nome) <> ''
  AND LOWER(TRIM(cp.fornecedor_nome)) = LOWER(TRIM(match.contato_nome));

-- Também cruzar com crm_teachers (instrutores) que tenham CPF e company_name
UPDATE conta_azul_contas_pagar cp
SET contato_cpf = t.cpf
FROM crm_teachers t
WHERE cp.contato_cpf IS NULL
  AND cp.fornecedor_nome IS NOT NULL
  AND t.company_name IS NOT NULL
  AND TRIM(t.company_name) <> ''
  AND t.cpf IS NOT NULL
  AND TRIM(t.cpf) <> ''
  AND LOWER(TRIM(cp.fornecedor_nome)) = LOWER(TRIM(t.company_name));

-- Cruzar com crm_teachers pelo full_name
UPDATE conta_azul_contas_pagar cp
SET contato_cpf = t.cpf
FROM crm_teachers t
WHERE cp.contato_cpf IS NULL
  AND cp.fornecedor_nome IS NOT NULL
  AND t.full_name IS NOT NULL
  AND TRIM(t.full_name) <> ''
  AND t.cpf IS NOT NULL
  AND TRIM(t.cpf) <> ''
  AND LOWER(TRIM(cp.fornecedor_nome)) = LOWER(TRIM(t.full_name));

-- Cruzar com crm_teachers pelo CNPJ
UPDATE conta_azul_contas_pagar cp
SET contato_cpf = t.cnpj
FROM crm_teachers t
WHERE cp.contato_cpf IS NULL
  AND cp.fornecedor_nome IS NOT NULL
  AND t.company_name IS NOT NULL
  AND TRIM(t.company_name) <> ''
  AND t.cnpj IS NOT NULL
  AND TRIM(t.cnpj) <> ''
  AND LOWER(TRIM(cp.fornecedor_nome)) = LOWER(TRIM(t.company_name));

-- ============================================================
-- 5. Índice para buscas por contato_cpf normalizado (payables)
-- ============================================================
DROP INDEX IF EXISTS idx_ca_pagar_contato_cpf_norm;
CREATE INDEX idx_ca_pagar_contato_cpf_norm
    ON conta_azul_contas_pagar (REGEXP_REPLACE(COALESCE(contato_cpf, ''), '[^0-9]', '', 'g'))
    WHERE contato_cpf IS NOT NULL;

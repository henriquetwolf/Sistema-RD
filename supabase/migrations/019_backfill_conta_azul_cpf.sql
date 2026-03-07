-- ============================================================
-- Backfill: popular contato_cpf nas tabelas Conta Azul
-- Cruza contato_nome / fornecedor_nome com nomes conhecidos
-- de user_profiles, crm_alunos, crm_collaborators, crm_teachers
-- e crm_deals para preencher o CPF retroativamente.
-- ============================================================

-- 1. Backfill contato_cpf em conta_azul_contas_receber
UPDATE conta_azul_contas_receber cr
SET contato_cpf = names.cpf
FROM (
    SELECT DISTINCT full_name AS nome, cpf
    FROM user_profiles WHERE cpf IS NOT NULL AND full_name IS NOT NULL
    UNION
    SELECT DISTINCT full_name, REGEXP_REPLACE(cpf, '[^0-9]', '', 'g')
    FROM crm_collaborators WHERE cpf IS NOT NULL AND full_name IS NOT NULL
    UNION
    SELECT DISTINCT full_name, REGEXP_REPLACE(cpf, '[^0-9]', '', 'g')
    FROM crm_teachers WHERE cpf IS NOT NULL AND full_name IS NOT NULL
    UNION
    SELECT DISTINCT full_name, cpf
    FROM crm_alunos WHERE cpf IS NOT NULL AND full_name IS NOT NULL
    UNION
    SELECT DISTINCT company_name, REGEXP_REPLACE(cpf, '[^0-9]', '', 'g')
    FROM crm_deals WHERE cpf IS NOT NULL AND company_name IS NOT NULL
    UNION
    SELECT DISTINCT contact_name, REGEXP_REPLACE(cpf, '[^0-9]', '', 'g')
    FROM crm_deals WHERE cpf IS NOT NULL AND contact_name IS NOT NULL
) names
WHERE cr.contato_cpf IS NULL
  AND cr.contato_nome IS NOT NULL
  AND cr.contato_nome = names.nome;

-- 2. Backfill contato_cpf em conta_azul_contas_pagar
UPDATE conta_azul_contas_pagar cp
SET contato_cpf = names.cpf
FROM (
    SELECT DISTINCT full_name AS nome, cpf
    FROM user_profiles WHERE cpf IS NOT NULL AND full_name IS NOT NULL
    UNION
    SELECT DISTINCT full_name, REGEXP_REPLACE(cpf, '[^0-9]', '', 'g')
    FROM crm_collaborators WHERE cpf IS NOT NULL AND full_name IS NOT NULL
    UNION
    SELECT DISTINCT full_name, REGEXP_REPLACE(cpf, '[^0-9]', '', 'g')
    FROM crm_teachers WHERE cpf IS NOT NULL AND full_name IS NOT NULL
    UNION
    SELECT DISTINCT full_name, cpf
    FROM crm_alunos WHERE cpf IS NOT NULL AND full_name IS NOT NULL
    UNION
    SELECT DISTINCT company_name, REGEXP_REPLACE(cpf, '[^0-9]', '', 'g')
    FROM crm_deals WHERE cpf IS NOT NULL AND company_name IS NOT NULL
    UNION
    SELECT DISTINCT contact_name, REGEXP_REPLACE(cpf, '[^0-9]', '', 'g')
    FROM crm_deals WHERE cpf IS NOT NULL AND contact_name IS NOT NULL
) names
WHERE cp.contato_cpf IS NULL
  AND cp.fornecedor_nome IS NOT NULL
  AND cp.fornecedor_nome = names.nome;

-- 3. Índices para otimizar o fallback por nome na função lookup_cpf_global
CREATE INDEX IF NOT EXISTS idx_ca_receber_contato_nome ON conta_azul_contas_receber(contato_nome);
CREATE INDEX IF NOT EXISTS idx_ca_pagar_fornecedor_nome ON conta_azul_contas_pagar(fornecedor_nome);

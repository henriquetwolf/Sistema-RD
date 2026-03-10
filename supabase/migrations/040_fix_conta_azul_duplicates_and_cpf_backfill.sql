-- ============================================================
-- 040: Fix duplicatas cross-account, backfill contato_cpf em
--      payables, e melhorar busca na RPC lookup_cpf_global
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- 1. Remover duplicatas por (account_id, id_conta_azul)
-- ════════════════════════════════════════════════════════════
DELETE FROM conta_azul_contas_receber
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY account_id, id_conta_azul
                   ORDER BY synced_at DESC NULLS LAST, id DESC
               ) AS rn
        FROM conta_azul_contas_receber
    ) ranked WHERE rn > 1
);

DELETE FROM conta_azul_contas_pagar
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY account_id, id_conta_azul
                   ORDER BY synced_at DESC NULLS LAST, id DESC
               ) AS rn
        FROM conta_azul_contas_pagar
    ) ranked WHERE rn > 1
);

-- ════════════════════════════════════════════════════════════
-- 2. Remover duplicatas por chave de negócio
--    (mesmo account_id + descricao + valor + data_vencimento)
--    caso o Conta Azul retorne IDs diferentes para o mesmo item
-- ════════════════════════════════════════════════════════════
DELETE FROM conta_azul_contas_receber
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY account_id,
                                COALESCE(descricao, ''),
                                COALESCE(valor, 0),
                                COALESCE(data_vencimento, '1900-01-01'),
                                COALESCE(contato_nome, '')
                   ORDER BY synced_at DESC NULLS LAST, id DESC
               ) AS rn
        FROM conta_azul_contas_receber
    ) ranked WHERE rn > 1
);

DELETE FROM conta_azul_contas_pagar
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY account_id,
                                COALESCE(descricao, ''),
                                COALESCE(valor, 0),
                                COALESCE(data_vencimento, '1900-01-01'),
                                COALESCE(fornecedor_nome, '')
                   ORDER BY synced_at DESC NULLS LAST, id DESC
               ) AS rn
        FROM conta_azul_contas_pagar
    ) ranked WHERE rn > 1
);

-- ════════════════════════════════════════════════════════════
-- 3. Garantir índices únicos
-- ════════════════════════════════════════════════════════════
DROP INDEX IF EXISTS uq_ca_receber_account;
DROP INDEX IF EXISTS uq_ca_pagar_account;
CREATE UNIQUE INDEX uq_ca_receber_account ON conta_azul_contas_receber(account_id, id_conta_azul);
CREATE UNIQUE INDEX uq_ca_pagar_account ON conta_azul_contas_pagar(account_id, id_conta_azul);

-- ════════════════════════════════════════════════════════════
-- 4. Backfill contato_cpf em contas a pagar
-- ════════════════════════════════════════════════════════════

-- 4a. Cruzar fornecedor_nome com contato_nome de recebíveis que já têm CPF
UPDATE conta_azul_contas_pagar cp
SET contato_cpf = match.contato_cpf
FROM (
    SELECT DISTINCT ON (LOWER(TRIM(cr.contato_nome)))
        LOWER(TRIM(cr.contato_nome)) AS nome_lower,
        cr.contato_cpf
    FROM conta_azul_contas_receber cr
    WHERE cr.contato_cpf IS NOT NULL
      AND TRIM(cr.contato_cpf) <> ''
      AND cr.contato_nome IS NOT NULL
      AND TRIM(cr.contato_nome) <> ''
    ORDER BY LOWER(TRIM(cr.contato_nome)), cr.synced_at DESC
) match
WHERE cp.contato_cpf IS NULL
  AND cp.fornecedor_nome IS NOT NULL
  AND TRIM(cp.fornecedor_nome) <> ''
  AND LOWER(TRIM(cp.fornecedor_nome)) = match.nome_lower;

-- 4b. Cruzar com crm_teachers por company_name → CPF
UPDATE conta_azul_contas_pagar cp
SET contato_cpf = REGEXP_REPLACE(t.cpf, '[^0-9]', '', 'g')
FROM crm_teachers t
WHERE cp.contato_cpf IS NULL
  AND cp.fornecedor_nome IS NOT NULL
  AND t.company_name IS NOT NULL AND TRIM(t.company_name) <> ''
  AND t.cpf IS NOT NULL AND TRIM(t.cpf) <> ''
  AND LOWER(TRIM(cp.fornecedor_nome)) = LOWER(TRIM(t.company_name));

-- 4c. Cruzar com crm_teachers por full_name → CPF
UPDATE conta_azul_contas_pagar cp
SET contato_cpf = REGEXP_REPLACE(t.cpf, '[^0-9]', '', 'g')
FROM crm_teachers t
WHERE cp.contato_cpf IS NULL
  AND cp.fornecedor_nome IS NOT NULL
  AND t.full_name IS NOT NULL AND TRIM(t.full_name) <> ''
  AND t.cpf IS NOT NULL AND TRIM(t.cpf) <> ''
  AND LOWER(TRIM(cp.fornecedor_nome)) = LOWER(TRIM(t.full_name));

-- 4d. Cruzar com crm_teachers por company_name → CNPJ
UPDATE conta_azul_contas_pagar cp
SET contato_cpf = REGEXP_REPLACE(t.cnpj, '[^0-9]', '', 'g')
FROM crm_teachers t
WHERE cp.contato_cpf IS NULL
  AND cp.fornecedor_nome IS NOT NULL
  AND t.company_name IS NOT NULL AND TRIM(t.company_name) <> ''
  AND t.cnpj IS NOT NULL AND TRIM(t.cnpj) <> ''
  AND LOWER(TRIM(cp.fornecedor_nome)) = LOWER(TRIM(t.company_name));

-- 4e. Cruzar com crm_collaborators por full_name → CPF
UPDATE conta_azul_contas_pagar cp
SET contato_cpf = REGEXP_REPLACE(c.cpf, '[^0-9]', '', 'g')
FROM crm_collaborators c
WHERE cp.contato_cpf IS NULL
  AND cp.fornecedor_nome IS NOT NULL
  AND c.full_name IS NOT NULL AND TRIM(c.full_name) <> ''
  AND c.cpf IS NOT NULL AND TRIM(c.cpf) <> ''
  AND LOWER(TRIM(cp.fornecedor_nome)) = LOWER(TRIM(c.full_name));

-- ════════════════════════════════════════════════════════════
-- 5. Índice funcional para buscas normalizadas por CPF
-- ════════════════════════════════════════════════════════════
DROP INDEX IF EXISTS idx_ca_pagar_contato_cpf_norm;
CREATE INDEX idx_ca_pagar_contato_cpf_norm
    ON conta_azul_contas_pagar (REGEXP_REPLACE(COALESCE(contato_cpf, ''), '[^0-9]', '', 'g'))
    WHERE contato_cpf IS NOT NULL;

-- ════════════════════════════════════════════════════════════
-- 6. Atualizar RPC lookup_cpf_global:
--    - Deduplicar por id_conta_azul (evitar duplicatas cross-account)
--    - Match parcial (ILIKE) em fornecedor_nome para payables
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION lookup_cpf_global(p_cpf TEXT)
RETURNS JSONB AS $$
DECLARE
    clean TEXT := REGEXP_REPLACE(p_cpf, '[^0-9]', '', 'g');
    is_cnpj BOOLEAN := FALSE;
    primary_cpf TEXT := NULL;
    result JSONB := '{}'::JSONB;
    v_all_documents TEXT[];
    v_linked_cpfs TEXT[];
    v_linked_cnpjs TEXT[];
    v_profile JSONB;
    v_roles JSONB;
    v_collaborator JSONB;
    v_instructor JSONB;
    v_student JSONB;
    v_student_emails JSONB;
    v_deals JSONB;
    v_partner_studio JSONB;
    v_franchise JSONB;
    v_ca_receber JSONB;
    v_ca_pagar JSONB;
    v_pagbank JSONB;
    v_certificates JSONB;
    v_knowledge_base JSONB;
    v_known_names TEXT[];
    v_linked_docs JSONB;
BEGIN
    IF LENGTH(clean) < 11 THEN
        RETURN jsonb_build_object('error', 'CPF/CNPJ inválido (menos de 11 dígitos)');
    END IF;

    is_cnpj := LENGTH(clean) >= 14;

    IF is_cnpj THEN
        SELECT array_agg(DISTINCT pdl.cpf)
        INTO v_linked_cpfs
        FROM person_document_links pdl
        WHERE pdl.cnpj = clean;

        v_linked_cnpjs := ARRAY[clean];

        IF v_linked_cpfs IS NOT NULL AND array_length(v_linked_cpfs, 1) > 0 THEN
            primary_cpf := v_linked_cpfs[1];
        END IF;
    ELSE
        primary_cpf := clean;

        SELECT array_agg(DISTINCT pdl.cnpj)
        INTO v_linked_cnpjs
        FROM person_document_links pdl
        WHERE pdl.cpf = clean;
    END IF;

    v_all_documents := ARRAY[]::TEXT[];
    IF primary_cpf IS NOT NULL THEN
        v_all_documents := v_all_documents || primary_cpf;
    END IF;
    IF v_linked_cpfs IS NOT NULL THEN
        v_all_documents := v_all_documents || v_linked_cpfs;
    END IF;
    IF v_linked_cnpjs IS NOT NULL THEN
        v_all_documents := v_all_documents || v_linked_cnpjs;
    END IF;
    IF NOT clean = ANY(v_all_documents) THEN
        v_all_documents := v_all_documents || clean;
    END IF;

    IF primary_cpf IS NULL THEN
        primary_cpf := '';
    END IF;

    -- Perfil unificado
    SELECT to_jsonb(p.*) INTO v_profile
    FROM user_profiles p
    WHERE REGEXP_REPLACE(COALESCE(p.cpf, ''), '[^0-9]', '', 'g') = primary_cpf
    LIMIT 1;

    -- Papéis
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id, 'role', r.role, 'is_active', r.is_active,
        'permission_role_id', r.permission_role_id,
        'permission_role_name', cr.name,
        'permissions', COALESCE(cr.permissions, '{}'::JSONB)
    )), '[]'::JSONB) INTO v_roles
    FROM user_roles r
    JOIN user_profiles up ON r.user_id = up.id
    LEFT JOIN crm_roles cr ON cr.id = r.permission_role_id
    WHERE REGEXP_REPLACE(COALESCE(up.cpf, ''), '[^0-9]', '', 'g') = primary_cpf;

    -- Colaborador
    SELECT to_jsonb(c.*) INTO v_collaborator
    FROM crm_collaborators c
    WHERE REGEXP_REPLACE(COALESCE(c.cpf, ''), '[^0-9]', '', 'g') = primary_cpf
    LIMIT 1;

    -- Instrutor
    SELECT to_jsonb(t.*) INTO v_instructor
    FROM crm_teachers t
    WHERE REGEXP_REPLACE(COALESCE(t.cpf, ''), '[^0-9]', '', 'g') = primary_cpf
       OR (v_linked_cnpjs IS NOT NULL AND REGEXP_REPLACE(COALESCE(t.cnpj, ''), '[^0-9]', '', 'g') = ANY(v_linked_cnpjs))
    LIMIT 1;

    -- Aluno
    SELECT to_jsonb(a.*) INTO v_student
    FROM crm_alunos a
    WHERE REGEXP_REPLACE(COALESCE(a.cpf, ''), '[^0-9]', '', 'g') = primary_cpf
    LIMIT 1;

    -- Emails do aluno
    SELECT COALESCE(jsonb_agg(to_jsonb(ae.*)), '[]'::JSONB) INTO v_student_emails
    FROM crm_aluno_emails ae
    JOIN crm_alunos a ON ae.aluno_id = a.id
    WHERE REGEXP_REPLACE(COALESCE(a.cpf, ''), '[^0-9]', '', 'g') = primary_cpf;

    -- Deals
    SELECT COALESCE(jsonb_agg(to_jsonb(d.*) ORDER BY d.created_at DESC), '[]'::JSONB) INTO v_deals
    FROM crm_deals d
    WHERE REGEXP_REPLACE(COALESCE(d.cpf, ''), '[^0-9]', '', 'g') = primary_cpf
       OR (v_linked_cnpjs IS NOT NULL AND REGEXP_REPLACE(COALESCE(d.billing_cnpj, ''), '[^0-9]', '', 'g') = ANY(v_linked_cnpjs));

    -- Studio Parceiro
    SELECT to_jsonb(s.*) INTO v_partner_studio
    FROM crm_partner_studios s
    WHERE REGEXP_REPLACE(COALESCE(s.cpf, ''), '[^0-9]', '', 'g') = primary_cpf
    LIMIT 1;

    -- Franquia
    SELECT to_jsonb(f.*) INTO v_franchise
    FROM crm_franchises f
    WHERE REGEXP_REPLACE(COALESCE(f.cpf, ''), '[^0-9]', '', 'g') = primary_cpf
       OR (v_linked_cnpjs IS NOT NULL AND REGEXP_REPLACE(COALESCE(f.cnpj, ''), '[^0-9]', '', 'g') = ANY(v_linked_cnpjs))
    LIMIT 1;

    -- Nomes conhecidos para fallback
    SELECT array_agg(DISTINCT nm) INTO v_known_names
    FROM (
        SELECT TRIM(full_name) AS nm FROM user_profiles WHERE REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g') = primary_cpf AND full_name IS NOT NULL AND TRIM(full_name) <> ''
        UNION
        SELECT TRIM(full_name) FROM crm_collaborators WHERE REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g') = primary_cpf AND full_name IS NOT NULL AND TRIM(full_name) <> ''
        UNION
        SELECT TRIM(full_name) FROM crm_teachers WHERE REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g') = primary_cpf AND full_name IS NOT NULL AND TRIM(full_name) <> ''
        UNION
        SELECT TRIM(full_name) FROM crm_alunos WHERE REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g') = primary_cpf AND full_name IS NOT NULL AND TRIM(full_name) <> ''
        UNION
        SELECT TRIM(company_name) FROM crm_deals WHERE REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g') = primary_cpf AND company_name IS NOT NULL AND TRIM(company_name) <> ''
        UNION
        SELECT TRIM(contact_name) FROM crm_deals WHERE REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g') = primary_cpf AND contact_name IS NOT NULL AND TRIM(contact_name) <> ''
        UNION
        SELECT TRIM(company_name) FROM crm_teachers WHERE REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g') = primary_cpf AND company_name IS NOT NULL AND TRIM(company_name) <> ''
    ) names;

    -- ── Conta Azul - Contas a Receber ──
    -- Dedup por id_conta_azul para evitar duplicatas cross-account (FILIAL + MATRIZ)
    SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'data_vencimento') DESC NULLS LAST), '[]'::JSONB)
    INTO v_ca_receber
    FROM (
        SELECT DISTINCT ON (cr.id_conta_azul) to_jsonb(cr.*) AS row_data
        FROM conta_azul_contas_receber cr
        WHERE (
            REGEXP_REPLACE(COALESCE(cr.contato_cpf, ''), '[^0-9]', '', 'g') = ANY(v_all_documents)
            OR (
                v_known_names IS NOT NULL
                AND array_length(v_known_names, 1) > 0
                AND cr.contato_nome IS NOT NULL
                AND TRIM(cr.contato_nome) <> ''
                AND LOWER(TRIM(cr.contato_nome)) IN (
                    SELECT LOWER(TRIM(u.nome)) FROM unnest(v_known_names) AS u(nome) WHERE u.nome IS NOT NULL
                )
            )
        )
        ORDER BY cr.id_conta_azul, cr.synced_at DESC
    ) deduped;

    -- ── Conta Azul - Contas a Pagar ──
    -- Dedup por id_conta_azul + match parcial (ILIKE) em fornecedor_nome
    SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'data_vencimento') DESC NULLS LAST), '[]'::JSONB)
    INTO v_ca_pagar
    FROM (
        SELECT DISTINCT ON (cp.id_conta_azul) to_jsonb(cp.*) AS row_data
        FROM conta_azul_contas_pagar cp
        WHERE (
            REGEXP_REPLACE(COALESCE(cp.contato_cpf, ''), '[^0-9]', '', 'g') = ANY(v_all_documents)
            OR (
                v_known_names IS NOT NULL
                AND array_length(v_known_names, 1) > 0
                AND cp.fornecedor_nome IS NOT NULL
                AND TRIM(cp.fornecedor_nome) <> ''
                AND (
                    LOWER(TRIM(cp.fornecedor_nome)) IN (
                        SELECT LOWER(TRIM(u.nome)) FROM unnest(v_known_names) AS u(nome) WHERE u.nome IS NOT NULL
                    )
                    OR EXISTS (
                        SELECT 1 FROM unnest(v_known_names) AS u(nome)
                        WHERE u.nome IS NOT NULL
                          AND LENGTH(TRIM(u.nome)) >= 5
                          AND LOWER(TRIM(cp.fornecedor_nome)) LIKE '%' || LOWER(TRIM(u.nome)) || '%'
                    )
                )
            )
        )
        ORDER BY cp.id_conta_azul, cp.synced_at DESC
    ) deduped;

    -- PagBank
    SELECT COALESCE(jsonb_agg(to_jsonb(po.*) ORDER BY po.created_at DESC), '[]'::JSONB)
    INTO v_pagbank
    FROM pagbank_orders po
    WHERE REGEXP_REPLACE(COALESCE(po.student_cpf, ''), '[^0-9]', '', 'g') = primary_cpf;

    -- Certificados
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'certificate_id', sc.id,
        'hash', sc.hash,
        'issued_at', sc.issued_at,
        'template_id', sc.certificate_template_id,
        'deal_id', sc.student_deal_id
    ) ORDER BY sc.issued_at DESC), '[]'::JSONB)
    INTO v_certificates
    FROM crm_student_certificates sc
    JOIN crm_deals d ON sc.student_deal_id = d.id
    WHERE REGEXP_REPLACE(COALESCE(d.cpf, ''), '[^0-9]', '', 'g') = primary_cpf;

    -- Base de conhecimento IA do aluno
    SELECT to_jsonb(kb.*) INTO v_knowledge_base
    FROM crm_aluno_knowledge_base kb
    JOIN crm_alunos a ON kb.aluno_id = a.id
    WHERE REGEXP_REPLACE(COALESCE(a.cpf, ''), '[^0-9]', '', 'g') = primary_cpf
    LIMIT 1;

    -- Documentos vinculados
    v_linked_docs := jsonb_build_object(
        'input', clean,
        'is_cnpj', is_cnpj,
        'primary_cpf', primary_cpf,
        'linked_cpfs', COALESCE(to_jsonb(v_linked_cpfs), '[]'::JSONB),
        'linked_cnpjs', COALESCE(to_jsonb(v_linked_cnpjs), '[]'::JSONB),
        'all_documents', to_jsonb(v_all_documents)
    );

    -- Resultado
    result := jsonb_build_object(
        'cpf', CASE WHEN primary_cpf <> '' THEN primary_cpf ELSE clean END,
        'profile', v_profile,
        'roles', v_roles,
        'collaborator', v_collaborator,
        'instructor', v_instructor,
        'student', v_student,
        'student_emails', v_student_emails,
        'deals', v_deals,
        'partner_studio', v_partner_studio,
        'franchise', v_franchise,
        'conta_azul_receber', v_ca_receber,
        'conta_azul_pagar', v_ca_pagar,
        'pagbank_orders', v_pagbank,
        'certificates', v_certificates,
        'knowledge_base', v_knowledge_base,
        'linked_documents', v_linked_docs
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

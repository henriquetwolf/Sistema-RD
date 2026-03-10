-- ============================================================
-- Atualiza lookup_cpf_global para buscar por CPF + CNPJs
-- vinculados (e vice-versa) usando person_document_links.
-- Aceita CPF (11 dígitos) ou CNPJ (14 dígitos) como entrada.
-- ============================================================

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

    -- Detectar se é CNPJ (14 dígitos) ou CPF (11 dígitos)
    is_cnpj := LENGTH(clean) >= 14;

    -- Buscar documentos vinculados em person_document_links
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

    -- Montar array com TODOS os documentos (CPF + CNPJs) para busca financeira
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
    -- Incluir o documento original caso não esteja no array
    IF NOT clean = ANY(v_all_documents) THEN
        v_all_documents := v_all_documents || clean;
    END IF;

    -- Se entrou via CNPJ e não achou CPF vinculado, usar string vazia para queries por CPF
    IF primary_cpf IS NULL THEN
        primary_cpf := '';
    END IF;

    -- Perfil unificado (pelo CPF)
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

    -- Instrutor (por CPF ou por CNPJ)
    SELECT to_jsonb(t.*) INTO v_instructor
    FROM crm_teachers t
    WHERE REGEXP_REPLACE(COALESCE(t.cpf, ''), '[^0-9]', '', 'g') = primary_cpf
       OR (v_linked_cnpjs IS NOT NULL AND REGEXP_REPLACE(COALESCE(t.cnpj, ''), '[^0-9]', '', 'g') = ANY(v_linked_cnpjs))
    LIMIT 1;

    -- Aluno (cadastro central)
    SELECT to_jsonb(a.*) INTO v_student
    FROM crm_alunos a
    WHERE REGEXP_REPLACE(COALESCE(a.cpf, ''), '[^0-9]', '', 'g') = primary_cpf
    LIMIT 1;

    -- Emails do aluno
    SELECT COALESCE(jsonb_agg(to_jsonb(ae.*)), '[]'::JSONB) INTO v_student_emails
    FROM crm_aluno_emails ae
    JOIN crm_alunos a ON ae.aluno_id = a.id
    WHERE REGEXP_REPLACE(COALESCE(a.cpf, ''), '[^0-9]', '', 'g') = primary_cpf;

    -- Deals (compras/vendas) - por CPF ou billing_cnpj
    SELECT COALESCE(jsonb_agg(to_jsonb(d.*) ORDER BY d.created_at DESC), '[]'::JSONB) INTO v_deals
    FROM crm_deals d
    WHERE REGEXP_REPLACE(COALESCE(d.cpf, ''), '[^0-9]', '', 'g') = primary_cpf
       OR (v_linked_cnpjs IS NOT NULL AND REGEXP_REPLACE(COALESCE(d.billing_cnpj, ''), '[^0-9]', '', 'g') = ANY(v_linked_cnpjs));

    -- Studio Parceiro
    SELECT to_jsonb(s.*) INTO v_partner_studio
    FROM crm_partner_studios s
    WHERE REGEXP_REPLACE(COALESCE(s.cpf, ''), '[^0-9]', '', 'g') = primary_cpf
    LIMIT 1;

    -- Franquia (por CPF ou CNPJ)
    SELECT to_jsonb(f.*) INTO v_franchise
    FROM crm_franchises f
    WHERE REGEXP_REPLACE(COALESCE(f.cpf, ''), '[^0-9]', '', 'g') = primary_cpf
       OR (v_linked_cnpjs IS NOT NULL AND REGEXP_REPLACE(COALESCE(f.cnpj, ''), '[^0-9]', '', 'g') = ANY(v_linked_cnpjs))
    LIMIT 1;

    -- Coletar nomes conhecidos para fallback no Conta Azul
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

    -- Conta Azul - Contas a Receber: por TODOS os documentos vinculados OU nome
    SELECT COALESCE(jsonb_agg(to_jsonb(cr.*) ORDER BY cr.data_vencimento DESC NULLS LAST), '[]'::JSONB)
    INTO v_ca_receber
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
    );

    -- Conta Azul - Contas a Pagar: por TODOS os documentos vinculados OU nome
    SELECT COALESCE(jsonb_agg(to_jsonb(cp.*) ORDER BY cp.data_vencimento DESC NULLS LAST), '[]'::JSONB)
    INTO v_ca_pagar
    FROM conta_azul_contas_pagar cp
    WHERE (
        REGEXP_REPLACE(COALESCE(cp.contato_cpf, ''), '[^0-9]', '', 'g') = ANY(v_all_documents)
        OR (
            v_known_names IS NOT NULL
            AND array_length(v_known_names, 1) > 0
            AND cp.fornecedor_nome IS NOT NULL
            AND TRIM(cp.fornecedor_nome) <> ''
            AND LOWER(TRIM(cp.fornecedor_nome)) IN (
                SELECT LOWER(TRIM(u.nome)) FROM unnest(v_known_names) AS u(nome) WHERE u.nome IS NOT NULL
            )
        )
    );

    -- PagBank - Pedidos
    SELECT COALESCE(jsonb_agg(to_jsonb(po.*) ORDER BY po.created_at DESC), '[]'::JSONB)
    INTO v_pagbank
    FROM pagbank_orders po
    WHERE REGEXP_REPLACE(COALESCE(po.student_cpf, ''), '[^0-9]', '', 'g') = primary_cpf;

    -- Certificados (via deals)
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

    -- Montar objeto de documentos vinculados
    v_linked_docs := jsonb_build_object(
        'input', clean,
        'is_cnpj', is_cnpj,
        'primary_cpf', primary_cpf,
        'linked_cpfs', COALESCE(to_jsonb(v_linked_cpfs), '[]'::JSONB),
        'linked_cnpjs', COALESCE(to_jsonb(v_linked_cnpjs), '[]'::JSONB),
        'all_documents', to_jsonb(v_all_documents)
    );

    -- Montar resultado
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

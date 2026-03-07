-- ============================================================
-- Busca Global por CPF (Raio-X 360°)
-- Adiciona contato_cpf nas tabelas Conta Azul e cria função
-- RPC que varre todas as fontes de dados por CPF.
-- ============================================================

-- 1. Adicionar contato_cpf nas tabelas espelho do Conta Azul
ALTER TABLE conta_azul_contas_receber
    ADD COLUMN IF NOT EXISTS contato_cpf TEXT;

ALTER TABLE conta_azul_contas_pagar
    ADD COLUMN IF NOT EXISTS contato_cpf TEXT;

CREATE INDEX IF NOT EXISTS idx_ca_receber_cpf ON conta_azul_contas_receber(contato_cpf);
CREATE INDEX IF NOT EXISTS idx_ca_pagar_cpf ON conta_azul_contas_pagar(contato_cpf);

-- 2. Função RPC: busca global por CPF
CREATE OR REPLACE FUNCTION lookup_cpf_global(p_cpf TEXT)
RETURNS JSONB AS $$
DECLARE
    clean TEXT := REGEXP_REPLACE(p_cpf, '[^0-9]', '', 'g');
    result JSONB := '{}'::JSONB;
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
BEGIN
    IF LENGTH(clean) < 11 THEN
        RETURN jsonb_build_object('error', 'CPF inválido (menos de 11 dígitos)');
    END IF;

    -- Perfil unificado
    SELECT to_jsonb(p.*) INTO v_profile
    FROM user_profiles p WHERE p.cpf = clean;

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
    WHERE up.cpf = clean;

    -- Colaborador
    SELECT to_jsonb(c.*) INTO v_collaborator
    FROM crm_collaborators c
    WHERE REGEXP_REPLACE(c.cpf, '[^0-9]', '', 'g') = clean
    LIMIT 1;

    -- Instrutor
    SELECT to_jsonb(t.*) INTO v_instructor
    FROM crm_teachers t
    WHERE REGEXP_REPLACE(t.cpf, '[^0-9]', '', 'g') = clean
    LIMIT 1;

    -- Aluno (cadastro central)
    SELECT to_jsonb(a.*) INTO v_student
    FROM crm_alunos a WHERE a.cpf = clean
    LIMIT 1;

    -- Emails do aluno
    SELECT COALESCE(jsonb_agg(to_jsonb(ae.*)), '[]'::JSONB) INTO v_student_emails
    FROM crm_aluno_emails ae
    JOIN crm_alunos a ON ae.aluno_id = a.id
    WHERE a.cpf = clean;

    -- Deals (compras/vendas)
    SELECT COALESCE(jsonb_agg(to_jsonb(d.*) ORDER BY d.created_at DESC), '[]'::JSONB) INTO v_deals
    FROM crm_deals d
    WHERE REGEXP_REPLACE(d.cpf, '[^0-9]', '', 'g') = clean;

    -- Studio Parceiro
    SELECT to_jsonb(s.*) INTO v_partner_studio
    FROM crm_partner_studios s
    WHERE REGEXP_REPLACE(s.cpf, '[^0-9]', '', 'g') = clean
    LIMIT 1;

    -- Franquia
    SELECT to_jsonb(f.*) INTO v_franchise
    FROM crm_franchises f
    WHERE REGEXP_REPLACE(f.cpf, '[^0-9]', '', 'g') = clean
    LIMIT 1;

    -- Conta Azul - Contas a Receber
    SELECT COALESCE(jsonb_agg(to_jsonb(cr.*) ORDER BY cr.data_vencimento DESC), '[]'::JSONB)
    INTO v_ca_receber
    FROM conta_azul_contas_receber cr
    WHERE cr.contato_cpf = clean;

    -- Conta Azul - Contas a Pagar
    SELECT COALESCE(jsonb_agg(to_jsonb(cp.*) ORDER BY cp.data_vencimento DESC), '[]'::JSONB)
    INTO v_ca_pagar
    FROM conta_azul_contas_pagar cp
    WHERE cp.contato_cpf = clean;

    -- PagBank - Pedidos
    SELECT COALESCE(jsonb_agg(to_jsonb(po.*) ORDER BY po.created_at DESC), '[]'::JSONB)
    INTO v_pagbank
    FROM pagbank_orders po
    WHERE po.student_cpf = clean;

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
    WHERE REGEXP_REPLACE(d.cpf, '[^0-9]', '', 'g') = clean;

    -- Base de conhecimento IA do aluno
    SELECT to_jsonb(kb.*) INTO v_knowledge_base
    FROM crm_aluno_knowledge_base kb
    JOIN crm_alunos a ON kb.aluno_id = a.id
    WHERE a.cpf = clean;

    -- Montar resultado
    result := jsonb_build_object(
        'cpf', clean,
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
        'knowledge_base', v_knowledge_base
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

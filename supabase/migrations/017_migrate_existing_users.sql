-- ============================================================
-- Migração de Usuários Existentes para Supabase Auth
-- Coleta CPFs únicos de todas as tabelas de entidade,
-- cria auth.users + user_profiles + user_roles por CPF.
-- ============================================================

-- Função de migração (executar uma vez)
CREATE OR REPLACE FUNCTION migrate_existing_users_to_auth()
RETURNS TABLE(cpf_migrated TEXT, roles_assigned TEXT[], auth_user_id UUID) AS $$
DECLARE
    rec RECORD;
    v_auth_id UUID;
    v_email TEXT;
    v_name TEXT;
    v_phone TEXT;
    v_photo TEXT;
    v_password TEXT;
    v_roles TEXT[];
BEGIN
    -- Coleta todos os CPFs únicos (apenas dígitos, min 11 chars) de todas as entidades
    FOR rec IN (
        WITH all_cpfs AS (
            SELECT REGEXP_REPLACE(cpf, '[^0-9]', '', 'g') AS clean_cpf,
                   full_name AS name, email, phone, '' AS photo, password, 'collaborator' AS source
            FROM crm_collaborators
            WHERE cpf IS NOT NULL AND TRIM(cpf) <> '' AND status = 'active'

            UNION ALL

            SELECT REGEXP_REPLACE(cpf, '[^0-9]', '', 'g'),
                   full_name, email, phone, photo_url, password, 'instructor'
            FROM crm_teachers
            WHERE cpf IS NOT NULL AND TRIM(cpf) <> '' AND is_active = true

            UNION ALL

            SELECT cpf,
                   full_name, '', phone, '', '', 'student'
            FROM crm_alunos
            WHERE cpf IS NOT NULL AND TRIM(cpf) <> ''

            UNION ALL

            SELECT REGEXP_REPLACE(cpf, '[^0-9]', '', 'g'),
                   responsible_name, email, phone, '', password, 'partner_studio'
            FROM crm_partner_studios
            WHERE cpf IS NOT NULL AND TRIM(cpf) <> '' AND status = 'Ativo'

            UNION ALL

            SELECT REGEXP_REPLACE(cpf, '[^0-9]', '', 'g'),
                   franchisee_name, email, phone, '', '', 'franchisee'
            FROM crm_franchises
            WHERE cpf IS NOT NULL AND TRIM(cpf) <> ''
        ),
        ranked AS (
            SELECT clean_cpf,
                   name, email, phone, photo, password, source,
                   ROW_NUMBER() OVER (
                       PARTITION BY clean_cpf
                       ORDER BY CASE source
                           WHEN 'collaborator' THEN 1
                           WHEN 'instructor' THEN 2
                           WHEN 'partner_studio' THEN 3
                           WHEN 'franchisee' THEN 4
                           WHEN 'student' THEN 5
                       END
                   ) AS rn
            FROM all_cpfs
            WHERE LENGTH(clean_cpf) >= 11
        )
        SELECT clean_cpf,
               MAX(CASE WHEN rn = 1 THEN name END) AS best_name,
               MAX(CASE WHEN rn = 1 THEN email END) AS best_email,
               MAX(CASE WHEN rn = 1 THEN phone END) AS best_phone,
               MAX(CASE WHEN rn = 1 THEN photo END) AS best_photo,
               MAX(CASE WHEN rn = 1 THEN password END) AS best_password,
               array_agg(DISTINCT source) AS sources
        FROM ranked
        GROUP BY clean_cpf
    )
    LOOP
        -- Pular se já existe em user_profiles
        IF EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.cpf = rec.clean_cpf) THEN
            CONTINUE;
        END IF;

        v_name := COALESCE(NULLIF(rec.best_name, ''), 'Usuário ' || rec.clean_cpf);
        v_email := COALESCE(NULLIF(rec.best_email, ''), rec.clean_cpf || '@migrated.local');
        v_phone := COALESCE(rec.best_phone, '');
        v_photo := COALESCE(rec.best_photo, '');
        v_password := COALESCE(NULLIF(rec.best_password, ''), rec.clean_cpf);

        -- Criar auth.users via extensão (senha hasheada pelo Supabase)
        v_auth_id := gen_random_uuid();

        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password,
            email_confirmed_at, created_at, updated_at,
            raw_app_meta_data, raw_user_meta_data,
            aud, role
        ) VALUES (
            v_auth_id,
            '00000000-0000-0000-0000-000000000000',
            v_email,
            crypt(v_password, gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}'::JSONB,
            jsonb_build_object('cpf', rec.clean_cpf, 'full_name', v_name, 'phone', v_phone),
            'authenticated',
            'authenticated'
        )
        ON CONFLICT (email) DO NOTHING;

        -- Se conflito de email, buscar o id existente
        IF NOT FOUND THEN
            SELECT u.id INTO v_auth_id FROM auth.users u WHERE u.email = v_email LIMIT 1;
            IF v_auth_id IS NULL THEN CONTINUE; END IF;
        END IF;

        -- Criar user_profiles
        INSERT INTO user_profiles (id, cpf, full_name, email, phone, photo_url)
        VALUES (v_auth_id, rec.clean_cpf, v_name, v_email, v_phone, v_photo)
        ON CONFLICT (cpf) DO NOTHING;

        -- Detectar e criar papéis
        PERFORM detect_roles_for_cpf(v_auth_id, rec.clean_cpf);

        -- Coletar papéis atribuídos
        SELECT array_agg(r.role) INTO v_roles
        FROM user_roles r WHERE r.user_id = v_auth_id;

        cpf_migrated := rec.clean_cpf;
        roles_assigned := COALESCE(v_roles, '{}');
        auth_user_id := v_auth_id;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Executar a migração
-- NOTA: Descomente a linha abaixo para executar.
-- Os resultados mostram cada CPF migrado e seus papéis atribuídos.
-- SELECT * FROM migrate_existing_users_to_auth();

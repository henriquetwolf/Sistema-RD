-- ============================================================
-- Sistema de Usuário Unificado com Múltiplos Papéis
-- CPF como chave universal de identificação.
-- user_profiles = identidade central (1:1 com auth.users)
-- user_roles = papéis ativos por usuário (1:N)
-- Vínculo com tabelas existentes via CPF (sem alterar schema delas)
-- ============================================================

-- 1. Tabela central de perfis
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    cpf TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT DEFAULT '',
    photo_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf ON user_profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- 2. Tabela de papéis do usuário
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN (
        'admin', 'collaborator', 'instructor', 'student', 'franchisee', 'partner_studio'
    )),
    permission_role_id UUID REFERENCES crm_roles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- 3. Trigger updated_at para user_profiles
DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

-- 4. Trigger: ao criar auth.users, cria user_profiles automaticamente
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, cpf, full_name, email, phone, photo_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'photo_url', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_auth_user();

-- 5. Função: detectar papéis automaticamente a partir do CPF
CREATE OR REPLACE FUNCTION detect_roles_for_cpf(p_user_id UUID, p_cpf TEXT)
RETURNS void AS $$
DECLARE
    clean TEXT := REGEXP_REPLACE(p_cpf, '[^0-9]', '', 'g');
    v_role_id UUID;
BEGIN
    IF LENGTH(clean) < 11 THEN RETURN; END IF;

    -- Instrutor
    IF EXISTS (
        SELECT 1 FROM crm_teachers
        WHERE REGEXP_REPLACE(cpf, '[^0-9]', '', 'g') = clean
          AND is_active = true
    ) THEN
        INSERT INTO user_roles (user_id, role)
        VALUES (p_user_id, 'instructor')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    -- Aluno
    IF EXISTS (SELECT 1 FROM crm_alunos WHERE cpf = clean) THEN
        INSERT INTO user_roles (user_id, role)
        VALUES (p_user_id, 'student')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    -- Colaborador (com permission_role_id)
    SELECT role_id INTO v_role_id
    FROM crm_collaborators
    WHERE REGEXP_REPLACE(cpf, '[^0-9]', '', 'g') = clean
      AND status = 'active'
    LIMIT 1;

    IF v_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role, permission_role_id)
        VALUES (p_user_id, 'collaborator', v_role_id)
        ON CONFLICT (user_id, role) DO UPDATE SET permission_role_id = EXCLUDED.permission_role_id;
    ELSIF EXISTS (
        SELECT 1 FROM crm_collaborators
        WHERE REGEXP_REPLACE(cpf, '[^0-9]', '', 'g') = clean
          AND status = 'active'
    ) THEN
        INSERT INTO user_roles (user_id, role)
        VALUES (p_user_id, 'collaborator')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    -- Studio Parceiro
    IF EXISTS (
        SELECT 1 FROM crm_partner_studios
        WHERE REGEXP_REPLACE(cpf, '[^0-9]', '', 'g') = clean
          AND status = 'Ativo'
    ) THEN
        INSERT INTO user_roles (user_id, role)
        VALUES (p_user_id, 'partner_studio')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    -- Franqueado
    IF EXISTS (
        SELECT 1 FROM crm_franchises
        WHERE REGEXP_REPLACE(cpf, '[^0-9]', '', 'g') = clean
    ) THEN
        INSERT INTO user_roles (user_id, role)
        VALUES (p_user_id, 'franchisee')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Função RPC pública para refresh de papéis
CREATE OR REPLACE FUNCTION refresh_my_roles()
RETURNS JSONB AS $$
DECLARE
    v_cpf TEXT;
    v_roles JSONB;
BEGIN
    SELECT cpf INTO v_cpf FROM user_profiles WHERE id = auth.uid();
    IF v_cpf IS NULL OR v_cpf = '' THEN
        RETURN '[]'::JSONB;
    END IF;

    PERFORM detect_roles_for_cpf(auth.uid(), v_cpf);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'role', r.role,
        'is_active', r.is_active,
        'permission_role_id', r.permission_role_id,
        'permissions', COALESCE(cr.permissions, '{}'::JSONB)
    )), '[]'::JSONB)
    INTO v_roles
    FROM user_roles r
    LEFT JOIN crm_roles cr ON cr.id = r.permission_role_id
    WHERE r.user_id = auth.uid() AND r.is_active = true;

    RETURN v_roles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- user_profiles: próprio perfil ou service_role
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_profiles_select_own') THEN
        CREATE POLICY "user_profiles_select_own" ON user_profiles
            FOR SELECT USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_profiles_update_own') THEN
        CREATE POLICY "user_profiles_update_own" ON user_profiles
            FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_profiles_service_all') THEN
        CREATE POLICY "user_profiles_service_all" ON user_profiles
            FOR ALL TO service_role USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_profiles_authenticated_read') THEN
        CREATE POLICY "user_profiles_authenticated_read" ON user_profiles
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- user_roles: próprios papéis ou service_role
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_select_own') THEN
        CREATE POLICY "user_roles_select_own" ON user_roles
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_service_all') THEN
        CREATE POLICY "user_roles_service_all" ON user_roles
            FOR ALL TO service_role USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_authenticated_read') THEN
        CREATE POLICY "user_roles_authenticated_read" ON user_roles
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

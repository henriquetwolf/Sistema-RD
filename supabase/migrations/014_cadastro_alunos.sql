-- ============================================================
-- Cadastro Geral de Alunos
-- Tabela central com CPF como chave única, suporte a múltiplos
-- emails, e seed automático a partir dos deals existentes.
-- ============================================================

-- 1. Tabela principal de alunos
CREATE TABLE IF NOT EXISTS crm_alunos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT DEFAULT '',
    birth_date DATE,
    zip_code TEXT DEFAULT '',
    address TEXT DEFAULT '',
    address_number TEXT DEFAULT '',
    neighborhood TEXT DEFAULT '',
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    observation TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_alunos_full_name ON crm_alunos (full_name);

-- 2. Tabela de emails do aluno (suporte a múltiplos)
CREATE TABLE IF NOT EXISTS crm_aluno_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID NOT NULL REFERENCES crm_alunos(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (aluno_id, email)
);

CREATE INDEX idx_crm_aluno_emails_email ON crm_aluno_emails (email);
CREATE INDEX idx_crm_aluno_emails_aluno ON crm_aluno_emails (aluno_id);

-- 3. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_alunos_updated_at ON crm_alunos;
CREATE TRIGGER trg_crm_alunos_updated_at
    BEFORE UPDATE ON crm_alunos
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

-- 4. RLS (Row Level Security)
ALTER TABLE crm_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_aluno_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_alunos_all_authenticated" ON crm_alunos;
CREATE POLICY "crm_alunos_all_authenticated" ON crm_alunos
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "crm_aluno_emails_all_authenticated" ON crm_aluno_emails;
CREATE POLICY "crm_aluno_emails_all_authenticated" ON crm_aluno_emails
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Seed: popular crm_alunos a partir dos crm_deals existentes
-- Para cada CPF distinto, usa os dados do deal mais recente.
INSERT INTO crm_alunos (cpf, full_name, phone, zip_code, address, address_number, neighborhood, city, state, observation)
SELECT DISTINCT ON (clean_cpf)
    clean_cpf,
    COALESCE(NULLIF(d.company_name, ''), NULLIF(d.contact_name, ''), ''),
    COALESCE(d.phone, ''),
    COALESCE(d.zip_code, ''),
    COALESCE(d.address, ''),
    COALESCE(d.address_number, ''),
    COALESCE(d.neighborhood, ''),
    COALESCE(d.address_city, ''),
    COALESCE(d.address_state, ''),
    COALESCE(d.observation, '')
FROM (
    SELECT *,
           REGEXP_REPLACE(cpf, '[^0-9]', '', 'g') AS clean_cpf
    FROM crm_deals
    WHERE cpf IS NOT NULL AND TRIM(cpf) <> ''
) d
WHERE LENGTH(clean_cpf) >= 11
ORDER BY clean_cpf, d.created_at DESC
ON CONFLICT (cpf) DO NOTHING;

-- 6. Seed: popular crm_aluno_emails a partir dos emails dos deals
-- Insere todos os emails distintos por aluno, marcando o primeiro como principal.
WITH deal_emails AS (
    SELECT DISTINCT
        a.id AS aluno_id,
        LOWER(TRIM(d.email)) AS email,
        MIN(d.created_at) AS first_seen
    FROM crm_deals d
    JOIN crm_alunos a ON REGEXP_REPLACE(d.cpf, '[^0-9]', '', 'g') = a.cpf
    WHERE d.email IS NOT NULL AND TRIM(d.email) <> ''
    GROUP BY a.id, LOWER(TRIM(d.email))
),
ranked AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY aluno_id ORDER BY first_seen ASC) AS rn
    FROM deal_emails
)
INSERT INTO crm_aluno_emails (aluno_id, email, is_primary)
SELECT aluno_id, email, (rn = 1)
FROM ranked
ON CONFLICT (aluno_id, email) DO NOTHING;

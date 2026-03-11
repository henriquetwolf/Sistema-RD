-- ============================================================
-- Apostila Digital – controle de acesso manual por aluno
-- ============================================================

CREATE TABLE IF NOT EXISTS crm_apostila_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_cpf TEXT NOT NULL,
    student_name TEXT DEFAULT '',
    granted_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (student_cpf)
);

ALTER TABLE crm_apostila_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_apostila_access" ON crm_apostila_access;
CREATE POLICY "anon_read_apostila_access"  ON crm_apostila_access FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_all_apostila_access" ON crm_apostila_access;
CREATE POLICY "anon_all_apostila_access"   ON crm_apostila_access FOR ALL   TO anon USING (true) WITH CHECK (true);

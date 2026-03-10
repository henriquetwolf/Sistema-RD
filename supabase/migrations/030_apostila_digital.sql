-- ============================================================
-- Apostila Digital – tabelas para apostilas interativas
-- ============================================================

-- 1. Metadados das apostilas
CREATE TABLE IF NOT EXISTS crm_apostilas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    pdf_url TEXT NOT NULL,
    total_pages INT NOT NULL DEFAULT 0,
    course_id UUID,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crm_apostilas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_apostilas" ON crm_apostilas FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_apostilas"  ON crm_apostilas FOR ALL   TO anon USING (true) WITH CHECK (true);

-- 2. Anotações por aluno / página
CREATE TABLE IF NOT EXISTS crm_apostila_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apostila_id UUID NOT NULL REFERENCES crm_apostilas(id) ON DELETE CASCADE,
    student_cpf TEXT NOT NULL,
    page_number INT NOT NULL,
    fabric_json JSONB DEFAULT '{}',
    bookmarked BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (apostila_id, student_cpf, page_number)
);

CREATE INDEX idx_annotations_student ON crm_apostila_annotations(apostila_id, student_cpf);

ALTER TABLE crm_apostila_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_annotations" ON crm_apostila_annotations FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_annotations"  ON crm_apostila_annotations FOR ALL   TO anon USING (true) WITH CHECK (true);

-- 3. Progresso de leitura
CREATE TABLE IF NOT EXISTS crm_apostila_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apostila_id UUID NOT NULL REFERENCES crm_apostilas(id) ON DELETE CASCADE,
    student_cpf TEXT NOT NULL,
    last_page INT DEFAULT 1,
    pages_visited JSONB DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (apostila_id, student_cpf)
);

ALTER TABLE crm_apostila_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_progress" ON crm_apostila_progress FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_progress"  ON crm_apostila_progress FOR ALL   TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- Fechamento de Curso – tabelas e storage
-- ============================================================

-- 1. Tabela principal de fechamentos
CREATE TABLE IF NOT EXISTS crm_course_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id TEXT NOT NULL,
    instructor_name TEXT NOT NULL,
    instructor_email TEXT DEFAULT '',
    instructor_phone TEXT DEFAULT '',
    class_id TEXT NOT NULL,
    class_code TEXT DEFAULT '',
    course_name TEXT DEFAULT '',
    city TEXT DEFAULT '',
    class_number TEXT DEFAULT '',
    date_start DATE,
    date_end DATE,
    pix_key TEXT DEFAULT '',
    bank TEXT DEFAULT '',
    agency TEXT DEFAULT '',
    account TEXT DEFAULT '',
    account_holder TEXT DEFAULT '',
    status TEXT DEFAULT 'pendente',
    admin_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crm_course_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_course_closings" ON crm_course_closings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_course_closings"  ON crm_course_closings FOR ALL   TO anon USING (true) WITH CHECK (true);

-- 2. Tabela de despesas vinculadas ao fechamento
CREATE TABLE IF NOT EXISTS crm_course_closing_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closing_id UUID NOT NULL REFERENCES crm_course_closings(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount NUMERIC(12,2) DEFAULT 0,
    receipt_url TEXT DEFAULT '',
    observation TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_closing_expenses ON crm_course_closing_expenses(closing_id);

ALTER TABLE crm_course_closing_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_closing_expenses" ON crm_course_closing_expenses FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_closing_expenses"  ON crm_course_closing_expenses FOR ALL   TO anon USING (true) WITH CHECK (true);

-- 3. Bucket para comprovantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-closings', 'course-closings', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "course_closings_public_read" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'course-closings');

CREATE POLICY "course_closings_anon_insert" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'course-closings');

CREATE POLICY "course_closings_anon_update" ON storage.objects
  FOR UPDATE TO anon
  USING (bucket_id = 'course-closings');

CREATE POLICY "course_closings_anon_delete" ON storage.objects
  FOR DELETE TO anon
  USING (bucket_id = 'course-closings');

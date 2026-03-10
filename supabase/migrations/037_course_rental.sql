-- ============================================================
-- Aluguel de Curso – tabelas e storage
-- ============================================================

-- 1. Tabela principal de aluguéis
CREATE TABLE IF NOT EXISTS crm_course_rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id TEXT NOT NULL,
    studio_name TEXT DEFAULT '',
    responsible_name TEXT NOT NULL,
    cpf TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    legal_name TEXT DEFAULT '',
    cnpj TEXT DEFAULT '',
    class_id TEXT DEFAULT '',
    class_code TEXT DEFAULT '',
    course_name TEXT DEFAULT '',
    city TEXT DEFAULT '',
    rental_type TEXT DEFAULT 'aluguel',
    rental_value NUMERIC(12,2) DEFAULT 0,
    status TEXT DEFAULT 'pendente',
    admin_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crm_course_rentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_rentals_select" ON crm_course_rentals FOR SELECT USING (true);
CREATE POLICY "course_rentals_all" ON crm_course_rentals FOR ALL USING (true) WITH CHECK (true);

-- 2. Tabela de comprovantes/NFs vinculados ao aluguel
CREATE TABLE IF NOT EXISTS crm_course_rental_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL REFERENCES crm_course_rentals(id) ON DELETE CASCADE,
    receipt_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rental_receipts ON crm_course_rental_receipts(rental_id);

ALTER TABLE crm_course_rental_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_receipts_select" ON crm_course_rental_receipts FOR SELECT USING (true);
CREATE POLICY "rental_receipts_all" ON crm_course_rental_receipts FOR ALL USING (true) WITH CHECK (true);

-- 3. Bucket para comprovantes de aluguel
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-rentals', 'course-rentals', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "course_rentals_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-rentals');

CREATE POLICY "course_rentals_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'course-rentals');

CREATE POLICY "course_rentals_storage_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'course-rentals');

CREATE POLICY "course_rentals_storage_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'course-rentals');

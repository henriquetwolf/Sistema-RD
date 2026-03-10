-- ============================================================
-- Vínculo CPF ↔ CNPJ: tabela de ligação entre documentos
-- da mesma pessoa (ex.: aluno PF + instrutor PJ).
-- ============================================================

-- 1. Tabela de vínculos
CREATE TABLE IF NOT EXISTS person_document_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(cpf, cnpj)
);

CREATE INDEX IF NOT EXISTS idx_pdl_cpf  ON person_document_links(cpf);
CREATE INDEX IF NOT EXISTS idx_pdl_cnpj ON person_document_links(cnpj);

ALTER TABLE person_document_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdl_select" ON person_document_links FOR SELECT USING (true);
CREATE POLICY "pdl_all"    ON person_document_links FOR ALL USING (true) WITH CHECK (true);

-- 2. Função auxiliar para inserir vínculo (idempotente)
CREATE OR REPLACE FUNCTION upsert_document_link(
    p_cpf TEXT, p_cnpj TEXT, p_source TEXT
) RETURNS VOID AS $$
DECLARE
    clean_cpf  TEXT := REGEXP_REPLACE(COALESCE(p_cpf, ''), '[^0-9]', '', 'g');
    clean_cnpj TEXT := REGEXP_REPLACE(COALESCE(p_cnpj, ''), '[^0-9]', '', 'g');
BEGIN
    IF LENGTH(clean_cpf) >= 11 AND LENGTH(clean_cnpj) >= 14 THEN
        INSERT INTO person_document_links (cpf, cnpj, source)
        VALUES (clean_cpf, clean_cnpj, p_source)
        ON CONFLICT (cpf, cnpj) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Auto-popular a partir de crm_teachers
INSERT INTO person_document_links (cpf, cnpj, source)
SELECT DISTINCT
    REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g'),
    REGEXP_REPLACE(COALESCE(cnpj, ''), '[^0-9]', '', 'g'),
    'crm_teachers'
FROM crm_teachers
WHERE cpf IS NOT NULL AND TRIM(cpf) <> ''
  AND cnpj IS NOT NULL AND TRIM(cnpj) <> ''
  AND LENGTH(REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g')) >= 11
  AND LENGTH(REGEXP_REPLACE(COALESCE(cnpj, ''), '[^0-9]', '', 'g')) >= 14
ON CONFLICT (cpf, cnpj) DO NOTHING;

-- 4. Auto-popular a partir de crm_franchises
INSERT INTO person_document_links (cpf, cnpj, source)
SELECT DISTINCT
    REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g'),
    REGEXP_REPLACE(COALESCE(cnpj, ''), '[^0-9]', '', 'g'),
    'crm_franchises'
FROM crm_franchises
WHERE cpf IS NOT NULL AND TRIM(cpf) <> ''
  AND cnpj IS NOT NULL AND TRIM(cnpj) <> ''
  AND LENGTH(REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g')) >= 11
  AND LENGTH(REGEXP_REPLACE(COALESCE(cnpj, ''), '[^0-9]', '', 'g')) >= 14
ON CONFLICT (cpf, cnpj) DO NOTHING;

-- 5. Auto-popular a partir de crm_deals (billing_cnpj)
INSERT INTO person_document_links (cpf, cnpj, source)
SELECT DISTINCT
    REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g'),
    REGEXP_REPLACE(COALESCE(billing_cnpj, ''), '[^0-9]', '', 'g'),
    'crm_deals'
FROM crm_deals
WHERE cpf IS NOT NULL AND TRIM(cpf) <> ''
  AND billing_cnpj IS NOT NULL AND TRIM(billing_cnpj) <> ''
  AND LENGTH(REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g')) >= 11
  AND LENGTH(REGEXP_REPLACE(COALESCE(billing_cnpj, ''), '[^0-9]', '', 'g')) >= 14
ON CONFLICT (cpf, cnpj) DO NOTHING;

-- 6. Auto-popular a partir de crm_course_rentals
INSERT INTO person_document_links (cpf, cnpj, source)
SELECT DISTINCT
    REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g'),
    REGEXP_REPLACE(COALESCE(cnpj, ''), '[^0-9]', '', 'g'),
    'crm_course_rentals'
FROM crm_course_rentals
WHERE cpf IS NOT NULL AND TRIM(cpf) <> ''
  AND cnpj IS NOT NULL AND TRIM(cnpj) <> ''
  AND LENGTH(REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g')) >= 11
  AND LENGTH(REGEXP_REPLACE(COALESCE(cnpj, ''), '[^0-9]', '', 'g')) >= 14
ON CONFLICT (cpf, cnpj) DO NOTHING;

-- 7. Trigger para crm_teachers
CREATE OR REPLACE FUNCTION trg_sync_teacher_document_link()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM upsert_document_link(NEW.cpf, NEW.cnpj, 'crm_teachers');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_teacher_doc_link ON crm_teachers;
CREATE TRIGGER trg_teacher_doc_link
    AFTER INSERT OR UPDATE OF cpf, cnpj ON crm_teachers
    FOR EACH ROW EXECUTE FUNCTION trg_sync_teacher_document_link();

-- 8. Trigger para crm_franchises
CREATE OR REPLACE FUNCTION trg_sync_franchise_document_link()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM upsert_document_link(NEW.cpf, NEW.cnpj, 'crm_franchises');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_franchise_doc_link ON crm_franchises;
CREATE TRIGGER trg_franchise_doc_link
    AFTER INSERT OR UPDATE OF cpf, cnpj ON crm_franchises
    FOR EACH ROW EXECUTE FUNCTION trg_sync_franchise_document_link();

-- 9. Trigger para crm_deals (billing_cnpj)
CREATE OR REPLACE FUNCTION trg_sync_deal_document_link()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM upsert_document_link(NEW.cpf, NEW.billing_cnpj, 'crm_deals');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deal_doc_link ON crm_deals;
CREATE TRIGGER trg_deal_doc_link
    AFTER INSERT OR UPDATE OF cpf, billing_cnpj ON crm_deals
    FOR EACH ROW EXECUTE FUNCTION trg_sync_deal_document_link();

-- 10. Trigger para crm_course_rentals
CREATE OR REPLACE FUNCTION trg_sync_rental_document_link()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM upsert_document_link(NEW.cpf, NEW.cnpj, 'crm_course_rentals');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rental_doc_link ON crm_course_rentals;
CREATE TRIGGER trg_rental_doc_link
    AFTER INSERT OR UPDATE OF cpf, cnpj ON crm_course_rentals
    FOR EACH ROW EXECUTE FUNCTION trg_sync_rental_document_link();

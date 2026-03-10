-- Corrigir policies das tabelas de apostila para permitir todos os roles

-- crm_apostilas
DROP POLICY IF EXISTS "anon_read_apostilas" ON crm_apostilas;
DROP POLICY IF EXISTS "anon_all_apostilas" ON crm_apostilas;
CREATE POLICY "apostilas_select" ON crm_apostilas FOR SELECT USING (true);
CREATE POLICY "apostilas_all" ON crm_apostilas FOR ALL USING (true) WITH CHECK (true);

-- crm_apostila_annotations
DROP POLICY IF EXISTS "anon_read_annotations" ON crm_apostila_annotations;
DROP POLICY IF EXISTS "anon_all_annotations" ON crm_apostila_annotations;
CREATE POLICY "annotations_select" ON crm_apostila_annotations FOR SELECT USING (true);
CREATE POLICY "annotations_all" ON crm_apostila_annotations FOR ALL USING (true) WITH CHECK (true);

-- crm_apostila_progress
DROP POLICY IF EXISTS "anon_read_progress" ON crm_apostila_progress;
DROP POLICY IF EXISTS "anon_all_progress" ON crm_apostila_progress;
CREATE POLICY "progress_select" ON crm_apostila_progress FOR SELECT USING (true);
CREATE POLICY "progress_all" ON crm_apostila_progress FOR ALL USING (true) WITH CHECK (true);

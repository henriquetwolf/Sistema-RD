-- Corrigir policies de fechamento de curso para permitir todos os roles (anon + authenticated)

-- crm_course_closings
DROP POLICY IF EXISTS "anon_read_course_closings" ON crm_course_closings;
DROP POLICY IF EXISTS "anon_all_course_closings" ON crm_course_closings;
CREATE POLICY "course_closings_select" ON crm_course_closings FOR SELECT USING (true);
CREATE POLICY "course_closings_all" ON crm_course_closings FOR ALL USING (true) WITH CHECK (true);

-- crm_course_closing_expenses
DROP POLICY IF EXISTS "anon_read_closing_expenses" ON crm_course_closing_expenses;
DROP POLICY IF EXISTS "anon_all_closing_expenses" ON crm_course_closing_expenses;
CREATE POLICY "closing_expenses_select" ON crm_course_closing_expenses FOR SELECT USING (true);
CREATE POLICY "closing_expenses_all" ON crm_course_closing_expenses FOR ALL USING (true) WITH CHECK (true);

-- Storage: course-closings bucket
DROP POLICY IF EXISTS "course_closings_public_read" ON storage.objects;
DROP POLICY IF EXISTS "course_closings_anon_insert" ON storage.objects;
DROP POLICY IF EXISTS "course_closings_anon_update" ON storage.objects;
DROP POLICY IF EXISTS "course_closings_anon_delete" ON storage.objects;

CREATE POLICY "course_closings_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-closings');

CREATE POLICY "course_closings_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'course-closings');

CREATE POLICY "course_closings_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'course-closings');

CREATE POLICY "course_closings_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'course-closings');

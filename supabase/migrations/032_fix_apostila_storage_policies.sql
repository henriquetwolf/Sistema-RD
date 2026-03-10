-- Remover policies anteriores caso existam
DROP POLICY IF EXISTS "apostilas_public_read" ON storage.objects;
DROP POLICY IF EXISTS "apostilas_anon_insert" ON storage.objects;
DROP POLICY IF EXISTS "apostilas_anon_update" ON storage.objects;
DROP POLICY IF EXISTS "apostilas_anon_delete" ON storage.objects;

-- Garantir que o bucket existe e é público
UPDATE storage.buckets SET public = true WHERE id = 'apostilas';

-- Policies abrangentes: permitir para qualquer role (anon, authenticated, service_role)
CREATE POLICY "apostilas_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'apostilas');

CREATE POLICY "apostilas_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'apostilas');

CREATE POLICY "apostilas_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'apostilas');

CREATE POLICY "apostilas_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'apostilas');

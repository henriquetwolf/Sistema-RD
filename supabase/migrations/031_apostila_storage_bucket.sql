-- Bucket para armazenar PDFs das apostilas digitais
INSERT INTO storage.buckets (id, name, public)
VALUES ('apostilas', 'apostilas', true)
ON CONFLICT (id) DO NOTHING;

-- Permitir leitura publica
CREATE POLICY "apostilas_public_read" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'apostilas');

-- Permitir upload/update/delete pelo anon (admin usa anon key)
CREATE POLICY "apostilas_anon_insert" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'apostilas');

CREATE POLICY "apostilas_anon_update" ON storage.objects
  FOR UPDATE TO anon
  USING (bucket_id = 'apostilas');

CREATE POLICY "apostilas_anon_delete" ON storage.objects
  FOR DELETE TO anon
  USING (bucket_id = 'apostilas');

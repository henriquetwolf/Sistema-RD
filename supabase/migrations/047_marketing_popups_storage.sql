-- Bucket para imagens de pop-ups e outros assets do VOLL Marketing (5MB, apenas imagens)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing',
  'marketing',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Remover policies antigas se existirem (para reexecução da migration)
DROP POLICY IF EXISTS "marketing_select" ON storage.objects;
DROP POLICY IF EXISTS "marketing_insert" ON storage.objects;
DROP POLICY IF EXISTS "marketing_update" ON storage.objects;
DROP POLICY IF EXISTS "marketing_delete" ON storage.objects;

-- Leitura pública (imagens exibidas nas landing pages)
CREATE POLICY "marketing_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'marketing');

-- Inserir/atualizar/remover para o app poder fazer upload
CREATE POLICY "marketing_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'marketing');

CREATE POLICY "marketing_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'marketing');

CREATE POLICY "marketing_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'marketing');

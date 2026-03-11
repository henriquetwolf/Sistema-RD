-- Tabela para rastrear progresso de sync chunked (permite retomar syncs interrompidos)
CREATE TABLE IF NOT EXISTS conta_azul_sync_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES conta_azul_accounts(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  session_id TEXT NOT NULL,
  range_start DATE NOT NULL,
  range_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  records_synced INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_sync_chunks_session ON conta_azul_sync_chunks(session_id);
CREATE INDEX idx_sync_chunks_pending ON conta_azul_sync_chunks(account_id, sync_type, status)
  WHERE status = 'pending';
CREATE INDEX idx_sync_chunks_cleanup ON conta_azul_sync_chunks(created_at);

ALTER TABLE conta_azul_sync_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_sync_chunks"
  ON conta_azul_sync_chunks FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_select_sync_chunks"
  ON conta_azul_sync_chunks FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "authenticated_insert_sync_chunks"
  ON conta_azul_sync_chunks FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_sync_chunks"
  ON conta_azul_sync_chunks FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_delete_sync_chunks"
  ON conta_azul_sync_chunks FOR DELETE
  TO authenticated USING (true);

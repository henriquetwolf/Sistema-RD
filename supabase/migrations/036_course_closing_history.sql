-- Histórico de edições de fechamento de curso
-- Cada vez que um instrutor edita um fechamento rejeitado, o snapshot anterior é salvo aqui.

CREATE TABLE IF NOT EXISTS crm_course_closing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closing_id UUID NOT NULL REFERENCES crm_course_closings(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    snapshot JSONB NOT NULL,
    expenses_snapshot JSONB DEFAULT '[]'::jsonb,
    edited_at TIMESTAMPTZ DEFAULT now(),
    reason TEXT DEFAULT ''
);

CREATE INDEX idx_closing_history ON crm_course_closing_history(closing_id, version);

ALTER TABLE crm_course_closing_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "closing_history_select" ON crm_course_closing_history FOR SELECT USING (true);
CREATE POLICY "closing_history_all" ON crm_course_closing_history FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Studio Digital — Exercícios em Vídeo
-- Substitui o modelo antigo de cursos/produtos por vídeos
-- de exercícios vinculados a cada equipamento.
-- ============================================================

-- 1. Remover tabela antiga de itens (cursos/produtos)
DROP TABLE IF EXISTS studio_digital_items CASCADE;

-- 2. Tabela de exercícios em vídeo
CREATE TABLE IF NOT EXISTS studio_digital_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES studio_digital_equipments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    video_url TEXT NOT NULL,
    thumbnail_url TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sdex_equipment ON studio_digital_exercises (equipment_id);
CREATE INDEX IF NOT EXISTS idx_sdex_active ON studio_digital_exercises (is_active);

-- 3. Trigger updated_at
DROP TRIGGER IF EXISTS trg_sdex_updated ON studio_digital_exercises;
CREATE TRIGGER trg_sdex_updated
    BEFORE UPDATE ON studio_digital_exercises
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- 4. RLS
ALTER TABLE studio_digital_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_digital_exercises_all" ON studio_digital_exercises;
CREATE POLICY "studio_digital_exercises_all" ON studio_digital_exercises
    FOR ALL USING (true) WITH CHECK (true);

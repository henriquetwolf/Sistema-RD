-- ============================================================
-- Studio Digital
-- Equipamentos do parceiro Equipilates com vinculação
-- flexível a cursos e produtos existentes na plataforma.
-- ============================================================

-- 1. Equipamentos do Studio Digital
CREATE TABLE IF NOT EXISTS studio_digital_equipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    partner_name TEXT NOT NULL DEFAULT 'Equipilates',
    image_url TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sde_slug ON studio_digital_equipments (slug);
CREATE INDEX IF NOT EXISTS idx_sde_active ON studio_digital_equipments (is_active);

-- 2. Itens vinculados (cursos / produtos) a cada equipamento
CREATE TABLE IF NOT EXISTS studio_digital_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES studio_digital_equipments(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('course', 'product')),
    item_id TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(equipment_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_sdi_equipment ON studio_digital_items (equipment_id);
CREATE INDEX IF NOT EXISTS idx_sdi_type ON studio_digital_items (item_type);

-- 3. Trigger updated_at
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sde_updated ON studio_digital_equipments;
CREATE TRIGGER trg_sde_updated
    BEFORE UPDATE ON studio_digital_equipments
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_sdi_updated ON studio_digital_items;
CREATE TRIGGER trg_sdi_updated
    BEFORE UPDATE ON studio_digital_items
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- 4. RLS (Row Level Security)
ALTER TABLE studio_digital_equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_digital_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_digital_equipments_all" ON studio_digital_equipments;
CREATE POLICY "studio_digital_equipments_all" ON studio_digital_equipments
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "studio_digital_items_all" ON studio_digital_items;
CREATE POLICY "studio_digital_items_all" ON studio_digital_items
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Seed inicial — 5 equipamentos Equipilates
INSERT INTO studio_digital_equipments (name, slug, description, partner_name, is_active, sort_order)
VALUES
    ('Reformer',  'reformer',  'O equipamento mais versátil do Pilates, ideal para trabalho de corpo inteiro com resistência por molas.', 'Equipilates', true, 1),
    ('Cadillac',  'cadillac',  'Também conhecido como Trapézio, oferece ampla variedade de exercícios de mobilidade e fortalecimento.', 'Equipilates', true, 2),
    ('Chair',     'chair',     'Equipamento compacto e desafiador, excelente para fortalecimento e equilíbrio.', 'Equipilates', true, 3),
    ('Mat',       'mat',       'A base do Pilates: exercícios no solo que desenvolvem controle, força e flexibilidade.', 'Equipilates', true, 4),
    ('Barrel',    'barrel',    'Perfeito para alongamento, extensão da coluna e trabalho de mobilidade articular.', 'Equipilates', true, 5)
ON CONFLICT (slug) DO NOTHING;

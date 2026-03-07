-- ============================================================
-- Tutor IA com Avatares para Alunos
-- Tabelas para avatares configuráveis, base de conhecimento
-- do aluno, e histórico de chat com IA.
-- ============================================================

-- 1. Avatares de Tutor IA (criados pelo admin)
CREATE TABLE IF NOT EXISTS crm_ai_avatars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    avatar_image_url TEXT DEFAULT '',
    personality_prompt TEXT NOT NULL DEFAULT '',
    specialties TEXT[] DEFAULT '{}',
    tone TEXT NOT NULL DEFAULT 'friendly' CHECK (tone IN ('formal', 'friendly', 'motivational', 'technical')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_ai_avatars_active ON crm_ai_avatars (is_active);

-- 2. Base de Conhecimento do Aluno (perfil de aprendizagem)
CREATE TABLE IF NOT EXISTS crm_aluno_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID NOT NULL UNIQUE REFERENCES crm_alunos(id) ON DELETE CASCADE,
    objectives TEXT DEFAULT '',
    experience_level TEXT NOT NULL DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    interest_areas TEXT[] DEFAULT '{}',
    academic_background TEXT DEFAULT '',
    specialties TEXT DEFAULT '',
    available_hours_per_week INT DEFAULT 0,
    learning_style TEXT NOT NULL DEFAULT 'practical' CHECK (learning_style IN ('visual', 'reading', 'practical', 'auditory')),
    additional_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_aluno_kb_aluno ON crm_aluno_knowledge_base (aluno_id);

-- 3. Histórico de Chat IA
CREATE TABLE IF NOT EXISTS crm_ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID NOT NULL REFERENCES crm_alunos(id) ON DELETE CASCADE,
    avatar_id UUID REFERENCES crm_ai_avatars(id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL DEFAULT '',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_ai_chat_aluno ON crm_ai_chat_messages (aluno_id, created_at DESC);
CREATE INDEX idx_crm_ai_chat_avatar ON crm_ai_chat_messages (avatar_id);

-- 4. Vincular avatar selecionado ao aluno
ALTER TABLE crm_alunos
    ADD COLUMN IF NOT EXISTS selected_avatar_id UUID REFERENCES crm_ai_avatars(id) ON DELETE SET NULL;

-- 5. Trigger updated_at para knowledge_base
DROP TRIGGER IF EXISTS trg_crm_aluno_kb_updated_at ON crm_aluno_knowledge_base;
CREATE TRIGGER trg_crm_aluno_kb_updated_at
    BEFORE UPDATE ON crm_aluno_knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_crm_ai_avatars_updated_at ON crm_ai_avatars;
CREATE TRIGGER trg_crm_ai_avatars_updated_at
    BEFORE UPDATE ON crm_ai_avatars
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

-- 6. RLS
ALTER TABLE crm_ai_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_aluno_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_ai_avatars_all" ON crm_ai_avatars FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_aluno_kb_all" ON crm_aluno_knowledge_base FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_ai_chat_all" ON crm_ai_chat_messages FOR ALL USING (true) WITH CHECK (true);

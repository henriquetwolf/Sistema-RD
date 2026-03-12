-- ============================================================
-- LP + Anúncios (IA) — Módulo completo de Landing Pages e Anúncios
-- Projetos, LPs base/derivadas, campanhas, versionamento,
-- tracking de performance, A/B testing
-- ============================================================

-- ============================================================
-- 1. CONFIGURAÇÃO DE PROVIDERS DE IA (multi-provider)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_provider_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider IN ('claude','openrouter','gemini','openai','custom')),
    label TEXT NOT NULL DEFAULT '',
    api_key_encrypted TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    temperature FLOAT NOT NULL DEFAULT 0.7,
    max_tokens INTEGER NOT NULL DEFAULT 4096,
    system_prompt TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_provider_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_provider_configs_all" ON ai_provider_configs FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_ai_provider_configs_updated
    BEFORE UPDATE ON ai_provider_configs
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================================
-- 2. PROJETOS (container principal)
-- ============================================================
CREATE TABLE IF NOT EXISTS lp_ads_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    offer TEXT DEFAULT '',
    target_audience TEXT DEFAULT '',
    campaign_objective TEXT DEFAULT '',
    main_promise TEXT DEFAULT '',
    unique_mechanism TEXT DEFAULT '',
    main_pains TEXT DEFAULT '',
    main_benefits TEXT DEFAULT '',
    objections TEXT DEFAULT '',
    testimonials TEXT DEFAULT '',
    differentials TEXT DEFAULT '',
    tone_of_voice TEXT DEFAULT 'Profissional e Persuasivo',
    price_condition TEXT DEFAULT '',
    faq TEXT DEFAULT '',
    competitors TEXT DEFAULT '',
    visual_identity TEXT DEFAULT '',
    cta_principal TEXT DEFAULT '',
    free_notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','generating','generated','reviewing','approved','published','archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpads_proj_status ON lp_ads_projects (status);
CREATE INDEX IF NOT EXISTS idx_lpads_proj_created ON lp_ads_projects (created_at DESC);

ALTER TABLE lp_ads_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_ads_projects_all" ON lp_ads_projects FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_lp_ads_projects_updated
    BEFORE UPDATE ON lp_ads_projects
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================================
-- 3. ASSETS DE ENTRADA (PDFs, URLs, textos)
-- ============================================================
CREATE TABLE IF NOT EXISTS lp_ads_source_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES lp_ads_projects(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('url','pdf','text','html_file')),
    file_url TEXT DEFAULT '',
    original_name TEXT DEFAULT '',
    extracted_text TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpads_asset_proj ON lp_ads_source_assets (project_id);

ALTER TABLE lp_ads_source_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_ads_source_assets_all" ON lp_ads_source_assets FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 4. CAMPANHAS / ANÚNCIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS lp_ads_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES lp_ads_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    objective TEXT DEFAULT '',
    platform TEXT DEFAULT 'other'
        CHECK (platform IN ('google_ads','meta_ads','instagram','tiktok','linkedin','youtube','other')),
    focus_angle TEXT DEFAULT '',
    persona TEXT DEFAULT '',
    specific_pain TEXT DEFAULT '',
    specific_promise TEXT DEFAULT '',
    cta TEXT DEFAULT '',
    tone_of_voice TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    ad_creatives JSONB DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','generating','generated','reviewing','approved','published','archived')),
    current_version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpads_camp_proj ON lp_ads_campaigns (project_id);
CREATE INDEX IF NOT EXISTS idx_lpads_camp_status ON lp_ads_campaigns (status);

ALTER TABLE lp_ads_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_ads_campaigns_all" ON lp_ads_campaigns FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_lp_ads_campaigns_updated
    BEFORE UPDATE ON lp_ads_campaigns
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================================
-- 5. LANDING PAGES (base e derivadas)
-- ============================================================
CREATE TABLE IF NOT EXISTS lp_ads_landing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES lp_ads_projects(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES lp_ads_campaigns(id) ON DELETE SET NULL,
    page_type TEXT NOT NULL DEFAULT 'base'
        CHECK (page_type IN ('base','variant')),
    creation_mode TEXT NOT NULL DEFAULT 'ai_claude'
        CHECK (creation_mode IN ('ai_claude','ai_openrouter','import_html','blank_template')),
    title TEXT DEFAULT '',
    content JSONB DEFAULT '{}',
    html_code TEXT DEFAULT '',
    selected_form_id UUID DEFAULT NULL,
    cta_link TEXT DEFAULT '',
    show_popups BOOLEAN NOT NULL DEFAULT true,
    show_wa_button BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','generating','generated','reviewing','approved','published','archived')),
    current_version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpads_lp_proj ON lp_ads_landing_pages (project_id);
CREATE INDEX IF NOT EXISTS idx_lpads_lp_camp ON lp_ads_landing_pages (campaign_id);
CREATE INDEX IF NOT EXISTS idx_lpads_lp_type ON lp_ads_landing_pages (page_type);
CREATE INDEX IF NOT EXISTS idx_lpads_lp_status ON lp_ads_landing_pages (status);

ALTER TABLE lp_ads_landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_ads_landing_pages_all" ON lp_ads_landing_pages FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_lp_ads_landing_pages_updated
    BEFORE UPDATE ON lp_ads_landing_pages
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================================
-- 6. VERSÕES DE LANDING PAGE
-- ============================================================
CREATE TABLE IF NOT EXISTS lp_ads_lp_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landing_page_id UUID NOT NULL REFERENCES lp_ads_landing_pages(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    content JSONB DEFAULT '{}',
    html_code TEXT DEFAULT '',
    prompt_used TEXT DEFAULT '',
    model_used TEXT DEFAULT '',
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    generated_by TEXT DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpads_lpv_lp ON lp_ads_lp_versions (landing_page_id);
CREATE INDEX IF NOT EXISTS idx_lpads_lpv_ver ON lp_ads_lp_versions (landing_page_id, version_number DESC);

ALTER TABLE lp_ads_lp_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_ads_lp_versions_all" ON lp_ads_lp_versions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 7. VERSÕES DE CAMPANHA
-- ============================================================
CREATE TABLE IF NOT EXISTS lp_ads_campaign_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES lp_ads_campaigns(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    snapshot JSONB DEFAULT '{}',
    prompt_used TEXT DEFAULT '',
    model_used TEXT DEFAULT '',
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    generated_by TEXT DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpads_cv_camp ON lp_ads_campaign_versions (campaign_id);

ALTER TABLE lp_ads_campaign_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_ads_campaign_versions_all" ON lp_ads_campaign_versions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 8. JOBS DE GERAÇÃO (auditoria de chamadas IA)
-- ============================================================
CREATE TABLE IF NOT EXISTS lp_ads_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES lp_ads_projects(id) ON DELETE CASCADE,
    target_id UUID DEFAULT NULL,
    target_type TEXT DEFAULT ''
        CHECK (target_type IN ('landing_page','campaign','section','')),
    job_type TEXT NOT NULL
        CHECK (job_type IN ('generate_base_lp','generate_ad','generate_variant_lp','regenerate_section','rewrite_html')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','running','completed','failed')),
    error_message TEXT DEFAULT '',
    prompt_used TEXT DEFAULT '',
    model_used TEXT DEFAULT '',
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost_estimate FLOAT DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NULL,
    finished_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpads_job_proj ON lp_ads_generation_jobs (project_id);
CREATE INDEX IF NOT EXISTS idx_lpads_job_status ON lp_ads_generation_jobs (status);

ALTER TABLE lp_ads_generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_ads_generation_jobs_all" ON lp_ads_generation_jobs FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 9. STORAGE BUCKET para PDFs e assets
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('lp_ads', 'lp_ads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "lp_ads_storage_read"  ON storage.objects FOR SELECT USING (bucket_id = 'lp_ads');
CREATE POLICY "lp_ads_storage_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lp_ads');
CREATE POLICY "lp_ads_storage_update" ON storage.objects FOR UPDATE USING (bucket_id = 'lp_ads');
CREATE POLICY "lp_ads_storage_delete" ON storage.objects FOR DELETE USING (bucket_id = 'lp_ads');

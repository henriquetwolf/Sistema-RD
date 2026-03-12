-- ============================================================
-- LP + Anúncios — Tracking de Performance e A/B Testing
-- ============================================================

-- ============================================================
-- 1. METAS DE CONVERSÃO (configurável por projeto)
-- ============================================================
CREATE TABLE IF NOT EXISTS lp_ads_conversion_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES lp_ads_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    event_type TEXT NOT NULL DEFAULT 'form_submit',
    event_filter JSONB DEFAULT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpads_cgoal_proj ON lp_ads_conversion_goals (project_id);

ALTER TABLE lp_ads_conversion_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_ads_conversion_goals_all" ON lp_ads_conversion_goals FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 2. TESTES A/B
-- ============================================================
CREATE TABLE IF NOT EXISTS lp_ads_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES lp_ads_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','running','paused','completed')),
    variants JSONB NOT NULL DEFAULT '[]',
    primary_goal_id UUID REFERENCES lp_ads_conversion_goals(id) ON DELETE SET NULL,
    min_visitors INTEGER NOT NULL DEFAULT 100,
    confidence_level FLOAT NOT NULL DEFAULT 0.95,
    winner_id UUID DEFAULT NULL,
    started_at TIMESTAMPTZ DEFAULT NULL,
    ended_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpads_ab_proj ON lp_ads_ab_tests (project_id);
CREATE INDEX IF NOT EXISTS idx_lpads_ab_status ON lp_ads_ab_tests (status);

ALTER TABLE lp_ads_ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_ads_ab_tests_all" ON lp_ads_ab_tests FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_lp_ads_ab_tests_updated
    BEFORE UPDATE ON lp_ads_ab_tests
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================================
-- 3. EVENTOS DE PÁGINA (tracking principal)
-- ============================================================
CREATE TABLE IF NOT EXISTS lp_ads_page_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landing_page_id UUID NOT NULL REFERENCES lp_ads_landing_pages(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES lp_ads_projects(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES lp_ads_campaigns(id) ON DELETE SET NULL,
    ab_test_id UUID REFERENCES lp_ads_ab_tests(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    visitor_id TEXT DEFAULT '',
    session_id TEXT DEFAULT '',
    utm_source TEXT DEFAULT '',
    utm_medium TEXT DEFAULT '',
    utm_campaign TEXT DEFAULT '',
    utm_content TEXT DEFAULT '',
    utm_term TEXT DEFAULT '',
    referrer TEXT DEFAULT '',
    device_type TEXT DEFAULT 'desktop',
    country TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpads_evt_lp ON lp_ads_page_events (landing_page_id);
CREATE INDEX IF NOT EXISTS idx_lpads_evt_proj ON lp_ads_page_events (project_id);
CREATE INDEX IF NOT EXISTS idx_lpads_evt_type ON lp_ads_page_events (event_type);
CREATE INDEX IF NOT EXISTS idx_lpads_evt_date ON lp_ads_page_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lpads_evt_visitor ON lp_ads_page_events (visitor_id);
CREATE INDEX IF NOT EXISTS idx_lpads_evt_ab ON lp_ads_page_events (ab_test_id) WHERE ab_test_id IS NOT NULL;

ALTER TABLE lp_ads_page_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_ads_page_events_all" ON lp_ads_page_events FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 4. CONVERSÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS lp_ads_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES lp_ads_projects(id) ON DELETE CASCADE,
    landing_page_id UUID NOT NULL REFERENCES lp_ads_landing_pages(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES lp_ads_campaigns(id) ON DELETE SET NULL,
    ab_test_id UUID REFERENCES lp_ads_ab_tests(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES lp_ads_conversion_goals(id) ON DELETE SET NULL,
    conversion_type TEXT NOT NULL DEFAULT 'form_submit',
    event_id UUID REFERENCES lp_ads_page_events(id) ON DELETE SET NULL,
    visitor_id TEXT DEFAULT '',
    value FLOAT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpads_conv_proj ON lp_ads_conversions (project_id);
CREATE INDEX IF NOT EXISTS idx_lpads_conv_lp ON lp_ads_conversions (landing_page_id);
CREATE INDEX IF NOT EXISTS idx_lpads_conv_date ON lp_ads_conversions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lpads_conv_ab ON lp_ads_conversions (ab_test_id) WHERE ab_test_id IS NOT NULL;

ALTER TABLE lp_ads_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_ads_conversions_all" ON lp_ads_conversions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 5. CONFIGURAÇÃO DE PIXELS (Meta, Google, TikTok)
-- ============================================================
CREATE TABLE IF NOT EXISTS lp_ads_pixel_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES lp_ads_projects(id) ON DELETE CASCADE,
    pixel_type TEXT NOT NULL CHECK (pixel_type IN ('meta_pixel','google_tag','tiktok_pixel','custom')),
    pixel_id TEXT NOT NULL DEFAULT '',
    events_map JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpads_pixel_proj ON lp_ads_pixel_configs (project_id);

ALTER TABLE lp_ads_pixel_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_ads_pixel_configs_all" ON lp_ads_pixel_configs FOR ALL USING (true) WITH CHECK (true);

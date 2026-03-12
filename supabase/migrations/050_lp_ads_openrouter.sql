-- ============================================================
-- Adicionar 'openrouter' como provider de IA
-- e 'ai_openrouter' como modo de criação de LP
-- ============================================================

-- 1. Alterar CHECK constraint de ai_provider_configs.provider
ALTER TABLE ai_provider_configs
    DROP CONSTRAINT IF EXISTS ai_provider_configs_provider_check;

ALTER TABLE ai_provider_configs
    ADD CONSTRAINT ai_provider_configs_provider_check
    CHECK (provider IN ('claude','openrouter','gemini','openai','custom'));

-- 2. Alterar CHECK constraint de lp_ads_landing_pages.creation_mode
ALTER TABLE lp_ads_landing_pages
    DROP CONSTRAINT IF EXISTS lp_ads_landing_pages_creation_mode_check;

ALTER TABLE lp_ads_landing_pages
    ADD CONSTRAINT lp_ads_landing_pages_creation_mode_check
    CHECK (creation_mode IN ('ai_claude','ai_openrouter','import_html','blank_template'));

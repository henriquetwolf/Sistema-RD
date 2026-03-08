-- ============================================================
-- VOLL Marketing — Plataforma de Marketing Digital Completa
-- Replica todas as funcionalidades do RD Station Marketing
-- com integração bidirecional com o CRM Comercial
-- ============================================================

-- ============================================================
-- 1. LEADS DO MARKETING (base centralizada)
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    company TEXT DEFAULT '',
    job_title TEXT DEFAULT '',
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    country TEXT DEFAULT 'Brasil',
    cpf TEXT DEFAULT '',
    origin TEXT DEFAULT '',
    campaign TEXT DEFAULT '',
    medium TEXT DEFAULT '',
    first_conversion TEXT DEFAULT '',
    last_conversion TEXT DEFAULT '',
    custom_fields JSONB DEFAULT '{}',
    score INTEGER NOT NULL DEFAULT 0,
    lifecycle_stage TEXT NOT NULL DEFAULT 'lead'
        CHECK (lifecycle_stage IN ('visitor','lead','mql','sql','opportunity','customer')),
    tags TEXT[] DEFAULT '{}',
    crm_deal_id UUID DEFAULT NULL,
    crm_aluno_cpf TEXT DEFAULT '',
    opted_out BOOLEAN NOT NULL DEFAULT false,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mktlead_email ON marketing_leads (email);
CREATE INDEX IF NOT EXISTS idx_mktlead_cpf ON marketing_leads (cpf);
CREATE INDEX IF NOT EXISTS idx_mktlead_score ON marketing_leads (score DESC);
CREATE INDEX IF NOT EXISTS idx_mktlead_lifecycle ON marketing_leads (lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_mktlead_crm ON marketing_leads (crm_deal_id);
CREATE INDEX IF NOT EXISTS idx_mktlead_tags ON marketing_leads USING GIN (tags);

-- ============================================================
-- 2. EVENTOS / TRACKING DO LEAD
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES marketing_leads(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    source TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mktevt_lead ON marketing_lead_events (lead_id);
CREATE INDEX IF NOT EXISTS idx_mktevt_type ON marketing_lead_events (event_type);
CREATE INDEX IF NOT EXISTS idx_mktevt_date ON marketing_lead_events (created_at DESC);

-- ============================================================
-- 3. LEAD SCORING RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_lead_scoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_type TEXT NOT NULL CHECK (rule_type IN ('profile','behavior')),
    field_or_event TEXT NOT NULL,
    operator TEXT NOT NULL DEFAULT 'equals',
    value TEXT NOT NULL DEFAULT '',
    points INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. SEGMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    segment_type TEXT NOT NULL DEFAULT 'dynamic'
        CHECK (segment_type IN ('dynamic','static')),
    rules JSONB DEFAULT '[]',
    static_lead_ids UUID[] DEFAULT '{}',
    lead_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. EMAIL TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    subject TEXT NOT NULL DEFAULT '',
    html_content TEXT NOT NULL DEFAULT '',
    json_content JSONB DEFAULT '{}',
    thumbnail_url TEXT DEFAULT '',
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. CAMPANHAS DE EMAIL
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT '',
    from_name TEXT NOT NULL DEFAULT '',
    from_email TEXT NOT NULL DEFAULT '',
    reply_to TEXT DEFAULT '',
    template_id UUID REFERENCES marketing_email_templates(id) ON DELETE SET NULL,
    html_content TEXT NOT NULL DEFAULT '',
    segment_id UUID REFERENCES marketing_segments(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','scheduled','sending','sent','cancelled')),
    scheduled_at TIMESTAMPTZ DEFAULT NULL,
    sent_at TIMESTAMPTZ DEFAULT NULL,
    stats_sent INTEGER DEFAULT 0,
    stats_delivered INTEGER DEFAULT 0,
    stats_opened INTEGER DEFAULT 0,
    stats_clicked INTEGER DEFAULT 0,
    stats_bounced INTEGER DEFAULT 0,
    stats_unsubscribed INTEGER DEFAULT 0,
    ab_test_enabled BOOLEAN NOT NULL DEFAULT false,
    ab_subject_b TEXT DEFAULT '',
    ab_winner TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mktemail_status ON marketing_email_campaigns (status);

-- ============================================================
-- 7. ENVIOS DE EMAIL (por destinatário)
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_email_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES marketing_email_campaigns(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES marketing_leads(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued','sent','delivered','opened','clicked','bounced','unsubscribed')),
    sent_at TIMESTAMPTZ DEFAULT NULL,
    opened_at TIMESTAMPTZ DEFAULT NULL,
    clicked_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mktsend_campaign ON marketing_email_sends (campaign_id);
CREATE INDEX IF NOT EXISTS idx_mktsend_lead ON marketing_email_sends (lead_id);

-- ============================================================
-- 8. AUTOMAÇÕES DE MARKETING
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    trigger_type TEXT NOT NULL DEFAULT 'form_submitted',
    trigger_config JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','active','paused','archived')),
    stats_entered INTEGER DEFAULT 0,
    stats_completed INTEGER DEFAULT 0,
    stats_active INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. PASSOS DAS AUTOMAÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_automation_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES marketing_automations(id) ON DELETE CASCADE,
    step_type TEXT NOT NULL
        CHECK (step_type IN ('trigger','action','condition','delay')),
    action_type TEXT DEFAULT '',
    config JSONB DEFAULT '{}',
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    next_step_id UUID DEFAULT NULL,
    next_step_true_id UUID DEFAULT NULL,
    next_step_false_id UUID DEFAULT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mktstep_auto ON marketing_automation_steps (automation_id);

-- ============================================================
-- 10. EXECUÇÕES DE AUTOMAÇÃO (por lead)
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_automation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES marketing_automations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES marketing_leads(id) ON DELETE CASCADE,
    current_step_id UUID REFERENCES marketing_automation_steps(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running','completed','failed','cancelled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ DEFAULT NULL,
    next_action_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_mktexec_auto ON marketing_automation_executions (automation_id);
CREATE INDEX IF NOT EXISTS idx_mktexec_lead ON marketing_automation_executions (lead_id);
CREATE INDEX IF NOT EXISTS idx_mktexec_next ON marketing_automation_executions (next_action_at);

-- ============================================================
-- 11. LOG DE AUTOMAÇÃO
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES marketing_automation_executions(id) ON DELETE CASCADE,
    step_id UUID REFERENCES marketing_automation_steps(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'success',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mktlog_exec ON marketing_automation_logs (execution_id);

-- ============================================================
-- 12. POP-UPS
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_popups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    popup_type TEXT NOT NULL DEFAULT 'scroll'
        CHECK (popup_type IN ('scroll','exit_intent')),
    title TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    cta_text TEXT DEFAULT 'Quero receber',
    image_url TEXT DEFAULT '',
    form_id UUID DEFAULT NULL,
    target_pages TEXT[] DEFAULT '{}',
    display_frequency TEXT NOT NULL DEFAULT 'once'
        CHECK (display_frequency IN ('once','every_visit','every_session')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    stats_views INTEGER DEFAULT 0,
    stats_conversions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 13. BOTÃO WHATSAPP FLUTUANTE
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_wa_buttons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    default_message TEXT DEFAULT 'Olá! Gostaria de mais informações.',
    button_color TEXT DEFAULT '#25D366',
    button_position TEXT DEFAULT 'bottom-right',
    label TEXT DEFAULT '',
    target_pages TEXT[] DEFAULT '{}',
    capture_as_lead BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    stats_clicks INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 14. LINK DA BIO
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_link_bio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL DEFAULT '',
    subtitle TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    background_color TEXT DEFAULT '#ffffff',
    text_color TEXT DEFAULT '#1e293b',
    accent_color TEXT DEFAULT '#0d9488',
    is_active BOOLEAN NOT NULL DEFAULT true,
    stats_views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketing_link_bio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bio_id UUID NOT NULL REFERENCES marketing_link_bio(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL DEFAULT 'link'
        CHECK (item_type IN ('link','button','image','text','separator','whatsapp')),
    label TEXT NOT NULL DEFAULT '',
    url TEXT DEFAULT '',
    icon TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    stats_clicks INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mktbioitem_bio ON marketing_link_bio_items (bio_id);

-- ============================================================
-- 15. POSTS EM REDES SOCIAIS
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL DEFAULT 'instagram'
        CHECK (platform IN ('instagram','facebook','linkedin','twitter','tiktok')),
    content TEXT NOT NULL DEFAULT '',
    media_urls TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','scheduled','published','failed')),
    scheduled_at TIMESTAMPTZ DEFAULT NULL,
    published_at TIMESTAMPTZ DEFAULT NULL,
    stats_impressions INTEGER DEFAULT 0,
    stats_engagement INTEGER DEFAULT 0,
    stats_clicks INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mktsocial_status ON marketing_social_posts (status);
CREATE INDEX IF NOT EXISTS idx_mktsocial_scheduled ON marketing_social_posts (scheduled_at);

-- ============================================================
-- 16. CAMPANHAS DE SMS
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_sms_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    segment_id UUID REFERENCES marketing_segments(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','scheduled','sending','sent','cancelled')),
    scheduled_at TIMESTAMPTZ DEFAULT NULL,
    sent_at TIMESTAMPTZ DEFAULT NULL,
    stats_sent INTEGER DEFAULT 0,
    stats_delivered INTEGER DEFAULT 0,
    stats_failed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketing_sms_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES marketing_sms_campaigns(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES marketing_leads(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued','sent','delivered','failed')),
    sent_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mktsms_campaign ON marketing_sms_sends (campaign_id);

-- ============================================================
-- 17. CAMPANHAS WEB PUSH
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_push_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    icon_url TEXT DEFAULT '',
    click_url TEXT DEFAULT '',
    segment_id UUID REFERENCES marketing_segments(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','scheduled','sending','sent','cancelled')),
    scheduled_at TIMESTAMPTZ DEFAULT NULL,
    sent_at TIMESTAMPTZ DEFAULT NULL,
    stats_sent INTEGER DEFAULT 0,
    stats_displayed INTEGER DEFAULT 0,
    stats_clicked INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketing_push_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES marketing_push_campaigns(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES marketing_leads(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued','sent','displayed','clicked')),
    sent_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mktpush_campaign ON marketing_push_sends (campaign_id);

-- ============================================================
-- 18. TESTE A/B
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    test_type TEXT NOT NULL DEFAULT 'email_subject'
        CHECK (test_type IN ('email_subject','email_content','landing_page','popup')),
    variant_a_id UUID DEFAULT NULL,
    variant_b_id UUID DEFAULT NULL,
    variant_a_config JSONB DEFAULT '{}',
    variant_b_config JSONB DEFAULT '{}',
    stats_a JSONB DEFAULT '{"views":0,"conversions":0}',
    stats_b JSONB DEFAULT '{"views":0,"conversions":0}',
    winner TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running','completed','cancelled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 19. LOG DE SINCRONIZAÇÃO CRM
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_crm_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    direction TEXT NOT NULL CHECK (direction IN ('marketing_to_crm','crm_to_marketing')),
    lead_id UUID REFERENCES marketing_leads(id) ON DELETE SET NULL,
    deal_id UUID DEFAULT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'success',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mktsync_lead ON marketing_crm_sync_log (lead_id);
CREATE INDEX IF NOT EXISTS idx_mktsync_deal ON marketing_crm_sync_log (deal_id);

-- ============================================================
-- 20. CONFIGURAÇÃO DE INTEGRAÇÃO CRM
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_crm_integration_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    auto_pass_enabled BOOLEAN NOT NULL DEFAULT false,
    min_score_to_pass INTEGER DEFAULT 100,
    pass_segment_id UUID REFERENCES marketing_segments(id) ON DELETE SET NULL,
    target_pipeline TEXT DEFAULT 'Padrão',
    target_stage TEXT DEFAULT 'novo_lead',
    distribution_mode TEXT DEFAULT 'round_robin'
        CHECK (distribution_mode IN ('fixed','round_robin')),
    fixed_owner_id TEXT DEFAULT NULL,
    team_id TEXT DEFAULT NULL,
    field_mapping JSONB DEFAULT '{"name":"contact_name","email":"email","phone":"phone","company":"company_name","city":"course_city","state":"course_state"}',
    sync_crm_events_back BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mktlead_updated ON marketing_leads;
CREATE TRIGGER trg_mktlead_updated BEFORE UPDATE ON marketing_leads FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_mktseg_updated ON marketing_segments;
CREATE TRIGGER trg_mktseg_updated BEFORE UPDATE ON marketing_segments FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_mktemailtemp_updated ON marketing_email_templates;
CREATE TRIGGER trg_mktemailtemp_updated BEFORE UPDATE ON marketing_email_templates FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_mktemailcamp_updated ON marketing_email_campaigns;
CREATE TRIGGER trg_mktemailcamp_updated BEFORE UPDATE ON marketing_email_campaigns FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_mktauto_updated ON marketing_automations;
CREATE TRIGGER trg_mktauto_updated BEFORE UPDATE ON marketing_automations FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_mktpopup_updated ON marketing_popups;
CREATE TRIGGER trg_mktpopup_updated BEFORE UPDATE ON marketing_popups FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_mktwabutton_updated ON marketing_wa_buttons;
CREATE TRIGGER trg_mktwabutton_updated BEFORE UPDATE ON marketing_wa_buttons FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_mktbio_updated ON marketing_link_bio;
CREATE TRIGGER trg_mktbio_updated BEFORE UPDATE ON marketing_link_bio FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_mktsocial_updated ON marketing_social_posts;
CREATE TRIGGER trg_mktsocial_updated BEFORE UPDATE ON marketing_social_posts FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_mktsms_updated ON marketing_sms_campaigns;
CREATE TRIGGER trg_mktsms_updated BEFORE UPDATE ON marketing_sms_campaigns FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_mktpush_updated ON marketing_push_campaigns;
CREATE TRIGGER trg_mktpush_updated BEFORE UPDATE ON marketing_push_campaigns FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_mktcrmcfg_updated ON marketing_crm_integration_config;
CREATE TRIGGER trg_mktcrmcfg_updated BEFORE UPDATE ON marketing_crm_integration_config FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================================
-- RLS — acesso aberto (mesma política do restante do sistema)
-- ============================================================
ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_automation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_wa_buttons ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_link_bio ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_link_bio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_sms_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_push_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_push_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_crm_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_crm_integration_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketing_leads_all" ON marketing_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_lead_events_all" ON marketing_lead_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_lead_scoring_rules_all" ON marketing_lead_scoring_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_segments_all" ON marketing_segments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_email_templates_all" ON marketing_email_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_email_campaigns_all" ON marketing_email_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_email_sends_all" ON marketing_email_sends FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_automations_all" ON marketing_automations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_automation_steps_all" ON marketing_automation_steps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_automation_executions_all" ON marketing_automation_executions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_automation_logs_all" ON marketing_automation_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_popups_all" ON marketing_popups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_wa_buttons_all" ON marketing_wa_buttons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_link_bio_all" ON marketing_link_bio FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_link_bio_items_all" ON marketing_link_bio_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_social_posts_all" ON marketing_social_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_sms_campaigns_all" ON marketing_sms_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_sms_sends_all" ON marketing_sms_sends FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_push_campaigns_all" ON marketing_push_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_push_sends_all" ON marketing_push_sends FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_ab_tests_all" ON marketing_ab_tests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_crm_sync_log_all" ON marketing_crm_sync_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "marketing_crm_integration_config_all" ON marketing_crm_integration_config FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- SEED: configuração padrão de integração CRM
-- ============================================================
INSERT INTO marketing_crm_integration_config (id, is_enabled, auto_pass_enabled, min_score_to_pass, target_pipeline, target_stage, distribution_mode, sync_crm_events_back)
VALUES (gen_random_uuid(), true, false, 100, 'Padrão', 'novo_lead', 'round_robin', true)
ON CONFLICT DO NOTHING;

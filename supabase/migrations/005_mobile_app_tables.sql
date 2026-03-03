-- =====================================================
-- Migration 005: Mobile App Support Tables
-- Push notification tokens + Geolocation fields
-- =====================================================

-- Device tokens for push notifications (FCM/APNs)
CREATE TABLE IF NOT EXISTS crm_device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type TEXT NOT NULL CHECK (user_type IN ('student', 'instructor')),
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, token)
);

ALTER TABLE crm_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on device tokens"
    ON crm_device_tokens
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user
    ON crm_device_tokens(user_type, user_id);

CREATE INDEX IF NOT EXISTS idx_device_tokens_platform
    ON crm_device_tokens(platform);

-- Geolocation fields for partner studios
ALTER TABLE crm_partner_studios
    ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7),
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);

CREATE INDEX IF NOT EXISTS idx_partner_studios_geo
    ON crm_partner_studios(latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Trigger to auto-update updated_at on device_tokens
CREATE OR REPLACE FUNCTION update_device_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_device_token_updated
    BEFORE UPDATE ON crm_device_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_device_token_timestamp();

-- =====================================================
-- Migration 025: Web Push Notification Support
-- Extends crm_device_tokens for PWA web push subscriptions
-- =====================================================

-- Allow 'web' as a valid platform
ALTER TABLE crm_device_tokens
    DROP CONSTRAINT IF EXISTS crm_device_tokens_platform_check;

ALTER TABLE crm_device_tokens
    ADD CONSTRAINT crm_device_tokens_platform_check
    CHECK (platform IN ('ios', 'android', 'web'));

-- Store the full Web Push subscription object (endpoint + keys)
ALTER TABLE crm_device_tokens
    ADD COLUMN IF NOT EXISTS subscription_json JSONB;

-- Index for quick lookup of web subscriptions
CREATE INDEX IF NOT EXISTS idx_device_tokens_web
    ON crm_device_tokens(platform) WHERE platform = 'web';

-- For web tokens, the 'token' column stores the push subscription endpoint URL,
-- and 'subscription_json' stores the full PushSubscription object:
-- {
--   "endpoint": "https://fcm.googleapis.com/fcm/send/...",
--   "keys": {
--     "p256dh": "...",
--     "auth": "..."
--   }
-- }

-- ============================================================
-- Auto Sync Cron Job - Conta Azul Incremental Sync
-- Runs every 10 minutes via pg_cron + pg_net
-- ============================================================

-- Enable extensions (pg_cron is pre-installed on Supabase but needs enabling)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule incremental sync for all active accounts every 10 minutes
-- NOTE: You must configure these settings in Supabase Dashboard:
--   Database > Settings > Database Settings
--   Or use Vault secrets. The values below use current_setting which
--   reads from supabase_functions.env or app.settings.
--
-- If current_setting doesn't work in your environment, replace with
-- hardcoded values:
--   url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/conta-azul-sync/auto-sync-all'
--   'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'

SELECT cron.schedule(
  'conta-azul-auto-sync',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1)
           || '/functions/v1/conta-azul-sync/auto-sync-all',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To verify the job was created:
-- SELECT * FROM cron.job WHERE jobname = 'conta-azul-auto-sync';

-- To check execution history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- To disable auto-sync:
-- SELECT cron.unschedule('conta-azul-auto-sync');

-- To change the interval (e.g. every 5 minutes):
-- SELECT cron.unschedule('conta-azul-auto-sync');
-- SELECT cron.schedule('conta-azul-auto-sync', '*/5 * * * *', $$ ... $$);

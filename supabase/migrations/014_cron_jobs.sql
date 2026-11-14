-- ============================================================
-- 014_cron_jobs.sql
-- FASE 3: Cron Jobs untuk expired orders & maintenance
-- ============================================================

-- Enable pg_cron extension (Supabase sudah punya, enable saja)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule: Jalankan setiap 5 menit untuk auto-expire online orders
SELECT cron.schedule(
  'expire-stale-online-orders',
  '*/5 * * * *',
  $$
  SELECT expire_stale_online_orders();
  $$
);

-- Schedule: Daily maintenance - cleanup old completed/expired orders (opsional, 30 hari)
-- SELECT cron.schedule(
--   'cleanup-old-orders',
--   '0 3 * * *',
--   $$
--   DELETE FROM orders WHERE order_status IN ('completed', 'cancelled', 'expired') AND created_at < now() - interval '30 days';
--   $$
-- );
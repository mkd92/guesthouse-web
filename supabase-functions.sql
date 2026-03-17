-- ============================================================
-- RentRelay — Supabase Functions & Cron
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- (After running supabase-schema.sql)
-- ============================================================

-- ─── Trigger: sync unit status when lease is created/updated ──────────────────

CREATE OR REPLACE FUNCTION sync_unit_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.units
    SET status = 'occupied', current_lease_id = NEW.id, updated_at = NOW()
    WHERE id = NEW.unit_id;
  ELSIF TG_OP = 'UPDATE'
    AND OLD.status IS DISTINCT FROM NEW.status
    AND NEW.status IN ('terminated', 'expired')
  THEN
    UPDATE public.units
    SET status = 'available', current_lease_id = NULL, updated_at = NOW()
    WHERE id = NEW.unit_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_lease_change
  AFTER INSERT OR UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION sync_unit_status();

-- ─── Function: generate monthly rent transactions ──────────────────────────────
-- Called by pg_cron on the 1st of each month at 03:30 UTC (09:00 IST).
-- Creates a pending rent transaction for every active booking and active lease.
-- Idempotent — skips if a transaction for that booking/lease + period exists.

CREATE OR REPLACE FUNCTION generate_monthly_rent()
RETURNS void AS $$
DECLARE
  period_str TEXT;
  due_date   DATE;
  b          RECORD;
  l          RECORD;
  cust_name  TEXT;
  unit_name  TEXT;
BEGIN
  -- "March 2026" style (trim trailing spaces from TO_CHAR padding)
  period_str := TRIM(TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'FMMonth YYYY'));
  -- Due on the 5th of the current month
  due_date := DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Kolkata')::DATE + 4;

  -- ── PG Bookings ────────────────────────────────────────────────────────────
  FOR b IN SELECT * FROM public.bookings WHERE status = 'active' LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.transactions
      WHERE booking_id = b.id AND period = period_str AND type = 'rent'
    ) THEN
      SELECT name INTO cust_name FROM public.customers WHERE id = b.customer_id;
      INSERT INTO public.transactions (
        booking_id, customer_id, customer_name,
        property_id, source,
        amount, type, period, status, due_date, notes
      ) VALUES (
        b.id, b.customer_id, COALESCE(cust_name, ''),
        b.property_id, 'pg',
        b.rent_per_month, 'rent', period_str, 'pending', due_date,
        'Auto-generated monthly rent for ' || period_str
      );
    END IF;
  END LOOP;

  -- ── Leases ─────────────────────────────────────────────────────────────────
  FOR l IN SELECT * FROM public.leases WHERE status = 'active' LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.transactions
      WHERE lease_id = l.id AND period = period_str AND type = 'rent'
    ) THEN
      SELECT name INTO cust_name FROM public.customers WHERE id = l.customer_id;
      SELECT name INTO unit_name FROM public.units      WHERE id = l.unit_id;
      INSERT INTO public.transactions (
        lease_id, customer_id, customer_name,
        unit_name, property_id, source,
        amount, type, period, status, due_date, notes
      ) VALUES (
        l.id, l.customer_id, COALESCE(cust_name, ''),
        COALESCE(unit_name, ''), l.property_id, 'lease',
        l.rent_per_month, 'rent', period_str, 'pending', due_date,
        'Auto-generated monthly rent for ' || period_str
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Schedule: run generate_monthly_rent on 1st of every month at 03:30 UTC ───
-- IMPORTANT: Run this ONLY after enabling pg_cron in:
--   Supabase Dashboard > Database > Extensions > pg_cron (toggle on)
-- Then open a new SQL Editor query and run just this block:
--
-- SELECT cron.schedule(
--   'generate-monthly-rent',
--   '30 3 1 * *',
--   'SELECT generate_monthly_rent()'
-- );

-- ============================================================
-- RentRelay Guesthouse Manager — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.properties (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  address             TEXT DEFAULT '',
  type                TEXT NOT NULL DEFAULT 'pg' CHECK (type IN ('pg', 'residential', 'commercial')),
  joining_fee         NUMERIC DEFAULT 0,
  refundable_deposit  NUMERIC DEFAULT 0,
  description         TEXT DEFAULT '',
  active              BOOLEAN DEFAULT TRUE,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rooms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  type         TEXT DEFAULT 'single',
  floor        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.beds (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  property_id  UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  bed_number   TEXT NOT NULL DEFAULT '',
  status       TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  rent         NUMERIC DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  phone              TEXT DEFAULT '',
  email              TEXT DEFAULT '',
  id_type            TEXT DEFAULT 'Aadhaar',
  id_number          TEXT DEFAULT '',
  emergency_contact  TEXT DEFAULT '',
  notes              TEXT DEFAULT '',
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID REFERENCES public.customers(id),
  bed_id           UUID REFERENCES public.beds(id),
  property_id      UUID REFERENCES public.properties(id),
  check_in         TIMESTAMPTZ,
  check_out        TIMESTAMPTZ,
  rent_per_month   NUMERIC DEFAULT 0,
  deposit          NUMERIC DEFAULT 0,
  status           TEXT DEFAULT 'active' CHECK (status IN ('active', 'checked_out')),
  notes            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.units (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  type              TEXT DEFAULT '',
  floor             TEXT DEFAULT '',
  rent              NUMERIC DEFAULT 0,
  status            TEXT DEFAULT 'available',
  current_lease_id  UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID REFERENCES public.customers(id),
  unit_id             UUID REFERENCES public.units(id),
  property_id         UUID REFERENCES public.properties(id),
  lease_start         DATE,
  lease_end           DATE,
  rent_per_month      NUMERIC DEFAULT 0,
  deposit_amount      NUMERIC DEFAULT 0,
  joining_fee         NUMERIC DEFAULT 0,
  status              TEXT DEFAULT 'active' CHECK (status IN ('active', 'terminated', 'expired')),
  document_url        TEXT DEFAULT '',
  termination_notes   TEXT DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID REFERENCES public.customers(id),
  booking_id     UUID REFERENCES public.bookings(id),
  lease_id       UUID REFERENCES public.leases(id),
  property_id    UUID REFERENCES public.properties(id),
  type           TEXT DEFAULT 'rent',
  amount         NUMERIC DEFAULT 0,
  period         TEXT DEFAULT '',
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  due_date       DATE,
  paid_on        DATE,
  notes          TEXT DEFAULT '',
  customer_name  TEXT DEFAULT '',
  unit_name      TEXT DEFAULT '',
  bed_name       TEXT DEFAULT '',
  source         TEXT DEFAULT 'pg',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID REFERENCES public.properties(id),
  category     TEXT DEFAULT '',
  description  TEXT NOT NULL,
  amount       NUMERIC DEFAULT 0,
  date         DATE,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID REFERENCES public.properties(id),
  title        TEXT NOT NULL,
  description  TEXT DEFAULT '',
  status       TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  priority     TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to  TEXT DEFAULT '',
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance  ENABLE ROW LEVEL SECURITY;

-- Users: any authenticated user can read; insert own row; admin can update anyone
CREATE POLICY "users_select"      ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert_own"  ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update"      ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = id OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- Properties: authenticated read; admin write only
CREATE POLICY "properties_select" ON public.properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "properties_write"  ON public.properties FOR ALL    TO authenticated
  USING      ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- All other tables: any authenticated user can read and write
CREATE POLICY "rooms_all"        ON public.rooms        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "beds_all"         ON public.beds         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "customers_all"    ON public.customers    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "bookings_all"     ON public.bookings     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "units_all"        ON public.units        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "leases_all"       ON public.leases       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "transactions_all" ON public.transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "expenses_all"     ON public.expenses     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "maintenance_all"  ON public.maintenance  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Trigger: sync bed status when booking is created/updated ─────────────────

CREATE OR REPLACE FUNCTION sync_bed_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'active') THEN
    UPDATE public.beds SET status = 'occupied' WHERE id = NEW.bed_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'checked_out' THEN
    UPDATE public.beds SET status = 'available' WHERE id = NEW.bed_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_booking_change
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION sync_bed_status();

-- ─── Trigger: create user profile on signup ───────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.users;
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, ''),
    CASE
      WHEN NEW.email = 'manikandan.m1116@gmail.com' THEN 'admin'
      WHEN user_count = 0 THEN 'admin'
      ELSE 'staff'
    END
  )
  ON CONFLICT (id) DO UPDATE SET role =
    CASE WHEN EXCLUDED.email = 'manikandan.m1116@gmail.com' THEN 'admin'
    ELSE public.users.role END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── ACCOUNTS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'cash' CHECK (type IN ('cash','bank','credit_card')),
  opening_balance  NUMERIC DEFAULT 0,
  notes            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_all" ON public.accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.account_transfers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id  UUID REFERENCES public.accounts(id),
  to_account_id    UUID REFERENCES public.accounts(id),
  amount           NUMERIC NOT NULL,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  notes            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfers_all" ON public.account_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Link rent payments and expenses to accounts
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);

-- ─── CATEGORIES ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color      TEXT DEFAULT 'blue',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_all" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.categories (name, type, color) VALUES
  ('Maintenance',    'expense', 'yellow'),
  ('Utility',        'expense', 'blue'),
  ('Tax',            'expense', 'red'),
  ('Insurance',      'expense', 'green'),
  ('Staff',          'expense', 'blue'),
  ('Loan Repayment', 'expense', 'red'),
  ('Other',          'expense', 'yellow')
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (name, type, color) VALUES
  ('Business Income', 'income', 'green'),
  ('Interest',        'income', 'blue'),
  ('Dividend',        'income', 'green'),
  ('Loan Received',   'income', 'yellow'),
  ('Other Income',    'income', 'blue')
ON CONFLICT DO NOTHING;

-- Extend transactions to support income entries (type = 'income')
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS category    TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

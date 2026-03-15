-- ============================================================
-- FINANCE MODULE V1 — DATABASE MIGRATION
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New Query
-- ============================================================
-- IMPORTANT: All monetary amounts stored as BIGINT (kuruş)
--            No stored computed values (e.g. remaining_amount)
-- ============================================================

-- 1. ENUMS

DO $$ BEGIN
  CREATE TYPE finance_transaction_type AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE obligation_type AS ENUM ('payable', 'receivable');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE recurring_frequency AS ENUM ('monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 2. FINANCE CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS finance_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        finance_transaction_type NOT NULL,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#10b981',
  icon        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_finance_categories_user_id ON finance_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_categories_type ON finance_categories(user_id, type);

ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "finance_categories_user_isolation"
    ON finance_categories FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 3. FINANCE TAGS (sub-category logic)
-- ============================================================
CREATE TABLE IF NOT EXISTS finance_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_tags_user_id ON finance_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_tags_category_id ON finance_tags(category_id);

ALTER TABLE finance_tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "finance_tags_user_isolation"
    ON finance_tags FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 4. FINANCE OBLIGATIONS (Borç / Alacak)
-- NOTE: NO remaining_amount column. Always derived at runtime via SUM().
-- ============================================================
CREATE TABLE IF NOT EXISTS finance_obligations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            obligation_type NOT NULL,
  total_amount    BIGINT NOT NULL CHECK (total_amount > 0),   -- kuruş, NEVER float
  currency        TEXT NOT NULL DEFAULT 'TRY',
  description     TEXT NOT NULL,
  counterparty    TEXT,
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  deadline        DATE,
  reminder_days   INTEGER NOT NULL DEFAULT 7,
  is_closed       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_finance_obligations_user_id ON finance_obligations(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_obligations_deadline ON finance_obligations(deadline);
CREATE INDEX IF NOT EXISTS idx_finance_obligations_closed ON finance_obligations(user_id, is_closed);

ALTER TABLE finance_obligations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "finance_obligations_user_isolation"
    ON finance_obligations FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 5. FINANCE TRANSACTIONS (Core cash-flow table)
-- ============================================================
CREATE TABLE IF NOT EXISTS finance_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            finance_transaction_type NOT NULL,
  amount          BIGINT NOT NULL CHECK (amount > 0),          -- kuruş, NEVER float
  currency        TEXT NOT NULL DEFAULT 'TRY',
  category_id     UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  tag_id          UUID REFERENCES finance_tags(id) ON DELETE SET NULL,
  obligation_id   UUID REFERENCES finance_obligations(id) ON DELETE SET NULL,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  note            TEXT,
  receipt_path    TEXT,                                        -- Supabase Storage path
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_id ON finance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_occurred_at ON finance_transactions(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_category_id ON finance_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_obligation_id ON finance_transactions(obligation_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_type ON finance_transactions(user_id, type);

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "finance_transactions_user_isolation"
    ON finance_transactions FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 6. FINANCE RECURRING TEMPLATES
-- V1: Manual trigger only — no cron jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS finance_recurring_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            finance_transaction_type NOT NULL,
  amount          BIGINT NOT NULL CHECK (amount > 0),          -- kuruş
  currency        TEXT NOT NULL DEFAULT 'TRY',
  category_id     UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  tag_id          UUID REFERENCES finance_tags(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  note            TEXT,
  frequency       recurring_frequency NOT NULL,
  next_occurrence DATE NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_finance_recurring_user_id ON finance_recurring_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_recurring_next ON finance_recurring_templates(user_id, next_occurrence);

ALTER TABLE finance_recurring_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "finance_recurring_user_isolation"
    ON finance_recurring_templates FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- VERIFICATION QUERIES (run after migration to confirm)
-- ============================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name LIKE 'finance_%';
--
-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' AND tablename LIKE 'finance_%';
--
-- Confirm NO remaining_amount column exists on finance_obligations:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'finance_obligations' AND column_name = 'remaining_amount';
-- (should return 0 rows)

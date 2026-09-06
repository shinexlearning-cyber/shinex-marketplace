-- Additive migration: product approval workflow, buyer/seller distinction,
-- listing-limit plans, and payment scaffolding for subscriptions/boosts.
-- Safe to run against the existing Supabase project — does not drop or
-- rename any existing table, column, or data. Run this once.

-- 1. PRODUCTS: approval workflow -------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE products ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;

-- Backfill: every product that is already active/live in production today
-- was already public before this migration existed, so grandfather it in
-- as approved. Do NOT run this backfill again after go-live.
UPDATE products SET approval_status = 'approved' WHERE approval_status = 'pending';

ALTER TABLE products ADD CONSTRAINT products_approval_status_check
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_products_approval_status ON products(approval_status);

-- Basic case-insensitive text search support on the columns Part 1 needs.
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON products USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_location_trgm ON products USING gin (location gin_trgm_ops);
-- Requires the pg_trgm extension. Safe/no-op if it already exists.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. USERS: buyer/seller distinction + plan -----------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_seller BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'starter';
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP;

ALTER TABLE users ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('starter', 'pro', 'enterprise'));

CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- 3. SUBSCRIPTIONS (SHINEX PRO / ENTERPRISE) --------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('pro', 'enterprise')),
  amount DECIMAL(10, 2) NOT NULL,
  paystack_reference VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'failed')),
  starts_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_reference ON subscriptions(paystack_reference);

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. BOOSTS (paid product boosts) -------------------------------------------
CREATE TABLE IF NOT EXISTS boosts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  days INTEGER NOT NULL CHECK (days > 0),
  amount DECIMAL(10, 2) NOT NULL,
  paystack_reference VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'failed')),
  starts_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_boosts_product_id ON boosts(product_id);
CREATE INDEX IF NOT EXISTS idx_boosts_user_id ON boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_boosts_status ON boosts(status);
CREATE INDEX IF NOT EXISTS idx_boosts_expires_at ON boosts(expires_at);

CREATE TRIGGER update_boosts_updated_at BEFORE UPDATE ON boosts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

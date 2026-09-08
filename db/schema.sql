CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text,
  phone text,
  bio text,
  location text,
  whatsapp text,
  shop_name text,
  shop_description text,
  avatar_url text,
  avatar_public_id text,
  is_seller boolean NOT NULL DEFAULT false,
  plan text NOT NULL DEFAULT 'basic',
  plan_expires_at timestamptz,
  is_admin boolean NOT NULL DEFAULT false,
  is_suspended boolean NOT NULL DEFAULT false,
  suspension_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  condition text,
  location text,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  is_sold boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  public_id text,
  is_primary boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorite_products (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS favorite_sellers (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, seller_id)
);

CREATE TABLE IF NOT EXISTS advertisement_durations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duration_days integer NOT NULL CHECK (duration_days > 0),
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  duration_id uuid REFERENCES advertisement_durations(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  image_url text,
  image_public_id text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  approval_status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id text PRIMARY KEY,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  label text NOT NULL,
  listing_limit integer NOT NULL CHECK (listing_limit > 0)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan text NOT NULL REFERENCES subscription_plans(id),
  plan_expires_at timestamptz,
  payment_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  advertisement_id uuid REFERENCES advertisements(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  reference text UNIQUE NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  target_advertisement_id uuid REFERENCES advertisements(id) ON DELETE SET NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (((target_product_id IS NOT NULL)::int + (target_user_id IS NOT NULL)::int + (target_advertisement_id IS NOT NULL)::int) = 1)
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text,
  action text,
  message text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status_active ON products(status,is_active);
CREATE INDEX IF NOT EXISTS idx_ads_user ON advertisements(user_id);
CREATE INDEX IF NOT EXISTS idx_ads_status ON advertisements(approval_status,payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activities(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reset_user ON password_reset_tokens(user_id);

INSERT INTO subscription_plans(id,amount,label,listing_limit) VALUES
  ('basic',0,'Basic',10),
  ('pro',5000,'Pro',50)
ON CONFLICT (id) DO NOTHING;

INSERT INTO advertisement_durations(duration_days,price) VALUES
  (7,5000),(14,9000),(30,15000)
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users(lower(username));


-- Idempotent upgrades for databases that were initialized from an earlier SHINEX schema.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_seller boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'basic';
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS public_id text;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS image_public_id text;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS replied_at timestamptz;

ALTER TABLE product_images ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

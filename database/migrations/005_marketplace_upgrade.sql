-- SHINEX Marketplace additive upgrade. Safe for an existing database.
-- Run in Supabase SQL Editor. This migration never deletes existing rows.

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  billing_interval VARCHAR(20) NOT NULL DEFAULT 'month',
  listing_limit INTEGER NOT NULL CHECK (listing_limit > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  grace_period_ends_at TIMESTAMP,
  paystack_reference VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_one_current_per_user
  ON subscriptions(user_id) WHERE status IN ('active','grace_period');
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry ON subscriptions(expires_at, grace_period_ends_at);

INSERT INTO subscription_plans (code, name, price, billing_interval, listing_limit)
VALUES
  ('FREE', 'Free', 0, 'month', 5),
  ('PRO', 'Pro', 2590, 'month', 50),
  ('BUSINESS', 'Business', 7990, 'month', 150)
ON CONFLICT (code) DO UPDATE SET
  price = EXCLUDED.price,
  billing_interval = EXCLUDED.billing_interval,
  listing_limit = EXCLUDED.listing_limit,
  updated_at = CURRENT_TIMESTAMP;

-- Every existing user gets a FREE subscription only if they have none.
INSERT INTO subscriptions (user_id, plan_id, status, started_at)
SELECT u.id, p.id, 'active', CURRENT_TIMESTAMP
FROM users u
CROSS JOIN subscription_plans p
WHERE p.code = 'FREE'
  AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id);

ALTER TABLE products ADD COLUMN IF NOT EXISTS listing_status VARCHAR(30);
ALTER TABLE products ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS archived_reason TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Existing listings were already public in the old system, so preserve them as approved.
UPDATE products SET listing_status = 'approved' WHERE listing_status IS NULL;
ALTER TABLE products ALTER COLUMN listing_status SET DEFAULT 'pending';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_listing_status_check') THEN
    ALTER TABLE products ADD CONSTRAINT products_listing_status_check
      CHECK (listing_status IN ('draft','pending','approved','rejected','active','inactive','archived'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_products_listing_status ON products(listing_status);
CREATE INDEX IF NOT EXISTS idx_products_user_status_active ON products(user_id, listing_status, is_active, is_sold);

CREATE TABLE IF NOT EXISTS listing_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(80) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_tags (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES listing_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_product_tags_tag_id ON product_tags(tag_id);

INSERT INTO listing_tags (name, slug) VALUES
 ('New','new'),('Used','used'),('Refurbished','refurbished'),('Brand New','brand-new'),
 ('Negotiable','negotiable'),('Price Fixed','price-fixed'),('Popular','popular'),('Featured','featured'),
 ('Fast Delivery','fast-delivery'),('Free Delivery','free-delivery'),('Limited Stock','limited-stock'),
 ('In Stock','in-stock'),('Out of Stock','out-of-stock'),('Hot Deal','hot-deal'),('Best Seller','best-seller'),
 ('Verified Seller','verified-seller'),('Local Pickup','local-pickup'),('Available Now','available-now'),
 ('Pre-owned','pre-owned'),('Handmade','handmade'),('Service','service'),('Digital Product','digital-product')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at);

ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contact_messages_user_id ON contact_messages(user_id);

CREATE TABLE IF NOT EXISTS contact_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_message_id UUID NOT NULL REFERENCES contact_messages(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_contact_replies_message ON contact_replies(contact_message_id, created_at);

CREATE TABLE IF NOT EXISTS content_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(120) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_content_pages_published ON content_pages(is_published);

INSERT INTO content_pages (slug, title, content) VALUES
 ('terms','Terms and Conditions',''),('privacy','Privacy Policy',''),('marketplace-rules','Marketplace Rules',''),
 ('seller-policy','Seller Policy',''),('buyer-policy','Buyer Policy',''),('prohibited-items','Prohibited Items Policy',''),
 ('refund-order-policy','Refund/Order Policy',''),('advertising-policy','Advertising Policy',''),
 ('subscription-policy','Subscription Policy',''),('community-safety','Community/Safety Guidelines','')
ON CONFLICT (slug) DO NOTHING;

-- Safe notification helper.
CREATE OR REPLACE FUNCTION create_shinex_notification(
  p_user_id UUID, p_type TEXT, p_title TEXT, p_message TEXT, p_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO notifications(user_id,type,title,message,data)
  VALUES(p_user_id,p_type,p_title,p_message,COALESCE(p_data,'{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backend-safe listing-limit trigger. It serializes seller listing writes with an advisory transaction lock.
CREATE OR REPLACE FUNCTION enforce_shinex_listing_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_limit INTEGER := 5;
  v_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('shinex-listing-limit:' || NEW.user_id::text, 0));

  SELECT COALESCE(sp.listing_limit, 5)
    INTO v_limit
  FROM subscriptions s
  JOIN subscription_plans sp ON sp.id = s.plan_id
  WHERE s.user_id = NEW.user_id
    AND s.status IN ('active','grace_period')
  ORDER BY s.expires_at DESC NULLS LAST
  LIMIT 1;

  SELECT COUNT(*) INTO v_count
  FROM products p
  WHERE p.user_id = NEW.user_id
    AND p.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')::uuid
    AND p.is_active = TRUE
    AND p.is_sold = FALSE
    AND COALESCE(p.listing_status,'approved') IN ('approved','active');

  IF (TG_OP = 'INSERT' AND NEW.is_active = TRUE AND NEW.is_sold = FALSE AND COALESCE(NEW.listing_status,'pending') IN ('approved','active'))
     OR (TG_OP = 'UPDATE' AND NEW.is_active = TRUE AND NEW.is_sold = FALSE AND COALESCE(NEW.listing_status,'pending') IN ('approved','active')) THEN
    IF v_count >= v_limit THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'LISTING_LIMIT_REACHED';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shinex_listing_limit ON products;
CREATE TRIGGER trg_shinex_listing_limit
BEFORE INSERT OR UPDATE OF is_active, is_sold, listing_status ON products
FOR EACH ROW EXECUTE FUNCTION enforce_shinex_listing_limit();

-- Make updated_at work for the new tables without assuming the old trigger exists.
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_listing_tags_updated_at ON listing_tags;
CREATE TRIGGER update_listing_tags_updated_at BEFORE UPDATE ON listing_tags
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_content_pages_updated_at ON content_pages;
CREATE TRIGGER update_content_pages_updated_at BEFORE UPDATE ON content_pages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Additive migration: real activity/notifications feed.
-- Does not alter or drop any existing table.
-- Run this against the existing Supabase project.

CREATE TABLE IF NOT EXISTS activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- product_listed, product_favorited, shop_favorited,
                              -- new_follower, advertisement_created,
                              -- advertisement_payment_success, advertisement_approved,
                              -- advertisement_rejected, advertisement_paused,
                              -- report_resolved, report_dismissed
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity(created_at);

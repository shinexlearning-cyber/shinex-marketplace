-- Additive migration: adds the users.reset_token column used by the
-- forgot-password / reset-password flow (routes/auth.js), which was
-- referenced in code but missing from the original schema.sql.
-- Safe to run against an existing Supabase database — does not drop
-- or alter any existing table, column, or data.

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;

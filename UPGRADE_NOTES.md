# SHINEX Marketplace backend upgrade

This package preserves the existing Express + Supabase architecture and adds subscriptions, listing moderation/limits, expiration processing, tags, notifications, contact replies, policy content, and Render cron configuration.

## Supabase migration
Run `database/migrations/005_marketplace_upgrade.sql` once in the Supabase SQL Editor. It is additive and designed to preserve existing records.

## Render
Web service: `npm install` then `npm start`. Required secrets are listed in `.env.example`. The blueprint also defines an hourly cron service running `npm run process-expirations`.

No DATABASE_URL or pg dependency is used.

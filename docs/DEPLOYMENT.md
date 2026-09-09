# Deploying SHINEX Marketplace to Render

Create a Render Web Service from this folder or upload the repository that
contains it.

## Commands

- Build command: `npm install`
- Start command: `npm start`
- Health check: `/api/health`

The service listens on Render's `PORT` (default `10000`). Do not create a
Render PostgreSQL database and do not set `DATABASE_URL`; this backend uses
Supabase's supported HTTP client and its service-role key only on the server.

## Environment variables

Required for a working production deployment:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Required for payments:

- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY` (kept available for deployment configuration; the
  secret is never returned to clients)

Required for image upload:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Set:

- `FRONTEND_URL=https://shinexmarket.onrender.com`
- `ADMIN_FRONTEND_URL=https://shinex-admin.onrender.com`
- `ADMIN_EMAILS=admin@example.com` with one or more administrator emails
- optional contact variables: `CONTACT_EMAIL`, `CONTACT_PHONE`,
  `CONTACT_WHATSAPP`, `CONTACT_ADDRESS`

Apply `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor
before using the API. The migration enables RLS and creates only the tables
used by the supplied frontends. The server uses the service-role client for
validated protected operations, so never expose that key in either frontend.

After deployment, open:

`https://shinex-marketplace.onrender.com/api/health`

Then set `VITE_SHINEX_API_URL=https://shinex-marketplace.onrender.com/api`
on both frontend services and rebuild them.
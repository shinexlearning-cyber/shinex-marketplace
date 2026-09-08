# SHINEX Marketplace Backend

Production-oriented Express + PostgreSQL API for the SHINEX user marketplace and admin dashboard.

## Production services

- User frontend: `https://shinexmarket.onrender.com`
- Admin frontend: `https://shinex-admin.onrender.com`
- API: `https://shinex-marketplace.onrender.com`

## Stack

- Node.js 18+
- Express
- PostgreSQL (`pg`)
- JWT + bcryptjs authentication
- Cloudinary image storage
- Paystack payments/webhooks

## Deploy on Render

1. Create a PostgreSQL database and copy its internal/external `DATABASE_URL` as appropriate.
2. Create a new Render Web Service from this backend repository/ZIP.
3. Build command: `npm install && npm run db:migrate`
4. Start command: `npm start`
5. Health check: `/api/health`
6. Set all required environment variables from `.env.example`.
7. After deployment, create the first administrator with:

```bash
npm run seed:admin -- admin@example.com admin StrongPasswordHere123! "SHINEX Admin"
```

Run the seed command against the deployed service environment (or a one-off Render shell/job) after the schema migration succeeds.

## Required production variables

- `DATABASE_URL`
- `JWT_SECRET`
- `PAYSTACK_SECRET_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `FRONTEND_URL=https://shinexmarket.onrender.com`
- `ADMIN_FRONTEND_URL=https://shinex-admin.onrender.com`
- `ALLOWED_ORIGINS=https://shinexmarket.onrender.com,https://shinex-admin.onrender.com`

## Payment flow

Advertisement and paid subscription checkout are initialized server-side through Paystack. The backend calculates the amount from the database, creates a unique reference, and verifies successful payments server-side. The Paystack webhook is protected by the `x-paystack-signature` HMAC check.

## Authentication flow

There is one `users` table and one JWT identity system. Admins are users with `is_admin=true`. `/api/auth/me` always resolves the JWT `sub` against the same database record that was authenticated at login. This prevents the previous admin `User not found` failure caused by mismatched identities/databases.

## Validation performed

- JavaScript syntax checks pass for `src/app.js`, `src/server.js`, `scripts/migrate.js`, `scripts/seed-admin.js`, and contract tests.
- Static contract test passes for all current API routes in the package.
- Static database/API schema consistency test passes.
- Runtime HTTP tests that require third-party npm packages were not executed locally because dependency installation was unavailable in the build environment; Render will install dependencies during deployment.

## Important frontend compatibility

The frontend request helpers unwrap `data` from the API envelope. Collection endpoints therefore return arrays inside `data`, with pagination as a sibling property. See `docs/RESPONSE-CONTRACT.md`.

The exact current frontend API files are preserved under `docs/frontend-contract/` for auditability.

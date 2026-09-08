# Validation report

Validated locally without requiring external services:

- `node --check src/app.js` — PASS
- `node --check src/server.js` — PASS
- `node --check scripts/migrate.js` — PASS
- `node --check scripts/seed-admin.js` — PASS
- 81 route declarations found in `src/app.js` — PASS
- Required database tables present in `db/schema.sql` — PASS
- Idempotent schema upgrade statements included — PASS
- Production origins configured — PASS
- Render build uses `npm install`, not `npm ci` without a lockfile — PASS
- Frontend API snapshots included — PASS

Not claimed as locally executed:

- Live PostgreSQL integration
- Live Paystack transaction verification
- Live Cloudinary upload
- Live Render deployment

Those require real credentials/external services and must be smoke-tested after deployment.

const fs = require('fs');
const path = require('path');

const authPath = path.join(__dirname, '..', 'routes', 'auth.js');
const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '003_google_auth.sql');
const renderPath = path.join(__dirname, '..', 'render.yaml');

const auth = fs.readFileSync(authPath, 'utf8');
const migration = fs.readFileSync(migrationPath, 'utf8');
const render = fs.readFileSync(renderPath, 'utf8');

const checks = [
  ['Google route exists', auth.includes("router.post('/google'" )],
  ['Google token verification endpoint is used', auth.includes('https://oauth2.googleapis.com/tokeninfo')],
  ['Google audience is checked', auth.includes('googleUser.aud === expectedClientId')],
  ['Verified email is required', auth.includes('emailVerified')],
  ['Google ID is persisted', auth.includes('google_id: googleId')],
  ['Google migration makes password nullable', migration.includes('ALTER COLUMN password_hash DROP NOT NULL')],
  ['Google migration adds google_id', migration.includes('ADD COLUMN IF NOT EXISTS google_id TEXT')],
  ['Render config includes GOOGLE_CLIENT_ID', render.includes('GOOGLE_CLIENT_ID')],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failed = true;
}

process.exit(failed ? 1 : 0);

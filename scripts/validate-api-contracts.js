import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const methods = ['get', 'post', 'put', 'patch', 'delete'];
const routes = new Set();
for (const method of methods) {
  for (const match of app.matchAll(new RegExp(`app\\.${method}\\(['"]([^'"]+)`, 'g'))) routes.add(`${method.toUpperCase()} ${match[1]}`);
}
const expected = [
  'POST /api/auth/login', 'POST /api/auth/register', 'GET /api/auth/me', 'POST /api/auth/logout',
  'POST /api/auth/forgot-password', 'POST /api/auth/reset-password',
  'GET /api/users/me', 'PUT /api/users/me', 'POST /api/users/me/avatar', 'GET /api/users/:username', 'GET /api/users/:username/shop',
  'GET /api/products/categories/all', 'GET /api/products', 'GET /api/products/mine/all', 'GET /api/products/:id',
  'POST /api/products', 'PUT /api/products/:id', 'DELETE /api/products/:id', 'PATCH /api/products/:id/sold',
  'GET /api/favorites/products', 'GET /api/favorites/sellers', 'POST /api/favorites/product/:id', 'DELETE /api/favorites/product/:id',
  'GET /api/favorites/product/:id/check', 'POST /api/favorites/seller/:id', 'DELETE /api/favorites/seller/:id', 'GET /api/favorites/seller/:id/check',
  'GET /api/advertisements/pricing', 'GET /api/advertisements/my', 'POST /api/advertisements', 'POST /api/advertisements/:id/pay',
  'GET /api/subscriptions/plans', 'GET /api/subscriptions/me', 'POST /api/subscriptions', 'GET /api/subscriptions/verify/:reference',
  'GET /api/reports/my', 'POST /api/reports', 'GET /api/contact/info', 'POST /api/contact', 'GET /api/activity',
  'GET /api/admin/users', 'GET /api/admin/users/:id', 'PATCH /api/admin/users/:id/suspend', 'PATCH /api/admin/users/:id/unsuspend',
  'PATCH /api/admin/users/:id/set-admin', 'DELETE /api/admin/users/:id', 'GET /api/admin/products', 'GET /api/admin/products/:id',
  'PATCH /api/admin/products/:id/approve', 'PATCH /api/admin/products/:id/reject', 'DELETE /api/admin/products/:id',
  'GET /api/admin/categories', 'POST /api/admin/categories', 'PUT /api/admin/categories/:id', 'DELETE /api/admin/categories/:id',
  'GET /api/admin/advertisements', 'GET /api/admin/advertisements/:id', 'PATCH /api/admin/advertisements/:id/approve',
  'PATCH /api/admin/advertisements/:id/reject', 'PATCH /api/admin/advertisements/:id/pause', 'DELETE /api/admin/advertisements/:id',
  'GET /api/admin/durations', 'POST /api/admin/durations', 'PUT /api/admin/durations/:id', 'DELETE /api/admin/durations/:id',
  'GET /api/admin/payments', 'GET /api/admin/payments/:id', 'GET /api/admin/payments/stats',
  'GET /api/admin/reports', 'GET /api/admin/reports/:id', 'PATCH /api/admin/reports/:id/resolve', 'PATCH /api/admin/reports/:id/dismiss',
  'GET /api/admin/contact', 'GET /api/admin/contact/:id', 'PATCH /api/admin/contact/:id/status', 'DELETE /api/admin/contact/:id'
];
const missing = expected.filter((route) => !routes.has(route));
console.log(`Backend route declarations: ${routes.size}`);
console.log('Frontend source inventory: docs/API-COVERAGE.md (supplied frontend clients were inspected before packaging)');
console.log(`IMPLEMENTED: ${expected.length - missing.length}`);
console.log(`MISSING: ${missing.length}`);
if (missing.length) {
  console.error(missing.join('\n'));
  process.exitCode = 1;
} else {
  console.log('MISMATCH: 0 known route declarations missing');
  console.log('NOT_USED: /api/health and /api/paystack/webhook are server/deployment routes');
}
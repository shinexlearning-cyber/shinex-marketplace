import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const schema = fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');

const required = [
  ['POST','/api/auth/register'],['POST','/api/auth/login'],['GET','/api/auth/me'],['POST','/api/auth/logout'],['POST','/api/auth/forgot-password'],['POST','/api/auth/reset-password'],
  ['GET','/api/users/me'],['PUT','/api/users/me'],['POST','/api/users/me/avatar'],['GET','/api/users/:username'],['GET','/api/users/:username/shop'],
  ['POST','/api/products'],['GET','/api/products'],['GET','/api/products/:id'],['PUT','/api/products/:id'],['DELETE','/api/products/:id'],['PATCH','/api/products/:id/sold'],['GET','/api/products/categories/all'],['GET','/api/products/mine/all'],
  ['POST','/api/favorites/product/:productId'],['DELETE','/api/favorites/product/:productId'],['POST','/api/favorites/seller/:sellerId'],['DELETE','/api/favorites/seller/:sellerId'],['GET','/api/favorites/products'],['GET','/api/favorites/sellers'],['GET','/api/favorites/product/:productId/check'],['GET','/api/favorites/seller/:sellerId/check'],
  ['GET','/api/advertisements/pricing'],['POST','/api/advertisements'],['POST','/api/advertisements/:id/pay'],['GET','/api/advertisements/payment/callback'],['GET','/api/advertisements/:id/payment'],['GET','/api/advertisements/my'],['POST','/api/advertisements/webhook/paystack'],
  ['GET','/api/subscriptions/plans'],['GET','/api/subscriptions/me'],['POST','/api/subscriptions'],['GET','/api/subscriptions/verify/:reference'],
  ['POST','/api/reports'],['GET','/api/reports/my'],['POST','/api/contact'],['GET','/api/contact/info'],['GET','/api/activity'],
  ['GET','/api/admin/users'],['GET','/api/admin/users/:id'],['PATCH','/api/admin/users/:id/suspend'],['PATCH','/api/admin/users/:id/unsuspend'],['PATCH','/api/admin/users/:id/set-admin'],['DELETE','/api/admin/users/:id'],
  ['GET','/api/admin/products'],['GET','/api/admin/products/:id'],['PATCH','/api/admin/products/:id/approve'],['PATCH','/api/admin/products/:id/reject'],['DELETE','/api/admin/products/:id'],
  ['GET','/api/admin/categories'],['POST','/api/admin/categories'],['PUT','/api/admin/categories/:id'],['DELETE','/api/admin/categories/:id'],
  ['GET','/api/admin/advertisements'],['GET','/api/admin/advertisements/:id'],['PATCH','/api/admin/advertisements/:id/approve'],['PATCH','/api/admin/advertisements/:id/reject'],['PATCH','/api/admin/advertisements/:id/pause'],['DELETE','/api/admin/advertisements/:id'],
  ['GET','/api/admin/durations'],['POST','/api/admin/durations'],['PUT','/api/admin/durations/:id'],['DELETE','/api/admin/durations/:id'],
  ['GET','/api/admin/payments'],['GET','/api/admin/payments/:id'],['GET','/api/admin/payments/stats'],
  ['GET','/api/admin/reports'],['GET','/api/admin/reports/:id'],['PATCH','/api/admin/reports/:id/resolve'],['PATCH','/api/admin/reports/:id/dismiss'],
  ['GET','/api/admin/contact'],['GET','/api/admin/contact/:id'],['PATCH','/api/admin/contact/:id/status'],['DELETE','/api/admin/contact/:id'],
  ['GET','/api/health'],['GET','/health']
];

const routeRegex = (method, path) => {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(`app\\.${method.toLowerCase()}\\(\\s*['\"]${escaped}['\"]`);
};

test('all documented/current SHINEX routes are declared', () => {
  const missing = required.filter(([m,p]) => !routeRegex(m,p).test(app)).map(([m,p]) => `${m} ${p}`);
  assert.deepEqual(missing, []);
  assert.equal(required.length, 81);
});

test('database schema contains the fields required by the API', () => {
  for (const table of ['users','categories','products','product_images','favorite_products','favorite_sellers','advertisement_durations','advertisements','subscription_plans','subscriptions','payments','reports','contact_messages','activities','password_reset_tokens']) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\s*\\(`));
  }
  for (const field of ['avatar_public_id','starts_at','expires_at','paystack_reference','resolved_by','resolved_at','replied_at']) {
    // These are API concepts; paystack_reference is an API alias for payments.reference.
    if (field === 'paystack_reference') assert.match(app, /reference AS paystack_reference/);
    else assert.match(schema, new RegExp(`\\b${field}\\b`));
  }
});

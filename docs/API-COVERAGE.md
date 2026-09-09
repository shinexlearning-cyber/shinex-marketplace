# SHINEX API coverage

This inventory is derived from `src/lib/shinex-api.ts` and
`src/lib/shinex-admin-api.ts` in the two supplied frontends. All listed paths
are implemented in `src/app.js`. The API returns the `{ success, data }`
envelope consumed by both clients; paginated admin responses also include a
top-level `pagination` object.

| Frontend operation | Method | Endpoint | Auth | Admin | Status |
|---|---:|---|:---:|:---:|---|
| Auth login/register/me/logout/password | POST/GET | `/api/auth/*` | mixed | no | IMPLEMENTED |
| User profile/shop/avatar | GET/PUT/POST | `/api/users/*` | mixed | no | IMPLEMENTED |
| Public products/categories | GET | `/api/products`, `/api/products/:id`, `/api/products/categories/all` | no | no | IMPLEMENTED |
| Seller products | POST/PUT/DELETE/PATCH | `/api/products`, `/api/products/:id`, `/api/products/:id/sold`, `/api/products/mine/all` | yes | ownership | IMPLEMENTED |
| Product favorites | GET/POST/DELETE | `/api/favorites/products`, `/api/favorites/product/:id*` | yes | no | IMPLEMENTED |
| Seller favorites | GET/POST/DELETE | `/api/favorites/sellers`, `/api/favorites/seller/:id*` | yes | no | IMPLEMENTED |
| Advertisement pricing/list/create/pay | GET/POST | `/api/advertisements/*` | mixed | no | IMPLEMENTED |
| Subscription plans/current/start/verify | GET/POST | `/api/subscriptions/*` | mixed | no | IMPLEMENTED |
| Reports | GET/POST | `/api/reports/*` | yes | no | IMPLEMENTED |
| Contact information/form | GET/POST | `/api/contact*` | no | no | IMPLEMENTED |
| Activity | GET | `/api/activity` | yes | no | IMPLEMENTED |
| Admin users | GET/PATCH/DELETE | `/api/admin/users*` | yes | yes | IMPLEMENTED |
| Admin products | GET/PATCH/DELETE | `/api/admin/products*` | yes | yes | IMPLEMENTED |
| Admin categories | GET/POST/PUT/DELETE | `/api/admin/categories*` | yes | yes | IMPLEMENTED |
| Admin advertisements | GET/PATCH/DELETE | `/api/admin/advertisements*` | yes | yes | IMPLEMENTED |
| Admin ad durations | GET/POST/PUT/DELETE | `/api/admin/durations*` | yes | yes | IMPLEMENTED |
| Admin payments/stats | GET | `/api/admin/payments*` | yes | yes | IMPLEMENTED |
| Admin reports | GET/PATCH | `/api/admin/reports*` | yes | yes | IMPLEMENTED |
| Admin contact inbox | GET/PATCH/DELETE | `/api/admin/contact*` | yes | yes | IMPLEMENTED |

## Static contract result

- `IMPLEMENTED`: 19 endpoint groups / 76 route-method contracts (72 frontend
  client operations plus four explicit check/admin variants).
- `MISSING`: 0 operations found in the supplied API clients.
- `MISMATCH`: 0 known URL or method mismatches.
- `NOT_USED`: `/api/paystack/webhook` is an additional server-only integration route; neither frontend calls it directly.

Live Supabase, Cloudinary, and Paystack verification requires the deployment
environment variables and was not claimed here.
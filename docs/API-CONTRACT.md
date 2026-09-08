# SHINEX API Contract

The API is shared by the user marketplace and admin dashboard. The backend is the single authority for authentication, permissions, payments, and database state.

## Base URL

`https://shinex-marketplace.onrender.com/api`

## Authentication

Protected requests use `Authorization: Bearer <JWT>`. Admin routes additionally require `is_admin=true` on the authenticated user.

## Response envelope

Success: `{ "success": true, "data": ... }`

Error: `{ "success": false, "message": "..." }`

## Route matrix

| # | Method | Endpoint | Access |
|---:|---|---|---|
| 1 | `POST` | `/api/auth/register` | Public/optional |
| 2 | `POST` | `/api/auth/login` | Public/optional |
| 3 | `GET` | `/api/auth/me` | Authenticated |
| 4 | `POST` | `/api/auth/logout` | Authenticated |
| 5 | `POST` | `/api/auth/forgot-password` | Public/optional |
| 6 | `POST` | `/api/auth/reset-password` | Public/optional |
| 7 | `GET` | `/api/users/me` | Authenticated |
| 8 | `PUT` | `/api/users/me` | Authenticated |
| 9 | `POST` | `/api/users/me/avatar` | Authenticated |
| 10 | `GET` | `/api/users/:username` | Public/optional |
| 11 | `GET` | `/api/users/:username/shop` | Public/optional |
| 12 | `POST` | `/api/products` | Public/optional |
| 13 | `GET` | `/api/products` | Public/optional |
| 14 | `GET` | `/api/products/:id` | Public/optional |
| 15 | `PUT` | `/api/products/:id` | Public/optional |
| 16 | `DELETE` | `/api/products/:id` | Public/optional |
| 17 | `PATCH` | `/api/products/:id/sold` | Authenticated |
| 18 | `GET` | `/api/products/categories/all` | Public/optional |
| 19 | `GET` | `/api/products/mine/all` | Authenticated |
| 20 | `POST` | `/api/favorites/product/:productId` | Authenticated |
| 21 | `DELETE` | `/api/favorites/product/:productId` | Authenticated |
| 22 | `POST` | `/api/favorites/seller/:sellerId` | Authenticated |
| 23 | `DELETE` | `/api/favorites/seller/:sellerId` | Authenticated |
| 24 | `GET` | `/api/favorites/products` | Authenticated |
| 25 | `GET` | `/api/favorites/sellers` | Authenticated |
| 26 | `GET` | `/api/favorites/product/:productId/check` | Authenticated |
| 27 | `GET` | `/api/favorites/seller/:sellerId/check` | Authenticated |
| 28 | `GET` | `/api/advertisements/pricing` | Public/optional |
| 29 | `POST` | `/api/advertisements` | Authenticated |
| 30 | `POST` | `/api/advertisements/:id/pay` | Authenticated |
| 31 | `GET` | `/api/advertisements/payment/callback` | Public/optional |
| 32 | `GET` | `/api/advertisements/:id/payment` | Authenticated |
| 33 | `GET` | `/api/advertisements/my` | Authenticated |
| 34 | `POST` | `/api/advertisements/webhook/paystack` | Authenticated |
| 35 | `GET` | `/api/subscriptions/plans` | Public/optional |
| 36 | `GET` | `/api/subscriptions/me` | Authenticated |
| 37 | `POST` | `/api/subscriptions` | Authenticated |
| 38 | `GET` | `/api/subscriptions/verify/:reference` | Authenticated |
| 39 | `POST` | `/api/reports` | Authenticated |
| 40 | `GET` | `/api/reports/my` | Authenticated |
| 41 | `POST` | `/api/contact` | Public/optional |
| 42 | `GET` | `/api/contact/info` | Public/optional |
| 43 | `GET` | `/api/activity` | Authenticated |
| 44 | `GET` | `/api/admin/users` | Admin |
| 45 | `GET` | `/api/admin/users/:id` | Admin |
| 46 | `PATCH` | `/api/admin/users/:id/suspend` | Admin |
| 47 | `PATCH` | `/api/admin/users/:id/unsuspend` | Admin |
| 48 | `PATCH` | `/api/admin/users/:id/set-admin` | Admin |
| 49 | `DELETE` | `/api/admin/users/:id` | Admin |
| 50 | `GET` | `/api/admin/products` | Admin |
| 51 | `GET` | `/api/admin/products/:id` | Admin |
| 52 | `PATCH` | `/api/admin/products/:id/approve` | Admin |
| 53 | `PATCH` | `/api/admin/products/:id/reject` | Admin |
| 54 | `DELETE` | `/api/admin/products/:id` | Admin |
| 55 | `GET` | `/api/admin/categories` | Admin |
| 56 | `POST` | `/api/admin/categories` | Admin |
| 57 | `PUT` | `/api/admin/categories/:id` | Admin |
| 58 | `DELETE` | `/api/admin/categories/:id` | Admin |
| 59 | `GET` | `/api/admin/advertisements` | Admin |
| 60 | `GET` | `/api/admin/advertisements/:id` | Admin |
| 61 | `PATCH` | `/api/admin/advertisements/:id/approve` | Admin |
| 62 | `PATCH` | `/api/admin/advertisements/:id/reject` | Admin |
| 63 | `PATCH` | `/api/admin/advertisements/:id/pause` | Admin |
| 64 | `DELETE` | `/api/admin/advertisements/:id` | Admin |
| 65 | `GET` | `/api/admin/durations` | Admin |
| 66 | `POST` | `/api/admin/durations` | Admin |
| 67 | `PUT` | `/api/admin/durations/:id` | Admin |
| 68 | `DELETE` | `/api/admin/durations/:id` | Admin |
| 69 | `GET` | `/api/admin/payments` | Admin |
| 70 | `GET` | `/api/admin/payments/:id` | Admin |
| 71 | `GET` | `/api/admin/payments/stats` | Admin |
| 72 | `GET` | `/api/admin/reports` | Admin |
| 73 | `GET` | `/api/admin/reports/:id` | Admin |
| 74 | `PATCH` | `/api/admin/reports/:id/resolve` | Admin |
| 75 | `PATCH` | `/api/admin/reports/:id/dismiss` | Admin |
| 76 | `GET` | `/api/admin/contact` | Admin |
| 77 | `GET` | `/api/admin/contact/:id` | Admin |
| 78 | `PATCH` | `/api/admin/contact/:id/status` | Admin |
| 79 | `DELETE` | `/api/admin/contact/:id` | Admin |
| 80 | `GET` | `/api/health` | Public/optional |
| 81 | `GET` | `/health` | Public/optional |

## Critical implementation rules

- There is one authoritative `users` table. The JWT `sub` is the database user UUID.
- Admin login uses the same `/auth/login` and `/auth/me` endpoints as marketplace users, then checks `is_admin`.
- Password hashes are never returned.
- Product image uploads, avatars, and advertisement images use Cloudinary in production.
- Paystack amounts are calculated server-side in NGN and converted to kobo.
- Paystack webhook signatures are verified before updating payment state.
- Advertisement approval requires a successful payment.
- Subscription payments are verified server-side; the free/basic plan can activate without Paystack.
- Client-side React routing belongs to the frontend Render service; the API only owns `/api/*`.
- Run `npm run db:migrate` before starting the API.

# SHINEX API — changed/added contracts

All paths below are under `/api`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/subscriptions/plans` | No | Active subscription plans |
| GET | `/subscriptions/me` | User | Current plan, status and listing usage |
| POST | `/subscriptions/checkout` | User | Initialize Paystack subscription payment; body `{plan_code}` |
| GET | `/subscriptions/payment/callback` | No | Verify subscription payment and activate plan |
| POST | `/subscriptions/webhook/paystack` | Paystack signature | Idempotent payment verification hook |
| GET | `/notifications` | User | User notifications |
| PATCH | `/notifications/:id/read` | User | Mark notification read |
| PATCH | `/notifications/read-all` | User | Mark all notifications read |
| GET | `/tags` | No | Active controlled listing tags |
| GET | `/content/:slug` | No | Published legal/content page |
| GET | `/contact/my` | User | User's own support conversations/replies |
| PATCH | `/admin/products/:id/approve` | Admin | Approve listing; listing-limit trigger applies |
| PATCH | `/admin/products/:id/reject` | Admin | Reject listing with reason |
| PATCH | `/admin/products/:id/restore` | Admin | Restore archived listing; limit trigger applies |
| GET | `/admin/contact/:id/replies` | Admin | Conversation replies |
| POST | `/admin/contact/:id/reply` | Admin | Store admin reply and notify user |
| GET | `/admin/subscriptions/plans` | Admin | Manage subscription plans |
| PATCH | `/admin/subscriptions/plans/:id` | Admin | Change plan display/price/limit/active state |
| GET | `/admin/subscriptions` | Admin | Subscription records |
| GET | `/admin/tags` | Admin | All tags |
| POST | `/admin/tags` | Admin | Create controlled tag |
| PATCH | `/admin/tags/:id` | Admin | Enable/disable tag |
| GET | `/admin/content` | Admin | Policy/content pages |
| PUT | `/admin/content/:slug` | Admin | Update policy/content |
| GET | `/health` | No | Render health check |

Existing routes were preserved. Product creation now creates a `pending` listing and public discovery only exposes approved/active listings. Seller edits return a listing to pending moderation.

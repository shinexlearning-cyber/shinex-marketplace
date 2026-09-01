# SHINEX Marketplace Frontend

Frontend built from the supplied SHINEX frontend specification.

## Run

Serve this folder with any static server. The frontend uses:
- Production API: `https://shinex-marketplace.onrender.com/api`
- Local API: `http://localhost:5000/api`

No backend, database, fake products, fake users, or fake payments are included.

## Important

The exact backend API contract must be matched before production launch. Endpoint names currently used by the UI are limited to the routes explicitly specified or conventional placeholders:
- `/categories`
- `/products`
- `/products/:id`
- `/auth/login`
- `/auth/register`
- `/advertisements/pricing`
- `/advertisements`

Replace any endpoint only after comparing it with the backend API documentation.

The advertisement payment button is intentionally small and fits the form design; there is no fake payment page. Paystack initialization/redirect should be wired to the exact backend payment endpoint when its contract is available.

## Deploy

Publish the contents as a static site, or serve `index.html` through the existing application. Configure SPA fallback to `index.html` if using clean URL routing.

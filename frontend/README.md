# SHINEX Marketplace — Complete Frontend

This is the expanded frontend package based on the supplied SHINEX Marketplace frontend/UI specification. It is intentionally vanilla HTML/CSS/JavaScript and uses the real backend API rather than a fake database.

## Included
- Responsive marketplace home/discovery
- Backend-driven categories and products
- Backend search/filter/sort
- Product details and gallery
- Seller/shop pages
- WhatsApp seller contact using seller data
- Authentication pages
- Sell product form with multi-image FormData and previews
- Favorites for products and shops
- Profile and activity
- Settings + persistent theme preference
- Advertisement creation with backend-driven pricing
- Paystack redirect support through backend authorization URL
- Payment result state
- Admin dashboard sections: overview, users, products, categories, advertisements, pricing, payments, reports, messages
- Contact/about/privacy/terms pages
- Loading, empty, error and retry states
- Mobile bottom navigation
- No fake products/users/payments
- No secret keys in frontend

## API
Production: https://shinex-marketplace.onrender.com/api
Local: http://localhost:5000/api

The supplied specification says the frontend must follow the actual backend API documentation and must not guess endpoint names. The major routes used here correspond to the supplied requirements, but they must be matched against the backend's final API contract before production launch.

## Paystack
There is no custom fake payment page. The frontend submits the advertisement to the backend, receives a Paystack authorization URL from the backend, and redirects to Paystack. Payment verification remains a backend/webhook responsibility.

## Render
Hash routing is used so browser refreshes work without requiring a history-mode rewrite. The included render.yaml is a simple static-service configuration.

## Design
SHINEX colors from the specification are retained: #4F46E5, #0D9488, #16A34A, #EA580C, #111827, #4B5563, #FFFFFF and #F9FAFB. Buttons are deliberately compact/normal rather than oversized.

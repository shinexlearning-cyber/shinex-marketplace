# Endpoint matrix

The API is rooted at `/api`. Public: `health`, auth login/register/password
reset, public users/shop, products and categories, advertisement pricing,
subscription plans, contact info/contact submission. Bearer-authenticated:
profile/avatar, seller listings, favorites, advertisements/payments,
subscriptions, reports, and activity. `/api/admin/*` is bearer-authenticated
and administrator-only for users, products, categories, advertisements,
durations, payments, reports, and contact management.

The exact paths and methods are maintained in
`attached_assets/Pasted--SHINEX-MARKETPLACE-COMPLETE-FRONTEND-BACKEND-API-CONTR_1788846172481.txt`;
this service implements that matrix without serving React routes.
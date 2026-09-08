# SHINEX API coverage

The backend declares all 81 current route declarations required by the frontend contract, including 77 core frontend operations plus health/payment compatibility routes.

The exact frontend API source snapshots used for this backend are stored in `docs/frontend-contract/`.

Core user operations include auth, profile, seller/shop, products, categories, favorites, advertisements, subscriptions, reports, contact and activity.

Core admin operations include users, products, categories, advertisements, durations, payments, reports and contact.

Authentication is shared: an administrator is a row in `users` with `is_admin=true`. There is no second admin identity database.

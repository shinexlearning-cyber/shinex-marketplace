# SHINEX Render Deployment

## Services
- User frontend: https://shinexmarket.onrender.com
- Admin frontend: https://shinex-admin.onrender.com
- API: https://shinex-marketplace.onrender.com

## Backend service
Runtime: Node
Build command:

    npm install && npm run db:migrate

Start command:

    npm start

Health check:

    /api/health

## Required environment variables
- DATABASE_URL
- JWT_SECRET
- PAYSTACK_SECRET_KEY
- PAYSTACK_PUBLIC_KEY (optional for backend, useful for frontend configuration)
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- FRONTEND_URL=https://shinexmarket.onrender.com
- ADMIN_FRONTEND_URL=https://shinex-admin.onrender.com
- ALLOWED_ORIGINS=https://shinexmarket.onrender.com,https://shinex-admin.onrender.com
- RESET_URL_BASE=https://shinexmarket.onrender.com/reset-password
- CONTACT_EMAIL
- CONTACT_PHONE
- CONTACT_WHATSAPP
- CONTACT_ADDRESS

## First administrator
After migration, run in a Render shell/job:

    npm run seed:admin -- admin@example.com shinexadmin 'A-Long-Random-Password-Here' 'SHINEX Admin'

Then log into the admin frontend using that email/password.

## Verification order
1. GET /api/health
2. register a normal user
3. POST /api/auth/login
4. GET /api/auth/me
5. seed administrator
6. admin login
7. GET /api/auth/me with admin token
8. GET /api/admin/users with admin token
9. create/approve a product
10. test Cloudinary upload
11. test Paystack in test mode before production payments

Do not switch the production frontends to a new API URL until these checks pass.

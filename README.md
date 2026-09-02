# SHINEX Marketplace Backend

This backend is designed around the existing single-file React App.jsx supplied for SHINEX.

## What it supports

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/forgot-password
- GET /api/products
- GET /api/products/:id
- POST /api/products (5 images max, Cloudinary)
- GET /api/shops/:username
- GET /api/favorites
- GET /api/favorites/ids
- POST/DELETE /api/favorites/products/:id
- POST/DELETE /api/favorites/shops/:id
- PATCH /api/users/me
- GET /api/users/me/stats
- GET /api/advertisements/active
- POST /api/advertisements (Paystack initialization)
- POST /api/reports
- POST /api/contact
- Admin dashboard endpoints under /api/admin

## 1. Supabase

Create a free Supabase project.

Open SQL Editor and run:

supabase/schema.sql

Then get:
- Project URL
- Service Role Key

The Service Role Key belongs ONLY in the Render backend environment variables.

## 2. Cloudinary

Get:
- Cloud name
- API key
- API secret

Put them in the Render backend environment variables.

## 3. Render backend

Create a new Web Service from this folder/repository.

Build command:
npm install

Start command:
npm start

Environment variables:
PORT=10000
FRONTEND_URL=https://shinexmarket.onrender.com
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
PAYSTACK_SECRET_KEY=...
PAYSTACK_CALLBACK_URL=https://shinexmarket.onrender.com

## 4. Important security rule

Never put SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, CLOUDINARY_API_SECRET or PAYSTACK_SECRET_KEY inside App.jsx.

## 5. Existing frontend

The supplied App.jsx already calls:

https://shinex-marketplace.onrender.com/api

So after the backend is deployed at that exact URL, you do not need to change the API base URL.

The frontend stores only the JWT login token as `shinex_token`.

## 6. Current limitation

The forgot-password endpoint creates a reset token in the database and logs it on the backend, but this starter does not include an email provider. The visible reset form in App.jsx therefore works as a request endpoint, but a real email reset flow still needs an email service and a reset-password page.

Paystack advertisement initialization is included. A production payment webhook should be added before treating a payment as successful and activating an advertisement.

## 7. Admin

After creating your first account, promote it to admin in Supabase SQL Editor:

update public.users
set role = 'admin'
where email = 'YOUR-EMAIL';

Then log out and log back in.

Do not expose admin credentials in frontend code.

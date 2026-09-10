# SHINEX Google Authentication Setup

## 1. Create the Google OAuth Web Client

In Google Cloud Console, create/select a project and configure an OAuth 2.0 **Web application** client.

Add the domains/origins used by the SHINEX User frontend and Admin frontend to the allowed JavaScript origins. The Google client ID is public; the client secret must never be placed in either frontend.

## 2. Configure Render

Add this environment variable to the `shinex-marketplace` Render service:

```text
GOOGLE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID
```

The backend already has the SHINEX User and Admin origins in CORS.

## 3. Run the database migration

Run `database/migrations/003_google_auth.sql` in the Supabase SQL Editor. This makes `password_hash` nullable for Google-only accounts and adds the unique `google_id` column.

## 4. Frontend integration

Use Google Identity Services in the User frontend to obtain an ID-token credential, then POST it to:

`POST /api/auth/google`

with:

```json
{ "credential": "GOOGLE_ID_TOKEN" }
```

The returned SHINEX JWT is used exactly like the existing password-login token.

## Security notes

- Google tokens are verified server-side.
- The configured OAuth audience is checked.
- Google issuer is checked.
- The Google email must be verified.
- Suspended accounts remain blocked.
- Google sign-in does not create or elevate admin privileges.
- No Google client secret is required by the frontend.

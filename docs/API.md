# SHINEX API notes

All routes are prefixed with `/api`. Successful responses use:

```json
{ "success": true, "data": {} }
```

Errors use:

```json
{ "success": false, "message": "Human readable error" }
```

Admin collection responses add `pagination` with `page`, `limit`, `total`,
and `totalPages`. Authenticated calls send the Supabase access token returned
by `/api/auth/login` or `/api/auth/register` as `Authorization: Bearer <token>`.

Uploaded images are sent as multipart fields named `image` for avatars and
advertisements, or `images` for products. Cloudinary must be configured for
those operations. Payment initialization and verification always use the
Paystack secret server-side; the browser only receives the authorization URL
and reference.
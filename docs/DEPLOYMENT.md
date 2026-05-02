# Deployment

## Cloudflare Pages Setup
## Environment Variables
## CI/CD Pipeline

## Onboarding a new dealership

Step 1: Create tenant row in Supabase:
  INSERT INTO public.tenants (name, slug, archive_after_months)
  VALUES ('Dealership Name', 'dealership-slug', 24);
  Note the generated UUID — this is the tenant_id.

Step 2: Create user accounts in Supabase Auth dashboard.
  For each user, set app_metadata:
  { "role": "admin", "tenant_id": "<uuid>", "full_name": "Name" }

Step 3: Verify the handle_new_user trigger created
  user_profiles rows for each user.

Step 4: Seed vehicle types for the tenant:
  INSERT INTO public.vehicle_types (tenant_id, name, slug)
  VALUES ('<uuid>', 'Electric', 'electric'),
         ('<uuid>', 'Diesel', 'diesel');

Step 5: Log in as the admin user and verify access.

Step 6: Complete catalog setup (vehicle models, variants, features) through the Admin portal UI.

## Security headers
Cloudflare Pages is configured with a `public/_headers` file to enforce strong security policies (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection). 
- Replace `VITE_SUPABASE_URL` and `VITE_R2_PUBLIC_DOMAIN` placeholders in this file before deploying.
- If a new external domain is added (like a CDN or external analytics API), the `Content-Security-Policy` header in `public/_headers` must be updated appropriately. The `_headers` file requires manual URL substitution. Current values:
  - VITE_SUPABASE_URL: [your URL]
  - VITE_R2_PUBLIC_DOMAIN: [your Domain]

## Turnstile setup
1. Go to Cloudflare dashboard → Turnstile
2. Add a site, get SITE_KEY (public) and SECRET_KEY (private)
3. Add to Cloudflare Pages env vars: `VITE_TURNSTILE_SITE_KEY`
4. Add SECRET_KEY to Supabase Edge Function secrets: `TURNSTILE_SECRET_KEY`

## Supabase Edge Function CORS
When the Pages domain changes (e.g., adding custom domain), update ALLOWED_ORIGIN in Supabase Edge Function secrets and redeploy all Edge Functions.
(working) Supa : Auth -> URL Confg -> site = https://vlm-platform.pages.dev && redirect = https://vlm-platform.pages.dev**

## Supabase API security
Go to Supabase dashboard → Settings → API → Allowed origins for CORS. Add your Cloudflare Pages URL here. This restricts which browser origins can call the Supabase REST API directly. Note: this is a CORS restriction only — it does not prevent server-to-server calls (Workers, Edge Functions).
(working) Supa Edge Functions ->Manage secrets -> Add -> TURNSTILE_SECRET_KEY = .. && ALLOWED_ORIGIN = vlm-platform.pages.dev

## Pre-launch checklist
Bundle security check (run after `npm run build`):
  `grep -r "service_role" dist/`
  `grep -r "SECRET" dist/`
  `grep -r "CLOUDINARY_API_SECRET" dist/`
All three commands must return empty results. If any secret appears in the `dist/` output, stop and identify which file is importing it and fix before deploy.

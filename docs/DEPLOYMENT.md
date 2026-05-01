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

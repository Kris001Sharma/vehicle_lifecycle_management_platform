# Security Architecture & Manual Configuration (Prompt 7)

This document outlines the security layers implemented in the VLM Platform and the manual steps required to configure them via the various dashboards.

## 1. Cloudflare Turnstile (Bot Protection)

We use Cloudflare Turnstile to prevent automated bots from attempting login. This is a non-intrusive alternative to CAPTCHA.

### How it works:
1.  **Frontend**: The login page renders a Turnstile widget.
2.  **Verification**: When a user prepares to log in, Turnstile issues a token.
3.  **Server-side Check**: The token is sent to the Supabase Edge Function `verify-turnstile`.
4.  **Backend**: The Edge Function calls Cloudflare's API to verify the token using your `TURNSTILE_SECRET_KEY`.

### Manual Steps (Cloudflare Dashboard):
1.  Log in to your **Cloudflare Dashboard**.
2.  In the left sidebar, navigate to **Turnstile**.
3.  Click **Add Site**.
4.  Enter a name (e.g., "VLM Platform Production").
5.  Enter your domain: `vlm-platform.pages.dev` (and any custom domains you use).
6.  Select **Widget Type**: "Managed" is recommended for best security.
7.  Click **Create**.
8.  **Copy the Keys**:
    -   **Site Key**: Add this to your Cloudflare Pages Environment Variables as `VITE_TURNSTILE_SITE_KEY`.
    -   **Secret Key**: Save this for the Supabase step below.

---

## 2. Supabase Integration (Edge Functions & Auth)

Supabase handles the verification of the bot token and login rate limiting.

### Manual Steps (Supabase Dashboard):

#### A. Edge Function Secrets
Since the Edge Function needs to talk to Cloudflare, it needs the Secret Key.
1.  Navigate to **Edge Functions** in the sidebar.
2.  Click on the `verify-turnstile` function.
3.  Go to **Manage Secrets** (or Settings).
4.  Add a new secret:
    -   **Key**: `TURNSTILE_SECRET_KEY`
    -   **Value**: (The Secret Key from the Cloudflare step above).
5.  Add another secret for security check logic:
    -   **Key**: `ALLOWED_ORIGIN`
    -   **Value**: `https://vlm-platform.pages.dev` (Must include `https://` for CORS to work).

#### B. API CORS Settings
Restricts which browsers can talk to your database.
1.  Go to **Settings** -> **API**.
2.  Scroll to **CORS Config**.
3.  In **Allowed Origins**, add: `https://vlm-platform.pages.dev`.

#### C. SQL Migrations (Rate Limiting)
Ensure the `login_attempts` table and `check_login_rate` function are present.
-   These are defined in `supabase/migrations/20240002_core_schema.sql`.
-   If you've already run the migrations, your login system is protected by a 5-attempt limit per 15 minutes.

---

## 3. GitHub Actions (Edge Function Deployment)

Because Edge Functions are written in TypeScript/Deno, they must be "deployed" to Supabase.

### Manual Steps (GitHub Settings):
1.  Go to your GitHub Repository **Settings** -> **Secrets and variables** -> **Actions**.
2.  Add **New repository secret**:
    -   `SUPABASE_ACCESS_TOKEN`: Go to [Supabase Dashboard -> Account -> Access Tokens](https://supabase.com/dashboard/account/tokens) to generate one.
    -   `SUPABASE_PROJECT_ID`: Found in your Supabase project URL (e.g., `https://supabase.com/dashboard/project/YOUR_ID_HERE`).

Once added, any push to the `main` branch that changes anything in `supabase/functions/` will automatically redeploy the security logic.

---

## 4. Troubleshooting "Security Check Failed"

If you see this error on the login page:

1.  **Check Browser Console**: Look for 500 errors calling `verify-turnstile`.
2.  **Verify Secrets**: Ensure `TURNSTILE_SECRET_KEY` in Supabase matches the one in Cloudflare exactly.
3.  **Check Site Key**: Ensure `VITE_TURNSTILE_SITE_KEY` in Cloudflare Pages environment variables is correct (and that you redeployed after adding it).
4.  **Domain Mismatch**: Ensure `ALLOWED_ORIGIN` in Supabase secrets matches the domain you are accessing (e.g., `vlm-platform.pages.dev`).

---

## 5. Content Security Policy (Headers)

We have implemented a strict CSP in `public/_headers` to prevent XSS and data exfiltration.

**Manual Verification**:
1.  Navigate to your deployed site.
2.  Open **Developer Tools** (F12) -> **Network**.
3.  Click on the main document request.
4.  Verify the `Content-Security-Policy` header is present and contains:
    -   `challenges.cloudflare.com` (for Turnstile)
    -   `*.supabase.co` (for database)
    -   `res.cloudinary.com` (for images)

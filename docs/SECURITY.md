# Security Architecture & Manual Configuration (Phase 7)

This document provides a detailed breakdown of the security layers implemented for the VLM Platform. Since we are operating in **AI Studio**, all steps are designed for manual dashboard interaction rather than terminal commands.

---

## 1. The Security Flow
Understanding how the pieces connect is critical for troubleshooting:

1.  **Bot Detection**: The `LoginPage` renders a Cloudflare Turnstile widget.
2.  **Token Issuance**: When verified, Turnstile provides a `token`.
3.  **Edge Verification**: The app sends this token to your Supabase Edge Function (`verify-turnstile`).
4.  **Cloudflare Check**: The Edge Function calls Cloudflare's API (`siteverify`) using your private `TURNSTILE_SECRET_KEY`.
5.  **Authentication**: Only if the token is valid does the app proceed to check the username and password with Supabase Auth.
6.  **Rate Limiting**: Every login attempt (success or failure) is logged in the `login_attempts` table. If a user/IP hits 5 failures in 15 minutes, they are locked out.

---

## 2. Detailed Dashboard Instructions

### A. Cloudflare Dashboard (Bot Protection)
1.  **Navigate to Turnstile**: Find "Turnstile" in your Cloudflare sidebar.
2.  **Add/Edit Widget**: 
    - **Hostnames**: Add `vlm-platform.pages.dev` and any preview URLs from AI Studio if testing there.
    - **Mode**: Use "Managed" (Recommended).
3.  **Obtain Keys**:
    - **Site Key**: Copy this to your Cloudflare Pages Variables as `VITE_TURNSTILE_SITE_KEY`.
    - **Secret Key**: Copy this for the Supabase step.

### B. Supabase Dashboard (Backend Security)

#### Auth URL Configuration
1.  Go to **Authentication** -> **URL Configuration**.
2.  **Site URL**: Set to `https://vlm-platform.pages.dev`. This is the base URL for auth redirects.
3.  **Redirect URLs**: Add `https://vlm-platform.pages.dev/**` to the white-list to ensure your app can safely return users to the dashboard after login.

#### Edge Function Secrets (CRITICAL)
1.  Go to **Edge Functions** -> Click `verify-turnstile`.
2.  Go to **Settings** -> **Secrets**.
3.  Add/Update:
    - `TURNSTILE_SECRET_KEY`: Use the **Secret Key** from Cloudflare.
    - `ALLOWED_ORIGIN`: `https://vlm-platform.pages.dev`.

---

## 3. GitHub Integration (Auto-Deployment)
Since you cannot use the `supabase` CLI in AI Studio, we use **GitHub Actions** to deploy your code to Supabase.

1.  **Commit the Code**: When I update files in `supabase/functions/`, you simply click the **Sync/Push** button in AI Studio.
2.  **Verify Action**: Go to your GitHub repo -> **Actions** tab. You should see a workflow named "Deploy Supabase Functions".
3.  **Secrets Required**: If the action fails, ensure you added `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID` to your GitHub Repo Secrets.

---

## 4. Troubleshooting & Verification checklist (Production-Grade)

| Test Item | Verification Method | Expected Result |
| :--- | :--- | :--- |
| **Bot Widget** | Open Login Page | The Cloudflare Turnstile widget should render without a "CSP" or "Blocked" error in the console. |
| **Verification (405 Fix)** | Click Login | The Edge Function now uses standard `URLSearchParams` which eliminates the "405 Method Not Allowed" error from Cloudflare. |
| **CSP Compliance** | Browser Console | Should be clean of "TrustedHTML" or "TrustedScript" errors (Relaxed CSP with `unsafe-eval` and `https://` origins). |
| **Success Flow** | Authentication | Upon successful bot verification and correct credentials, you should be redirected to your dashboard. |

---

## 5. Critical Environment variables Reminder

Ensure these are set Exactly as shown in your dashboards:

1. **Cloudflare Pages**: 
   - `VITE_TURNSTILE_SITE_KEY`: Your Turnstile **Site Key**.
2. **Supabase Secrets**:
   - `TURNSTILE_SECRET_KEY`: Your Turnstile **Secret Key**.
   - `ALLOWED_ORIGIN`: `https://vlm-platform.pages.dev` (No trailing slash).

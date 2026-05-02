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

#### Edge Function Secrets (Critical)
The Edge Function is the "middleman" that talks to Cloudflare. It needs your secret key stored securely.
1.  Go to **Edge Functions** -> Click `verify-turnstile`.
2.  Go to **Secrets** (or Manage Secrets).
3.  Add/Update these two:
    - `TURNSTILE_SECRET_KEY`: Use the secret key from Cloudflare.
    - `ALLOWED_ORIGIN`: Set to `*` for testing in AI Studio, or `https://vlm-platform.pages.dev` for production.

#### API CORS
1.  Go to **Settings** -> **API**.
2.  In **Allowed Origins**, ensure your Pages URL is added to prevent unauthorized domains from querying your database.

---

## 3. GitHub Integration (Auto-Deployment)
Since you cannot use the `supabase` CLI in AI Studio, we use **GitHub Actions** to deploy your code to Supabase.

1.  **Commit the Code**: When I update files in `supabase/functions/`, you simply click the **Sync/Push** button in AI Studio.
2.  **Verify Action**: Go to your GitHub repo -> **Actions** tab. You should see a workflow named "Deploy Supabase Functions".
3.  **Secrets Required**: If the action fails, ensure you added `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID` to your GitHub Repo Secrets.

---

## 4. Testing & Verification Checklist

| Test Item | Verification Method | Expected Result |
| :--- | :--- | :--- |
| **Bot Widget** | Open Login Page | Cloudflare logo appears above the button. |
| **Edge Function** | Click Login | No "Turnstile verification invocation error" in console. |
| **Secret Match** | Check Edge Logs | `Cloudflare verification outcome: { success: true ... }` shows in Supabase Logs. |
| **Rate Limit** | Fail login 6 times | Attempt 6 should immediately show "Too many attempts" without checking password. |
| **Audit Log** | Check Supabase SQL | Use `SELECT * FROM login_attempts` to see your history. |

---

## 5. Troubleshooting 405 Errors
A `405 Method Not Allowed` usually means the Cloudflare verification request was rejected.
- **Check Headers**: Ensure the `Content-Type` is not being manually set to something invalid (the Edge Function handles this).
- **Verify Method**: Ensure the request is a `POST`.
- **Site Key/Secret Key**: Ensure you haven't swapped the Site Key and the Secret Key by mistake. Secret Key belongs in Supabase; Site Key belongs in Cloudflare Pages.

# Authentication

## Supabase Auth Configuration
The application uses Supabase Auth with JWT based role-based access control (RBAC).

### Role and Tenant Data (JWT app_metadata)
To ensure security and prevent client-side manipulation, roles and tenant IDs are stored in `app_metadata` within the Auth JWT. 
- `user_metadata` (writable by the user) is **NEVER** used for auth decisions.
- `app_metadata` (readonly for users) is the **Single Source of Truth**.

### Session Lifecycle
- **Initialization**: `useAuthInitializer` runs at app mount.
- **Persistence**: Managed by Supabase SDK (`localStorage`).
- **Refresh**: Automatically handled by SDK.
- **Tab Restore & Tab Switching**: When switching back to the app tab, a fresh session check is triggered to ensure the user is still valid (`is_active`) and hasn't exceeded the 8-hour session length since `last_login_at`. If invalid, they are signed out.

## Login Flow and Access Control

### Step-by-Step Login Flow
1. User enters credentials on `/login`.
2. Supabase auth signs them in and returns a session.
3. The auth process checks the `user_profiles` table for `is_active === true`. Overridden or deactivated accounts are instantly logged out with an error.
4. The `last_login_at` timestamp is updated in `user_profiles`.
5. The `getRoleRedirect` logic points the user to their designated portal automatically.

### Role-Based Redirect Table
| User Role | Assigned Dashboard |
|-----------|--------------------|
| `admin`   | `/admin`           |
| `sales`   | `/sales`           |
| `service` | `/service`         |

### Route Guards
The `AuthGuard` component sits inside the router configuration:
- Unauthenticated users are redirected to `/login`.
- If an authenticated user attempts to access a portal they do not have a role for, they are silently redirected to their correct dashboard. For example, a `sales` user attempting to access `/admin` will be redirected to `/sales`.
- An overarching `RouteErrorBoundary` catches routing failures outside the guard.

### Inactivity Logout & Session Warnings
- **8-Hour Limit**: A background timer (`useInactivityLogout`) ensures the session expires exactly 8 hours after last activity.
- **1-Minute Warning**: 60 seconds before session expiration, a full-screen warning modal pushes the user to extend their session or accept the sign-out.
- User inputs (mouse, click, scroll, touch, keydown) continually reset this timer to keep the user active.

### Logout Flow
1. User clicks "Sign out" (prompts confirmation).
2. `supabase.auth.signOut()` clears the Supabase cache.
3. Zustand auth store is cleared.
4. The user is navigated to `/login`.

## Creating and Managing Users

Step 1: Go to **Supabase dashboard** → **Authentication** → **Users** → **Add user**.
Step 2: Enter email and password. Do NOT use "Send invite email" — use "Create user" directly.
Step 3: After user is created, click the user row to open detail view.
Step 4: Under **User metadata**, edit `app_metadata` (the top JSON block, NOT the bottom `user_metadata`) and set:
```json
{
  "role": "admin",
  "tenant_id": "<uuid-of-dealership-tenant>",
  "full_name": "User Full Name"
}
```
*Valid roles: `admin`, `sales`, `service`.*

Step 5: Save. The `handle_sync_user_profile` trigger automatically creates/updates the corresponding `user_profiles` row in the public schema.

### Security Note
Disable email confirmation for immediate access during development: 
**Supabase dashboard** → **Authentication** → **Providers** → **Email** → disable **Confirm email**.

## User Profiles Table
The `user_profiles` table exists for relational lookups and historical tracking. The application logic reads roles from the JWT, but cross-referencing happens in SQL via this table.

## Roles
- **Admin**: Full system access, catalog management, user management.
- **Sales**: Customer CRM, vehicle management, sales pipeline.
- **Service**: Job cards, vehicle history, technical logs.

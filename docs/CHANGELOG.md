# Changelog

## [Phase 7] — Admin portal: catalog management
- Built catalog CRUD: types, models, variants, features
- Implemented discriminated spec schemas (electric vs diesel)
- Implemented clone and discontinue variant with validations
- Implemented variant sold-vehicle guard on edit
- Built toast notification system

## [Security phase] — Security hardening
- Added _headers file with CSP and security headers
- Integrated Cloudflare Turnstile bot protection on login
- Implemented rate limiting by email and IP with pg_cron cleanup
- Added CORS restriction to all Edge Functions
- Changed attachments to store file_key instead of file_url
- Added archive access logging to audit_logs
- Built audit log viewer in admin portal
- Added auth initializer 10-second timeout with error state
- Implemented one-vehicle-per-invocation archival with KV cursor
- Documented session revocation and bundle security checks

## [Phase 6] — Audit logging, error handling, precautions
Date: 2026-04-30
- Created audit trigger function applied to 7 tables
- Completed layered error boundary with Supabase logging
- Created logErrorToSupabase fire-and-forget utility
- Completed PRECAUTIONS.md for developer and end-user use
- Added tenant onboarding steps to DEPLOYMENT.md

## [Phase 5] — Complete database schema
Date: 2026-04-30
- Created all core tables with FK constraints and triggers
- Created all indexes including GIN trigram for search
- Created complete RLS policy set for all three roles
- Created service record insert trigger for auto-calculation of next service date and km, and vehicle denormalized fields

## [Phase 4] — Authentication flow and route guards
Date: 2026-04-30
- Built login page with React Hook Form and Zod validation
- Implemented loginAction with is_active check and role redirect
- Implemented AuthGuard with role enforcement
- Implemented protected routes for all three portals
- Implemented logout with confirmation dialog
- Implemented 8-hour inactivity logout with 1-minute warning modal
- Implemented tab restore session validation

## [Phase 3] — Supabase setup and auth infrastructure
Date: 2026-04-30
- Created Supabase client singleton with environment validation
- Created `user_profiles` table with RLS and auto-creation triggers
- Created `error_logs` table for boundary tracking
- Implemented Zustand auth store and `extractUser` JWT parser
- Implemented `useAuthInitializer` with tab-restore and visibility listeners
- Updated `Providers` to handle async session initialization with full-screen loading

## [Phase 2] — UI foundation and design system
Date: 2026-04-30
- Established complete design language (colors, typography, spacing, component standards)
- Built reusable UI component library
- Built layout shell components
- Built welcome page with role selection
- Built dummy dashboard pages per role
- Implemented useFormDirtyBlocker and useFormDirtyNavigation hooks

## [Phase 1] — Project scaffold
Date: 2026-04-30
- Initialized React 18 + Vite + TypeScript strict project
- Configured Tailwind CSS, React Router v6, TanStack Query
- Established folder structure and @/ path alias
- Created layered error boundary system
- Created docs/ folder structure with templates
- Added _redirects for Cloudflare Pages SPA routing

# Changelog

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

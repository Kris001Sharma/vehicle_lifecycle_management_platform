# Architecture

## Overview
## Components

### UI Components (`src/components/ui/`)
- `Button.tsx`: Standardized button with variants (primary, secondary, destructive, ghost), sizes, and loading state.
- `Input.tsx`: Form input with integrated label, error message, and hint states.
- `Card.tsx`: Content container with optional title/actions header.
- `Skeleton.tsx`: Placeholder for loading states (animate-pulse).
- `Spinner.tsx`: Loading indicator, used standalone or within buttons.
- `Badge.tsx`: Status indicator with semantic colors.
- `Modal.tsx`: Core modal wrapper.
- `ConfirmDialog.tsx`: Action confirmation / dirty form blocker.

### Layout Components (`src/components/layout/`)
- `Sidebar.tsx`: Role-specific navigation sidebar.
- `Header.tsx`: Page header with title and actions.
- `PageWrapper.tsx`: Main content wrapper composing the Header and scrollable area.
- `AuthGuard.tsx`: Route protection component.

## Data Flow
## Feature Structure
The application is structured around "features" (e.g., `auth`, `admin`, `sales`, `service`) rather than technical type (all components in one folder). Each feature folder contains the pages, components, and hooks specific to that domain. Shared code lives in the root `components`, `hooks`, or `lib` directories.

## Design Language System
- Primary: slate-900 (text, headings, active states)
- Secondary: slate-600 (secondary text, labels)
- Muted: slate-400 (placeholder text, disabled states)
- Background: white (main), slate-50 (page background), slate-100 (hover states, subtle surfaces)
- Border: slate-200 (default), slate-300 (emphasis)
- Accent: indigo-600 (primary actions, active nav items, focus rings)
- Accent hover: indigo-700
- Typography: system-ui stack
- Spacing: p-6 on desktop, p-4 on mobile, space-y-6 section gaps.

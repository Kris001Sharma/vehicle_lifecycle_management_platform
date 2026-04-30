# Vehicle Lifecycle Management (VLM) Platform

Vehicle Lifecycle Management (VLM) platform for commercial vehicle dealerships. An internal tool built with React 18, Vite, TypeScript, TanStack Query, and Tailwind CSS.

## Documentation

All architectural and system decisions are documented in the `docs/` directory:

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture and component strategies.
- [DATABASE.md](docs/DATABASE.md) - Dexie/Supabase schemas and offline capabilities.
- [AUTH.md](docs/AUTH.md) - Admin, Sales, and Service role definitions.
- [API.md](docs/API.md) - External integration endpoints and rate limiting.
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Static SPA building and Cloudflare configuration.
- [BACKUP_AND_ARCHIVAL.md](docs/BACKUP_AND_ARCHIVAL.md) - Strategy for historical records.
- [CHANGELOG.md](docs/CHANGELOG.md) - Version history.

Also see [PRECAUTIONS.md](PRECAUTIONS.md) for known limitations.

## Quick Start

1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill the required variable values
4. Run `npm run dev` to start the local Vite server

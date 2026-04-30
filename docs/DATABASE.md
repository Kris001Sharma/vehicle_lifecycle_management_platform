# Database

## Core Architecture
- **Multi-tenant RLS:** Every table (except `tenants`) includes a `tenant_id` column. Row-Level Security ensures users can only access data matching their `tenant_id`.
- **Soft Deletes:** Records use `is_active` instead of physical deletion where historically significant.
- **Auditing:** All mutable records employ the `handle_updated_at` trigger. Important operations record to `audit_logs`.
- **Time/ID Strategy:** Standardized on `TIMESTAMPTZ` (UTC) and UUIDs generated via `gen_random_uuid()`.

## Schema Map

### Identity and Tenancy
- **`tenants`**: Core entity representing a dealership group. 
- **`user_profiles`** (from Phase 3): Extends auth.users with `tenant_id`, `role`, and `is_active`.
- **`audit_logs`**: Write-only ledger of `INSERT`/`UPDATE`/`DELETE` actions within a tenant.

### Catalog (Types, Models, Variants, Features)
- **`vehicle_types`**: High-level groups (e.g., Truck, Bus, Van).
- **`vehicle_models`**: Parent model referencing a `type` (e.g., "Thunder V9").
- **`vehicle_variants`**: Specific saleable SKU representing a model variation with specs, service intervals, and warranty lifetimes.
- **`features`**: Individual capability or component (e.g., "Air Conditioning").
- **`variant_default_features`**: Join table mapping standard features for a specific variant.

### Operations (Customers & Vehicles)
- **`customers`**: Buyers of vehicles (individuals, fleets, schools, etc.).
- **`vehicles`**: The physical asset sold to a customer. Contains `variant_id`, tracking numbers (VIN/Chassis), sale info.
- **`vehicle_features`**: Specific features present on a given vehicle, including non-standard additions.
- **`vehicle_ownership_history`**: Ledger of transfers between customers.

### Service & Maintenance
- **`service_records`**: A visit event for a vehicle. Captures complaint, diagnosis, and technician info.
- **`service_parts`**: Line items for parts replaced during a service record.
- **`attachments`**: Files linked to vehicles, customers, or service records (receipts, photos) stored in R2 or Cloudinary.

## Supabase Specifics

### Trigger Functions Explained
- **`handle_updated_at()`**: Automatically bumps the `updated_at` column BEFORE UPDATE.
- **`handle_service_record_insert()`**: Automatically calculates `next_service_km` and `next_service_date` based on the vehicle variant's defined service intervals. Also increments `total_service_count` and bumps `last_service_date` on the `vehicles` parent record.

### Archival Strategy
The `vehicles` table contains columns `is_archived`, `archive_key`, and `archived_at` to support deep storage in Cloudflare KV without dropping the operational context. Deep-archived records are pruned from standard queries using partial indexes.

### Index Strategy
1. **Foreign Keys**: B-Tree indexes on all foreign key columns (e.g., `model_id`, `vehicle_id`) to prevent cascading delete slowdowns.
2. **Tenant ID**: Every table has an index on `tenant_id` to speed up RLS policies.
3. **Search (GIN Trigram)**: Used `pg_trgm` to fast-path `ILIKE` operations on customer name, phone, vehicle chassis, and registration plates via `gin_trgm_ops`.
4. **Conditional Indexes**: Partial indexes for fast access to operational queues, such as `idx_service_records_status` where `status = 'open'`.

## Access Patterns (RLS Policies Summary)

Role parsing uses custom functions:
- `get_user_role()` reads `auth.jwt() -> 'app_metadata' ->> 'role'`
- `get_user_tenant_id()` reads `auth.jwt() -> 'app_metadata' ->> 'tenant_id'`

| Table | Admin (`admin`) | Sales (`sales`) | Service (`service`) |
|-------|-----------------|-----------------|--------------------|
| `tenants` | SELECT (own) | None | None |
| Catalog (`types`, etc) | Full CRUD | SELECT | SELECT |
| `customers` | Full CRUD | Full CRUD | SELECT |
| `vehicles` | Full CRUD | Full CRUD | SELECT |
| Service Tables | Full CRUD | None | Full CRUD |
| `attachments` | Full CRUD | None | Full CRUD |
| `audit_logs` | INSERT | INSERT | INSERT |

*(Note: All access is strictly bounded by `tenant_id` matching in RLS).*

## Migrations Order
1. `20240001_user_profiles.sql`
2. `20240002_core_schema.sql` 
3. `20240003_indexes.sql`
4. `20240004_rls_policies.sql`
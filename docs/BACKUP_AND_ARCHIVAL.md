# Backup and Archival

## Database Backups
## R2 Data Archival
## Retention Policies

## Archival CPU Strategy
We employ a one-vehicle-per-invocation strategy to handle archival. This guarantees no sudden CPU spikes when processing backlogs. A KV cursor mechanism (`vlm-archival-cursor`) ensures the worker sequentially resumes right where it left off, advancing through tenants systematically.
- Expected throughput: 24 vehicles per day maximum.
- **Manual Reset**: Navigate to Cloudflare dashboard → Workers & Pages → KV → select namespace `vlm-archival-cursor` → delete the 'cursor' key to force a fresh cycle.

# PRECAUTIONS

This document outlines important operational and technical rules for the Vehicle Lifecycle Management (VLM) Platform. Please adhere to these guidelines to ensure data integrity and platform reliability.

## Authentication and accounts

- Only the system developer can create user accounts. There is no self-registration.
- Each user account has a role (Admin, Sales, or Service) that determines what they can see and do. Roles cannot be changed by the user.
- Shared accounts (multiple people using same login) are NOT recommended. If two people submit records from the same account simultaneously, one submission may fail or records may conflict. Each staff member should have their own account.
- Accounts are automatically signed out after 8 hours of inactivity. A 1-minute warning appears before this happens. Click "Stay signed in" to continue.
- If an account is no longer needed (staff member leaves), notify the system developer to deactivate it. Do not share the password with the replacement staff member — a new account should be created.

## Vehicle servicing rules

- Only one user should be viewing or editing a vehicle's service record at a time. The system does not prevent two users from opening the same record simultaneously, but submitting conflicting records will result in duplicate entries that must be manually corrected.
- If a vehicle's service history shows "Loading archived history", this means the vehicle has older records stored in the archive. This may take a few seconds to load. Do not refresh the page during this loading period.

## Offline usage

- The application can be used offline in limited capacity using the Chrome browser (non-private mode).
- When offline, you can VIEW vehicle and customer records that were previously loaded (cached).
- When offline, you can CREATE a new job card. It will be saved locally and automatically submitted when internet connection is restored.
- When offline, you CANNOT edit or update existing records. The edit buttons will be disabled with an explanation.
- Do not close the browser tab while offline if you have submitted a job card — wait for the sync confirmation.
- Data entered offline is stored in the browser only. If the browser cache is cleared before sync, the data will be lost permanently.

## Data and privacy

- Vehicle damage photos and service documents are stored securely in cloud storage. They are accessible only through the application.
- Do not share the application URL combined with any account credentials externally.
- All actions in the application are logged with the user account that performed them and the timestamp.

## Known system limitations

- The Supabase free tier may pause the database if the application is not accessed for more than 7 days (example: during a long public holiday). If the application shows a connection error after a long break, notify the system developer to restore the database.
- The free tier backup runs daily. In the event of data loss, data can be restored to the previous day's backup. Any data entered on the day of the incident may be lost.
- Archived vehicle records (vehicles with no service for more than 24 months by default) take slightly longer to load when accessed. This is expected behavior.

## For the developer

- Cloudflare Pages and Cloudflare Workers manage environment variables SEPARATELY. Changing a variable in Pages does NOT update it in Workers. Always update both when rotating keys.
- Supabase free tier pauses after 7 days of inactivity. A keep-alive Worker runs every 4 days to prevent this. If the Worker is disabled or fails, the database may pause.
- R2 presigned URLs expire after 1 hour. The application regenerates them automatically if an image fails to load.
- The archive JSON files in R2 are versioned. Always check the schema_version field when reading archive files in code.
- RLS policies are the primary security layer for data isolation between tenants. Never disable RLS on any table even temporarily on the production database.
- The error_logs table records all application errors including the user session and URL. Check this table first when investigating a reported issue.

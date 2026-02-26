# Authorization Verification

This document describes how to verify the Pro Trips authorization fixes.

## Prerequisites

1.  A Supabase project.
2.  `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or `VITE_SUPABASE_ANON_KEY`) available in your environment variables or `.env` file.

## Steps

1.  **Apply Migration**:
    Run the SQL migration file `supabase/migrations/20260225000000_audit_pro_trips_authorization.sql` against your database.
    You can do this via the Supabase Dashboard SQL Editor or using the Supabase CLI:
    ```bash
    npx supabase db push
    # OR
    npx supabase migration up
    ```

2.  **Run Verification Script**:
    Execute the verification script located at `scripts/verify_auth.ts`.
    This script creates temporary users and trips to test the authorization logic.

    ```bash
    # Install dependencies if needed
    npm install

    # Run the script
    npx tsx scripts/verify_auth.ts
    ```

## Expected Output

The script should output the following:

-   `Test Case A: Consumer Trip - Member creates Event (Expect SUCCESS)` -> PASSED
-   `Test Case B: Pro Trip - Member creates Event (Expect FAILURE)` -> PASSED
-   `Test Case C: Pro Trip - Admin creates Event (Expect SUCCESS)` -> PASSED
-   `Test Case D: Role Escalation - Member tries to update own role (Expect FAILURE)` -> PASSED
-   `Test Case E: IDOR - Non-member tries to create event (Expect FAILURE)` -> PASSED

If any test fails, ensure the migration was applied correctly and that no conflicting RLS policies exist.

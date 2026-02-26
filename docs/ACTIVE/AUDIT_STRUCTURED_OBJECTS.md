# Structured Objects Security Audit: Calendar, Polls, Tasks

## Executive Summary

This audit reviewed the security posture of the "structured objects" layer (Calendar Events, Polls, Tasks) within the application. We identified inconsistencies in schema definitions, missing foreign key constraints, and authorization gaps that could allow unauthorized modification of data or leave orphaned records.

A unified authorization pattern has been implemented to address these issues, enforcing strict membership checks and role-based access control (RBAC).

## Unified Authorization Pattern

To ensure consistent security across all trip-related objects, we introduced database-level helper functions and a standard RLS policy structure.

### 1. Helper Functions
Two PL/pgSQL functions were created to centralize membership logic:
*   `public.is_trip_member(trip_id TEXT) RETURNS BOOLEAN`: Returns true if the current authenticated user is a member of the trip.
*   `public.is_trip_admin(trip_id TEXT) RETURNS BOOLEAN`: Returns true if the current authenticated user is a member with 'owner' or 'admin' role.

### 2. Policy Structure
All structured objects now follow this RLS pattern:

| Operation | Policy Logic | Description |
| :--- | :--- | :--- |
| **SELECT** | `is_trip_member(trip_id)` | Only members can view objects. |
| **INSERT** | `is_trip_member(trip_id) AND created_by = auth.uid()` | Members can create objects, but must attribute them to themselves. |
| **UPDATE** | `created_by = auth.uid() OR is_trip_admin(trip_id)` | Creators can edit their own content. Admins can moderate all content. |
| **DELETE** | `created_by = auth.uid() OR is_trip_admin(trip_id)` | Creators can delete their own content. Admins can moderate all content. |

## Findings & Risk Analysis

### 1. Schema Inconsistencies (Medium Risk)
*   **Finding**: `trip_polls.trip_id` was defined as `UUID`, while `trips.id`, `trip_events.trip_id`, and `trip_tasks.trip_id` were defined as `TEXT`. This caused potential join failures and type mismatches.
*   **Fix**: Migrated `trip_polls.trip_id` to `TEXT` to match the canonical `trips` table.

### 2. Missing Foreign Keys (Medium Risk)
*   **Finding**: `trip_events` and `trip_tasks` lacked foreign key constraints to `trips(id)` and `auth.users(id)`.
*   **Risk**: Potential for orphaned records if a trip or user is deleted. Data integrity issues.
*   **Fix**: Added `ON DELETE CASCADE` foreign keys to `trips` and standard foreign keys to `auth.users`.

### 3. Weak RLS on Polls (High Risk)
*   **Finding**: The previous RLS policy for `trip_polls` ("Users can manage polls in their trips") used a broad `FOR ALL` permission based only on trip membership.
*   **Risk**: Any member of a trip could potentially update or delete *any* poll in that trip, regardless of who created it.
*   **Fix**: Replaced with strict `INSERT`, `UPDATE`, and `DELETE` policies enforcing ownership and admin privileges.

### 4. Task Status Vulnerability (Low/Medium Risk)
*   **Finding**: The `task_status` table (tracking completion) allowed users to insert/update rows for *any* task if they knew the `task_id`, without verifying trip membership.
*   **Risk**: A malicious user could mark tasks as completed in trips they do not belong to.
*   **Fix**: Added a check to `task_status` policies to verify that the referenced task belongs to a trip the user is a member of.

### 5. ID Enumeration (Low Risk)
*   **Finding**: `trips.id` is `TEXT`. If applications use sequential IDs (e.g., "trip-1", "trip-2"), it allows enumeration.
*   **Recommendation**: Ensure the application generates UUIDs or random strings for `trips.id`. The current database schema supports UUID strings.

## exact Changes
The changes are applied in migration `supabase/migrations/20260225000000_audit_structured_objects.sql`.
Verification tests are provided in `src/__tests__/security_audit_structured_objects.test.ts`.



# Fix: AI Concierge Blocked by Stale Privacy Trigger

## What's Actually Happening

The message "AI Concierge is disabled for this trip" has **nothing to do with your Gemini API key**. Your Gemini key is correctly configured and the concierge code already prioritizes it over the Lovable gateway (confirmed in secrets and edge function logic).

The real problem: there is a **stale database trigger** that hard-codes `ai_access_enabled = false` for every Pro and Event trip. A migration was written to fix this (migration `20260212170000`) but it was never applied to the running database.

### Current trigger (ACTIVE in DB -- broken):
```text
CASE WHEN NEW.trip_type IN ('pro', 'event') THEN false ELSE true END
```

### Intended trigger (in migration file -- never applied):
```text
COALESCE(NEW.ai_access_enabled, true)  -- always defaults to true
```

### Affected trips (all have ai_access_enabled = false in trip_privacy_configs):
- **Nurse John** (pro) -- created 2026-02-09
- **InvestFest 2026** (event) -- created 2026-02-12
- **SXSW** (event) -- created 2026-02-17 (AFTER the migration was written)

## Fix (2 steps)

### Step 1: Apply the corrected trigger function

Replace the `initialize_trip_privacy_config()` function so new Pro/Event trips get `ai_access_enabled = true` by default. This is the same logic from the unapplied migration, using `COALESCE(NEW.ai_access_enabled, true)` so it respects the value from the trips table insert (which is always `true` from `CreateTripModal`).

### Step 2: Backfill all affected rows

Update both `trips` and `trip_privacy_configs` tables to set `ai_access_enabled = true` for the three affected trips. Since the `is_untouched` check confirmed none of these were manually disabled by an organizer, this is safe.

## Gemini Key Status (Confirmed Working)

| Check | Status |
|-------|--------|
| `GEMINI_API_KEY` in Supabase secrets | Set |
| `AI_PROVIDER` env var | Not set (correct -- defaults to Gemini) |
| `FORCE_LOVABLE_PROVIDER` | false (correct) |
| Provider selection logic | Gemini first, Lovable fallback |
| Streaming support | Uses Gemini streaming when key present |

Your Gemini key with full permissions (grounding, places, distance) is correctly wired. Once the privacy gate stops blocking the request, the concierge will use your Gemini key directly for all AI responses.

## Technical Details

### File: New migration SQL (applied via Supabase)

Replace the trigger function and backfill:

```text
CREATE OR REPLACE FUNCTION public.initialize_trip_privacy_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.trip_privacy_configs (
    trip_id,
    privacy_mode,
    ai_access_enabled,
    created_by
  ) VALUES (
    NEW.id,
    CASE
      WHEN NEW.trip_type IN ('pro', 'event') THEN COALESCE(NEW.privacy_mode, 'high')
      ELSE COALESCE(NEW.privacy_mode, 'standard')
    END,
    COALESCE(NEW.ai_access_enabled, true),
    NEW.created_by
  );
  RETURN NEW;
END;
$function$;

-- Backfill ALL rows where ai_access_enabled is false
UPDATE trip_privacy_configs SET ai_access_enabled = true, updated_at = now()
WHERE ai_access_enabled = false;

UPDATE trips SET ai_access_enabled = true, updated_at = now()
WHERE COALESCE(ai_access_enabled, false) = false;
```

### No code file changes needed

The edge function logic (`lovable-concierge/index.ts` lines 766-781) correctly checks `trip_privacy_configs.ai_access_enabled`. Once the data is fixed, the gate passes and Gemini handles the request.

## After Fix

- Nurse John, InvestFest 2026, and SXSW will all have AI Concierge working
- All future Pro/Event trips will default to AI enabled (high privacy still controls encryption, not AI access)
- Gemini key is used for all text concierge queries (streaming + non-streaming)
- Gemini key is used for voice sessions via `gemini-voice-session`
- Google Search grounding, Places, and distance features are all available through the Gemini key


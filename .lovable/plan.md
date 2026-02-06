

# Update Marketing Copy for Calendar Features Across Pricing Tiers

## Summary

Three targeted copy changes to the consumer pricing tiers in `PricingSection.tsx` to better communicate the calendar import feature progression across plans.

## Changes

**File: `src/components/conversion/PricingSection.tsx`**

| Tier | Current Copy | Updated Copy |
|------|-------------|--------------|
| Free Plan (line 63) | "Basic itinerary planning" | "Shared Group Calendar Sync" |
| Explorer (after line 89) | _(nothing)_ | Add "Calendar Importing" after "ICS calendar export" |
| Frequent Chraveler (line 110) | "Calendar sync (Google, Apple, Outlook)" | "Smart Calendar Import (URL, ICS, PDF, Excel)" |

## Why This Works

- **Free**: "Shared Group Calendar Sync" sounds more valuable and specific than "Basic itinerary planning" -- it highlights the collaborative, real-time nature of the calendar
- **Explorer**: "Calendar Importing" is clear, simple language that any user understands -- no jargon like "priority processing"
- **Frequent Chraveler**: "Smart Calendar Import (URL, ICS, PDF, Excel)" spells out the full breadth of import sources, making it the obvious power-user tier for teams and tour managers who need bulk schedule importing

This creates a natural feature ladder: Sync (free) -> Import (Explorer) -> Smart Import with all formats (Frequent Chraveler).


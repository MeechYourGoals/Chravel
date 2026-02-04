

# Update SMS Branding: [Chravel] → [ChravelApp] + Professional URLs

## Overview

Update all SMS notification templates to use the **ChravelApp** brand name and the production domain **chravel.app** instead of the Lovable preview URL.

---

## Changes Required

### File 1: `supabase/functions/_shared/smsTemplates.ts`

**URL Update:**
- Line 8: Change `https://chravel.lovable.app` → `https://chravel.app`

**Branding Updates (all [Chravel] → [ChravelApp]):**
- Line 58: Basecamp update message
- Line 63: Join request message  
- Line 71: Payment request message
- Line 77: Broadcast message
- Line 84: Calendar event message
- Line 90: Generic fallback message
- Line 5: Update documentation comment

### File 2: `supabase/functions/push-notifications/index.ts`

**Branding Update:**
- Line 239: Update fallback SMS message from `[Chravel]` to `[ChravelApp]`

---

## Updated Templates

| Scenario | New Template |
|----------|-------------|
| Basecamp Update | `[ChravelApp] 📍 Basecamp changed for {trip}: {location}. View: https://chravel.app/trip/{id}/places` |
| Join Request | `[ChravelApp] 👤 {name} wants to join {trip}. Review: https://chravel.app/trip/{id}/members` |
| Payment Request | `[ChravelApp] 💰 {name} requested ${amount} for {trip}. Pay: https://chravel.app/trip/{id}/payments` |
| Urgent Broadcast | `[ChravelApp] 🚨 {trip}: {preview} https://chravel.app/trip/{id}/chat` |
| Calendar Reminder | `[ChravelApp] 🗓️ {event} at {time} in {trip}. Details: https://chravel.app/trip/{id}/calendar` |

---

## Already Using Professional Branding (No Changes Needed)

These components are already configured correctly:
- Invite links use `https://p.chravel.app/j/`
- Trip share links use `https://p.chravel.app/t/`
- Universal link handling configured for `chravel.app`
- Push notification subject uses `notifications@chravel.app`

---

## Deployment

After the code changes, the edge functions will be automatically redeployed. No manual steps required.


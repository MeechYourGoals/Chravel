
# PDF Recap Export Fixes

## Issues to Fix

| Issue | Current State | Fix Required |
|-------|---------------|--------------|
| Broadcasts missing from PDF | Query selects non-existent `read_rate` column; doesn't fetch sender name | Fix query to join `profiles` for sender; remove `read_rate` |
| Broadcasts restricted to Pro only | Both `data.ts` and `template.ts` check `layout === 'pro'` | Remove layout restriction - broadcasts work for all trips |
| Section order not alphabetical | calendar, payments, polls, places, attachments, tasks, broadcasts, roster | Alphabetical: attachments, broadcasts, calendar, payments, places, polls, roster, tasks |
| "Roster" should say "Trip Members" | PDF says "Roster & Contacts" for all trip types | Change to "Trip Members" universally |
| Empty sections look bland | No section wrapper when section is empty | Always render section wrapper with "No X available" message in proper styled container |

---

## File Changes

### 1. Fix Section Order (`src/utils/exportSectionOrder.ts`)

**Change:** Reorder to alphabetical
```typescript
export const DEFAULT_EXPORT_SECTION_ORDER: ExportSection[] = [
  'attachments',
  'broadcasts',
  'calendar', 
  'payments',
  'places',
  'polls',
  'roster',
  'tasks',
];
```

---

### 2. Fix Broadcast Data Fetching (`supabase/functions/export-trip/data.ts`)

**Changes:**
1. Remove `layout === 'pro'` check on broadcasts (line 95)
2. Remove `layout === 'pro'` check on roster (line 62) - all trips can have members
3. Update `fetchBroadcasts` to:
   - Join `profiles` to get sender name via `created_by`
   - Remove invalid `read_rate` column selection
   - Add sender name to output

**Updated query:**
```typescript
async function fetchBroadcasts(supabase: SupabaseClient, tripId: string) {
  const { data: broadcasts } = await supabase
    .from('broadcasts')
    .select(`
      id, 
      created_at, 
      priority, 
      message,
      sender:profiles!created_by(display_name)
    `)
    .eq('trip_id', tripId)
    .eq('is_sent', true)
    .order('created_at', { ascending: false });

  return (broadcasts || []).map(b => ({
    sender: b.sender?.display_name || 'Unknown',
    ts: formatDateTime(b.created_at),
    priority: mapPriority(b.priority),
    message: b.message || '',
  }));
}
```

---

### 3. Update BroadcastItem Type (`supabase/functions/export-trip/types.ts`)

**Change:** Add sender, remove readRate
```typescript
export interface BroadcastItem {
  sender: string;        // NEW - who sent it
  ts: string;
  priority?: 'Low' | 'Normal' | 'High';
  message: string;
  // Removed: readRate (doesn't exist in DB)
}
```

---

### 4. Fix Template Rendering (`supabase/functions/export-trip/template.ts`)

**Changes:**

#### 4a. Remove layout restrictions (line 62, 68)
```typescript
// Before
${roster && roster.length > 0 && layout === 'pro' ? renderRoster(roster) : ''}
${broadcasts && broadcasts.length > 0 && layout === 'pro' ? renderBroadcasts(broadcasts) : ''}

// After
${renderMembersSection(roster, layout)}
${renderBroadcastsSection(broadcasts)}
```

#### 4b. Rename "Roster & Contacts" to "Trip Members"
```typescript
function renderMembersSection(roster: any[], layout: ExportLayout): string {
  return `
  <section class="section">
    <h2>Trip Members</h2>
    ${roster && roster.length > 0 ? `
      <table class="table">...</table>
    ` : `<p class="empty-message">No members available</p>`}
  </section>`;
}
```

#### 4c. Update broadcasts table with sender column
```typescript
function renderBroadcastsSection(broadcasts: any[]): string {
  return `
  <section class="section">
    <h2>Broadcasts</h2>
    ${broadcasts && broadcasts.length > 0 ? `
      <table class="table">
        <thead>
          <tr>
            <th>From</th>
            <th>Message</th>
            <th>Date & Time</th>
          </tr>
        </thead>
        <tbody>
          ${broadcasts.map(b => `
            <tr>
              <td>${escapeHtml(b.sender)}</td>
              <td>${escapeHtml(b.message)}</td>
              <td>${escapeHtml(b.ts)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : `<p class="empty-message">No broadcasts available</p>`}
  </section>`;
}
```

---

### 5. Add Empty Section Styling

**Changes to all render functions:**
- Always render the section wrapper with `<h2>` header
- Show styled "No X available" message when data is empty
- Maintains visual consistency with blue/gray header styling

**Pattern for all sections:**
```typescript
function renderCalendarSection(calendar: any[]): string {
  return `
  <section class="section">
    <h2>Calendar</h2>
    ${calendar && calendar.length > 0 ? `
      // ... existing calendar content ...
    ` : `<p class="empty-message">No calendar events available</p>`}
  </section>`;
}
```

---

### 6. Add Empty Message Style (`supabase/functions/export-trip/styles.css`)

```css
.empty-message {
  font-size: 10pt;
  color: var(--muted);
  font-style: italic;
  padding: 12pt 0;
  text-align: center;
  background: #FAFAFB;
  border-radius: 4pt;
  margin: 8pt 0;
}
```

---

## Summary of Files Modified

| File | Changes |
|------|---------|
| `src/utils/exportSectionOrder.ts` | Reorder to alphabetical |
| `supabase/functions/export-trip/types.ts` | Add `sender` field, remove `readRate` |
| `supabase/functions/export-trip/data.ts` | Fix broadcast query, remove layout restrictions |
| `supabase/functions/export-trip/template.ts` | Rename roster to "Trip Members", always show section headers, add sender to broadcasts |
| `supabase/functions/export-trip/styles.css` | Add `.empty-message` styling |

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Section order change | None | Pure cosmetic, no logic change |
| Broadcast query fix | Low | Adding fields that exist; removing invalid column |
| Remove layout restrictions | Low | Makes features available to more users, no breaking change |
| Template label changes | None | Pure text change |
| Empty section styling | None | Additive CSS, doesn't break existing styles |

---

## Verification Steps

After implementation:
1. Create a test Pro trip with broadcasts
2. Export with "Broadcast Log" selected → verify broadcasts appear with sender names
3. Export an empty Pro trip → verify sections show styled headers with "No X available"
4. Export a regular consumer trip with roster selected → verify shows "Trip Members" header
5. Verify alphabetical section ordering: Attachments → Broadcasts → Calendar → Payments → Places → Polls → Roster (Trip Members) → Tasks

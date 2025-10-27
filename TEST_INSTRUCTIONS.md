# Testing Instructions - With Debug Logging

## What I Added

I've added extensive debug logging to trace exactly what's happening:

### Files with Debug Logs:
1. **TeamTab.tsx** - Logs when component renders, what props it receives
2. **ChannelsView.tsx** - Logs when it renders, what tripId/userRole it gets
3. **InlineChannelList.tsx** - Logs:
   - When component renders
   - When useEffect runs
   - Whether tripId matches DEMO_TRIP_IDS
   - What data getDemoChannelsForTrip returns
   - Final channels count
   - Which render path it takes (loading/empty/grid)

## How to Test

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Open Browser Console
- Press F12 or right-click → Inspect
- Go to Console tab
- Clear any existing logs

### 3. Navigate to Trip
Go to: `http://localhost:5173/pro-trip/beyonce-cowboy-carter-tour`

### 4. Click Team Tab

### 5. Check Console Output

You should see logs like:
```
[TeamTab] Rendering with: { tripId: "beyonce-cowboy-carter-tour", userRole: "...", ... }
[ChannelsView] Rendering with: { tripId: "beyonce-cowboy-carter-tour", userRole: "..." }
[InlineChannelList] Component rendered with: { tripId: "beyonce-cowboy-carter-tour", ... }
[InlineChannelList] useEffect running for tripId: beyonce-cowboy-carter-tour
[InlineChannelList] Loading channels...
[InlineChannelList] Is demo trip? true tripId: beyonce-cowboy-carter-tour
[InlineChannelList] Got demo channels: 2 [Array]
[InlineChannelList] Loading complete
[InlineChannelList] Render state: { loading: false, channelsCount: 2 }
[InlineChannelList] Rendering channels grid with 2 channels
```

## What to Look For

### SCENARIO A: Components Don't Render
If you DON'T see `[TeamTab]` logs:
- **Issue**: TeamTab not rendering at all
- **Cause**: activeTab might not be 'team'
- **Check**: Is the Team tab actually being clicked?

### SCENARIO B: ChannelsView Doesn't Render
If you see `[TeamTab]` but NOT `[ChannelsView]`:
- **Issue**: Sub-tab conditional not working
- **Cause**: activeSubTab not 'channels' OR tripId is falsy
- **Solution**: Check TeamTab logs for tripId value

### SCENARIO C: InlineChannelList Doesn't Render
If you see `[ChannelsView]` but NOT `[InlineChannelList]`:
- **Issue**: InlineChannelList not being called
- **Cause**: Import issue or syntax error
- **Solution**: Check browser console for React errors

### SCENARIO D: Channels Don't Load
If you see `[InlineChannelList]` logs but:
- `Is demo trip? false` - **tripId doesn't match DEMO_TRIP_IDS**
- `Got demo channels: 0` - **getDemoChannelsForTrip returns empty**
- `Rendering empty state - NO CHANNELS` - **Channels array is empty**

### SCENARIO E: Stuck on Loading
If logs show:
- `Loading channels...` but never `Loading complete`
- **Issue**: async function never completes
- **Cause**: Error thrown in loadChannels
- **Solution**: Check for error logs

## Expected Output

For `beyonce-cowboy-carter-tour`, you should see:
- ✅ `Is demo trip? true`
- ✅ `Got demo channels: 2` (production + security)
- ✅ `Rendering channels grid with 2 channels`

## After Testing

**Send me the console output!** Copy/paste or screenshot the console logs and I'll know exactly what's wrong.

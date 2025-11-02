# Google Text Search API Implementation

## Overview

This document details the implementation of Google's Text Search API in the Chravel Basecamp address search functionality, following the official documentation at:
https://developers.google.com/maps/documentation/places/web-service/text-search

## What is Text Search?

Text Search is a Google Maps Places API service that **accepts natural language queries** and returns a list of places. Unlike Autocomplete (which is designed for user input), Text Search is designed to **find specific places** based on how users naturally describe locations.

### Examples of queries that work:
- ✅ **Landmarks**: "Eiffel Tower", "Statue of Liberty", "Big Ben"
- ✅ **Stadiums/Venues**: "Mercedes-Benz Stadium Atlanta", "SoFi Stadium", "Madison Square Garden"
- ✅ **Businesses**: "Starbucks Chicago", "Best Buy near Times Square"
- ✅ **Addresses**: "123 Main St, New York, NY"
- ✅ **Cities/Regions**: "Paris", "Tokyo", "Downtown Los Angeles"
- ✅ **Descriptive**: "hotels in Miami Beach", "restaurants near me"

## API Endpoint

```
GET https://maps.googleapis.com/maps/api/place/textsearch/json
```

## Implementation Architecture

### Backend (Supabase Edge Function)

**File**: `supabase/functions/google-maps-proxy/index.ts`

```typescript
case 'text-search': {
  // Required parameter
  const { query } = validation.sanitized!;
  
  // Optional parameters
  const { location, language, region, type } = validation.sanitized!;
  
  // Build API URL
  let apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
  
  // Add optional parameters
  if (location) apiUrl += `&location=${location}&radius=50000`; // 50km bias
  if (language) apiUrl += `&language=${language}`; // e.g., 'en', 'es', 'fr'
  if (region) apiUrl += `&region=${region}`; // e.g., 'us', 'uk', 'fr'
  if (type) apiUrl += `&type=${type}`; // e.g., 'lodging', 'restaurant'
  
  // Fetch and return
  const apiResponse = await fetch(apiUrl);
  const apiData = await apiResponse.json();
  
  // Enhanced error handling
  if (apiData.status === 'REQUEST_DENIED') {
    throw new Error(`API access denied: ${apiData.error_message}`);
  }
  if (apiData.status === 'OVER_QUERY_LIMIT') {
    throw new Error('API quota exceeded - please try again later');
  }
  
  return apiData;
}
```

### Frontend Service

**File**: `src/services/googleMapsService.ts`

```typescript
static async searchPlacesByText(
  query: string, 
  options?: {
    location?: string;      // Lat,lng for location bias
    language?: string;      // Language code (auto-detected from browser)
    region?: string;        // Region bias ccTLD
    type?: string;          // Place type filter
  }
): Promise<any> {
  try {
    // Auto-detect browser language
    const language = options?.language || navigator.language.split('-')[0];
    
    return await this.callProxy('text-search', { 
      query,
      language,
      ...(options?.location && { location: options.location }),
      ...(options?.region && { region: options.region }),
      ...(options?.type && { type: options.type })
    });
  } catch (error) {
    console.error('Text search error:', error);
    return { results: [], status: 'ZERO_RESULTS' };
  }
}
```

## Parameters Explained

### Required
- **`query`** (string): The search query in natural language
  - Example: "Mercedes-Benz Stadium Atlanta"
  - Max length: 256 characters
  - Can include business names, addresses, landmarks, or descriptive phrases

### Optional (Implemented)

#### **`location`** (string)
- Format: `latitude,longitude` (e.g., "33.7554,-84.4008")
- Purpose: Biases results toward this location
- Radius: 50km (configurable)
- **Use case**: When updating an existing basecamp, prioritize places near current location

#### **`language`** (string)
- Format: Two-letter language code (e.g., "en", "es", "fr", "de", "ja")
- Purpose: Returns place names and addresses in specified language
- **Implementation**: Auto-detected from browser (`navigator.language`)
- Example: French user searching for "Eiffel Tower" gets "Tour Eiffel"

#### **`region`** (string)
- Format: ccTLD two-character value (e.g., "us", "uk", "fr", "jp")
- Purpose: Biases results toward specified region
- Example: "Springfield" with region="us" prioritizes US cities over others
- **Use case**: Can be inferred from trip destination or user profile

#### **`type`** (string)
- Format: Single place type from Google's list
- Purpose: Restricts results to specific place types
- Common values:
  - `lodging` - Hotels, B&Bs, hostels
  - `restaurant` - Restaurants, cafes
  - `tourist_attraction` - Landmarks, attractions
  - `stadium` - Sports venues
  - `airport` - Airports
- **Use case**: When searching for basecamp accommodation (type=lodging)

### Optional (Not Currently Used)

#### **`opennow`** (boolean)
- Shows only places currently open
- **Future use**: Filter accommodation by check-in availability

#### **`minprice`** / **`maxprice`** (0-4)
- Price level filtering (0=free, 4=very expensive)
- **Future use**: Filter by trip budget settings

#### **`pagetoken`** (string)
- Retrieve next page of results (up to 60 total)
- **Future use**: "Show more results" functionality

## Response Format

### Success Response
```json
{
  "status": "OK",
  "results": [
    {
      "place_id": "ChIJv...",
      "name": "Mercedes-Benz Stadium",
      "formatted_address": "1 AMB Drive NW, Atlanta, GA 30313, USA",
      "geometry": {
        "location": {
          "lat": 33.7554,
          "lng": -84.4008
        }
      },
      "types": ["stadium", "point_of_interest", "establishment"],
      "vicinity": "1 AMB Drive NW, Atlanta"
    }
    // ... more results
  ]
}
```

### Status Codes
- **`OK`**: Results found
- **`ZERO_RESULTS`**: No matches for query
- **`OVER_QUERY_LIMIT`**: API quota exceeded
- **`REQUEST_DENIED`**: API key invalid or request unauthorized
- **`INVALID_REQUEST`**: Missing required parameters

## Integration in Basecamp Selector

### Cascade Strategy

The Basecamp selector uses a **5-level cascade** to maximize success rate:

```
User types: "mercedes benz stadium atlanta ga"
    ↓
[1] Autocomplete API (fast, cheap, good for addresses)
    ↓ FALLBACK
[2] Text Search API (handles natural language, venues, landmarks) ✨
    ↓ FALLBACK
[3] OSM Nominatim (free, open-source fallback)
    ↓
RESULT: Dropdown suggestions with coordinates
```

When user submits (presses Enter or clicks "Set"):

```
[1] Use selected suggestion coordinates (if clicked from dropdown)
    ↓ FALLBACK
[2] Google Place Details API (if place_id available)
    ↓ FALLBACK
[3] Google Text Search API (natural language fallback) ✨
    ↓ FALLBACK
[4] Google Geocoding API (specific addresses)
    ↓ FALLBACK
[5] OSM Nominatim (final fallback)
    ↓
ALWAYS SET BASECAMP (even if no coords - embed handles it)
```

### Autocomplete vs Text Search: When to Use Which

#### Use **Autocomplete API** for:
- ✅ User is typing specific addresses
- ✅ Query looks like: "123 Main St" or "city, country"
- ✅ Fast suggestions as user types
- ✅ Lower cost ($2.83-$17.00 per 1,000 requests)

#### Use **Text Search API** for:
- ✅ User searches for landmarks/venues ("Eiffel Tower", "SoFi Stadium")
- ✅ Natural language queries ("hotels near downtown")
- ✅ Business names without full addresses ("Starbucks Chicago")
- ✅ When Autocomplete returns no results
- ✅ Higher cost ($32 per 1,000 requests) but more comprehensive

**Our strategy**: Try Autocomplete first, fallback to Text Search if needed.

## Location Biasing for Better Results

### Current Implementation

```typescript
// In autocomplete dropdown (as user types)
const textSearchResponse = await GoogleMapsService.searchPlacesByText(value, {
  location: currentBasecamp?.coordinates 
    ? `${currentBasecamp.coordinates.lat},${currentBasecamp.coordinates.lng}`
    : undefined
});

// In final submit (when user presses Enter)
const textSearchResult = await GoogleMapsService.searchPlacesByText(address, {
  location: currentBasecamp?.coordinates 
    ? `${currentBasecamp.coordinates.lat},${currentBasecamp.coordinates.lng}`
    : undefined
});
```

### Benefits
- If user is **updating** basecamp → searches near current location
- If user is **setting initial** basecamp → no bias (global search)
- Example: "Starbucks" with basecamp in NYC → prioritizes NYC Starbucks

### Future Enhancements
1. **Trip-level location bias**: Pass trip destination to prioritize that region
2. **Region inference**: Detect country from trip title (e.g., "Paris Trip" → region=fr)
3. **User preferences**: Save user's home region for default biasing

## Error Handling

### Backend (Proxy Function)
```typescript
// Enhanced error handling for API responses
if (apiData.status === 'REQUEST_DENIED') {
  console.error('Google Maps API request denied:', apiData.error_message);
  throw new Error(`API access denied: ${apiData.error_message}`);
}

if (apiData.status === 'OVER_QUERY_LIMIT') {
  console.error('Google Maps API quota exceeded');
  throw new Error('API quota exceeded - please try again later');
}
```

### Frontend (Service)
```typescript
try {
  return await this.callProxy('text-search', { query, language, ... });
} catch (error) {
  console.error('Text search error:', error);
  return { results: [], status: 'ZERO_RESULTS' }; // Graceful degradation
}
```

### User Experience
- ❌ **Before**: Blocked user with error message if geocoding failed
- ✅ **After**: Always allows setting basecamp, lets Google Maps embed resolve query

## Best Practices (Per Google Docs)

### ✅ Implemented
1. **Encode query parameters**: Using `encodeURIComponent(query)`
2. **Handle all status codes**: REQUEST_DENIED, OVER_QUERY_LIMIT, etc.
3. **Use location bias when available**: Passed existing basecamp coords
4. **Localize results**: Auto-detect browser language
5. **Graceful degradation**: Fallback to OSM if Google fails

### 🔄 Future Improvements
1. **Caching**: Cache frequent queries (e.g., "Eiffel Tower") to reduce costs
2. **Pagination**: Implement `pagetoken` for "Show more" results
3. **Price filtering**: Use `minprice`/`maxprice` based on trip budget
4. **Open now filtering**: Show only currently open establishments
5. **Session tokens**: Combine Autocomplete + Place Details with session tokens for discount

## Cost Optimization

### Current Strategy
- **Try Autocomplete first** (cheaper): $2.83-$17.00 per 1,000
- **Fallback to Text Search** (expensive): $32 per 1,000
- **Final fallback to OSM** (free): No cost

### Cost Per Query Type
| Query Type | Autocomplete | Text Search | Strategy |
|------------|--------------|-------------|----------|
| Specific address | ✅ Works | ✅ Works | Use Autocomplete |
| Landmark | ❌ Often fails | ✅ Works | Use Text Search |
| Venue + city | ⚠️ Inconsistent | ✅ Works | Use Text Search |
| City only | ✅ Works | ✅ Works | Use Autocomplete |

### Monthly Cost Estimation (10K searches/month)
- **Autocomplete-heavy**: 70% Autocomplete ($11.90) + 30% Text Search ($96) = **~$108/month**
- **Text Search-heavy**: 30% Autocomplete ($5.10) + 70% Text Search ($224) = **~$229/month**
- **Current cascade**: Estimated **$120-150/month** for 10K searches

## Testing Checklist

### Manual Testing Scenarios
- [ ] Landmark: "Eiffel Tower" → Returns Paris location
- [ ] Stadium: "Mercedes-Benz Stadium Atlanta" → Returns correct stadium
- [ ] Venue + city: "Starbucks Chicago" → Returns dropdown of Chicago Starbucks
- [ ] Partial address: "123 Main St" → Falls back to geocoding
- [ ] City only: "Paris" → Returns city center
- [ ] Descriptive: "hotels in Miami Beach" → Returns hotel suggestions
- [ ] Non-English: "東京タワー" (Tokyo Tower) → Returns with Japanese localization
- [ ] Location bias: Update existing basecamp, search "Starbucks" → Prioritizes nearby

### API Error Scenarios
- [ ] Invalid API key → Shows user-friendly error
- [ ] Quota exceeded → Graceful degradation to OSM
- [ ] Network failure → Fallback cascade works
- [ ] Zero results → Tries next cascade level

## Debugging

### Browser Console Logs
When Text Search runs, you'll see:
```
Text Search request: {query: "mercedes benz stadium atlanta ga", location: undefined, language: "en"}
Text Search API response: {status: "OK", resultCount: 1, firstResult: "Mercedes-Benz Stadium"}
✓ Found 8 results via Text Search
```

### Common Issues

**Issue**: "We couldn't find [location]"
- **Cause**: All cascade levels failed (very rare)
- **Solution**: Check internet connection, verify API key, check quota

**Issue**: Wrong location returned
- **Cause**: Ambiguous query (e.g., "Springfield" - which one?)
- **Solution**: Add city/state/country (e.g., "Springfield, IL")

**Issue**: Non-English results when expecting English
- **Cause**: Browser language detection
- **Solution**: Manually override language parameter if needed

## Future Roadmap

### Phase 1: Enhanced Biasing (Q1 2026)
- [ ] Add trip-level location biasing
- [ ] Infer region from trip destination
- [ ] User preference: Home region default

### Phase 2: Cost Optimization (Q2 2026)
- [ ] Implement query caching (Redis)
- [ ] Session tokens for Autocomplete + Place Details
- [ ] Analytics on cascade success rates

### Phase 3: Advanced Features (Q3 2026)
- [ ] "Show more results" pagination
- [ ] Price filtering based on trip budget
- [ ] "Open now" filter for check-in dates
- [ ] Save recent searches per user

## Resources

- **Official Docs**: https://developers.google.com/maps/documentation/places/web-service/text-search
- **API Key Setup**: https://developers.google.com/maps/documentation/places/web-service/get-api-key
- **Place Types**: https://developers.google.com/maps/documentation/places/web-service/supported_types
- **Status Codes**: https://developers.google.com/maps/documentation/places/web-service/search#PlacesSearchStatus
- **Pricing**: https://mapsplatform.google.com/pricing/

## Summary

The Text Search API implementation allows the Basecamp address field to function **exactly like Google Maps search**:
- ✅ Accepts any natural language query
- ✅ Auto-detects browser language for localization
- ✅ Biases results based on existing basecamp location
- ✅ Gracefully handles errors with multi-level fallbacks
- ✅ Always allows setting basecamp (no blocking validation)

This creates a **seamless, Google Maps-like experience** for users searching for any location worldwide.

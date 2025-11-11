# ADR 003: Google Maps over Mapbox

**Status:** Accepted  
**Date:** 2024-11-01  
**Deciders:** Engineering Team

## Context

Chravel needed mapping and location services for:
- Interactive trip maps
- Place search and autocomplete
- Directions and routing
- Location-based recommendations
- Geocoding

We evaluated Google Maps Platform and Mapbox.

## Decision

We chose **Google Maps Platform** over Mapbox.

## Rationale

### Advantages of Google Maps

1. **Places API**
   - Superior place data (Google's database is largest)
   - Better autocomplete suggestions
   - Rich place details (reviews, photos, hours)
   - Better for travel/tourism use cases

2. **Integration with Google Ecosystem**
   - Works seamlessly with Google accounts
   - Can leverage Google Travel data
   - Better integration with Google Calendar (for itineraries)

3. **Familiarity**
   - Users familiar with Google Maps UI
   - Consistent experience across platforms
   - Better user trust

4. **Comprehensive APIs**
   - Maps JavaScript API
   - Places API
   - Directions API
   - Geocoding API
   - Distance Matrix API
   - All in one platform

5. **Mobile SDKs**
   - Native iOS (MapKit) and Android SDKs
   - Better performance on mobile
   - Offline map support

### Trade-offs

**Disadvantages:**

1. **Cost**
   - More expensive than Mapbox at scale
   - Pay-per-use pricing can be unpredictable
   - **Mitigation:** Implement caching, rate limiting, quota monitoring

2. **Customization**
   - Less customizable styling than Mapbox
   - **Mitigation:** Use custom markers, overlays, and info windows

3. **Vendor Lock-in**
   - Harder to switch providers later
   - **Mitigation:** Abstract Maps API behind service layer

## Alternatives Considered

### Mapbox
- **Pros:** More customizable, better pricing at scale, open source
- **Cons:** Smaller place database, less familiar to users
- **Rejected because:** Google Places data is superior for travel use cases

### Leaflet + OpenStreetMap
- **Pros:** Free, open source, highly customizable
- **Cons:** No built-in place search, requires third-party geocoding
- **Rejected because:** Need comprehensive place data and search

## Consequences

### Positive
- ✅ Better place data and search results
- ✅ Familiar user experience
- ✅ Comprehensive API suite
- ✅ Good mobile SDK support

### Negative
- ⚠️ Higher costs (mitigated with caching)
- ⚠️ Less styling customization (acceptable trade-off)

### Neutral
- Both platforms provide excellent mapping capabilities
- Google Maps better for our specific use case (travel planning)

## Implementation Notes

- Use `@googlemaps/js-api-loader` for web
- Implement caching layer for Places API responses
- Use Edge Function proxy for rate limiting
- Monitor API usage and costs
- Consider MapKit (iOS) and Maps SDK (Android) for native apps

## References

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Google Maps Pricing](https://mapsplatform.google.com/pricing/)

---

**Last Updated:** 2025-01-31

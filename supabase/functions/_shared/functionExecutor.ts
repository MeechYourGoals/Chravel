import { withCircuitBreaker } from './circuitBreaker.ts';

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
const GOOGLE_CUSTOM_SEARCH_CX = Deno.env.get('GOOGLE_CUSTOM_SEARCH_CX');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// Resolve the Supabase functions base URL for building proxy URLs.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_FUNCTIONS_BASE_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : '/functions/v1';

function buildPlacePhotoProxyUrl(
  placePhotoName: string,
  maxWidthPx: number,
  maxHeightPx: number,
): string {
  const params = new URLSearchParams();
  params.set('placePhotoName', placePhotoName);
  params.set('maxWidthPx', String(maxWidthPx));
  params.set('maxHeightPx', String(maxHeightPx));
  return `${SUPABASE_FUNCTIONS_BASE_URL}/image-proxy?${params.toString()}`;
}

export interface LocationContext {
  lat?: number;
  lng?: number;
}

export async function executeFunctionCall(
  supabase: any,
  functionName: string,
  args: any,
  tripId: string,
  userId?: string,
  locationContext?: LocationContext | null,
): Promise<any> {
  const startMs = performance.now();
  let result: any;
  try {
    result = await _executeImpl(supabase, functionName, args, tripId, userId, locationContext);
    const elapsed = Math.round(performance.now() - startMs);
    const ok = !result?.error;
    console.log(
      `[Tool] ${functionName} | ${elapsed}ms | ${ok ? 'success' : 'error: ' + (result?.error ?? 'unknown')}`,
    );
    return result;
  } catch (err) {
    const elapsed = Math.round(performance.now() - startMs);
    console.error(
      `[Tool] ${functionName} | ${elapsed}ms | exception: ${err instanceof Error ? err.message : String(err)}`,
    );
    throw err;
  }
}

async function _executeImpl(
  supabase: any,
  functionName: string,
  args: any,
  tripId: string,
  userId?: string,
  locationContext?: LocationContext | null,
): Promise<any> {
  switch (functionName) {
    case 'addToCalendar': {
      const { title, datetime, location, notes } = args;
      const startTime = new Date(datetime).toISOString();
      const endTime = new Date(new Date(datetime).getTime() + 60 * 60 * 1000).toISOString();

      // B4: Route to pending buffer for user confirmation
      const { data: pending, error: pendingError } = await supabase
        .from('trip_pending_actions')
        .insert({
          trip_id: tripId,
          user_id: userId || '00000000-0000-0000-0000-000000000000',
          tool_name: 'addToCalendar',
          payload: {
            title,
            start_time: startTime,
            end_time: endTime,
            location: location || null,
            description: notes || null,
            created_by: userId || null,
          },
          source_type: 'ai_concierge',
        })
        .select('id')
        .single();

      if (pendingError) throw pendingError;
      return {
        success: true,
        pending: true,
        pendingActionId: pending.id,
        actionType: 'add_to_calendar',
        message: `I'd like to add "${title}" to the calendar. Please confirm in the trip chat.`,
      };
    }

    case 'createTask': {
      const { title, notes, dueDate, assignee } = args;
      const taskTitle = String(title || '').trim();
      if (!taskTitle) return { error: 'Task title is required' };

      // B4: Route to pending buffer for user confirmation
      const { data: pending, error: pendingError } = await supabase
        .from('trip_pending_actions')
        .insert({
          trip_id: tripId,
          user_id: userId || '00000000-0000-0000-0000-000000000000',
          tool_name: 'createTask',
          payload: {
            title: taskTitle,
            description: notes || null,
            creator_id: userId || '',
            due_at: dueDate || null,
          },
          source_type: 'ai_concierge',
        })
        .select('id')
        .single();

      if (pendingError) throw pendingError;
      return {
        success: true,
        pending: true,
        pendingActionId: pending.id,
        actionType: 'create_task',
        message: `I'd like to create a task: "${taskTitle}"${assignee ? ` for ${assignee}` : ''}. Please confirm in the trip chat.`,
      };
    }

    case 'createPoll': {
      const { question, options } = args;
      const pollOptions = options.map((opt: string, i: number) => ({
        id: `opt_${i}`,
        text: opt,
        votes: 0,
        voters: [],
      }));

      // B4: Route to pending buffer for user confirmation
      const { data: pending, error: pendingError } = await supabase
        .from('trip_pending_actions')
        .insert({
          trip_id: tripId,
          user_id: userId || '00000000-0000-0000-0000-000000000000',
          tool_name: 'createPoll',
          payload: {
            question,
            options: pollOptions,
            created_by: userId || null,
          },
          source_type: 'ai_concierge',
        })
        .select('id')
        .single();

      if (pendingError) throw pendingError;
      return {
        success: true,
        pending: true,
        pendingActionId: pending.id,
        actionType: 'create_poll',
        message: `I'd like to create a poll: "${question}" with ${options.length} options. Please confirm in the trip chat.`,
      };
    }

    case 'getPaymentSummary': {
      const { data: payments, error } = await supabase
        .from('trip_payment_messages')
        .select('id, amount, currency, description, created_by, split_count, created_at')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;

      const paymentIds = (payments || []).map((p: any) => p.id);
      let splits: any[] = [];
      if (paymentIds.length > 0) {
        const { data: splitData } = await supabase
          .from('payment_splits')
          .select('payment_message_id, debtor_user_id, amount_owed, is_settled')
          .in('payment_message_id', paymentIds);
        splits = splitData || [];
      }

      const totalSpent = (payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const unsettledSplits = splits.filter((s: any) => !s.is_settled);
      const totalOwed = unsettledSplits.reduce(
        (sum: number, s: any) => sum + (s.amount_owed || 0),
        0,
      );

      return {
        success: true,
        totalPayments: payments?.length || 0,
        totalSpent,
        totalOwed,
        unsettledCount: unsettledSplits.length,
        recentPayments: (payments || []).slice(0, 5).map((p: any) => ({
          description: p.description,
          amount: p.amount,
          currency: p.currency,
        })),
      };
    }

    case 'searchPlaces': {
      const { query, nearLat, nearLng } = args;
      if (!GOOGLE_MAPS_API_KEY) {
        return { error: 'Google Maps API key not configured' };
      }

      const parsedLat = Number(nearLat);
      const parsedLng = Number(nearLng);
      const lat = Number.isFinite(parsedLat) ? parsedLat : locationContext?.lat || null;
      const lng = Number.isFinite(parsedLng) ? parsedLng : locationContext?.lng || null;

      // New Google Places API (Places Text Search)
      const url = `https://places.googleapis.com/v1/places:searchText`;
      const placesResponse = await withCircuitBreaker('google-maps', () =>
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.photos',
          },
          body: JSON.stringify({
            textQuery: query,
            locationBias:
              lat !== null && lng !== null
                ? {
                    circle: { center: { latitude: lat, longitude: lng }, radius: 5000 },
                  }
                : undefined,
            maxResultCount: 3,
          }),
          signal: AbortSignal.timeout(8_000),
        }),
      );

      if (!placesResponse.ok) {
        const errorText = await placesResponse.text().catch(() => 'Unknown error');
        console.error(`[Tool] searchPlaces failed (${placesResponse.status}): ${errorText}`);
        return { error: 'Places search failed', status: placesResponse.status };
      }

      const placesData = await placesResponse.json();
      return {
        success: true,
        places: (placesData.places || []).map((p: any) => ({
          placeId: p.id || null,
          name: p.displayName?.text || 'Unknown',
          address: p.formattedAddress || '',
          rating: p.rating || null,
          userRatingCount: p.userRatingCount || null,
          priceLevel: p.priceLevel || null,
          mapsUrl: p.googleMapsUri || null,
          photoCount: p.photos?.length || 0,
          previewPhotoUrl: p.photos?.[0]?.name
            ? buildPlacePhotoProxyUrl(p.photos[0].name, 600, 400)
            : null,
        })),
      };
    }

    // ========== NEW TOOLS ==========

    case 'getDirectionsETA': {
      const { origin, destination, departureTime } = args;
      if (!GOOGLE_MAPS_API_KEY) {
        return { error: 'Google Maps API key not configured' };
      }

      const routesUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
      const body: any = {
        origin: { address: origin },
        destination: { address: destination },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      };
      if (departureTime) {
        body.departureTime = new Date(departureTime).toISOString();
      }

      const routesResponse = await withCircuitBreaker('google-maps', () =>
        fetch(routesUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.description',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        }),
      );

      if (!routesResponse.ok) {
        const errBody = await routesResponse.text();
        return { error: `Routes API failed (${routesResponse.status})`, details: errBody };
      }

      const routesData = await routesResponse.json();
      const route = routesData.routes?.[0];
      if (!route) {
        return { error: 'No route found between origin and destination' };
      }

      const durationSeconds = parseInt(route.duration?.replace('s', '') || '0', 10);
      const distanceMeters = route.distanceMeters || 0;

      const mapsDeepLink = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;

      return {
        success: true,
        durationMinutes: Math.round(durationSeconds / 60),
        distanceKm: Math.round(distanceMeters / 100) / 10,
        distanceMiles: Math.round((distanceMeters / 1609.34) * 10) / 10,
        summary: route.description || `${Math.round(durationSeconds / 60)} min drive`,
        origin,
        destination,
        mapsUrl: mapsDeepLink,
      };
    }

    case 'getTimezone': {
      const { lat, lng } = args;
      if (!GOOGLE_MAPS_API_KEY) {
        return { error: 'Google Maps API key not configured' };
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const tzUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${GOOGLE_MAPS_API_KEY}`;

      const tzResponse = await withCircuitBreaker('google-maps', () =>
        fetch(tzUrl, { signal: AbortSignal.timeout(8_000) }),
      );
      if (!tzResponse.ok) {
        return { error: `Time Zone API failed (${tzResponse.status})` };
      }

      const tzData = await tzResponse.json();
      if (tzData.status !== 'OK') {
        return {
          error: `Time Zone API error: ${tzData.status}`,
          errorMessage: tzData.errorMessage,
        };
      }

      return {
        success: true,
        timeZoneId: tzData.timeZoneId,
        timeZoneName: tzData.timeZoneName,
        utcOffsetMinutes: (tzData.rawOffset + tzData.dstOffset) / 60,
        rawOffsetMinutes: tzData.rawOffset / 60,
        dstOffsetMinutes: tzData.dstOffset / 60,
      };
    }

    case 'getPlaceDetails': {
      const { placeId } = args;
      if (!GOOGLE_MAPS_API_KEY) {
        return { error: 'Google Maps API key not configured' };
      }

      // New Google Places API (Place Details)
      const detailsUrl = `https://places.googleapis.com/v1/places/${placeId}`;
      const detailsResponse = await withCircuitBreaker('google-maps', () =>
        fetch(detailsUrl, {
          headers: {
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask':
              'id,displayName,formattedAddress,internationalPhoneNumber,websiteUri,googleMapsUri,rating,userRatingCount,priceLevel,currentOpeningHours,editorialSummary,photos',
          },
          signal: AbortSignal.timeout(8_000),
        }),
      );

      if (!detailsResponse.ok) {
        const errorText = await detailsResponse.text().catch(() => 'Unknown error');
        console.error(`[Tool] getPlaceDetails failed (${detailsResponse.status}): ${errorText}`);
        return { error: `Place Details failed (${detailsResponse.status})` };
      }

      const pd = await detailsResponse.json();

      // Build photo URLs (first 5)
      const photoUrls = (pd.photos || [])
        .slice(0, 5)
        .map((photo: any) => (photo.name ? buildPlacePhotoProxyUrl(photo.name, 600, 400) : null))
        .filter(Boolean);

      return {
        success: true,
        placeId: pd.id,
        name: pd.displayName?.text || 'Unknown',
        address: pd.formattedAddress || '',
        phone: pd.internationalPhoneNumber || null,
        website: pd.websiteUri || null,
        mapsUrl: pd.googleMapsUri || null,
        rating: pd.rating || null,
        userRatingCount: pd.userRatingCount || null,
        priceLevel: pd.priceLevel || null,
        hours: pd.currentOpeningHours?.weekdayDescriptions || null,
        editorialSummary: pd.editorialSummary?.text || null,
        photoUrls,
      };
    }

    case 'searchImages': {
      const { query, count } = args;
      if (!GOOGLE_MAPS_API_KEY) {
        return { error: 'Google Maps API key not configured' };
      }
      if (!GOOGLE_CUSTOM_SEARCH_CX) {
        return {
          error: 'Image search not configured. GOOGLE_CUSTOM_SEARCH_CX secret is missing.',
          suggestion:
            'Try asking me to "search for [place name]" instead — I can show place photos from Google Maps.',
        };
      }

      const num = Math.min(count || 5, 10);
      const csUrl = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&searchType=image&num=${num}&cx=${GOOGLE_CUSTOM_SEARCH_CX}&key=${GOOGLE_MAPS_API_KEY}`;

      const csResponse = await withCircuitBreaker('google-search', () =>
        fetch(csUrl, { signal: AbortSignal.timeout(8_000) }),
      );
      if (!csResponse.ok) {
        return { error: `Custom Search failed (${csResponse.status})` };
      }

      const csData = await csResponse.json();
      return {
        success: true,
        images: (csData.items || []).map((item: any) => ({
          title: item.title || '',
          thumbnailUrl: item.image?.thumbnailLink || '',
          imageUrl: item.link || '',
          sourceDomain: item.displayLink || '',
        })),
        results: (csData.items || []).map((item: any) => ({
          title: item.title || '',
          url: item.link || '',
          snippet: item.title || '',
        })),
      };
    }

    case 'getStaticMapUrl': {
      // Returns an image-proxy URL for a Google Maps Static API image.
      // The API key stays server-side inside the image-proxy edge function.
      const { center, zoom, markers, path, width, height } = args;

      if (!center) {
        return { error: 'center parameter is required (address or "lat,lng")' };
      }

      const w = Math.min(Number(width) || 600, 640);
      const h = Math.min(Number(height) || 400, 640);
      const z = zoom ? Math.min(Number(zoom), 20) : 13;

      const params = new URLSearchParams();
      params.set('center', String(center));
      params.set('zoom', String(z));
      params.set('w', String(w));
      params.set('h', String(h));

      const markerList: string[] = Array.isArray(markers)
        ? (markers as string[]).map(String)
        : markers
          ? [String(markers)]
          : [];
      for (const marker of markerList) {
        params.append('markers', marker);
      }
      if (path) {
        params.set('path', String(path));
      }

      // image-proxy staticmap mode: no API key exposed to client
      const imageUrl = `${SUPABASE_FUNCTIONS_BASE_URL}/image-proxy?${params.toString()}`;

      return {
        success: true,
        imageUrl,
        center: String(center),
      };
    }

    case 'searchWeb': {
      // Real-time web search using Google Custom Search API (text mode).
      // Use for current hours, prices, reviews, events — anything requiring live data.
      const { query, count } = args;
      if (!GOOGLE_MAPS_API_KEY) {
        return { error: 'Google API key not configured' };
      }
      if (!GOOGLE_CUSTOM_SEARCH_CX) {
        return {
          error: 'Web search not configured. GOOGLE_CUSTOM_SEARCH_CX secret is missing.',
          suggestion:
            'Set up a Custom Search Engine at https://programmablesearchengine.google.com and add GOOGLE_CUSTOM_SEARCH_CX to Supabase secrets.',
        };
      }

      const num = Math.min(Number(count) || 5, 10);
      const csUrl = new URL('https://www.googleapis.com/customsearch/v1');
      csUrl.searchParams.set('q', String(query));
      csUrl.searchParams.set('num', String(num));
      csUrl.searchParams.set('cx', GOOGLE_CUSTOM_SEARCH_CX);
      csUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);

      const csResponse = await withCircuitBreaker('google-search', () =>
        fetch(csUrl.toString(), { signal: AbortSignal.timeout(8_000) }),
      );
      if (!csResponse.ok) {
        const errText = await csResponse.text().catch(() => '');
        return {
          error: `Web search failed (${csResponse.status})`,
          details: errText.slice(0, 200),
        };
      }

      const csData = await csResponse.json();
      return {
        success: true,
        query: String(query),
        results: ((csData.items as Array<Record<string, unknown>>) || []).map(item => ({
          title: String(item.title || ''),
          url: String(item.link || ''),
          snippet: String(item.snippet || ''),
          domain: String(item.displayLink || ''),
        })),
      };
    }

    case 'getDistanceMatrix': {
      // Distance Matrix API: travel times from multiple origins to multiple destinations.
      // Use for "how long from hotel to each restaurant?" or multi-stop planning.
      const { origins, destinations, mode } = args;
      if (!GOOGLE_MAPS_API_KEY) {
        return { error: 'Google API key not configured' };
      }

      const originList: string[] = Array.isArray(origins)
        ? (origins as unknown[]).map(String)
        : [String(origins)];
      const destList: string[] = Array.isArray(destinations)
        ? (destinations as unknown[]).map(String)
        : [String(destinations)];

      const validModes = new Set(['driving', 'walking', 'bicycling', 'transit']);
      const travelMode = validModes.has(String(mode)) ? String(mode) : 'driving';

      const params = new URLSearchParams();
      params.set('origins', originList.join('|'));
      params.set('destinations', destList.join('|'));
      params.set('mode', travelMode);
      params.set('key', GOOGLE_MAPS_API_KEY);

      const dmUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
      const dmResponse = await withCircuitBreaker('google-maps', () =>
        fetch(dmUrl, { signal: AbortSignal.timeout(10_000) }),
      );

      if (!dmResponse.ok) {
        return { error: `Distance Matrix API failed (${dmResponse.status})` };
      }

      const dmData = await dmResponse.json();
      if (dmData.status !== 'OK') {
        return { error: `Distance Matrix error: ${dmData.status}` };
      }

      const originAddresses: string[] = dmData.origin_addresses || [];
      const destAddresses: string[] = dmData.destination_addresses || [];

      return {
        success: true,
        travelMode,
        origins: originAddresses,
        destinations: destAddresses,
        rows: ((dmData.rows as Array<{ elements: Array<Record<string, unknown>> }>) || []).map(
          (row, i) => ({
            origin: originAddresses[i] ?? originList[i],
            elements: (row.elements || []).map((el: Record<string, unknown>, j: number) => ({
              destination: destAddresses[j] ?? destList[j],
              status: String(el.status || 'UNKNOWN'),
              durationText: (el.duration as { text?: string } | null)?.text ?? null,
              durationSeconds: (el.duration as { value?: number } | null)?.value ?? null,
              distanceText: (el.distance as { text?: string } | null)?.text ?? null,
              distanceMeters: (el.distance as { value?: number } | null)?.value ?? null,
            })),
          }),
        ),
      };
    }

    case 'validateAddress': {
      // Address Validation API: clean up and geocode an address the user dictated.
      // Returns formatted address, lat/lng, and component breakdown.
      const { address } = args;
      if (!GOOGLE_MAPS_API_KEY) {
        return { error: 'Google API key not configured' };
      }

      const avResponse = await withCircuitBreaker('google-maps', () =>
        fetch('https://addressvalidation.googleapis.com/v1:validateAddress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          },
          body: JSON.stringify({
            address: { addressLines: [String(address)] },
          }),
          signal: AbortSignal.timeout(8_000),
        }),
      );

      if (!avResponse.ok) {
        const errBody = await avResponse.text().catch(() => '');
        return {
          error: `Address Validation failed (${avResponse.status})`,
          details: errBody.slice(0, 200),
        };
      }

      const avData = await avResponse.json();
      const result = avData.result as Record<string, unknown> | null;

      const geocode = result?.geocode as Record<string, unknown> | null;
      const location = geocode?.location as { latitude?: number; longitude?: number } | null;
      const addr = result?.address as Record<string, unknown> | null;
      const verdict = result?.verdict as Record<string, unknown> | null;

      return {
        success: true,
        formattedAddress: String(addr?.formattedAddress || ''),
        lat: location?.latitude ?? null,
        lng: location?.longitude ?? null,
        addressComplete: verdict?.addressComplete ?? null,
        hasUnconfirmedComponents: verdict?.hasUnconfirmedComponents ?? null,
        components: (addr?.addressComponents as unknown[]) ?? [],
      };
    }

    // ========== TRIP WRITE TOOLS (Concierge Autonomous Actions) ==========

    case 'savePlace': {
      const { name, url, description, category } = args;
      const placeName = String(name || '').trim();
      if (!placeName) return { error: 'Place name is required' };

      // Build a Google Maps search URL if no explicit URL provided
      const placeUrl = url
        ? String(url)
        : `https://www.google.com/maps/search/${encodeURIComponent(placeName)}`;

      const validCategories = new Set([
        'attraction',
        'accommodation',
        'activity',
        'appetite',
        'other',
      ]);
      const safeCategory = validCategories.has(String(category)) ? String(category) : 'other';

      const { data, error } = await supabase
        .from('trip_links')
        .insert({
          trip_id: tripId,
          title: placeName,
          url: placeUrl,
          description: description ? String(description).substring(0, 500) : null,
          category: safeCategory,
          added_by: userId || '',
        })
        .select()
        .single();
      if (error) throw error;
      return {
        success: true,
        link: data,
        actionType: 'save_place',
        message: `Saved "${placeName}" to trip places (${safeCategory})`,
      };
    }

    case 'setBasecamp': {
      const { scope, name, address, lat, lng } = args;
      const basecampName = String(name || '').trim();
      const basecampAddress = String(address || '').trim();
      if (!basecampAddress && !basecampName) {
        return { error: 'Either name or address is required for basecamp' };
      }

      if (scope === 'personal') {
        if (!userId) return { error: 'Authentication required to set personal basecamp' };

        // Upsert personal basecamp
        const { data: existing } = await supabase
          .from('trip_personal_basecamps')
          .select('id')
          .eq('trip_id', tripId)
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) {
          const { data, error } = await supabase
            .from('trip_personal_basecamps')
            .update({
              name: basecampName || null,
              address: basecampAddress || basecampName,
              latitude: lat != null ? Number(lat) : null,
              longitude: lng != null ? Number(lng) : null,
            })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          return {
            success: true,
            basecamp: data,
            actionType: 'set_basecamp',
            scope: 'personal',
            message: `Updated your personal basecamp to "${basecampName || basecampAddress}"`,
          };
        }

        const { data, error } = await supabase
          .from('trip_personal_basecamps')
          .insert({
            trip_id: tripId,
            user_id: userId,
            name: basecampName || null,
            address: basecampAddress || basecampName,
            latitude: lat != null ? Number(lat) : null,
            longitude: lng != null ? Number(lng) : null,
          })
          .select()
          .single();
        if (error) throw error;
        return {
          success: true,
          basecamp: data,
          actionType: 'set_basecamp',
          scope: 'personal',
          message: `Set your personal basecamp to "${basecampName || basecampAddress}"`,
        };
      }

      // Trip basecamp - update the trips table directly
      const updatePayload: Record<string, unknown> = {
        basecamp_name: basecampName || null,
        basecamp_address: basecampAddress || basecampName,
      };
      if (lat != null) updatePayload.basecamp_latitude = Number(lat);
      if (lng != null) updatePayload.basecamp_longitude = Number(lng);

      const { data, error } = await supabase
        .from('trips')
        .update(updatePayload)
        .eq('id', tripId)
        .select('id, basecamp_name, basecamp_address, basecamp_latitude, basecamp_longitude')
        .single();
      if (error) throw error;
      return {
        success: true,
        basecamp: data,
        actionType: 'set_basecamp',
        scope: 'trip',
        message: `Set trip basecamp to "${basecampName || basecampAddress}"`,
      };
    }

    case 'addToAgenda': {
      const { eventId, title, description, sessionDate, startTime, endTime, location, speakers } =
        args;
      const agendaTitle = String(title || '').trim();
      if (!agendaTitle) return { error: 'Agenda session title is required' };
      if (!eventId) return { error: 'Event ID is required for agenda items' };

      const { data, error } = await supabase
        .from('event_agenda_items')
        .insert({
          event_id: eventId,
          title: agendaTitle,
          description: description || null,
          session_date: sessionDate || null,
          start_time: startTime || null,
          end_time: endTime || null,
          location: location || null,
          speakers: Array.isArray(speakers) ? speakers : null,
          created_by: userId || null,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        success: true,
        agendaItem: data,
        actionType: 'add_to_agenda',
        message: `Added "${agendaTitle}" to event agenda`,
      };
    }

    case 'searchFlights': {
      const { origin, destination, departureDate, returnDate, passengers } = args;

      // Construct a Google Flights URL
      // Format: https://www.google.com/travel/flights?q=Flights%20to%20DEST%20from%20ORIG%20on%20DATE
      const q = `Flights to ${destination} from ${origin} on ${departureDate}${returnDate ? ` return ${returnDate}` : ''}`;
      const encodedQ = encodeURIComponent(q);
      const url = `https://www.google.com/travel/flights?q=${encodedQ}`;

      return {
        success: true,
        origin,
        destination,
        departureDate,
        returnDate,
        passengers: passengers || 1,
        deeplink: url,
        message: `Found flight options from ${origin} to ${destination}`,
      };
    }

    case 'emitSmartImportPreview': {
      const { events: extractedEvents } = args;
      if (!Array.isArray(extractedEvents) || extractedEvents.length === 0) {
        return { error: 'No events provided for import preview' };
      }

      // Fetch existing trip events to detect duplicates
      const { data: existingEvents } = await supabase
        .from('trip_events')
        .select('title, start_time, end_time')
        .eq('trip_id', tripId);

      const existingSet = new Set(
        (existingEvents || []).map(
          (e: { title: string; start_time: string }) =>
            `${e.title.toLowerCase().trim()}|${new Date(e.start_time).toISOString()}`,
        ),
      );

      const previewEvents = extractedEvents.map(
        (evt: {
          title: string;
          datetime: string;
          endDatetime?: string;
          location?: string;
          category?: string;
          notes?: string;
        }) => {
          const startIso = new Date(evt.datetime).toISOString();
          const endIso = evt.endDatetime
            ? new Date(evt.endDatetime).toISOString()
            : new Date(new Date(evt.datetime).getTime() + 60 * 60 * 1000).toISOString();

          const dupeKey = `${evt.title.toLowerCase().trim()}|${startIso}`;
          const isDuplicate = existingSet.has(dupeKey);

          const validCategories = new Set([
            'dining',
            'lodging',
            'activity',
            'transportation',
            'entertainment',
            'other',
          ]);
          const category = validCategories.has(evt.category || '') ? evt.category : 'other';

          return {
            title: evt.title,
            startTime: startIso,
            endTime: endIso,
            location: evt.location || null,
            category,
            notes: evt.notes || null,
            isDuplicate,
          };
        },
      );

      return {
        success: true,
        previewEvents,
        tripId,
        totalEvents: previewEvents.length,
        duplicateCount: previewEvents.filter((e: { isDuplicate: boolean }) => e.isDuplicate).length,
        actionType: 'smart_import_preview',
        message: `Found ${previewEvents.length} event(s) to import`,
      };
    }

    case 'emitReservationDraft': {
      const { placeQuery, startTimeISO, partySize, reservationName, notes } = args;

      const query = String(placeQuery || '').trim();
      if (!query) return { error: 'placeQuery is required to build a reservation draft' };

      // Internally search for the place to enrich the draft with real data
      let placeId: string | null = null;
      let placeName = query;
      let address = '';
      let lat: number | null = null;
      let lng: number | null = null;
      let phone: string | null = null;
      let websiteUrl: string | null = null;
      let bookingUrl: string | null = null;

      try {
        const searchResult = await _executeImpl(
          supabase,
          'searchPlaces',
          { query },
          tripId,
          userId,
          locationContext,
        );
        if (searchResult.success && searchResult.places?.length > 0) {
          const topPlace = searchResult.places[0];
          placeId = topPlace.placeId || null;
          placeName = topPlace.name || placeName;
          address = topPlace.address || '';
        }

        // Enrich with details (phone, website, coordinates)
        if (placeId) {
          const detailsResult = await _executeImpl(
            supabase,
            'getPlaceDetails',
            { placeId },
            tripId,
            userId,
            locationContext,
          );
          if (detailsResult.success) {
            placeName = detailsResult.name || placeName;
            address = detailsResult.address || address;
            phone = detailsResult.phone || null;
            websiteUrl = detailsResult.website || null;
            bookingUrl = detailsResult.website || null;
          }
        }

        // Get coordinates via address validation if not yet available
        if (!lat && address) {
          const addrResult = await _executeImpl(
            supabase,
            'validateAddress',
            { address },
            tripId,
            userId,
            locationContext,
          );
          if (addrResult.success) {
            lat = addrResult.lat ?? null;
            lng = addrResult.lng ?? null;
          }
        }
      } catch (enrichError) {
        console.error('[emitReservationDraft] Place enrichment failed:', enrichError);
        // Continue with partial data — the draft is still usable
      }

      const draft = {
        id: crypto.randomUUID(),
        tripId,
        placeId,
        placeName,
        address,
        lat,
        lng,
        phone,
        websiteUrl,
        bookingUrl,
        startTimeISO: startTimeISO || null,
        partySize: Number(partySize) || 2,
        reservationName: String(reservationName || ''),
        notes: String(notes || ''),
      };

      return {
        success: true,
        draft,
        actionType: 'reservation_draft',
        message: `Reservation draft created for ${placeName}`,
      };
    }

    // ========== UPDATE / DELETE TOOLS ==========

    case 'updateCalendarEvent': {
      const { eventId, title, datetime, endDatetime, location, notes } = args;
      if (!eventId) return { error: 'eventId is required' };

      // Verify event belongs to this trip before updating
      const { data: existing, error: fetchErr } = await supabase
        .from('trip_events')
        .select('id, trip_id, created_by')
        .eq('id', eventId)
        .eq('trip_id', tripId)
        .single();
      if (fetchErr || !existing) {
        return { error: 'Event not found in this trip' };
      }

      const updatePayload: Record<string, unknown> = {};
      if (title) updatePayload.title = String(title);
      if (datetime) {
        updatePayload.start_time = new Date(datetime).toISOString();
      }
      if (endDatetime) {
        updatePayload.end_time = new Date(endDatetime).toISOString();
      }
      if (location !== undefined) updatePayload.location = location || null;
      if (notes !== undefined) updatePayload.description = notes || null;

      if (Object.keys(updatePayload).length === 0) {
        return { error: 'No fields to update' };
      }

      const { data, error } = await supabase
        .from('trip_events')
        .update(updatePayload)
        .eq('id', eventId)
        .eq('trip_id', tripId)
        .select()
        .single();
      if (error) throw error;
      return {
        success: true,
        event: data,
        actionType: 'update_calendar_event',
        message: `Updated event "${data.title}"`,
      };
    }

    case 'deleteCalendarEvent': {
      const { eventId } = args;
      if (!eventId) return { error: 'eventId is required' };

      // Verify event belongs to this trip
      const { data: existing, error: fetchErr } = await supabase
        .from('trip_events')
        .select('id, title, trip_id')
        .eq('id', eventId)
        .eq('trip_id', tripId)
        .single();
      if (fetchErr || !existing) {
        return { error: 'Event not found in this trip' };
      }

      const { error } = await supabase
        .from('trip_events')
        .delete()
        .eq('id', eventId)
        .eq('trip_id', tripId);
      if (error) throw error;
      return {
        success: true,
        actionType: 'delete_calendar_event',
        message: `Deleted event "${existing.title}"`,
      };
    }

    case 'updateTask': {
      const { taskId, title, description, assignee, dueDate, completed } = args;
      if (!taskId) return { error: 'taskId is required' };

      // Verify task belongs to this trip
      const { data: existing, error: fetchErr } = await supabase
        .from('trip_tasks')
        .select('id, trip_id, title')
        .eq('id', taskId)
        .eq('trip_id', tripId)
        .single();
      if (fetchErr || !existing) {
        return { error: 'Task not found in this trip' };
      }

      const updatePayload: Record<string, unknown> = {};
      if (title) updatePayload.title = String(title);
      if (description !== undefined) updatePayload.description = description || null;
      if (dueDate !== undefined) updatePayload.due_at = dueDate || null;
      if (completed !== undefined) {
        updatePayload.completed = Boolean(completed);
        updatePayload.completed_at = completed ? new Date().toISOString() : null;
      }

      if (Object.keys(updatePayload).length === 0) {
        return { error: 'No fields to update' };
      }

      const { data, error } = await supabase
        .from('trip_tasks')
        .update(updatePayload)
        .eq('id', taskId)
        .eq('trip_id', tripId)
        .select()
        .single();
      if (error) throw error;
      return {
        success: true,
        task: data,
        actionType: 'update_task',
        message: `Updated task "${data.title}"${completed ? ' (marked complete)' : ''}`,
      };
    }

    case 'deleteTask': {
      const { taskId } = args;
      if (!taskId) return { error: 'taskId is required' };

      const { data: existing, error: fetchErr } = await supabase
        .from('trip_tasks')
        .select('id, title, trip_id')
        .eq('id', taskId)
        .eq('trip_id', tripId)
        .single();
      if (fetchErr || !existing) {
        return { error: 'Task not found in this trip' };
      }

      const { error } = await supabase
        .from('trip_tasks')
        .delete()
        .eq('id', taskId)
        .eq('trip_id', tripId);
      if (error) throw error;
      return {
        success: true,
        actionType: 'delete_task',
        message: `Deleted task "${existing.title}"`,
      };
    }

    // ========== UNIFIED TRIP SEARCH ==========

    case 'searchTripData': {
      const { query, types } = args;
      const searchQuery = String(query || '')
        .trim()
        .toLowerCase();
      if (!searchQuery) return { error: 'Search query is required' };

      const searchTypes: string[] = Array.isArray(types)
        ? types.map(String)
        : ['calendar', 'task', 'poll', 'link', 'payment'];

      const results: Record<string, unknown[]> = {};

      // Search calendar events
      if (searchTypes.includes('calendar')) {
        const { data: events } = await supabase
          .from('trip_events')
          .select('id, title, start_time, end_time, location, description')
          .eq('trip_id', tripId)
          .or(
            `title.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`,
          )
          .order('start_time', { ascending: true })
          .limit(10);
        results.calendar = events || [];
      }

      // Search tasks
      if (searchTypes.includes('task')) {
        const { data: tasks } = await supabase
          .from('trip_tasks')
          .select('id, title, description, completed, due_at')
          .eq('trip_id', tripId)
          .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .limit(10);
        results.tasks = tasks || [];
      }

      // Search polls
      if (searchTypes.includes('poll')) {
        const { data: polls } = await supabase
          .from('trip_polls')
          .select('id, question, options, status')
          .eq('trip_id', tripId)
          .ilike('question', `%${searchQuery}%`)
          .limit(10);
        results.polls = polls || [];
      }

      // Search trip links
      if (searchTypes.includes('link')) {
        const { data: links } = await supabase
          .from('trip_links')
          .select('id, title, url, description, category')
          .eq('trip_id', tripId)
          .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .limit(10);
        results.links = links || [];
      }

      // Search payments
      if (searchTypes.includes('payment')) {
        const { data: payments } = await supabase
          .from('trip_payment_messages')
          .select('id, description, amount, currency, created_at')
          .eq('trip_id', tripId)
          .ilike('description', `%${searchQuery}%`)
          .limit(10);
        results.payments = payments || [];
      }

      const totalResults = Object.values(results).reduce(
        (sum, arr) => sum + (arr as unknown[]).length,
        0,
      );

      return {
        success: true,
        query: searchQuery,
        totalResults,
        results,
        message: `Found ${totalResults} result(s) for "${searchQuery}"`,
      };
    }

    // ========== TRIP ARTIFACT SEMANTIC SEARCH ==========

    case 'searchTripArtifacts': {
      const { query: artifactQuery, artifact_types, limit: artifactLimit } = args;
      const searchText = String(artifactQuery || '').trim();
      if (!searchText) return { error: 'Search query is required' };

      try {
        // Import multimodal embeddings at call time to avoid top-level import issues
        const { embedText } = await import('./multimodalEmbeddings.ts');
        const queryEmbedding = await embedText(searchText);

        const { data: artifacts, error: searchErr } = await supabase.rpc('search_trip_artifacts', {
          p_trip_id: tripId,
          p_query_embedding: queryEmbedding.embedding,
          p_match_threshold: 0.45,
          p_match_count: Number(artifactLimit) || 5,
          p_artifact_types: Array.isArray(artifact_types) ? artifact_types : null,
          p_source_types: null,
          p_created_after: null,
          p_created_before: null,
          p_creator_id: null,
        });

        if (searchErr) throw searchErr;

        const formattedArtifacts = (artifacts || []).map((a: Record<string, unknown>) => ({
          id: a.id,
          type: a.artifact_type,
          fileName: a.file_name,
          summary: a.ai_summary || (a.extracted_text as string)?.substring(0, 300) || '',
          similarity: a.similarity,
          createdAt: a.created_at,
        }));

        return {
          success: true,
          query: searchText,
          totalResults: formattedArtifacts.length,
          artifacts: formattedArtifacts,
          message:
            formattedArtifacts.length > 0
              ? `Found ${formattedArtifacts.length} artifact(s) matching "${searchText}"`
              : `No artifacts found matching "${searchText}"`,
        };
      } catch (artifactErr) {
        console.error('[Tool] searchTripArtifacts error:', artifactErr);
        return {
          success: false,
          error: 'Artifact search failed',
          query: searchText,
          totalResults: 0,
          artifacts: [],
        };
      }
    }

    // ========== CALENDAR CONFLICT DETECTION ==========

    case 'detectCalendarConflicts': {
      const { datetime, endDatetime } = args;
      if (!datetime) return { error: 'datetime is required' };

      const startTime = new Date(datetime).toISOString();
      const endTime = endDatetime
        ? new Date(endDatetime).toISOString()
        : new Date(new Date(datetime).getTime() + 60 * 60 * 1000).toISOString();

      // Find overlapping events: starts before proposed end AND ends after proposed start
      const { data: conflicts, error } = await supabase
        .from('trip_events')
        .select('id, title, start_time, end_time, location')
        .eq('trip_id', tripId)
        .lt('start_time', endTime)
        .gt('end_time', startTime)
        .order('start_time', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        hasConflicts: (conflicts || []).length > 0,
        conflicts: conflicts || [],
        proposedStart: startTime,
        proposedEnd: endTime,
        message:
          (conflicts || []).length > 0
            ? `Found ${conflicts!.length} conflicting event(s)`
            : 'No conflicts found',
      };
    }

    // ========== BROADCAST TOOL ==========

    case 'createBroadcast': {
      const { message, priority } = args;
      const broadcastMessage = String(message || '').trim();
      if (!broadcastMessage) return { error: 'Broadcast message is required' };
      if (!userId) return { error: 'Authentication required to send broadcasts' };

      const validPriorities = new Set(['normal', 'urgent']);
      const safePriority = validPriorities.has(String(priority)) ? String(priority) : 'normal';

      const { data, error } = await supabase
        .from('broadcasts')
        .insert({
          trip_id: tripId,
          created_by: userId,
          message: broadcastMessage,
          priority: safePriority,
          is_sent: true,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        success: true,
        broadcast: data,
        actionType: 'create_broadcast',
        message: `Broadcast sent: "${broadcastMessage.substring(0, 80)}"${safePriority === 'urgent' ? ' (URGENT)' : ''}`,
      };
    }

    // ========== NOTIFICATION TOOL ==========

    case 'createNotification': {
      const { title, message, targetUserIds, type } = args;
      const notifTitle = String(title || '').trim();
      const notifMessage = String(message || '').trim();
      if (!notifTitle || !notifMessage) {
        return { error: 'Both title and message are required' };
      }

      // If no target users specified, notify all trip members
      let userIds: string[] = [];
      if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
        userIds = targetUserIds.map(String);
      } else {
        const { data: members } = await supabase
          .from('trip_members')
          .select('user_id')
          .eq('trip_id', tripId);
        userIds = (members || []).map((m: { user_id: string }) => m.user_id);
      }

      if (userIds.length === 0) {
        return { error: 'No target users found' };
      }

      const notifications = userIds.map((uid: string) => ({
        user_id: uid,
        trip_id: tripId,
        title: notifTitle,
        message: notifMessage,
        type: type || 'concierge',
        metadata: { source: 'ai_concierge', created_by: userId },
      }));

      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;

      return {
        success: true,
        actionType: 'create_notification',
        recipientCount: userIds.length,
        message: `Notification sent to ${userIds.length} member(s): "${notifTitle}"`,
      };
    }

    // ========== WEATHER FORECAST ==========

    case 'getWeatherForecast': {
      const { location, date } = args;
      if (!location) return { error: 'Location is required' };

      // Use web search to get weather data (free, no additional API key needed)
      const dateStr = date || 'today';
      const weatherQuery = `weather forecast ${location} ${dateStr}`;

      const searchResult = await _executeImpl(
        supabase,
        'searchWeb',
        { query: weatherQuery, count: 3 },
        tripId,
        userId,
        locationContext,
      );

      return {
        success: true,
        location,
        date: dateStr,
        searchResults: searchResult.success ? searchResult.results : [],
        message: `Weather results for ${location} (${dateStr})`,
      };
    }

    // ========== CURRENCY CONVERSION ==========

    case 'convertCurrency': {
      const { amount, from, to } = args;
      if (!amount || !from || !to) {
        return { error: 'amount, from, and to currency codes are required' };
      }

      const numAmount = Number(amount);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        return { error: 'Amount must be a positive number' };
      }

      // Use the free exchangerate API
      const rateUrl = `https://open.er-api.com/v6/latest/${encodeURIComponent(String(from).toUpperCase())}`;
      const rateResponse = await withCircuitBreaker('exchange-rate', () =>
        fetch(rateUrl, { signal: AbortSignal.timeout(8_000) }),
      );

      if (!rateResponse.ok) {
        return { error: `Currency API failed (${rateResponse.status})` };
      }

      const rateData = await rateResponse.json();
      if (rateData.result !== 'success') {
        return { error: `Currency conversion failed: ${rateData['error-type'] || 'unknown'}` };
      }

      const toCurrency = String(to).toUpperCase();
      const rate = rateData.rates?.[toCurrency];
      if (!rate) {
        return { error: `Unknown currency code: ${toCurrency}` };
      }

      const converted = Math.round(numAmount * rate * 100) / 100;
      return {
        success: true,
        originalAmount: numAmount,
        originalCurrency: String(from).toUpperCase(),
        convertedAmount: converted,
        targetCurrency: toCurrency,
        exchangeRate: rate,
        rateDate: rateData.time_last_update_utc || null,
        message: `${numAmount} ${String(from).toUpperCase()} = ${converted} ${toCurrency}`,
      };
    }

    // ========== IMAGE GENERATION (Trip Header) ==========

    case 'generateTripImage': {
      const { prompt, style } = args;
      if (!GEMINI_API_KEY) {
        return { error: 'Gemini API key not configured for image generation' };
      }

      // Build a travel-specific image prompt
      const safeStyles = new Set(['photo', 'illustration', 'watercolor', 'minimal', 'vibrant']);
      const imageStyle = safeStyles.has(String(style)) ? String(style) : 'photo';

      const imagePrompt = `Generate a beautiful, high-quality ${imageStyle}-style travel image: ${String(prompt).substring(0, 500)}. The image should be suitable as a trip cover photo — wide landscape format, vibrant colors, no text overlays, no watermarks.`;

      // Use Gemini's image generation via Imagen
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`;
      const geminiResponse = await withCircuitBreaker('gemini', () =>
        fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: imagePrompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: '16:9',
              safetyFilterLevel: 'block_medium_and_above',
            },
          }),
          signal: AbortSignal.timeout(30_000),
        }),
      );

      if (!geminiResponse.ok) {
        const errText = await geminiResponse.text().catch(() => '');
        console.error(`[Tool] generateTripImage failed (${geminiResponse.status}): ${errText}`);
        return {
          error: `Image generation failed (${geminiResponse.status})`,
          suggestion: 'Try a simpler prompt or different style',
        };
      }

      const geminiData = await geminiResponse.json();
      const prediction = geminiData.predictions?.[0];

      if (!prediction?.bytesBase64Encoded) {
        return { error: 'No image was generated. Try a different prompt.' };
      }

      // Store image in Supabase Storage
      const imageBytes = Uint8Array.from(atob(prediction.bytesBase64Encoded), (c: string) =>
        c.charCodeAt(0),
      );
      const fileName = `trip-headers/${tripId}/${crypto.randomUUID()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('trip-media')
        .upload(fileName, imageBytes, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) {
        console.error('[Tool] generateTripImage upload failed:', uploadError);
        return { error: 'Image generated but upload failed' };
      }

      const { data: urlData } = supabase.storage.from('trip-media').getPublicUrl(fileName);
      const publicUrl = urlData?.publicUrl || '';

      return {
        success: true,
        imageUrl: publicUrl,
        storagePath: fileName,
        prompt: String(prompt).substring(0, 200),
        style: imageStyle,
        actionType: 'generate_trip_image',
        message: `Generated trip image. You can preview it and set it as your trip header.`,
      };
    }

    case 'setTripHeaderImage': {
      const { imageUrl } = args;
      if (!imageUrl) return { error: 'imageUrl is required' };

      const { data, error } = await supabase
        .from('trips')
        .update({ cover_image_url: String(imageUrl) })
        .eq('id', tripId)
        .select('id, cover_image_url')
        .single();
      if (error) throw error;

      return {
        success: true,
        trip: data,
        actionType: 'set_trip_header',
        message: 'Trip header image updated!',
      };
    }

    // ========== WEB BROWSING / TRAVEL AGENT ==========

    case 'browseWebsite': {
      const { url, instruction } = args;
      if (!url) return { error: 'URL is required' };
      if (!GEMINI_API_KEY) {
        return { error: 'Gemini API key not configured for web browsing' };
      }

      const targetUrl = String(url).trim();
      // Basic URL validation
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        return { error: 'URL must start with http:// or https://' };
      }

      // Fetch the page content
      const pageResponse = await withCircuitBreaker('google-search', () =>
        fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(15_000),
          redirect: 'follow',
        }),
      );

      if (!pageResponse.ok) {
        return {
          error: `Failed to load page (${pageResponse.status})`,
          url: targetUrl,
        };
      }

      const html = await pageResponse.text();
      // Extract text content (strip HTML tags for LLM consumption)
      const textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 15_000); // Cap at 15k chars for context window

      // Extract links that might be useful (reservation links, booking links)
      const linkMatches = html.match(/<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/gi) || [];
      const relevantLinks = linkMatches
        .map((link: string) => {
          const hrefMatch = link.match(/href="([^"]+)"/);
          const textMatch = link.match(/>([^<]*)</);
          return {
            url: hrefMatch?.[1] || '',
            text: (textMatch?.[1] || '').trim(),
          };
        })
        .filter(
          (l: { url: string; text: string }) =>
            l.text.length > 2 &&
            (l.url.startsWith('http') || l.url.startsWith('/')) &&
            /reserv|book|order|menu|hour|schedule|ticket|price|avail/i.test(l.text + l.url),
        )
        .slice(0, 20);

      const taskInstruction = instruction
        ? String(instruction)
        : 'Extract key information useful for travel planning';

      // Use Gemini to analyze the page content
      const analysisUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
      const analysisResponse = await withCircuitBreaker('gemini', () =>
        fetch(analysisUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a travel agent assistant. Analyze this webpage content and ${taskInstruction}.\n\nPage URL: ${targetUrl}\n\nPage content:\n${textContent}`,
                  },
                ],
              },
            ],
            generationConfig: { maxOutputTokens: 2000, temperature: 0.2 },
          }),
          signal: AbortSignal.timeout(20_000),
        }),
      );

      let analysis = '';
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        analysis =
          analysisData.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not analyze page';
      }

      return {
        success: true,
        url: targetUrl,
        pageTitle: (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || 'Unknown').trim(),
        analysis,
        relevantLinks,
        contentLength: textContent.length,
        actionType: 'browse_website',
        message: `Browsed ${targetUrl} — extracted travel-relevant information`,
      };
    }

    case 'makeReservation': {
      const { venue, datetime, partySize, name, phone, specialRequests, bookingUrl } = args;
      if (!venue) return { error: 'Venue name is required' };

      // Step 1: Search for the venue to get its details
      let venueDetails: {
        placeId: string | null;
        name: string;
        address: string;
        phone: string | null;
        website: string | null;
      } = {
        placeId: null,
        name: String(venue),
        address: '',
        phone: null,
        website: null,
      };

      try {
        const searchResult = await _executeImpl(
          supabase,
          'searchPlaces',
          { query: String(venue) },
          tripId,
          userId,
          locationContext,
        );
        if (searchResult.success && searchResult.places?.length > 0) {
          const top = searchResult.places[0];
          venueDetails.placeId = top.placeId;
          venueDetails.name = top.name;
          venueDetails.address = top.address;
        }

        if (venueDetails.placeId) {
          const details = await _executeImpl(
            supabase,
            'getPlaceDetails',
            { placeId: venueDetails.placeId },
            tripId,
            userId,
            locationContext,
          );
          if (details.success) {
            venueDetails.phone = details.phone;
            venueDetails.website = details.website;
          }
        }
      } catch (_e) {
        // Continue with partial data
      }

      // Step 2: If we have a booking URL, browse it for reservation instructions
      let bookingInfo: { analysis: string; relevantLinks: unknown[] } | null = null;
      const targetBookingUrl = bookingUrl || venueDetails.website;
      if (targetBookingUrl) {
        try {
          const browseResult = await _executeImpl(
            supabase,
            'browseWebsite',
            {
              url: targetBookingUrl,
              instruction:
                'Find the reservation/booking page or form. Extract available times, party size limits, and how to complete a reservation. Look for OpenTable, Resy, or other booking platform links.',
            },
            tripId,
            userId,
            locationContext,
          );
          if (browseResult.success) {
            bookingInfo = {
              analysis: browseResult.analysis || '',
              relevantLinks: browseResult.relevantLinks || [],
            };
          }
        } catch (_e) {
          // Browsing failed — that's fine
        }
      }

      // Step 3: Also add to calendar if datetime is provided
      let calendarEvent = null;
      if (datetime) {
        try {
          const calResult = await _executeImpl(
            supabase,
            'addToCalendar',
            {
              title: `Reservation at ${venueDetails.name}`,
              datetime,
              location: venueDetails.address || venueDetails.name,
              notes: `Party of ${partySize || 2}${name ? ` under ${name}` : ''}${specialRequests ? `. ${specialRequests}` : ''}`,
            },
            tripId,
            userId,
            locationContext,
          );
          if (calResult.success) {
            calendarEvent = calResult.event;
          }
        } catch (_e) {
          // Calendar add failed — not blocking
        }
      }

      return {
        success: true,
        venue: venueDetails,
        requestedDatetime: datetime || null,
        partySize: partySize || 2,
        reservationName: name || null,
        contactPhone: phone || venueDetails.phone || null,
        specialRequests: specialRequests || null,
        bookingInfo,
        calendarEvent,
        actionType: 'make_reservation',
        message: `Reservation details gathered for ${venueDetails.name}${bookingInfo ? '. Booking page analyzed — see instructions below.' : venueDetails.phone ? `. Call ${venueDetails.phone} to book.` : '. Visit their website to complete the booking.'}`,
      };
    }

    // ========== DEEP LINK RESOLVER ==========

    case 'getDeepLink': {
      const { entityType, entityId } = args;
      if (!entityType || !entityId) {
        return { error: 'entityType and entityId are required' };
      }

      const SITE_URL = Deno.env.get('SITE_URL') || 'https://chravel.app';
      const validTypes = new Set(['event', 'task', 'poll', 'link', 'payment', 'broadcast']);
      if (!validTypes.has(String(entityType))) {
        return { error: `Invalid entityType. Must be one of: ${[...validTypes].join(', ')}` };
      }

      // Map entity types to their trip tab paths
      const tabMap: Record<string, string> = {
        event: 'calendar',
        task: 'tasks',
        poll: 'polls',
        link: 'explore',
        payment: 'payments',
        broadcast: 'broadcasts',
      };

      const tab = tabMap[String(entityType)] || 'calendar';
      const deepLink = `${SITE_URL}/trip/${tripId}?tab=${tab}&item=${entityId}`;

      return {
        success: true,
        deepLink,
        entityType: String(entityType),
        entityId: String(entityId),
        message: `Deep link generated for ${entityType}`,
      };
    }

    // ========== EXPENSE SETTLEMENT ==========

    case 'settleExpense': {
      const { splitId, amount, method } = args;
      if (!splitId) return { error: 'splitId is required' };
      if (!userId) return { error: 'Authentication required' };

      // Verify the split belongs to this trip
      const { data: split, error: fetchErr } = await supabase
        .from('payment_splits')
        .select('id, payment_message_id, debtor_user_id, amount_owed, is_settled')
        .eq('id', splitId)
        .single();

      if (fetchErr || !split) {
        return { error: 'Payment split not found' };
      }

      if (split.is_settled) {
        return { error: 'This expense has already been settled' };
      }

      // Verify the payment_message belongs to this trip
      const { data: payment } = await supabase
        .from('trip_payment_messages')
        .select('trip_id')
        .eq('id', split.payment_message_id)
        .eq('trip_id', tripId)
        .single();

      if (!payment) {
        return { error: 'Payment not found in this trip' };
      }

      const { data, error } = await supabase
        .from('payment_splits')
        .update({ is_settled: true })
        .eq('id', splitId)
        .select()
        .single();
      if (error) throw error;

      return {
        success: true,
        split: data,
        method: method || 'marked_settled',
        actionType: 'settle_expense',
        message: `Marked expense of $${split.amount_owed} as settled`,
      };
    }

    // ========== PERMISSION EXPLAINER ==========

    case 'explainPermission': {
      const { action } = args;
      if (!action) return { error: 'action is required' };
      if (!userId) return { error: 'Authentication required' };

      // Check user's role in this trip
      const { data: membership } = await supabase
        .from('trip_members')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .single();

      // Check if user is the trip creator
      const { data: trip } = await supabase
        .from('trips')
        .select('created_by')
        .eq('id', tripId)
        .single();

      const isCreator = trip?.created_by === userId;
      const role = membership?.role || 'none';
      const isMember = !!membership;

      const permissions: Record<
        string,
        { allowed: boolean; reason: string; requiredRole: string }
      > = {
        addToCalendar: {
          allowed: isMember,
          reason: isMember ? 'Trip members can add events' : 'Must be a trip member',
          requiredRole: 'member',
        },
        updateCalendarEvent: {
          allowed: isMember,
          reason: isMember
            ? 'Trip members can update events they created'
            : 'Must be a trip member',
          requiredRole: 'member (own events)',
        },
        deleteCalendarEvent: {
          allowed: isMember,
          reason: isMember
            ? 'Trip members can delete events they created'
            : 'Must be a trip member',
          requiredRole: 'member (own events)',
        },
        createTask: {
          allowed: isMember,
          reason: isMember ? 'Trip members can create tasks' : 'Must be a trip member',
          requiredRole: 'member',
        },
        createPoll: {
          allowed: isMember,
          reason: isMember ? 'Trip members can create polls' : 'Must be a trip member',
          requiredRole: 'member',
        },
        createBroadcast: {
          allowed: isMember,
          reason: isMember ? 'Trip members can send broadcasts' : 'Must be a trip member',
          requiredRole: 'member',
        },
        setBasecamp: {
          allowed: isCreator || role === 'admin',
          reason: isCreator
            ? 'Trip creator can set trip basecamp'
            : role === 'admin'
              ? 'Admins can set trip basecamp'
              : 'Only trip creator or admin can set trip basecamp',
          requiredRole: 'creator or admin',
        },
        setTripHeaderImage: {
          allowed: isCreator || role === 'admin',
          reason: isCreator
            ? 'Trip creator can change the header image'
            : 'Only trip creator or admin can change the header image',
          requiredRole: 'creator or admin',
        },
      };

      const actionKey = String(action);
      const perm = permissions[actionKey];

      return {
        success: true,
        action: actionKey,
        userRole: role,
        isCreator,
        isMember,
        allowed: perm?.allowed ?? isMember,
        reason: perm?.reason ?? (isMember ? 'Allowed as trip member' : 'Must be a trip member'),
        requiredRole: perm?.requiredRole ?? 'member',
        message: perm
          ? `${actionKey}: ${perm.reason}`
          : `${actionKey}: ${isMember ? 'Allowed' : 'Not allowed — not a trip member'}`,
      };
    }

    case 'verify_artifact': {
      const { type, id, idempotency_key } = args;
      let table = '';
      if (type === 'task') table = 'trip_tasks';
      else if (type === 'event') table = 'trip_events';
      else if (type === 'poll') table = 'trip_polls';
      else if (type === 'link' || type === 'place') table = 'trip_links';
      else return { error: `Unknown artifact type: ${type}` };

      let query = supabase.from(table).select('id').eq('trip_id', tripId);
      if (id) query = query.eq('id', id);
      if (idempotency_key) query = query.eq('idempotency_key', idempotency_key);

      const { data, error } = await query.maybeSingle();
      if (error) return { error: error.message };

      return { success: true, exists: !!data, found_id: data?.id || null };
    }

    default:
      return { error: `Unknown function: ${functionName}` };
  }
}

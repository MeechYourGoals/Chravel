const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
const GOOGLE_CUSTOM_SEARCH_CX = Deno.env.get('GOOGLE_CUSTOM_SEARCH_CX');

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
      const { data, error } = await supabase
        .from('trip_events')
        .insert({
          trip_id: tripId,
          title,
          start_time: startTime,
          end_time: endTime,
          location: location || null,
          description: notes || null,
          created_by: userId || null,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        success: true,
        event: data,
        actionType: 'add_to_calendar',
        message: `Created event "${title}" on ${startTime}`,
      };
    }

    case 'createTask': {
      const { title, notes, dueDate, assignee } = args;
      const taskTitle = String(title || '').trim();
      if (!taskTitle) return { error: 'Task title is required' };
      const { data, error } = await supabase
        .from('trip_tasks')
        .insert({
          trip_id: tripId,
          title: taskTitle,
          description: notes || null,
          creator_id: userId || '',
          due_at: dueDate || null,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        success: true,
        task: data,
        actionType: 'create_task',
        message: `Created task: "${taskTitle}"${assignee ? ` for ${assignee}` : ''}`,
      };
    }

    case 'createPoll': {
      const { question, options } = args;
      const pollOptions = options.map((opt: string, i: number) => ({
        id: `opt_${i}`,
        text: opt,
        votes: 0,
      }));
      const { data, error } = await supabase
        .from('trip_polls')
        .insert({
          trip_id: tripId,
          question,
          options: pollOptions,
          created_by: userId || null,
          status: 'active',
        })
        .select()
        .single();
      if (error) throw error;
      return {
        success: true,
        poll: data,
        actionType: 'create_poll',
        message: `Created poll: "${question}" with ${options.length} options`,
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

      const url = `https://places.googleapis.com/v1/places:searchText`;
      const placesResponse = await fetch(url, {
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
      });

      if (!placesResponse.ok) {
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

      const routesResponse = await fetch(routesUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.description',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });

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

      const tzResponse = await fetch(tzUrl, { signal: AbortSignal.timeout(8_000) });
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

      const detailsUrl = `https://places.googleapis.com/v1/places/${placeId}`;
      const detailsResponse = await fetch(detailsUrl, {
        headers: {
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask':
            'id,displayName,formattedAddress,internationalPhoneNumber,websiteUri,googleMapsUri,rating,userRatingCount,priceLevel,currentOpeningHours,editorialSummary,photos',
        },
        signal: AbortSignal.timeout(8_000),
      });

      if (!detailsResponse.ok) {
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

      const csResponse = await fetch(csUrl, { signal: AbortSignal.timeout(8_000) });
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

      const csResponse = await fetch(csUrl.toString(), { signal: AbortSignal.timeout(8_000) });
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
      const dmResponse = await fetch(dmUrl, { signal: AbortSignal.timeout(10_000) });

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

      const avResponse = await fetch(
        'https://addressvalidation.googleapis.com/v1:validateAddress',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          },
          body: JSON.stringify({
            address: { addressLines: [String(address)] },
          }),
          signal: AbortSignal.timeout(8_000),
        },
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

    default:
      return { error: `Unknown function: ${functionName}` };
  }
}

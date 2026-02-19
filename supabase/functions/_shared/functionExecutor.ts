const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
const GOOGLE_CUSTOM_SEARCH_CX = Deno.env.get('GOOGLE_CUSTOM_SEARCH_CX');

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
    console.log(`[Tool] ${functionName} | ${elapsed}ms | ${ok ? 'success' : 'error: ' + (result?.error ?? 'unknown')}`);
    return result;
  } catch (err) {
    const elapsed = Math.round(performance.now() - startMs);
    console.error(`[Tool] ${functionName} | ${elapsed}ms | exception: ${err instanceof Error ? err.message : String(err)}`);
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
      return { success: true, event: data, message: `Created event "${title}" on ${startTime}` };
    }

    case 'createTask': {
      const { content, assignee, dueDate } = args;
      const { data, error } = await supabase
        .from('trip_tasks')
        .insert({
          trip_id: tripId,
          content,
          created_by: userId || null,
          due_date: dueDate || null,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        success: true,
        task: data,
        message: `Created task: "${content}"${assignee ? ` for ${assignee}` : ''}`,
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
            'places.id,places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.googleMapsUri,places.photos',
        },
        body: JSON.stringify({
          textQuery: query,
          locationBias:
            lat !== null && lng !== null
              ? {
                  circle: { center: { latitude: lat, longitude: lng }, radius: 5000 },
                }
              : undefined,
          maxResultCount: 5,
        }),
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
          priceLevel: p.priceLevel || null,
          mapsUrl: p.googleMapsUri || null,
          photoCount: p.photos?.length || 0,
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

      return {
        success: true,
        durationMinutes: Math.round(durationSeconds / 60),
        distanceKm: Math.round(distanceMeters / 100) / 10,
        distanceMiles: Math.round((distanceMeters / 1609.34) * 10) / 10,
        summary: route.description || `${Math.round(durationSeconds / 60)} min drive`,
        origin,
        destination,
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
        return { error: `Time Zone API error: ${tzData.status}`, errorMessage: tzData.errorMessage };
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
      const photoUrls = (pd.photos || []).slice(0, 5).map((photo: any) => {
        const photoRef = photo.name; // e.g. "places/ChIJ.../photos/AUc..."
        return `https://places.googleapis.com/v1/${photoRef}/media?maxHeightPx=400&maxWidthPx=600&key=${GOOGLE_MAPS_API_KEY}`;
      });

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
          suggestion: 'Try asking me to "search for [place name]" instead — I can show place photos from Google Maps.',
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

    default:
      return { error: `Unknown function: ${functionName}` };
  }
}

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

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
  switch (functionName) {
    case 'addToCalendar': {
      const { title, datetime, location, notes } = args;
      const startTime = new Date(datetime).toISOString();
      const endTime = new Date(new Date(datetime).getTime() + 60 * 60 * 1000).toISOString(); // default 1hr
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

      // Get splits for unsettled debts
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
            'places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.googleMapsUri',
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
          name: p.displayName?.text || 'Unknown',
          address: p.formattedAddress || '',
          rating: p.rating || null,
          priceLevel: p.priceLevel || null,
          mapsUrl: p.googleMapsUri || null,
        })),
      };
    }

    default:
      return { error: `Unknown function: ${functionName}` };
  }
}

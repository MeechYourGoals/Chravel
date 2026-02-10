import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } =
    await import('../_shared/securityHeaders.ts');

  if (req.method === 'OPTIONS') {
    return createOptionsResponse(req);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { action, query, placeId, location } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: 'Missing action parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!googleApiKey) {
      return new Response(JSON.stringify({ error: 'Google Maps API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'search_places':
        return await searchPlaces(query, location, googleApiKey);
      case 'get_place_details':
        return await getPlaceDetails(placeId, googleApiKey);
      case 'get_nearby_places':
        return await getNearbyPlaces(location, googleApiKey);
      case 'resolve_place_links':
        return await resolvePlaceLinks(query, googleApiKey);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in venue-enricher function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function searchPlaces(query: string, location: string, apiKey: string) {
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${location}&radius=50000&key=${apiKey}`;

  const response = await fetch(searchUrl);
  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();

  return new Response(
    JSON.stringify({
      success: true,
      places: data.results.slice(0, 10), // Limit to 10 results
      status: data.status,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

async function getPlaceDetails(placeId: string, apiKey: string) {
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,formatted_phone_number,formatted_address,website,photos,reviews,opening_hours,price_level&key=${apiKey}`;

  const response = await fetch(detailsUrl);
  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();

  return new Response(
    JSON.stringify({
      success: true,
      place: data.result,
      status: data.status,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

async function getNearbyPlaces(location: string, apiKey: string) {
  const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=5000&type=restaurant&key=${apiKey}`;

  const response = await fetch(nearbyUrl);
  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();

  return new Response(
    JSON.stringify({
      success: true,
      places: data.results.slice(0, 20), // Limit to 20 results
      status: data.status,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

async function resolvePlaceLinks(placeName: string, apiKey: string) {
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(placeName)}&key=${apiKey}`;

  const response = await fetch(searchUrl);
  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'No places found',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const place = data.results[0];

  // Get detailed place information
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,rating,formatted_phone_number,formatted_address,website,photos,reviews,opening_hours,price_level,types&key=${apiKey}`;

  const detailsResponse = await fetch(detailsUrl);
  if (!detailsResponse.ok) {
    throw new Error(`Google Places API error: ${detailsResponse.status}`);
  }

  const detailsData = await detailsResponse.json();
  const placeDetails = detailsData.result;

  // Generate smart link options based on place type
  const linkOptions = generateLinkOptions(placeDetails, place);

  return new Response(
    JSON.stringify({
      success: true,
      place: {
        ...placeDetails,
        place_id: place.place_id,
        geometry: place.geometry,
      },
      linkOptions,
      status: data.status,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

function generateLinkOptions(placeDetails: any, place: any) {
  const options = [];
  const placeTypes = placeDetails.types || [];

  // Always include Google Maps
  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
  options.push({
    type: 'maps',
    label: 'Google Maps',
    url: mapsUrl,
    description: 'View location and directions',
    isPrimary: true,
  });

  // Official website if available
  if (placeDetails.website) {
    options.unshift({
      type: 'official',
      label: 'Official Website',
      url: placeDetails.website,
      description: 'Visit the official website',
      isPrimary: true,
    });
  }

  // Generate review links based on place type
  const placeName = encodeURIComponent(placeDetails.name);
  const placeAddress = encodeURIComponent(placeDetails.formatted_address || '');

  if (placeTypes.includes('lodging') || placeTypes.includes('establishment')) {
    // Hotels and accommodations
    options.push({
      type: 'booking',
      label: 'Booking.com',
      url: `https://www.booking.com/search.html?ss=${placeName}`,
      description: 'Check rates and availability',
    });

    options.push({
      type: 'tripadvisor',
      label: 'TripAdvisor',
      url: `https://www.tripadvisor.com/Search?q=${placeName}+${placeAddress}`,
      description: 'Read reviews and ratings',
    });
  } else if (
    placeTypes.includes('restaurant') ||
    placeTypes.includes('food') ||
    placeTypes.includes('meal_takeaway')
  ) {
    // Restaurants
    options.push({
      type: 'opentable',
      label: 'OpenTable',
      url: `https://www.opentable.com/s/?text=${placeName}`,
      description: 'Make a reservation',
    });

    options.push({
      type: 'yelp',
      label: 'Yelp',
      url: `https://www.yelp.com/search?find_desc=${placeName}&find_loc=${placeAddress}`,
      description: 'Read reviews and photos',
    });
  } else if (
    placeTypes.includes('tourist_attraction') ||
    placeTypes.includes('museum') ||
    placeTypes.includes('amusement_park')
  ) {
    // Attractions
    options.push({
      type: 'tripadvisor',
      label: 'TripAdvisor',
      url: `https://www.tripadvisor.com/Search?q=${placeName}+${placeAddress}`,
      description: 'Read reviews and tips',
    });

    options.push({
      type: 'viator',
      label: 'Viator',
      url: `https://www.viator.com/search/?text=${placeName}`,
      description: 'Book tours and activities',
    });
  } else {
    // Generic places
    options.push({
      type: 'yelp',
      label: 'Yelp',
      url: `https://www.yelp.com/search?find_desc=${placeName}&find_loc=${placeAddress}`,
      description: 'Read reviews and ratings',
    });
  }

  return options.slice(0, 4); // Limit to 4 options
}

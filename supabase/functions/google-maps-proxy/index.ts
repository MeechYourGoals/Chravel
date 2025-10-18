import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { validateAndSanitizeInput, checkRateLimit, addSecurityHeaders } from "../_shared/security.ts";

serve(async (req) => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createOptionsResponse();
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(clientIP, 100, 60000);
    
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Better request parsing with validation
    let requestData;
    try {
      const requestText = await req.text();
      console.log('Request body:', requestText);
      
      if (!requestText || requestText.trim() === '') {
        throw new Error('Empty request body');
      }
      
      requestData = JSON.parse(requestText);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: parseError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    const { endpoint, ...data } = requestData;
    
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.error('Google Maps API key not found in environment');
      throw new Error('Google Maps API key not configured');
    }

    switch (endpoint) {
      case 'embed-url': {
        const validation = validateAndSanitizeInput(data);
        
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid input');
        }
        
        const { query } = validation.sanitized!;
        if (!query || query.length === 0) {
          throw new Error('Query parameter is required');
        }
        
        const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(query)}&zoom=12`;
        
        const response = new Response(
          JSON.stringify({ embedUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
        return addSecurityHeaders(response);
      }

      case 'distance-matrix': {
        const validation = validateAndSanitizeInput(data);
        
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid input');
        }
        
        const { origins, destinations, mode = 'DRIVING' } = validation.sanitized!;
        if (!origins || !destinations) {
          throw new Error('Origins and destinations are required');
        }

        const apiUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${origins}&destinations=${destinations}&mode=${mode}&key=${apiKey}`;
        
        const apiResponse = await fetch(apiUrl);
        const apiData = await apiResponse.json();
        
        console.log('Distance Matrix API response:', apiData);
        
        const result = new Response(
          JSON.stringify(apiData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
        return addSecurityHeaders(result);
      }

      case 'geocode': {
        const validation = validateAndSanitizeInput(data);
        
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid input');
        }
        
        const { address } = validation.sanitized!;
        if (!address) {
          throw new Error('Address parameter is required');
        }

        console.log('Geocoding address:', address);
        const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
        
        const apiResponse = await fetch(apiUrl);
        const apiData = await apiResponse.json();
        
        console.log('Geocoding API response:', apiData);
        
        const result = new Response(
          JSON.stringify(apiData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
        return addSecurityHeaders(result);
      }

      case 'text-search': {
        const validation = validateAndSanitizeInput(data);
        
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid input');
        }
        
        const { query, location } = validation.sanitized!;
        if (!query) {
          throw new Error('Query parameter is required');
        }

        console.log('Text Search request for:', query, location ? `near ${location}` : '');
        
        // Use Places API Text Search (supports natural language)
        let apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
        
        // Optional: Add location bias if provided (e.g., basecamp coords)
        if (location) {
          apiUrl += `&location=${location}&radius=50000`; // 50km radius
        }
        
        const apiResponse = await fetch(apiUrl);
        const apiData = await apiResponse.json();
        
        console.log('Text Search API response:', apiData);
        
        const result = new Response(
          JSON.stringify(apiData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
        return addSecurityHeaders(result);
      }

      case 'places-search': {
        const validation = validateAndSanitizeInput(data);
        
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid input');
        }
        
        const { query, location, radius = 5000 } = validation.sanitized!;
        if (!query || !location) {
          throw new Error('Query and location parameters are required');
        }

        const apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${location}&radius=${radius}&key=${apiKey}`;
        
        const apiResponse = await fetch(apiUrl);
        const apiData = await apiResponse.json();
        
        const result = new Response(
          JSON.stringify(apiData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
        return addSecurityHeaders(result);
      }

      case 'place-details': {
        const validation = validateAndSanitizeInput(data);
        
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid input');
        }
        
        const { placeId } = validation.sanitized!;
        if (!placeId) {
          throw new Error('PlaceId parameter is required');
        }

        const apiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}`;
        
        const apiResponse = await fetch(apiUrl);
        const apiData = await apiResponse.json();
        
        const result = new Response(
          JSON.stringify(apiData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
        return addSecurityHeaders(result);
      }

      case 'autocomplete': {
        const validation = validateAndSanitizeInput(data);
        
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid input');
        }
        
        const { input, types = 'establishment|geocode' } = validation.sanitized!;
        if (!input) {
          throw new Error('Input parameter is required');
        }

        console.log('Autocomplete request for:', input, 'with types:', types);
        const apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=${encodeURIComponent(types)}&key=${apiKey}`;
        
        const apiResponse = await fetch(apiUrl);
        const apiData = await apiResponse.json();
        
        console.log('Autocomplete API response:', apiData);
        
        const result = new Response(
          JSON.stringify(apiData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
        return addSecurityHeaders(result);
      }

      case 'embed-with-origin': {
        const validation = validateAndSanitizeInput(data);
        
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid input');
        }
        
        const { origin } = validation.sanitized!;
        if (!origin) {
          throw new Error('Origin parameter is required');
        }

        // Generate embed URL with origin pre-filled for directions
        const embedUrl = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(origin)}&destination=&mode=driving`;
        
        const result = new Response(
          JSON.stringify({ embedUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
        return addSecurityHeaders(result);
      }

      default:
        throw new Error(`Invalid endpoint: ${endpoint}`);
    }

  } catch (error) {
    console.error('Google Maps proxy error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
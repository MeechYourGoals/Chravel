import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";
import { validateAndSanitizeInput, checkRateLimit, addSecurityHeaders } from "../_shared/security.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

serve(async (req) => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createOptionsResponse();
  }

  try {
    // 🔒 SECURITY: Verify JWT authentication to prevent quota abuse
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Unauthorized - authentication required', 401);
    }

    // Create authenticated client to verify user
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return createErrorResponse('Unauthorized - invalid or expired token', 401);
    }

    // Rate limiting (per user instead of IP for better security)
    const rateLimit = checkRateLimit(user.id, 100, 60000);
    
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
        
        const { query, location, language, region, type } = validation.sanitized!;
        if (!query) {
          throw new Error('Query parameter is required');
        }

        console.log('Text Search request:', { query, location, language, region, type });
        
        // Use Places API Text Search (supports natural language)
        // Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
        let apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
        
        // Optional: Add location bias if provided (prioritizes results near this location)
        if (location) {
          apiUrl += `&location=${location}&radius=50000`; // 50km radius
        }
        
        // Optional: Language for localized results (e.g., 'en', 'es', 'fr')
        if (language) {
          apiUrl += `&language=${language}`;
        }
        
        // Optional: Region biasing (ccTLD format, e.g., 'us', 'uk', 'fr')
        if (region) {
          apiUrl += `&region=${region}`;
        }
        
        // Optional: Type filter (e.g., 'restaurant', 'lodging', 'stadium')
        if (type) {
          apiUrl += `&type=${type}`;
        }
        
        const apiResponse = await fetch(apiUrl);
        const apiData = await apiResponse.json();
        
        // Enhanced error handling for API responses
        if (apiData.status === 'REQUEST_DENIED') {
          console.error('Google Maps API request denied:', apiData.error_message);
          throw new Error(`API access denied: ${apiData.error_message}`);
        }
        
        if (apiData.status === 'OVER_QUERY_LIMIT') {
          console.error('Google Maps API quota exceeded');
          throw new Error('API quota exceeded - please try again later');
        }
        
        console.log('Text Search API response:', {
          status: apiData.status,
          resultCount: apiData.results?.length || 0,
          firstResult: apiData.results?.[0]?.name
        });
        
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
import { supabase } from '@/integrations/supabase/client';

export class GoogleMapsService {
  private static async callProxy(endpoint: string, data: any) {
    const { data: result, error } = await supabase.functions.invoke('google-maps-proxy', {
      body: { endpoint, ...data },
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Google Maps proxy error:', error);
      }
      throw new Error(`Google Maps API error: ${error.message}`);
    }

    if (!result) {
      throw new Error('No response from Google Maps service');
    }

    return result;
  }

  static async getEmbedUrl(query: string): Promise<string> {
    const result = await this.callProxy('embed-url', { query });
    return result.embedUrl;
  }

  static async getDistanceMatrix(
    origins: string,
    destinations: string,
    mode: string = 'DRIVING'
  ): Promise<any> {
    return await this.callProxy('distance-matrix', {
      origins,
      destinations,
      mode
    });
  }

  static async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const result = await this.callProxy('geocode', { address });
      
      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry?.location;
        if (location && location.lat && location.lng) {
          return {
            lat: location.lat,
            lng: location.lng
          };
        }
      }
      
      return null;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Geocoding error:', error);
      }
      return null;
    }
  }

  static async getPlaceAutocomplete(input: string, types: string[] = ['establishment', 'geocode']): Promise<any> {
    try {
      return await this.callProxy('autocomplete', { 
        input,
        types: types.join('|')
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Autocomplete error:', error);
      }
      return { predictions: [] };
    }
  }

  static async getPlaceDetailsById(placeId: string): Promise<any> {
    try {
      return await this.callProxy('place-details', { placeId });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Place details error:', error);
      }
      return null;
    }
  }

  static async searchPlacesNearBasecamp(
    query: string,
    basecampCoords: { lat: number; lng: number },
    radius: number = 5000
  ): Promise<any> {
    return await this.callProxy('places-search', {
      query,
      location: `${basecampCoords.lat},${basecampCoords.lng}`,
      radius
    });
  }

  static async getPlaceDetails(placeId: string): Promise<any> {
    return await this.callProxy('place-details', { placeId });
  }

  /**
   * Build stable embeddable Google Maps URL
   * Uses www.google.com (more stable) with keyless embed or Embed API v1 if key present
   */
  static buildEmbeddableUrl(
    basecampAddress?: string,
    coords?: { lat: number; lng: number },
    destination?: string
  ): string {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      // With API key: use official Embed API v1 (more stable)
      if (apiKey && apiKey !== 'placeholder') {
        if (destination && basecampAddress) {
          const origin = encodeURIComponent(basecampAddress);
          const dest = encodeURIComponent(destination);
          return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${origin}&destination=${dest}`;
        }

        if (basecampAddress) {
          const query = encodeURIComponent(basecampAddress);
          return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}`;
        }

        if (coords) {
          return `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${coords.lat},${coords.lng}&zoom=12&maptype=roadmap`;
        }

        // Fallback: NYC
        return `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=40.7580,-73.9855&zoom=12&maptype=roadmap`;
      }

      // Without API key: use keyless embed (www.google.com is more stable than maps.google.com)
      if (destination && basecampAddress) {
        const s = encodeURIComponent(basecampAddress);
        const d = encodeURIComponent(destination);
        return `https://www.google.com/maps?output=embed&saddr=${s}&daddr=${d}`;
      }

      if (basecampAddress) {
        const q = encodeURIComponent(basecampAddress);
        return `https://www.google.com/maps?output=embed&q=${q}`;
      }

      if (coords) {
        return `https://www.google.com/maps?output=embed&ll=${coords.lat},${coords.lng}&z=12`;
      }

      // Fallback: NYC default
      return `https://www.google.com/maps?output=embed&ll=40.7580,-73.9855&z=12`;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[GoogleMapsService] ❌ Error building URL, using emergency fallback:', error);
      }
      // Emergency fallback - guaranteed to work without API key
      return 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d25211418.31451683!2d-95.665!3d37.6!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1234567890!5m2!1sen!2sus';
    }
  }


  /**
   * Text Search for natural language queries
   * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
   * 
   * @param query - Natural language search query (e.g., "Mercedes-Benz Stadium Atlanta")
   * @param options - Optional parameters for location bias, language, region, type filtering
   * @returns Text Search API response with places array
   */
  static async searchPlacesByText(
    query: string, 
    options?: {
      location?: string;      // Lat,lng for location bias (e.g., "33.7554,-84.4008")
      language?: string;      // Language code (e.g., "en", "es", "fr")
      region?: string;        // Region bias ccTLD (e.g., "us", "uk", "fr")
      type?: string;          // Place type filter (e.g., "restaurant", "lodging")
    }
  ): Promise<any> {
    try {
      // Auto-detect browser language if not provided
      const language = options?.language || navigator.language.split('-')[0];
      
      return await this.callProxy('text-search', { 
        query,
        language,
        ...(options?.location && { location: options.location }),
        ...(options?.region && { region: options.region }),
        ...(options?.type && { type: options.type })
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Text search error:', error);
      }
      return { results: [], status: 'ZERO_RESULTS' };
    }
  }

  // New: Query type detection
  static detectQueryType(query: string): 'venue' | 'address' | 'region' {
    // Address pattern: number + street name
    if (/\d+\s+\w+\s+(st|street|ave|avenue|blvd|road|rd|drive|dr|lane|ln|way|court|ct)/i.test(query)) {
      return 'address';
    }
    
    // Region pattern: city/country keywords
    if (/(city|town|village|region|state|country|province)/i.test(query)) {
      return 'region';
    }
    
    // Venue pattern: no numbers, or has business keywords
    if (!/\d/.test(query) || /(restaurant|hotel|bar|cafe|club|lounge|stadium|arena|theater|museum|scandallo|scandalo)/i.test(query)) {
      return 'venue';
    }
    
    // Default: venue (most common for basecamp use case)
    return 'venue';
  }
}
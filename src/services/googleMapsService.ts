import { supabase } from '@/integrations/supabase/client';
import { getGoogleMapsApiKey } from '@/config/maps';

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
   * Build embeddable Google Maps URL - ALWAYS uses free keyless format
   * The keyless embed format works without any API key or billing enabled
   */
  static buildEmbeddableUrl(
    basecampAddress?: string,
    coords?: { lat: number; lng: number },
    destination?: string
  ): string {
    try {
      // Always use keyless embed format - it's free and doesn't require API enablement
      const baseUrl = 'https://www.google.com/maps';
      
      // If we have a destination, show directions
      if (destination && basecampAddress) {
        const s = encodeURIComponent(basecampAddress);
        const d = encodeURIComponent(destination);
        return `${baseUrl}?output=embed&saddr=${s}&daddr=${d}`;
      }

      // If we have an address, show that location
      if (basecampAddress) {
        const q = encodeURIComponent(basecampAddress);
        return `${baseUrl}?output=embed&q=${q}`;
      }

      // If we have coordinates, show that location
      if (coords) {
        return `${baseUrl}?output=embed&ll=${coords.lat},${coords.lng}&z=15`;
      }

      // Default: show world map centered on US
      return `${baseUrl}/embed?pb=!1m14!1m12!1m3!1d25211418.31451683!2d-95.665!3d37.6!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus`;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[GoogleMapsService] ❌ Error building URL, using emergency fallback:', error);
      }
      // Emergency fallback - guaranteed to work without API key
      return 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d25211418.31451683!2d-95.665!3d37.6!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus';
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
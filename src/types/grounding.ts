// TypeScript interfaces for Google Maps Grounding feature

export interface GroundingChunk {
  id: string;
  web?: {
    title: string;
    uri: string;
    snippet: string;
  };
}

export interface GroundingMetadata {
  groundingChunks: GroundingChunk[];
  googleMapsWidgetContextToken?: string;
}

export interface GroundingCitation {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: 'google_maps_grounding' | 'web' | 'other';
}

export interface ChatMessageWithGrounding {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  sources?: GroundingCitation[];
  googleMapsWidget?: string;
}

export interface PlaceGroundingData {
  name: string;
  address?: string;
  enrichedInfo: string;
  googleMapsUrl: string | null;
  verification: 'verified_by_google' | 'unverified';
  lastUpdated: string;
}

export interface PlaceGroundingRequest {
  placeName: string;
  placeAddress?: string;
  basecampLat?: number;
  basecampLng?: number;
}

export interface PlaceGroundingResponse {
  success: boolean;
  placeData: PlaceGroundingData;
  groundingSources: number;
}

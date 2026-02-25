export interface UserAccommodation {
  id: string;
  trip_id: string;
  user_id: string;
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAccommodationRequest {
  trip_id: string;
  label?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
}

export interface UpdateAccommodationRequest {
  label?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
}

export interface TripBasecamp {
  id: string;
  trip_id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  address: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LocationContext {
  trip_basecamp?: {
    name: string;
    address: string;
    lat?: number;
    lng?: number;
  };
  user_accommodation?: {
    label: string;
    address: string;
    lat?: number;
    lng?: number;
  };
}

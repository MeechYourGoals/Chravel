import { create } from 'zustand';

export interface UserLocation {
  user_id: string;
  trip_id: string;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  updated_at: string;
  user_name?: string;
  user_avatar?: string;
}

interface LocationState {
  locations: Record<string, UserLocation>; // keyed by user_id
  isSubscribed: boolean;
  lastUpdate: number;
}

interface LocationActions {
  updateLocation: (location: UserLocation) => void;
  removeLocation: (userId: string) => void;
  clearLocations: () => void;
  setSubscribed: (subscribed: boolean) => void;
  getLocationsByTrip: (tripId: string) => UserLocation[];
}

export const useLocationStore = create<LocationState & LocationActions>((set, get) => ({
  locations: {},
  isSubscribed: false,
  lastUpdate: 0,

  updateLocation: location =>
    set(state => ({
      locations: {
        ...state.locations,
        [location.user_id]: location,
      },
      lastUpdate: Date.now(),
    })),

  removeLocation: userId =>
    set(state => {
      const { [userId]: removed, ...remaining } = state.locations;
      return {
        locations: remaining,
        lastUpdate: Date.now(),
      };
    }),

  clearLocations: () =>
    set(() => ({
      locations: {},
      lastUpdate: Date.now(),
    })),

  setSubscribed: subscribed =>
    set(() => ({
      isSubscribed: subscribed,
    })),

  getLocationsByTrip: tripId => {
    const { locations } = get();
    return Object.values(locations).filter((location: UserLocation) => location.trip_id === tripId);
  },
}));

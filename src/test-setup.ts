import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';
import { setupTestMocks, googlePlacesMock } from './__tests__/utils/mockSetup';
import { supabaseMockHelpers } from './__tests__/utils/supabaseMocks';

setupTestMocks();

const createMockGoogleMaps = () => {
  const mapInstance = {
    setCenter: vi.fn(),
    setZoom: vi.fn(),
    fitBounds: vi.fn(),
    panTo: vi.fn(),
    addListener: vi.fn(() => ({ remove: vi.fn() })),
    getCenter: vi.fn(() => ({ lat: () => 0, lng: () => 0 })),
  };

  class MockMap {
    constructor() {
      return mapInstance as unknown as google.maps.Map;
    }
  }

  class MockLatLng {
    private _lat: number;
    private _lng: number;

    constructor(lat: number, lng: number) {
      this._lat = lat;
      this._lng = lng;
    }

    lat() {
      return this._lat;
    }

    lng() {
      return this._lng;
    }
  }

  class MockLatLngBounds {
    extend() {
      return this;
    }
  }

  class MockPolyline {
    setMap = vi.fn();
  }

  class MockMarker {
    setMap = vi.fn();
  }

  class MockDirectionsService {
    route = vi.fn().mockResolvedValue({ routes: [] });
  }

  return {
    Map: MockMap,
    Marker: MockMarker,
    Polyline: MockPolyline,
    LatLng: MockLatLng,
    LatLngBounds: MockLatLngBounds,
    DirectionsService: MockDirectionsService,
    TravelMode: { DRIVING: 'DRIVING' },
    Animation: { DROP: 'DROP' },
    SymbolPath: { CIRCLE: 'CIRCLE' },
    event: { removeListener: vi.fn() },
  };
};

const mockMaps = createMockGoogleMaps();
globalThis.google = { maps: mockMaps } as typeof google;
Object.defineProperty(window, 'google', {
  value: globalThis.google,
  configurable: true,
});
googlePlacesMock.loadMaps.mockResolvedValue(mockMaps);

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock MutationObserver (used by MapCanvas)
global.MutationObserver = class MutationObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
} as any;

// Mock navigator.geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn((success: PositionCallback) =>
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition),
    ),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  },
  configurable: true,
});

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = vi.fn();
}

beforeEach(() => {
  supabaseMockHelpers.clearMocks();
});

import { ProTripData } from '../types/pro';

// 🚀 OPTIMIZATION: Dynamic import mapping - only loads the specific trip data needed
const tripImportMap: Record<string, () => Promise<{ [key: string]: ProTripData }>> = {
  'lakers-road-trip': () => import('./pro-trips/lakersRoadTrip').then(m => ({ lakersRoadTrip: m.lakersRoadTrip })),
  'beyonce-cowboy-carter-tour': () => import('./pro-trips/beyonceCowboyCarterTour').then(m => ({ beyonceCowboyCarterTour: m.beyonceCowboyCarterTour })),
  'eli-lilly-c-suite-retreat-2026': () => import('./pro-trips/eliLillyCsuiteRetreat').then(m => ({ eliLillyCsuiteRetreat: m.eliLillyCsuiteRetreat })),
  'paul-george-elite-aau-nationals-2025': () => import('./pro-trips/paulGeorgeEliteAau').then(m => ({ paulGeorgeEliteAau: m.paulGeorgeEliteAau })),
  'osu-notredame-2025': () => import('./pro-trips/ohioStateNotreDame').then(m => ({ ohioStateNotreDame: m.ohioStateNotreDame })),
  'unc-lax-2025': () => import('./pro-trips/uncMensLacrosse').then(m => ({ uncMensLacrosse: m.uncMensLacrosse })),
  'a16z-speedrun-2026': () => import('./pro-trips/yCombinatorCohort').then(m => ({ yCombinatorCohort: m.yCombinatorCohort })),
  'kai-druski-jake-adin-24hr-atl': () => import('./pro-trips/kaiDruskiStream').then(m => ({ kaiDruskiStream: m.kaiDruskiStream })),
  'tesla-cybertruck-roadshow-2025': () => import('./pro-trips/teslaCybertruckRoadshow').then(m => ({ teslaCybertruckRoadshow: m.teslaCybertruckRoadshow })),
  'postmalone-jellyroll-tour-2026': () => import('./pro-trips/postMaloneJellyRollTour').then(m => ({ postMaloneJellyRollTour: m.postMaloneJellyRollTour })),
  'gs-campus-gt-2025': () => import('./pro-trips/goldmanSachsRecruiting').then(m => ({ goldmanSachsRecruiting: m.goldmanSachsRecruiting })),
  'nvidia-bowling-2025': () => import('./pro-trips/nvidiaBowlingNight').then(m => ({ nvidiaBowlingNight: m.nvidiaBowlingNight })),
};

// Export available trip IDs for validation
export const availableProTripIds = Object.keys(tripImportMap);

// Dynamic loader function - loads only the requested trip data
export async function loadProTripData(tripId: string): Promise<ProTripData | null> {
  const loader = tripImportMap[tripId];
  if (!loader) {
    console.error(`[ProTrip] Unknown trip ID: ${tripId}`);
    return null;
  }

  try {
    const module = await loader();
    const tripData = Object.values(module)[0];
    return tripData;
  } catch (error) {
    console.error(`[ProTrip] Failed to load trip data for ${tripId}:`, error);
    return null;
  }
}

// Legacy synchronous export - kept for backward compatibility but logs warning
// This will eventually be removed in favor of loadProTripData
export const proTripMockData: Record<string, ProTripData> = new Proxy({} as Record<string, ProTripData>, {
  get(target, prop: string) {
    console.warn(`[ProTrip] Synchronous access to proTripMockData['${prop}'] is deprecated. Use loadProTripData() instead.`);
    return target[prop];
  }
});

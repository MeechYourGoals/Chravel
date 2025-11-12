
import { ProTripData } from '../types/pro';
import { lakersRoadTrip } from './pro-trips/lakersRoadTrip';
import { beyonceCowboyCarterTour } from './pro-trips/beyonceCowboyCarterTour';
import { eliLillyCsuiteRetreat } from './pro-trips/eliLillyCsuiteRetreat';
import { paulGeorgeEliteAau } from './pro-trips/paulGeorgeEliteAau';
import { ohioStateNotreDame } from './pro-trips/ohioStateNotreDame';
import { uncMensLacrosse } from './pro-trips/uncMensLacrosse';
import { yCombinatorCohort } from './pro-trips/yCombinatorCohort';
import { kaiDruskiStream } from './pro-trips/kaiDruskiStream';
import { teslaCybertruckRoadshow } from './pro-trips/teslaCybertruckRoadshow';
import { postMaloneJellyRollTour } from './pro-trips/postMaloneJellyRollTour';
import { goldmanSachsRecruiting } from './pro-trips/goldmanSachsRecruiting';
import { nvidiaBowlingNight } from './pro-trips/nvidiaBowlingNight';

export const proTripMockData: Record<string, ProTripData> = {
  'lakers-road-trip': lakersRoadTrip,
  'beyonce-cowboy-carter-tour': beyonceCowboyCarterTour,
  'eli-lilly-c-suite-retreat-2026': eliLillyCsuiteRetreat,
  'paul-george-elite-aau-nationals-2025': paulGeorgeEliteAau,
  'osu-notredame-2025': ohioStateNotreDame,
  'unc-lax-2025': uncMensLacrosse,
  'a16z-speedrun-2026': yCombinatorCohort,
  'kai-druski-jake-adin-24hr-atl': kaiDruskiStream,
  'tesla-cybertruck-roadshow-2025': teslaCybertruckRoadshow,
  'postmalone-jellyroll-tour-2026': postMaloneJellyRollTour,
  'gs-campus-gt-2025': goldmanSachsRecruiting,
  'nvidia-bowling-2025': nvidiaBowlingNight
};

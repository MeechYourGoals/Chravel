import cancunSpringBreakCover from '@/assets/trip-covers/cancun-spring-break.webp';
import tokyoAdventureCover from '@/assets/trip-covers/tokyo-adventure.webp';
import baliWeddingCover from '@/assets/trip-covers/bali-destination-wedding.webp';
import nashvilleBacheloretteCover from '@/assets/trip-covers/nashville-bachelorette.webp';
import coachellaFestivalCover from '@/assets/trip-covers/coachella-festival.webp';
import dubaiBirthdayCover from '@/assets/trip-covers/dubai-birthday-cameron-knight.webp';
import phoenixGolfCover from '@/assets/trip-covers/phoenix-golf-outing.webp';
import tulumWellnessCover from '@/assets/trip-covers/tulum-yoga-wellness.webp';
import napaWineCover from '@/assets/trip-covers/napa-wine-getaway.webp';
import aspenCorporateSkiCover from '@/assets/trip-covers/aspen-corporate-ski.webp';
import disneyCruiseCover from '@/assets/trip-covers/disney-family-cruise.webp';
import yellowstoneHikingCover from '@/assets/trip-covers/yellowstone-hiking-group.webp';

const DEMO_TRIP_COVER_FALLBACKS: Record<string, string> = {
  '1': cancunSpringBreakCover,
  '2': tokyoAdventureCover,
  '3': baliWeddingCover,
  '4': nashvilleBacheloretteCover,
  '5': coachellaFestivalCover,
  '6': dubaiBirthdayCover,
  '7': phoenixGolfCover,
  '8': tulumWellnessCover,
  '9': napaWineCover,
  '10': aspenCorporateSkiCover,
  '11': disneyCruiseCover,
  '12': yellowstoneHikingCover,
};

export function getDemoTripCoverFallback(tripId: number | string): string | undefined {
  return DEMO_TRIP_COVER_FALLBACKS[String(tripId)];
}

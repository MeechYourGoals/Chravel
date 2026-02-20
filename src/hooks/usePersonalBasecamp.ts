import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { basecampService, PersonalBasecamp } from '@/services/basecampService';
import { demoModeService } from '@/services/demoModeService';

export const personalBasecampKeys = {
  all: ['personalBasecamp'] as const,
  tripUser: (tripId: string, userId: string) =>
    [...personalBasecampKeys.all, tripId, userId] as const,
};

/**
 * ⚡ TanStack Query hook for personal basecamp
 *
 * Replaces the sequential useEffect in PlacesSection so that
 * trip basecamp and personal basecamp load in parallel.
 */
export const usePersonalBasecamp = (tripId: string) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();

  const effectiveUserId =
    user?.id ||
    (() => {
      let demoId = sessionStorage.getItem('demo-user-id');
      if (!demoId) {
        demoId = `demo-user-${Date.now()}`;
        sessionStorage.setItem('demo-user-id', demoId);
      }
      return demoId;
    })();

  return useQuery<PersonalBasecamp | null>({
    queryKey: personalBasecampKeys.tripUser(tripId, effectiveUserId),
    queryFn: async () => {
      if (isDemoMode) {
        return demoModeService.getSessionPersonalBasecamp(tripId, effectiveUserId) ?? null;
      }
      if (user) {
        return await basecampService.getPersonalBasecamp(tripId, user.id);
      }
      return null;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

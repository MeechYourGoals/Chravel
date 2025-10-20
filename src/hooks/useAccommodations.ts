import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PersonalAccommodationService } from '@/services/personalAccommodationService';
import { CreateAccommodationRequest, UpdateAccommodationRequest } from '@/types/accommodations';
import { useAuth } from './useAuth';

export const useAccommodations = (tripId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's personal accommodation
  const { data: myAccommodation, isLoading: isLoadingAccommodation } = useQuery({
    queryKey: ['accommodation', tripId, user?.id],
    queryFn: () => PersonalAccommodationService.getMyAccommodation(tripId),
    enabled: !!user && !!tripId,
  });

  // Get trip basecamp
  const { data: tripBasecamp, isLoading: isLoadingBasecamp } = useQuery({
    queryKey: ['tripBasecamp', tripId],
    queryFn: () => PersonalAccommodationService.getTripBasecamp(tripId),
    enabled: !!tripId,
  });

  // Create/Update accommodation mutation
  const saveAccommodationMutation = useMutation({
    mutationFn: (request: CreateAccommodationRequest) => 
      PersonalAccommodationService.saveAccommodation(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodation', tripId, user?.id] });
    },
  });

  // Update accommodation mutation
  const updateAccommodationMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateAccommodationRequest }) =>
      PersonalAccommodationService.updateAccommodation(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodation', tripId, user?.id] });
    },
  });

  // Delete accommodation mutation
  const deleteAccommodationMutation = useMutation({
    mutationFn: (accommodationId: string) =>
      PersonalAccommodationService.deleteAccommodation(accommodationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodation', tripId, user?.id] });
    },
  });

  // Update trip basecamp mutation
  const updateBasecampMutation = useMutation({
    mutationFn: ({ name, address, latitude, longitude }: {
      name: string;
      address: string;
      latitude?: number;
      longitude?: number;
    }) => PersonalAccommodationService.updateTripBasecamp(tripId, name, address, latitude, longitude),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripBasecamp', tripId] });
    },
  });

  return {
    // Data
    myAccommodation,
    tripBasecamp,
    
    // Loading states
    isLoadingAccommodation,
    isLoadingBasecamp,
    isLoading: isLoadingAccommodation || isLoadingBasecamp,
    
    // Mutations
    saveAccommodation: saveAccommodationMutation.mutate,
    updateAccommodation: updateAccommodationMutation.mutate,
    deleteAccommodation: deleteAccommodationMutation.mutate,
    updateBasecamp: updateBasecampMutation.mutate,
    
    // Mutation states
    isSaving: saveAccommodationMutation.isPending,
    isUpdating: updateAccommodationMutation.isPending,
    isDeleting: deleteAccommodationMutation.isPending,
    isUpdatingBasecamp: updateBasecampMutation.isPending,
    
    // Errors
    saveError: saveAccommodationMutation.error,
    updateError: updateAccommodationMutation.error,
    deleteError: deleteAccommodationMutation.error,
    basecampError: updateBasecampMutation.error,
  };
};
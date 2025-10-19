import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { personalAccommodationService, PersonalAccommodation, CreateAccommodationRequest } from '../services/personalAccommodationService';
import { useAuth } from './useAuth';

export const useAccommodations = (tripId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's personal accommodation
  const {
    data: personalAccommodation,
    isLoading: isLoadingPersonal,
    error: personalError
  } = useQuery({
    queryKey: ['personalAccommodation', tripId, user?.id],
    queryFn: () => personalAccommodationService.getUserAccommodation(tripId, user?.id),
    enabled: !!tripId && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get all accommodations for the trip
  const {
    data: tripAccommodations,
    isLoading: isLoadingTrip,
    error: tripError
  } = useQuery({
    queryKey: ['tripAccommodations', tripId],
    queryFn: () => personalAccommodationService.getTripAccommodations(tripId),
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get accommodation statistics
  const {
    data: accommodationStats,
    isLoading: isLoadingStats
  } = useQuery({
    queryKey: ['accommodationStats', tripId],
    queryFn: () => personalAccommodationService.getTripAccommodationStats(tripId),
    enabled: !!tripId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation for setting user accommodation
  const setAccommodationMutation = useMutation({
    mutationFn: (request: CreateAccommodationRequest) =>
      personalAccommodationService.setUserAccommodation(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalAccommodation', tripId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['tripAccommodations', tripId] });
      queryClient.invalidateQueries({ queryKey: ['accommodationStats', tripId] });
    },
  });

  // Mutation for updating user accommodation
  const updateAccommodationMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PersonalAccommodation> }) =>
      personalAccommodationService.updateUserAccommodation(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalAccommodation', tripId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['tripAccommodations', tripId] });
    },
  });

  // Mutation for deleting user accommodation
  const deleteAccommodationMutation = useMutation({
    mutationFn: (accommodationId: string) =>
      personalAccommodationService.deleteUserAccommodation(accommodationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalAccommodation', tripId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['tripAccommodations', tripId] });
      queryClient.invalidateQueries({ queryKey: ['accommodationStats', tripId] });
    },
  });

  // Helper functions
  const setAccommodation = (request: CreateAccommodationRequest) => {
    return setAccommodationMutation.mutateAsync(request);
  };

  const updateAccommodation = (id: string, updates: Partial<PersonalAccommodation>) => {
    return updateAccommodationMutation.mutateAsync({ id, updates });
  };

  const deleteAccommodation = (id: string) => {
    return deleteAccommodationMutation.mutateAsync(id);
  };

  // Get accommodations near a location
  const getAccommodationsNearLocation = async (latitude: number, longitude: number, radiusKm?: number) => {
    return personalAccommodationService.getAccommodationsNearLocation(latitude, longitude, radiusKm);
  };

  return {
    // Data
    personalAccommodation,
    tripAccommodations,
    accommodationStats,
    
    // Loading states
    isLoadingPersonal,
    isLoadingTrip,
    isLoadingStats,
    isLoading: isLoadingPersonal || isLoadingTrip || isLoadingStats,
    
    // Errors
    personalError,
    tripError,
    
    // Mutations
    setAccommodation,
    updateAccommodation,
    deleteAccommodation,
    
    // Mutation states
    isSettingAccommodation: setAccommodationMutation.isPending,
    isUpdatingAccommodation: updateAccommodationMutation.isPending,
    isDeletingAccommodation: deleteAccommodationMutation.isPending,
    
    // Helper functions
    getAccommodationsNearLocation,
    
    // Refetch functions
    refetchPersonal: () => queryClient.invalidateQueries({ queryKey: ['personalAccommodation', tripId, user?.id] }),
    refetchTrip: () => queryClient.invalidateQueries({ queryKey: ['tripAccommodations', tripId] }),
    refetchStats: () => queryClient.invalidateQueries({ queryKey: ['accommodationStats', tripId] }),
  };
};

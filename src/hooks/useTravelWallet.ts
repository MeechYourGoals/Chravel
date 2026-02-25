import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  travelWalletService,
  AirlineProgram,
  HotelProgram,
  RentalProgram,
} from '@/services/travelWalletService';
import { toast } from 'sonner';

export const useTravelWallet = (userId: string) => {
  const queryClient = useQueryClient();

  // Airlines
  const { data: airlines = [], isLoading: airlinesLoading } = useQuery({
    queryKey: ['loyalty-airlines', userId],
    queryFn: () => travelWalletService.listAirlines(userId),
    enabled: !!userId,
  });

  const addAirline = useMutation({
    mutationFn: (program: Omit<AirlineProgram, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
      travelWalletService.addAirline(userId, program),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-airlines', userId] });
      toast.success('Airline program added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add airline program');
    },
  });

  const updateAirline = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AirlineProgram> }) =>
      travelWalletService.updateAirline(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-airlines', userId] });
      toast.success('Airline program updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update airline program');
    },
  });

  const deleteAirline = useMutation({
    mutationFn: (id: string) => travelWalletService.deleteAirline(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-airlines', userId] });
      toast.success('Airline program deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete airline program');
    },
  });

  // Hotels
  const { data: hotels = [], isLoading: hotelsLoading } = useQuery({
    queryKey: ['loyalty-hotels', userId],
    queryFn: () => travelWalletService.listHotels(userId),
    enabled: !!userId,
  });

  const addHotel = useMutation({
    mutationFn: (program: Omit<HotelProgram, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
      travelWalletService.addHotel(userId, program),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-hotels', userId] });
      toast.success('Hotel program added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add hotel program');
    },
  });

  const updateHotel = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<HotelProgram> }) =>
      travelWalletService.updateHotel(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-hotels', userId] });
      toast.success('Hotel program updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update hotel program');
    },
  });

  const deleteHotel = useMutation({
    mutationFn: (id: string) => travelWalletService.deleteHotel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-hotels', userId] });
      toast.success('Hotel program deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete hotel program');
    },
  });

  // Rentals
  const { data: rentals = [], isLoading: rentalsLoading } = useQuery({
    queryKey: ['loyalty-rentals', userId],
    queryFn: () => travelWalletService.listRentals(userId),
    enabled: !!userId,
  });

  const addRental = useMutation({
    mutationFn: (program: Omit<RentalProgram, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
      travelWalletService.addRental(userId, program),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-rentals', userId] });
      toast.success('Rental program added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add rental program');
    },
  });

  const updateRental = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<RentalProgram> }) =>
      travelWalletService.updateRental(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-rentals', userId] });
      toast.success('Rental program updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update rental program');
    },
  });

  const deleteRental = useMutation({
    mutationFn: (id: string) => travelWalletService.deleteRental(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-rentals', userId] });
      toast.success('Rental program deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete rental program');
    },
  });

  return {
    airlines,
    airlinesLoading,
    addAirline,
    updateAirline,
    deleteAirline,
    hotels,
    hotelsLoading,
    addHotel,
    updateHotel,
    deleteHotel,
    rentals,
    rentalsLoading,
    addRental,
    updateRental,
    deleteRental,
  };
};

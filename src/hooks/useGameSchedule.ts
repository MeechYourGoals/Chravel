import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gameScheduleService } from '@/services/gameScheduleService';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useGameSchedule = (organizationId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['game-schedules', organizationId],
    queryFn: () => gameScheduleService.list(organizationId!),
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: (game: any) =>
      gameScheduleService.create({
        ...game,
        organization_id: organizationId!,
        created_by: user!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-schedules'] });
      toast.success('Game added successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to add game: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      gameScheduleService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-schedules'] });
      toast.success('Game updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update game: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => gameScheduleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-schedules'] });
      toast.success('Game deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete game: ${error.message}`);
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (games: any[]) =>
      gameScheduleService.bulkCreate(
        games.map(g => ({
          ...g,
          organization_id: organizationId!,
          created_by: user!.id,
        })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-schedules'] });
      toast.success('Games imported successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to import games: ${error.message}`);
    },
  });

  return {
    games,
    isLoading,
    createGame: createMutation.mutate,
    updateGame: updateMutation.mutate,
    deleteGame: deleteMutation.mutate,
    bulkCreateGames: bulkCreateMutation.mutate,
  };
};

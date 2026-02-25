import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showScheduleService } from '@/services/showScheduleService';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useShowSchedule = (organizationId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: shows = [], isLoading } = useQuery({
    queryKey: ['show-schedules', organizationId],
    queryFn: () => showScheduleService.list(organizationId!),
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: (show: any) =>
      showScheduleService.create({
        ...show,
        organization_id: organizationId!,
        created_by: user!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show-schedules'] });
      toast.success('Show added successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to add show: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      showScheduleService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show-schedules'] });
      toast.success('Show updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update show: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => showScheduleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show-schedules'] });
      toast.success('Show deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete show: ${error.message}`);
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (shows: any[]) =>
      showScheduleService.bulkCreate(
        shows.map(s => ({
          ...s,
          organization_id: organizationId!,
          created_by: user!.id,
        })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show-schedules'] });
      toast.success('Shows imported successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to import shows: ${error.message}`);
    },
  });

  return {
    shows,
    isLoading,
    createShow: createMutation.mutate,
    updateShow: updateMutation.mutate,
    deleteShow: deleteMutation.mutate,
    bulkCreateShows: bulkCreateMutation.mutate,
  };
};

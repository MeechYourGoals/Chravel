import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { TaskList } from './TaskList';
import { TaskFilters } from './TaskFilters';
import { TaskCreateModal } from './TaskCreateModal';
import { useTripTasks } from '../../hooks/useTripTasks';
import { useTripVariant } from '../../contexts/TripVariantContext';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useToast } from '@/hooks/use-toast';

interface TripTasksTabProps {
  tripId: string;
}

export const TripTasksTab = ({ tripId }: TripTasksTabProps) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const { toast } = useToast();
  const { accentColors } = useTripVariant();
  const {
    tasks,
    isLoading,
    applyFilters,
    status,
    setStatus,
    assignee,
    setAssignee,
    dateRange,
    setDateRange,
    sortBy,
    setSortBy,
    hasActiveFilters,
    clearFilters,
  } = useTripTasks(tripId);
  const { isDemoMode } = useDemoMode();
  const { canPerformAction } = useRolePermissions(tripId);

  // Mock task items for demo
  const mockTasks = [
    {
      id: 'task-1',
      trip_id: tripId,
      title: 'Make sure your visa and passport documents are handled at least one month prior',
      description: 'Verify all travel documents are valid and up to date',
      due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_poll: false,
      task_status: [{ task_id: 'task-1', completed: false, user_id: 'user1' }],
      creator_id: 'trip-organizer',
      created_by: 'Trip Organizer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'task-2',
      trip_id: tripId,
      title: 'Jimmy to purchase alcohol for the house while Sam gets food',
      description: 'Coordinate house supplies for the trip',
      due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      is_poll: false,
      task_status: [{ task_id: 'task-2', completed: true, user_id: 'jimmy' }],
      creator_id: 'marcus',
      created_by: 'Marcus',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'task-3',
      trip_id: tripId,
      title: 'Making sure all clothes are packed before next destination',
      description: 'Pack weather-appropriate clothing for all activities',
      due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      is_poll: false,
      task_status: [{ task_id: 'task-3', completed: false, user_id: 'user1' }],
      creator_id: 'sarah',
      created_by: 'Sarah',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // Use mock tasks if no real tasks are available
  const displayTasks = tasks && tasks.length > 0 ? tasks : isDemoMode ? mockTasks : [];

  // Apply filters
  const filteredTasks = applyFilters(displayTasks);

  const openTasks =
    filteredTasks?.filter(task => {
      if (task.is_poll) {
        const completionRate = task.task_status?.filter(s => s.completed).length || 0;
        const totalRequired = task.task_status?.length || 1;
        return completionRate < totalRequired;
      }
      return !task.task_status?.[0]?.completed;
    }) || [];

  const completedTasks =
    filteredTasks?.filter(task => {
      if (task.is_poll) {
        const completionRate = task.task_status?.filter(s => s.completed).length || 0;
        const totalRequired = task.task_status?.length || 1;
        return completionRate >= totalRequired;
      }
      return task.task_status?.[0]?.completed;
    }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Title Row */}
      <div className="grid grid-cols-1 sm:grid-cols-8 gap-2 items-center">
        <h2 className="text-xl font-semibold text-white sm:col-span-7">Tasks</h2>
        <Button
          onClick={() => setShowCreateModal(true)}
          className={`sm:col-span-1 w-full min-h-[42px] px-3.5 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r ${accentColors.gradient} hover:opacity-90 transition-all duration-200`}
        >
          <Plus size={16} className="flex-shrink-0" />
          <span className="whitespace-nowrap">Add Task</span>
        </Button>
      </div>

      {/* Subtitle + Filters on same row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-gray-400 text-sm">Keep track of everything that needs to get done</p>
        <TaskFilters
          status={status}
          sortBy={sortBy}
          onStatusChange={setStatus}
          onSortChange={setSortBy}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />
      </div>

      {/* Open Tasks */}
      <TaskList
        tasks={openTasks}
        tripId={tripId}
        title="To Do"
        emptyMessage="All caught up! No pending tasks."
        onEditTask={task =>
          toast({
            title: 'Edit Task',
            description: `Editing "${task.title}" - Feature coming soon!`,
          })
        }
      />

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <TaskList
          tasks={completedTasks}
          tripId={tripId}
          title="Completed"
          showCompleted={showCompleted}
          onToggleCompleted={() => setShowCompleted(!showCompleted)}
          onEditTask={task =>
            toast({
              title: 'Edit Task',
              description: `Editing "${task.title}" - Feature coming soon!`,
            })
          }
        />
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <TaskCreateModal tripId={tripId} onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};

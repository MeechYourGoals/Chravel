import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { TaskList } from './TaskList';
import { TaskFilters } from './TaskFilters';
import { TaskCreateModal } from './TaskCreateModal';
import { TasksEmptyState } from './TasksEmptyState';
import { useTripTasks } from '../../hooks/useTripTasks';
import { useTripVariant } from '../../contexts/TripVariantContext';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useRolePermissions } from '@/hooks/useRolePermissions';

interface TripTasksTabProps {
  tripId: string;
}

export const TripTasksTab = ({ tripId }: TripTasksTabProps) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const { accentColors } = useTripVariant();
  const { tasks, isLoading, applyFilters, status, setStatus, assignee, setAssignee, dateRange, setDateRange, sortBy, setSortBy, hasActiveFilters, clearFilters } = useTripTasks(tripId);
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
      updated_at: new Date().toISOString()
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
      updated_at: new Date().toISOString()
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
      updated_at: new Date().toISOString()
    }
  ];

  // Use mock tasks if no real tasks are available
  const displayTasks = tasks && tasks.length > 0 ? tasks : (isDemoMode ? mockTasks : []);
  
  // Apply filters
  const filteredTasks = applyFilters(displayTasks);

  const openTasks = filteredTasks?.filter(task => {
    if (task.is_poll) {
      const completionRate = task.task_status?.filter(s => s.completed).length || 0;
      const totalRequired = task.task_status?.length || 1;
      return completionRate < totalRequired;
    }
    return !task.task_status?.[0]?.completed;
  }) || [];

  const completedTasks = filteredTasks?.filter(task => {
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

  // Show empty state if no tasks at all (neither open nor completed)
  const hasNoTasks = openTasks.length === 0 && completedTasks.length === 0;

  if (hasNoTasks && !isDemoMode) {
    return (
      <div className="space-y-6">
        <TasksEmptyState onCreateTask={() => setShowCreateModal(true)} />
        {showCreateModal && (
          <TaskCreateModal
            tripId={tripId}
            onClose={() => setShowCreateModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Tasks</h2>
          <p className="text-gray-400 text-sm">Keep track of everything that needs to get done</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className={`bg-gradient-to-r ${accentColors.gradient} hover:opacity-90`}
        >
          <Plus size={16} className="mr-2" />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      <TaskFilters
        status={status}
        sortBy={sortBy}
        onStatusChange={setStatus}
        onSortChange={setSortBy}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      {/* Open Tasks */}
      <TaskList
        tasks={openTasks}
        tripId={tripId}
        title="To Do"
        emptyMessage="All caught up! No pending tasks."
      />

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <TaskList
          tasks={completedTasks}
          tripId={tripId}
          title="Completed"
          showCompleted={showCompleted}
          onToggleCompleted={() => setShowCompleted(!showCompleted)}
        />
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <TaskCreateModal
          tripId={tripId}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};
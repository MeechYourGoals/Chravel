import React, { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { TaskSkeleton } from './SkeletonLoader';
import { hapticService } from '../../services/hapticService';
import { TaskCreateModal } from '../todo/TaskCreateModal';
import { useTripTasks } from '../../hooks/useTripTasks';
import { useAuth } from '../../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useDemoMode } from '../../hooks/useDemoMode';
import { SwipeableListItem } from './SwipeableListItem';
import { TripTask } from '../../types/tasks';

interface MobileTripTasksProps {
  tripId: string;
}

export const MobileTripTasks = ({ tripId }: MobileTripTasksProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);

  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  const { tasks, isLoading, toggleTaskMutation, deleteTaskMutation } = useTripTasks(tripId);

  const { isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tripTasks', tripId, isDemoMode] });
    },
  });

  // Helper to check if task is completed by current user
  const isTaskCompleted = (task: TripTask) => {
    if (!user) return false;
    const statusArray = task.task_status || [];
    const userStatus = statusArray.find(s => s.user_id === user.id);
    return userStatus?.completed || false;
  };

  const handleToggleTask = async (taskId: string) => {
    await hapticService.success();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const isCompleted = isTaskCompleted(task);
    toggleTaskMutation.mutate({
      taskId,
      completed: !isCompleted,
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    await hapticService.heavy();
    deleteTaskMutation.mutate(taskId);
  };

  const activeTasks = tasks.filter(t => !isTaskCompleted(t));
  const completedTasks = tasks.filter(t => isTaskCompleted(t));

  return (
    <div className="flex flex-col flex-1 bg-black px-4 py-4 relative min-h-0">
      <PullToRefreshIndicator
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        threshold={80}
      />

      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Trip Tasks</h2>
          <p className="text-sm text-gray-400">
            {activeTasks.length} pending · {completedTasks.length} completed
          </p>
        </div>
        <button
          onClick={async () => {
            await hapticService.medium();
            setIsModalOpen(true);
          }}
          className="p-3 bg-blue-600 rounded-lg active:scale-95 transition-transform"
        >
          <Plus size={20} className="text-white" />
        </button>
      </div>

      {/* Active Tasks */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <TaskSkeleton />
        ) : (
          <div className="space-y-3 mb-6">
            {activeTasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No tasks yet. Tap + to add one!</p>
              </div>
            )}
            {activeTasks.map(task => (
              <SwipeableListItem
                key={task.id}
                onDelete={() => handleDeleteTask(task.id)}
                className="rounded-xl"
              >
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 border-gray-400 flex items-center justify-center active:scale-95 transition-transform"
                    >
                      {isTaskCompleted(task) && <Check size={14} className="text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate">{task.title}</h4>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {task.description && (
                          <span className="text-xs text-gray-400 line-clamp-1 break-words min-w-0">
                            {task.description}
                          </span>
                        )}
                        {task.due_at && (
                          <span className="text-xs text-orange-400 flex-shrink-0">
                            {new Date(task.due_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </SwipeableListItem>
            ))}
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <button
              onClick={async () => {
                await hapticService.light();
                setShowCompleted(!showCompleted);
              }}
              className="flex items-center justify-between w-full mb-3 py-2"
            >
              <h3 className="text-sm font-semibold text-gray-400">
                Completed ({completedTasks.length})
              </h3>
              <span className="text-gray-400">{showCompleted ? '−' : '+'}</span>
            </button>

            {showCompleted && (
              <div className="space-y-3">
                {completedTasks.map(task => (
                  <div key={task.id} className="bg-white/5 rounded-xl p-4 opacity-60">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleTask(task.id)}
                        className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Check size={14} className="text-white" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-gray-300 line-through break-words">{task.title}</h4>
                        {task.description && (
                          <span className="text-xs text-gray-500 line-clamp-1 break-words min-w-0">
                            {task.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Task Modal - Full-featured version */}
      {isModalOpen && <TaskCreateModal tripId={tripId} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

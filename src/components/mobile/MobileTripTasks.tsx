import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, X, Trash2 } from 'lucide-react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { TaskSkeleton } from './SkeletonLoader';
import { hapticService } from '../../services/hapticService';
import { CreateTaskModal } from './CreateTaskModal';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  assignee?: string;
  dueDate?: string;
}

interface MobileTripTasksProps {
  tripId: string;
}

export const MobileTripTasks = ({ tripId }: MobileTripTasksProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Book flights', completed: true, assignee: 'Sarah' },
    { id: '2', title: 'Reserve hotel rooms', completed: false, assignee: 'Mike', dueDate: 'Tomorrow' },
    { id: '3', title: 'Plan day 1 itinerary', completed: false, assignee: 'Alex' }
  ]);
  const [showCompleted, setShowCompleted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [swipedTaskId, setSwipedTaskId] = useState<string | null>(null);

  const { isPulling, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsLoading(false);
    }
  });

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 600);
  }, []);

  const handleToggleTask = async (taskId: string) => {
    await hapticService.success();
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleDeleteTask = async (taskId: string) => {
    await hapticService.heavy();
    setSwipedTaskId(null);
    setTimeout(() => {
      setTasks(tasks.filter(task => task.id !== taskId));
    }, 150);
  };

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="flex flex-col h-full bg-black px-4 py-4 relative">
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
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <TaskSkeleton />
        ) : (
          <div className="space-y-3 mb-6">
            {activeTasks.map((task) => {
              const isSwiped = swipedTaskId === task.id;
              
              return (
                <div
                  key={task.id}
                  className="relative overflow-hidden rounded-xl"
                  onTouchStart={(e) => {
                    const startX = e.touches[0].clientX;
                    const handleTouchMove = (moveEvent: TouchEvent) => {
                      const currentX = moveEvent.touches[0].clientX;
                      const diff = startX - currentX;
                      if (diff > 80) {
                        setSwipedTaskId(task.id);
                        hapticService.light();
                      }
                    };
                    const handleTouchEnd = () => {
                      document.removeEventListener('touchmove', handleTouchMove);
                      document.removeEventListener('touchend', handleTouchEnd);
                    };
                    document.addEventListener('touchmove', handleTouchMove);
                    document.addEventListener('touchend', handleTouchEnd);
                  }}
                  onClick={() => {
                    if (isSwiped) setSwipedTaskId(null);
                  }}
                >
                  {/* Delete button revealed on swipe */}
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 bg-red-500/20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                      }}
                      className="p-3 bg-red-500 rounded-lg"
                    >
                      <Trash2 size={18} className="text-white" />
                    </button>
                  </div>

                  {/* Task content */}
                  <div
                    className={`bg-white/10 rounded-xl p-4 transition-transform ${
                      isSwiped ? '-translate-x-24' : 'translate-x-0'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleTask(task.id)}
                        className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 border-gray-400 flex items-center justify-center active:scale-95 transition-transform"
                      >
                        {task.completed && <Check size={14} className="text-white" />}
                      </button>
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{task.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          {task.assignee && (
                            <span className="text-xs text-gray-400">@{task.assignee}</span>
                          )}
                          {task.dueDate && (
                            <span className="text-xs text-orange-400">{task.dueDate}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white/5 rounded-xl p-4 opacity-60"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleTask(task.id)}
                        className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Check size={14} className="text-white" />
                      </button>
                      <div className="flex-1">
                        <h4 className="text-gray-300 line-through">{task.title}</h4>
                        {task.assignee && (
                          <span className="text-xs text-gray-500">@{task.assignee}</span>
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

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tripId={tripId}
        onTaskCreated={(task) => {
          setTasks(prev => [task, ...prev]);
        }}
      />
    </div>
  );
};

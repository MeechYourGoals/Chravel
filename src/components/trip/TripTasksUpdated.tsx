import React, { useState } from 'react';
import { useTripTasks } from '@/hooks/useTripTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TaskCreateModal } from '@/components/todo/TaskCreateModal';
import { TaskRow } from '@/components/todo/TaskRow';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface TripTasksUpdatedProps {
  tripId: string;
}

export const TripTasksUpdated = ({ tripId }: TripTasksUpdatedProps) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { tasks, isLoading, createTaskMutation, toggleTaskMutation } = useTripTasks(tripId);
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading tasks...</span>
      </div>
    );
  }

  // Helper function to check if current user has completed a task
  const isTaskCompleted = (task: any) => {
    return (
      task.task_status?.some((status: any) => status.user_id === user?.id && status.completed) ||
      false
    );
  };

  const openTasks = tasks.filter(task => !isTaskCompleted(task));
  const completedTasks = tasks.filter(task => isTaskCompleted(task));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open Tasks ({openTasks.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {openTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No open tasks. Add a task to get started!
            </p>
          ) : (
            openTasks.map(task => <TaskRow key={task.id} task={task} tripId={tripId} />)
          )}
        </CardContent>
      </Card>

      {completedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Tasks ({completedTasks.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedTasks.map(task => (
              <TaskRow key={task.id} task={task} tripId={tripId} />
            ))}
          </CardContent>
        </Card>
      )}

      {showCreateModal && (
        <TaskCreateModal tripId={tripId} onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};

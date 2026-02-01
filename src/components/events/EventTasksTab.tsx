import React, { useState } from 'react';
import { ClipboardList, Plus, Trash2, GripVertical, Edit2, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { useToast } from '../../hooks/use-toast';
import { useDemoMode } from '../../hooks/useDemoMode';

interface EventTask {
  id: string;
  title: string;
  description?: string;
  sort_order: number;
}

interface EventTasksTabProps {
  eventId: string;
  isAdmin: boolean;
}

// Demo mode mock tasks
const DEMO_TASKS: EventTask[] = [
  { id: '1', title: 'Pick up your badge at the registration desk', description: 'Located in the main lobby, open from 8:00 AM', sort_order: 0 },
  { id: '2', title: 'Visit the welcome booth for your event kit', description: 'Includes schedule, map, and swag bag', sort_order: 1 },
  { id: '3', title: 'Download the event app for real-time updates', description: 'Use the link provided at registration', sort_order: 2 },
  { id: '4', title: 'Check in for your reserved sessions', description: 'Some sessions require advance check-in', sort_order: 3 },
  { id: '5', title: 'Complete the feedback survey after each session', description: 'Help us improve future events', sort_order: 4 }
];

export const EventTasksTab = ({ eventId, isAdmin }: EventTasksTabProps) => {
  const { isDemoMode } = useDemoMode();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<EventTask[]>(isDemoMode ? DEMO_TASKS : []);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  const [editTask, setEditTask] = useState({ title: '', description: '' });

  const handleAddTask = () => {
    if (!newTask.title.trim()) {
      toast({ title: 'Task title is required', variant: 'destructive' });
      return;
    }

    const task: EventTask = {
      id: Date.now().toString(),
      title: newTask.title.trim(),
      description: newTask.description.trim() || undefined,
      sort_order: tasks.length
    };

    setTasks(prev => [...prev, task]);
    setNewTask({ title: '', description: '' });
    setIsAddingTask(false);
    toast({ title: 'Task added successfully' });
  };

  const handleUpdateTask = (taskId: string) => {
    if (!editTask.title.trim()) {
      toast({ title: 'Task title is required', variant: 'destructive' });
      return;
    }

    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, title: editTask.title.trim(), description: editTask.description.trim() || undefined }
        : t
    ));
    setEditingTaskId(null);
    toast({ title: 'Task updated' });
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    toast({ title: 'Task removed' });
  };

  const startEditing = (task: EventTask) => {
    setEditingTaskId(task.id);
    setEditTask({ title: task.title, description: task.description || '' });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList size={24} className="text-yellow-500" />
          <div>
            <h2 className="text-xl font-semibold text-white">Event Tasks</h2>
            <p className="text-gray-400 text-sm">
              {isAdmin ? 'Manage attendee action items' : 'Things to do at this event'}
            </p>
          </div>
        </div>
        
        {isAdmin && !isAddingTask && (
          <Button
            onClick={() => setIsAddingTask(true)}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold"
          >
            <Plus size={16} className="mr-2" />
            Add Task
          </Button>
        )}
      </div>

      {/* Add Task Form */}
      {isAddingTask && isAdmin && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4 space-y-3">
            <Input
              value={newTask.title}
              onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Task title (e.g., Pick up badge at registration)"
              className="bg-gray-900 border-gray-700 text-white"
            />
            <Textarea
              value={newTask.description}
              onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description or instructions..."
              className="bg-gray-900 border-gray-700 text-white"
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTask({ title: '', description: '' });
                }}
                variant="ghost"
              >
                Cancel
              </Button>
              <Button onClick={handleAddTask} className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold">
                Add Task
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((task, index) => (
            <Card 
              key={task.id} 
              className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors"
            >
              <CardContent className="p-4">
                {editingTaskId === task.id && isAdmin ? (
                  <div className="space-y-3">
                    <Input
                      value={editTask.title}
                      onChange={(e) => setEditTask(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                    <Textarea
                      value={editTask.description}
                      onChange={(e) => setEditTask(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-gray-900 border-gray-700 text-white"
                      rows={2}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={() => setEditingTaskId(null)}
                        variant="ghost"
                        size="sm"
                      >
                        <X size={16} />
                      </Button>
                      <Button
                        onClick={() => handleUpdateTask(task.id)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check size={16} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    {isAdmin && (
                      <div className="text-gray-500 cursor-grab mt-1">
                        <GripVertical size={16} />
                      </div>
                    )}
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center mt-0.5">
                      <span className="text-yellow-500 text-xs font-medium">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium">{task.title}</h3>
                      {task.description && (
                        <p className="text-gray-400 text-sm mt-1">{task.description}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          onClick={() => startEditing(task)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          onClick={() => handleDeleteTask(task.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-12 text-center">
            <ClipboardList size={48} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Tasks Yet</h3>
            <p className="text-gray-400 mb-4">
              {isAdmin 
                ? 'Add tasks for attendees to complete during the event'
                : 'The organizer hasn\'t added any tasks yet'}
            </p>
            {isAdmin && (
              <Button
                onClick={() => setIsAddingTask(true)}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold"
              >
                <Plus size={16} className="mr-2" />
                Add First Task
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

import React from 'react';
import { X, CheckCircle2, Circle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '../ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { TripTask } from '../../types/tasks';
import { formatDistanceToNow } from 'date-fns';

interface CompletionDrawerProps {
  task: TripTask;
  onClose: () => void;
}

export const CompletionDrawer = ({ task, onClose }: CompletionDrawerProps) => {
  const completedUsers = task.task_status?.filter(status => status.completed) || [];
  const pendingUsers = task.task_status?.filter(status => !status.completed) || [];

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="bg-gray-900 border-gray-700 text-white">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white">{task.title}</SheetTitle>
            <SheetClose asChild>
              <button className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Progress Summary */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-300">Progress</span>
              <Badge className="bg-gradient-to-r from-blue-400 to-purple-400">
                {completedUsers.length}/{task.task_status?.length || 0}
              </Badge>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((completedUsers.length / (task.task_status?.length || 1)) * 100)}%` 
                }}
              />
            </div>
          </div>

          {/* Completed Users */}
          {completedUsers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <CheckCircle2 size={20} className="text-green-400" />
                Completed ({completedUsers.length})
              </h3>
              
              <div className="space-y-2">
                {completedUsers.map((status) => (
                  <div key={status.user_id} className="flex items-center gap-3 p-3 bg-green-400/10 rounded-lg border border-green-400/20">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={status.user?.avatar} />
                      <AvatarFallback className="text-xs bg-green-400 text-white">
                        {status.user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        {status.user?.name || 'Former Member'}
                      </div>
                      {status.completed_at && (
                        <div className="text-gray-400 text-xs">
                          Completed {formatDistanceToNow(new Date(status.completed_at), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                    
                    <CheckCircle2 size={20} className="text-green-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Users */}
          {pendingUsers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Circle size={20} className="text-yellow-400" />
                Pending ({pendingUsers.length})
              </h3>
              
              <div className="space-y-2">
                {pendingUsers.map((status) => (
                  <div key={status.user_id} className="flex items-center gap-3 p-3 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={status.user?.avatar} />
                      <AvatarFallback className="text-xs bg-yellow-400 text-white">
                        {status.user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        {status.user?.name || 'Former Member'}
                      </div>
                      <div className="text-gray-400 text-xs">
                        Not completed yet
                      </div>
                    </div>
                    
                    <Circle size={20} className="text-yellow-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task Details */}
          {task.description && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-white">Description</h3>
              <p className="text-gray-300 bg-white/5 rounded-lg p-3">
                {task.description}
              </p>
            </div>
          )}

          {task.due_at && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-white">Due Date</h3>
              <div className="text-gray-300 bg-white/5 rounded-lg p-3">
                {formatDistanceToNow(new Date(task.due_at), { addSuffix: true })}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
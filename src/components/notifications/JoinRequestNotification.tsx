import React, { useState } from 'react';
import { UserPlus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface JoinRequestNotificationProps {
  notification: {
    id: string;
    title: string;
    description: string;
    tripName: string;
    timestamp: string;
    isRead: boolean;
    data?: {
      trip_id?: string;
      trip_name?: string;
      requester_id?: string;
      requester_name?: string;
      request_id?: string;
    };
  };
  onAction: () => void;
}

export const JoinRequestNotification = ({ notification, onAction }: JoinRequestNotificationProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.data?.request_id) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('approve_join_request', {
        _request_id: notification.data.request_id
      });

      if (error) throw error;

      // Mark notification as read
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);

      toast({
        title: "Request Approved",
        description: `${notification.data.requester_name || 'User'} has been added to ${notification.data.trip_name || 'the trip'}.`,
      });

      onAction();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.data?.request_id) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('reject_join_request', {
        _request_id: notification.data.request_id
      });

      if (error) throw error;

      // Mark notification as read
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);

      toast({
        title: "Request Rejected",
        description: `Join request has been declined.`,
      });

      onAction();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`p-4 border-b border-gray-700/50 ${!notification.isRead ? 'bg-gray-800/30' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="mt-1 p-2 bg-blue-500/20 rounded-lg">
          <UserPlus size={16} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-sm font-medium ${!notification.isRead ? 'text-white' : 'text-gray-300'}`}>
              {notification.title}
            </p>
            {!notification.isRead && (
              <div className="w-2 h-2 bg-glass-orange rounded-full"></div>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-2">
            {notification.description}
          </p>
          <div className="flex items-center gap-2 mb-2">
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isProcessing}
              className="h-7 px-3 bg-green-600 hover:bg-green-700 text-white text-xs"
            >
              <Check size={12} className="mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              disabled={isProcessing}
              className="h-7 px-3 border-red-500/50 text-red-400 hover:bg-red-500/20 text-xs"
            >
              <X size={12} className="mr-1" />
              Reject
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{notification.tripName}</p>
            <p className="text-xs text-gray-500">{notification.timestamp}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

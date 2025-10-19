import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Users, AlertCircle, Trash2, Edit3, Play, Pause } from 'lucide-react';
import { unifiedMessagingService } from '../services/unifiedMessagingService';
import { ScheduledMessage } from '../types/messaging';
import { Button } from './ui/button';
import { EditScheduledMessageModal } from './EditScheduledMessageModal';

interface ScheduledMessagesDashboardProps {
  userId: string;
  tripId?: string;
  tourId?: string;
}

export const ScheduledMessagesDashboard = ({ 
  userId, 
  tripId, 
  tourId 
}: ScheduledMessagesDashboardProps) => {
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ScheduledMessage | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadScheduledMessages();
  }, [userId, tripId, tourId]);

  const loadScheduledMessages = async () => {
    setLoading(true);
    try {
      const messages = await unifiedMessagingService.getScheduledMessages(userId, tripId, tourId);
      setScheduledMessages(messages as any);
    } catch (error) {
      console.error('Failed to load scheduled messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (messageId: string) => {
    const result = await unifiedMessagingService.cancelScheduledMessage(messageId);
    if (result.success) {
      setScheduledMessages(prev => prev.filter(msg => msg.id !== messageId));
    } else {
      console.error('Failed to cancel message:', result.error);
    }
  };

  const handleEdit = (message: ScheduledMessage) => {
    setSelectedMessage(message);
    setShowEditModal(true);
  };

  const handleUpdateMessage = async (updatedMessage: ScheduledMessage) => {
    setScheduledMessages(prev => 
      prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
    );
    setShowEditModal(false);
    setSelectedMessage(null);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-400/10';
      case 'reminder': return 'text-yellow-400 bg-yellow-400/10';
      case 'fyi': return 'text-blue-400 bg-blue-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusColor = (sendAt: string, isSent: boolean) => {
    if (isSent) return 'text-green-400 bg-green-400/10';
    const sendTime = new Date(sendAt);
    const now = new Date();
    
    if (sendTime < now) return 'text-orange-400 bg-orange-400/10';
    return 'text-blue-400 bg-blue-400/10';
  };

  const getStatusText = (sendAt: string, isSent: boolean) => {
    if (isSent) return 'Sent';
    const sendTime = new Date(sendAt);
    const now = new Date();
    
    if (sendTime < now) return 'Pending';
    return 'Scheduled';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Clock size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Scheduled Messages</h2>
            <p className="text-gray-400 text-sm">Manage your upcoming and recurring messages</p>
          </div>
        </div>
        <div className="text-sm text-gray-400">
          {scheduledMessages.length} message{scheduledMessages.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Messages List */}
      {scheduledMessages.length > 0 ? (
        <div className="space-y-4">
          {scheduledMessages.map((message) => (
            <div
              key={message.id}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/8 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header with status and priority */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(message.sendAt, message.isSent)}`}>
                      {getStatusText(message.sendAt, message.isSent)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getPriorityColor(message.priority || 'fyi')}`}>
                      {message.priority || 'fyi'}
                    </span>
                    {/* Recurring indicator */}
                    {/* {message.isRecurring && (
                      <span className="px-2 py-1 bg-purple-400/10 text-purple-300 rounded-full text-xs font-medium">
                        Recurring
                      </span>
                    )} */}
                  </div>

                  {/* Message content */}
                  <p className="text-white mb-3 leading-relaxed">
                    {message.content}
                  </p>

                  {/* Schedule info */}
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>Send at: {formatDateTime(message.sendAt)}</span>
                    </div>
                    {(tripId || tourId) && (
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        <span>Trip Chat</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!message.isSent && (
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      onClick={() => handleEdit(message)}
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Edit3 size={14} />
                    </Button>
                    <Button
                      onClick={() => handleCancel(message.id)}
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Clock size={48} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No Scheduled Messages</h3>
          <p className="text-gray-500 text-sm">
            Messages you schedule will appear here for easy management
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedMessage && (
        <EditScheduledMessageModal
          message={selectedMessage}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedMessage(null);
          }}
          onUpdate={handleUpdateMessage}
        />
      )}
    </div>
  );
};
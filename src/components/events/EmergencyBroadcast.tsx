import React, { useState } from 'react';
import { AlertTriangle, Send, Users, Clock, Bell } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { useToast } from '../../hooks/use-toast';

interface EmergencyTemplate {
  id: string;
  title: string;
  message: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export const EmergencyBroadcast = () => {
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [audience, setAudience] = useState('all');
  const [pushNotification, setPushNotification] = useState(true);
  const [emailNotification, setEmailNotification] = useState(false);
  const [smsNotification, setSmsNotification] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const emergencyTemplates: EmergencyTemplate[] = [
    {
      id: 'medical',
      title: 'Medical Emergency',
      message:
        'Medical assistance is needed. Please remain calm and follow staff instructions. Do not block emergency exits.',
      urgency: 'critical',
    },
    {
      id: 'evacuation',
      title: 'Evacuation Notice',
      message:
        'Please evacuate the building immediately via the nearest exit. Follow evacuation procedures and assembly points.',
      urgency: 'critical',
    },
    {
      id: 'schedule-change',
      title: 'Schedule Change',
      message:
        'Important schedule update: [SESSION NAME] has been moved to [NEW LOCATION] at [NEW TIME].',
      urgency: 'medium',
    },
    {
      id: 'weather',
      title: 'Weather Alert',
      message:
        'Weather advisory: Due to severe weather conditions, please remain indoors and await further instructions.',
      urgency: 'high',
    },
    {
      id: 'technical',
      title: 'Technical Issue',
      message:
        'We are experiencing technical difficulties. Our team is working to resolve the issue quickly.',
      urgency: 'low',
    },
  ];

  const audienceOptions = [
    { value: 'all', label: 'All Attendees', count: 1247 },
    { value: 'attendees', label: 'General Attendees', count: 1089 },
    { value: 'speakers', label: 'Speakers Only', count: 45 },
    { value: 'organizers', label: 'Organizers & Staff', count: 28 },
    { value: 'exhibitors', label: 'Exhibitors', count: 85 },
    { value: 'vip', label: 'VIP Attendees', count: 156 },
  ];

  const urgencyConfig = {
    low: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
    high: { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
    critical: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = emergencyTemplates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.message);
      setUrgency(template.urgency);

      // Auto-enable notifications for high urgency
      if (template.urgency === 'critical' || template.urgency === 'high') {
        setPushNotification(true);
        setEmailNotification(true);
        if (template.urgency === 'critical') {
          setSmsNotification(true);
        }
      }
    }
  };

  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      toast({
        title: 'Missing message',
        description: 'Please enter a broadcast message.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      // Mock sending process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const selectedAudience = audienceOptions.find(opt => opt.value === audience);

      toast({
        title: 'Emergency broadcast sent',
        description: `Message sent to ${selectedAudience?.count} recipients with ${urgency} priority.`,
      });

      // Reset form
      setMessage('');
      setUrgency('medium');
      setAudience('all');
      setPushNotification(true);
      setEmailNotification(false);
      setSmsNotification(false);
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast({
        title: 'Broadcast failed',
        description: 'Failed to send emergency broadcast. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const getEstimatedDelivery = () => {
    if (urgency === 'critical') return '< 30 seconds';
    if (urgency === 'high') return '< 1 minute';
    if (urgency === 'medium') return '< 2 minutes';
    return '< 5 minutes';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-500/20 rounded-lg">
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Emergency Broadcast System</h3>
          <p className="text-gray-400">Send urgent communications to event attendees</p>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Quick Templates</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {emergencyTemplates.map(template => {
            const config = urgencyConfig[template.urgency];
            return (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template.id)}
                className={`text-left p-4 rounded-lg border transition-all hover:scale-105 ${config.bg} ${config.border}`}
              >
                <div className={`font-medium ${config.color} mb-2`}>{template.title}</div>
                <div className="text-gray-300 text-sm line-clamp-2">{template.message}</div>
                <div className={`text-xs ${config.color} mt-2 uppercase font-medium`}>
                  {template.urgency} priority
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Broadcast Composer */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Compose Emergency Broadcast</h4>

        <div className="space-y-4">
          {/* Message */}
          <div>
            <Label className="text-white mb-2 block">Emergency Message</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white min-h-[120px]"
              placeholder="Enter your emergency broadcast message..."
            />
            <div className="text-sm text-gray-400 mt-1">{message.length}/500 characters</div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Urgency Level */}
            <div>
              <Label className="text-white mb-2 block">Urgency Level</Label>
              <Select
                value={urgency}
                onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => setUrgency(value)}
              >
                <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      Low Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      Medium Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                      High Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="critical">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      Critical Emergency
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Audience */}
            <div>
              <Label className="text-white mb-2 block">Target Audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {audienceOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{option.label}</span>
                        <span className="text-gray-400 ml-2">({option.count})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notification Methods */}
          <div>
            <Label className="text-white mb-3 block">Notification Methods</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-blue-400" />
                  <span className="text-white">Push Notifications</span>
                  <span className="text-gray-500 text-sm">(Instant delivery)</span>
                </div>
                <Switch checked={pushNotification} onCheckedChange={setPushNotification} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-green-400" />
                  <span className="text-white">Email Notifications</span>
                  <span className="text-gray-500 text-sm">(1-2 min delay)</span>
                </div>
                <Switch checked={emailNotification} onCheckedChange={setEmailNotification} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-orange-400" />
                  <span className="text-white">SMS Notifications</span>
                  <span className="text-gray-500 text-sm">(Critical only)</span>
                </div>
                <Switch checked={smsNotification} onCheckedChange={setSmsNotification} />
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-400" />
                <span className="text-white">
                  Will be sent to {audienceOptions.find(opt => opt.value === audience)?.count}{' '}
                  recipients
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-green-400" />
                <span className="text-gray-300">Est. delivery: {getEstimatedDelivery()}</span>
              </div>
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSendBroadcast}
            disabled={!message.trim() || isSending}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
          >
            {isSending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Sending Emergency Broadcast...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send size={16} />
                Send Emergency Broadcast
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

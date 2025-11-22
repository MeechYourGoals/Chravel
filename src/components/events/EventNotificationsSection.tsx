import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

export const EventNotificationsSection = () => {
  const [notifications, setNotifications] = useState({
    rsvpUpdates: true,
    chatMessages: true,
    agendaChanges: true,
    newAttendees: false,
    eventReminders: true
  });

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell size={24} className="text-glass-orange" />
          Event Notifications
        </h3>
        <p className="text-gray-300 mt-2">Manage how you receive updates about your events</p>
      </div>

      {/* Notification Settings */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <h4 className="text-base font-semibold text-white mb-2">Notification Preferences</h4>
        
        <div className="space-y-2">
          {/* RSVP Updates */}
          <div className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
            <div>
              <Label className="text-white text-sm font-medium">RSVP Updates</Label>
              <p className="text-gray-400 text-xs mt-0.5">Get notified when attendees RSVP to your event</p>
            </div>
            <Switch
              checked={notifications.rsvpUpdates}
              onCheckedChange={() => handleToggle('rsvpUpdates')}
              className="data-[state=checked]:bg-glass-orange"
            />
          </div>

          {/* Event Chat Messages */}
          <div className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
            <div>
              <Label className="text-white text-sm font-medium">Event Chat Messages</Label>
              <p className="text-gray-400 text-xs mt-0.5">Receive notifications for new messages in event chat</p>
            </div>
            <Switch
              checked={notifications.chatMessages}
              onCheckedChange={() => handleToggle('chatMessages')}
              className="data-[state=checked]:bg-glass-orange"
            />
          </div>

          {/* Agenda Changes */}
          <div className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
            <div>
              <Label className="text-white text-sm font-medium">Agenda Changes</Label>
              <p className="text-gray-400 text-xs mt-0.5">Get notified when the event schedule is updated</p>
            </div>
            <Switch
              checked={notifications.agendaChanges}
              onCheckedChange={() => handleToggle('agendaChanges')}
              className="data-[state=checked]:bg-glass-orange"
            />
          </div>

          {/* New Attendees */}
          <div className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
            <div>
              <Label className="text-white text-sm font-medium">New Attendees</Label>
              <p className="text-gray-400 text-xs mt-0.5">Notify when someone joins the event</p>
            </div>
            <Switch
              checked={notifications.newAttendees}
              onCheckedChange={() => handleToggle('newAttendees')}
              className="data-[state=checked]:bg-glass-orange"
            />
          </div>

          {/* Event Reminders */}
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-white text-sm font-medium">Event Reminders</Label>
              <p className="text-gray-400 text-xs mt-0.5">Receive reminders before your event starts</p>
            </div>
            <Switch
              checked={notifications.eventReminders}
              onCheckedChange={() => handleToggle('eventReminders')}
              className="data-[state=checked]:bg-glass-orange"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

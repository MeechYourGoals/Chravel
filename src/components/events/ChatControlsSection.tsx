import React, { useState } from 'react';
import { MessageSquare, Users, Shield, Bell, Volume, Eye } from 'lucide-react';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

export const ChatControlsSection = () => {
  const [chatSettings, setChatSettings] = useState({
    enabled: true,
    attendeeToAttendee: true,
    attendeeToSpeaker: true,
    attendeeToOrganizer: true,
    moderated: false,
    profanityFilter: true,
    anonymousAllowed: false,
    messageHistory: true,
    broadcastsEnabled: true,
    notificationSound: true,
    moderatorApproval: false,
  });

  const [autoModeration, setAutoModeration] = useState({
    enabled: true,
    restrictedWords: 'spam, advertisement, promotion',
    maxMessageLength: 500,
    rateLimitSeconds: 5,
  });

  const updateSetting = (key: string, value: boolean | string | number) => {
    setChatSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateAutoModeration = (key: string, value: boolean | string | number) => {
    setAutoModeration(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageSquare size={24} className="text-glass-orange" />
        <div>
          <h3 className="text-xl font-bold text-white">Chat & Communication Controls</h3>
          <p className="text-gray-400">Manage how attendees communicate during your event</p>
        </div>
      </div>

      {/* Basic Chat Settings */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MessageSquare size={20} />
          Basic Chat Settings
        </h4>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Enable Event Chat</Label>
              <p className="text-gray-400 text-sm">Allow participants to communicate via chat</p>
            </div>
            <Switch
              checked={chatSettings.enabled}
              onCheckedChange={checked => updateSetting('enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Attendee-to-Attendee Chat</Label>
              <p className="text-gray-400 text-sm">
                Allow attendees to message each other directly
              </p>
            </div>
            <Switch
              checked={chatSettings.attendeeToAttendee}
              onCheckedChange={checked => updateSetting('attendeeToAttendee', checked)}
              disabled={!chatSettings.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Attendee-to-Speaker Chat</Label>
              <p className="text-gray-400 text-sm">Allow attendees to message speakers</p>
            </div>
            <Switch
              checked={chatSettings.attendeeToSpeaker}
              onCheckedChange={checked => updateSetting('attendeeToSpeaker', checked)}
              disabled={!chatSettings.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Anonymous Messages</Label>
              <p className="text-gray-400 text-sm">
                Allow anonymous messaging for sensitive topics
              </p>
            </div>
            <Switch
              checked={chatSettings.anonymousAllowed}
              onCheckedChange={checked => updateSetting('anonymousAllowed', checked)}
              disabled={!chatSettings.enabled}
            />
          </div>
        </div>
      </div>

      {/* Moderation Settings */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield size={20} />
          Moderation & Safety
        </h4>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Moderated Chat</Label>
              <p className="text-gray-400 text-sm">All messages require moderator approval</p>
            </div>
            <Switch
              checked={chatSettings.moderated}
              onCheckedChange={checked => updateSetting('moderated', checked)}
              disabled={!chatSettings.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Profanity Filter</Label>
              <p className="text-gray-400 text-sm">Automatically filter inappropriate language</p>
            </div>
            <Switch
              checked={chatSettings.profanityFilter}
              onCheckedChange={checked => updateSetting('profanityFilter', checked)}
              disabled={!chatSettings.enabled}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Auto-Moderation Settings</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 text-sm">Max Message Length</Label>
                <Select
                  value={autoModeration.maxMessageLength.toString()}
                  onValueChange={value => updateAutoModeration('maxMessageLength', parseInt(value))}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100 characters</SelectItem>
                    <SelectItem value="250">250 characters</SelectItem>
                    <SelectItem value="500">500 characters</SelectItem>
                    <SelectItem value="1000">1000 characters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Rate Limit (seconds)</Label>
                <Select
                  value={autoModeration.rateLimitSeconds.toString()}
                  onValueChange={value => updateAutoModeration('rateLimitSeconds', parseInt(value))}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 second</SelectItem>
                    <SelectItem value="3">3 seconds</SelectItem>
                    <SelectItem value="5">5 seconds</SelectItem>
                    <SelectItem value="10">10 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Restricted Words</Label>
            <Textarea
              value={autoModeration.restrictedWords}
              onChange={e => updateAutoModeration('restrictedWords', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white"
              placeholder="Enter comma-separated words to filter"
              rows={3}
            />
            <p className="text-gray-500 text-xs">
              Messages containing these words will be automatically flagged
            </p>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bell size={20} />
          Notification Settings
        </h4>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Sound Notifications</Label>
              <p className="text-gray-400 text-sm">Play sound when new messages arrive</p>
            </div>
            <Switch
              checked={chatSettings.notificationSound}
              onCheckedChange={checked => updateSetting('notificationSound', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Broadcast Notifications</Label>
              <p className="text-gray-400 text-sm">
                Send push notifications for important broadcasts
              </p>
            </div>
            <Switch
              checked={chatSettings.broadcastsEnabled}
              onCheckedChange={checked => updateSetting('broadcastsEnabled', checked)}
            />
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Eye size={20} />
          Privacy & Data
        </h4>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Message History</Label>
              <p className="text-gray-400 text-sm">Store chat messages for post-event analysis</p>
            </div>
            <Switch
              checked={chatSettings.messageHistory}
              onCheckedChange={checked => updateSetting('messageHistory', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Data Retention Period</Label>
            <Select defaultValue="30">
              <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="forever">Forever</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Role-Based Permissions */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users size={20} />
          Role-Based Permissions
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-white">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2">Permission</th>
                <th className="text-center py-2">Attendee</th>
                <th className="text-center py-2">Speaker</th>
                <th className="text-center py-2">Organizer</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-white/5">
                <td className="py-2">Send messages</td>
                <td className="text-center">✓</td>
                <td className="text-center">✓</td>
                <td className="text-center">✓</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2">Delete own messages</td>
                <td className="text-center">✓</td>
                <td className="text-center">✓</td>
                <td className="text-center">✓</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2">Delete any message</td>
                <td className="text-center">-</td>
                <td className="text-center">-</td>
                <td className="text-center">✓</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2">Send broadcasts</td>
                <td className="text-center">-</td>
                <td className="text-center">Session only</td>
                <td className="text-center">✓</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2">Moderate chat</td>
                <td className="text-center">-</td>
                <td className="text-center">Session only</td>
                <td className="text-center">✓</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

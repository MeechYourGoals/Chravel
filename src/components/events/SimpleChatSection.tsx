import React, { useState } from 'react';
import { MessageSquare, Users } from 'lucide-react';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';

export const SimpleChatSection = () => {
  const [chatEnabled, setChatEnabled] = useState(true);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare size={24} className="text-glass-orange" />
          Event Chat
        </h3>
        <p className="text-gray-300 mt-2">Enable basic group chat for your event attendees</p>
      </div>

      {/* Chat Toggle */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Chat Settings</h4>

        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
          <div>
            <Label className="text-white text-base">Enable Event Chat</Label>
            <p className="text-gray-400 text-sm mt-1">
              Allow all attendees and organizers to communicate in a group chat
            </p>
          </div>
          <Switch
            checked={chatEnabled}
            onCheckedChange={setChatEnabled}
            className="data-[state=checked]:bg-glass-orange"
          />
        </div>
      </div>

      {/* Chat Features */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">What's Included</h4>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
            <Users size={20} className="text-glass-orange mt-0.5" />
            <div>
              <p className="text-white font-medium">Group Chat Room</p>
              <p className="text-gray-400 text-sm">
                One simple chat room where all attendees and organizers can communicate
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
            <MessageSquare size={20} className="text-glass-orange mt-0.5" />
            <div>
              <p className="text-white font-medium">Real-time Messaging</p>
              <p className="text-gray-400 text-sm">
                Messages appear instantly for all participants
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Display */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Current Status</h4>

        <div
          className={`p-4 rounded-lg border ${
            chatEnabled
              ? 'bg-green-500/20 border-green-500/30'
              : 'bg-gray-500/20 border-gray-500/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${chatEnabled ? 'bg-green-400' : 'bg-gray-400'}`}
            />
            <p className={`font-medium ${chatEnabled ? 'text-green-300' : 'text-gray-300'}`}>
              Chat is {chatEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            {chatEnabled
              ? 'Attendees will be able to chat during the event'
              : 'Attendees will not have access to chat features'}
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="bg-glass-orange hover:bg-glass-orange/80">Save Chat Settings</Button>
      </div>
    </div>
  );
};


import React from 'react';
import { Bell } from 'lucide-react';

export const EnterpriseNotificationsSection = () => (
  <div className="space-y-3">
    <h3 className="text-2xl font-bold text-white">Notification Preferences</h3>
    
    <div className="space-y-3">
      {[
        { key: 'orgAnnouncements', label: 'Organization Announcements', desc: 'Important updates from organization administrators' },
        { key: 'tripInvites', label: 'Trip Invitations', desc: 'When you are invited to join a trip' },
        { key: 'teamUpdates', label: 'Team Updates', desc: 'Changes to team members and permissions' },
        { key: 'billingAlerts', label: 'Billing Alerts', desc: 'Subscription and payment notifications' },
        { key: 'emailDigest', label: 'Weekly Email Digest', desc: 'Summary of activity across all your trips' }
      ].map((setting) => (
        <div key={setting.key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
          <div className="flex items-center gap-3">
            <Bell size={16} className="text-gray-400" />
            <div>
              <span className="text-white font-medium">{setting.label}</span>
              <p className="text-sm text-gray-400">{setting.desc}</p>
            </div>
          </div>
          <button className="relative w-12 h-6 bg-glass-orange rounded-full transition-colors">
            <div className="absolute w-5 h-5 bg-white rounded-full top-0.5 translate-x-6 transition-transform" />
          </button>
        </div>
      ))}
    </div>
  </div>
);

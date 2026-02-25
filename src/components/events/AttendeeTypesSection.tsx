import React from 'react';
import { Users, Shield, Crown, User } from 'lucide-react';

export const AttendeeTypesSection = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white">Attendee Types & Roles</h3>

      {/* Role Definitions */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield size={20} />
          Role Definitions
        </h4>
        <div className="space-y-4">
          {[
            {
              name: 'Organizer',
              icon: Crown,
              color: 'text-yellow-400',
              permissions: 'Full access to all features',
            },
            {
              name: 'Speaker',
              icon: User,
              color: 'text-blue-400',
              permissions: 'Session management, attendee interaction',
            },
            {
              name: 'Exhibitor',
              icon: Users,
              color: 'text-green-400',
              permissions: 'Booth management, lead capture',
            },
            {
              name: 'Attendee',
              icon: User,
              color: 'text-gray-400',
              permissions: 'Session access, networking',
            },
            {
              name: 'VIP',
              icon: Crown,
              color: 'text-purple-400',
              permissions: 'Premium access, exclusive sessions',
            },
          ].map(role => {
            const Icon = role.icon;
            return (
              <div key={role.name} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Icon size={20} className={role.color} />
                    <span className="text-white font-medium">{role.name}</span>
                  </div>
                  <button className="text-glass-orange hover:text-glass-orange/80 text-sm">
                    Edit Permissions
                  </button>
                </div>
                <p className="text-gray-400 text-sm">{role.permissions}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">Capacity Limit</label>
                    <input
                      type="number"
                      defaultValue={
                        role.name === 'Attendee' ? '500' : role.name === 'Speaker' ? '50' : '100'
                      }
                      className="w-full bg-gray-800/50 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">Current Count</label>
                    <div className="bg-gray-800/50 border border-gray-600 text-gray-300 rounded px-3 py-2 text-sm">
                      {role.name === 'Attendee' ? '347' : role.name === 'Speaker' ? '24' : '67'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">Registration</label>
                    <select className="w-full bg-gray-800/50 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-glass-orange/50">
                      <option>Open</option>
                      <option>Approval Required</option>
                      <option>Closed</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Registration Settings */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Registration Settings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Registration Opens</label>
            <input
              type="datetime-local"
              defaultValue="2025-01-15T09:00"
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Registration Closes</label>
            <input
              type="datetime-local"
              defaultValue="2025-03-10T23:59"
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Waitlist Enabled</label>
            <select className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-glass-orange/50">
              <option>Yes</option>
              <option>No</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Auto-Approval</label>
            <select className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-glass-orange/50">
              <option>Enabled</option>
              <option>Manual Review</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

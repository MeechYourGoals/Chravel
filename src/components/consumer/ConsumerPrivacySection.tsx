
import React from 'react';

export const ConsumerPrivacySection = () => {
  return (
    <div className="space-y-3">
      <h3 className="text-2xl font-bold text-white">Privacy & Security</h3>
      
      {/* Display Name Privacy */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Display Name Settings</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium">Use Real Name</div>
              <div className="text-sm text-gray-400">Show your real name to other users</div>
            </div>
            <button className="relative w-12 h-6 bg-gray-600 rounded-full transition-colors">
              <div className="absolute w-5 h-5 bg-white rounded-full top-0.5 translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium">Use Display Name Only</div>
              <div className="text-sm text-gray-400">Show only your chosen display name</div>
            </div>
            <button className="relative w-12 h-6 bg-glass-orange rounded-full transition-colors">
              <div className="absolute w-5 h-5 bg-white rounded-full top-0.5 translate-x-6 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Contact Information Privacy */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Contact Information</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium">Share Phone Number with Trip Members</div>
              <div className="text-sm text-gray-400">Allow trip members to see your phone number for direct contact</div>
            </div>
            <button className="relative w-12 h-6 bg-gray-600 rounded-full transition-colors">
              <div className="absolute w-5 h-5 bg-white rounded-full top-0.5 translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium">Allow Direct Messages</div>
              <div className="text-sm text-gray-400">Let other users send you direct messages</div>
            </div>
            <button className="relative w-12 h-6 bg-glass-orange rounded-full transition-colors">
              <div className="absolute w-5 h-5 bg-white rounded-full top-0.5 translate-x-6 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Account Security */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Account Security</h4>
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            <div className="text-left">
              <div className="text-white font-medium">Change Password</div>
              <div className="text-sm text-gray-400">Update your account password</div>
            </div>
            <div className="text-glass-orange">→</div>
          </button>
          <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            <div className="text-left">
              <div className="text-white font-medium">Two-Factor Authentication</div>
              <div className="text-sm text-gray-400">Add an extra layer of security to your account</div>
            </div>
            <div className="text-glass-orange">Set Up</div>
          </button>
          <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            <div className="text-left">
              <div className="text-white font-medium">Login History</div>
              <div className="text-sm text-gray-400">View recent login activity</div>
            </div>
            <div className="text-glass-orange">→</div>
          </button>
        </div>
      </div>
    </div>
  );
};

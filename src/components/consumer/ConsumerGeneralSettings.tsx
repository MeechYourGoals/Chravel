import React from 'react';
import { ChatActivitySettings } from '@/components/settings/ChatActivitySettings';
import { useGlobalSystemMessagePreferences } from '@/hooks/useSystemMessagePreferences';
import { SystemMessageCategoryPrefs } from '@/utils/systemMessageCategory';

export const ConsumerGeneralSettings = () => {
  const { preferences, updatePreferences, isUpdating } = useGlobalSystemMessagePreferences();

  const handleShowSystemMessagesChange = (value: boolean) => {
    updatePreferences({ showSystemMessages: value, categories: preferences.categories });
  };

  const handleCategoryChange = (category: keyof SystemMessageCategoryPrefs, value: boolean) => {
    updatePreferences({
      showSystemMessages: preferences.showSystemMessages,
      categories: { ...preferences.categories, [category]: value }
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-2xl font-bold text-white">General Settings</h3>
      
      {/* Chat Activity Section */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Chat Activity</h4>
        <ChatActivitySettings
          showSystemMessages={preferences.showSystemMessages}
          categories={preferences.categories}
          onShowSystemMessagesChange={handleShowSystemMessagesChange}
          onCategoryChange={handleCategoryChange}
          disabled={isUpdating}
        />
      </div>

      {/* App Preferences */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">App Preferences</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Language</label>
            <select className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Time Zone</label>
            <select className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50">
              <option>Pacific Time (PT)</option>
              <option>Mountain Time (MT)</option>
              <option>Central Time (CT)</option>
              <option>Eastern Time (ET)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Date Format</label>
            <select className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50">
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data & Storage */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Data & Storage</h4>
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            <div className="text-left">
              <div className="text-white font-medium">Clear Cache</div>
              <div className="text-sm text-gray-400">Clear stored app data to free up space</div>
            </div>
            <div className="text-glass-orange">Clear</div>
          </button>
        </div>
      </div>

      {/* Account Management */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Account Management</h4>
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            <div className="text-left">
              <div className="text-white font-medium">Deactivate Account</div>
              <div className="text-sm text-gray-400">Temporarily disable your account</div>
            </div>
            <div className="text-yellow-500">Deactivate</div>
          </button>
          <button className="w-full flex items-center justify-between p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors">
            <div className="text-left">
              <div className="text-red-400 font-medium">Delete Account</div>
              <div className="text-sm text-gray-400">Permanently delete your account and all data</div>
            </div>
            <div className="text-red-400">Delete</div>
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';

export const EnterpriseGeneralSettings = () => (
  <div className="space-y-3">
    <h3 className="text-2xl font-bold text-white">General Settings</h3>

    {/* Organization Preferences */}
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <h4 className="text-base font-semibold text-white mb-3">Organization Preferences</h4>
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Default Trip Visibility</label>
          <select className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50">
            <option>Organization Members Only</option>
            <option>Public</option>
            <option>Private</option>
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
      </div>
    </div>

    {/* Data Management */}
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <h4 className="text-base font-semibold text-white mb-3">Data Management</h4>
      <div className="space-y-3">
        <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
          <div className="text-left">
            <div className="text-white font-medium">Export Organization Data</div>
            <div className="text-sm text-gray-400">
              Download all organization trip data and settings
            </div>
          </div>
          <div className="text-glass-orange">Export</div>
        </button>
        <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
          <div className="text-left">
            <div className="text-white font-medium">Data Retention Policy</div>
            <div className="text-sm text-gray-400">Configure how long data is stored</div>
          </div>
          <div className="text-glass-orange">Configure</div>
        </button>
      </div>
    </div>
  </div>
);

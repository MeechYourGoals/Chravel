
import React from 'react';
import { Building, Camera, Upload } from 'lucide-react';

interface OrganizationSectionProps {
  organization: {
    id: string;
    name: string;
    displayName: string;
    billingEmail: string;
  };
}

export const OrganizationSection = ({ organization }: OrganizationSectionProps) => (
  <div className="space-y-3">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-12 h-12 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-xl flex items-center justify-center">
        <Building size={24} className="text-white" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-white">Organization Settings</h3>
        <p className="text-gray-400">Manage your organization profile and details</p>
      </div>
    </div>

    {/* Organization Logo */}
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <h4 className="text-base font-semibold text-white mb-3">Organization Logo</h4>
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-xl flex items-center justify-center">
            <Building size={32} className="text-white" />
          </div>
          <button className="absolute -bottom-2 -right-2 bg-glass-orange hover:bg-glass-orange/80 text-white p-2 rounded-full transition-colors">
            <Camera size={16} />
          </button>
        </div>
        <div>
          <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg transition-colors">
            <Upload size={16} />
            Upload Logo
          </button>
          <p className="text-sm text-gray-400 mt-2">PNG, SVG or JPG. Max size 2MB.</p>
        </div>
      </div>
    </div>

    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <h4 className="text-base font-semibold text-white mb-3">Organization Details</h4>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Organization Name</label>
          <input
            type="text"
            defaultValue={organization.name}
            className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Display Name</label>
          <input
            type="text"
            defaultValue={organization.displayName}
            className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Billing Email</label>
          <input
            type="email"
            defaultValue={organization.billingEmail}
            className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Organization ID</label>
          <input
            type="text"
            value={organization.id}
            disabled
            className="w-full bg-gray-700/50 border border-gray-600 text-gray-400 rounded-lg px-4 py-3"
          />
        </div>
      </div>
      
      <div className="mt-3">
        <label className="block text-sm text-gray-300 mb-1">Organization Description</label>
        <textarea
          placeholder="Describe your organization's mission and focus..."
          className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50 resize-none"
          rows={3}
        />
      </div>
      
      <button className="mt-4 bg-glass-orange hover:bg-glass-orange/80 text-white px-6 py-2 rounded-lg font-medium transition-colors">
        Save Changes
      </button>
    </div>
  </div>
);

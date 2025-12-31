
import React from 'react';
import { User, Camera, Upload, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';

export const EnterpriseProfileSection = () => {
  const { user, signOut } = useAuth();
  
  return (
  <div className="space-y-6">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-12 h-12 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-xl flex items-center justify-center">
        <User size={24} className="text-white" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-white">Profile Settings</h3>
        <p className="text-gray-400">Manage your personal profile within the organization</p>
      </div>
    </div>

    {/* Profile Photo */}
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h4 className="text-lg font-semibold text-white mb-4">Profile Photo</h4>
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-full flex items-center justify-center">
            <User size={32} className="text-white" />
          </div>
          <button className="absolute -bottom-2 -right-2 bg-glass-orange hover:bg-glass-orange/80 text-white p-2 rounded-full transition-colors">
            <Camera size={16} />
          </button>
        </div>
        <div>
          <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg transition-colors">
            <Upload size={16} />
            Upload Photo
          </button>
          <p className="text-sm text-gray-400 mt-2">JPG, PNG or GIF. Max size 5MB.</p>
        </div>
      </div>
    </div>

    {/* Personal Information */}
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h4 className="text-lg font-semibold text-white mb-4">Personal Information</h4>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Display Name</label>
          <input
            type="text"
            defaultValue="John Smith"
            className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Job Title</label>
          <input
            type="text"
            placeholder="e.g., Marketing Director"
            className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Department</label>
          <input
            type="text"
            placeholder="e.g., Marketing & Communications"
            className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Location</label>
          <input
            type="text"
            placeholder="e.g., New York, NY"
            className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
          />
        </div>
      </div>
      
      <div className="mt-6">
        <label className="block text-sm text-gray-300 mb-2">Bio</label>
        <textarea
          placeholder="Tell your colleagues about your role and expertise..."
          className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-glass-orange/50 resize-none"
          rows={3}
        />
      </div>
      
      <button className="mt-6 bg-glass-orange hover:bg-glass-orange/80 text-white px-6 py-3 rounded-lg font-medium transition-colors">
        Save Changes
      </button>
    </div>

    {/* Sign Out */}
    {user && (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white">Sign Out</h4>
            <p className="text-sm text-gray-400">Sign out of your account</p>
          </div>
          <Button onClick={signOut} variant="destructive" size="sm">
            <LogOut className="h-4 w-4 mr-1" /> Sign Out
          </Button>
        </div>
      </div>
    )}
  </div>
  );
};

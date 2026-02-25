import React, { useState, useEffect } from 'react';
import { Users, X, CheckCircle, Settings, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';

interface TeamOnboardingBannerProps {
  hasUnassignedRoles: boolean;
  onAssignRoles: () => void;
  onDismiss: () => void;
}

export const TeamOnboardingBanner = ({
  hasUnassignedRoles,
  onAssignRoles,
  onDismiss,
}: TeamOnboardingBannerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Check if user has dismissed this banner permanently
    const dismissed = localStorage.getItem('team-onboarding-dismissed');
    if (!dismissed && hasUnassignedRoles) {
      setIsVisible(true);
    }
  }, [hasUnassignedRoles]);

  const handleDismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem('team-onboarding-dismissed', 'true');
    }
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-xl p-6 mb-6 animate-in fade-in slide-in-from-top duration-500">
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X size={20} />
      </button>

      <div className="relative flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="bg-red-500/20 rounded-full p-3">
            <Users className="text-red-400" size={24} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-yellow-400" />
              Assign Roles to Your Team
            </h3>
            <p className="text-gray-300 text-sm mt-1">
              Help everyone know who's who by assigning roles to your team members. This makes it
              easier to coordinate and communicate effectively.
            </p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-red-500/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-red-400">
                  1
                </div>
                <span className="text-sm font-medium text-white">Click Member</span>
              </div>
              <p className="text-xs text-gray-400 ml-8">
                Click the <Settings size={12} className="inline" /> icon next to any team member
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-red-500/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-red-400">
                  2
                </div>
                <span className="text-sm font-medium text-white">Choose Role</span>
              </div>
              <p className="text-xs text-gray-400 ml-8">
                Select from predefined roles or create custom ones
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-red-500/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-red-400">
                  3
                </div>
                <span className="text-sm font-medium text-white">Save & Organize</span>
              </div>
              <p className="text-xs text-gray-400 ml-8">
                Filter and organize by role for better coordination
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={onAssignRoles} className="bg-red-600 hover:bg-red-700 text-white">
              <CheckCircle size={16} className="mr-2" />
              Start Assigning Roles
            </Button>

            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={e => setDontShowAgain(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              Don't show again
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

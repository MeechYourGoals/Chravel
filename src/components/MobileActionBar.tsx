import React from 'react';
import { Settings, Plus, Search } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { DemoModeToggle } from './DemoModeToggle';
import { useIsMobile } from '../hooks/use-mobile';

interface MobileActionBarProps {
  onSettings: () => void;
  onCreateTrip: () => void;
  onSearch: () => void;
}

export const MobileActionBar = ({ 
  onSettings, 
  onCreateTrip, 
  onSearch 
}: MobileActionBarProps) => {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <div className="flex items-center justify-center gap-3 px-2 mb-6">
      <button
        onClick={onSettings}
        className="bg-gray-900/80 backdrop-blur-md border border-gray-700 hover:bg-gray-800/80 text-white p-3 rounded-xl transition-all duration-300 shadow-lg"
        aria-label="Settings"
      >
        <Settings size={20} />
      </button>

      <NotificationBell />

      <button
        onClick={onCreateTrip}
        className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black p-3 rounded-xl transition-all duration-300 shadow-lg"
        aria-label="Create New Trip"
      >
        <Plus size={20} />
      </button>

      <button
        onClick={onSearch}
        className="bg-gray-900/80 backdrop-blur-md border border-gray-700 hover:bg-gray-800/80 text-white p-3 rounded-xl transition-all duration-300 shadow-lg"
        aria-label="Search"
      >
        <Search size={20} />
      </button>
    </div>
  );
};

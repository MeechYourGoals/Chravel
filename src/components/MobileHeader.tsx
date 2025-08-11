
import React, { useState } from 'react';
import { Plus, Crown, Settings, Menu, X } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { NotificationBell } from './NotificationBell';

interface MobileHeaderProps {
  onCreateTrip: () => void;
  onUpgradeToProo: () => void;
  onSettings: () => void;
  onProDashboard: () => void;
  viewMode: string;
}

export const MobileHeader = ({ 
  onCreateTrip, 
  onUpgradeToProo, 
  onSettings, 
  onProDashboard, 
  viewMode 
}: MobileHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <>
      <div className="flex items-center justify-between mb-6 bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl p-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight" aria-label="Chravel Home">
            Chravel
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {viewMode === 'myTrips' && (
            <button
              onClick={onCreateTrip}
              className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black p-3 rounded-xl transition-all duration-300 shadow-lg"
              title="Plan Your Trip"
            >
              <Plus size={20} />
            </button>
          )}
          {viewMode === 'tripsPro' && (
            <button
              onClick={() => window.location.href = 'mailto:christian@chravelapp.com?subject=Requesting%20a%20Chravel%20Demo'}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-xl transition-all duration-300 shadow-lg text-sm font-medium"
              title="Schedule Demo"
            >
              Demo
            </button>
          )}
          {viewMode === 'events' && (
            <button
              onClick={() => {
                const pricingSection = document.querySelector('#pricing-section');
                if (pricingSection) {
                  pricingSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-4 py-3 rounded-xl transition-all duration-300 shadow-lg text-sm font-medium"
              title="See Pricing"
            >
              Pricing
            </button>
          )}
          
          <NotificationBell />
          <button
            onClick={() => setIsMenuOpen(true)}
            className="bg-gray-800/80 backdrop-blur-md border border-gray-700 hover:bg-gray-700/80 text-white p-3 rounded-xl transition-all duration-300"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
          <div className="w-full bg-gray-900/95 backdrop-blur-md border-t border-gray-700 rounded-t-3xl p-6 animate-slide-in-bottom">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Menu</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="text-gray-400 hover:text-white p-2"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => {
                  onProDashboard();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 bg-gray-800/50 hover:bg-gray-700/50 text-white p-4 rounded-xl transition-all"
              >
                <Crown size={20} className="text-yellow-500" />
                <span className="font-medium">Pro Dashboard</span>
              </button>
              
              <button
                onClick={() => {
                  onUpgradeToProo();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 border border-yellow-500/30 text-yellow-400 p-4 rounded-xl transition-all"
              >
                <Crown size={20} />
                <span className="font-medium">Upgrade to Pro</span>
              </button>
              
              <button
                onClick={() => {
                  onSettings();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 bg-gray-800/50 hover:bg-gray-700/50 text-white p-4 rounded-xl transition-all"
              >
                <Settings size={20} />
                <span className="font-medium">Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

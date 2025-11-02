import React, { useState } from 'react';
import { Crown, Plus, Settings, User, LogIn, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from '../NotificationBell';
import { SearchBar } from '../SearchBar';
import { AuthModal } from '../AuthModal';
import { DemoModeToggle } from '../DemoModeToggle';


import { useAuth } from '../../hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface DesktopHeaderProps {
  viewMode: string;
  onCreateTrip: () => void;
  onUpgrade: () => void;
  onSettings: () => void;
}

export const DesktopHeader = ({ viewMode, onCreateTrip, onUpgrade, onSettings }: DesktopHeaderProps) => {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, signOut } = useAuth();

  const blurbs: Record<string, string> = {
    myTrips: 'Plan your perfect trip.',
    tripsPro: 'Enterprise software for professional trip management.',
    events: 'Professional event management and coordination.',
    travelRecs: 'Discover curated hotels, dining, and experiences.',
  };
  const subtitle = blurbs[viewMode] ?? 'Plan your perfect trip.';

  const handleSearchClick = () => {
    alert('Please navigate to any trip and use the Concierge for search and assistance.');
  };

  const handleAuthClick = () => {
    setShowAuthModal(true);
  };

  return (
    <>
      {/* Demo Mode Toggle - Enhanced visibility and styling */}
      <div className="flex justify-end mb-4">
        <div className="w-[150px]">
          <DemoModeToggle />
        </div>
      </div>

      {/* Main Header Container - Single Visual Plane Alignment */}
      <div className="mb-6">
        {/* Unified Horizontal Layout - All elements aligned on same baseline */}
        <div className="flex items-center justify-between gap-4 mb-5">
          {/* Left Cluster: Brand + Tagline */}
          <div className="flex items-center gap-3 shrink-0">
            <h1 className="text-2xl font-bold text-foreground tracking-tight transition-all duration-300 hover:brightness-110 hover:scale-105" aria-label="Chravel Home">
              Chravel
            </h1>
            <span className="text-sm text-muted-foreground align-middle hidden md:inline">
              The Group Chat for Group Travel
            </span>
          </div>

          {/* Center: Search Bar - Flexible width */}
          <div className="flex-1 mx-6 max-w-2xl hidden lg:flex">
            <SearchBar
              placeholder="Search for and plan your perfect trip..."
              onSearch={handleSearchClick}
              className="cursor-pointer w-full"
            />
          </div>

          {/* Right Cluster: Action Buttons - Equal spacing */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={onCreateTrip}
              className="w-11 h-11 bg-card/90 backdrop-blur-xl border-2 border-border/50 hover:bg-card hover:border-primary/60 text-foreground rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-primary-glow/50"
              title="New Trip"
            >
              <Plus size={20} />
            </button>

            <div className="w-11 h-11">
              <NotificationBell />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-11 h-11 bg-card/90 backdrop-blur-xl border-2 border-border/50 hover:bg-card hover:border-primary/60 text-foreground rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-primary-glow/50">
                  <Settings size={20} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                sideOffset={8}
                className="bg-card/95 backdrop-blur-xl border-2 border-border/50 text-foreground min-w-[200px] z-50 rounded-xl shadow-xl"
              >
                {!user && (
                  <DropdownMenuItem 
                    onClick={handleAuthClick}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/80 cursor-pointer rounded-lg"
                  >
                    <LogIn size={16} />
                    Log In / Sign Up
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={onSettings}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/80 cursor-pointer rounded-lg"
                >
                  <User size={16} />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onUpgrade}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/80 cursor-pointer rounded-lg"
                >
                  <Crown size={16} className="text-accent" />
                  Upgrade Chravel Experience
                </DropdownMenuItem>
                {user && (
                  <DropdownMenuItem 
                    onClick={() => navigate('/organizations')}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/80 cursor-pointer rounded-lg"
                  >
                    <Building size={16} />
                    My Organizations
                  </DropdownMenuItem>
                )}
                {user && (
                  <DropdownMenuItem 
                    onClick={signOut}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-destructive/20 cursor-pointer text-destructive rounded-lg"
                  >
                    <LogIn size={16} />
                    Sign Out
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Search Bar - Full width below header */}
        <div className="lg:hidden mb-4">
          <SearchBar
            placeholder="Search for and plan your perfect trip..."
            onSearch={handleSearchClick}
            className="cursor-pointer w-full"
          />
        </div>
      </div>

      
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};
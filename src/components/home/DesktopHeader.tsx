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

      {/* Main Header Container - Responsive layout */}
      <div className="mb-6">
        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center mb-5">
          {/* Column 1: Brand - stacked on My Trips button */}
          <div className="flex flex-col">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight" aria-label="Chravel Home">
              Chravel
            </h1>
            <div className="mt-2 text-center">
              <p className="text-caption text-muted-foreground font-medium leading-tight">
                The Group Chat<br />for Group Travel
              </p>
            </div>
          </div>

          {/* Column 2: Search Bar - spans Chravel Pro + Events + Chravel Recs buttons */}
          <div className="flex items-center min-w-0">
            <SearchBar
              placeholder="Search for and plan your perfect trip."
              onSearch={handleSearchClick}
              className="cursor-pointer w-full"
            />
          </div>

          {/* Column 3: Action Buttons - aligned to right */}
          <div className="flex items-center gap-2 justify-end">
            {/* Action button group - enhanced with new design system */}
            <button
              onClick={onCreateTrip}
              className="w-12 h-12 bg-card/90 backdrop-blur-xl border-2 border-border/50 hover:bg-card hover:border-primary/60 text-foreground rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-primary-glow/50"
              title="New Trip"
            >
              <Plus size={20} />
            </button>

            <div className="w-12 h-12">
              <NotificationBell />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-12 h-12 bg-card/90 backdrop-blur-xl border-2 border-border/50 hover:bg-card hover:border-primary/60 text-foreground rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-primary-glow/50">
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
      </div>

      
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};
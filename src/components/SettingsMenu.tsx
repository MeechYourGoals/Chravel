import React, { useState } from 'react';
import { X, User, LogIn, WifiOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { useIsMobile } from '../hooks/use-mobile';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { Button } from './ui/button';

import { ProUpgradeModal } from './ProUpgradeModal';
import { EnterpriseSettings } from './EnterpriseSettings';
import { ConsumerSettings } from './ConsumerSettings';
import { EventsSettings } from './EventsSettings';
import { AdvertiserSettingsPanel } from './advertiser/AdvertiserSettingsPanel';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthModal } from './AuthModal';
import { useDemoMode } from '../hooks/useDemoMode';
import { createMockDemoUser } from '../utils/authGate';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  initialConsumerSection?: string;
  initialSettingsType?: 'consumer' | 'enterprise' | 'events' | 'advertiser';
  // Callback when a trip is restored/unhidden (for parent component to refresh)
  onTripStateChange?: () => void;
}

export const SettingsMenu = ({
  isOpen,
  onClose,
  initialConsumerSection,
  initialSettingsType,
  onTripStateChange,
}: SettingsMenuProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { isOffline } = useOfflineStatus();
  const [showProModal, setShowProModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [settingsType, setSettingsType] = useState<
    'consumer' | 'enterprise' | 'events' | 'advertiser'
  >(initialSettingsType || 'consumer');
  const { demoView } = useDemoMode();

  // In app-preview mode, use mock user if not logged in (full demo access)
  // In marketing mode or off, require real user
  const isAppPreview = demoView === 'app-preview';
  const currentUser = user || (isAppPreview ? createMockDemoUser() : null);

  // Allow advertiser access ONLY for app-preview mode (demo mode for investors)
  // Hidden for authenticated users (including super admins) until Chravel Recs feature is live
  const canAccessAdvertiser = isAppPreview;

  if (!isOpen) return null;

  // Show login prompt only when NOT in app-preview mode and no real user
  if (!currentUser) {
    return (
      <>
        <div
          className={`fixed inset-0 z-50 ${isMobile ? 'bg-black' : 'bg-black/80 backdrop-blur-sm flex items-center justify-center p-4'}`}
          onClick={!isMobile ? onClose : undefined}
        >
          <div
            className={`${isMobile ? 'h-full' : 'bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl max-w-md w-full'}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b border-white/10"
              style={{ paddingTop: 'max(16px, calc(env(safe-area-inset-top, 0px) + 12px))' }}
            >
              <h2 className="text-xl font-semibold text-white">Settings</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            {/* Login CTA */}
            <div
              className={`flex flex-col items-center justify-center p-8 gap-6 text-center ${isMobile ? 'min-h-[80vh]' : ''}`}
            >
              <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Sign in to access settings</h3>
                <p className="text-gray-400 text-sm">
                  Create an account or log in to personalize your experience
                </p>
              </div>
              <div className="flex gap-3 w-full max-w-xs">
                {!isMobile && (
                  <Button onClick={onClose} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={() => setShowAuthModal(true)}
                  size="lg"
                  className={isMobile ? 'w-full' : 'flex-1'}
                >
                  <LogIn className="h-5 w-5 mr-2" /> Log In / Sign Up
                </Button>
              </div>
            </div>
          </div>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4"
        onClick={onClose}
      >
        <div
          className="w-full h-full md:h-[85vh] md:max-w-6xl bg-black/90 md:bg-card/95 md:backdrop-blur-xl md:border md:border-white/10 md:rounded-2xl shadow-2xl flex flex-col animate-fade-in overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Combined Header with Settings Type Toggle */}
          <div
            className="flex-shrink-0 flex items-center justify-between p-3 md:px-4 md:py-3 border-b border-white/10 bg-black/20 gap-3"
            style={{ paddingTop: 'max(12px, calc(env(safe-area-inset-top, 0px) + 12px))' }}
          >
            <h2 className="text-lg font-semibold text-white whitespace-nowrap">Settings</h2>

            {/* Settings Type Tabs */}
            <ScrollArea className="flex-1">
              <div className="flex items-center justify-center gap-1 md:gap-2">
                <button
                  onClick={() => setSettingsType('consumer')}
                  className={`py-2 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    settingsType === 'consumer'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Group
                </button>
                <button
                  onClick={() => setSettingsType('enterprise')}
                  className={`py-2 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    settingsType === 'enterprise'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Enterprise
                </button>
                <button
                  onClick={() => setSettingsType('events')}
                  className={`py-2 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    settingsType === 'events'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Events
                </button>
                {canAccessAdvertiser && (
                  <button
                    onClick={() => setSettingsType('advertiser')}
                    className={`py-2 px-4 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      settingsType === 'advertiser'
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Advertiser
                  </button>
                )}
              </div>
              <ScrollBar orientation="horizontal" className="md:hidden" />
            </ScrollArea>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          {/* Offline banner */}
          {isOffline && (
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-500/20 border-b border-amber-500/30 text-amber-200 text-sm">
              <WifiOff size={16} />
              <span>You&apos;re offline. Some settings may not be available.</span>
            </div>
          )}

          {/* Auth Section - Show user info at top (Sign Out moved to Profile section) */}
          <div className="flex-shrink-0 p-4 border-b border-white/10 bg-gradient-to-r from-primary/10 to-primary/5">
            {user ? (
              // Logged In: Show user info only (Sign Out is in Profile > Account section)
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Signed in as</p>
                  <p className="text-sm font-medium text-white truncate max-w-[200px]">
                    {user.email}
                  </p>
                </div>
              </div>
            ) : (
              // Logged Out: Show Login/Sign Up
              <Button onClick={() => setShowAuthModal(true)} className="w-full">
                <LogIn className="h-4 w-4 mr-2" /> Log In / Sign Up
              </Button>
            )}
          </div>

          {/* Render appropriate settings based on toggle */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {settingsType === 'consumer' ? (
              <div className="flex-1 min-h-0">
                <ErrorBoundary compact>
                  <ConsumerSettings
                    currentUserId={currentUser.id}
                    initialSection={initialConsumerSection}
                    onClose={onClose}
                    onTripStateChange={onTripStateChange}
                  />
                </ErrorBoundary>
              </div>
            ) : settingsType === 'enterprise' ? (
              <div className="flex-1 min-h-0">
                <ErrorBoundary compact>
                  <EnterpriseSettings organizationId="" currentUserId={currentUser.id} />
                </ErrorBoundary>
              </div>
            ) : settingsType === 'events' ? (
              <div className="flex-1 min-h-0">
                <ErrorBoundary compact>
                  <EventsSettings currentUserId={currentUser?.id || ''} />
                </ErrorBoundary>
              </div>
            ) : settingsType === 'advertiser' ? (
              <div className="flex-1 min-h-0">
                <ErrorBoundary compact>
                  <AdvertiserSettingsPanel currentUserId={currentUser?.id || ''} />
                </ErrorBoundary>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ProUpgradeModal isOpen={showProModal} onClose={() => setShowProModal(false)} />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};

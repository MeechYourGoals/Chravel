import React from 'react';

interface DesktopHeaderProps {
  viewMode: string;
  onCreateTrip: () => void;
  onUpgrade: () => void;
  onSettings: (
    settingsType?: 'consumer' | 'enterprise' | 'events' | 'advertiser',
    activeSection?: string,
  ) => void;
}

export const DesktopHeader = (_props: DesktopHeaderProps) => {
  // Account button removed - signed-in users access Settings through the navigation menu
  return null;
};

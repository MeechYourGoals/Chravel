import React from 'react';
import { HeaderAuthButton } from '../HeaderAuthButton';

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
  return (
    <div className="fixed top-4 right-4 z-50">
      <HeaderAuthButton showLoggedOut={false} />
    </div>
  );
};

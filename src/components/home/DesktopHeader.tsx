import React from 'react';
import { DemoModeSelector } from '../DemoModeSelector';
import { HeaderAuthButton } from '../HeaderAuthButton';

import { useAuth } from '../../hooks/useAuth';
import { SUPER_ADMIN_EMAILS } from '@/constants/admins';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

interface DesktopHeaderProps {
  viewMode: string;
  onCreateTrip: () => void;
  onUpgrade: () => void;
  onSettings: (
    settingsType?: 'consumer' | 'enterprise' | 'events' | 'advertiser',
    activeSection?: string,
  ) => void;
}

export const DesktopHeader = ({ viewMode }: DesktopHeaderProps) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

  return (
    <div className="mb-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Logo - Centered text */}
        <div className="flex flex-col items-center text-center">
          <h1
            className="text-2xl font-bold text-foreground tracking-tight transition-all duration-300 hover:brightness-110 hover:scale-105"
            aria-label="ChravelApp Home"
          >
            ChravelApp
          </h1>
          <span className="text-xs text-muted-foreground">
            The Group <span className="font-bold">Ch</span>at T
            <span className="font-bold">ravel</span> <span className="font-bold">App</span>
          </span>
        </div>

        {/* Center: Demo Selector - only render wrapper if super admin */}
        {isSuperAdmin && (
          <div className="flex-1 flex justify-center">
            <DemoModeSelector />
          </div>
        )}

        {/* Right: Auth Button */}
        <div className="flex items-center">
          <HeaderAuthButton />
        </div>
      </div>
    </div>
  );
};

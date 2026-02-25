/**
 * Enable Notifications Button
 *
 * Platform-aware button for enabling push notifications.
 * Shows iOS instructions when needed.
 */

import React, { useState, useCallback } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Bell, BellOff, CheckCircle2, Loader2 } from 'lucide-react';
import { useWebPush } from '@/hooks/useWebPush';
import { IOSPushInstructions } from './IOSPushInstructions';
import { toast } from 'sonner';

interface EnableNotificationsButtonProps extends Omit<ButtonProps, 'onClick'> {
  onSuccess?: () => void;
  compact?: boolean;
}

export const EnableNotificationsButton: React.FC<EnableNotificationsButtonProps> = ({
  onSuccess,
  compact = false,
  className,
  ...props
}) => {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    requiresHomeScreen,
    iosUnsupported,
    subscribe,
  } = useWebPush();

  const [showIOSDialog, setShowIOSDialog] = useState(false);

  const handleClick = useCallback(async () => {
    // iOS needs Add to Home Screen
    if (requiresHomeScreen) {
      setShowIOSDialog(true);
      return;
    }

    // iOS too old
    if (iosUnsupported) {
      toast.error('Push notifications require iOS 16.4 or later');
      return;
    }

    // Not supported
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }

    const success = await subscribe();
    if (success) {
      toast.success('Notifications enabled!');
      onSuccess?.();
    }
  }, [requiresHomeScreen, iosUnsupported, isSupported, subscribe, onSuccess]);

  // Already subscribed
  if (isSubscribed && permission === 'granted') {
    return (
      <Button variant="secondary" disabled className={className} {...props}>
        <CheckCircle2 className="w-4 h-4" />
        {!compact && <span className="ml-2">Notifications Enabled</span>}
      </Button>
    );
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <Button variant="secondary" disabled className={className} {...props}>
        <BellOff className="w-4 h-4" />
        {!compact && <span className="ml-2">Notifications Blocked</span>}
      </Button>
    );
  }

  return (
    <>
      <Button onClick={handleClick} disabled={isLoading} className={className} {...props}>
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
        {!compact && <span className="ml-2">Enable Notifications</span>}
      </Button>

      <IOSPushInstructions open={showIOSDialog} onClose={() => setShowIOSDialog(false)} />
    </>
  );
};

export default EnableNotificationsButton;

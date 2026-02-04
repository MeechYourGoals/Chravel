/**
 * Enable Notifications Button
 * 
 * A platform-aware button that handles notification permission requests.
 * 
 * Behavior:
 * - Android/Desktop: Requests permission immediately via browser API
 * - iOS (not standalone): Shows Add to Home Screen instructions
 * - iOS (standalone): Requests permission via browser API
 * - Unsupported: Shows explanation and offers email fallback
 */

import React, { useState, useCallback } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Bell, BellOff, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlatformNotifications } from '@/hooks/usePlatformNotifications';
import { IOSAddToHomeModal } from './IOSAddToHomeModal';
import { useAuth } from '@/hooks/useAuth';

// ============================================================================
// Types
// ============================================================================

interface EnableNotificationsButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** Callback when notifications are successfully enabled */
  onSuccess?: () => void;
  /** Callback when user dismisses or denies */
  onDismiss?: () => void;
  /** Show compact version (icon only) */
  compact?: boolean;
  /** Custom label for the button */
  label?: string;
}

// ============================================================================
// Component
// ============================================================================

export const EnableNotificationsButton: React.FC<EnableNotificationsButtonProps> = ({
  onSuccess,
  onDismiss,
  compact = false,
  label,
  className,
  variant = 'default',
  size = 'default',
  ...props
}) => {
  const { user } = useAuth();
  const {
    canUsePush,
    pushSupport,
    isSubscribed,
    isLoading,
    permission,
    requestPermission,
    showIOSInstructions,
    showIOSModal,
    hideIOSModal,
    enableEmailFallback,
  } = usePlatformNotifications();
  
  const [localLoading, setLocalLoading] = useState(false);
  
  // Handle button click
  const handleClick = useCallback(async () => {
    setLocalLoading(true);
    
    try {
      await requestPermission();
      
      // Check if we showed iOS modal (handled separately)
      if (pushSupport.requiresHomeScreen) {
        return; // Modal is now open, don't call onSuccess yet
      }
      
      // If push is now subscribed or permission granted
      if (canUsePush) {
        onSuccess?.();
      }
    } catch (err) {
      console.error('[EnableNotificationsButton] Error:', err);
    } finally {
      setLocalLoading(false);
    }
  }, [requestPermission, pushSupport.requiresHomeScreen, canUsePush, onSuccess]);
  
  // Handle iOS modal close
  const handleIOSModalClose = useCallback(() => {
    hideIOSModal();
    // If user completed setup (now in standalone mode), call onSuccess
    if (isSubscribed) {
      onSuccess?.();
    } else {
      onDismiss?.();
    }
  }, [hideIOSModal, isSubscribed, onSuccess, onDismiss]);
  
  // Handle email fallback from iOS modal
  const handleEmailFallback = useCallback(async (email: string): Promise<boolean> => {
    const success = await enableEmailFallback(email);
    if (success) {
      onSuccess?.();
    }
    return success;
  }, [enableEmailFallback, onSuccess]);
  
  // Determine button state
  const getButtonContent = () => {
    const loading = isLoading || localLoading;
    
    // Already subscribed
    if (isSubscribed && permission === 'granted') {
      return {
        icon: <CheckCircle2 className="w-4 h-4" />,
        label: 'Notifications Enabled',
        disabled: true,
      };
    }
    
    // Permission denied
    if (permission === 'denied') {
      return {
        icon: <BellOff className="w-4 h-4" />,
        label: 'Notifications Blocked',
        disabled: true,
      };
    }
    
    // Loading
    if (loading) {
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        label: 'Enabling...',
        disabled: true,
      };
    }
    
    // iOS not standalone - will show instructions
    if (pushSupport.requiresHomeScreen) {
      return {
        icon: <Bell className="w-4 h-4" />,
        label: 'Enable Notifications',
        disabled: false,
      };
    }
    
    // Push not supported at all
    if (!canUsePush && pushSupport.unsupportedReason === 'ios_too_old') {
      return {
        icon: <BellOff className="w-4 h-4" />,
        label: 'Not Supported',
        disabled: true,
      };
    }
    
    // Default - ready to enable
    return {
      icon: <Bell className="w-4 h-4" />,
      label: 'Enable Notifications',
      disabled: false,
    };
  };
  
  const content = getButtonContent();
  const buttonLabel = label || content.label;
  
  return (
    <>
      <Button
        variant={isSubscribed ? 'secondary' : variant}
        size={size}
        className={cn(
          compact && 'px-2',
          className
        )}
        onClick={handleClick}
        disabled={content.disabled}
        {...props}
      >
        {content.icon}
        {!compact && <span className="ml-2">{buttonLabel}</span>}
      </Button>
      
      {/* iOS Instructions Modal */}
      <IOSAddToHomeModal
        open={showIOSInstructions}
        onClose={handleIOSModalClose}
        onEmailFallback={handleEmailFallback}
        userEmail={user?.email}
      />
    </>
  );
};

/**
 * Inline notification prompt for use in forms/cards
 */
export const NotificationPrompt: React.FC<{
  title?: string;
  description?: string;
  onSuccess?: () => void;
  onDismiss?: () => void;
  className?: string;
}> = ({
  title = 'Stay Updated',
  description = 'Enable notifications to get alerts about trip updates, messages, and reminders.',
  onSuccess,
  onDismiss,
  className,
}) => {
  const { isSubscribed, permission } = usePlatformNotifications();
  
  // Don't show if already subscribed or denied
  if (isSubscribed || permission === 'denied') {
    return null;
  }
  
  return (
    <div className={cn(
      'flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20',
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-muted-foreground"
        >
          Not Now
        </Button>
        <EnableNotificationsButton
          size="sm"
          onSuccess={onSuccess}
          onDismiss={onDismiss}
        />
      </div>
    </div>
  );
};

export default EnableNotificationsButton;

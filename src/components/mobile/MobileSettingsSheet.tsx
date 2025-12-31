import React, { useState } from 'react';
import { Settings, LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { DemoModeSelector } from '@/components/DemoModeSelector';
import { AuthModal } from '@/components/AuthModal';
import { SUPER_ADMIN_EMAILS } from '@/constants/admins';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface MobileSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullSettings: () => void;
}

export const MobileSettingsSheet = ({
  isOpen,
  onClose,
  onOpenFullSettings,
}: MobileSettingsSheetProps) => {
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const handleOpenAuth = () => {
    onClose();
    setShowAuthModal(true);
  };

  const handleOpenAllSettings = () => {
    onClose();
    onOpenFullSettings();
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          side="bottom"
          className="h-auto max-h-[85vh] rounded-t-3xl border-t-2 border-border/50 bg-background/95 backdrop-blur-xl"
        >
          <SheetHeader className="pb-4">
            <SheetTitle className="text-center text-lg font-semibold">Quick Settings</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-6">
            {/* Demo Mode Toggle - only show for super admin */}
            {isSuperAdmin && (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">Demo Mode</p>
                  <div className="flex justify-center">
                    <DemoModeSelector />
                  </div>
                </div>

                <Separator className="my-4" />
              </>
            )}

            {/* Auth Section */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground px-1">Account</p>

              {user ? (
                <div className="space-y-3">
                  {/* Logged In: Show Email + Sign Out */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Signed in as</p>
                      <p className="text-sm font-medium truncate">{user.email}</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    className="w-full h-12 text-sm font-medium rounded-xl border-2 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                /* Logged Out: Show Log In / Sign Up Button */
                <Button
                  onClick={handleOpenAuth}
                  className="w-full h-12 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Log In / Sign Up
                </Button>
              )}
            </div>

            <Separator className="my-4" />

            {/* All Settings Button */}
            <Button
              onClick={handleOpenAllSettings}
              variant="outline"
              className="w-full h-12 text-sm font-medium rounded-xl border-2 border-border/50 hover:bg-accent/50"
            >
              <Settings className="mr-2 h-4 w-4" />
              All Settings
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};

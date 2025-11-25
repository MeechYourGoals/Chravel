import React, { useState } from 'react';
import { LogIn, LogOut, User, Crown, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AuthModal } from './AuthModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';

export const HeaderAuthButton = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center justify-center gap-1.5 transition-all duration-200 rounded-lg
              bg-background/40 border-border/50 border-2 text-foreground/90 hover:bg-background/50 
              backdrop-blur-md h-9 px-3"
          >
            <Avatar className="h-4 w-4">
              <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                {getInitials(user.email || 'U')}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] font-medium hidden sm:inline">Account</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">Signed in as</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => navigate('/settings/profile')}
            className="cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => navigate('/settings/subscription')}
            className="cursor-pointer"
          >
            <Crown className="mr-2 h-4 w-4" />
            <span>Upgrade</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowAuthModal(true)}
        variant="outline"
        size="sm"
        className="flex items-center justify-center gap-1.5 transition-all duration-200 rounded-lg
          bg-primary/30 border-primary/70 border-2 text-primary hover:bg-primary/40 
          shadow-lg shadow-primary/20 backdrop-blur-md h-9 px-3"
      >
        <LogIn className="h-4 w-4" />
        <span className="text-[10px] font-medium">Login</span>
      </Button>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};

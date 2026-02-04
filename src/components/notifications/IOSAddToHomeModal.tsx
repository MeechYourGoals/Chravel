/**
 * iOS Add to Home Screen Instructions Modal
 * 
 * Shows step-by-step instructions for iOS users to add Chravel to their
 * Home Screen, which is required for push notifications on iOS 16.4+.
 * 
 * Features:
 * - Animated step-by-step guide
 * - Visual indicators for Share button and Add to Home Screen
 * - Detection of successful installation
 * - Alternative email notification option
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Share, 
  Plus, 
  Bell, 
  Mail, 
  CheckCircle2, 
  ArrowRight,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { detectPlatform } from '@/utils/platformDetection';

// ============================================================================
// Types
// ============================================================================

interface IOSAddToHomeModalProps {
  open: boolean;
  onClose: () => void;
  onEmailFallback?: (email: string) => Promise<boolean>;
  userEmail?: string | null;
}

type Step = 'intro' | 'step1' | 'step2' | 'step3' | 'email_fallback' | 'success';

// ============================================================================
// Share Icon Component (iOS-style)
// ============================================================================

const IOSShareIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

// ============================================================================
// Step Components
// ============================================================================

const StepIndicator: React.FC<{ 
  currentStep: number; 
  totalSteps: number;
}> = ({ currentStep, totalSteps }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {Array.from({ length: totalSteps }, (_, i) => (
      <div
        key={i}
        className={cn(
          'w-2 h-2 rounded-full transition-colors',
          i + 1 <= currentStep ? 'bg-primary' : 'bg-muted'
        )}
      />
    ))}
  </div>
);

const IntroStep: React.FC<{ onContinue: () => void; onSkip: () => void }> = ({ 
  onContinue, 
  onSkip 
}) => (
  <div className="text-center space-y-6">
    <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
      <Bell className="w-10 h-10 text-primary" />
    </div>
    
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Get Notified Instantly</h3>
      <p className="text-muted-foreground text-sm">
        To receive push notifications on your iPhone or iPad, you need to add 
        Chravel to your Home Screen first. It only takes a few seconds!
      </p>
    </div>
    
    <div className="bg-muted/50 rounded-lg p-4 text-left">
      <h4 className="font-medium text-sm mb-2">Why is this needed?</h4>
      <p className="text-xs text-muted-foreground">
        Apple requires web apps to be installed on your Home Screen before they 
        can send push notifications. This is a one-time setup.
      </p>
    </div>
    
    <div className="flex flex-col gap-2">
      <Button onClick={onContinue} className="w-full">
        Show Me How
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
      <Button variant="ghost" onClick={onSkip} className="w-full text-muted-foreground">
        Use Email Notifications Instead
      </Button>
    </div>
  </div>
);

const Step1Share: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <div className="text-center space-y-6">
    <StepIndicator currentStep={1} totalSteps={3} />
    
    <div className="relative">
      <div className="w-full h-40 bg-gradient-to-b from-muted/30 to-muted/10 rounded-lg flex items-end justify-center pb-4">
        {/* Safari browser mockup */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-6 px-4">
            <div className="w-8 h-8 rounded bg-muted" />
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center animate-pulse">
                <IOSShareIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping" />
            </div>
            <div className="w-8 h-8 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
    
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Step 1: Tap the Share Button</h3>
      <p className="text-muted-foreground text-sm">
        Look for the Share button at the bottom of Safari (the square with an 
        arrow pointing up).
      </p>
    </div>
    
    <Button onClick={onNext} className="w-full">
      I Found It
      <ArrowRight className="w-4 h-4 ml-2" />
    </Button>
  </div>
);

const Step2AddToHome: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <div className="text-center space-y-6">
    <StepIndicator currentStep={2} totalSteps={3} />
    
    <div className="relative">
      <div className="w-full bg-muted/30 rounded-lg p-4">
        {/* Share sheet mockup */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm">Copy Link</span>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border-2 border-primary animate-pulse">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-primary">Add to Home Screen</span>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
              <Mail className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm">Share via Mail</span>
          </div>
        </div>
      </div>
    </div>
    
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Step 2: Select "Add to Home Screen"</h3>
      <p className="text-muted-foreground text-sm">
        Scroll down in the Share menu and tap "Add to Home Screen". You may 
        need to scroll to find it.
      </p>
    </div>
    
    <Button onClick={onNext} className="w-full">
      Got It
      <ArrowRight className="w-4 h-4 ml-2" />
    </Button>
  </div>
);

const Step3Confirm: React.FC<{ onComplete: () => void }> = ({ onComplete }) => (
  <div className="text-center space-y-6">
    <StepIndicator currentStep={3} totalSteps={3} />
    
    <div className="relative">
      <div className="w-full bg-muted/30 rounded-lg p-4">
        {/* Add to Home confirmation mockup */}
        <div className="bg-background rounded-lg p-4 border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <div className="text-left">
              <div className="font-medium">Chravel</div>
              <div className="text-xs text-muted-foreground">chravel.app</div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <div className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium animate-pulse">
              Add
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Step 3: Tap "Add"</h3>
      <p className="text-muted-foreground text-sm">
        Tap the "Add" button in the top right corner. Chravel will appear on 
        your Home Screen!
      </p>
    </div>
    
    <div className="bg-primary/5 rounded-lg p-4 text-left">
      <p className="text-xs text-muted-foreground">
        <strong>After adding:</strong> Open Chravel from your Home Screen 
        (not Safari), and you'll be able to enable push notifications.
      </p>
    </div>
    
    <Button onClick={onComplete} className="w-full">
      <CheckCircle2 className="w-4 h-4 mr-2" />
      I've Added It
    </Button>
  </div>
);

const EmailFallbackStep: React.FC<{
  email: string;
  setEmail: (email: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
}> = ({ email, setEmail, onSubmit, onBack, isLoading }) => (
  <div className="space-y-6">
    <div className="text-center space-y-2">
      <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center">
        <Mail className="w-8 h-8 text-blue-500" />
      </div>
      <h3 className="text-lg font-semibold">Get Email Notifications Instead</h3>
      <p className="text-muted-foreground text-sm">
        We'll send important updates to your email address.
      </p>
    </div>
    
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      
      <div className="text-xs text-muted-foreground">
        You'll receive notifications for:
        <ul className="mt-1 ml-4 list-disc">
          <li>New messages in your trips</li>
          <li>Trip updates and reminders</li>
          <li>Payment requests</li>
        </ul>
      </div>
    </div>
    
    <div className="flex flex-col gap-2">
      <Button 
        onClick={onSubmit} 
        disabled={!email || isLoading}
        className="w-full"
      >
        {isLoading ? 'Saving...' : 'Enable Email Notifications'}
      </Button>
      <Button variant="ghost" onClick={onBack} className="w-full">
        Back to Instructions
      </Button>
    </div>
  </div>
);

const SuccessStep: React.FC<{ 
  method: 'home_screen' | 'email'; 
  onClose: () => void;
}> = ({ method, onClose }) => (
  <div className="text-center space-y-6">
    <div className="w-20 h-20 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
      <CheckCircle2 className="w-10 h-10 text-green-500" />
    </div>
    
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">You're All Set!</h3>
      <p className="text-muted-foreground text-sm">
        {method === 'home_screen' 
          ? "Now open Chravel from your Home Screen to enable push notifications."
          : "We'll send important updates to your email address."}
      </p>
    </div>
    
    {method === 'home_screen' && (
      <div className="bg-primary/5 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Smartphone className="w-8 h-8 text-primary" />
          <div className="text-left">
            <div className="font-medium text-sm">Look for Chravel on your Home Screen</div>
            <div className="text-xs text-muted-foreground">
              Tap the icon to open the app and enable notifications
            </div>
          </div>
        </div>
      </div>
    )}
    
    <Button onClick={onClose} className="w-full">
      Done
    </Button>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const IOSAddToHomeModal: React.FC<IOSAddToHomeModalProps> = ({
  open,
  onClose,
  onEmailFallback,
  userEmail,
}) => {
  const [step, setStep] = useState<Step>('intro');
  const [email, setEmail] = useState(userEmail || '');
  const [isLoading, setIsLoading] = useState(false);
  const [successMethod, setSuccessMethod] = useState<'home_screen' | 'email'>('home_screen');
  
  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep('intro');
      setEmail(userEmail || '');
      setIsLoading(false);
    }
  }, [open, userEmail]);
  
  // Check if user has added to home screen
  useEffect(() => {
    if (!open) return;
    
    const checkStandalone = () => {
      const platform = detectPlatform();
      if (platform.isStandalone) {
        setSuccessMethod('home_screen');
        setStep('success');
      }
    };
    
    // Check periodically while modal is open
    const interval = setInterval(checkStandalone, 2000);
    
    return () => clearInterval(interval);
  }, [open]);
  
  const handleEmailSubmit = useCallback(async () => {
    if (!email || !onEmailFallback) return;
    
    setIsLoading(true);
    try {
      const success = await onEmailFallback(email);
      if (success) {
        setSuccessMethod('email');
        setStep('success');
      }
    } catch (err) {
      console.error('Failed to enable email fallback:', err);
    } finally {
      setIsLoading(false);
    }
  }, [email, onEmailFallback]);
  
  const handleHomeScreenComplete = useCallback(() => {
    setSuccessMethod('home_screen');
    setStep('success');
  }, []);
  
  const renderStep = () => {
    switch (step) {
      case 'intro':
        return (
          <IntroStep 
            onContinue={() => setStep('step1')} 
            onSkip={() => setStep('email_fallback')} 
          />
        );
      case 'step1':
        return <Step1Share onNext={() => setStep('step2')} />;
      case 'step2':
        return <Step2AddToHome onNext={() => setStep('step3')} />;
      case 'step3':
        return <Step3Confirm onComplete={handleHomeScreenComplete} />;
      case 'email_fallback':
        return (
          <EmailFallbackStep
            email={email}
            setEmail={setEmail}
            onSubmit={handleEmailSubmit}
            onBack={() => setStep('intro')}
            isLoading={isLoading}
          />
        );
      case 'success':
        return <SuccessStep method={successMethod} onClose={onClose} />;
      default:
        return null;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Enable Notifications on iOS</DialogTitle>
          <DialogDescription>
            Follow these steps to add Chravel to your Home Screen and enable push notifications.
          </DialogDescription>
        </DialogHeader>
        
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
};

export default IOSAddToHomeModal;

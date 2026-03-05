/**
 * Onboarding Carousel - Premium 5-screen product tour
 *
 * Desktop: two-column layout (phone preview + copy/controls)
 * Tablet: centered phone frame + controls below
 * Mobile: full-bleed animated content
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingProgressDots } from './OnboardingProgressDots';
import { WelcomeScreen } from './demo/screens/WelcomeScreen';
import { ChatDemoScreen } from './demo/screens/ChatDemoScreen';
import { CalendarDemoScreen } from './demo/screens/CalendarDemoScreen';
import { PaymentsTrackingDemoScreen } from './demo/screens/PaymentsTrackingDemoScreen';
import { FinalCTAScreen } from './demo/screens/FinalCTAScreen';
import { PhoneFrame } from './demo/PhoneFrame';
import { useOnboardingLayout } from './demo/useOnboardingLayout';
import type { DemoPill } from './demo/tokens';
import * as haptics from '@/native/haptics';
import { onboardingEvents } from '@/telemetry/events';

interface OnboardingCarouselProps {
  onComplete: () => void;
  onSkip: () => void;
  onExploreDemoTrip: () => void;
  onCreateTrip: () => void;
}

const TOTAL_SCREENS = 5;

interface ScreenConfig {
  component:
    | React.ComponentType<Record<string, never>>
    | React.ComponentType<{ onCreateTrip: () => void; onExploreDemoTrip: () => void }>;
  title: string;
  subtitle: string;
  pill?: DemoPill;
  glintPill?: DemoPill;
  showInFrame?: boolean;
}

const screens: ScreenConfig[] = [
  {
    component: WelcomeScreen,
    title: 'Plan group trips without the chaos',
    subtitle: 'Chat, plan, split costs, and get AI help — all in one place',
    showInFrame: false,
  },
  {
    component: ChatDemoScreen,
    title: 'One trip. One chat.',
    subtitle: 'Messages, broadcasts, and reactions — all in your trip.',
    pill: 'chat',
    showInFrame: true,
  },
  {
    component: CalendarDemoScreen,
    title: "Plans that don't drift.",
    subtitle: 'Shared itinerary with AI-powered suggestions.',
    pill: 'calendar',
    glintPill: 'concierge',
    showInFrame: true,
  },
  {
    component: PaymentsTrackingDemoScreen,
    title: 'Money, organized.',
    subtitle: 'Track expenses, split bills, settle up.',
    pill: 'payments',
    showInFrame: true,
  },
  { component: FinalCTAScreen, title: '', subtitle: '', showInFrame: false },
];

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
};

export const OnboardingCarousel = ({
  onComplete,
  onSkip,
  onExploreDemoTrip,
  onCreateTrip,
}: OnboardingCarouselProps) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(0);
  const layout = useOnboardingLayout();

  useEffect(() => {
    onboardingEvents.screenViewed(currentScreen);
  }, [currentScreen]);

  const goToScreen = useCallback(
    (index: number) => {
      if (index < 0 || index >= TOTAL_SCREENS) return;
      setDirection(index > currentScreen ? 1 : -1);
      setCurrentScreen(index);
      haptics.light();
    },
    [currentScreen],
  );

  const handleNext = useCallback(() => {
    if (currentScreen < TOTAL_SCREENS - 1) goToScreen(currentScreen + 1);
  }, [currentScreen, goToScreen]);

  const handlePrev = useCallback(() => {
    if (currentScreen > 0) goToScreen(currentScreen - 1);
  }, [currentScreen, goToScreen]);

  const handleSkip = useCallback(() => {
    onboardingEvents.skipped(currentScreen);
    haptics.medium();
    onSkip();
  }, [currentScreen, onSkip]);

  const handleComplete = useCallback(() => {
    onboardingEvents.completed();
    haptics.success();
    onComplete();
  }, [onComplete]);

  const handleCreateTrip = useCallback(() => {
    handleComplete();
    onCreateTrip();
  }, [handleComplete, onCreateTrip]);

  const handleExploreDemoTrip = useCallback(() => {
    onboardingEvents.demoTripSelected();
    handleComplete();
    onExploreDemoTrip();
  }, [handleComplete, onExploreDemoTrip]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'Escape') handleSkip();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleSkip]);

  const config = screens[currentScreen];
  const isLastScreen = currentScreen === TOTAL_SCREENS - 1;
  const isDemoScreen = config.showInFrame;

  const renderScreenContent = () => {
    if (currentScreen === TOTAL_SCREENS - 1) {
      return (
        <FinalCTAScreen onCreateTrip={handleCreateTrip} onExploreDemoTrip={handleExploreDemoTrip} />
      );
    }
    const Screen = config.component as React.ComponentType;
    return <Screen />;
  };

  const renderAnimatedContent = () => (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={currentScreen}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
        className="absolute inset-0"
      >
        {isDemoScreen && config.pill ? (
          <PhoneFrame activePill={config.pill} glintPill={config.glintPill}>
            {renderScreenContent()}
          </PhoneFrame>
        ) : (
          renderScreenContent()
        )}
      </motion.div>
    </AnimatePresence>
  );

  // Controls block (progress + buttons)
  const renderControls = () => (
    <>
      {!isLastScreen && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 w-full max-w-xs">
            {currentScreen > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
                className="shrink-0"
                aria-label="Previous screen"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <Button size="lg" className="flex-1" onClick={handleNext}>
              {currentScreen === 0 ? 'Get Started' : 'Continue'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tour
          </button>
        </div>
      )}
    </>
  );

  // ── Desktop: two-column layout ────────────────────────────────────────
  if (layout === 'desktop') {
    return (
      <motion.div
        className="fixed inset-0 z-50 bg-background flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-label="Onboarding"
      >
        {/* Skip button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSkip}
          className="absolute top-4 right-4 text-muted-foreground"
          aria-label="Skip onboarding"
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-16 max-w-4xl w-full px-8">
          {/* Left: animated preview */}
          <div
            className="relative flex items-center justify-center"
            style={{ minWidth: 300, minHeight: 560 }}
          >
            {renderAnimatedContent()}
          </div>

          {/* Right: copy + controls */}
          <div className="flex-1 flex flex-col gap-6">
            {!isLastScreen && (
              <>
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">{config.title}</h1>
                  <p className="text-lg text-muted-foreground">{config.subtitle}</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Works on web + mobile.</p>
                </div>
                <OnboardingProgressDots
                  totalScreens={TOTAL_SCREENS}
                  currentScreen={currentScreen}
                  onDotClick={goToScreen}
                />
              </>
            )}
            {renderControls()}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Mobile / Tablet: stacked layout ───────────────────────────────────
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-label="Onboarding"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="w-10" />
        <OnboardingProgressDots
          totalScreens={TOTAL_SCREENS}
          currentScreen={currentScreen}
          onDotClick={goToScreen}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSkip}
          className="text-muted-foreground"
          aria-label="Skip onboarding"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div
        className={`flex-1 relative overflow-hidden ${layout === 'tablet' && isDemoScreen ? 'flex items-center justify-center' : ''}`}
      >
        {renderAnimatedContent()}
      </div>

      {/* Footer */}
      <div className="p-6 pb-8">{renderControls()}</div>
    </motion.div>
  );
};

/**
 * Onboarding Carousel - Main container with swipe/keyboard navigation
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingProgressDots } from './OnboardingProgressDots';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { TripCreationDemo } from './screens/TripCreationDemo';
import { ChatPreviewScreen } from './screens/ChatPreviewScreen';
import { AIConciergeTeaser } from './screens/AIConciergeTeaser';
import { FinalCTAScreen } from './screens/FinalCTAScreen';
import * as haptics from '@/native/haptics';
import { onboardingEvents } from '@/telemetry/events';

interface OnboardingCarouselProps {
  onComplete: () => void;
  onSkip: () => void;
  onExploreDemoTrip: () => void;
  onCreateTrip: () => void;
}

const TOTAL_SCREENS = 5;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export const OnboardingCarousel = ({
  onComplete,
  onSkip,
  onExploreDemoTrip,
  onCreateTrip,
}: OnboardingCarouselProps) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(0);

  // Track screen views
  useEffect(() => {
    onboardingEvents.screenViewed(currentScreen);
  }, [currentScreen]);

  const goToScreen = useCallback((index: number) => {
    if (index < 0 || index >= TOTAL_SCREENS) return;
    setDirection(index > currentScreen ? 1 : -1);
    setCurrentScreen(index);
    haptics.light();
  }, [currentScreen]);

  const handleNext = useCallback(() => {
    if (currentScreen < TOTAL_SCREENS - 1) {
      goToScreen(currentScreen + 1);
    }
  }, [currentScreen, goToScreen]);

  const handlePrev = useCallback(() => {
    if (currentScreen > 0) {
      goToScreen(currentScreen - 1);
    }
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
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleSkip]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 0:
        return <WelcomeScreen />;
      case 1:
        return <TripCreationDemo />;
      case 2:
        return <ChatPreviewScreen />;
      case 3:
        return <AIConciergeTeaser />;
      case 4:
        return (
          <FinalCTAScreen
            onCreateTrip={handleCreateTrip}
            onExploreDemoTrip={handleExploreDemoTrip}
          />
        );
      default:
        return null;
    }
  };

  const isLastScreen = currentScreen === TOTAL_SCREENS - 1;

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-label="Onboarding"
    >
      {/* Header with skip button */}
      <div className="flex items-center justify-between p-4">
        <div className="w-10" /> {/* Spacer for centering */}
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

      {/* Main content area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentScreen}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-0"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer with navigation */}
      {!isLastScreen && (
        <div className="p-6 pb-8 flex flex-col items-center gap-4">
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
            <Button
              size="lg"
              className="flex-1"
              onClick={handleNext}
            >
              {currentScreen === 0 ? 'Get Started' : 'Next'}
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
    </motion.div>
  );
};

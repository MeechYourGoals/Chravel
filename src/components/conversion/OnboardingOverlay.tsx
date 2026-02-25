import React, { useState, useEffect } from 'react';
import { X, ArrowRight, MapPin, Users, Calendar, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetElement?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Chravel!',
    description: "Let's take a quick tour to get you started with collaborative trip planning.",
    icon: <Sparkles size={24} />,
  },
  {
    id: 'create-trip',
    title: 'Create Your First Trip',
    description: 'Click the + button to start planning your next adventure with friends.',
    icon: <Calendar size={24} />,
    targetElement: '[title="New Trip"]',
    position: 'bottom',
  },
  {
    id: 'invite-friends',
    title: 'Invite Your Travel Buddies',
    description: 'Add friends to collaborate on planning and split expenses together.',
    icon: <Users size={24} />,
  },
  {
    id: 'ai-concierge',
    title: 'Meet Your AI Concierge',
    description: 'Get personalized recommendations based on your location and preferences.',
    icon: <MapPin size={24} />,
  },
];

interface OnboardingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingOverlay = ({ isOpen, onClose, onComplete }: OnboardingOverlayProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightElement, setHighlightElement] = useState<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const step = onboardingSteps[currentStep];
    if (step.targetElement) {
      const element = document.querySelector(step.targetElement);
      setHighlightElement(element);

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    } else {
      setHighlightElement(null);
    }
  }, [currentStep, isOpen]);

  if (!isOpen) return null;

  const currentStepData = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const getModalPosition = () => {
    if (!highlightElement) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const rect = highlightElement.getBoundingClientRect();
    const position = currentStepData.position || 'bottom';

    switch (position) {
      case 'bottom':
        return {
          top: rect.bottom + 20,
          left: rect.left + rect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'top':
        return {
          top: rect.top - 20,
          left: rect.left + rect.width / 2,
          transform: 'translate(-50%, -100%)',
        };
      case 'left':
        return {
          top: rect.top + rect.height / 2,
          left: rect.left - 20,
          transform: 'translate(-100%, -50%)',
        };
      case 'right':
        return {
          top: rect.top + rect.height / 2,
          left: rect.right + 20,
          transform: 'translateY(-50%)',
        };
      default:
        return {
          top: rect.bottom + 20,
          left: rect.left + rect.width / 2,
          transform: 'translateX(-50%)',
        };
    }
  };

  return (
    <>
      {/* Backdrop with spotlight effect */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50">
        {highlightElement && (
          <div
            className="absolute border-4 border-primary/50 rounded-lg pointer-events-none animate-pulse"
            style={{
              top: highlightElement.getBoundingClientRect().top - 4,
              left: highlightElement.getBoundingClientRect().left - 4,
              width: highlightElement.getBoundingClientRect().width + 8,
              height: highlightElement.getBoundingClientRect().height + 8,
            }}
          />
        )}
      </div>

      {/* Onboarding Modal */}
      <div className="fixed z-50 max-w-sm" style={getModalPosition()}>
        <Card className="bg-card/95 backdrop-blur-md border border-border shadow-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                {currentStepData.icon}
              </div>
              <button
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-2">{currentStepData.title}</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {currentStepData.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {onboardingSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-2">
                  {currentStep + 1} of {onboardingSteps.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground"
                >
                  Skip tour
                </Button>
                <Button size="sm" onClick={handleNext} className="flex items-center gap-2">
                  {isLastStep ? 'Get Started' : 'Next'}
                  <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

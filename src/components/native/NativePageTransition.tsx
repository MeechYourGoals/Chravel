import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

type TransitionDirection = 'push' | 'pop' | 'fade' | 'modal';

interface NativePageTransitionProps {
  children: React.ReactNode;
  direction?: TransitionDirection;
  isActive?: boolean;
  className?: string;
}

/**
 * iOS-style page transition wrapper.
 * Provides push/pop navigation animations like UINavigationController.
 */
export const NativePageTransition = ({
  children,
  direction = 'push',
  isActive = true,
  className,
}: NativePageTransitionProps) => {
  const [animationState, setAnimationState] = useState<
    'entering' | 'entered' | 'exiting' | 'exited'
  >(isActive ? 'entering' : 'exited');

  useEffect(() => {
    if (isActive && animationState === 'exited') {
      setAnimationState('entering');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimationState('entered');
        });
      });
    } else if (!isActive && (animationState === 'entered' || animationState === 'entering')) {
      setAnimationState('exiting');
      const timer = setTimeout(() => {
        setAnimationState('exited');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isActive, animationState]);

  if (animationState === 'exited') return null;

  const getTransitionStyles = (): React.CSSProperties => {
    const isEntering = animationState === 'entering';
    const isExiting = animationState === 'exiting';

    switch (direction) {
      case 'push':
        return {
          transform: isEntering
            ? 'translateX(100%)'
            : isExiting
              ? 'translateX(100%)'
              : 'translateX(0)',
          opacity: isEntering ? 0.8 : isExiting ? 0.8 : 1,
        };
      case 'pop':
        return {
          transform: isEntering
            ? 'translateX(-30%)'
            : isExiting
              ? 'translateX(-30%)'
              : 'translateX(0)',
          opacity: isEntering ? 0.8 : isExiting ? 0.8 : 1,
        };
      case 'modal':
        return {
          transform: isEntering
            ? 'translateY(100%)'
            : isExiting
              ? 'translateY(100%)'
              : 'translateY(0)',
          opacity: 1,
        };
      case 'fade':
      default:
        return {
          opacity: isEntering ? 0 : isExiting ? 0 : 1,
          transform: isEntering ? 'scale(0.95)' : isExiting ? 'scale(0.95)' : 'scale(1)',
        };
    }
  };

  return (
    <div
      className={cn('absolute inset-0 bg-black', 'transition-all duration-300 ease-out', className)}
      style={{
        ...getTransitionStyles(),
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </div>
  );
};

// Navigation stack context
interface NavigationStackContextType {
  push: (screen: React.ReactNode, id: string) => void;
  pop: () => void;
  popToRoot: () => void;
  canPop: boolean;
}

const NavigationStackContext = React.createContext<NavigationStackContextType | null>(null);

interface StackScreen {
  id: string;
  component: React.ReactNode;
}

interface NativeNavigationStackProps {
  children: React.ReactNode;
  rootScreen: React.ReactNode;
}

/**
 * iOS-style navigation stack controller.
 * Manages push/pop navigation with proper animations.
 */
export const NativeNavigationStack = ({ children, rootScreen }: NativeNavigationStackProps) => {
  const [stack, setStack] = useState<StackScreen[]>([{ id: 'root', component: rootScreen }]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const push = (screen: React.ReactNode, id: string) => {
    if (transitioning) return;

    setTransitioning(true);
    setStack(prev => [...prev, { id, component: screen }]);

    requestAnimationFrame(() => {
      setActiveIndex(prev => prev + 1);
      setTimeout(() => setTransitioning(false), 300);
    });
  };

  const pop = () => {
    if (transitioning || stack.length <= 1) return;

    setTransitioning(true);
    setActiveIndex(prev => prev - 1);

    setTimeout(() => {
      setStack(prev => prev.slice(0, -1));
      setTransitioning(false);
    }, 300);
  };

  const popToRoot = () => {
    if (transitioning || stack.length <= 1) return;

    setTransitioning(true);
    setActiveIndex(0);

    setTimeout(() => {
      setStack(prev => [prev[0]]);
      setTransitioning(false);
    }, 300);
  };

  const contextValue: NavigationStackContextType = {
    push,
    pop,
    popToRoot,
    canPop: stack.length > 1,
  };

  return (
    <NavigationStackContext.Provider value={contextValue}>
      <div className="relative w-full h-full overflow-hidden bg-black">
        {stack.map((screen, index) => {
          const isActive = index === activeIndex;
          const isPrevious = index === activeIndex - 1;

          return (
            <div
              key={screen.id}
              className={cn(
                'absolute inset-0',
                'transition-all duration-300 ease-out',
                !isActive && !isPrevious && 'pointer-events-none',
              )}
              style={{
                transform: isActive
                  ? 'translateX(0)'
                  : isPrevious
                    ? 'translateX(-30%)'
                    : index < activeIndex
                      ? 'translateX(-100%)'
                      : 'translateX(100%)',
                opacity: isActive ? 1 : isPrevious ? 0.3 : 0,
                zIndex: index,
              }}
            >
              {screen.component}
            </div>
          );
        })}
        {children}
      </div>
    </NavigationStackContext.Provider>
  );
};

export const useNavigationStack = () => {
  const context = React.useContext(NavigationStackContext);
  if (!context) {
    throw new Error('useNavigationStack must be used within a NativeNavigationStack');
  }
  return context;
};

// Tab bar transition for switching between tabs
interface NativeTabTransitionProps {
  children: React.ReactNode;
  tabIndex: number;
  className?: string;
}

export const NativeTabTransition = ({
  children,
  tabIndex,
  className,
}: NativeTabTransitionProps) => {
  const prevIndexRef = useRef(tabIndex);
  const [direction, setDirection] = useState<'left' | 'right' | 'none'>('none');
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (tabIndex !== prevIndexRef.current) {
      setDirection(tabIndex > prevIndexRef.current ? 'left' : 'right');
      setAnimating(true);

      const timer = setTimeout(() => {
        setAnimating(false);
        setDirection('none');
      }, 200);

      prevIndexRef.current = tabIndex;
      return () => clearTimeout(timer);
    }
  }, [tabIndex]);

  return (
    <div
      className={cn(
        'w-full h-full',
        animating && 'transition-all duration-200 ease-out',
        className,
      )}
      style={{
        opacity: animating ? 0.5 : 1,
        transform: animating
          ? direction === 'left'
            ? 'translateX(-8px)'
            : 'translateX(8px)'
          : 'translateX(0)',
      }}
    >
      {children}
    </div>
  );
};

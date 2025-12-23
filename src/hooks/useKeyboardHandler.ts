import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from './use-mobile';
import { Capacitor } from '@capacitor/core';

interface KeyboardHandlerOptions {
  preventZoom?: boolean;
  adjustViewport?: boolean;
  onShow?: () => void;
  onHide?: () => void;
}

export const useKeyboardHandler = (options: KeyboardHandlerOptions = {}) => {
  const isMobile = useIsMobile();
  const initialViewportHeight = useRef<number>();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!isMobile) return;

    // Native shell (Capacitor): we rely on a single global keyboard listener in `initializeNativeShell()`.
    // This hook just mirrors the global event into React state for components that need it.
    if (Capacitor.isNativePlatform()) {
      const handleNativeKeyboard = (event: WindowEventMap['chravel:keyboard']) => {
        const nextVisible = event.detail.visible;
        setIsKeyboardVisible(nextVisible);
        if (nextVisible) {
          options.onShow?.();
        } else {
          options.onHide?.();
        }
      };

      window.addEventListener('chravel:keyboard', handleNativeKeyboard as EventListener);
      return () => {
        window.removeEventListener('chravel:keyboard', handleNativeKeyboard as EventListener);
      };
    }

    // Store initial viewport height
    initialViewportHeight.current = window.visualViewport?.height || window.innerHeight;
    const keyboardVisibleRef = { current: false };

    const handleViewportChange = () => {
      if (!window.visualViewport) return;

      const currentHeight = window.visualViewport.height;
      const heightDifference = (initialViewportHeight.current || 0) - currentHeight;
      
      // Keyboard is considered visible if viewport height decreased by more than 150px
      const nextVisible = heightDifference > 150;

      if (nextVisible !== keyboardVisibleRef.current) {
        keyboardVisibleRef.current = nextVisible;
        setIsKeyboardVisible(nextVisible);

        if (nextVisible) {
          document.body.classList.add('keyboard-visible');
          options.onShow?.();
          
          // Adjust viewport for iOS keyboard
          if (options.adjustViewport) {
            document.documentElement.style.setProperty(
              '--keyboard-height', 
              `${heightDifference}px`
            );
          }
        } else {
          document.body.classList.remove('keyboard-visible');
          options.onHide?.();
          
          if (options.adjustViewport) {
            document.documentElement.style.removeProperty('--keyboard-height');
          }
        }
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        // Prevent zoom on iOS
        if (options.preventZoom && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
          const originalFontSize = target.style.fontSize;
          target.style.fontSize = '16px';
          
          // Restore original font size after blur
          const handleBlur = () => {
            target.style.fontSize = originalFontSize;
            target.removeEventListener('blur', handleBlur);
          };
          target.addEventListener('blur', handleBlur);
        }

        // Scroll input into view on iOS
        setTimeout(() => {
          target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }, 300);
      }
    };

    // Add event listeners
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    }
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
      document.removeEventListener('focusin', handleFocusIn);
      
      // Cleanup
      document.body.classList.remove('keyboard-visible');
      document.documentElement.style.removeProperty('--keyboard-height');
    };
  }, [isMobile, options.preventZoom, options.adjustViewport, options.onShow, options.onHide]);

  return {
    isKeyboardVisible
  };
};
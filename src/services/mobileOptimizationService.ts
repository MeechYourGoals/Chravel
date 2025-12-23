// Mobile optimization service for the web/PWA (native shell optimizations may be added separately)

export class MobileOptimizationService {
  private static isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  private static isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  private static isAndroid = /Android/i.test(navigator.userAgent);

  static async initializeMobileOptimizations(): Promise<void> {
    if (!this.isMobile) return;

    try {
      // Set up mobile-specific optimizations for web
      this.setupMobileViewport();
      this.setupTouchOptimizations();
      this.setupPerformanceOptimizations();
    } catch (error) {
      console.warn('Mobile optimization setup failed:', error);
    }
  }

  private static setupMobileViewport(): void {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      document.head.appendChild(viewport);
    }
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );
  }

  private static setupTouchOptimizations(): void {
    document.documentElement.style.setProperty('touch-action', 'manipulation');
    document.documentElement.style.setProperty('-webkit-tap-highlight-color', 'transparent');
  }

  private static setupPerformanceOptimizations(): void {
    document.documentElement.style.setProperty('-webkit-overflow-scrolling', 'touch');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
    }
  }

  static async triggerHapticFeedback(): Promise<void> {
    // No haptic feedback on web
  }

  static async triggerSuccessHaptic(): Promise<void> {
    // No haptic feedback on web
  }

  static async triggerErrorHaptic(): Promise<void> {
    // No haptic feedback on web
  }

  static isMobileDevice(): boolean {
    return this.isMobile;
  }

  static isIOSDevice(): boolean {
    return this.isIOS;
  }

  static isAndroidDevice(): boolean {
    return this.isAndroid;
  }

  // Mobile-specific performance monitoring (dev only)
  static trackMobilePerformance(): (() => void) | undefined {
    if (!this.isMobile || import.meta.env.PROD) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;
    const stopTime = Date.now() + 10000; // Stop after 10 seconds

    const countFrames = () => {
      if (Date.now() > stopTime) {
        return;
      }

      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        frameCount = 0;
        lastTime = currentTime;
      }

      rafId = requestAnimationFrame(countFrames);
    };

    rafId = requestAnimationFrame(countFrames);

    // Return cleanup function
    return () => cancelAnimationFrame(rafId);
  }
}

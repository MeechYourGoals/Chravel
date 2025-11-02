// 🆕 Mobile optimization service for better performance
import { Capacitor } from '@capacitor/core';

export class MobileOptimizationService {
  private static isMobile = Capacitor.isNativePlatform();
  private static isIOS = Capacitor.getPlatform() === 'ios';
  private static isAndroid = Capacitor.getPlatform() === 'android';

  static async initializeMobileOptimizations() {
    if (!this.isMobile) return;

    try {
      // Set up mobile-specific optimizations
      this.setupMobileViewport();
      this.setupTouchOptimizations();
      this.setupPerformanceOptimizations();
    } catch (error) {
      console.warn('Mobile optimization setup failed:', error);
    }
  }

  private static setupMobileViewport() {
    if (!this.isMobile) return;

    // Set viewport meta tag for mobile
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }
  }

  private static setupTouchOptimizations() {
    if (!this.isMobile) return;

    // Prevent zoom on double tap
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    // Optimize touch targets (44px minimum)
    const style = document.createElement('style');
    style.textContent = `
      button, [role="button"], input, select, textarea {
        min-height: 44px;
        min-width: 44px;
      }
      
      .touch-target {
        min-height: 44px;
        min-width: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `;
    document.head.appendChild(style);
  }

  private static setupPerformanceOptimizations() {
    if (!this.isMobile) return;

    // Enable hardware acceleration
    document.body.style.transform = 'translateZ(0)';
    document.body.style.backfaceVisibility = 'hidden';
    document.body.style.perspective = '1000px';

    // Optimize scrolling
    (document.body.style as any).webkitOverflowScrolling = 'touch';
    document.body.style.overscrollBehavior = 'contain';

    // Reduce motion for better performance
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.style.animation = 'none';
      document.body.style.transition = 'none';
    }
  }

  static async triggerHapticFeedback(style: string = 'Medium') {
    if (!this.isMobile) return;

    try {
      // Haptic feedback will be implemented when Capacitor plugins are available
      console.log('Haptic feedback triggered:', style);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  static async triggerSuccessHaptic() {
    await this.triggerHapticFeedback('Light');
  }

  static async triggerErrorHaptic() {
    await this.triggerHapticFeedback('Heavy');
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

  // 🆕 Mobile-specific performance monitoring
  static trackMobilePerformance() {
    if (!this.isMobile || import.meta.env.PROD) return;

    // Monitor memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log('Mobile Memory Usage:', {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
      });
    }

    // Monitor frame rate
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;
    let stopTime = Date.now() + 10000; // Stop after 10 seconds
    
    const countFrames = () => {
      if (Date.now() > stopTime) {
        console.log('Performance tracking stopped');
        return;
      }

      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        console.log('Mobile FPS:', fps);
        
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

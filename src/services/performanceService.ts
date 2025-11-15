interface PerformanceMetrics {
  navigationStart?: number;
  loadComplete?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
}

class PerformanceService {
  private metrics: PerformanceMetrics = {};
  private observer?: PerformanceObserver;

  constructor() {
    this.initializeObservers();
    this.trackNavigationTiming();
  }

  private initializeObservers() {
    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            this.metrics.largestContentfulPaint = entry.startTime;
            this.reportMetric('LCP', entry.startTime);
          }
          
          if (entry.entryType === 'first-input') {
            this.metrics.firstInputDelay = (entry as any).processingStart - entry.startTime;
            this.reportMetric('FID', this.metrics.firstInputDelay);
          }
          
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            this.metrics.cumulativeLayoutShift = (this.metrics.cumulativeLayoutShift || 0) + (entry as any).value;
            this.reportMetric('CLS', this.metrics.cumulativeLayoutShift);
          }
        }
      });

      try {
        this.observer.observe({ type: 'largest-contentful-paint', buffered: true });
        this.observer.observe({ type: 'first-input', buffered: true });
        this.observer.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        console.warn('Performance observer not supported for some metrics');
      }
    }

    // Track First Contentful Paint
    if ('PerformancePaintTiming' in window) {
      const paintEntries = performance.getEntriesByType('paint');
      for (const entry of paintEntries) {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.firstContentfulPaint = entry.startTime;
          this.reportMetric('FCP', entry.startTime);
        }
      }
    }
  }

  private trackNavigationTiming() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const navigationStart = navigation.fetchStart || 0;
          this.metrics.navigationStart = navigationStart;
          this.metrics.loadComplete = navigation.loadEventEnd - navigationStart;
          
          this.reportMetric('Page Load Time', this.metrics.loadComplete);
          this.reportMetric('DNS Lookup', navigation.domainLookupEnd - navigation.domainLookupStart);
          this.reportMetric('TCP Connect', navigation.connectEnd - navigation.connectStart);
          this.reportMetric('DOM Content Loaded', navigation.domContentLoadedEventEnd - navigationStart);
        }
      }, 0);
    });
  }

  private reportMetric(name: string, value: number) {
    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'timing_complete', {
        name: name,
        value: Math.round(value)
      });
    }
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
    }
  }

  // Public methods for manual tracking
  public startTiming(name: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.reportMetric(name, duration);
    };
  }

  public markRoute(routeName: string) {
    const mark = `route-${routeName}-${Date.now()}`;
    performance.mark(mark);
    
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: routeName,
        page_location: window.location.href
      });
    }
  }

  public trackUserAction(action: string, category = 'user_interaction') {
    if (window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: window.location.pathname
      });
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

export const performanceService = new PerformanceService();

// Add global type for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
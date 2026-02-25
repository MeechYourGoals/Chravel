/**
 * Structured logging utility for Google Maps debugging
 * Provides comprehensive error context and diagnostics
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogContext = {
  component?: string;
  action?: string;
  data?: any;
  error?: any;
  timestamp?: string;
};

class MapLogger {
  private isDev = import.meta.env.DEV;
  private logs: Array<{ level: LogLevel; message: string; context: LogContext }> = [];
  private maxLogs = 100;

  /**
   * Log with structured context
   */
  private log(level: LogLevel, message: string, context: LogContext = {}) {
    const logEntry = {
      level,
      message,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
      },
    };

    // Store for debugging
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output in dev mode
    if (this.isDev) {
      const prefix = `[GoogleMaps:${context.component || 'Unknown'}]`;
      const formattedContext =
        Object.keys(context).length > 0 ? `\n${JSON.stringify(context, null, 2)}` : '';

      switch (level) {
        case 'error':
          console.error(`${prefix} ❌ ${message}${formattedContext}`);
          break;
        case 'warn':
          console.warn(`${prefix} ⚠️ ${message}${formattedContext}`);
          break;
        case 'info':
          console.info(`${prefix} ℹ️ ${message}${formattedContext}`);
          break;
        case 'debug':
          console.debug(`${prefix} 🔍 ${message}${formattedContext}`);
          break;
      }
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  /**
   * Log API call start
   */
  apiStart(endpoint: string, params: any, component: string) {
    this.debug(`API call started: ${endpoint}`, {
      component,
      action: 'api_start',
      data: { endpoint, params },
    });
  }

  /**
   * Log API call success
   */
  apiSuccess(endpoint: string, result: any, component: string) {
    this.info(`API call succeeded: ${endpoint}`, {
      component,
      action: 'api_success',
      data: { endpoint, resultCount: Array.isArray(result) ? result.length : 'N/A' },
    });
  }

  /**
   * Log API call failure
   */
  apiError(endpoint: string, error: any, component: string) {
    this.error(`API call failed: ${endpoint}`, {
      component,
      action: 'api_error',
      error: {
        message: error?.message,
        code: error?.code,
        status: error?.status,
        stack: error?.stack,
      },
    });
  }

  /**
   * Log map state changes
   */
  mapState(state: string, data: any, component: string) {
    this.debug(`Map state: ${state}`, {
      component,
      action: 'state_change',
      data,
    });
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(count: number = 20) {
    return this.logs.slice(-count);
  }

  /**
   * Export logs as JSON for support
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
  }
}

export const mapLogger = new MapLogger();

/**
 * Health check for Google Maps API
 */
export async function checkMapsApiHealth(): Promise<{
  healthy: boolean;
  issues: string[];
  apiKeyPresent: boolean;
  apiLoaded: boolean;
}> {
  const issues: string[] = [];
  let apiKeyPresent = false;
  let apiLoaded = false;

  try {
    // Check API key
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    apiKeyPresent = Boolean(apiKey && apiKey !== 'placeholder');

    if (!apiKeyPresent) {
      issues.push('Google Maps API key not configured or is placeholder');
    }

    // Check if API is loaded
    if (typeof window !== 'undefined' && window.google?.maps) {
      apiLoaded = true;
    } else {
      issues.push('Google Maps API not loaded in window object');
    }

    // Check for error overlays (common API key issue)
    if (typeof document !== 'undefined') {
      const errorOverlays = document.querySelectorAll('.gm-err-container, .dismissButton');
      if (errorOverlays.length > 0) {
        issues.push('Google Maps error overlay detected (likely billing or API key issue)');
      }
    }
  } catch (error) {
    issues.push(`Health check error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  const healthy = issues.length === 0;

  mapLogger.info('Maps API health check', {
    component: 'HealthCheck',
    data: { healthy, apiKeyPresent, apiLoaded, issues },
  });

  return { healthy, issues, apiKeyPresent, apiLoaded };
}

/**
 * Validate coordinates
 */
export function validateCoordinates(
  coords: { lat: number; lng: number } | null | undefined,
  context: string,
): boolean {
  if (!coords) {
    mapLogger.warn('Coordinates are null or undefined', {
      component: context,
      action: 'validate_coords',
    });
    return false;
  }

  if (typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
    mapLogger.error('Coordinates are not numbers', {
      component: context,
      action: 'validate_coords',
      data: { coords },
    });
    return false;
  }

  if (coords.lat < -90 || coords.lat > 90 || coords.lng < -180 || coords.lng > 180) {
    mapLogger.error('Coordinates out of valid range', {
      component: context,
      action: 'validate_coords',
      data: { coords },
    });
    return false;
  }

  return true;
}

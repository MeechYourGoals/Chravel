/**
 * Performance Monitoring Hook
 * Tracks component render performance and logs slow renders
 */

import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderCount: number;
  averageRenderTime: number;
  maxRenderTime: number;
  lastRenderTime: number;
}

const SLOW_RENDER_THRESHOLD = 16; // ms (60fps = 16.67ms per frame)
const metricsMap = new Map<string, PerformanceMetrics>();

export function usePerformanceMonitor(componentName: string, enabled = import.meta.env.DEV) {
  const renderCountRef = useRef(0);
  const renderStartRef = useRef(0);
  const totalRenderTimeRef = useRef(0);
  const maxRenderTimeRef = useRef(0);

  // Early return for production - prevent hook logic from running
  useEffect(() => {
    if (!enabled) return;
    renderStartRef.current = performance.now();
  });

  useEffect(() => {
    if (!enabled) return;

    const renderTime = performance.now() - renderStartRef.current;
    renderCountRef.current += 1;
    totalRenderTimeRef.current += renderTime;
    maxRenderTimeRef.current = Math.max(maxRenderTimeRef.current, renderTime);

    const metrics: PerformanceMetrics = {
      componentName,
      renderCount: renderCountRef.current,
      averageRenderTime: totalRenderTimeRef.current / renderCountRef.current,
      maxRenderTime: maxRenderTimeRef.current,
      lastRenderTime: renderTime
    };

    metricsMap.set(componentName, metrics);

    // Log slow renders
    if (renderTime > SLOW_RENDER_THRESHOLD) {
      console.warn(
        `[Performance] Slow render detected in ${componentName}:`,
        `${renderTime.toFixed(2)}ms`,
        `(render #${renderCountRef.current})`
      );
    }
  });

  return metricsMap.get(componentName);
}

/**
 * Get all performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics[] {
  return Array.from(metricsMap.values()).sort((a, b) => b.averageRenderTime - a.averageRenderTime);
}

/**
 * Reset all performance metrics
 */
export function resetPerformanceMetrics() {
  metricsMap.clear();
}

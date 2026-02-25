/**
 * Google Maps API Usage Dashboard
 *
 * Displays real-time usage statistics for Google Maps API:
 * - Hourly usage (last 24 hours)
 * - Daily usage (last 7 days)
 * - Estimated costs
 * - Quota warnings
 *
 * Created: 2025-02-01
 * Purpose: Monitor API usage and prevent unexpected costs
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { getHourlyUsage, getDailyUsage } from '@/services/googlePlacesCache';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type UsageStats = {
  request_count: number;
  estimated_cost_usd: number;
  date_hour?: string;
  date_day?: string;
};

type EndpointStats = {
  endpoint: string;
  hourly: UsageStats[];
  daily: UsageStats[];
  totalRequests: number;
  totalCost: number;
};

const ENDPOINTS: Array<
  'autocomplete' | 'text-search' | 'place-details' | 'nearby-search' | 'geocode'
> = ['autocomplete', 'text-search', 'place-details', 'nearby-search', 'geocode'];

const ENDPOINT_LABELS: Record<string, string> = {
  autocomplete: 'Autocomplete',
  'text-search': 'Text Search',
  'place-details': 'Place Details',
  'nearby-search': 'Nearby Search',
  geocode: 'Geocoding',
};

// Cost thresholds for alerts
const DAILY_COST_WARNING = 50; // USD
const DAILY_COST_CRITICAL = 100; // USD
const HOURLY_COST_WARNING = 5; // USD

export function GoogleMapsUsageDashboard() {
  const [stats, setStats] = useState<Record<string, EndpointStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    // Refresh every 5 minutes
    const interval = setInterval(loadStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const endpointStats: Record<string, EndpointStats> = {};

      for (const endpoint of ENDPOINTS) {
        const [hourly, daily] = await Promise.all([
          getHourlyUsage(endpoint),
          getDailyUsage(endpoint, 7),
        ]);

        const totalRequests = daily.reduce((sum, d) => sum + Number(d.request_count), 0);
        const totalCost = daily.reduce((sum, d) => sum + Number(d.estimated_cost_usd), 0);

        endpointStats[endpoint] = {
          endpoint,
          hourly,
          daily,
          totalRequests,
          totalCost,
        };
      }

      setStats(endpointStats);
      setError(null);
    } catch (err) {
      console.error('Failed to load usage stats:', err);
      setError('Failed to load usage statistics');
    } finally {
      setLoading(false);
    }
  }

  const totalDailyCost = Object.values(stats).reduce((sum, s) => sum + s.totalCost, 0);
  const totalDailyRequests = Object.values(stats).reduce((sum, s) => sum + s.totalRequests, 0);
  const last24hCost = Object.values(stats).reduce((sum, s) => {
    const last24h = s.hourly.reduce((hSum, h) => hSum + Number(h.estimated_cost_usd), 0);
    return sum + last24h;
  }, 0);

  const showWarning = totalDailyCost >= DAILY_COST_WARNING || last24hCost >= HOURLY_COST_WARNING;
  const showCritical = totalDailyCost >= DAILY_COST_CRITICAL;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google Maps API Usage</CardTitle>
          <CardDescription>Loading usage statistics...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Google Maps API Usage Dashboard
          </CardTitle>
          <CardDescription>Monitor API usage and costs to prevent unexpected bills</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Requests (7d)</p>
                    <p className="text-2xl font-bold">{totalDailyRequests.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost (7d)</p>
                    <p className="text-2xl font-bold">${totalDailyCost.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Last 24h Cost</p>
                    <p className="text-2xl font-bold">${last24hCost.toFixed(2)}</p>
                  </div>
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {showCritical && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>High API Usage Detected</AlertTitle>
              <AlertDescription>
                Daily cost has exceeded ${DAILY_COST_CRITICAL}. Review usage patterns and consider
                enabling caching or rate limiting.
              </AlertDescription>
            </Alert>
          )}

          {showWarning && !showCritical && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>API Usage Warning</AlertTitle>
              <AlertDescription>
                Daily cost is approaching ${DAILY_COST_WARNING}. Monitor usage closely.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Endpoint Breakdown */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Endpoint Breakdown</h3>
            {ENDPOINTS.map(endpoint => {
              const endpointStat = stats[endpoint];
              if (!endpointStat) return null;

              return (
                <Card key={endpoint}>
                  <CardHeader>
                    <CardTitle className="text-base">{ENDPOINT_LABELS[endpoint]}</CardTitle>
                    <CardDescription>
                      {endpointStat.totalRequests.toLocaleString()} requests • $
                      {endpointStat.totalCost.toFixed(2)} cost (7d)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Last 24h:</span>
                        <span className="font-medium">
                          {endpointStat.hourly
                            .reduce((sum, h) => sum + Number(h.request_count), 0)
                            .toLocaleString()}{' '}
                          requests • $
                          {endpointStat.hourly
                            .reduce((sum, h) => sum + Number(h.estimated_cost_usd), 0)
                            .toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Peak hour:{' '}
                        {endpointStat.hourly.length > 0
                          ? new Date(endpointStat.hourly[0].date_hour!).toLocaleString()
                          : 'N/A'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Usage Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usage Optimization Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  Place details are cached for 30 days in Supabase (reduces API calls by ~60-80%)
                </li>
                <li>
                  Autocomplete results are cached client-side (1 hour) and server-side (30 days)
                </li>
                <li>OpenStreetMap fallback activates automatically if Google Maps API fails</li>
                <li>Monitor this dashboard daily to catch usage spikes early</li>
                <li>Consider implementing rate limiting for high-traffic endpoints</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

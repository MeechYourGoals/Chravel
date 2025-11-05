import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDemoMode } from '@/hooks/useDemoMode';
import { demoModeService } from '@/services/demoModeService';

interface SearchResult {
  id: string;
  type: 'regular' | 'pro' | 'event';
  title: string;
  location: string;
  dateRange: string;
  status: 'active' | 'archived' | 'upcoming';
  participants: number;
  matchScore: number;
  deepLink: string;
}

export const useUniversalSearch = (query: string, filters: { status: string; type: string }) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();
  
  // Phase A: Request deduplication to prevent race conditions
  const activeRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const searchTrips = async () => {
      if (!query.trim() || query.length < 2) {
        setResults([]);
        return;
      }

      // Phase A: Cancel any in-flight request
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }
      
      // Create new abort controller for this request
      const abortController = new AbortController();
      activeRequestRef.current = abortController;

      setIsLoading(true);
      
      try {
        // If Demo Mode is ON, search mock trips
        if (isDemoMode) {
          const mockTrips = await demoModeService.getMockTrips();
          const queryLower = query.toLowerCase();
          
          const filtered = mockTrips
            .filter(trip => {
              const matchesSearch = 
                trip.name.toLowerCase().includes(queryLower) ||
                trip.destination?.toLowerCase().includes(queryLower);
              
              const matchesType = filters.type === 'all' || 
                (filters.type === 'regular' && trip.trip_type === 'consumer') ||
                (filters.type === trip.trip_type);
              
              const matchesStatus = filters.status === 'all' ||
                (filters.status === 'upcoming' && !trip.is_archived) ||
                (filters.status === 'archived' && trip.is_archived);
              
              return matchesSearch && matchesType && matchesStatus;
            })
            .map(trip => ({
              id: trip.id,
              type: trip.trip_type === 'consumer' ? 'regular' as const : trip.trip_type as 'pro' | 'event',
              title: trip.name,
              location: trip.destination || 'Unknown',
              dateRange: trip.start_date && trip.end_date 
                ? `${trip.start_date} - ${trip.end_date}` 
                : '',
              status: trip.is_archived ? 'archived' as const : 'upcoming' as const,
              participants: 5,
              matchScore: 0.9,
              deepLink: `/trip/${trip.id}`
            }));
          
          setResults(filtered);
          setIsLoading(false);
          return;
        }

        // Otherwise, search real trips via edge function
        const { data, error } = await supabase.functions.invoke('search', {
          body: {
            query: query.trim(),
            scope: 'global',
            limit: 50,
            tripType: filters.type !== 'all' ? filters.type : undefined
          }
        });

        // Phase A: Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        if (error) throw error;

        if (data?.results) {
          const formattedResults: SearchResult[] = data.results.map((result: any) => {
            const tripType = result.deepLink?.includes('/tour/pro/') ? 'pro' 
              : result.deepLink?.includes('/event/') ? 'event' 
              : 'regular';
            
            const endDateStr = result.snippet?.match(/\(.*?-\s*(.*?)\)/)?.[1];
            const endDate = endDateStr ? new Date(endDateStr) : null;
            const status = endDate && endDate < new Date() ? 'archived' : 'upcoming';

            return {
              id: result.objectId || result.tripId,
              type: tripType,
              title: result.tripName || result.content,
              location: result.snippet?.split(' - ')[1]?.split(' (')[0] || 'Unknown',
              dateRange: result.snippet?.match(/\((.*?)\)/)?.[1] || '',
              status,
              participants: 0,
              matchScore: result.score || 0.5,
              deepLink: result.deepLink || `/trip/${result.tripId}`
            };
          });

          // Apply status filter
          const filtered = formattedResults.filter(result => {
            if (filters.status !== 'all' && result.status !== filters.status) return false;
            return true;
          });

          setResults(filtered);
        } else {
          setResults([]);
        }
      } catch (error) {
        // Phase A: Don't show error for aborted requests
        if (abortController.signal.aborted) {
          return;
        }
        
        console.error('Search error:', error);
        toast({
          title: "Search Error",
          description: "Unable to search trips. Please try again.",
          variant: "destructive"
        });
        setResults([]);
      } finally {
        // Phase A: Only clear loading if this request wasn't aborted
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    // Phase C: Debounce increased from implicit to explicit 300ms
    const debounceTimer = setTimeout(searchTrips, 300);
    
    return () => {
      clearTimeout(debounceTimer);
      // Phase A: Cleanup - abort pending request on unmount
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }
    };
  }, [query, filters, toast, isDemoMode]);

  return { results, isLoading };
};

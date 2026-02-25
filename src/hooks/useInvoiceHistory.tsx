/**
 * Invoice History Hook
 *
 * Fetches and displays Stripe invoice history for the authenticated user.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  dueDate: number | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
  description: string | null;
}

interface InvoiceResponse {
  invoices: Invoice[];
  hasMore: boolean;
  nextCursor: string | null;
}

export function useInvoiceHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchInvoices = useCallback(
    async (cursor?: string) => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const params = new URLSearchParams({
          limit: '100',
          ...(cursor && { starting_after: cursor }),
        });

        const { data, error } = await supabase.functions.invoke<InvoiceResponse>('fetch-invoices', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (error) {
          console.error('Failed to fetch invoices:', error);
          toast({
            title: 'Error',
            description: 'Failed to load invoice history. Please try again.',
            variant: 'destructive',
          });
          return;
        }

        if (data) {
          if (cursor) {
            setInvoices(prev => [...prev, ...data.invoices]);
          } else {
            setInvoices(data.invoices);
          }
          setHasMore(data.hasMore);
          setNextCursor(data.nextCursor);
        }
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
        toast({
          title: 'Error',
          description: 'Failed to load invoice history. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user, toast],
  );

  const loadMore = useCallback(() => {
    if (hasMore && nextCursor && !isLoading) {
      fetchInvoices(nextCursor);
    }
  }, [hasMore, nextCursor, isLoading, fetchInvoices]);

  const refresh = useCallback(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const downloadInvoice = useCallback(
    (invoice: Invoice) => {
      if (invoice.pdfUrl) {
        window.open(invoice.pdfUrl, '_blank');
      } else if (invoice.hostedUrl) {
        window.open(invoice.hostedUrl, '_blank');
      } else {
        toast({
          title: 'Error',
          description: 'Invoice PDF not available',
          variant: 'destructive',
        });
      }
    },
    [toast],
  );

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    isLoading,
    hasMore,
    loadMore,
    refresh,
    downloadInvoice,
  };
}

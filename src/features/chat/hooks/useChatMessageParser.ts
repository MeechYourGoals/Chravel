import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useChatMessageParser = () => {
  const parseMessage = useCallback(async (messageId: string, content: string, tripId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('message-parser', {
        body: {
          messageId,
          content,
          tripId
        }
      });

      if (error) {
        console.error('Error parsing message:', error);
        return false;
      }

      return data?.success || false;
    } catch (error) {
      console.error('Error invoking message parser:', error);
      return false;
    }
  }, []);

  return { parseMessage };
};
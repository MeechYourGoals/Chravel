import { useState, useCallback, useMemo } from 'react';

export type ReactionType = 'coming' | 'wait' | 'cant';

export interface ReactionCounts {
  coming: number;
  wait: number;
  cant: number;
}

interface UseBroadcastReactionsProps {
  broadcastId: string;
  initialResponses: ReactionCounts;
  userResponse?: ReactionType;
  onRespond?: (broadcastId: string, response: ReactionType) => void;
}

export const useBroadcastReactions = ({
  broadcastId,
  initialResponses,
  userResponse: initialUserResponse,
  onRespond
}: UseBroadcastReactionsProps) => {
  const [userResponse, setUserResponse] = useState<ReactionType | undefined>(initialUserResponse);
  const [responses, setResponses] = useState<ReactionCounts>(initialResponses);

  const handleResponse = useCallback((response: ReactionType) => {
    // Optimistic update
    const oldResponse = userResponse;
    setUserResponse(response);

    setResponses(prev => {
      const updated = { ...prev };
      
      // Remove old response count
      if (oldResponse) {
        updated[oldResponse] = Math.max(0, updated[oldResponse] - 1);
      }
      
      // Add new response count
      updated[response] = updated[response] + 1;
      
      return updated;
    });

    // Call external handler
    onRespond?.(broadcastId, response);
  }, [broadcastId, userResponse, onRespond]);

  const totalResponses = useMemo(() => 
    responses.coming + responses.wait + responses.cant,
    [responses]
  );

  const responsePercentages = useMemo(() => ({
    coming: totalResponses > 0 ? (responses.coming / totalResponses) * 100 : 0,
    wait: totalResponses > 0 ? (responses.wait / totalResponses) * 100 : 0,
    cant: totalResponses > 0 ? (responses.cant / totalResponses) * 100 : 0
  }), [responses, totalResponses]);

  return {
    userResponse,
    responses,
    totalResponses,
    responsePercentages,
    handleResponse
  };
};

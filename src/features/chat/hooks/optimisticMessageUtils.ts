export interface OptimisticMessageCandidate {
  id: string;
  client_message_id?: string;
}

export function getOptimisticMessageId(clientMessageId: string): string {
  return `optimistic-${clientMessageId}`;
}

/**
 * Remove only the optimistic placeholder for a failed mutation.
 * This preserves unrelated messages that may have arrived concurrently.
 */
export function removeOptimisticMessageByClientId<T extends OptimisticMessageCandidate>(
  messages: T[],
  clientMessageId?: string,
): T[] {
  if (!clientMessageId) return messages;

  const optimisticId = getOptimisticMessageId(clientMessageId);
  return messages.filter(
    message =>
      message.id !== optimisticId &&
      message.client_message_id !== clientMessageId,
  );
}

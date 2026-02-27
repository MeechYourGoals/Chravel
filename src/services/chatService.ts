
/**
 * Pin a chat message
 */
export async function pinMessage(messageId: string, userId: string): Promise<boolean> {
  try {
    // Fetch current message payload
    const { data: message, error: fetchError } = await supabase
      .from('trip_chat_messages')
      .select('payload')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      console.error('[chatService] Failed to fetch message for pinning:', fetchError);
      return false;
    }

    const currentPayload = (message.payload as Record<string, any>) || {};
    const newPayload = {
      ...currentPayload,
      pinned: true,
      pinned_at: new Date().toISOString(),
      pinned_by: userId,
    };

    const { error: updateError } = await supabase
      .from('trip_chat_messages')
      .update({ payload: newPayload })
      .eq('id', messageId);

    if (updateError) {
      console.error('[chatService] Failed to pin message:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[chatService] Unexpected error pinning message:', error);
    return false;
  }
}

/**
 * Unpin a chat message
 */
export async function unpinMessage(messageId: string): Promise<boolean> {
  try {
    // Fetch current message payload
    const { data: message, error: fetchError } = await supabase
      .from('trip_chat_messages')
      .select('payload')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      console.error('[chatService] Failed to fetch message for unpinning:', fetchError);
      return false;
    }

    const currentPayload = (message.payload as Record<string, any>) || {};
    const newPayload = { ...currentPayload };
    delete newPayload.pinned;
    delete newPayload.pinned_at;
    delete newPayload.pinned_by;

    const { error: updateError } = await supabase
      .from('trip_chat_messages')
      .update({ payload: newPayload })
      .eq('id', messageId);

    if (updateError) {
      console.error('[chatService] Failed to unpin message:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[chatService] Unexpected error unpinning message:', error);
    return false;
  }
}

/**
 * Fetch pinned messages for a trip
 */
export async function getPinnedMessages(tripId: string): Promise<Row[]> {
  try {
    const { data, error } = await supabase
      .from('trip_chat_messages')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_deleted', false)
      // Use contains operator for JSONB column to find messages where payload->'pinned' is true
      // Note: Supabase JS filter syntax for JSONB contains is .contains('column', { key: value })
      .contains('payload', { pinned: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[chatService] Failed to fetch pinned messages:', error);
    return [];
  }
}

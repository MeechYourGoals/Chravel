-- Add UPDATE policy for trip_chat_messages (author can edit their own messages)
CREATE POLICY "Users can update their own messages"
ON public.trip_chat_messages
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Note: We use UPDATE for soft delete since deleteChatMessage uses .update()
-- The existing policy above covers this since soft delete is an UPDATE operation
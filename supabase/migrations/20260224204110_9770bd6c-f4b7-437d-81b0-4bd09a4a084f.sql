-- Allow users to delete their own AI queries (privacy)
CREATE POLICY "Users can delete their own AI queries"
  ON ai_queries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Allow users to update their own AI queries (e.g. null out response_text)
CREATE POLICY "Users can update their own AI queries"
  ON ai_queries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
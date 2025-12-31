-- Hardening: Restrict inserting event_qa_upvotes to event members only.
-- Previously, insert was only gated by auth.uid() = user_id.

DROP POLICY IF EXISTS "insert_upvotes" ON public.event_qa_upvotes;

CREATE POLICY "insert_upvotes" ON public.event_qa_upvotes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.event_qa_questions q
      JOIN public.trip_members tm ON tm.trip_id = q.event_id
      WHERE q.id = event_qa_upvotes.question_id
        AND tm.user_id = auth.uid()
    )
  );


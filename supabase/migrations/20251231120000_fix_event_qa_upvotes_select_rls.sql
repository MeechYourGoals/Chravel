-- Fix: Restrict event_qa_upvotes visibility to event members only
-- Context: Previously "view_upvotes" used USING (true), exposing who upvoted what to anyone.

DROP POLICY IF EXISTS "view_upvotes" ON public.event_qa_upvotes;

CREATE POLICY "view_upvotes" ON public.event_qa_upvotes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.event_qa_questions q
      JOIN public.trip_members tm ON tm.trip_id = q.event_id
      WHERE q.id = event_qa_upvotes.question_id
        AND tm.user_id = auth.uid()
    )
  );


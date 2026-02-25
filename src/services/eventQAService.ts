import { supabase } from '@/integrations/supabase/client';

export interface QAQuestion {
  id: string;
  event_id: string;
  session_id: string;
  user_id?: string;
  user_name: string;
  question: string;
  upvotes: number;
  answered: boolean;
  answer?: string;
  answered_by?: string;
  answered_by_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface QAUpvote {
  question_id: string;
  user_id: string;
  created_at: string;
}

class EventQAService {
  /**
   * Submit a new question to the Q&A
   */
  async submitQuestion(
    eventId: string,
    sessionId: string,
    question: string,
    userId?: string,
    userName?: string,
  ): Promise<QAQuestion> {
    const { data, error } = await supabase
      .from('event_qa_questions')
      .insert({
        event_id: eventId,
        session_id: sessionId,
        user_id: userId,
        user_name: userName || 'Anonymous',
        question: question.trim(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all questions for a session
   */
  async getQuestions(eventId: string, sessionId: string): Promise<QAQuestion[]> {
    const { data, error } = await supabase
      .from('event_qa_questions')
      .select('*')
      .eq('event_id', eventId)
      .eq('session_id', sessionId)
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Upvote a question
   */
  async upvoteQuestion(questionId: string, userId: string): Promise<void> {
    // First, add the upvote record
    const { error: upvoteError } = await supabase.from('event_qa_upvotes').insert({
      question_id: questionId,
      user_id: userId,
    });

    if (upvoteError) throw upvoteError;

    // Then increment the upvote count
    const { data: currentQuestion } = await supabase
      .from('event_qa_questions')
      .select('upvotes')
      .eq('id', questionId)
      .single();

    if (currentQuestion) {
      await supabase
        .from('event_qa_questions')
        .update({ upvotes: currentQuestion.upvotes + 1 })
        .eq('id', questionId);
    }
  }

  /**
   * Check if user has upvoted a question
   */
  async hasUserUpvoted(questionId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('event_qa_upvotes')
      .select('question_id')
      .eq('question_id', questionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  }

  /**
   * Get all user's upvoted questions for a session
   */
  async getUserUpvotedQuestions(userId: string, questionIds: string[]): Promise<string[]> {
    const { data, error } = await supabase
      .from('event_qa_upvotes')
      .select('question_id')
      .eq('user_id', userId)
      .in('question_id', questionIds);

    if (error) throw error;
    return (data || []).map(item => item.question_id);
  }

  /**
   * Mark a question as answered (moderator only)
   */
  async answerQuestion(
    questionId: string,
    answer: string,
    answeredBy: string,
    answeredByUserId?: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('event_qa_questions')
      .update({
        answered: true,
        answer: answer.trim(),
        answered_by: answeredBy,
        answered_by_user_id: answeredByUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', questionId);

    if (error) throw error;
  }

  /**
   * Subscribe to real-time question updates for a session
   */
  subscribeToQuestions(
    eventId: string,
    sessionId: string,
    onQuestion: (question: QAQuestion) => void,
  ): () => void {
    const channel = supabase
      .channel(`qa-${eventId}-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_qa_questions',
          filter: `event_id=eq.${eventId}`,
        },
        payload => {
          const newQuestion = payload.new as QAQuestion;
          if (newQuestion.session_id === sessionId) {
            onQuestion(newQuestion);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_qa_questions',
          filter: `event_id=eq.${eventId}`,
        },
        payload => {
          const updatedQuestion = payload.new as QAQuestion;
          if (updatedQuestion.session_id === sessionId) {
            onQuestion(updatedQuestion);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Delete a question (moderator only)
   */
  async deleteQuestion(questionId: string): Promise<void> {
    const { error } = await supabase.from('event_qa_questions').delete().eq('id', questionId);

    if (error) throw error;
  }
}

export const eventQAService = new EventQAService();

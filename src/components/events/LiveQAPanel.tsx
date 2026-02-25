import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Send, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { eventQAService, QAQuestion } from '@/services/eventQAService';

interface LiveQAPanelProps {
  sessionId: string;
  eventId: string;
  userRole?: 'organizer' | 'speaker' | 'attendee';
}

export const LiveQAPanel = ({ sessionId, eventId, userRole = 'attendee' }: LiveQAPanelProps) => {
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upvotedQuestions, setUpvotedQuestions] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  // Fetch initial questions and set up real-time subscription
  useEffect(() => {
    const fetchInitialQuestions = async () => {
      try {
        const data = await eventQAService.getQuestions(eventId, sessionId);
        setQuestions(data);

        // If user is logged in, fetch their upvoted questions
        if (currentUserId && data.length > 0) {
          const upvoted = await eventQAService.getUserUpvotedQuestions(
            currentUserId,
            data.map(q => q.id),
          );
          setUpvotedQuestions(new Set(upvoted));
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    };

    fetchInitialQuestions();

    // Subscribe to real-time updates
    const unsubscribe = eventQAService.subscribeToQuestions(eventId, sessionId, updatedQuestion => {
      setQuestions(prev => {
        const existing = prev.find(q => q.id === updatedQuestion.id);
        if (existing) {
          // Update existing question
          return prev.map(q => (q.id === updatedQuestion.id ? updatedQuestion : q));
        } else {
          // Add new question
          return [updatedQuestion, ...prev];
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [eventId, sessionId, currentUserId]);

  const submitQuestion = async () => {
    if (!newQuestion.trim()) return;

    setIsSubmitting(true);
    try {
      // Get user name
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let userName = user?.email?.split('@')[0] || 'Anonymous';

      if (!user) {
        const name = prompt('Please enter your name to ask a question:');
        if (!name) {
          setIsSubmitting(false);
          return;
        }
        userName = name;
      }

      await eventQAService.submitQuestion(eventId, sessionId, newQuestion, user?.id, userName);

      setNewQuestion('');
      toast({
        title: 'Question submitted',
        description: 'Your question has been added to the Q&A queue.',
      });
    } catch (error) {
      console.error('Error submitting question:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit question. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const upvoteQuestion = async (questionId: string) => {
    if (!currentUserId || upvotedQuestions.has(questionId)) return;

    try {
      await eventQAService.upvoteQuestion(questionId, currentUserId);
      setUpvotedQuestions(prev => new Set([...prev, questionId]));

      // Optimistically update UI
      setQuestions(prev =>
        prev.map(q => (q.id === questionId ? { ...q, upvotes: q.upvotes + 1 } : q)),
      );
    } catch (error) {
      console.error('Error upvoting question:', error);
      toast({
        title: 'Error',
        description: 'Failed to upvote question.',
        variant: 'destructive',
      });
    }
  };

  const markAnswered = async (questionId: string, answer: string) => {
    if (userRole !== 'organizer' && userRole !== 'speaker') return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const answeredBy = user?.email?.split('@')[0] || 'Speaker';

      await eventQAService.answerQuestion(questionId, answer, answeredBy, user?.id);

      toast({
        title: 'Question answered',
        description: 'Your answer has been posted.',
      });
    } catch (error) {
      console.error('Error marking question as answered:', error);
      toast({
        title: 'Error',
        description: 'Failed to post answer.',
        variant: 'destructive',
      });
    }
  };

  const canModerate = userRole === 'organizer' || userRole === 'speaker';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={24} className="text-glass-orange" />
        <h3 className="text-xl font-bold text-white">Live Q&A</h3>
        <span className="bg-glass-orange/20 text-glass-orange px-2 py-1 rounded-full text-sm">
          {questions.length} questions
        </span>
      </div>

      {/* Submit New Question */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <Textarea
          value={newQuestion}
          onChange={e => setNewQuestion(e.target.value)}
          placeholder="Ask a question about this session..."
          className="bg-gray-800/50 border-gray-600 text-white mb-3"
          rows={3}
        />
        <Button
          onClick={submitQuestion}
          disabled={!newQuestion.trim() || isSubmitting}
          className="bg-glass-orange hover:bg-glass-orange/80 text-white"
        >
          <Send size={16} className="mr-2" />
          {isSubmitting ? 'Submitting...' : 'Submit Question'}
        </Button>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map(question => (
          <div key={question.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-400 text-sm">{question.user_name}</span>
                  <span className="text-gray-500 text-xs">
                    {new Date(question.created_at).toLocaleTimeString()}
                  </span>
                  {question.answered && (
                    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                      <Check size={12} />
                      Answered
                    </span>
                  )}
                </div>
                <p className="text-white mb-3">{question.question}</p>
                {question.answer && (
                  <div className="bg-glass-orange/10 border border-glass-orange/20 rounded-lg p-3 mt-3">
                    <div className="text-glass-orange text-sm font-medium mb-1">
                      Answer by {question.answered_by}:
                    </div>
                    <p className="text-gray-300">{question.answer}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => upvoteQuestion(question.id)}
                disabled={upvotedQuestions.has(question.id)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                  upvotedQuestions.has(question.id)
                    ? 'bg-glass-orange/20 text-glass-orange'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                }`}
              >
                <ThumbsUp size={14} />
                {question.upvotes}
              </button>

              {canModerate && !question.answered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const answer = prompt('Provide an answer to this question:');
                    if (answer) markAnswered(question.id, answer);
                  }}
                  className="text-glass-orange hover:text-glass-orange/80"
                >
                  Mark as Answered
                </Button>
              )}
            </div>
          </div>
        ))}

        {questions.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare size={48} className="text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No questions yet. Be the first to ask!</p>
          </div>
        )}
      </div>
    </div>
  );
};

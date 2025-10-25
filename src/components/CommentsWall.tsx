
import React, { useState, useMemo } from 'react';
import { MessageCircle, Heart, Reply, ExternalLink } from 'lucide-react';
import { PollComponent } from './PollComponent';

interface Comment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
  likes: number;
  replies?: Comment[];
  linkUrl?: string;
  linkTitle?: string;
}

interface CommentsWallProps {
  tripId: string;
}

export const CommentsWall = ({ tripId }: CommentsWallProps) => {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: '1',
      author: 'Emma',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face',
      content: 'This place looks amazing! Has anyone been here before?',
      timestamp: '2 hours ago',
      likes: 3,
      linkUrl: 'https://lamijean.fr',
      linkTitle: "L'Ami Jean - Traditional Bistro"
    },
    {
      id: '2',
      author: 'Jake',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
      content: 'The reviews are incredible! Definitely adding this to our must-visit list.',
      timestamp: '1 hour ago',
      likes: 5,
      linkUrl: 'https://lamijean.fr',
      linkTitle: "L'Ami Jean - Traditional Bistro"
    }
  ]);

  const [newComment, setNewComment] = useState('');

  // Group comments by link
  const groupedComments = useMemo(() => {
    const groups = new Map<string, Comment[]>();
    
    comments.forEach(comment => {
      const key = comment.linkUrl || 'standalone';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(comment);
    });

    return Array.from(groups.entries()).map(([url, commentList]) => ({
      linkUrl: url !== 'standalone' ? url : undefined,
      linkTitle: commentList[0]?.linkTitle,
      comments: commentList
    }));
  }, [comments]);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      author: 'You',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
      content: newComment,
      timestamp: 'just now',
      likes: 0
    };
    
    setComments([comment, ...comments]);
    setNewComment('');
  };

  const handleLike = (commentId: string) => {
    setComments(comments.map(comment => 
      comment.id === commentId 
        ? { ...comment, likes: comment.likes + 1 }
        : comment
    ));
  };

  return (
    <div className="p-6 space-y-6 bg-glass-slate-bg min-h-screen">
      {/* Polls Section */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MessageCircle size={20} className="text-glass-enterprise-blue" />
          Group Polls
        </h3>
        <PollComponent tripId={tripId} />
      </div>

      {/* Comments Section */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MessageCircle size={20} className="text-purple-400" />
          Link Comments
        </h3>

        {/* Add Comment */}
        <div className="bg-glass-slate-bg rounded-xl p-3 mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts about the links posted..."
            className="w-full bg-glass-slate-card border border-glass-slate-border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-glass-enterprise-blue focus:ring-1 focus:ring-glass-enterprise-blue/20 resize-none text-sm"
            rows={2}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="bg-gradient-to-r from-glass-enterprise-blue to-glass-enterprise-blue-light hover:from-glass-enterprise-blue-light hover:to-glass-enterprise-blue disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
            >
              Post
            </button>
          </div>
        </div>

        {/* Grouped Comments List */}
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 text-sm mb-1">No comments yet</div>
            <div className="text-gray-400 text-xs">Start the conversation about the places you're visiting!</div>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedComments.map((group, groupIdx) => (
              <div key={groupIdx} className="bg-glass-slate-card border border-glass-slate-border rounded-xl p-4">
                {/* Link Preview - Show once per group */}
                {group.linkUrl && (
                  <div className="bg-glass-enterprise-blue/10 border border-glass-enterprise-blue/30 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 text-glass-enterprise-blue font-medium mb-1 text-sm">
                      <ExternalLink size={14} />
                      {group.linkTitle}
                    </div>
                    <a 
                      href={group.linkUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-glass-enterprise-blue-light text-xs hover:underline break-all"
                    >
                      {group.linkUrl}
                    </a>
                  </div>
                )}

                {/* Instagram-style comment thread */}
                <div className="space-y-2">
                  {group.comments.map((comment, idx) => (
                    <div key={comment.id} className="flex gap-2">
                      <img 
                        src={comment.avatar} 
                        alt={comment.author}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="bg-white/5 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-white text-sm">{comment.author}</span>
                            <span className="text-gray-400 text-xs">{comment.timestamp}</span>
                          </div>
                          <p className="text-gray-300 text-sm leading-snug">{comment.content}</p>
                        </div>
                        
                        {/* Actions inline below comment */}
                        <div className="flex items-center gap-3 mt-1 ml-3">
                          <button
                            onClick={() => handleLike(comment.id)}
                            className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors text-xs"
                          >
                            <Heart size={12} />
                            <span>{comment.likes}</span>
                          </button>
                          <button className="text-gray-400 hover:text-glass-enterprise-blue transition-colors text-xs">
                            Reply
                          </button>
                        </div>

                        {/* Replies (nested, same style) */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-2 ml-4 space-y-2 border-l-2 border-glass-slate-border pl-3">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex gap-2">
                                <img 
                                  src={reply.avatar} 
                                  alt={reply.author}
                                  className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="bg-white/5 rounded-lg px-2 py-1.5">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="font-medium text-white text-xs">{reply.author}</span>
                                      <span className="text-gray-400 text-xs">{reply.timestamp}</span>
                                    </div>
                                    <p className="text-gray-300 text-xs leading-snug">{reply.content}</p>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 ml-2">
                                    <button
                                      onClick={() => handleLike(reply.id)}
                                      className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors text-xs"
                                    >
                                      <Heart size={10} />
                                      <span>{reply.likes}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Chat Preview Screen - Animated message thread with Broadcasts
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Megaphone } from 'lucide-react';

const messages = [
  { id: 1, author: 'Sarah', content: 'Found an amazing campsite! 🏕️', delay: 0.5 },
  { id: 2, author: 'Mike', content: '@Sarah that looks perfect!', delay: 1.5, hasMention: true },
  { id: 3, author: 'You', content: "I'll book it now", delay: 2.5, isOwn: true },
  { id: 4, author: 'You', content: 'Dinner at 7pm tonight! 🍽️', delay: 3.5, isOwn: true, isBroadcast: true },
];

const TypingIndicator = () => (
  <motion.div
    className="flex items-center gap-1 px-3 py-2"
    initial={{ opacity: 0 }}
    animate={{ opacity: [0, 1, 1, 0] }}
    transition={{ duration: 2, delay: 3.5 }}
  >
    <span className="text-xs text-muted-foreground">Sarah is typing</span>
    <div className="flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
          animate={{ y: [0, -3, 0] }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  </motion.div>
);

export const ChatPreviewScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      {/* Mock chat container */}
      <motion.div
        className="w-full max-w-sm bg-card border border-border rounded-xl p-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="text-sm font-medium text-muted-foreground mb-4 text-left">
          Weekend in Big Sur
        </h3>

        <div className="space-y-3">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: msg.delay }}
            >
              <div className="relative">
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                    msg.isOwn
                      ? msg.isBroadcast
                        ? 'bg-orange-500/90 text-white ring-2 ring-orange-400/50'
                        : 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {!msg.isOwn && (
                    <span className="text-xs font-medium text-primary block mb-0.5">
                      {msg.author}
                    </span>
                  )}
                  <p className="text-sm">
                    {msg.hasMention ? (
                      <>
                        <span className="text-primary font-medium">@Sarah</span>
                        {' that looks perfect!'}
                      </>
                    ) : (
                      msg.content
                    )}
                  </p>
                </div>
                
                {/* Broadcast badge */}
                {msg.isBroadcast && (
                  <motion.div
                    className="absolute -top-2 -left-2 flex items-center gap-1 px-2 py-0.5 bg-orange-600 text-white text-xs rounded-full shadow-lg"
                    initial={{ opacity: 0, scale: 0.5, y: 5 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1, 
                      y: 0,
                    }}
                    transition={{ delay: 4.2, type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <Megaphone className="w-3 h-3" />
                    <span>Broadcast</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Sent to everyone label for broadcast */}
          <motion.div
            className="flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 4.8 }}
          >
            <span className="text-xs text-orange-400/80 mr-1">
              📢 Sent to everyone
            </span>
          </motion.div>

          <TypingIndicator />

          {/* Reaction appearing on first message */}
          <motion.div
            className="flex justify-start -mt-2"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 5.5 }}
          >
            <div className="bg-background border border-border rounded-full px-2 py-0.5 text-xs ml-2">
              ❤️ 2
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.p
        className="text-muted-foreground text-base max-w-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        Real-time chat with broadcasts for important updates
      </motion.p>
    </div>
  );
};

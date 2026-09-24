import React from 'react';
import { motion } from 'motion/react';

interface TypingIndicatorProps {
  name?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ name = "AI Assistant" }) => {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-zinc-900/90 text-zinc-400 border border-zinc-800/80 w-fit my-2 shadow-lg">
      <span className="text-xs text-zinc-400 font-medium mr-1">{name} đang nhập</span>
      <div className="flex items-center gap-1">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-blue-500"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
        />
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-blue-500"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
        />
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-blue-500"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        />
      </div>
    </div>
  );
};

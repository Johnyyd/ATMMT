import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpRight, Sparkles } from 'lucide-react';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelectSuggestion: (text: string) => void;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({ suggestions, onSelectSuggestion }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="px-4 py-2.5 bg-zinc-950/80 light:bg-white/90 border-t border-zinc-800/60 light:border-slate-200 flex items-center gap-2 overflow-x-auto text-xs backdrop-blur-md">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 light:text-slate-400 whitespace-nowrap mr-1">
        <Sparkles className="w-3 h-3 text-indigo-400 light:text-indigo-600" />
        <span>Gợi ý:</span>
      </div>
      <AnimatePresence mode="wait">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          {suggestions.map((sug, idx) => (
            <motion.button
              key={`${sug}-${idx}`}
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              onClick={() => onSelectSuggestion(sug)}
              className="group px-3 py-1.5 rounded-xl bg-zinc-900/90 light:bg-slate-100 hover:bg-indigo-600/20 light:hover:bg-indigo-50 border border-zinc-800 light:border-slate-200 hover:border-indigo-500/40 light:hover:border-indigo-300 text-zinc-300 light:text-slate-700 hover:text-white light:hover:text-indigo-900 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <span>{sug}</span>
              <ArrowUpRight className="w-3 h-3 text-zinc-500 light:text-slate-400 group-hover:text-indigo-300 light:group-hover:text-indigo-600 transition-colors" />
            </motion.button>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
};

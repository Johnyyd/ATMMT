import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface AIChatInputProps {
  onSendMessage: (message: string, provider?: 'auto' | 'openrouter' | 'groq') => Promise<void>;
  isSubmitting: boolean;
}

export const AIChatInput: React.FC<AIChatInputProps> = ({
  onSendMessage,
  isSubmitting,
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    const query = message.trim();
    setMessage('');
    await onSendMessage(query, 'auto');
  };

  return (
    <div className="p-3.5 glass-chrome border-t border-zinc-800/80 light:border-slate-200 flex flex-col gap-2 z-10">
      {/* Double-Bezel Hardware Enclosure Input Box */}
      <form onSubmit={handleSubmit} className="p-1 rounded-2xl bg-zinc-950/80 light:bg-white border border-zinc-800/80 light:border-slate-300 shadow-xl light:shadow-sm flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hỏi Johnyyd AI (kỹ năng, kinh nghiệm, dự án, self-hosted...)"
            disabled={isSubmitting}
            className="w-full pl-3.5 pr-4 py-2.5 rounded-xl bg-transparent text-zinc-100 light:text-slate-900 placeholder-zinc-500 light:placeholder-slate-400 text-xs sm:text-sm focus:outline-none transition-all disabled:opacity-50 font-sans"
          />
        </div>

        {/* Button-in-Button Trailing CTA */}
        <button
          type="submit"
          disabled={!message.trim() || isSubmitting}
          className="group px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-950/40 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span>Đang xử lý</span>
              <Sparkles className="w-3.5 h-3.5 animate-spin text-white" />
            </>
          ) : (
            <>
              <span>Gửi</span>
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <Send className="w-3 h-3 text-white" />
              </div>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

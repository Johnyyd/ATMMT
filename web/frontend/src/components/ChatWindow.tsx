import React, { useRef, useEffect, useState } from 'react';
import { Menu, Sparkles, MessageSquarePlus, Sun, Moon } from 'lucide-react';
import { ChatTopic, ChatMessage } from '../types/chat';
import { User } from '../types/auth';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { GuestbookInput } from './GuestbookInput';
import { AIChatInput } from './AIChatInput';
import { SuggestionChips } from './SuggestionChips';
import { ImagePopup } from './ImagePopup';

interface ChatWindowProps {
  topic: ChatTopic | null;
  messages: ChatMessage[];
  isTyping: boolean;
  onOpenMobileSidebar: () => void;
  onSendGuestbookMessage: (name: string, content: string, color: string, image: string | null) => Promise<void>;
  onLikeGuestbookMessage?: (id: number) => void;
  onEditGuestbookMessage?: (msg: ChatMessage) => void;
  onDeleteGuestbookMessage?: (id: number) => void;
  isSendingGuestbook: boolean;
  onSelectQuickAction?: (actionText: string) => void;
  onSendAIMessage?: (message: string, provider?: 'auto' | 'openrouter' | 'groq') => Promise<void>;
  isSendingAI?: boolean;
  selectedAIProvider?: 'auto' | 'openrouter' | 'groq';
  onSelectAIProvider?: (provider: 'auto' | 'openrouter' | 'groq') => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  suggestions?: string[];
  typingUsers?: string[];
  currentUser?: User | null;
  onViewProfile?: (userId: number | null) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  topic,
  messages,
  isTyping,
  onOpenMobileSidebar,
  onSendGuestbookMessage,
  onLikeGuestbookMessage,
  onEditGuestbookMessage,
  onDeleteGuestbookMessage,
  isSendingGuestbook,
  onSelectQuickAction,
  onSendAIMessage,
  isSendingAI = false,
  theme = 'dark',
  onToggleTheme,
  suggestions = [],
  currentUser,
  typingUsers = [],
  onViewProfile,
}) => {
  const feedEndRef = useRef<HTMLDivElement>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const scrollToBottom = () => {
    if (feedEndRef.current && typeof feedEndRef.current.scrollIntoView === 'function') {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openImagePopup = (url: string) => {
    setSelectedImageUrl(url);
  };

  const closeImagePopup = () => {
    setSelectedImageUrl(null);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  if (!topic) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 light:text-slate-400">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900/80 light:bg-slate-100 border border-zinc-800 light:border-slate-200 flex items-center justify-center mb-4 text-indigo-400 light:text-indigo-600 shadow-xl">
          <MessageSquarePlus className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-base font-semibold text-zinc-200 light:text-slate-800 mb-1">Bắt đầu cuộc trò chuyện</h3>
        <p className="text-xs text-zinc-400 light:text-slate-500 max-w-xs">Vui lòng chọn một chủ đề từ menu bên trái để bắt đầu khám phá.</p>
      </div>
    );
  }

  const isGuestbook = topic.type === 'guestbook';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07090E] light:bg-[#F8FAFC] relative overflow-hidden transition-colors duration-200">
      {/* Header Bar */}
      <header className="p-3.5 glass-chrome flex items-center justify-between z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-zinc-900/90 light:bg-slate-100 border border-zinc-800 light:border-slate-200 text-zinc-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            {topic.avatar.startsWith('http') ? (
              <img src={topic.avatar} alt={topic.title} className="w-9 h-9 rounded-xl border border-zinc-800 light:border-slate-200 object-cover shadow-sm" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 light:bg-indigo-50 border border-indigo-500/20 light:border-indigo-200 flex items-center justify-center text-base shadow-sm">
                {topic.avatar}
              </div>
            )}

            <div>
              <h3 className="font-bold text-zinc-100 light:text-slate-900 text-sm tracking-tight">{topic.title}</h3>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 light:text-slate-500 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-emerald-400 light:text-emerald-700 font-mono text-[10px]">
                  {isGuestbook ? 'Kênh lưu bút cộng đồng' : 'Trợ lý Johnyyd AI online'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}
              className="lg:hidden p-2 rounded-xl bg-zinc-900 light:bg-slate-100 border border-zinc-800 light:border-slate-200 text-zinc-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          )}

          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 light:bg-slate-100 border border-zinc-800 light:border-slate-200 text-[11px] text-zinc-300 light:text-slate-700 font-mono shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 light:bg-indigo-600" />
            {isGuestbook ? 'Realtime Guestbook' : 'Portfolio AI'}
          </span>
        </div>
      </header>

      {/* Message Feed Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Editorial Welcome Card */}
        <div className="my-3 p-4 rounded-2xl bg-gradient-to-b from-indigo-500/5 to-zinc-950/40 light:from-indigo-50/60 light:to-white border border-indigo-500/20 light:border-indigo-200 text-center max-w-lg mx-auto shadow-2xl light:shadow-sm backdrop-blur-md">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 light:bg-indigo-100 border border-indigo-500/20 light:border-indigo-200 text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-300 light:text-indigo-700 mb-2">
            <Sparkles className="w-3 h-3 text-indigo-400 light:text-indigo-600" />
            <span>Chủ Đề Trò Chuyện</span>
          </div>
          <h2 className="text-sm font-bold text-zinc-100 light:text-slate-900 mb-1">{topic.title}</h2>
          <p className="text-xs text-zinc-400 light:text-slate-600 leading-relaxed max-w-md mx-auto">{topic.subtitle}</p>
        </div>

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onLike={onLikeGuestbookMessage}
            onEdit={onEditGuestbookMessage}
            onDelete={onDeleteGuestbookMessage}
            onImageClick={setSelectedImageUrl}
            currentUserRole={currentUser?.role}
            onViewProfile={onViewProfile}
          />
        ))}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator name="AI Assistant" />}
        {!isTyping && typingUsers.length > 0 && (
          <TypingIndicator name={typingUsers.join(', ')} />
        )}

        <div ref={feedEndRef} />
      </main>

      {/* Quick Action Suggestion Chips */}
      {!isGuestbook && onSelectQuickAction && (
        <SuggestionChips suggestions={suggestions} onSelectSuggestion={onSelectQuickAction} />
      )}

      {/* Guestbook Input */}
      {isGuestbook && (
        <GuestbookInput
          onSendMessage={onSendGuestbookMessage}
          isSubmitting={isSendingGuestbook}
          currentUser={currentUser}
        />
      )}

      {/* AI Chat Input */}
      {!isGuestbook && onSendAIMessage && (
        <AIChatInput
          onSendMessage={onSendAIMessage}
          isSubmitting={isSendingAI}
        />
      )}

      {/* Image Popup */}
      {selectedImageUrl && (
        <ImagePopup
          imageUrl={selectedImageUrl}
          onClose={closeImagePopup}
        />
      )}
    </div>
  );
};

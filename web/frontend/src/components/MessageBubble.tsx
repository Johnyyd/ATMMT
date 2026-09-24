import React from 'react';
import { motion } from 'motion/react';
import { Heart, Edit3, Trash2, Clock, ShieldCheck, UserCheck } from 'lucide-react';
import { ChatMessage } from '../types/chat';
import { RepoCard } from './RepoCard';

interface MessageBubbleProps {
  message: ChatMessage;
  onLike?: (id: number) => void;
  onEdit?: (message: ChatMessage) => void;
  onDelete?: (id: number) => void;
  onImageClick?: (url: string) => void;
  currentUserRole?: 'admin' | 'user' | 'anonymous';
  onViewProfile?: (userId: number | null) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onLike,
  onEdit,
  onDelete,
  onImageClick,
  currentUserRole,
  onViewProfile,
}) => {
  const isSelf = message.is_author;
  const isAdmin = currentUserRole === 'admin';

  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      const parts = line.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
      return (
        <React.Fragment key={lIdx}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} className="font-semibold text-white light:text-slate-900">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
              const linkText = part.slice(1, part.indexOf(']('));
              const linkUrl = part.slice(part.indexOf('](') + 2, -1);
              return (
                <a
                  key={pIdx}
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-300 light:text-indigo-600 hover:text-indigo-200 light:hover:text-indigo-800 underline underline-offset-4 font-medium transition-colors"
                >
                  {linkText}
                </a>
              );
            }
            return part;
          })}
          {lIdx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  const renderRoleBadge = () => {
    // Expiration and Role Badges only apply to Public Guestbook messages, never to default static portfolio topics/AI messages
    if (message.type !== 'guestbook') {
      return null;
    }

    if (message.author_role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs">
          <ShieldCheck className="w-2.5 h-2.5" />
          Admin
        </span>
      );
    }
    if (message.author_role === 'user') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
          <UserCheck className="w-2.5 h-2.5" />
          Thành viên
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium rounded-md bg-zinc-700/40 text-zinc-400 border border-zinc-700/50" title="Tin nhắn vãng lai - Tự động xóa sau 30 ngày">
        <Clock className="w-2.5 h-2.5" />
        Xóa sau 30d
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
      className={`group relative flex items-end gap-2.5 my-2.5 max-w-[88%] sm:max-w-[78%] ${
        isSelf ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
      }`}
    >
      {/* Avatar */}
      <div 
        className={`flex-shrink-0 mb-0.5 ${message.user_id ? 'cursor-pointer hover:ring-2 hover:ring-indigo-500/50 rounded-xl transition-all' : ''}`}
        onClick={() => {
          if (message.user_id && onViewProfile) {
            onViewProfile(message.user_id);
          }
        }}
      >
        {message.avatar && message.avatar.startsWith('http') ? (
          <img
            src={message.avatar}
            alt={message.sender}
            className="w-8 h-8 rounded-xl border border-zinc-800 light:border-slate-200 object-cover shadow-sm"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-md border border-white/10"
            style={{ backgroundColor: message.avatar_color || (isSelf ? '#4F46E5' : '#10B981') }}
          >
            {message.sender.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Bubble Container */}
      <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-1.5 mb-1 px-1 flex-wrap">
          <span className="text-[11px] font-semibold text-zinc-300 light:text-slate-700 tracking-tight">{message.sender}</span>
          {renderRoleBadge()}
          <span className="text-[10px] text-zinc-500 light:text-slate-400 font-mono tabular-nums">{message.timestamp}</span>
        </div>

        <div
          className={`relative p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed backdrop-blur-md transition-all ${
            isSelf
              ? 'user-bubble-gradient text-white rounded-br-xs border border-indigo-400/20'
              : 'bg-zinc-900/90 light:bg-white text-zinc-200 light:text-slate-800 border border-zinc-800/90 light:border-slate-200/90 rounded-bl-xs shadow-lg light:shadow-sm shadow-black/20'
          }`}
        >
          <div>{renderContent(message.content)}</div>

          {/* Image display */}
          {message.image && (
            <div className="mt-2">
              <div
                onClick={() => onImageClick?.(message.image as string)}
                className="cursor-pointer hover:opacity-90 transition-opacity"
              >
                <img
                  src={message.image}
                  alt="Uploaded image"
                  className="max-w-full rounded-lg border border-zinc-800/20 light:border-slate-200/20"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
              </div>
            </div>
          )}

          {/* Edited tag indicator */}
          {message.is_edited && (
            <div className="mt-1 text-[10px] italic text-amber-300/80 font-medium">
              (Đã chỉnh sửa bởi Admin)
            </div>
          )}

          {/* Embedded Repo Card */}
          {message.type === 'repo_card' && message.repo && <RepoCard repo={message.repo} />}

          {/* Guestbook Likes & Actions */}
          {typeof message.likes_count === 'number' && typeof message.id === 'number' && (
            <div className="mt-2.5 pt-2 border-t border-white/10 light:border-slate-200 flex items-center justify-between gap-4">
              {onLike && (
                <button
                  onClick={() => onLike(message.id as number)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 light:bg-slate-100 hover:bg-white/20 light:hover:bg-slate-200 transition-all text-xs font-medium text-white light:text-slate-700 cursor-pointer active:scale-95 shadow-sm"
                >
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                  <span className="font-mono tabular-nums">{message.likes_count}</span>
                </button>
              )}

              {/* Admin Moderation Buttons */}
              {isAdmin && (
                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(message)}
                      className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
                      title="Sửa tin nhắn (Admin)"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(message.id as number)}
                      className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all cursor-pointer"
                      title="Xóa tin nhắn (Admin)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

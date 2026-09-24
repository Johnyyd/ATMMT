import React, { useState, useEffect } from 'react';
import { Send, Smile, Palette, User as UserIcon, ShieldCheck, UserCheck, Clock, Image } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../types/auth';
import { guestbookWS } from '../services/websocket';
import { getOrCreateUserToken } from '../services/api';

interface GuestbookInputProps {
  onSendMessage: (authorName: string, content: string, avatarColor: string, image: string | null) => Promise<void>;
  isSubmitting: boolean;
  currentUser?: User | null;
}

const AVATAR_COLORS = [
  '#4F46E5', // Indigo
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#3B82F6', // Blue
];

const EMOJI_LIST = ['���👍', '��❤��️', '���🚀', '���🔥', '���💻', '���🎉', '���👏', '��✨'];

export const GuestbookInput: React.FC<GuestbookInputProps> = ({
  onSendMessage,
  isSubmitting,
  currentUser,
}) => {
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const lastTypingTimeRef = React.useRef<number>(0);

  useEffect(() => {
    if (currentUser) {
      setAuthorName(currentUser.username);
    } else {
      const savedName = localStorage.getItem('guestbook_author_name');
      if (savedName) {
        setAuthorName(savedName);
      }
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const nameToUse = currentUser ? currentUser.username : authorName.trim();
    const trimmedContent = content.trim();

    if (!nameToUse || nameToUse.length < 2) {
      setErrorMsg('Vui lòng nhập tên của bạn (tối thiểu 2 ký tự)');
      return;
    }

    if (!trimmedContent) {
      setErrorMsg('Vui lòng nhập nội dung tin nhắn lưu bút');
      return;
    }

    try {
      if (!currentUser) {
        localStorage.setItem('guestbook_author_name', nameToUse);
      }
      await onSendMessage(nameToUse, trimmedContent, selectedColor, image);
      setContent('');
      setShowEmojiPicker(false);
      setShowColorPicker(false);
      setImage(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gửi tin nhắn thất bại. Vui lòng thử lại.');
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn file ảnh');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleTyping = (value: string) => {
    setContent(value);
    if (value.trim().length > 0) {
      const now = Date.now();
      if (now - lastTypingTimeRef.current > 2000) { // throttle 2 seconds
        lastTypingTimeRef.current = now;
        const nameToUse = currentUser ? currentUser.username : (authorName.trim() || 'Khách');
        try {
          guestbookWS.send(JSON.stringify({
            event: 'typing',
            data: {
              author_name: nameToUse,
              user_token: getOrCreateUserToken(),
              user_id: currentUser?.id || null
            }
          }));
        } catch (e) {
          // ignore ws errors
        }
      }
    }
  };

  return (
    <div className="p-3.5 glass-chrome border-t border-zinc-800/80 light:border-slate-200 relative">
      {/* Validation Error Banner */}
      {errorMsg && (
        <div className="mb-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 light:text-rose-700 text-xs font-medium flex items-center justify-between shadow-lg">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 light:text-rose-600 font-bold ml-2 hover:text-rose-200">×</button>
        </div>
      )}

      {/* Popover color picker */}
      {showColorPicker && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          className="absolute bottom-full mb-3 left-4 p-3 rounded-2xl bg-zinc-950/95 light:bg-white border border-zinc-800/90 light:border-slate-200 shadow-2xl backdrop-blur-xl flex items-center gap-2.5 z-50"
        >
          <span className="text-[11px] text-zinc-400 light:text-slate-500 font-medium tracking-tight mr-1">Màu avatar:</span>
          {AVATAR_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                setSelectedColor(color);
                setShowColorPicker(false);
              }}
              className={`w-6 h-6 rounded-full transition-transform cursor-pointer shadow-sm ${
                selectedColor === color ? 'scale-125 ring-2 ring-white light:ring-slate-400 ring-offset-2 ring-offset-zinc-950 light:ring-offset-white' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </motion.div>
      )}

      {/* Popover emoji selector */}
      {showEmojiPicker && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          className="absolute bottom-full mb-3 left-16 p-2 rounded-2xl bg-zinc-950/95 light:bg-white border border-zinc-800/90 light:border-slate-200 shadow-2xl backdrop-blur-xl flex items-center gap-1 z-50"
        >
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleAddEmoji(emoji)}
              className="w-8 h-8 rounded-xl hover:bg-zinc-800 light:hover:bg-slate-100 flex items-center justify-center text-base transition-colors cursor-pointer active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {/* Retention status & Author row */}
        <div className="flex items-center justify-between gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
              {currentUser.role === 'admin' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span className="font-semibold text-white">{currentUser.username}</span>
              <span className="text-[10px] text-blue-400/80">({currentUser.role === 'admin' ? 'Admin' : 'Thành viên'} - Lưu trữ vĩnh viễn)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/80 light:bg-white border border-zinc-800/80 light:border-slate-300 text-xs text-zinc-300 light:text-slate-800 w-full sm:w-72 shadow-inner light:shadow-none">
              <UserIcon className="w-4 h-4 text-indigo-400 light:text-indigo-600 flex-shrink-0" />
              <input
                type="text"
                placeholder="Tên lưu bút vãng lai (VD: Anh Tuấn)"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-zinc-100 light:text-slate-900 placeholder-zinc-500 light:placeholder-slate-400 w-full font-medium tracking-tight"
                maxLength={50}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            {!currentUser && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                <Clock className="w-3 h-3 text-amber-500" />
                Vãng lai tự xóa sau 30 ngày
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950/80 light:bg-white border border-zinc-800/80 light:border-slate-300 text-xs text-zinc-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 transition-colors cursor-pointer shadow-sm active:scale-95"
              title="Chọn màu Avatar"
            >
              <div className="w-3.5 h-3.5 rounded-full ring-1 ring-white/20 light:ring-black/10" style={{ backgroundColor: selectedColor }} />
              <Palette className="w-3.5 h-3.5 text-zinc-400 light:text-slate-500" />
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-1 rounded-2xl bg-zinc-950/80 light:bg-white border border-zinc-800/80 light:border-slate-300 shadow-xl light:shadow-sm flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            {/* Image upload */}
            <div className="relative mr-2">
              {image ? (
                <img
                  src={image}
                  alt="Preview"
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="p-1 rounded hover:bg-zinc-800 light:hover:bg-slate-100"
                >
                  <Image className="w-4 h-4 text-zinc-400 light:text-slate-500" />
                </button>
              )}
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            <input
              type="text"
              placeholder="Nhập nội dung sổ lưu bút..."
              value={content}
              onChange={(e) => handleTyping(e.target.value)}
              className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-transparent text-xs sm:text-sm text-zinc-100 light:text-slate-900 placeholder-zinc-500 light:placeholder-slate-400 outline-none transition-all font-sans"
              maxLength={1000}
            />

            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-2 text-zinc-400 light:text-slate-400 hover:text-amber-400 light:hover:text-amber-500 transition-colors p-1"
              title="Thêm biểu tượng cảm xúc"
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !content.trim() || (!currentUser && !authorName.trim())}
            className="group px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-950/40 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <span>Gửi</span>
            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
              <Send className="w-3 h-3 text-white" />
            </div>
          </button>
        </div>
      </form>
    </div>
  );
};
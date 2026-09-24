import React, { useState, useEffect } from 'react';
import { X, Edit3, ShieldAlert, Check } from 'lucide-react';
import { ChatMessage } from '../types/chat';
import { authService } from '../services/authService';

interface EditMessageModalProps {
  message: ChatMessage | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedMessage: { id: number; content: string; is_edited: boolean }) => void;
}

export const EditMessageModal: React.FC<EditMessageModalProps> = ({
  message,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      setContent(message.content);
    }
  }, [message]);

  if (!isOpen || !message) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/guestbook/${message.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Không thể cập nhật tin nhắn.');
      }

      const updated = await res.json();
      onSuccess({
        id: updated.id,
        content: updated.content,
        is_edited: updated.is_edited,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi chỉnh sửa tin nhắn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900/95 p-6 border border-amber-500/20 shadow-2xl backdrop-blur-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Edit3 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Chỉnh sửa tin nhắn
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Admin Moderation
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Tác giả: <span className="text-slate-200 font-medium">{message.sender}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Nội dung tin nhắn
            </label>
            <textarea
              required
              rows={4}
              maxLength={1000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Chỉnh sửa nội dung cho phù hợp quy chuẩn cộng đồng..."
              className="w-full p-3 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>* Chỉnh sửa này sẽ gắn nhãn "(Đã chỉnh sửa bởi Admin)"</span>
              <span>{content.length}/1000</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-white/5 transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { ChevronRight, X, Sun, Moon, LogIn, LogOut, ShieldCheck, UserCheck, User as UserIcon } from 'lucide-react';
import { ChatTopic } from '../types/chat';
import { User } from '../types/auth';
import { authService } from '../services/authService';
import ProfileEditForm from './ProfileEditForm';

interface SidebarProps {
  topics: ChatTopic[];
  activeTopicId: string;
  onSelectTopic: (topicId: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onlineCount?: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  user?: User | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  onViewProfile?: (userId: number | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  topics,
  activeTopicId,
  onSelectTopic,
  isOpenMobile,
  onCloseMobile,
  onlineCount = 1,
  theme = 'dark',
  onToggleTheme,
  user,
  onOpenAuthModal,
  onLogout,
  onViewProfile,
}) => {
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);

  return (
    <>
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-80 glass-sidebar flex flex-col transition-transform duration-300 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header: Author Bio Doppelrand Card */}
        <div className="p-3.5 border-b border-zinc-800/60 light:border-slate-200">
          <div className="p-2.5 rounded-2xl bg-zinc-950/70 light:bg-white border border-zinc-800/80 light:border-slate-200 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => {
              if (user) onViewProfile?.(null);
            }}>
              <div className="relative flex-shrink-0">
                {user && user.avatar_url ? (
                  <div className="p-0.5 rounded-2xl bg-gradient-to-b from-indigo-500/40 to-zinc-800 border border-indigo-500/30">
                    <img
                      src={user.avatar_url}
                      alt={`${user.display_name || user.username}'s avatar`}
                      className="w-10 h-10 rounded-[calc(1rem-0.125rem)] object-cover"
                    />
                  </div>
                ) : (
                  <div className="p-0.5 rounded-2xl bg-gradient-to-b from-indigo-500/40 to-zinc-800 border border-indigo-500/30">
                    <div className="w-10 h-10 rounded-[calc(1rem-0.125rem)] flex items-center justify-center bg-indigo-500 text-white font-bold text-xs">
                      {(user?.display_name?.charAt(0) || user?.username?.charAt(0) || 'U').toUpperCase()}
                    </div>
                  </div>
                )}
                {(user && user.avatar_url) || (!user) ? (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-zinc-950 light:ring-white" />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h2 className="font-bold text-zinc-100 light:text-slate-900 text-sm tracking-tight truncate">
                    {user ? (user.display_name || user.username || 'User') : 'Nguyễn Minh Trí'}
                  </h2>
                </div>
                <p className="text-[11px] text-zinc-400 light:text-slate-500 font-medium tracking-tight truncate">
                  {user ? (user.bio || '') : '@Johnyyd · Fullstack & DevOps'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  title={theme === 'dark' ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}
                  className="p-1.5 rounded-xl bg-zinc-900 light:bg-slate-100 border border-zinc-800 light:border-slate-200 text-zinc-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-600" />
                  )}
                </button>
              )}

              {/* Profile Edit Button */}
              {user && (
                <button
                  onClick={() => {
                    setIsProfileEditOpen(true);
                  }}
                  className="p-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-indigo-400 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-xl text-zinc-400 light:text-slate-500 hover:text-white light:hover:text-slate-900 hover:bg-zinc-800 light:hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* User Auth Profile Widget (Apple Style) */}
        <div className="px-3 pt-3 pb-1">
          {user ? (
            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-white truncate">{user.username}</span>
                    {user.role === 'admin' ? (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        👑 Admin
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 text-[9px] font-semibold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        👤 Member
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400">Lưu tin nhắn vĩnh viễn</p>
                </div>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Đăng xuất"
                  className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-zinc-400" />
                <div className="text-[11px] text-zinc-400">
                  <span className="text-zinc-200 font-medium">Khách (Vãng lai)</span>
                  <p className="text-[9px] text-zinc-500">Tin nhắn tự xóa sau 30 ngày</p>
                </div>
              </div>
              {onOpenAuthModal && (
                <button
                  onClick={onOpenAuthModal}
                  className="py-1 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md flex items-center gap-1 transition-all cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation Section Title */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 light:text-slate-400">
            Danh Sách Trò Chuyện
          </span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-900 light:bg-slate-100 border border-zinc-800/80 light:border-slate-200 text-zinc-400 light:text-slate-600 text-[10px] font-mono tabular-nums">
            {topics.length}
          </span>
        </div>

        {/* Topics List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1.5 py-1">
          {topics.map((topic) => {
            const isActive = topic.id === activeTopicId;
            return (
              <button
                key={topic.id}
                onClick={() => {
                  onSelectTopic(topic.id);
                  onCloseMobile();
                }}
                className={`w-full p-3 rounded-2xl flex items-start gap-3 transition-all duration-200 text-left group cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/15 via-blue-500/10 to-transparent light:from-indigo-50 light:to-blue-50/40 border border-indigo-500/30 light:border-indigo-200 text-white light:text-indigo-950 shadow-lg shadow-indigo-950/30 light:shadow-indigo-500/5'
                    : 'hover:bg-zinc-900/60 light:hover:bg-slate-100/80 border border-transparent text-zinc-400 light:text-slate-600 hover:text-zinc-200 light:hover:text-slate-900'
              }`}
              >
                {/* Avatar / Icon */}
                <div className="relative flex-shrink-0 mt-0.5">
                  {topic.avatar.startsWith('http') ? (
                    <img
                      src={topic.avatar}
                      alt={topic.title}
                      className="w-9 h-9 rounded-xl border border-zinc-800 light:border-slate-200 object-cover shadow-sm"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-zinc-900/90 light:bg-slate-100 border border-zinc-800 light:border-slate-200 flex items-center justify-center text-base shadow-sm">
                      {topic.avatar}
                    </div>
                  )}
                  {topic.is_online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950 light:ring-white" />
                  )}
                </div>

                {/* Topic Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className={`text-xs font-semibold truncate tracking-tight ${isActive ? 'text-indigo-300 light:text-indigo-700' : 'text-zinc-200 light:text-slate-800'}`}>
                      {topic.title}
                    </h3>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      isActive ? 'bg-indigo-500/20 light:bg-indigo-100 text-indigo-300 light:text-indigo-700' : 'text-zinc-600 light:text-slate-400 opacity-0 group-hover:opacity-100 group-hover:bg-zinc-800/60 light:group-hover:bg-slate-200/60'
                    }`}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400 light:text-slate-500 truncate leading-tight">
                    {topic.subtitle}
                  </p>
                  <div className="mt-1 text-[10px] text-zinc-500 light:text-slate-400 truncate font-mono">
                    {topic.last_message}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {/* Footer Info Badge */}
        <div className="p-3 border-t border-zinc-800/60 light:border-slate-200">
          <div className="px-3 py-2 rounded-xl bg-zinc-950/60 light:bg-slate-50 border border-zinc-800/80 light:border-slate-200 text-[11px] text-zinc-400 light:text-slate-600 flex items-center justify-between font-mono shadow-inner">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-medium text-zinc-300 light:text-slate-700">Đang truy cập:</span>
            </div>
            <span className="font-semibold text-emerald-400 light:text-emerald-700 tabular-nums px-1.5 py-0.5 rounded bg-emerald-950/40 light:bg-emerald-50 border border-emerald-500/20 light:border-emerald-500/20">
              {onlineCount} online
            </span>
          </div>
        </div>
      </aside>

      {/* Profile Edit Modal */}
      {isProfileEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative w-full max-w-md mx-4">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Chỉnh sửa hồ sơ</h2>
                <button
                  onClick={() => setIsProfileEditOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <ProfileEditForm onClose={() => setIsProfileEditOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};


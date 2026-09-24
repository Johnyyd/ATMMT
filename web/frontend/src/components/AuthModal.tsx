import React, { useState } from 'react';
import { X, User, Lock, Shield, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/authService';
import { User as UserType } from '../types/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await authService.login({ username, password });
        setSuccessMsg(`Đăng nhập thành công! Chào mừng ${res.user.username}`);
        setTimeout(() => {
          onSuccess(res.user);
          onClose();
        }, 600);
      } else {
        const res = await authService.register({ username, password });
        setSuccessMsg('Đăng ký tài khoản Thành viên thành công!');
        setTimeout(() => {
          onSuccess(res.user);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-slate-900/90 p-8 border border-white/10 shadow-2xl backdrop-blur-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 mb-3 border border-blue-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isLogin ? 'Xác thực tài khoản' : 'Tạo tài khoản Thành viên'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isLogin
              ? 'Đăng nhập với tài khoản Thành viên hoặc Admin'
              : 'Đăng ký tài khoản để tin nhắn của bạn được lưu vĩnh viễn trong DB'}
          </p>
        </div>

        {/* Segmented Control Tabs (Apple Style) */}
        <div className="flex p-1 mb-6 rounded-2xl bg-slate-800/80 border border-white/5">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
              isLogin ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
              !isLogin ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Đăng ký
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 text-sm rounded-xl bg-red-500/15 border border-red-500/30 text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 p-3 text-sm rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Tên đăng nhập
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                minLength={3}
                maxLength={50}
                placeholder="Nhập tên tài khoản..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/60 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/60 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isLogin ? 'Đăng nhập ngay' : 'Tạo tài khoản Thành viên'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Retention Note */}
        <div className="mt-6 pt-4 border-t border-white/5 text-center text-xs text-slate-500">
          💡 <span className="text-slate-400 font-medium">Quy định lưu giữ:</span> Thành viên được lưu vĩnh viễn. Khách vãng lai tự động bị xóa sau 30 ngày.
        </div>

      </div>
    </div>
  );
};

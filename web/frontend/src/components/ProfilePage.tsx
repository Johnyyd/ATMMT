import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../services/authService';
import { fetchUserProfile } from '../services/api';
import { User } from '../types/auth';
import { MapPin, Globe, Calendar, FileText, Users, User as UserIcon, ArrowLeft, Camera, Edit2, Key, X, Check } from 'lucide-react';

interface ProfilePageProps {
  userId?: number | null;
  onBack: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ userId, onBack }) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit states
  const currentUser = authService.getUser();
  const isOwner = profile && currentUser && profile.id === currentUser.id;

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', bio: '', website_url: '', location: '' });
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        let user;
        if (userId) {
          user = await fetchUserProfile(userId);
        } else {
          user = await authService.getMe();
        }
        setProfile(user);
        setEditForm({
          display_name: user.display_name || '',
          bio: user.bio || '',
          website_url: user.website_url || '',
          location: user.location || ''
        });
      } catch (err) {
        setError('Không thể tải thông tin hồ sơ');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      const url = await authService.uploadCover(e.target.files[0]);
      setProfile(prev => prev ? { ...prev, cover_url: url } : null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải ảnh bìa lên');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      const url = await authService.uploadAvatar(e.target.files[0]);
      setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải ảnh đại diện lên');
    }
  };

  const handleSaveInfo = async () => {
    try {
      const updatedUser = await authService.updateProfile(editForm);
      setProfile(updatedUser);
      setIsEditingInfo(false);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật hồ sơ');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    try {
      await authService.updatePassword(passwordForm.current_password, passwordForm.new_password);
      setPasswordSuccess('Đổi mật khẩu thành công!');
      setTimeout(() => setIsChangingPassword(false), 2000);
    } catch (err: any) {
      setPasswordError(err.message || 'Lỗi đổi mật khẩu');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#07090E] light:bg-[#F8FAFC]">
        <div className="flex justify-center items-center h-full text-zinc-500 light:text-slate-500">
          Đang tải hồ sơ...
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col h-full bg-[#07090E] light:bg-[#F8FAFC]">
        <div className="p-4">
          <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại</span>
          </button>
        </div>
        <div className="flex justify-center items-center h-full text-red-400 light:text-red-500">
          {error || 'Không có dữ liệu hồ sơ'}
        </div>
      </div>
    );
  }

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  const displayName = profile.display_name || profile.username || 'User';

  return (
    <div className="flex flex-col h-full bg-[#07090E] light:bg-[#F8FAFC] overflow-y-auto relative">
      {/* Header / Nav */}
      <div className="sticky top-0 z-20 bg-[#07090E]/80 light:bg-[#F8FAFC]/80 backdrop-blur-md border-b border-zinc-800 light:border-slate-200 px-4 py-3 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 light:bg-slate-200/50 hover:bg-zinc-800 light:hover:bg-slate-200 text-zinc-300 light:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium text-sm">Quay lại Chat</span>
        </button>

        {isOwner && (
          <button 
            onClick={() => setIsChangingPassword(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 light:bg-slate-200/50 hover:bg-zinc-800 light:hover:bg-slate-200 text-zinc-300 light:text-slate-700 transition-colors text-sm"
          >
            <Key className="w-4 h-4" />
            <span>Đổi mật khẩu</span>
          </button>
        )}
      </div>

      <div className="max-w-4xl w-full mx-auto pb-12 relative z-0">
        {/* Cover Photo Area */}
        <div className="h-48 md:h-64 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-b-xl shadow-lg relative group">
          {profile.cover_url && (
            <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover rounded-b-xl" />
          )}
          {isOwner && (
            <>
              <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverUpload} />
              <button 
                onClick={() => coverInputRef.current?.click()}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="Thay đổi ảnh bìa"
              >
                <Camera className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Avatar Area (overlapping cover) */}
          <div className="absolute -bottom-16 left-6 md:left-10 z-10 group/avatar">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-[#07090E] light:border-[#F8FAFC] bg-zinc-800 light:bg-slate-200 flex items-center justify-center shadow-xl relative">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={`${displayName}'s avatar`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <UserIcon className="w-16 h-16 text-zinc-500 light:text-slate-400" />
              )}
              {isOwner && (
                <div 
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-opacity"
                >
                  <Camera className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            {isOwner && <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />}
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="mt-20 px-6 md:px-10">
          {!isEditingInfo ? (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-zinc-100 light:text-slate-900">{displayName}</h1>
                  <p className="text-lg text-zinc-400 light:text-slate-500">@{profile.username}</p>
                </div>
                {isOwner && (
                  <button 
                    onClick={() => setIsEditingInfo(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 light:bg-slate-200 hover:bg-zinc-700 light:hover:bg-slate-300 text-zinc-200 light:text-slate-800 rounded-lg transition-colors font-medium text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Chỉnh sửa thông tin
                  </button>
                )}
              </div>

              {profile.bio && (
                <p className="mt-6 text-zinc-300 light:text-slate-700 whitespace-pre-wrap max-w-2xl text-[15px] leading-relaxed">
                  {profile.bio}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-zinc-400 light:text-slate-600 mt-6">
                {profile.website_url && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 light:text-indigo-600 hover:underline truncate">
                      {profile.website_url.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                
                {profile.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{profile.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Tham gia: {memberSince}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-zinc-900/50 light:bg-white rounded-xl border border-zinc-800 light:border-slate-200 p-6 max-w-2xl shadow-sm">
              <h3 className="text-lg font-medium text-white light:text-slate-900 mb-4">Cập nhật thông tin</h3>
              <div className="space-y-4 text-sm text-zinc-300 light:text-slate-700">
                <div>
                  <label className="block mb-1">Tên hiển thị</label>
                  <input 
                    type="text" 
                    value={editForm.display_name} 
                    onChange={e => setEditForm(prev => ({...prev, display_name: e.target.value}))}
                    className="w-full bg-zinc-800 light:bg-slate-100 border border-zinc-700 light:border-slate-300 rounded px-3 py-2 text-white light:text-slate-900"
                  />
                </div>
                <div>
                  <label className="block mb-1">Tiểu sử (Bio)</label>
                  <textarea 
                    value={editForm.bio} 
                    onChange={e => setEditForm(prev => ({...prev, bio: e.target.value}))}
                    className="w-full bg-zinc-800 light:bg-slate-100 border border-zinc-700 light:border-slate-300 rounded px-3 py-2 h-24 text-white light:text-slate-900"
                  />
                </div>
                <div>
                  <label className="block mb-1">Website</label>
                  <input 
                    type="url" 
                    value={editForm.website_url} 
                    onChange={e => setEditForm(prev => ({...prev, website_url: e.target.value}))}
                    className="w-full bg-zinc-800 light:bg-slate-100 border border-zinc-700 light:border-slate-300 rounded px-3 py-2 text-white light:text-slate-900"
                  />
                </div>
                <div>
                  <label className="block mb-1">Địa điểm</label>
                  <input 
                    type="text" 
                    value={editForm.location} 
                    onChange={e => setEditForm(prev => ({...prev, location: e.target.value}))}
                    className="w-full bg-zinc-800 light:bg-slate-100 border border-zinc-700 light:border-slate-300 rounded px-3 py-2 text-white light:text-slate-900"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={handleSaveInfo} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                    <Check className="w-4 h-4"/> Lưu thay đổi
                  </button>
                  <button onClick={() => setIsEditingInfo(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg font-medium">
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-8 mt-8 pt-6 border-t border-zinc-800 light:border-slate-200">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-zinc-100 light:text-slate-900">0</span>
              <span className="text-sm font-medium text-zinc-500 light:text-slate-500 flex items-center gap-1.5"><FileText className="w-4 h-4"/> Bài viết</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-zinc-100 light:text-slate-900">0</span>
              <span className="text-sm font-medium text-zinc-500 light:text-slate-500 flex items-center gap-1.5"><Users className="w-4 h-4"/> Người theo dõi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {isChangingPassword && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1117] light:bg-white border border-zinc-800 light:border-slate-200 rounded-xl max-w-md w-full shadow-2xl overflow-hidden relative">
            <button onClick={() => setIsChangingPassword(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
              <X className="w-5 h-5"/>
            </button>
            <div className="p-6">
              <h2 className="text-xl font-bold text-white light:text-slate-900 mb-6 flex items-center gap-2">
                <Key className="w-5 h-5"/> Đổi mật khẩu
              </h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded">{passwordError}</div>}
                {passwordSuccess && <div className="text-green-400 text-sm bg-green-400/10 p-3 rounded">{passwordSuccess}</div>}
                <div>
                  <label className="block text-sm text-zinc-400 light:text-slate-600 mb-1">Mật khẩu hiện tại</label>
                  <input type="password" required value={passwordForm.current_password} onChange={e => setPasswordForm(p => ({...p, current_password: e.target.value}))} className="w-full bg-zinc-900 light:bg-slate-50 border border-zinc-800 light:border-slate-300 rounded-lg px-3 py-2.5 text-white light:text-slate-900" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 light:text-slate-600 mb-1">Mật khẩu mới</label>
                  <input type="password" required minLength={6} value={passwordForm.new_password} onChange={e => setPasswordForm(p => ({...p, new_password: e.target.value}))} className="w-full bg-zinc-900 light:bg-slate-50 border border-zinc-800 light:border-slate-300 rounded-lg px-3 py-2.5 text-white light:text-slate-900" />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsChangingPassword(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white font-medium">Hủy</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg">Cập nhật mật khẩu</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

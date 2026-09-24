import { AuthResponse, LoginPayload, RegisterPayload, User } from '../types/auth';
import { encryptPayload } from '../utils/crypto';

const USER_KEY = 'chat_portfolio_user';

export const authService = {

  getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  removeUser(): void {
    localStorage.removeItem(USER_KEY);
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch {
      // Ignore errors on logout
    }
    this.removeUser();
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const encrypted = await encryptPayload(payload);
    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(encrypted),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Đăng ký tài khoản không thành công');
    }

    const data: AuthResponse = await response.json();
    this.setUser(data.user);
    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const encrypted = await encryptPayload(payload);
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(encrypted),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Đăng nhập không thành công');
    }

    const data: AuthResponse = await response.json();
    this.setUser(data.user);
    return data;
  },

  async getMe(): Promise<User | null> {
    try {
      const response = await fetch('/api/v1/auth/me', {
        credentials: 'include'
      });

      if (!response.ok) {
        this.logout();
        return null;
      }

      const user: User = await response.json();
      this.setUser(user);
      return user;
    } catch {
      return null;
    }
  },

  async getProfile(): Promise<User | null> {
    return this.getMe();
  },

  async updateProfile(data: Partial<Pick<User, 'avatar_url' | 'cover_url' | 'display_name' | 'bio' | 'website_url' | 'location'>>): Promise<User> {
    const response = await fetch('/api/v1/users/me/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Cập nhật hồ sơ không thành công');
    }

    const updatedUser: User = await response.json();
    this.setUser(updatedUser);
    return updatedUser;
  },

  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/v1/users/me/avatar', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Upload avatar không thành công');
    }

    const data: { avatar_url: string } = await response.json();
    const currentUser = this.getUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, avatar_url: data.avatar_url };
      this.setUser(updatedUser);
    }
    return data.avatar_url;
  },

  async uploadCover(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/v1/users/me/cover', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Upload cover không thành công');
    }

    const data: { cover_url: string } = await response.json();
    const currentUser = this.getUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, cover_url: data.cover_url };
      this.setUser(updatedUser);
    }
    return data.cover_url;
  },

  async updatePassword(current_password: string, new_password: string): Promise<void> {
    const encrypted = await encryptPayload({ current_password, new_password });
    const response = await fetch('/api/v1/users/me/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(encrypted),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Cập nhật mật khẩu không thành công');
    }
  },
};

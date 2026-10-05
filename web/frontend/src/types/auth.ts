export type UserRole = 'admin' | 'user' | 'anonymous';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  created_at: string;
  avatar_url: string | null;
  cover_url: string | null;
  display_name: string | null;
  bio: string | null;
  website_url: string | null;
  location: string | null;
  updated_at: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface CaptchaResponse {
  captcha_token: string;
  captcha_svg: string;
}

export interface LoginPayload {
  username: string;
  password: string;
  captcha_token?: string;
  captcha_answer?: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  role?: string;
  captcha_token?: string;
  captcha_answer?: string;
}

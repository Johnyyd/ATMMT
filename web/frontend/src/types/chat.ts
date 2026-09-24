export interface RepoMetadata {
  name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
}

export interface ChatTopic {
  id: string;
  title: string;
  subtitle: string;
  avatar: string;
  type: 'portfolio' | 'guestbook' | 'ai';
  unread: number;
  is_online: boolean;
  last_message: string;
}

export interface ChatMessage {
  id: string | number;
  sender: string;
  is_author: boolean;
  avatar: string;
  content: string;
  timestamp: string;
  type: 'text' | 'repo_card' | 'guestbook' | 'ai';
  repo?: RepoMetadata;
  avatar_color?: string;
  likes_count?: number;
  provider_used?: string;
  model_used?: string;
  user_token?: string;
  suggested_questions?: string[];
  image?: string; // Base64 encoded image data

  // Auth, Moderation & Expiration fields
  user_id?: number | null;
  is_edited?: boolean;
  edited_at?: string | null;
  expires_at?: string | null;
  author_role?: 'admin' | 'user' | 'anonymous';
}

export interface GuestbookEntry {
  id: number;
  author_name: string;
  content: string;
  avatar_color: string;
  likes_count: number;
  created_at: string;
  user_token?: string;
  image?: string; // Base64 encoded image data

  // Auth, Moderation & Expiration fields
  user_id?: number | null;
  is_edited?: boolean;
  edited_at?: string | null;
  expires_at?: string | null;
  author_role?: 'admin' | 'user' | 'anonymous';
}

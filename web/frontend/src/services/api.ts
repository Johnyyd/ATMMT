import { ChatTopic, ChatMessage, GuestbookEntry, AIChatHistoryItem, AIChatResponse } from '../types/chat';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export function getOrCreateUserToken(): string {
  let token = localStorage.getItem('guestbook_user_token');
  if (!token) {
    token = 'usr_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('guestbook_user_token', token);
  }
  return token;
}

export async function fetchOnlineCount(): Promise<number> {
  try {
    const res = await fetch(`${API_BASE_URL}/guestbook/online-count`, { credentials: 'include' });
    if (!res.ok) return 1;
    const data = await res.json();
    return typeof data.count === 'number' ? data.count : 1;
  } catch (err) {
    return 1;
  }
}

export async function fetchTopics(): Promise<ChatTopic[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/topics`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch topics');
    return await res.json();
  } catch (error) {
    console.warn('Fallback to local topics:', error);
    return [
      {
        id: 'ai-assistant',
        title: '🤖 AI Assistant',
        subtitle: 'Trò chuyện trực tiếp với AI được huấn luyện về kỹ năng & dự án của Johnyyd',
        avatar: '🤖',
        type: 'ai',
        unread: 0,
        is_online: true,
        last_message: 'Sẵn sàng hỗ trợ bạn giải đáp thắc mắc!',
      },
      {
        id: 'about',
        title: '👤 Johnyyd - Giới thiệu tác giả',
        subtitle: 'Tìm hiểu về kỹ năng, kinh nghiệm & đam mê lập trình',
        avatar: 'https://github.com/Johnyyd.png',
        type: 'portfolio',
        unread: 0,
        is_online: true,
        last_message: 'Chào mừng bạn! Rất vui được gặp bạn tại đây.',
      },
      {
        id: 'repositories',
        title: '🚀 Repositories Nổi Bật',
        subtitle: 'Khám phá các dự án open-source & mã nguồn ấn tượng',
        avatar: '🚀',
        type: 'portfolio',
        unread: 0,
        is_online: true,
        last_message: 'Các repository self-hosted & công cụ nổi bật.',
      },
      {
        id: 'guestbook',
        title: '💬 Public Guestbook',
        subtitle: ' Gửi tin nhắn đến tác giả & mọi người',
        avatar: '💬',
        type: 'guestbook',
        unread: 0,
        is_online: true,
        last_message: 'Hãy để lại lời nhắn của bạn ở đây!',
      },
    ];
  }
}

export async function fetchTopicMessages(topicId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${API_BASE_URL}/topics/${topicId}/messages`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch messages for topic ${topicId}`);
  return await res.json();
}

export async function fetchGuestbookMessages(): Promise<GuestbookEntry[]> {
  const res = await fetch(`${API_BASE_URL}/guestbook`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch guestbook messages');
  return await res.json();
}

export async function postGuestbookMessage(payload: {
  author_name: string;
  content: string;
  avatar_color: string;
  user_token?: string;
}): Promise<GuestbookEntry> {
  const token = payload.user_token || getOrCreateUserToken();
  const res = await fetch(`${API_BASE_URL}/guestbook`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, user_token: token }),
  });
  if (!res.ok) throw new Error('Failed to post guestbook message');
  return await res.json();
}

export async function likeGuestbookMessage(messageId: number): Promise<GuestbookEntry> {
  const res = await fetch(`${API_BASE_URL}/guestbook/${messageId}/like`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to like guestbook message');
  return await res.json();
}

export async function sendAIChatMessage(
  message: string,
  history: AIChatHistoryItem[] = [],
  provider: 'auto' | 'openrouter' | 'groq' = 'auto',
  topic_id?: string
): Promise<{ reply: string; provider_used: string; model_used: string; suggested_questions?: string[] }> {
  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, provider, ...(topic_id ? { topic_id } : {}) }),
  });

  if (!res.ok) {
    throw new Error('AI Chat request failed');
  }

  const json: AIChatResponse = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.data?.error || 'AI Chat response error');
  }

  return json.data;
}

export async function fetchUserProfile(userId: number) {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, { credentials: 'include' });
  if (!response.ok) {
    throw new Error('User not found');
  }
  return response.json();
}

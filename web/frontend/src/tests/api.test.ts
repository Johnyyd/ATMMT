import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTopics, postGuestbookMessage } from '../services/api';

describe('Frontend API Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchTopics returns topic list on successful API call', async () => {
    const mockTopics = [
      { id: 'about', title: 'Giới thiệu', subtitle: 'Bio', avatar: '', type: 'portfolio', unread: 0, is_online: true, last_message: '' },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTopics,
    });

    const topics = await fetchTopics();
    expect(topics).toEqual(mockTopics);
    expect(fetch).toHaveBeenCalledWith('/api/topics', expect.objectContaining({ credentials: 'include' }));
  });

  it('postGuestbookMessage sends POST request with correct payload including user_token', async () => {
    const payload = {
      author_name: 'Khách Hàng A',
      content: 'Tin nhắn chạy thử',
      avatar_color: '#2563EB',
    };

    const mockResponse = { id: 10, ...payload, user_token: 'token-123', likes_count: 0, created_at: '2026-07-31T09:00:00Z' };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await postGuestbookMessage(payload);
    expect(result.id).toBe(10);
    expect(result.author_name).toBe('Khách Hàng A');
    expect(fetch).toHaveBeenCalledWith('/api/guestbook', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"author_name":"Khách Hàng A"'),
    }));
  });
});

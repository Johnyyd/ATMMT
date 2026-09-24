import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTopics, postGuestbookMessage, sendAIChatMessage } from '../services/api';

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
    expect(fetch).toHaveBeenCalledWith('/api/topics');
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

  it('sendAIChatMessage calls /api/chat endpoint correctly and parses suggested_questions', async () => {
    const mockData = {
      reply: 'Chào bạn!',
      provider_used: 'openrouter',
      model_used: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      suggested_questions: ['Hỏi về Docker?', 'Hỏi về React?'],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockData }),
    });

    const result = await sendAIChatMessage('Kỹ năng chính?', [], 'auto', 'about');
    expect(result.reply).toBe('Chào bạn!');
    expect(result.provider_used).toBe('openrouter');
    expect(result.suggested_questions).toEqual(['Hỏi về Docker?', 'Hỏi về React?']);
    expect(fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ message: 'Kỹ năng chính?', history: [], provider: 'auto', topic_id: 'about' }),
    }));
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { MessageBubble } from '../components/MessageBubble';
import { ChatMessage } from '../types/chat';

describe('MessageBubble Component', () => {
  it('renders author message correctly with markdown bold', () => {
    const message: ChatMessage = {
      id: 'm1',
      sender: 'Johnyyd',
      is_author: true,
      avatar: 'https://github.com/Johnyyd.png',
      content: '👋 Xin chào! Mình là **Nguyễn Minh Trí**',
      timestamp: '10:00 AM',
      type: 'text',
    };

    render(<MessageBubble message={message} />);
    expect(screen.getByText('Johnyyd')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Minh Trí')).toBeInTheDocument();
  });

  it('renders guest message with color avatar', () => {
    const message: ChatMessage = {
      id: 5,
      sender: 'Khách Ghé Thăm',
      is_author: false,
      avatar: '',
      avatar_color: '#10B981',
      content: 'Website nhắn tin quá đẹp!',
      timestamp: '10:05 AM',
      type: 'guestbook',
      likes_count: 2,
    };

    render(<MessageBubble message={message} />);
    expect(screen.getByText('Khách Ghé Thăm')).toBeInTheDocument();
    expect(screen.getByText('Website nhắn tin quá đẹp!')).toBeInTheDocument();
  });
});

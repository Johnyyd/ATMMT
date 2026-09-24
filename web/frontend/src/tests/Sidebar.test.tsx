import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatTopic } from '../types/chat';

describe('Sidebar Component', () => {
  const mockTopics: ChatTopic[] = [
    {
      id: 'about',
      title: '👤 Giới thiệu tác giả',
      subtitle: 'Bio Johnyyd',
      avatar: 'https://github.com/Johnyyd.png',
      type: 'portfolio',
      unread: 0,
      is_online: true,
      last_message: 'Hi',
    },
    {
      id: 'guestbook',
      title: '💬 Public Guestbook',
      subtitle: 'Sổ lưu bút',
      avatar: '👥',
      type: 'guestbook',
      unread: 0,
      is_online: true,
      last_message: 'Welcome',
    },
  ];

  it('renders author profile and topic list', () => {
    const onSelect = vi.fn();
    render(
      <Sidebar
        topics={mockTopics}
        activeTopicId="about"
        onSelectTopic={onSelect}
        isOpenMobile={false}
        onCloseMobile={() => {}}
      />
    );

    expect(screen.getByText('Nguyễn Minh Trí')).toBeInTheDocument();
    expect(screen.getByText('👤 Giới thiệu tác giả')).toBeInTheDocument();
    expect(screen.getByText('💬 Public Guestbook')).toBeInTheDocument();
  });

  it('calls onSelectTopic when a topic button is clicked', () => {
    const onSelect = vi.fn();
    render(
      <Sidebar
        topics={mockTopics}
        activeTopicId="about"
        onSelectTopic={onSelect}
        isOpenMobile={false}
        onCloseMobile={() => {}}
      />
    );

    fireEvent.click(screen.getByText('💬 Public Guestbook'));
    expect(onSelect).toHaveBeenCalledWith('guestbook');
  });
});

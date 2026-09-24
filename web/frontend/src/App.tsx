import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { AuthModal } from './components/AuthModal';
import { EditMessageModal } from './components/EditMessageModal';
import ProfilePage from './components/ProfilePage';
import { ChatTopic, ChatMessage } from './types/chat';
import { User } from './types/auth';
import { authService } from './services/authService';
import {
  fetchTopics,
  fetchTopicMessages,
  fetchGuestbookMessages,
  postGuestbookMessage,
  likeGuestbookMessage,
  getOrCreateUserToken,
  fetchOnlineCount,
} from './services/api';
import { guestbookWS } from './services/websocket';

export const App: React.FC = () => {
  const [topics, setTopics] = useState<ChatTopic[]>([]);
  const [activeTopicId, setActiveTopicId] = useState<string>('guestbook');
  const [topicMessagesMap, setTopicMessagesMap] = useState<Record<string, ChatMessage[]>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [isSendingGuestbook, setIsSendingGuestbook] = useState<boolean>(false);
  const [onlineCount, setOnlineCount] = useState<number>(guestbookWS.lastOnlineCount || 1);
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('portfolio_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  // View State
  const [viewMode, setViewMode] = useState<'chat' | 'profile'>('chat');
  const [profileUserId, setProfileUserId] = useState<number | null>(null);

  const handleViewProfile = (userId: number | null) => {
    setProfileUserId(userId);
    setViewMode('profile');
    if (isMobileOpen) setIsMobileOpen(false);
  };

  // Auth & Admin Moderation State
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);

  // Verify auth session on load
  useEffect(() => {
    async function checkAuth() {
      const user = await authService.getMe();
      setCurrentUser(user);
    }
    checkAuth();
  }, []);


  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('portfolio_theme', next);
      return next;
    });
  };

  const currentUserToken = getOrCreateUserToken();

  const isMyGuestbookMessage = (entry: { user_token?: string; author_name: string; user_id?: number | null }) => {
    if (currentUser && entry.user_id && entry.user_id === currentUser.id) {
      return true;
    }
    if (entry.user_token && currentUserToken && entry.user_token === currentUserToken) {
      return true;
    }
    const activeName = localStorage.getItem('guestbook_author_name') || '';
    if (activeName.trim().length >= 2 && entry.author_name.trim().toLowerCase() === activeName.trim().toLowerCase()) {
      return true;
    }
    return false;
  };

  // Load Initial Topics & Periodically Poll Online Count as Failsafe
  useEffect(() => {
    async function loadInitialData() {
      try {
        const loadedTopics = await fetchTopics();
        setTopics(loadedTopics);
        if (loadedTopics.length > 0 && !loadedTopics.some((t) => t.id === activeTopicId)) {
          setActiveTopicId(loadedTopics[0].id);
        }
      } catch (err) {
        console.error('Failed to load topics:', err);
      }

      try {
        const restCount = await fetchOnlineCount();
        if (restCount > 0) {
          setOnlineCount(restCount);
        }
      } catch (err) {
        console.error('Failed to fetch online count:', err);
      }
    }
    loadInitialData();

    const intervalId = setInterval(async () => {
      try {
        const restCount = await fetchOnlineCount();
        if (restCount > 0) {
          setOnlineCount(restCount);
        }
      } catch (err) {
        // Silent catch
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  // WebSocket Real-time Guestbook Subscriptions (new_message, like_update, message_updated, message_deleted)
  useEffect(() => {
    const unsubscribe = guestbookWS.subscribe((wsEvent) => {
      if (wsEvent.event === 'new_message') {
        const entry = wsEvent.data;
        const isSelf = isMyGuestbookMessage({
          user_token: entry.user_token,
          author_name: entry.author_name,
          user_id: entry.user_id,
        });

        const newChatMessage: ChatMessage = {
          id: entry.id,
          sender: entry.author_name,
          is_author: isSelf,
          avatar: '',
          avatar_color: entry.avatar_color,
          content: entry.content,
          timestamp: new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'guestbook',
          likes_count: entry.likes_count,
          user_token: entry.user_token,
          user_id: entry.user_id,
          image: entry.image,
          is_edited: entry.is_edited,
          edited_at: entry.edited_at,
          expires_at: entry.expires_at,
          author_role: entry.author_role || 'anonymous',
        };

        setTopicMessagesMap((prev) => {
          const currentList = prev['guestbook'] || [];
          if (currentList.some((m) => m.id === newChatMessage.id)) {
            return prev;
          }
          return {
            ...prev,
            guestbook: [...currentList, newChatMessage],
          };
        });

        setMessages((prev) => {
          if (prev.some((m) => m.id === newChatMessage.id)) {
            return prev;
          }
          return [...prev, newChatMessage];
        });
      } else if (wsEvent.event === 'like_update') {
        const updated = wsEvent.data;
        const updateList = (prevList: ChatMessage[]) =>
          prevList.map((m) => (m.id === updated.id ? { ...m, likes_count: updated.likes_count } : m));

        setTopicMessagesMap((prev) => ({
          ...prev,
          guestbook: updateList(prev['guestbook'] || []),
        }));
        setMessages((prev) => updateList(prev));
      } else if (wsEvent.event === 'message_updated') {
        const updated = wsEvent.data;
        const updateList = (prevList: ChatMessage[]) =>
          prevList.map((m) =>
            m.id === updated.id
              ? {
                  ...m,
                  content: updated.content,
                  is_edited: updated.is_edited,
                  edited_at: updated.edited_at,
                }
              : m
          );

        setTopicMessagesMap((prev) => ({
          ...prev,
          guestbook: updateList(prev['guestbook'] || []),
        }));
        setMessages((prev) => updateList(prev));
      } else if (wsEvent.event === 'message_deleted') {
        const { id } = wsEvent.data;
        const filterList = (prevList: ChatMessage[]) => prevList.filter((m) => m.id !== id);

        setTopicMessagesMap((prev) => ({
          ...prev,
          guestbook: filterList(prev['guestbook'] || []),
        }));
        setMessages((prev) => filterList(prev));
      } else if (wsEvent.event === 'online_count') {
        if (typeof wsEvent.data?.count === 'number') {
          setOnlineCount(wsEvent.data.count);
        }
      } else if (wsEvent.event === 'typing') {
        const typingData = wsEvent.data;
        const isSelf = isMyGuestbookMessage({
          author_name: typingData.author_name,
          user_token: typingData.user_token,
          user_id: typingData.user_id,
        });
        if (!isSelf && typingData.author_name) {
          setTypingUsers((prev) => ({
            ...prev,
            [typingData.author_name]: Date.now(),
          }));
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUserToken, currentUser]);

  // Clear stale typing indicators
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        let changed = false;
        const next = { ...prev };
        for (const [name, time] of Object.entries(next)) {
          if (now - time > 3000) {
            delete next[name];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Load or Restore Messages for Selected Topic
  useEffect(() => {
    async function loadMessages() {
      if (!activeTopicId) return;

      if (activeTopicId === 'guestbook') {
        try {
          const entries = await fetchGuestbookMessages();
          const mappedMessages: ChatMessage[] = entries.map((entry) => ({
            id: entry.id,
            sender: entry.author_name,
            is_author: isMyGuestbookMessage({
              user_token: entry.user_token,
              author_name: entry.author_name,
              user_id: entry.user_id,
            }),
            avatar: '',
            avatar_color: entry.avatar_color,
            content: entry.content,
            timestamp: new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'guestbook',
            likes_count: entry.likes_count,
            user_token: entry.user_token,
            user_id: entry.user_id,
            image: entry.image,
            is_edited: entry.is_edited,
            edited_at: entry.edited_at,
            expires_at: entry.expires_at,
            author_role: entry.author_role || 'anonymous',
          }));

          setTopicMessagesMap((prev) => ({
            ...prev,
            guestbook: mappedMessages,
          }));
          setMessages(mappedMessages);
        } catch (err) {
          console.error('Failed to fetch guestbook:', err);
          if (topicMessagesMap['guestbook']) {
            setMessages(topicMessagesMap['guestbook']);
          }
        }
      } else {
        if (topicMessagesMap[activeTopicId] && topicMessagesMap[activeTopicId].length > 0) {
          setMessages(topicMessagesMap[activeTopicId]);
        } else {
          try {
            setIsTyping(true);
            const topicMsgs = await fetchTopicMessages(activeTopicId);
            const formattedTopicMsgs = topicMsgs.map((m) => ({
              ...m,
              is_author: m.type === 'ai' ? true : false,
            }));

            setTopicMessagesMap((prev) => ({
              ...prev,
              [activeTopicId]: formattedTopicMsgs,
            }));
            setMessages(formattedTopicMsgs);
          } catch (err) {
            console.error('Failed to fetch topic messages:', err);
          } finally {
            setIsTyping(false);
          }
        }
      }
    }

    loadMessages();
  }, [activeTopicId, currentUserToken, currentUser]);

  // Handle Guestbook Message Submit
  const handleSendGuestbookMessage = async (authorName: string, content: string, avatarColor: string, image: string | null) => {
    setIsSendingGuestbook(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const response = await fetch('/api/v1/guestbook', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          author_name: authorName,
          content: content,
          avatar_color: avatarColor,
          image: image,
          user_token: currentUserToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Không thể gửi tin nhắn lưu bút');
      }

      const newEntry = await response.json();

      const newChatMessage: ChatMessage = {
        id: newEntry.id,
        sender: newEntry.author_name,
        is_author: true,
        avatar: '',
        avatar_color: newEntry.avatar_color,
        content: newEntry.content,
        timestamp: new Date(newEntry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'guestbook',
        likes_count: newEntry.likes_count,
        user_token: newEntry.user_token,
        user_id: newEntry.user_id,
        is_edited: newEntry.is_edited,
        edited_at: newEntry.edited_at,
        expires_at: newEntry.expires_at,
        author_role: newEntry.author_role || 'anonymous',
      };

      setTopicMessagesMap((prev) => {
        const list = prev['guestbook'] || [];
        if (list.some((m) => m.id === newChatMessage.id)) return prev;
        return {
          ...prev,
          guestbook: [...list, newChatMessage],
        };
      });
      setMessages((prev) => {
        if (prev.some((m) => m.id === newChatMessage.id)) return prev;
        return [...prev, newChatMessage];
      });
    } catch (err) {
      console.error('Failed to save guestbook message:', err);
      throw err;
    } finally {
      setIsSendingGuestbook(false);
    }
  };

  // Handle Admin Edit Message Modal Trigger
  const handleEditGuestbookMessage = (msg: ChatMessage) => {
    setEditingMessage(msg);
  };

  // Handle Admin Delete Message
  const handleDeleteGuestbookMessage = async (messageId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tin nhắn này khỏi cơ sở dữ liệu?')) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/guestbook/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.detail || 'Không thể xóa tin nhắn.');
        return;
      }

      // Optimistic state removal
      const updateList = (prev: ChatMessage[]) => prev.filter((m) => m.id !== messageId);
      setTopicMessagesMap((prev) => ({
        ...prev,
        guestbook: updateList(prev['guestbook'] || []),
      }));
      setMessages((prev) => updateList(prev));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Handle Guestbook Like Action
  const handleLikeGuestbookMessage = async (messageId: number) => {
    try {
      const updated = await likeGuestbookMessage(messageId);
      const updateList = (prev: ChatMessage[]) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, likes_count: updated.likes_count } : msg));

      setTopicMessagesMap((prev) => ({
        ...prev,
        guestbook: updateList(prev['guestbook'] || []),
      }));
      setMessages((prev) => updateList(prev));
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const activeTopic = topics.find((t) => t.id === activeTopicId) || null;

  return (
    <div
      data-theme={theme}
      data-testid="app-container"
      className="flex h-[100dvh] w-full bg-[#07090E] light:bg-[#F8FAFC] text-zinc-100 light:text-slate-900 overflow-hidden font-sans transition-colors duration-200"
    >
      <Sidebar
        topics={topics}
        activeTopicId={activeTopicId}
        onSelectTopic={setActiveTopicId}
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onlineCount={onlineCount}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        user={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onViewProfile={handleViewProfile}
      />

      {viewMode === 'profile' ? (
        <div className="flex-1 overflow-hidden relative">
          <ProfilePage userId={profileUserId} onBack={() => setViewMode('chat')} />
        </div>
      ) : (
        <ChatWindow
          topic={activeTopic}
          messages={messages}
          isTyping={isTyping}
          typingUsers={Object.keys(typingUsers)}
          onOpenMobileSidebar={() => setIsMobileOpen(true)}
          onSendGuestbookMessage={handleSendGuestbookMessage}
          onLikeGuestbookMessage={handleLikeGuestbookMessage}
          onEditGuestbookMessage={handleEditGuestbookMessage}
          onDeleteGuestbookMessage={handleDeleteGuestbookMessage}
          isSendingGuestbook={isSendingGuestbook}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          currentUser={currentUser}
          onViewProfile={handleViewProfile}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => setCurrentUser(user)}
      />

      {/* Admin Edit Message Modal */}
      <EditMessageModal
        message={editingMessage}
        isOpen={!!editingMessage}
        onClose={() => setEditingMessage(null)}
        onSuccess={({ id, content, is_edited }) => {
          const updateList = (prev: ChatMessage[]) =>
            prev.map((m) => (m.id === id ? { ...m, content, is_edited } : m));
          setTopicMessagesMap((prev) => ({
            ...prev,
            guestbook: updateList(prev['guestbook'] || []),
          }));
          setMessages((prev) => updateList(prev));
        }}
      />
    </div>
  );
};

export default App;

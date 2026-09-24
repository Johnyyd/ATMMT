import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AuthModal } from '../components/AuthModal';

describe('AuthModal Component', () => {
  it('renders modal title and form when open', () => {
    render(<AuthModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByText('Xác thực tài khoản')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập tên tài khoản...')).toBeInTheDocument();
    expect(screen.getByText('Đăng nhập ngay')).toBeInTheDocument();
  });

  it('switches between Login and Register tabs', () => {
    render(<AuthModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    const registerTab = screen.getByRole('button', { name: 'Đăng ký' });
    fireEvent.click(registerTab);

    const titleElements = screen.getAllByText('Tạo tài khoản Thành viên');
    expect(titleElements.length).toBeGreaterThan(0);
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<AuthModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIChatInput } from '../components/AIChatInput';

describe('AIChatInput Component', () => {
  it('renders text input and submit button', () => {
    const onSend = vi.fn();

    render(
      <AIChatInput
        onSendMessage={onSend}
        isSubmitting={false}
      />
    );

    expect(screen.getByPlaceholderText(/Hỏi Johnyyd AI/i)).toBeDefined();
    expect(screen.getByText('Gửi')).toBeDefined();
  });

  it('triggers onSendMessage on form submit', () => {
    const onSend = vi.fn();

    render(
      <AIChatInput
        onSendMessage={onSend}
        isSubmitting={false}
      />
    );

    const input = screen.getByPlaceholderText(/Hỏi Johnyyd AI/i);
    fireEvent.change(input, { target: { value: 'Kỹ năng của Johnyyd?' } });
    fireEvent.click(screen.getByText('Gửi'));

    expect(onSend).toHaveBeenCalledWith('Kỹ năng của Johnyyd?', 'auto');
  });
});

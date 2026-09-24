import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SuggestionChips } from '../components/SuggestionChips';

describe('SuggestionChips Component', () => {
  it('renders suggestion chips and triggers callback on click', () => {
    const onSelect = vi.fn();
    render(<SuggestionChips suggestions={['Hỏi về Docker?', 'Hỏi về React?']} onSelectSuggestion={onSelect} />);

    expect(screen.getByText('Hỏi về Docker?')).toBeInTheDocument();
    expect(screen.getByText('Hỏi về React?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Hỏi về Docker?'));
    expect(onSelect).toHaveBeenCalledWith('Hỏi về Docker?');
  });

  it('renders nothing when suggestions array is empty', () => {
    const { container } = render(<SuggestionChips suggestions={[]} onSelectSuggestion={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});

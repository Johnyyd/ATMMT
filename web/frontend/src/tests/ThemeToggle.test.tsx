import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { App } from '../App';

describe('Theme Toggle Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to dark theme on initial render', () => {
    render(<App />);
    const appContainer = screen.getByTestId('app-container');
    expect(appContainer).toHaveAttribute('data-theme', 'dark');
  });

  it('toggles theme to light when toggle button is clicked', () => {
    render(<App />);
    const toggleButtons = screen.getAllByTitle(/Chuyển giao diện/i);
    expect(toggleButtons.length).toBeGreaterThan(0);

    fireEvent.click(toggleButtons[0]);

    const appContainer = screen.getByTestId('app-container');
    expect(appContainer).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem('portfolio_theme')).toBe('light');
  });
});

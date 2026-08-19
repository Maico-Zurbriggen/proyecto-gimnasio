import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '../src/App';

describe('App', () => {
  it('renders the project shell', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Base del sistema lista' })).toBeVisible();
  });
});

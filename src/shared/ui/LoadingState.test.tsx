import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Loader } from './Loader';
import { LoadingState } from './LoadingState';
import { Skeleton } from './Skeleton';

describe('Loader', () => {
  it('expone role=status con el label visible', () => {
    render(<Loader label="Cargando tu rutina…" />);
    const el = screen.getByRole('status');
    expect(el).toHaveTextContent('Cargando tu rutina…');
    expect(el).toHaveAttribute('aria-live', 'polite');
  });

  it('oculta el label visualmente con srOnly', () => {
    render(<Loader label="Guardando…" srOnly />);
    expect(screen.getByText('Guardando…')).toHaveClass('sr-only');
  });
});

describe('Skeleton', () => {
  it('es decorativo', () => {
    const { container } = render(<Skeleton variant="card" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('LoadingState', () => {
  it.each(['inline', 'card', 'list', 'page'] as const)(
    'variante %s: status, aria-busy y label una sola vez',
    (variant) => {
      render(<LoadingState label="Cargando alumnos…" variant={variant} />);
      const el = screen.getByRole('status');
      expect(el).toHaveAttribute('aria-busy', 'true');
      expect(screen.getAllByText('Cargando alumnos…')).toHaveLength(1);
    },
  );
});

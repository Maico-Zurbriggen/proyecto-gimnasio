import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExerciseImage } from './ExerciseImage';

describe('Catalogue images', () => {
  it('recovers when a failed resource is replaced without remounting the card', () => {
    const { rerender } = render(
      <ExerciseImage url="https://example.test/broken.webp" alt="Ejercicio" />,
    );
    fireEvent.error(screen.getByRole('img'));
    expect(
      screen.getByText('Imagen del ejercicio no disponible.'),
    ).toBeVisible();
    rerender(
      <ExerciseImage
        url="https://example.test/repaired.webp"
        alt="Ejercicio"
      />,
    );
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'https://example.test/repaired.webp',
    );
  });
  it('shows the explicit fallback when no image is registered', () => {
    render(
      <ExerciseImage url="" alt="Ejercicio" fallback={<p>Mapa muscular</p>} />,
    );
    expect(screen.getByText('Mapa muscular')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('resolves private media against the backend instead of the SPA host', () => {
    render(
      <ExerciseImage
        url="/catalog/media/revision/image.webp"
        alt="Ejercicio"
      />,
    );
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'http://localhost:3000/catalog/media/revision/image.webp',
    );
  });
});

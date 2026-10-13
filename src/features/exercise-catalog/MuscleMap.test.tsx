import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MuscleMap } from './MuscleMap';

const muscles = [
  { code: 'GLUTEO', name: 'Glúteo' },
  { code: 'OBLICUOS', name: 'Oblicuos' },
  { code: 'OTRO', name: 'Grupo nuevo' },
];
describe('Muscular participation diagram', () => {
  it('highlights a posterior primary group and anterior secondary group with an accessible description', () => {
    const { container, rerender } = render(
      <MuscleMap
        primary={['GLUTEO']}
        secondary={['OBLICUOS']}
        muscles={muscles}
      />,
    );
    expect(
      screen.getByRole('img', {
        name: /Primarios: Glúteo. Secundarios: Oblicuos/,
      }),
    ).toBeVisible();
    expect(container.querySelector('[data-muscle="GLUTEO"]')).toHaveAttribute(
      'data-participation',
      'primary',
    );
    expect(container.querySelector('[data-muscle="OBLICUOS"]')).toHaveAttribute(
      'data-participation',
      'secondary',
    );
    expect(screen.getByText('Secundarios (rayados)')).toBeVisible();
    rerender(
      <MuscleMap primary={['OBLICUOS']} secondary={[]} muscles={muscles} />,
    );
    expect(container.querySelector('[data-muscle="GLUTEO"]')).toHaveAttribute(
      'data-participation',
      'inactive',
    );
    expect(container.querySelector('[data-muscle="OBLICUOS"]')).toHaveAttribute(
      'data-participation',
      'primary',
    );
  });
  it('makes missing taxonomy regions explicit and does not reuse SVG IDs between cards', () => {
    const { container } = render(
      <>
        <MuscleMap primary={['OTRO']} secondary={[]} muscles={muscles} />
        <MuscleMap primary={['GLUTEO']} secondary={[]} muscles={muscles} />
      </>,
    );
    expect(
      screen.getByText(/Sin representación gráfica: Grupo nuevo/),
    ).toBeVisible();
    const ids = Array.from(
      container.querySelectorAll('[id]'),
      (element) => element.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PendingMeasurementsForm } from './PendingMeasurementsForm';

function setValues(weight: string, height: string) {
  fireEvent.change(screen.getByLabelText('Peso (kg)'), {
    target: { value: weight },
  });
  fireEvent.change(screen.getByLabelText('Altura (cm)'), {
    target: { value: height },
  });
}

describe('PendingMeasurementsForm', () => {
  it('reporta inválido para valores absurdos', () => {
    const onValidityChange = vi.fn();
    render(<PendingMeasurementsForm onValidityChange={onValidityChange} />);

    setValues('9999', '-5');

    expect(onValidityChange).toHaveBeenLastCalledWith(false, null);
  });

  it('acepta los valores límite exactos (20/250 kg, 100/250 cm)', () => {
    const onValidityChange = vi.fn();
    render(<PendingMeasurementsForm onValidityChange={onValidityChange} />);

    setValues('20', '100');
    expect(onValidityChange).toHaveBeenLastCalledWith(true, {
      weightKg: 20,
      heightCm: 100,
    });

    setValues('250', '250');
    expect(onValidityChange).toHaveBeenLastCalledWith(true, {
      weightKg: 250,
      heightCm: 250,
    });
  });

  it('reporta válido para una carga normal y muestra error al desenfocar un valor fuera de rango', () => {
    const onValidityChange = vi.fn();
    render(<PendingMeasurementsForm onValidityChange={onValidityChange} />);

    setValues('80', '180');
    expect(onValidityChange).toHaveBeenLastCalledWith(true, {
      weightKg: 80,
      heightCm: 180,
    });

    fireEvent.change(screen.getByLabelText('Peso (kg)'), {
      target: { value: '10' },
    });
    fireEvent.blur(screen.getByLabelText('Peso (kg)'));

    expect(screen.getByText(/El peso debe estar entre/)).toBeVisible();
    expect(onValidityChange).toHaveBeenLastCalledWith(false, null);
  });
});

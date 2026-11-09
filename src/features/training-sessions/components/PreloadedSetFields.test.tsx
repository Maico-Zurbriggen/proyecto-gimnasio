import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SeriePrecargada } from '../../../api/trainingSessions';
import { PreloadedSetFields } from './PreloadedSetFields';

function serie(overrides: Partial<SeriePrecargada> = {}): SeriePrecargada {
  return {
    position: 1,
    exerciseId: '10000000-0000-4000-8000-000000000001',
    repeticionesMinimas: 8,
    repeticionesMaximas: 12,
    warmup: false,
    carga: 80,
    repeticiones: 10,
    origen: 'ULTIMA_EJECUCION',
    antiguedadEnDias: 7,
    ...overrides,
  };
}

function renderCampos(overrides: Partial<SeriePrecargada> = {}) {
  const datos = serie(overrides);
  const onCargaChange = vi.fn();
  const onRepeticionesChange = vi.fn();

  render(
    <PreloadedSetFields
      serie={datos}
      carga={datos.carga}
      repeticiones={datos.repeticiones}
      onCargaChange={onCargaChange}
      onRepeticionesChange={onRepeticionesChange}
    />,
  );

  return { onCargaChange, onRepeticionesChange };
}

describe('PreloadedSetFields', () => {
  it('RF-030: presenta la serie con los valores precargados', () => {
    renderCampos();

    expect(screen.getByLabelText('Carga (kg)')).toHaveValue(80);
    expect(screen.getByLabelText('Repeticiones')).toHaveValue(10);
  });

  it('DD-15: declara la antigüedad del valor propuesto', () => {
    renderCampos({ antiguedadEnDias: 45 });

    expect(
      screen.getByText(/última ejecución, hace 45 días/i),
    ).toBeInTheDocument();
  });

  it('dice «hoy» y «ayer» en lugar de contar días', () => {
    const { unmount } = render(
      <PreloadedSetFields
        serie={serie({ antiguedadEnDias: 0 })}
        carga={80}
        repeticiones={10}
        onCargaChange={vi.fn()}
        onRepeticionesChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/última ejecución, hoy/i)).toBeInTheDocument();
    unmount();

    renderCampos({ antiguedadEnDias: 1 });
    expect(screen.getByText(/última ejecución, ayer/i)).toBeInTheDocument();
  });

  it('CB-09: con la carga sugerida de la rutina lo declara como tal', () => {
    renderCampos({
      origen: 'CARGA_SUGERIDA',
      carga: 60,
      antiguedadEnDias: null,
    });

    expect(screen.getByLabelText('Carga (kg)')).toHaveValue(60);
    expect(
      screen.getByText(/carga sugerida de tu rutina/i),
    ).toBeInTheDocument();
  });

  it('CB-09: sin datos el campo queda vacío, nunca en cero', () => {
    renderCampos({ origen: 'SIN_DATOS', carga: null, antiguedadEnDias: null });

    const campo = screen.getByLabelText('Carga (kg)');
    // Lo que el alumno ve es un campo por completar, no un 0 que confirmaría
    // sin mirar.
    expect(campo).toHaveValue(null);
    expect(campo).toHaveAttribute('placeholder', 'Ingresá la carga');
    expect(
      screen.getByText(/primera vez con este ejercicio/i),
    ).toBeInTheDocument();
  });

  it('muestra el rango de repeticiones prescripto', () => {
    renderCampos({ repeticionesMinimas: 6, repeticionesMaximas: 8 });

    expect(screen.getByText(/6-8 repeticiones/i)).toBeInTheDocument();
  });

  it('usa el rango como marcador cuando no hay repeticiones precargadas', () => {
    renderCampos({ repeticiones: null });

    expect(screen.getByLabelText('Repeticiones')).toHaveAttribute(
      'placeholder',
      '8-12',
    );
  });

  it('señala la serie de calentamiento', () => {
    renderCampos({ warmup: true });

    expect(screen.getByText('calentamiento')).toBeInTheDocument();
  });

  it('RN-55: los campos declaran los rangos admisibles', () => {
    renderCampos();

    const carga = screen.getByLabelText('Carga (kg)');
    expect(carga).toHaveAttribute('min', '0');
    expect(carga).toHaveAttribute('max', '1000');

    const reps = screen.getByLabelText('Repeticiones');
    expect(reps).toHaveAttribute('min', '1');
    expect(reps).toHaveAttribute('max', '100');
  });

  it('informa la corrección del alumno', () => {
    const { onCargaChange } = renderCampos();

    fireEvent.change(screen.getByLabelText('Carga (kg)'), {
      target: { value: '85' },
    });

    expect(onCargaChange).toHaveBeenLastCalledWith(85);
  });

  it('vaciar un campo informa ausencia, no cero', () => {
    const { onCargaChange } = renderCampos();

    fireEvent.change(screen.getByLabelText('Carga (kg)'), {
      target: { value: '' },
    });

    // Un campo vacío es «todavía no lo dije», que es distinto de «cero kilos».
    expect(onCargaChange).toHaveBeenLastCalledWith(null);
  });
});

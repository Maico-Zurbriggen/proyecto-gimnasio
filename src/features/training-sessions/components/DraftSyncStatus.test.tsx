import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SerieEnBorrador } from '../lib/sessionDraft';
import { DraftSyncStatus } from './DraftSyncStatus';

function serie(overrides: Partial<SerieEnBorrador> = {}): SerieEnBorrador {
  return {
    position: 1,
    carga: 80,
    repeticiones: 10,
    esfuerzoPercibido: null,
    completada: true,
    motivoDeOmision: null,
    atipicoConfirmado: false,
    estado: 'PENDIENTE',
    registradaEl: '2026-10-21T18:30:00.000Z',
    intentos: 0,
    ...overrides,
  };
}

describe('DraftSyncStatus', () => {
  it('con todo enviado lo dice sin alarmar', () => {
    render(
      <DraftSyncStatus
        pendientes={[]}
        sincronizado
        respaldoLocalActivo
        onReintentar={vi.fn()}
      />,
    );

    expect(screen.getByText('Todo guardado.')).toBeInTheDocument();
  });

  it('RNF-10: con series pendientes avisa que están guardadas, no que se perdieron', () => {
    render(
      <DraftSyncStatus
        pendientes={[serie(), serie({ position: 2 })]}
        sincronizado={false}
        respaldoLocalActivo
        onReintentar={vi.fn()}
      />,
    );

    // El mensaje es sobre el trabajo a salvo, no sobre la red caída.
    expect(
      screen.getByText(/2 series guardadas en este dispositivo/i),
    ).toBeInTheDocument();
  });

  it('usa el singular con una sola serie pendiente', () => {
    render(
      <DraftSyncStatus
        pendientes={[serie()]}
        sincronizado={false}
        respaldoLocalActivo
        onReintentar={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/1 serie guardada en este dispositivo/i),
    ).toBeInTheDocument();
  });

  it('CB-24: cuando ya hubo un fallo anuncia el reintento automático', () => {
    render(
      <DraftSyncStatus
        pendientes={[serie({ estado: 'FALLIDA', intentos: 2 })]}
        sincronizado={false}
        respaldoLocalActivo
        onReintentar={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/se reintenta al recuperar la conexión/i),
    ).toBeInTheDocument();
  });

  it('permite forzar el reintento', () => {
    const onReintentar = vi.fn();
    render(
      <DraftSyncStatus
        pendientes={[serie()]}
        sincronizado={false}
        respaldoLocalActivo
        onReintentar={onReintentar}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onReintentar).toHaveBeenCalledTimes(1);
  });

  it('advierte cuando el respaldo local no funciona', () => {
    render(
      <DraftSyncStatus
        pendientes={[serie()]}
        sincronizado={false}
        respaldoLocalActivo={false}
        onReintentar={vi.fn()}
      />,
    );

    // Éste es el único caso en que el alumno sí corre riesgo de perder datos.
    expect(screen.getByRole('alert')).toHaveTextContent(
      /no se puede guardar el respaldo/i,
    );
  });
});

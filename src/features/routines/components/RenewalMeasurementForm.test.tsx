import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../../api/client';
import * as measurementsApi from '../../../api/measurements';
import { RenewalMeasurementForm } from './RenewalMeasurementForm';

const STUDENT = '11111111-1111-4111-8111-111111111111';

function renderForm(props: Partial<{ onRegistrada: () => void }> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <RenewalMeasurementForm studentId={STUDENT} {...props} />
    </QueryClientProvider>,
  );
}

function completar(weight: string, height: string) {
  fireEvent.change(screen.getByLabelText('Peso (kg)'), {
    target: { value: weight },
  });
  fireEvent.change(screen.getByLabelText('Altura (cm)'), {
    target: { value: height },
  });
}

function enviar() {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar medidas' }));
}

describe('RenewalMeasurementForm (HU02 - T3 y T4)', () => {
  // Los espías se acumulan entre casos si no se restauran: el setup compartido
  // sólo limpia el DOM.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Esc. 1: envía una carga válida y avisa que se registró', async () => {
    const onRegistrada = vi.fn();
    const recordMeasurement = vi
      .spyOn(measurementsApi, 'recordMeasurement')
      .mockResolvedValue({
        studentId: STUDENT,
        weightKg: 75.5,
        heightCm: 178,
        measuredOn: '2026-09-20',
        replacedPrevious: false,
      });

    renderForm({ onRegistrada });
    completar('75.5', '178');
    enviar();

    await waitFor(() => {
      expect(recordMeasurement).toHaveBeenCalledWith(STUDENT, {
        weightKg: 75.5,
        heightCm: 178,
      });
    });
    await waitFor(() => {
      expect(onRegistrada).toHaveBeenCalled();
    });
  });

  it('Esc. 1.3: acepta los valores límite exactos', async () => {
    const recordMeasurement = vi
      .spyOn(measurementsApi, 'recordMeasurement')
      .mockResolvedValue({
        studentId: STUDENT,
        weightKg: 20,
        heightCm: 100,
        measuredOn: '2026-09-20',
        replacedPrevious: false,
      });

    renderForm();
    completar('20', '100');
    enviar();

    await waitFor(() => {
      expect(recordMeasurement).toHaveBeenCalledWith(STUDENT, {
        weightKg: 20,
        heightCm: 100,
      });
    });
  });

  it('Esc. 1.1: no envía un peso fuera de rango y muestra el rango admitido', async () => {
    const recordMeasurement = vi.spyOn(measurementsApi, 'recordMeasurement');

    renderForm();
    completar('19.9', '178');
    enviar();

    const error = await screen.findByRole('alert');
    expect(error.textContent).toContain('20');
    expect(error.textContent).toContain('250');
    expect(recordMeasurement).not.toHaveBeenCalled();
  });

  it('Esc. 1.2: no envía una altura fuera de rango', async () => {
    const recordMeasurement = vi.spyOn(measurementsApi, 'recordMeasurement');

    renderForm();
    completar('75', '99');
    enviar();

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(recordMeasurement).not.toHaveBeenCalled();
  });

  it('rechaza valores absurdos', async () => {
    const recordMeasurement = vi.spyOn(measurementsApi, 'recordMeasurement');

    renderForm();
    completar('9999', '-5');
    enviar();

    expect(await screen.findAllByRole('alert')).toHaveLength(2);
    expect(recordMeasurement).not.toHaveBeenCalled();
  });

  it('T4: muestra el rango que devuelve el servidor cuando rechaza un valor', async () => {
    vi.spyOn(measurementsApi, 'recordMeasurement').mockRejectedValue(
      new ApiError(400, 'measurement_out_of_range', {
        error: 'measurement_out_of_range',
        violations: [
          {
            field: 'weightKg',
            value: 300,
            min: 20,
            max: 250,
            unit: 'kg',
            message: 'fuera de rango',
          },
        ],
      }),
    );

    renderForm();
    // Un valor que el cliente da por bueno pero el servidor rechaza: la
    // autoridad es el servidor y su mensaje es el que se muestra.
    completar('249', '178');
    enviar();

    const error = await screen.findByRole('alert');
    expect(error.textContent).toContain('20');
    expect(error.textContent).toContain('250');
    expect(error.textContent).toContain('kg');
  });

  it('informa un fallo inesperado sin culpar al valor ingresado', async () => {
    vi.spyOn(measurementsApi, 'recordMeasurement').mockRejectedValue(
      new ApiError(500, 'internal_server_error'),
    );

    renderForm();
    completar('75', '178');
    enviar();

    const error = await screen.findByRole('alert');
    expect(error.textContent).toContain('No pudimos guardar');
  });

  it('limpia el rechazo del servidor al corregir el valor', async () => {
    vi.spyOn(measurementsApi, 'recordMeasurement').mockRejectedValue(
      new ApiError(400, 'measurement_out_of_range', {
        error: 'measurement_out_of_range',
        violations: [
          {
            field: 'weightKg',
            value: 300,
            min: 20,
            max: 250,
            unit: 'kg',
            message: 'fuera de rango',
          },
        ],
      }),
    );

    renderForm();
    completar('249', '178');
    enviar();
    await screen.findByRole('alert');

    fireEvent.change(screen.getByLabelText('Peso (kg)'), {
      target: { value: '80' },
    });

    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });
});

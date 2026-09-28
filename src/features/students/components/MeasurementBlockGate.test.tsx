import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { mockApi } from '../../../../test/apiMocks';
import type { StudentStatus } from '../../../api/students';
import { SessionProvider } from '../../auth/hooks/useSession';
import { MeasurementBlockGate } from './MeasurementBlockGate';

const STUDENT = '11111111-1111-4111-a111-111111111111';

function status(
  measurementBlockState: StudentStatus['measurementBlockState'],
): StudentStatus {
  const blocked = measurementBlockState !== 'NORMAL';
  return {
    studentId: STUDENT,
    displayName: 'Alumno',
    bloqueado: blocked,
    measurementBlockState,
    motivoBloqueo: blocked ? 'Tres faltas consecutivas.' : null,
    fechaUltimaMedicion: null,
    faltasConsecutivas: blocked ? 3 : 0,
    blockedAt: blocked ? '2026-09-20T10:00:00.000Z' : null,
    submittedAt:
      measurementBlockState === 'PENDIENTE_APROBACION'
        ? '2026-09-21T10:00:00.000Z'
        : null,
    alturaCm: 175,
  };
}

function renderGate(blockState: StudentStatus['measurementBlockState']) {
  mockApi({
    'GET /auth/me': {
      body: { user: { id: STUDENT, gymId: 'gym-1', roles: ['ALUMNO'] } },
    },
    'GET /students/me/measurement-block': { body: status(blockState) },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <MemoryRouter initialEntries={['/alumno']}>
          <Routes>
            <Route element={<MeasurementBlockGate />}>
              <Route path="/alumno" element={<p>Contenido normal</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </SessionProvider>
    </QueryClientProvider>,
  );
}

describe('MeasurementBlockGate', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows only the measurement form while data is owed', async () => {
    renderGate('PENDIENTE_MEDICION');

    expect(
      await screen.findByRole('heading', {
        name: 'Actualizá tus mediciones para continuar.',
      }),
    ).toBeVisible();
    expect(screen.getByLabelText('Peso (kg)')).toBeVisible();
    expect(screen.queryByText('Contenido normal')).not.toBeInTheDocument();
  });

  it('waits for trainer approval after submission', async () => {
    renderGate('PENDIENTE_APROBACION');

    expect(
      await screen.findByRole('heading', {
        name: 'Tu entrenador debe aprobar la carga.',
      }),
    ).toBeVisible();
    expect(screen.queryByLabelText('Peso (kg)')).not.toBeInTheDocument();
  });

  it('renders normal student routes without an active block', async () => {
    renderGate('NORMAL');
    expect(await screen.findByText('Contenido normal')).toBeVisible();
  });
});

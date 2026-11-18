import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '../../../../test/apiMocks';
import { StudentList } from './StudentList';

const baseStudent = {
  displayName: 'Alumno',
  bloqueado: false,
  measurementBlockState: 'NORMAL',
  motivoBloqueo: null,
  fechaUltimaMedicion: '2026-11-01',
  faltasConsecutivas: 0,
  blockedAt: null,
  submittedAt: null,
  alturaCm: 175,
  objetivo: 'FUERZA',
  rutinaVigente: null,
  rutinasPendientesRevision: 0,
  propuestasAdaptacionPendientes: 0,
  ultimaSesion: null,
  adherenciaReciente: null,
  estadoAdherencia: 'DATOS_INSUFICIENTES',
  prioridad: 3,
  motivoPrioridad: 'SIN_SENAL',
};

function renderList(signal: Parameters<typeof StudentList>[0]['signal']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <StudentList signal={signal} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('StudentList signal filtering (HU35)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('muestra únicamente alumnos con la señal seleccionada', async () => {
    mockApi({
      'GET /trainers/me/students': {
        body: [
          {
            ...baseStudent,
            studentId: 'student-stagnation',
            displayName: 'Ana Estancada',
            senales: ['ESTANCAMIENTO'],
          },
          {
            ...baseStudent,
            studentId: 'student-adherence',
            displayName: 'Bruno Adherencia',
            senales: ['CAIDA_ADHERENCIA'],
          },
        ],
      },
    });

    renderList('ESTANCAMIENTO');

    expect(await screen.findByText('Ana Estancada')).toBeVisible();
    expect(screen.queryByText('Bruno Adherencia')).not.toBeInTheDocument();
  });
});

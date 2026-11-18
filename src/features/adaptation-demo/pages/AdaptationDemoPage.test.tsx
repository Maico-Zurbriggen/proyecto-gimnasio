import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi, renderRoute } from '../../../../test/apiMocks';
import type { AdaptationDemoResult } from '../../../api/generated/adaptation-demo';
import { AdaptationDemoPage } from './AdaptationDemoPage';

const studentId = '11111111-1111-4111-a111-111111111111';
const path = '/demo/adaptations';
const prepared: AdaptationDemoResult = {
  runId: 'run',
  studentId,
  scenario: 'ESTIMULO_INSUFICIENTE',
  diagnosticId: 'diagnostic',
  globalSituation: 'ESTIMULO_INSUFICIENTE',
  proposalId: 'proposal',
  proposalState: 'PENDIENTE',
  proposalStatus: 'PROPUESTA',
  preparedOn: '2026-11-15',
  reused: false,
};
function renderPanel() {
  return renderRoute('/', '/', <AdaptationDemoPage />);
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AdaptationDemoPage', () => {
  it('prepares the selected existing student, shows the result and restores it', async () => {
    let activeRun: AdaptationDemoResult | null = null;
    const fetch = mockApi({
      [`GET ${path}`]: () => ({
        body: {
          students: [
            {
              studentId,
              displayName: 'Alumno existente',
              hasCurrentRoutine: true,
              activeRun,
            },
          ],
        },
      }),
      [`POST ${path}/${studentId}`]: (init) => {
        expect(JSON.parse(String(init?.body))).toEqual({
          scenario: 'ESTIMULO_INSUFICIENTE',
        });
        activeRun = prepared;
        return { body: prepared };
      },
      [`POST ${path}/${studentId}/restore`]: () => {
        activeRun = null;
        return { body: { restored: true } };
      },
    });
    renderPanel();
    await screen.findByRole('combobox', { name: 'Alumno de la muestra' });
    expect(
      screen.getByRole('button', { name: 'Restaurar datos originales' }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Preparar estímulo insuficiente' }),
    );
    const link = await screen.findByRole('link', { name: /ver propuesta/i });
    expect(link).toHaveAttribute(
      'href',
      '/entrenador/rutinas/revisar/proposal',
    );
    expect(screen.getByText(/Propuesta pendiente/)).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: 'Restaurar datos originales' }),
    );
    expect(await screen.findByText(/Rutina original restaurada/)).toBeVisible();
    expect(
      screen.queryByRole('link', { name: /ver propuesta/i }),
    ).not.toBeInTheDocument();
    expect(
      fetch.mock.calls.filter(
        ([url, init]) =>
          String(url).endsWith('/restore') && init?.method === 'POST',
      ),
    ).toHaveLength(1);
  });

  it.each(['PROGRESION_ADECUADA', 'DATOS_INSUFICIENTES'] as const)(
    'explains why %s has no proposal',
    async (scenario) => {
      const result = {
        ...prepared,
        scenario,
        globalSituation: scenario,
        proposalId: null,
        proposalState: null,
        proposalStatus:
          scenario === 'DATOS_INSUFICIENTES'
            ? 'DATOS_INSUFICIENTES'
            : 'SIN_AJUSTES',
      };
      mockApi({
        [`GET ${path}`]: {
          body: {
            students: [
              {
                studentId,
                displayName: 'Alumno',
                hasCurrentRoutine: true,
                activeRun: result,
              },
            ],
          },
        },
      });
      renderPanel();
      expect(
        await screen.findByRole('link', { name: 'Ver diagnóstico del alumno' }),
      ).toHaveAttribute('href', `/entrenador/alumnos/${studentId}`);
      expect(
        screen.getByText(
          scenario === 'DATOS_INSUFICIENTES'
            ? /No se genera propuesta por falta de evidencia/
            : /No se necesitan ajustes/,
        ),
      ).toBeVisible();
      expect(
        screen.queryByRole('link', { name: /ver propuesta/i }),
      ).not.toBeInTheDocument();
    },
  );

  it('recovers an active preparation after reload and explains a failed case switch', async () => {
    mockApi({
      [`GET ${path}`]: {
        body: {
          students: [
            {
              studentId,
              displayName: 'Alumno',
              hasCurrentRoutine: true,
              activeRun: prepared,
            },
          ],
        },
      },
      [`POST ${path}/${studentId}`]: {
        status: 409,
        body: { error: 'demo_alternative_required' },
      },
    });
    renderPanel();
    expect(
      await screen.findByRole('link', { name: /ver propuesta/i }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: 'Preparar segundo estancamiento' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No hay una alternativa apta y habilitada',
    );
    expect(
      screen.getByRole('link', { name: /ver propuesta/i }),
    ).toHaveAttribute('href', '/entrenador/rutinas/revisar/proposal');
  });

  it('does not enable preparation for a student without a current routine', async () => {
    mockApi({
      [`GET ${path}`]: {
        body: {
          students: [
            {
              studentId,
              displayName: 'Sin rutina',
              hasCurrentRoutine: false,
              activeRun: null,
            },
          ],
        },
      },
    });
    renderPanel();
    await screen.findByRole('combobox');
    for (const button of screen.getAllByRole('button', { name: /^Preparar / }))
      expect(button).toBeDisabled();
  });

  it('shows the disabled deployment state and supports retrying', async () => {
    let available = false;
    mockApi({
      [`GET ${path}`]: () =>
        available
          ? { body: { students: [] } }
          : { status: 404, body: { error: 'adaptation_demo_disabled' } },
    });
    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El panel está deshabilitado',
    );
    available = true;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() =>
      expect(
        screen.getByText('No tenés alumnos activos asignados.'),
      ).toBeVisible(),
    );
  });
});

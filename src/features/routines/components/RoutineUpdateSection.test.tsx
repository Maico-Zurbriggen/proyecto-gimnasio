import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generationQueryKey } from '../hooks/useRoutineUpdate';
import { RoutineUpdateSection } from './RoutineUpdateSection';

const STUDENT_ID = '20000000-0000-4000-8000-000000000004';
const REQUEST_ID = '30000000-0000-4000-8000-000000000001';

function response(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function snapshot(status: string, extra: Record<string, unknown> = {}) {
  return {
    requestId: REQUEST_ID,
    status,
    estructuraCandidata: null,
    violaciones: null,
    error: null,
    ...extra,
  };
}

function renderSection(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <RoutineUpdateSection studentId={STUDENT_ID} />
    </QueryClientProvider>,
  );
}

function newQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

describe('RoutineUpdateSection', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('solicita una actualización y sigue la generación hasta el candidato', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(204, null))
      .mockResolvedValueOnce(
        response(202, { requestId: REQUEST_ID, status: 'queued' }),
      )
      .mockResolvedValueOnce(response(200, snapshot('PROCESANDO')))
      .mockResolvedValueOnce(
        response(
          200,
          snapshot('COMPLETADA', {
            estructuraCandidata: {
              routine_type: 'FUERZA',
              target_weekly_frequency: 3,
              days: [{}, {}, {}],
              explanation: 'Propuesta enfocada en fuerza básica.',
            },
          }),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = newQueryClient();
    renderSection(queryClient);

    fireEvent.change(
      await screen.findByLabelText('¿Qué querés cambiar de tu rutina?'),
      { target: { value: 'quiero ganar fuerza' } },
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Solicitar actualización' }),
    );

    await screen.findByText('Generándose');
    expect(
      window.localStorage.getItem(`routine-generations:active:${STUDENT_ID}`),
    ).toBe(REQUEST_ID);

    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: generationQueryKey(STUDENT_ID, REQUEST_ID),
      });
    });

    await screen.findByText(/Candidato listo/);
    expect(screen.getByText('Fuerza')).toBeInTheDocument();
    expect(screen.getByText('3 días por semana')).toBeInTheDocument();
    expect(screen.getByText('Pendiente de revisión')).toBeInTheDocument();
    expect(screen.getByText(/todavía no es tu rutina/i)).toBeInTheDocument();

    const postCall = vi
      .mocked(fetchMock)
      .mock.calls.find((call) => call[1]?.method === 'POST');
    expect(postCall?.[0]).toContain(
      `/students/${STUDENT_ID}/routine-generations`,
    );
    expect(postCall?.[1]).toMatchObject({ method: 'POST' });
  });

  it('muestra indisponibilidad y permite reintentar', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(204, null))
      .mockResolvedValueOnce(
        response(202, { requestId: REQUEST_ID, status: 'queued' }),
      )
      .mockResolvedValueOnce(
        response(200, snapshot('NO_DISPONIBLE', { error: 'llm_timeout' })),
      );
    vi.stubGlobal('fetch', fetchMock);
    renderSection(newQueryClient());

    fireEvent.change(
      await screen.findByLabelText('¿Qué querés cambiar de tu rutina?'),
      { target: { value: 'quiero ganar fuerza' } },
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Solicitar actualización' }),
    );

    await screen.findByText('No pudimos generar tu rutina');
    expect(screen.getByText(/tardó demasiado/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      screen.getByLabelText('¿Qué querés cambiar de tu rutina?'),
    ).toBeInTheDocument();
    expect(
      window.localStorage.getItem(`routine-generations:active:${STUDENT_ID}`),
    ).toBeNull();
  });

  it('recupera la generación activa tras recargar sin volver a solicitar', async () => {
    window.localStorage.setItem(
      `routine-generations:active:${STUDENT_ID}`,
      REQUEST_ID,
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response(200, snapshot('COMPLETADA')));
    vi.stubGlobal('fetch', fetchMock);
    renderSection(newQueryClient());

    await screen.findByText(/Candidato listo/);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchMock).mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
    });
  });

  it('recupera desde el servidor la última solicitud si se perdió localStorage', async () => {
    const completed = snapshot('COMPLETADA');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(200, completed))
      .mockResolvedValueOnce(response(200, completed));
    vi.stubGlobal('fetch', fetchMock);
    renderSection(newQueryClient());

    await screen.findByText(/Candidato listo/);

    expect(
      window.localStorage.getItem(`routine-generations:active:${STUDENT_ID}`),
    ).toBe(REQUEST_ID);
    expect(vi.mocked(fetchMock).mock.calls[0]?.[0]).toContain(
      `/students/${STUDENT_ID}/routine-generations/latest`,
    );
  });

  it('sigue una solicitud persistida aunque falle el dispatch inicial', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(204, null))
      .mockResolvedValueOnce(
        response(503, {
          error: 'ai_service_unavailable',
          requestId: REQUEST_ID,
          status: 'PENDIENTE',
        }),
      )
      .mockResolvedValueOnce(response(200, snapshot('COMPLETADA')));
    vi.stubGlobal('fetch', fetchMock);
    renderSection(newQueryClient());

    fireEvent.change(
      await screen.findByLabelText('¿Qué querés cambiar de tu rutina?'),
      { target: { value: 'quiero ganar fuerza' } },
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Solicitar actualización' }),
    );

    await screen.findByText(/Candidato listo/);
    expect(
      window.localStorage.getItem(`routine-generations:active:${STUDENT_ID}`),
    ).toBe(REQUEST_ID);
  });

  it('muestra un error si el dispatch falla sin una solicitud persistida recuperable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(204, null))
      .mockResolvedValue(response(503, { error: 'ai_service_unavailable' }));
    vi.stubGlobal('fetch', fetchMock);
    renderSection(newQueryClient());

    fireEvent.change(
      await screen.findByLabelText('¿Qué querés cambiar de tu rutina?'),
      { target: { value: 'quiero ganar fuerza' } },
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Solicitar actualización' }),
    );

    await screen.findByText('No pudimos enviar tu solicitud');
    expect(screen.getByText(/no está disponible/i)).toBeInTheDocument();
  });

  it('no envía la solicitud con el texto vacío', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(204, null));
    vi.stubGlobal('fetch', fetchMock);
    renderSection(newQueryClient());

    await screen.findByLabelText('¿Qué querés cambiar de tu rutina?');
    fireEvent.click(
      screen.getByRole('button', { name: 'Solicitar actualización' }),
    );

    expect(
      await screen.findByText('Escribí qué querés cambiar antes de enviar.'),
    ).toBeInTheDocument();
    expect(
      vi
        .mocked(fetchMock)
        .mock.calls.some((call) => call[1]?.method === 'POST'),
    ).toBe(false);
  });
});

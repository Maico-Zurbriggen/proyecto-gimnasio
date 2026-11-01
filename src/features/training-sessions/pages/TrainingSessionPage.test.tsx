import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { onlineManager } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '../../../../test/apiMocks';
import { readSessionDraft, writeSessionDraft } from '../lib/sessionDraft';
import { TrainingSessionPage } from './TrainingSessionPage';

const catalog = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('../../../api/catalog', () => ({
  listCatalog: catalog.list,
  getExercise: vi.fn(),
}));

const STUDENT_ID = '11111111-1111-4111-a111-111111111111';
const SESSION_ID = '22222222-2222-4222-a222-222222222222';

function activeSession() {
  return {
    id: SESSION_ID,
    studentId: STUDENT_ID,
    routineId: '44444444-4444-4444-a444-444444444444',
    routineVersionId: '55555555-5555-4555-a555-555555555555',
    routineDayId: '33333333-3333-4333-a333-333333333333',
    routineDayName: 'Día 1',
    routineDayPosition: 1,
    state: 'EN_CURSO',
    startedAt: new Date().toISOString(),
    completedAt: null,
    occurredOn: '2026-09-08',
    lastActivityAt: new Date().toISOString(),
    aptitudeWarning: null,
    compatibilityWarnings: [],
    setRecords: [
      {
        position: 1,
        prescribedExerciseId: '66666666-6666-4666-a666-666666666666',
        prescribedExerciseName: 'Sentadilla',
        performedExerciseId: null,
        performedExerciseName: null,
        prescribedMinRepetitions: 6,
        prescribedMaxRepetitions: 12,
        prescribedLoad: 20,
        warmup: false,
        performedLoad: null,
        performedRepetitions: null,
        perceivedEffort: null,
        completed: false,
        additional: false,
        omissionReason: null,
        atypicalConfirmed: false,
      },
    ],
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TrainingSessionPage studentId={STUDENT_ID} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Vacía microtareas y temporizadores pendientes (queries bajo fake timers). */
async function flushQueries() {
  await act(async () => {
    for (let i = 0; i < 20; i += 1) {
      vi.advanceTimersByTime(0);
      await Promise.resolve();
    }
  });
}

function renderPageWithSession() {
  mockApi({
    'GET /training-sessions/active': { body: activeSession() },
  });
  return renderPage();
}

const DAY_ID = '33333333-3333-4333-a333-333333333333';
const preloadRoute = {
  [`GET /students/${STUDENT_ID}/routine-days/${DAY_ID}/set-preload`]: {
    body: {
      studentId: STUDENT_ID,
      routineDayId: DAY_ID,
      calculadoEl: '2026-09-08T10:00:00.000Z',
      series: [
        {
          position: 1,
          exerciseId: '66666666-6666-4666-a666-666666666666',
          repeticionesMinimas: 6,
          repeticionesMaximas: 12,
          warmup: false,
          carga: 12,
          repeticiones: 10,
          origen: 'CARGA_SUGERIDA',
          antiguedadEnDias: null,
        },
      ],
    },
  },
};

describe('TrainingSessionPage (RF-027, FL-05, FL-07)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('ofrece iniciar cuando no hay sesión en curso (T2)', async () => {
    mockApi({
      'GET /training-sessions/active': {
        status: 404,
        body: { error: 'training_session_not_found' },
      },
    });
    renderPage();

    expect(
      await screen.findByRole('button', { name: /iniciar sesión/i }),
    ).toBeInTheDocument();
  });

  it('reanuda en el punto exacto y permite pausar localmente (FL-07, CB-25)', async () => {
    mockApi({ 'GET /training-sessions/active': { body: activeSession() } });
    renderPage();

    expect(
      await screen.findByText(/serie 1 · sentadilla/i),
    ).toBeInTheDocument();

    const pause = await screen.findByRole('button', { name: /pausar/i });
    fireEvent.click(pause);
    expect(
      await screen.findByRole('button', { name: /reanudar/i }),
    ).toBeInTheDocument();
  });

  it('muestra reintentar ante error de consulta (RNF-10)', async () => {
    mockApi({
      'GET /training-sessions/active': {
        status: 500,
        body: { error: 'internal_server_error' },
      },
    });
    renderPage();

    expect(
      await screen.findByRole('button', { name: /reintentar/i }),
    ).toBeInTheDocument();
  });

  it('valida rangos antes de enviar y no llama al backend (RN-55)', async () => {
    const fetchMock = mockApi({
      'GET /training-sessions/active': { body: activeSession() },
    });
    renderPage();

    expect(
      await screen.findByText(/serie 1 · sentadilla/i),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/carga de la serie 1/i), {
      target: { value: '5000' },
    });
    // Al salir del campo se intenta guardar: la validación local lo frena.
    fireEvent.blur(screen.getByLabelText(/carga de la serie 1/i));

    expect(await screen.findByText(/entre 0 y 1000/i)).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes('/records/')),
    ).toBe(false);
  });

  it('muestra el detalle del backend en vez del código seco', async () => {
    const session = activeSession();
    mockApi({
      'GET /training-sessions/active': { body: session },
      [`PATCH /students/${STUDENT_ID}/training-sessions/${SESSION_ID}/records/1`]:
        {
          status: 400,
          body: {
            error: 'invalid_request_body',
            details: {
              fieldErrors: {
                performedLoad: ['la carga debe estar entre 0 y 1000 kg'],
              },
              formErrors: [],
            },
          },
        },
    });
    renderPage();

    expect(
      await screen.findByText(/serie 1 · sentadilla/i),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/carga de la serie 1/i), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByLabelText(/repeticiones de la serie 1/i), {
      target: { value: '10' },
    });
    fireEvent.blur(screen.getByLabelText(/repeticiones de la serie 1/i));

    expect(
      await screen.findByText(/la carga debe estar entre 0 y 1000 kg/i),
    ).toBeInTheDocument();
  });

  it('finaliza la sesión como COMPLETADA (T3)', async () => {
    const session = activeSession();
    let finished = false;
    mockApi({
      'GET /training-sessions/active': () =>
        finished
          ? { status: 404, body: { error: 'training_session_not_found' } }
          : { body: session },
      [`POST /students/${STUDENT_ID}/training-sessions/${SESSION_ID}/finish`]:
        () => {
          finished = true;
          return {
            body: {
              ...session,
              state: 'COMPLETADA',
              completedAt: new Date().toISOString(),
            },
          };
        },
    });
    renderPage();

    const finish = await screen.findByRole('button', { name: /finalizar/i });
    fireEvent.click(finish);

    await waitFor(() => {
      expect(screen.getByText(/sesión completada/i)).toBeInTheDocument();
    });
  });

  it('no envía `position` en el cuerpo del registro (schema estricto)', async () => {
    const session = activeSession();
    let sentBody: Record<string, unknown> | null = null;
    mockApi({
      'GET /training-sessions/active': { body: session },
      [`PATCH /students/${STUDENT_ID}/training-sessions/${SESSION_ID}/records/1`]:
        (init) => {
          sentBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
          return { body: session };
        },
    });
    renderPage();

    expect(
      await screen.findByText(/serie 1 · sentadilla/i),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/carga de la serie 1/i), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByLabelText(/repeticiones de la serie 1/i), {
      target: { value: '10' },
    });
    fireEvent.blur(screen.getByLabelText(/repeticiones de la serie 1/i));

    await waitFor(() => {
      expect(sentBody).not.toBeNull();
    });
    expect(sentBody).not.toHaveProperty('position');
    expect(sentBody).toMatchObject({
      performedLoad: 20,
      performedRepetitions: 10,
      completed: true,
    });
  });

  it('guarda automáticamente sin botón: debounce y aviso de guardado', async () => {
    vi.useFakeTimers();
    try {
      const session = activeSession();
      let calls = 0;
      mockApi({
        'GET /training-sessions/active': { body: session },
        [`PATCH /students/${STUDENT_ID}/training-sessions/${SESSION_ID}/records/1`]:
          () => {
            calls += 1;
            return {
              body: {
                ...session,
                setRecords: session.setRecords.map((record) =>
                  record.position === 1
                    ? {
                        ...record,
                        performedLoad: 20,
                        performedRepetitions: 10,
                        completed: true,
                      }
                    : record,
                ),
              },
            };
          },
      });
      renderPage();

      await act(async () => {
        for (let i = 0; i < 20; i += 1) {
          vi.advanceTimersByTime(0);
          await Promise.resolve();
        }
      });

      // Sin botón de guardado manual.
      expect(
        screen.queryByRole('button', { name: /guardar serie/i }),
      ).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/carga de la serie 1/i), {
        target: { value: '20' },
      });
      fireEvent.change(screen.getByLabelText(/repeticiones de la serie 1/i), {
        target: { value: '10' },
      });
      // Todavía no: el debounce espera 700 ms.
      expect(calls).toBe(0);

      await act(async () => {
        vi.advanceTimersByTime(800);
      });
      await act(async () => {
        for (let i = 0; i < 20; i += 1) {
          vi.advanceTimersByTime(0);
          await Promise.resolve();
        }
      });

      expect(calls).toBe(1);
      expect(screen.getByText(/guardado ✓/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('criterio 6: tras agotar los reintentos avisa que quedó pendiente de sincronizar', async () => {
    vi.useFakeTimers();
    try {
      // La red del gimnasio se cae: el autoguardado agota sus reintentos.
      mockApi({
        'GET /training-sessions/active': { body: activeSession() },
        [`PATCH /students/${STUDENT_ID}/training-sessions/${SESSION_ID}/records/1`]:
          () => ({ status: 503, body: { error: 'service_unavailable' } }),
      });
      renderPage();

      await act(async () => {
        for (let i = 0; i < 20; i += 1) {
          vi.advanceTimersByTime(0);
          await Promise.resolve();
        }
      });

      fireEvent.change(screen.getByLabelText(/carga de la serie 1/i), {
        target: { value: '20' },
      });
      fireEvent.change(screen.getByLabelText(/repeticiones de la serie 1/i), {
        target: { value: '10' },
      });

      // Debounce + los reintentos del autoguardado (500 ms entre cada uno).
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      await act(async () => {
        for (let i = 0; i < 40; i += 1) {
          vi.advanceTimersByTime(600);
          await Promise.resolve();
        }
      });

      // Lo importante: el alumno se entera de que su serie no llegó, y el
      // mensaje le dice que está guardada, no que se perdió.
      expect(screen.getByText(/pendiente de sincronizar/i)).toBeInTheDocument();
      expect(
        screen.getByText(/guardamos 1 serie en este dispositivo/i),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('sin conexión muestra "pendiente de sincronizar" y lo quita al confirmarse', async () => {
    const fetchMock = mockApi({
      'GET /training-sessions/active': { body: activeSession() },
      ...preloadRoute,
      [`PATCH /students/${STUDENT_ID}/training-sessions/${SESSION_ID}/records/1`]:
        () => ({ body: activeSession() }),
    });
    try {
      renderPage();
      const reps = await screen.findByLabelText(/repeticiones de la serie 1/i);
      act(() => onlineManager.setOnline(false));
      fireEvent.change(reps, { target: { value: '7' } });
      expect(
        await screen.findByText(
          /guardamos 1 serie en este dispositivo/i,
          {},
          { timeout: 3000 },
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText(/guardando…/i)).not.toBeInTheDocument();
      act(() => onlineManager.setOnline(true));
      await waitFor(() => {
        expect(
          screen.queryByText(/guardamos 1 serie en este dispositivo/i),
        ).not.toBeInTheDocument();
      });
      expect(
        fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH'),
      ).toHaveLength(1);
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('editar una serie omitida la reactiva con omissionReason null', async () => {
    const session = { ...activeSession() };
    session.setRecords = [
      { ...session.setRecords[0]!, omissionReason: 'Máquina ocupada' },
    ] as unknown as typeof session.setRecords;
    const fetchMock = mockApi({
      'GET /training-sessions/active': { body: session },
      ...preloadRoute,
      [`PATCH /students/${STUDENT_ID}/training-sessions/${SESSION_ID}/records/1`]:
        () => ({ body: session }),
    });
    renderPage();
    fireEvent.change(
      await screen.findByLabelText(/repeticiones de la serie 1/i),
      {
        target: { value: '7' },
      },
    );
    await waitFor(
      () => {
        expect(
          fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH'),
        ).toHaveLength(1);
      },
      { timeout: 3000 },
    );
    const call = fetchMock.mock.calls.find(([, i]) => i?.method === 'PATCH');
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      completed: true,
      omissionReason: null,
    });
  });

  it('conserva lo tipeado sin enviar ante una recarga (RNF-10)', async () => {
    const { unmount } = renderPageWithSession();
    expect(
      await screen.findByText(/serie 1 · sentadilla/i),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/carga de la serie 1/i), {
      target: { value: '20' },
    });

    // Sin blur ni debounce vencido: nada se envió, pero el borrador lo tiene.
    expect(
      readSessionDraft(STUDENT_ID, SESSION_ID)?.values[1]?.performedLoad,
    ).toBe(20);

    // Simula recarga: el valor pendiente se fusiona sobre el servidor.
    unmount();
    renderPage();
    expect(
      await screen.findByText(/serie 1 · sentadilla/i),
    ).toBeInTheDocument();
    expect(
      (screen.getByLabelText(/carga de la serie 1/i) as HTMLInputElement).value,
    ).toBe('20');
  });

  it('reintenta el envío ante un fallo de red (RNF-10)', async () => {
    vi.useFakeTimers();
    try {
      const session = activeSession();
      let calls = 0;
      mockApi({
        'GET /training-sessions/active': { body: session },
        [`PATCH /students/${STUDENT_ID}/training-sessions/${SESSION_ID}/records/1`]:
          () => {
            calls += 1;
            if (calls === 1) {
              return { status: 502, body: { error: 'bad_gateway' } };
            }
            return {
              body: {
                ...session,
                setRecords: session.setRecords.map((record) =>
                  record.position === 1
                    ? {
                        ...record,
                        performedLoad: 20,
                        performedRepetitions: 10,
                        completed: true,
                      }
                    : record,
                ),
              },
            };
          },
      });
      renderPage();
      await flushQueries();

      fireEvent.change(screen.getByLabelText(/carga de la serie 1/i), {
        target: { value: '20' },
      });
      fireEvent.change(screen.getByLabelText(/repeticiones de la serie 1/i), {
        target: { value: '10' },
      });
      fireEvent.blur(screen.getByLabelText(/repeticiones de la serie 1/i));
      await flushQueries();
      expect(calls).toBe(1);
      // Lo tipeado persiste aunque falle el envío.
      expect(
        readSessionDraft(STUDENT_ID, SESSION_ID)?.values[1]?.performedLoad,
      ).toBe(20);

      await act(async () => {
        vi.advanceTimersByTime(600);
      });
      await flushQueries();

      expect(calls).toBe(2);
      expect(screen.getByText(/guardado ✓/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('el contador late cada segundo y se congela en pausa (tiempo real)', async () => {
    vi.useFakeTimers();
    const sysNow = new Date('2026-09-08T10:00:00.000Z');
    vi.setSystemTime(sysNow);
    try {
      const startedAt = new Date(sysNow.getTime() - 90_000).toISOString();
      mockApi({
        'GET /training-sessions/active': {
          body: { ...activeSession(), startedAt },
        },
      });
      renderPage();

      // Deja resolver la query: alterna microtareas con los diferidos que
      // React Query programa por temporizador (el reloj simulado no avanza).
      await act(async () => {
        for (let i = 0; i < 20; i += 1) {
          vi.advanceTimersByTime(0);
          await Promise.resolve();
        }
      });

      const timer = screen.getByRole('timer');
      expect(timer).toHaveTextContent('1 min 30 s');

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(timer).toHaveTextContent('1 min 35 s');

      fireEvent.click(screen.getByRole('button', { name: /pausar/i }));
      expect(timer).toHaveTextContent(/en pausa/);
      const frozen = timer.textContent;

      await act(async () => {
        vi.advanceTimersByTime(10_000);
      });
      // Congelado: el tramo en pausa no suma.
      expect(timer.textContent).toBe(frozen);
    } finally {
      vi.useRealTimers();
    }
  });

  describe('HU22: precarga y acciones por serie', () => {
    const RECORDS = `/students/${STUDENT_ID}/training-sessions/${SESSION_ID}/records`;
    const patchCalls = (fetchMock: ReturnType<typeof mockApi>) =>
      fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH');

    it('muestra la carga y reps precargadas con su procedencia, sin guardar solas', async () => {
      const fetchMock = mockApi({
        'GET /training-sessions/active': { body: activeSession() },
        ...preloadRoute,
      });
      renderPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/carga de la serie 1/i)).toHaveValue(12);
      });
      expect(screen.getByLabelText(/repeticiones de la serie 1/i)).toHaveValue(
        10,
      );
      expect(
        screen.getByText(/carga sugerida de tu rutina/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/serie actual/i)).toBeInTheDocument();
      await new Promise((resolve) => setTimeout(resolve, 900));
      expect(patchCalls(fetchMock)).toHaveLength(0);
    });

    it('lo escrito en el borrador manda sobre la precarga', async () => {
      writeSessionDraft({
        sessionId: SESSION_ID,
        studentId: STUDENT_ID,
        updatedAt: new Date().toISOString(),
        paused: false,
        values: {
          1: {
            performedLoad: 30,
            performedRepetitions: null,
            perceivedEffort: null,
            completed: true,
          },
        },
      });
      mockApi({
        'GET /training-sessions/active': { body: activeSession() },
        ...preloadRoute,
      });
      renderPage();

      await screen.findByLabelText(/carga de la serie 1/i);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(screen.getByLabelText(/carga de la serie 1/i)).toHaveValue(30);
      expect(screen.getByLabelText(/repeticiones de la serie 1/i)).toHaveValue(
        null,
      );
    });

    it('completa la serie en un toque con los valores precargados y no duplica', async () => {
      const session = activeSession();
      const fetchMock = mockApi({
        'GET /training-sessions/active': { body: session },
        ...preloadRoute,
        [`PATCH ${RECORDS}/1`]: () => ({ body: session }),
      });
      renderPage();
      await waitFor(() => {
        expect(screen.getByLabelText(/carga de la serie 1/i)).toHaveValue(12);
      });

      const button = screen.getByRole('button', { name: /completar serie/i });
      fireEvent.click(button);
      fireEvent.click(button);

      await waitFor(() => {
        expect(patchCalls(fetchMock)).toHaveLength(1);
      });
      expect(
        JSON.parse(String(patchCalls(fetchMock)[0]?.[1]?.body)),
      ).toMatchObject({
        performedLoad: 12,
        performedRepetitions: 10,
        completed: true,
      });
    });

    it('omite la serie con motivo', async () => {
      const session = activeSession();
      const fetchMock = mockApi({
        'GET /training-sessions/active': { body: session },
        [`PATCH ${RECORDS}/1`]: () => ({ body: session }),
      });
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: /^omitir$/i }));
      fireEvent.change(screen.getByLabelText(/motivo de omisión/i), {
        target: { value: 'Máquina ocupada' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: /confirmar omisión/i }),
      );

      await waitFor(() => {
        expect(patchCalls(fetchMock)).toHaveLength(1);
      });
      expect(
        JSON.parse(String(patchCalls(fetchMock)[0]?.[1]?.body)),
      ).toMatchObject({ omissionReason: 'Máquina ocupada', completed: false });
    });

    it('agrega una serie adicional con el ejercicio de la última serie por defecto', async () => {
      catalog.list.mockResolvedValue({ items: [] });
      const session = activeSession();
      const fetchMock = mockApi({
        'GET /training-sessions/active': { body: session },
        [`PATCH ${RECORDS}/2`]: () => ({ body: session }),
      });
      renderPage();
      fireEvent.click(
        await screen.findByRole('button', { name: /agregar serie/i }),
      );
      fireEvent.click(
        await screen.findByRole('button', {
          name: /mismo ejercicio que la última serie/i,
        }),
      );

      await waitFor(() => {
        expect(patchCalls(fetchMock)).toHaveLength(1);
      });
      expect(
        JSON.parse(String(patchCalls(fetchMock)[0]?.[1]?.body)),
      ).toMatchObject({
        additional: true,
        performedExerciseId: '66666666-6666-4666-a666-666666666666',
        performedWarmup: false,
      });
    });

    it('permite elegir otro ejercicio para la serie adicional', async () => {
      const session = activeSession();
      const OTHER = '77777777-7777-4777-a777-777777777777';
      catalog.list.mockResolvedValue({
        items: [{ id: OTHER, name: 'Press militar' }],
      });
      const fetchMock = mockApi({
        'GET /training-sessions/active': { body: session },
        [`PATCH ${RECORDS}/2`]: () => ({ body: session }),
      });
      renderPage();
      fireEvent.click(
        await screen.findByRole('button', { name: /agregar serie/i }),
      );
      fireEvent.click(
        await screen.findByRole('button', { name: 'Press militar' }),
      );

      await waitFor(() => {
        expect(patchCalls(fetchMock)).toHaveLength(1);
      });
      expect(
        JSON.parse(String(patchCalls(fetchMock)[0]?.[1]?.body)),
      ).toMatchObject({ additional: true, performedExerciseId: OTHER });
    });
  });
});

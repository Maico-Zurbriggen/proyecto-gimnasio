import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearActiveGenerationId,
  loadActiveGenerationId,
  saveActiveGenerationId,
  useGenerationStatus,
} from './useRoutineUpdate';

const STUDENT_ID = 'student-1';
const REQUEST_ID = 'request-1';

function response(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function snapshot(status: string) {
  return {
    requestId: REQUEST_ID,
    status,
    estructuraCandidata: null,
    violaciones: null,
    error: null,
  };
}

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function newQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

describe('useRoutineUpdate storage', () => {
  it('conserva y limpia el identificador de la generación activa', () => {
    window.localStorage.clear();

    expect(loadActiveGenerationId(STUDENT_ID)).toBeNull();
    saveActiveGenerationId(STUDENT_ID, REQUEST_ID);
    expect(loadActiveGenerationId(STUDENT_ID)).toBe(REQUEST_ID);
    clearActiveGenerationId(STUDENT_ID);
    expect(loadActiveGenerationId(STUDENT_ID)).toBeNull();
  });
});

describe('useGenerationStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('consulta por polling hasta el estado terminal y ahí se detiene', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(200, snapshot('PENDIENTE')))
      .mockResolvedValueOnce(response(200, snapshot('PROCESANDO')))
      .mockResolvedValue(response(200, snapshot('COMPLETADA')));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(
      () => useGenerationStatus(STUDENT_ID, REQUEST_ID, 30),
      { wrapper: wrapper(newQueryClient()) },
    );

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    expect(result.current.data?.status).toBe('COMPLETADA');

    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('no consulta sin identificador de solicitud', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useGenerationStatus(STUDENT_ID, null, 30), {
      wrapper: wrapper(newQueryClient()),
    });

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

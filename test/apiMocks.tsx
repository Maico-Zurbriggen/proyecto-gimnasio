import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

export interface MockResponse {
  status?: number;
  body: unknown;
}

type Handler = (init: RequestInit | undefined) => MockResponse;

/**
 * Reemplaza `fetch` y responde según "MÉTODO /ruta" (sin query string). Lo que
 * no está declarado responde 404, así un test nunca sale a la red.
 */
export function mockApi(routes: Record<string, MockResponse | Handler>) {
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${new URL(input).pathname}`;
    const route = routes[key];
    const response =
      typeof route === 'function'
        ? route(init)
        : (route ?? { status: 404, body: { error: 'not_mocked' } });
    const status = response.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => response.body,
    };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Renderiza una ruta con React Query (sin reintentos) y el router en memoria. */
export function renderRoute(path: string, url: string, element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={path} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

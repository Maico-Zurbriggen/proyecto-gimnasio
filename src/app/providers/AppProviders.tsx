import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { ApiError } from '../../api/client';
import {
  SessionProvider,
  sessionQueryKey,
} from '../../features/auth/hooks/useSession';

function createQueryClient() {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      /**
       * Sesión expirada o revocada (HU07-T7): cualquier consulta que vuelva 401
       * invalida la identidad cacheada, y la guarda de rutas redirige al login.
       * Sin esto, una sesión vencida a mitad de uso dejaría la app mostrando
       * datos viejos en lugar de pedir volver a entrar.
       */
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          client.setQueryData(sessionQueryKey, null);
        }
      },
    }),
    defaultOptions: {
      queries: {
        // Un 4xx no se arregla reintentando (sin rutina, sin permiso, etc.).
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) &&
          failureCount < 2,
      },
    },
  });

  return client;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { ApiError } from '../../api/client';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Un 4xx no se arregla reintentando (sin rutina, sin permiso, etc.).
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) &&
          failureCount < 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

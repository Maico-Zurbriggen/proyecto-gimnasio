import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, type ReactNode } from 'react';

import { ApiError } from '../../../api/client';
import {
  fetchSession,
  login as loginRequest,
  logout as logoutRequest,
  type AuthenticatedUser,
  type LoginInput,
} from '../../../api/auth';

export const sessionQueryKey = ['session'] as const;

export interface SessionContextValue {
  user: AuthenticatedUser | null;
  /** `true` mientras se resuelve la sesión inicial. */
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Estado de sesión de la aplicación (HU07-T2, T7 y T8).
 *
 * La identidad vive en una cookie httpOnly que el navegador manda sola: el
 * frontend no guarda el token ni puede leerlo (RNF-16). Lo que se cachea acá es
 * la respuesta de `GET /auth/me`, para saber si hay sesión y con qué roles.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: sessionQueryKey,
    queryFn: ({ signal }) => fetchSession(signal),
    // Un 401 es la respuesta normal de "no hay sesión", no un fallo a reintentar.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status < 500) && failureCount < 2,
    staleTime: 5 * 60 * 1000,
  });

  const login = useCallback(
    async (input: LoginInput) => {
      const result = await loginRequest(input);
      queryClient.setQueryData(sessionQueryKey, result.user);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      // La sesión local se limpia aunque el backend no responda: quedarse
      // "adentro" tras pedir salir es peor que un cierre no registrado.
      queryClient.setQueryData(sessionQueryKey, null);
      queryClient.clear();
    }
  }, [queryClient]);

  return (
    <SessionContext.Provider
      value={{ user: data ?? null, loading: isLoading, login, logout }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession debe usarse dentro de <SessionProvider>');
  }
  return context;
}

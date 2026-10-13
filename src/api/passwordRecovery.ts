import { apiPost } from './client';

/**
 * Recuperación y cambio de contraseña (HU09). Escrito a mano hasta que el
 * backend publique el cliente generado.
 */

/**
 * `POST /auth/password-recovery`: siempre responde lo mismo, exista o no el
 * correo; sólo distingue el límite de dos pedidos por día (429).
 */
export async function requestPasswordRecovery(email: string): Promise<void> {
  await apiPost('/auth/password-recovery', { email });
}

/** `POST /auth/password-reset`: nueva contraseña con el token del enlace. */
export async function resetPassword(
  token: string,
  password: string,
): Promise<void> {
  await apiPost('/auth/password-reset', { token, password });
}

/** `POST /auth/password-change`: cambio con sesión; revoca las demás. */
export async function changePassword(password: string): Promise<void> {
  await apiPost('/auth/password-change', { password });
}

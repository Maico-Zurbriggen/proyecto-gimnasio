/**
 * Nombre y correo visibles de quien está en la cuenta.
 *
 * `GET /auth/me` sólo devuelve id, gimnasio y roles, así que el frontend
 * recuerda lo que el propio usuario tipeó (correo al ingresar, nombre al
 * completar la invitación). Se guarda atado al id para no mostrar datos de
 * otra cuenta que haya usado el mismo navegador.
 */
const STORAGE_KEY = 'vivaz_identity';

export interface StoredIdentity {
  userId: string;
  email?: string;
  name?: string;
}

export function readIdentity(userId: string): StoredIdentity | null {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null',
    ) as StoredIdentity | null;
    return parsed?.userId === userId ? parsed : null;
  } catch {
    return null;
  }
}

export function rememberIdentity(identity: StoredIdentity): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...readIdentity(identity.userId), ...identity }),
    );
  } catch {
    // Sin storage (modo privado) se cae al rol: no vale la pena fallar.
  }
}

export function forgetIdentity(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Idem: sin storage no hay nada que borrar.
  }
}

/** Dos iniciales en mayúscula: "Ana María Pérez" → "AM", "juan.perez@x.com" → "JP". */
export function initialsOf(text: string): string {
  const words = (text.split('@')[0] ?? '').split(/[\s._-]+/).filter(Boolean);
  const [first = '', second = ''] = words;
  return (
    second ? first.charAt(0) + second.charAt(0) : first.slice(0, 2)
  ).toUpperCase();
}

/**
 * Nombre legible a partir del correo, para cuentas cuyo nombre real no se
 * conoce todavía: "juan.perez@gym.com" → "Juan Perez".
 */
export function nameFromEmail(email: string): string {
  return (email.split('@')[0] ?? '')
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

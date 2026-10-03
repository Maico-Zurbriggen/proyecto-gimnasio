/** Devuelve la fecha truncada a medianoche local, usada como clave de "día calendario". */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Formatea una fecha como clave estable `YYYY-MM-DD` (para claves de storage, no para mostrar). */
export function toDateKey(date: Date): string {
  const day = startOfDay(date);
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(day.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
}

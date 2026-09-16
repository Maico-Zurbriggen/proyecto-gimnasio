/** `HIPERTROFIA` → `Hipertrofia`, `RESISTENCIA_MUSCULAR` → `Resistencia muscular`. */
export function humanizeEnum(value: string): string {
  const text = value.toLowerCase().replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * `YYYY-MM-DD` o ISO a `dd/mm/aaaa`. Las fechas sin hora se interpretan en UTC
 * para que no se corran un día por la zona horaria local.
 */
export function formatDate(value: string): string {
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return date.toLocaleDateString('es-AR', { timeZone: 'UTC' });
}

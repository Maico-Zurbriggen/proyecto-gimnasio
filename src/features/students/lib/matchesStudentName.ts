/** Sin mayúsculas ni tildes, para que "jose" encuentre a "José". */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Búsqueda por nombre de la cartera; una consulta vacía no filtra. */
export function matchesStudentName(name: string, query: string): boolean {
  return normalize(name).includes(normalize(query));
}

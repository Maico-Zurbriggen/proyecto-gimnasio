import { describe, expect, it } from 'vitest';

import { matchesStudentName } from './matchesStudentName';

describe('matchesStudentName', () => {
  it('ignora mayúsculas, tildes y espacios de borde', () => {
    expect(matchesStudentName('José Pérez', '  jose pe')).toBe(true);
    expect(matchesStudentName('Sofía Ruiz', 'RUIZ')).toBe(true);
    expect(matchesStudentName('Sofía Ruiz', 'diego')).toBe(false);
  });

  it('no filtra con una consulta vacía', () => {
    expect(matchesStudentName('Diego', '')).toBe(true);
  });
});

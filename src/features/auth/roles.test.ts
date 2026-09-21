import { describe, expect, it } from 'vitest';

import { availableAppRoles, canAccessPath, homeForRoles } from './roles';

describe('auth role navigation', () => {
  it('exposes only the areas granted by the backend session', () => {
    expect(availableAppRoles(['ALUMNO']).map((role) => role.appRole)).toEqual([
      'alumno',
    ]);
    expect(
      availableAppRoles(['ALUMNO', 'ENTRENADOR']).map((role) => role.appRole),
    ).toEqual(['alumno', 'entrenador']);
  });

  it('uses the trainer area as the default for a trainer/student user', () => {
    expect(homeForRoles(['ALUMNO', 'ENTRENADOR'])).toBe('/entrenador');
    expect(homeForRoles(['ADMINISTRADOR'])).toBe('/admin');
    expect(homeForRoles([])).toBe('/sin-acceso');
  });

  it('rejects paths from roles not present in the session', () => {
    expect(canAccessPath('/alumno/rutina', ['ALUMNO'])).toBe(true);
    expect(canAccessPath('/entrenador/alumnos', ['ALUMNO'])).toBe(false);
    expect(canAccessPath('/entrenador/alumnos', ['ALUMNO', 'ENTRENADOR'])).toBe(
      true,
    );
    expect(canAccessPath('/admin/usuarios', ['ENTRENADOR'])).toBe(false);
  });
});

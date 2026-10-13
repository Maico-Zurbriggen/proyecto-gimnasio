import { describe, expect, it } from 'vitest';

import {
  evaluatePasswordRequirements,
  isPasswordStrong,
} from './passwordStrength';

describe('passwordStrength (HU06 - T4)', () => {
  it('marca los cuatro requisitos cumplidos con una contraseña válida', () => {
    const requirements = evaluatePasswordRequirements('ClaveSegura2026');

    expect(requirements.every((requirement) => requirement.passed)).toBe(true);
    expect(isPasswordStrong('ClaveSegura2026')).toBe(true);
  });

  it('señala exactamente qué falta, sin cortar en el primer incumplimiento', () => {
    const requirements = evaluatePasswordRequirements('abc');

    expect(
      requirements
        .filter((requirement) => !requirement.passed)
        .map((r) => r.id),
    ).toEqual(['min-length', 'uppercase', 'number']);
  });

  it('una contraseña larga sin mayúscula ni número no es fuerte', () => {
    expect(isPasswordStrong('passwordfacil')).toBe(false);
  });

  it('la cadena vacía no cumple ningún requisito de composición', () => {
    const requirements = evaluatePasswordRequirements('');

    expect(requirements.some((requirement) => requirement.passed)).toBe(false);
  });
});

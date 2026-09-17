import { describe, expect, it } from 'vitest';

import {
  evaluatePasswordRequirements,
  isPasswordStrong,
} from './passwordStrength';

describe('passwordStrength utility (HU06 - T4)', () => {
  it('detecta correctamente los requisitos incumplidos', () => {
    const reqs = evaluatePasswordRequirements('abc');

    const minLen = reqs.find((r) => r.id === 'min-length');
    const upper = reqs.find((r) => r.id === 'uppercase');
    const lower = reqs.find((r) => r.id === 'lowercase');
    const num = reqs.find((r) => r.id === 'number');

    expect(minLen?.passed).toBe(false);
    expect(upper?.passed).toBe(false);
    expect(lower?.passed).toBe(true);
    expect(num?.passed).toBe(false);

    expect(isPasswordStrong('abc')).toBe(false);
  });

  it('detecta una contraseña completa y fuerte', () => {
    const strong = 'SuperPassword2026';
    const reqs = evaluatePasswordRequirements(strong);

    expect(reqs.every((r) => r.passed)).toBe(true);
    expect(isPasswordStrong(strong)).toBe(true);
  });

  it('falla si falta mayúscula', () => {
    expect(isPasswordStrong('password123')).toBe(false);
  });

  it('falla si falta número', () => {
    expect(isPasswordStrong('PasswordSinNumero')).toBe(false);
  });

  it('falla si tiene menos de 8 caracteres aunque tenga mayúscula y número', () => {
    expect(isPasswordStrong('Aa1!')).toBe(false);
  });
});

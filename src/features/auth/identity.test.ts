import { beforeEach, describe, expect, it } from 'vitest';

import {
  forgetIdentity,
  initialsOf,
  nameFromEmail,
  readIdentity,
  rememberIdentity,
} from './identity';

describe('identity', () => {
  beforeEach(() => localStorage.clear());

  it('sólo devuelve la identidad del mismo usuario y combina datos', () => {
    rememberIdentity({ userId: 'u1', email: 'ana@gym.com' });
    rememberIdentity({ userId: 'u1', name: 'Ana Pérez' });
    expect(readIdentity('u1')).toEqual({
      userId: 'u1',
      email: 'ana@gym.com',
      name: 'Ana Pérez',
    });
    expect(readIdentity('u2')).toBeNull();
    forgetIdentity();
    expect(readIdentity('u1')).toBeNull();
  });

  it('calcula iniciales de nombres y correos', () => {
    expect(initialsOf('Ana María Pérez')).toBe('AM');
    expect(initialsOf('juan.perez@gym.com')).toBe('JP');
    expect(initialsOf('admin@gym.com')).toBe('AD');
  });

  it('arma un nombre legible desde el correo', () => {
    expect(nameFromEmail('juan.perez@gym.com')).toBe('Juan Perez');
    expect(nameFromEmail('admin@gym.com')).toBe('Admin');
  });
});

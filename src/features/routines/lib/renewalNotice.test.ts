import { describe, expect, it } from 'vitest';

import { debeMostrarAviso, esDescartable } from './renewalNotice';

describe('debeMostrarAviso', () => {
  it('oculta el aviso cuando faltan más de 7 días (8 días antes no aparece)', () => {
    expect(debeMostrarAviso(8)).toBe(false);
  });

  it('muestra el aviso cuando faltan 7 días o menos', () => {
    expect(debeMostrarAviso(7)).toBe(true);
    expect(debeMostrarAviso(1)).toBe(true);
  });

  it('lo sigue mostrando el día del vencimiento y una vez vencido', () => {
    expect(debeMostrarAviso(0)).toBe(true);
    expect(debeMostrarAviso(-30)).toBe(true);
  });
});

describe('esDescartable', () => {
  it('permite descartar los estados pendiente y cerrado hoy del backend', () => {
    expect(esDescartable('pendiente')).toBe(true);
    expect(esDescartable('cerrado hoy')).toBe(true);
  });

  it('no permite descartar un aviso vencido', () => {
    expect(esDescartable('vencido')).toBe(false);
  });
});

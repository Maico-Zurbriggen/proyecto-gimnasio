import { describe, expect, it } from 'vitest';

import { calcularEstadoAvisoRenovacion, esDescartable } from './renewalNotice';

describe('calcularEstadoAvisoRenovacion', () => {
  it('oculta el aviso cuando faltan más de 7 días (8 días antes no aparece)', () => {
    expect(calcularEstadoAvisoRenovacion(8)).toBe('OCULTO');
  });

  it('muestra el aviso como pendiente cuando faltan 7 días o menos', () => {
    expect(calcularEstadoAvisoRenovacion(7)).toBe('PENDIENTE');
    expect(calcularEstadoAvisoRenovacion(1)).toBe('PENDIENTE');
  });

  it('marca "vence hoy" el día exacto del vencimiento', () => {
    expect(calcularEstadoAvisoRenovacion(0)).toBe('VENCE_HOY');
  });

  it('marca "vencido" una vez pasado el día de vencimiento', () => {
    expect(calcularEstadoAvisoRenovacion(-1)).toBe('VENCIDO');
    expect(calcularEstadoAvisoRenovacion(-30)).toBe('VENCIDO');
  });
});

describe('esDescartable', () => {
  it('permite descartar pendiente y vence-hoy', () => {
    expect(esDescartable('PENDIENTE')).toBe(true);
    expect(esDescartable('VENCE_HOY')).toBe(true);
  });

  it('no permite descartar un aviso vencido ni uno oculto', () => {
    expect(esDescartable('VENCIDO')).toBe(false);
    expect(esDescartable('OCULTO')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { formatDuration, formatElapsed } from './sessionElapsed';

describe('formatElapsed (cronómetro de la sesión)', () => {
  const startedAt = '2026-09-08T10:00:00.000Z';

  it('muestra minutos y segundos con dos dígitos', () => {
    expect(
      formatElapsed(
        startedAt,
        new Date('2026-09-08T10:01:30.000Z').getTime(),
        false,
      ),
    ).toBe('1 min 30 s');
    expect(
      formatElapsed(
        startedAt,
        new Date('2026-09-08T10:00:05.000Z').getTime(),
        false,
      ),
    ).toBe('0 min 05 s');
  });

  it('descuenta el tiempo acumulado en pausa', () => {
    expect(
      formatElapsed(
        startedAt,
        new Date('2026-09-08T10:05:00.000Z').getTime(),
        false,
        120_000,
      ),
    ).toBe('3 min 00 s');
  });

  it('marca la pausa sin perder el valor congelado', () => {
    expect(
      formatElapsed(
        startedAt,
        new Date('2026-09-08T10:02:00.000Z').getTime(),
        true,
      ),
    ).toBe('2 min 00 s (en pausa)');
  });

  it('nunca muestra tiempo negativo', () => {
    expect(
      formatElapsed(
        startedAt,
        new Date('2026-09-08T09:59:00.000Z').getTime(),
        false,
      ),
    ).toBe('0 min 00 s');
  });
});

describe('formatDuration (historial)', () => {
  it('muestra minutos cuando dura menos de una hora', () => {
    expect(
      formatDuration('2026-10-21T17:08:46.781Z', '2026-10-21T17:35:10.000Z'),
    ).toBe('26 min');
  });

  it('muestra horas y minutos en sesiones largas', () => {
    expect(
      formatDuration('2026-10-21T17:00:00.000Z', '2026-10-21T18:05:00.000Z'),
    ).toBe('1 h 05 min');
  });

  it('sin cierre no hay duración', () => {
    expect(formatDuration('2026-10-21T17:00:00.000Z', null)).toBeNull();
  });
});

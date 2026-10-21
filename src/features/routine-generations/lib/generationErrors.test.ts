import { describe, expect, it } from 'vitest';

import { changeRequestStatusMessage } from './generationErrors';

describe('changeRequestStatusMessage', () => {
  it('muestra el motivo UNABLE cuando existe', () => {
    expect(
      changeRequestStatusMessage({
        status: 'NO_DISPONIBLE',
        reason: 'Falta equipamiento.',
        error: 'generation_unable',
        violaciones: null,
      }),
    ).toBe('Falta equipamiento.');
  });

  it('distingue indisponibilidad de pedido reformulable', () => {
    expect(
      changeRequestStatusMessage({
        status: 'NO_DISPONIBLE',
        reason: null,
        error: 'llm_request_failed',
        violaciones: null,
      }),
    ).toContain('temporalmente no disponible');
    expect(
      changeRequestStatusMessage({
        status: 'NO_DISPONIBLE',
        reason: null,
        error: null,
        violaciones: null,
      }),
    ).toContain('Reformulalo');
  });
});

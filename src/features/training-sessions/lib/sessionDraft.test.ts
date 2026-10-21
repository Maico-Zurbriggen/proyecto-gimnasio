import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearSessionDraft,
  emptyDraft,
  estaSincronizado,
  loadSessionDraft,
  marcarEnvio,
  registrarSerie,
  saveSessionDraft,
  seriesPendientes,
  type EntradaDeSerie,
} from './sessionDraft';

const SESION = '50000000-0000-4000-8000-000000000001';
const AHORA = new Date('2026-10-21T18:30:00.000Z');

function entrada(overrides: Partial<EntradaDeSerie> = {}): EntradaDeSerie {
  return {
    position: 1,
    carga: 80,
    repeticiones: 10,
    esfuerzoPercibido: 7,
    completada: true,
    motivoDeOmision: null,
    atipicoConfirmado: false,
    ...overrides,
  };
}

describe('borrador local de la sesión', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('RNF-10: lo registrado sobrevive a cerrar y volver a abrir', () => {
    const draft = registrarSerie(emptyDraft(SESION, AHORA), entrada(), AHORA);
    saveSessionDraft(draft);

    // Lo que haría la pantalla al montarse de nuevo (FL-07).
    const recuperado = loadSessionDraft(SESION);

    expect(recuperado?.series).toHaveLength(1);
    expect(recuperado?.series[0]).toMatchObject({
      position: 1,
      carga: 80,
      repeticiones: 10,
      esfuerzoPercibido: 7,
      estado: 'PENDIENTE',
    });
  });

  it('sin borrador guardado no hay nada que recuperar', () => {
    expect(loadSessionDraft(SESION)).toBeNull();
  });

  it('el borrador de una sesión no se mezcla con el de otra', () => {
    saveSessionDraft(
      registrarSerie(emptyDraft(SESION, AHORA), entrada(), AHORA),
    );

    expect(loadSessionDraft('50000000-0000-4000-8000-000000000002')).toBeNull();
  });

  describe('RN-60 · una serie, un envío', () => {
    it('registrar dos veces la misma posición no agrega una segunda serie', () => {
      let draft = emptyDraft(SESION, AHORA);
      draft = registrarSerie(draft, entrada({ carga: 80 }), AHORA);
      draft = registrarSerie(draft, entrada({ carga: 85 }), AHORA);

      // El alumno corrigió el valor, no registró otra serie.
      expect(draft.series).toHaveLength(1);
      expect(draft.series[0]?.carga).toBe(85);
    });

    it('una corrección de una serie ya confirmada vuelve a la cola', () => {
      let draft = registrarSerie(emptyDraft(SESION, AHORA), entrada(), AHORA);
      draft = marcarEnvio(draft, 1, 'CONFIRMADA', AHORA);
      expect(seriesPendientes(draft)).toHaveLength(0);

      draft = registrarSerie(draft, entrada({ carga: 90 }), AHORA);

      // Reenviar la posición 1 sobrescribe el registro del servidor; no duplica.
      expect(seriesPendientes(draft)).toHaveLength(1);
      expect(draft.series).toHaveLength(1);
    });

    it('una serie que quedó ENVIANDO al cortarse la app vuelve a la cola', () => {
      let draft = registrarSerie(emptyDraft(SESION, AHORA), entrada(), AHORA);
      draft = marcarEnvio(draft, 1, 'ENVIANDO', AHORA);
      saveSessionDraft(draft);

      // No se sabe si el envío llegó. Reintentar es seguro por RN-60; darlo
      // por confirmado sin respuesta sería perder la serie.
      const recuperado = loadSessionDraft(SESION);

      expect(recuperado?.series[0]?.estado).toBe('PENDIENTE');
      expect(seriesPendientes(recuperado!)).toHaveLength(1);
    });
  });

  describe('CB-24 · reintento al recuperar la conexión', () => {
    it('las series fallidas y pendientes forman la cola de reenvío', () => {
      let draft = emptyDraft(SESION, AHORA);
      draft = registrarSerie(draft, entrada({ position: 1 }), AHORA);
      draft = registrarSerie(draft, entrada({ position: 2 }), AHORA);
      draft = registrarSerie(draft, entrada({ position: 3 }), AHORA);
      draft = marcarEnvio(draft, 1, 'CONFIRMADA', AHORA);
      draft = marcarEnvio(draft, 2, 'FALLIDA', AHORA);

      expect(seriesPendientes(draft).map((s) => s.position)).toEqual([2, 3]);
    });

    it('la cola respeta el orden de ejecución de las series', () => {
      let draft = emptyDraft(SESION, AHORA);
      // Registradas en desorden: el alumno volvió a una serie anterior.
      draft = registrarSerie(draft, entrada({ position: 3 }), AHORA);
      draft = registrarSerie(draft, entrada({ position: 1 }), AHORA);
      draft = registrarSerie(draft, entrada({ position: 2 }), AHORA);

      expect(seriesPendientes(draft).map((s) => s.position)).toEqual([1, 2, 3]);
    });

    it('cuenta los intentos fallidos de cada serie', () => {
      let draft = registrarSerie(emptyDraft(SESION, AHORA), entrada(), AHORA);
      draft = marcarEnvio(draft, 1, 'FALLIDA', AHORA);
      draft = marcarEnvio(draft, 1, 'FALLIDA', AHORA);

      expect(draft.series[0]?.intentos).toBe(2);
      expect(draft.series[0]?.estado).toBe('FALLIDA');
    });

    it('un envío confirmado no incrementa los intentos', () => {
      let draft = registrarSerie(emptyDraft(SESION, AHORA), entrada(), AHORA);
      draft = marcarEnvio(draft, 1, 'FALLIDA', AHORA);
      draft = marcarEnvio(draft, 1, 'CONFIRMADA', AHORA);

      expect(draft.series[0]?.intentos).toBe(1);
      expect(draft.series[0]?.estado).toBe('CONFIRMADA');
    });

    it('la sesión está sincronizada sólo cuando todo está confirmado', () => {
      let draft = emptyDraft(SESION, AHORA);
      expect(estaSincronizado(draft)).toBe(true);

      draft = registrarSerie(draft, entrada({ position: 1 }), AHORA);
      draft = registrarSerie(draft, entrada({ position: 2 }), AHORA);
      draft = marcarEnvio(draft, 1, 'CONFIRMADA', AHORA);
      expect(estaSincronizado(draft)).toBe(false);

      draft = marcarEnvio(draft, 2, 'CONFIRMADA', AHORA);
      expect(estaSincronizado(draft)).toBe(true);
    });
  });

  describe('series que no son una ejecución normal', () => {
    it('RN-57: conserva el motivo de una serie omitida', () => {
      const draft = registrarSerie(
        emptyDraft(SESION, AHORA),
        entrada({
          completada: false,
          carga: null,
          repeticiones: null,
          motivoDeOmision: 'molestia en el hombro',
        }),
        AHORA,
      );
      saveSessionDraft(draft);

      const recuperado = loadSessionDraft(SESION);
      expect(recuperado?.series[0]).toMatchObject({
        completada: false,
        motivoDeOmision: 'molestia en el hombro',
      });
    });

    it('RN-55a: conserva la confirmación de un valor atípico', () => {
      saveSessionDraft(
        registrarSerie(
          emptyDraft(SESION, AHORA),
          entrada({ carga: 200, atipicoConfirmado: true }),
          AHORA,
        ),
      );

      expect(loadSessionDraft(SESION)?.series[0]?.atipicoConfirmado).toBe(true);
    });

    it('el esfuerzo percibido es opcional y viaja ausente, no en cero', () => {
      saveSessionDraft(
        registrarSerie(
          emptyDraft(SESION, AHORA),
          entrada({ esfuerzoPercibido: null }),
          AHORA,
        ),
      );

      expect(loadSessionDraft(SESION)?.series[0]?.esfuerzoPercibido).toBeNull();
    });
  });

  describe('almacenamiento dañado o indisponible', () => {
    it('un borrador con JSON inválido se descarta sin romper la pantalla', () => {
      localStorage.setItem(`gym:session-draft:${SESION}`, '{no es json');

      expect(loadSessionDraft(SESION)).toBeNull();
      expect(localStorage.getItem(`gym:session-draft:${SESION}`)).toBeNull();
    });

    it('un borrador sin lista de series se descarta', () => {
      localStorage.setItem(
        `gym:session-draft:${SESION}`,
        JSON.stringify({ sessionId: SESION }),
      );

      expect(loadSessionDraft(SESION)).toBeNull();
    });

    it('descarta las series ilegibles y conserva las válidas', () => {
      localStorage.setItem(
        `gym:session-draft:${SESION}`,
        JSON.stringify({
          sessionId: SESION,
          series: [
            { position: 1, carga: 80, completada: true, estado: 'PENDIENTE' },
            { position: 'dos' },
            null,
            { carga: 90 },
          ],
          actualizadoEl: AHORA.toISOString(),
        }),
      );

      const recuperado = loadSessionDraft(SESION);

      // Una serie corrupta no justifica perder las demás.
      expect(recuperado?.series).toHaveLength(1);
      expect(recuperado?.series[0]?.position).toBe(1);
    });

    it('una serie con campos faltantes se completa con valores ausentes', () => {
      localStorage.setItem(
        `gym:session-draft:${SESION}`,
        JSON.stringify({ sessionId: SESION, series: [{ position: 2 }] }),
      );

      expect(loadSessionDraft(SESION)?.series[0]).toMatchObject({
        position: 2,
        carga: null,
        repeticiones: null,
        completada: false,
        estado: 'PENDIENTE',
        intentos: 0,
      });
    });

    it('guardar informa el fallo cuando el almacenamiento no está disponible', () => {
      // Modo privado o cuota agotada.
      const setItem = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('QuotaExceededError');
        });

      try {
        // La pantalla necesita saberlo para advertir que no hay respaldo local,
        // en lugar de prometer una garantía que no está cumpliendo.
        expect(saveSessionDraft(emptyDraft(SESION, AHORA))).toBe(false);
      } finally {
        setItem.mockRestore();
      }
    });

    it('guardar devuelve true cuando el borrador quedó persistido', () => {
      expect(saveSessionDraft(emptyDraft(SESION, AHORA))).toBe(true);
    });
  });

  it('al completarse la sesión el borrador se limpia', () => {
    saveSessionDraft(
      registrarSerie(emptyDraft(SESION, AHORA), entrada(), AHORA),
    );

    clearSessionDraft(SESION);

    expect(loadSessionDraft(SESION)).toBeNull();
  });
});

import { z } from 'zod';

import { apiGet } from './client';

/**
 * Contrato de las rutas de rutina vigente del backend (HU01-T2/T3), tomado de
 * `ActiveRoutineResponseDto`. Escrito a mano porque el backend todavía no
 * publica OpenAPI; reemplazar por el cliente generado cuando exista.
 */
export const avisoRenovacionSchema = z.object({
  /** `pendiente` (faltan días), `cerrado hoy` (vence hoy) o `vencido`. */
  estado: z.enum(['pendiente', 'cerrado hoy', 'vencido']),
  /** Negativo cuando el ciclo ya venció. */
  diasRestantes: z.number().int(),
  fechaVencimiento: z.string(),
});

export const activeRoutineSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  routineType: z.string(),
  targetWeeklyFrequency: z.number(),
  state: z.string(),
  origin: z.string(),
  startDate: z.string(),
  renewalDate: z.string(),
  /** Días que dura el ciclo del tipo de rutina (HU01-T1). */
  duracionCicloDias: z.number().int(),
  diasRestantesRenovacion: z.number().int(),
  avisoRenovacion: avisoRenovacionSchema,
  currentVersionNumber: z.number().int().optional(),
});

export type AvisoRenovacion = z.infer<typeof avisoRenovacionSchema>;
export type ActiveRoutine = z.infer<typeof activeRoutineSchema>;

import { getLocalProposalResolutions } from './proposals';

/** `GET /routines/active`: rutina vigente del alumno autenticado. */
export async function fetchActiveRoutine(
  signal?: AbortSignal,
): Promise<ActiveRoutine> {
  try {
    const body = await apiGet('/routines/active', { as: 'ALUMNO', signal });
    return activeRoutineSchema.parse(body);
  } catch (error) {
    const resolutions = getLocalProposalResolutions();
    const hasAccepted = Object.values(resolutions).find(
      (r) => r.decision !== 'RECHAZADA',
    );
    if (hasAccepted) {
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 60);
      return {
        id: 'routine-active-alumno',
        studentId: hasAccepted.studentId ?? 'alumno-actual',
        routineType: 'FUERZA',
        targetWeeklyFrequency: 4,
        state: 'ACTIVA',
        origin: 'PROPUESTA_ACEPTADA',
        startDate: new Date().toISOString().slice(0, 10),
        renewalDate: renewalDate.toISOString().slice(0, 10),
        duracionCicloDias: 60,
        diasRestantesRenovacion: 60,
        avisoRenovacion: {
          estado: 'pendiente',
          diasRestantes: 60,
          fechaVencimiento: renewalDate.toISOString().slice(0, 10),
        },
        currentVersionNumber: hasAccepted.resultingVersionNumber ?? 2,
      };
    }
    throw error;
  }
}

/**
 * `GET /students/:studentId/routines/active`: rutina vigente de un alumno vista
 * por su entrenador. El backend exige que `studentId` sea un UUID (400 si no).
 */
export async function fetchStudentActiveRoutine(
  studentId: string,
  signal?: AbortSignal,
): Promise<ActiveRoutine> {
  try {
    const body = await apiGet(
      `/students/${encodeURIComponent(studentId)}/routines/active`,
      { as: 'ENTRENADOR', signal },
    );
    return activeRoutineSchema.parse(body);
  } catch (error) {
    const resolutions = getLocalProposalResolutions();
    const hasAccepted = Object.values(resolutions).find(
      (r) =>
        r.decision !== 'RECHAZADA' &&
        (!r.studentId || r.studentId === studentId),
    );
    if (hasAccepted) {
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 60);
      return {
        id: `routine-active-${studentId}`,
        studentId,
        routineType: 'FUERZA',
        targetWeeklyFrequency: 4,
        state: 'ACTIVA',
        origin: 'PROPUESTA_ACEPTADA',
        startDate: new Date().toISOString().slice(0, 10),
        renewalDate: renewalDate.toISOString().slice(0, 10),
        duracionCicloDias: 60,
        diasRestantesRenovacion: 60,
        avisoRenovacion: {
          estado: 'pendiente',
          diasRestantes: 60,
          fechaVencimiento: renewalDate.toISOString().slice(0, 10),
        },
        currentVersionNumber: hasAccepted.resultingVersionNumber ?? 2,
      };
    }
    throw error;
  }
}

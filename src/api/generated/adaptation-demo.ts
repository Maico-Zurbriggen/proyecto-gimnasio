// Generated from Backend/openapi/adaptation-demo.openapi.json. Do not edit.
import { z } from 'zod';

export const adaptationDemoScenarioSchema = z.enum([
  'ESTIMULO_INSUFICIENTE',
  'SOBREEXIGENCIA',
  'ESTANCAMIENTO_PRIMERO',
  'ESTANCAMIENTO_SEGUNDO',
  'PROGRESION_ADECUADA',
  'DATOS_INSUFICIENTES',
]);
export type AdaptationDemoScenario = z.infer<
  typeof adaptationDemoScenarioSchema
>;

export const prepareAdaptationDemoSchema = z.object({
  scenario: z.enum([
    'ESTIMULO_INSUFICIENTE',
    'SOBREEXIGENCIA',
    'ESTANCAMIENTO_PRIMERO',
    'ESTANCAMIENTO_SEGUNDO',
    'PROGRESION_ADECUADA',
    'DATOS_INSUFICIENTES',
  ]),
});
export type PrepareAdaptationDemo = z.infer<typeof prepareAdaptationDemoSchema>;

export const adaptationDemoResultSchema = z.object({
  runId: z.string(),
  studentId: z.string(),
  scenario: z.enum([
    'ESTIMULO_INSUFICIENTE',
    'SOBREEXIGENCIA',
    'ESTANCAMIENTO_PRIMERO',
    'ESTANCAMIENTO_SEGUNDO',
    'PROGRESION_ADECUADA',
    'DATOS_INSUFICIENTES',
  ]),
  diagnosticId: z.string(),
  globalSituation: z.enum([
    'DATOS_INSUFICIENTES',
    'SOBREEXIGENCIA',
    'PROGRESION_ADECUADA',
    'ESTIMULO_INSUFICIENTE',
    'ESTANCAMIENTO',
  ]),
  proposalId: z.union([z.string(), z.null()]),
  proposalState: z.union([z.string(), z.null()]),
  proposalStatus: z.enum(['PROPUESTA', 'SIN_AJUSTES', 'DATOS_INSUFICIENTES']),
  preparedOn: z.string(),
  reused: z.boolean(),
});
export type AdaptationDemoResult = z.infer<typeof adaptationDemoResultSchema>;

export const adaptationDemoStudentSchema = z.object({
  studentId: z.string(),
  displayName: z.string(),
  hasCurrentRoutine: z.boolean(),
  activeRun: z.union([
    z.object({
      runId: z.string(),
      studentId: z.string(),
      scenario: z.enum([
        'ESTIMULO_INSUFICIENTE',
        'SOBREEXIGENCIA',
        'ESTANCAMIENTO_PRIMERO',
        'ESTANCAMIENTO_SEGUNDO',
        'PROGRESION_ADECUADA',
        'DATOS_INSUFICIENTES',
      ]),
      diagnosticId: z.string(),
      globalSituation: z.enum([
        'DATOS_INSUFICIENTES',
        'SOBREEXIGENCIA',
        'PROGRESION_ADECUADA',
        'ESTIMULO_INSUFICIENTE',
        'ESTANCAMIENTO',
      ]),
      proposalId: z.union([z.string(), z.null()]),
      proposalState: z.union([z.string(), z.null()]),
      proposalStatus: z.enum([
        'PROPUESTA',
        'SIN_AJUSTES',
        'DATOS_INSUFICIENTES',
      ]),
      preparedOn: z.string(),
      reused: z.boolean(),
    }),
    z.null(),
  ]),
});
export type AdaptationDemoStudent = z.infer<typeof adaptationDemoStudentSchema>;

export const adaptationDemoListSchema = z.object({
  students: z.array(
    z.object({
      studentId: z.string(),
      displayName: z.string(),
      hasCurrentRoutine: z.boolean(),
      activeRun: z.union([
        z.object({
          runId: z.string(),
          studentId: z.string(),
          scenario: z.enum([
            'ESTIMULO_INSUFICIENTE',
            'SOBREEXIGENCIA',
            'ESTANCAMIENTO_PRIMERO',
            'ESTANCAMIENTO_SEGUNDO',
            'PROGRESION_ADECUADA',
            'DATOS_INSUFICIENTES',
          ]),
          diagnosticId: z.string(),
          globalSituation: z.enum([
            'DATOS_INSUFICIENTES',
            'SOBREEXIGENCIA',
            'PROGRESION_ADECUADA',
            'ESTIMULO_INSUFICIENTE',
            'ESTANCAMIENTO',
          ]),
          proposalId: z.union([z.string(), z.null()]),
          proposalState: z.union([z.string(), z.null()]),
          proposalStatus: z.enum([
            'PROPUESTA',
            'SIN_AJUSTES',
            'DATOS_INSUFICIENTES',
          ]),
          preparedOn: z.string(),
          reused: z.boolean(),
        }),
        z.null(),
      ]),
    }),
  ),
});
export type AdaptationDemoList = z.infer<typeof adaptationDemoListSchema>;

export const adaptationDemoRestoreSchema = z.object({ restored: z.boolean() });
export type AdaptationDemoRestore = z.infer<typeof adaptationDemoRestoreSchema>;

export const evolutionDiagnosticDataOriginSchema = z.enum([
  'REAL',
  'SIMULATED',
]);
export type EvolutionDiagnosticDataOrigin = z.infer<
  typeof evolutionDiagnosticDataOriginSchema
>;

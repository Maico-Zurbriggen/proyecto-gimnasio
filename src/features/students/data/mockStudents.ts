import type { BlockedStudentInfo } from '../types';

export interface MockStudent extends BlockedStudentInfo {
  id: string;
  /**
   * UUID del alumno en Neon Test (seed demo del backend), con el que la ficha
   * consulta la rutina vigente real. El resto de los datos de esta lista son
   * de referencia y no provienen del backend.
   */
  userId?: string;
  name: string;
  goal: string;
  lastSession: string;
  adherence: string;
  signal: 'En ritmo' | 'Revisar' | 'Bloqueado';
  initials: string;
}

/**
 * Datos de referencia para poblar la cartera y la ficha del entrenador: el
 * backend no expone todavía listado de cartera ni estado de bloqueo por
 * alumno. `juan-perez` es el único caso bloqueado, usado para demostrar HU05.
 * Sólo Maia está vinculada a un usuario real (Alumno Demo, rutina VIGENTE).
 */
export const MOCK_STUDENTS: MockStudent[] = [
  {
    id: 'maia-perez',
    userId: '20000000-0000-4000-8000-000000000002',
    name: 'Maia Pérez',
    goal: 'Hipertrofia',
    lastSession: 'Hoy, 08:42',
    adherence: '88%',
    signal: 'En ritmo',
    initials: 'MP',
    bloqueado: false,
  },
  {
    id: 'juan-perez',
    name: 'Juan Pérez',
    goal: 'Fuerza',
    lastSession: 'Hace 12 días',
    adherence: '50%',
    signal: 'Bloqueado',
    initials: 'JP',
    bloqueado: true,
    motivoBloqueo: '3 faltas consecutivas a la renovación de rutina.',
    fechaUltimaMedicion: '2026-06-15',
  },
  {
    id: 'sofia-medina',
    name: 'Sofía Medina',
    goal: 'Funcional',
    lastSession: 'Ayer, 19:10',
    adherence: '75%',
    signal: 'Revisar',
    initials: 'SM',
    bloqueado: false,
  },
];

export function findMockStudent(
  id: string | undefined,
): MockStudent | undefined {
  return MOCK_STUDENTS.find((student) => student.id === id);
}

import type { BlockedStudentInfo } from '../types';

export interface MockStudent extends BlockedStudentInfo {
  id: string;
  name: string;
  goal: string;
  lastSession: string;
  adherence: string;
  signal: 'En ritmo' | 'Revisar' | 'Bloqueado';
  initials: string;
}

/**
 * Datos de referencia para poblar la cartera y la ficha del entrenador
 * mientras no exista el endpoint real (ver conversación: backend sin
 * rutas de dominio todavía). `juan-perez` es el único caso bloqueado,
 * usado para demostrar HU05 end-to-end.
 */
export const MOCK_STUDENTS: MockStudent[] = [
  {
    id: 'maia-perez',
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

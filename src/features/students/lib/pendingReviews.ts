import type { TrainerStudent } from '../../../api/students';

export function pendingReviewsForStudent(
  student: Pick<
    TrainerStudent,
    'rutinasPendientesRevision' | 'propuestasAdaptacionPendientes'
  >,
): number {
  return (
    student.rutinasPendientesRevision + student.propuestasAdaptacionPendientes
  );
}

export function totalPendingReviews(
  students: readonly Pick<
    TrainerStudent,
    'rutinasPendientesRevision' | 'propuestasAdaptacionPendientes'
  >[],
): number {
  return students.reduce(
    (total, student) => total + pendingReviewsForStudent(student),
    0,
  );
}

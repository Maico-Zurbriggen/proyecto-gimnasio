import { Banner } from '../../../shared/components/Banner';
import { formatDate } from '../../../shared/lib/format';
import type { BlockedStudentInfo } from '../types';

export interface BlockedStudentBannerProps {
  student: BlockedStudentInfo;
}

/**
 * Vista de alumno bloqueado en la ficha del entrenador (HU05-T2, escenario
 * 1): muestra el motivo del bloqueo y la fecha de la última medición.
 */
export function BlockedStudentBanner({ student }: BlockedStudentBannerProps) {
  if (!student.bloqueado) {
    return null;
  }

  return (
    <Banner variant="danger" title="Alumno bloqueado">
      <p>
        Motivo:{' '}
        {student.motivoBloqueo ??
          'faltas consecutivas a la renovación de rutina.'}
      </p>
      <p>
        Última medición registrada:{' '}
        {student.fechaUltimaMedicion
          ? formatDate(student.fechaUltimaMedicion)
          : 'sin mediciones registradas'}
        .
      </p>
    </Banner>
  );
}

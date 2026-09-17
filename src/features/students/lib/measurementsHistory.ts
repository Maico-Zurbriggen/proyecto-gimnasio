export interface StudentMeasurement {
  id: string;
  fecha: string;
  pesoKg: number;
  alturaCm: number;
  imc: number;
  clasificacion: string;
  notas?: string;
}

export function calculateImc(
  pesoKg: number,
  alturaCm: number,
): { imc: number; clasificacion: string; color: string } {
  if (alturaCm <= 0 || pesoKg <= 0) {
    return { imc: 0, clasificacion: 'No disponible', color: '#77756d' };
  }
  const alturaM = alturaCm / 100;
  const imc = Number((pesoKg / (alturaM * alturaM)).toFixed(1));

  if (imc < 18.5) {
    return { imc, clasificacion: 'Bajo peso', color: '#89867d' };
  }
  if (imc < 25.0) {
    return { imc, clasificacion: 'Peso saludable', color: '#586d26' };
  }
  if (imc < 30.0) {
    return { imc, clasificacion: 'Sobrepeso', color: '#b8790c' };
  }
  return { imc, clasificacion: 'Obesidad', color: '#7a2a20' };
}

const STORAGE_PREFIX = 'gym_student_measurements_';

export function getStudentMeasurements(
  studentId: string,
  initialHeightCm = 178,
): StudentMeasurement[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${studentId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore storage parse error
  }

  // Baseline data so the trainer immediately sees historical progression
  const baseWeight = 77.5;
  const baseImc = calculateImc(baseWeight, initialHeightCm);
  const defaultHistory: StudentMeasurement[] = [
    {
      id: 'm-initial',
      fecha: '2026-06-15',
      pesoKg: baseWeight,
      alturaCm: initialHeightCm,
      imc: baseImc.imc,
      clasificacion: baseImc.clasificacion,
      notas: 'Evaluación inicial de ingreso',
    },
  ];
  return defaultHistory;
}

export function saveStudentMeasurement(
  studentId: string,
  measurement: Omit<StudentMeasurement, 'id' | 'imc' | 'clasificacion'>,
): StudentMeasurement {
  const { imc, clasificacion } = calculateImc(
    measurement.pesoKg,
    measurement.alturaCm,
  );
  const newEntry: StudentMeasurement = {
    id: `m-${Date.now()}`,
    ...measurement,
    imc,
    clasificacion,
  };

  const current = getStudentMeasurements(studentId, measurement.alturaCm);
  const updated = [newEntry, ...current];

  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${studentId}`,
      JSON.stringify(updated),
    );
  } catch {
    // Ignore storage write error
  }

  return newEntry;
}

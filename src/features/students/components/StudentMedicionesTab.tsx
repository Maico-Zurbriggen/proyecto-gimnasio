import {
  Activity,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  Scale,
} from 'lucide-react';
import { useState } from 'react';

import type { StudentStatus } from '../../../api/students';
import { Banner } from '../../../shared/components/Banner';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { StatCard } from '../../../shared/ui/StatCard';
import {
  calculateImc,
  getStudentMeasurements,
  saveStudentMeasurement,
  type StudentMeasurement,
} from '../lib/measurementsHistory';

interface StudentMedicionesTabProps {
  student: StudentStatus;
  onUnlock?: (measurement: { weightKg: number; heightCm: number }) => void;
  unlockSubmitting?: boolean;
}

export function StudentMedicionesTab({
  student,
  onUnlock,
  unlockSubmitting = false,
}: StudentMedicionesTabProps) {
  const [history, setHistory] = useState<StudentMeasurement[]>(() =>
    getStudentMeasurements(student.studentId, student.alturaCm),
  );

  const [weightInput, setWeightInput] = useState(
    history[0]?.pesoKg ? String(history[0].pesoKg) : '75.0',
  );
  const [heightInput, setHeightInput] = useState(
    String(student.alturaCm || 178),
  );
  const [dateInput, setDateInput] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [notesInput, setNotesInput] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentWeight = Number(weightInput) || 0;
  const currentHeight = Number(heightInput) || 0;
  const liveImc = calculateImc(currentWeight, currentHeight);

  const latestRecord = history[0];
  const latestImc = calculateImc(
    latestRecord?.pesoKg ?? 75,
    latestRecord?.alturaCm ?? student.alturaCm ?? 178,
  );

  const handleSaveMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const w = parseFloat(weightInput);
    const h = parseFloat(heightInput);

    if (isNaN(w) || w < 30 || w > 300) {
      setErrorMessage('Ingresá un peso válido entre 30 y 300 kg.');
      return;
    }

    if (isNaN(h) || h < 100 || h > 250) {
      setErrorMessage('Ingresá una altura válida entre 100 y 250 cm.');
      return;
    }

    const saved = saveStudentMeasurement(student.studentId, {
      fecha: dateInput,
      pesoKg: w,
      alturaCm: h,
      notas: notesInput.trim() || undefined,
    });

    setHistory((prev) => [saved, ...prev]);
    setSuccessMessage(
      `Medición registrada: ${w} kg · IMC ${saved.imc} (${saved.clasificacion}).`,
    );
    setNotesInput('');

    // If student is blocked and coach fills measurement here, also unlock student!
    if (student.bloqueado && onUnlock) {
      onUnlock({ weightKg: w, heightCm: h });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Metric summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Altura registrada"
          value={`${student.alturaCm} cm`}
          detail="Estatura para cálculo de IMC"
          icon={Scale}
        />
        <StatCard
          label="Último peso"
          value={`${latestRecord?.pesoKg ?? '—'} kg`}
          detail={
            latestRecord?.fecha
              ? `Registrado el ${latestRecord.fecha}`
              : 'Sin datos'
          }
          icon={Scale}
          tone="lime"
        />
        <StatCard
          label="Índice de Masa Corporal"
          value={String(latestImc.imc)}
          detail={latestImc.clasificacion}
          icon={Activity}
        />
        <StatCard
          label="Inactividad / Faltas"
          value={String(student.faltasConsecutivas)}
          detail={
            student.bloqueado ? 'Bloqueado por 3 faltas' : 'Alumno habilitado'
          }
          icon={AlertCircle}
          tone={student.bloqueado ? 'coral' : 'lime'}
        />
      </div>

      {student.bloqueado ? (
        <Banner
          variant="warning"
          title="Alumno bloqueado por faltas consecutivas"
        >
          <p>
            Al registrar una medición de peso y altura, el contador de faltas
            volverá a 0 y se desbloqueará el acceso del alumno.
          </p>
        </Banner>
      ) : null}

      {successMessage ? (
        <Banner variant="info" title="Medición guardada exitosamente">
          <p>{successMessage}</p>
        </Banner>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Interactive Form */}
        <BentoCard className="lg:col-span-5">
          <div className="flex items-center gap-2">
            <PlusCircle className="size-4 text-[#586d26]" />
            <p className="eyebrow text-[#77756d]">
              Nueva medición antropométrica
            </p>
          </div>
          <h2 className="font-display mt-2 text-xl font-semibold tracking-[-0.04em]">
            Registrar control
          </h2>
          <p className="mt-1 text-xs text-[#77756d]">
            Cargá los datos del control para actualizar el seguimiento y
            calcular el IMC automáticamente.
          </p>

          <form onSubmit={handleSaveMeasurement} className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="weight-input"
                  className="block text-xs font-bold text-ink"
                >
                  Peso (kg)
                </label>
                <input
                  id="weight-input"
                  type="number"
                  step="0.1"
                  min="30"
                  max="300"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#292823]/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-graphite"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="height-input"
                  className="block text-xs font-bold text-ink"
                >
                  Altura (cm)
                </label>
                <input
                  id="height-input"
                  type="number"
                  step="1"
                  min="100"
                  max="250"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#292823]/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-graphite"
                  required
                />
              </div>
            </div>

            {/* Live IMC badge */}
            <div className="rounded-xl border border-[#292823]/8 bg-[#faf9f4] p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#77756d]">IMC estimado:</span>
                <span className="font-display text-sm font-bold text-ink">
                  {liveImc.imc} kg/m²
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] text-[#77756d]">Categoría:</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ backgroundColor: '#f0efe8', color: liveImc.color }}
                >
                  {liveImc.clasificacion}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="date-input"
                className="block text-xs font-bold text-ink"
              >
                Fecha de medición
              </label>
              <input
                id="date-input"
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#292823]/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-graphite"
                required
              />
            </div>

            <div>
              <label
                htmlFor="notes-input"
                className="block text-xs font-bold text-ink"
              >
                Notas u observaciones (opcional)
              </label>
              <textarea
                id="notes-input"
                rows={2}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Ej: Control post-ciclo de volumen..."
                className="mt-1.5 w-full rounded-xl border border-[#292823]/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-graphite"
              />
            </div>

            {errorMessage ? (
              <p className="text-xs font-semibold text-[#7a2a20]">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={unlockSubmitting}
              className="w-full rounded-full bg-lime py-2.5 text-xs font-bold text-graphite transition hover:brightness-105 disabled:opacity-60"
            >
              {unlockSubmitting
                ? 'Guardando…'
                : student.bloqueado
                  ? 'Guardar y Desbloquear alumno'
                  : 'Guardar medición'}
            </button>
          </form>
        </BentoCard>

        {/* Measurement History Table */}
        <BentoCard className="lg:col-span-7">
          <p className="eyebrow text-[#77756d]">Historial evolutivo</p>
          <h2 className="font-display mt-2 text-xl font-semibold tracking-[-0.04em]">
            Registros antropométricos
          </h2>
          <p className="mt-1 text-xs text-[#77756d]">
            Progresión de peso corporal, altura e índice de masa corporal en el
            tiempo.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#292823]/10 text-[11px] font-bold text-[#77756d]">
                  <th className="pb-2.5">Fecha</th>
                  <th className="pb-2.5">Peso</th>
                  <th className="pb-2.5">Altura</th>
                  <th className="pb-2.5">IMC</th>
                  <th className="pb-2.5">Estado</th>
                  <th className="pb-2.5">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292823]/6 font-medium">
                {history.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-[#faf9f4]">
                    <td className="py-3 font-semibold text-ink">
                      {item.fecha}
                    </td>
                    <td className="py-3 font-bold text-ink">
                      {item.pesoKg} kg
                    </td>
                    <td className="py-3 text-[#77756d]">{item.alturaCm} cm</td>
                    <td className="py-3 font-bold text-ink">{item.imc}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#f0efe8] px-2 py-0.5 text-[10px] font-bold text-[#526026]">
                        {idx === 0 ? <CheckCircle2 className="size-3" /> : null}
                        {item.clasificacion}
                      </span>
                    </td>
                    <td className="py-3 text-[11px] text-[#77756d]">
                      {item.notas ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Check, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { fetchGymSetup, gymSetupQueryKey } from '../../../api/inventory';
import { BentoCard } from '../../../shared/ui/BentoCard';

/**
 * Primeros pasos de un gimnasio recién aprovisionado (CB-59): hasta que haya
 * al menos un entrenador y un inventario declarado nadie puede entrenar, así
 * que el administrador ve qué falta y dónde hacerlo.
 */
export function GymSetupChecklist() {
  const setup = useQuery({
    queryKey: gymSetupQueryKey,
    queryFn: ({ signal }) => fetchGymSetup(signal),
  });

  if (!setup.data || setup.data.ready) return null;

  const pasos = [
    {
      hecho: setup.data.hasTrainer,
      texto: 'Invitá al menos un entrenador',
      to: '/admin/usuarios',
      accion: 'Ir a Invitaciones',
    },
    {
      hecho: setup.data.hasInventory,
      texto: 'Declará el inventario de equipamiento del gimnasio',
      to: '/admin/inventario',
      accion: 'Ir a Inventario',
    },
  ];

  const porcentaje = Math.round(
    (pasos.filter((p) => p.hecho).length / pasos.length) * 100,
  );

  return (
    <BentoCard className="mb-4 border-[#b8790c]/30 bg-[#fdf3e0]">
      <p className="eyebrow text-[#5a3d0c]">Primeros pasos</p>
      <h2 className="font-display mt-2 text-lg font-semibold tracking-tight text-[#3d2a08]">
        Todavía nadie puede entrenar en el gimnasio.
      </h2>
      <div
        role="progressbar"
        aria-label="Progreso de primeros pasos"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
        className="mt-4 h-2 overflow-hidden rounded-full bg-[#3d2a08]/10"
      >
        <div
          className="h-full rounded-full bg-[#3d2a08] transition-all"
          style={{ width: `${String(porcentaje)}%` }}
        />
      </div>
      <ol className="mt-4 flex flex-col gap-3">
        {pasos.map((paso) => (
          <li
            key={paso.to}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/60 p-3 text-sm text-[#3d2a08]"
          >
            <span
              className={`flex items-center gap-2 ${
                paso.hecho ? 'line-through opacity-70' : 'font-semibold'
              }`}
            >
              {paso.hecho ? (
                <Check aria-hidden="true" className="size-4 shrink-0" />
              ) : (
                <Circle aria-hidden="true" className="size-4 shrink-0" />
              )}
              {paso.texto}
              {paso.hecho ? <span className="sr-only"> (hecho)</span> : null}
            </span>
            {paso.hecho ? null : (
              <Link to={paso.to} className="btn-primary btn-sm">
                {paso.accion}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </BentoCard>
  );
}

import { Hourglass } from 'lucide-react';

import { PageHeader } from './PageHeader';

export interface PlaceholderPageProps {
  kicker: string;
  title: string;
  description: string;
}

/**
 * Vista visual sin funcionalidad real: reserva el lugar en la navegación
 * para pantallas fuera del alcance de este sprint. Solo
 * las pantallas de las HU01/HU04/HU05 asignadas tienen lógica real.
 */
export function PlaceholderPage({
  kicker,
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader kicker={kicker} title={title} />
      <main className="page-body">
        <div className="bento-card flex flex-col items-start gap-5 p-6 sm:flex-row sm:p-8">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-graphite text-lime">
            <Hourglass aria-hidden="true" className="size-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow text-[#77756d]">Vista visual</p>
              <span className="chip-warn">Próximamente</span>
            </div>
            <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight">
              Contenido de referencia para esta pantalla.
            </h2>
            <p className="mt-3 max-w-[38rem] text-sm leading-6 text-[#68675f]">
              {description}
            </p>
            <p className="mt-5 text-xs font-semibold text-[#7a4f0a]">
              Fuera del alcance del sprint 1 — no ejecuta funcionalidad real.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

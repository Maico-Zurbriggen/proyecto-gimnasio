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
      <main className="px-4 pb-10 sm:px-7 lg:px-9">
        <div className="bento-card bg-ivory-card p-8">
          <p className="eyebrow text-[#77756d]">Vista visual</p>
          <h2 className="font-display mt-3 text-2xl font-semibold tracking-[-0.06em]">
            Contenido de referencia para esta pantalla.
          </h2>
          <p className="mt-3 max-w-[38rem] text-sm leading-6 text-[#706e65]">
            {description}
          </p>
          <p className="mt-6 text-[11px] font-bold text-[#a08f4f]">
            Fuera del alcance del sprint 1 — no ejecuta funcionalidad real.
          </p>
        </div>
      </main>
    </div>
  );
}

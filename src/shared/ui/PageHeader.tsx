import type { ReactNode } from 'react';

export interface PageHeaderProps {
  kicker: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

/** Encabezado de sección compartido por las páginas de cada rol (estilo Vivaz Adaptive ). */
export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-6 sm:px-7 sm:pt-9 sm:pb-8 lg:flex-row lg:items-end lg:justify-between lg:px-9">
      {/* Kicker, título y descripción juntos: la descripción no flota sola a la derecha. */}
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="h-[2px] w-6 rounded-full bg-lime" />
          <span className="eyebrow text-[#6c6a62]">{kicker}</span>
        </div>
        <h1 className="font-display text-[2rem] leading-[1.02] font-semibold tracking-[-0.045em] text-balance text-ink sm:text-[2.6rem]">
          {title}
        </h1>
        {description ? (
          <div className="mt-2.5 max-w-2xl text-sm leading-relaxed text-pretty text-[#68675f]">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {actions}
        </div>
      ) : null}
    </section>
  );
}

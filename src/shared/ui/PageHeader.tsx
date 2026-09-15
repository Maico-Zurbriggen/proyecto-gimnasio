import type { ReactNode } from 'react';

export interface PageHeaderProps {
  kicker: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

/** Encabezado de sección compartido por las páginas de cada rol (estilo PULSO). */
export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <section className="flex flex-col justify-between gap-5 px-4 pb-7 pt-7 sm:px-7 sm:pt-9 lg:flex-row lg:items-end lg:px-9 lg:pb-9">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="eyebrow text-[#77756d]">{kicker}</span>
          <span className="h-px w-7 bg-lime" />
        </div>
        <h1 className="font-display text-[2rem] font-semibold leading-[0.95] tracking-[-0.05em] text-ink sm:text-[2.75rem]">
          {title}
        </h1>
      </div>
      {description || actions ? (
        <div className="flex max-w-[26rem] flex-wrap items-center gap-3 text-sm leading-6 text-[#68675f]">
          {description}
          {actions}
        </div>
      ) : null}
    </section>
  );
}

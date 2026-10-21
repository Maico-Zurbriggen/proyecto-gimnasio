import type { ComponentType } from 'react';

import { BentoCard, type BentoTone } from './BentoCard';

export interface StatCardProps {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  tone?: BentoTone;
  className?: string;
}

/** Tarjeta de métrica simple (label + valor + detalle) del sistema Vivaz Adaptive . */
export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'ivory',
  className,
}: StatCardProps) {
  const isDarkTone = tone === 'graphite';
  return (
    <BentoCard tone={tone} className={className}>
      <div className="flex items-start justify-between gap-3">
        <p
          className={`eyebrow ${isDarkTone ? 'text-lime' : 'text-current/65'}`}
        >
          {label}
        </p>
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
            isDarkTone ? 'bg-white/10 text-lime' : 'bg-current/7'
          }`}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="font-display mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
        {value}
      </p>
      <p
        className={`mt-2 text-xs leading-5 ${isDarkTone ? 'text-white/65' : 'text-current/70'}`}
      >
        {detail}
      </p>
    </BentoCard>
  );
}

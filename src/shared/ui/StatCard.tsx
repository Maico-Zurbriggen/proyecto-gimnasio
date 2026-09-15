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

/** Tarjeta de métrica simple (label + valor + detalle) del sistema PULSO. */
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
      <div className="flex items-start justify-between">
        <p className={`eyebrow ${isDarkTone ? 'text-lime' : 'opacity-60'}`}>
          {label}
        </p>
        <Icon className="size-4" />
      </div>
      <p className="font-display mt-8 text-4xl font-semibold tracking-[-0.08em]">
        {value}
      </p>
      <p
        className={`mt-2 text-xs ${isDarkTone ? 'text-white/60' : 'opacity-70'}`}
      >
        {detail}
      </p>
    </BentoCard>
  );
}

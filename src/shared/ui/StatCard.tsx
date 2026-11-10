import type { ComponentType } from 'react';

import { cn } from '../lib/cn';
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
  const isLimeTone = tone === 'lime';
  return (
    <BentoCard
      tone={tone}
      className={cn('flex flex-col justify-between', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={`eyebrow ${isDarkTone ? 'text-lime' : isLimeTone ? 'text-ink/80' : 'text-[#6c6a62]'}`}
        >
          {label}
        </p>
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 hover:scale-105 ${
            isDarkTone
              ? 'bg-white/10 text-lime shadow-xs'
              : isLimeTone
                ? 'bg-black/10 text-ink shadow-xs'
                : 'bg-graphite/6 text-ink shadow-xs'
          }`}
        >
          <Icon className="size-4.5" />
        </span>
      </div>
      <div className="mt-6">
        <p className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {value}
        </p>
        <p
          className={`mt-2 text-xs leading-5 ${isDarkTone ? 'text-white/70' : isLimeTone ? 'text-ink/75' : 'text-[#6c6a62]'}`}
        >
          {detail}
        </p>
      </div>
    </BentoCard>
  );
}

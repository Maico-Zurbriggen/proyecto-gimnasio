import type { HTMLAttributes } from 'react';

import { cn } from '../lib/cn';

export type BentoTone = 'ivory' | 'lime' | 'coral' | 'graphite';

const TONE_CLASS: Record<BentoTone, string> = {
  ivory: 'bento-card text-ink',
  lime: 'bento-card bg-lime text-ink border-black/10 shadow-md',
  coral: 'bento-card bg-coral text-[#382a25] border-black/10 shadow-md',
  graphite:
    'bento-card technical-notch bg-[#1a1a17] text-white border-white/10 shadow-xl',
};

export interface BentoCardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: BentoTone;
}

/** Tarjeta base del sistema visual Vivaz Adaptive . */
export function BentoCard({
  tone = 'ivory',
  className,
  ...props
}: BentoCardProps) {
  return <div className={cn(TONE_CLASS[tone], className)} {...props} />;
}

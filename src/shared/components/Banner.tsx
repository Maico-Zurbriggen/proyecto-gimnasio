import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

export type BannerVariant = 'info' | 'warning' | 'danger';

export interface BannerProps {
  variant: BannerVariant;
  title: string;
  children?: ReactNode;
  /** Acciones adicionales, se muestran en fila junto al botón de descarte. */
  actions?: ReactNode;
  /** Si se define, se muestra un botón de descarte que lo invoca. */
  onDismiss?: () => void;
  dismissLabel?: string;
}

const VARIANT_CLASS: Record<BannerVariant, string> = {
  info: 'border-lime/50 bg-lime-soft text-ink',
  warning: 'border-[#b8790c]/30 bg-[#fdf3e0] text-[#5a3d0c]',
  danger: 'border-coral-strong/30 bg-[#fbe7e5] text-[#7a2a20]',
};

const DISMISS_CLASS: Record<BannerVariant, string> = {
  info: 'border-graphite/20',
  warning: 'border-[#b8790c]/40',
  danger: 'border-coral-strong/40',
};

/** Aviso genérico reutilizable por las features (renovación, datos desactualizados, bloqueo). */
export function Banner({
  variant,
  title,
  children,
  actions,
  onDismiss,
  dismissLabel = 'Descartar',
}: BannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-3 rounded-2xl border p-4 sm:p-5',
        VARIANT_CLASS[variant],
      )}
    >
      <div className="flex flex-col gap-1.5">
        <p className="font-display text-sm font-semibold">{title}</p>
        {children ? (
          <div className="space-y-2 text-sm leading-6 [&_p]:m-0">
            {children}
          </div>
        ) : null}
      </div>
      {actions || onDismiss ? (
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              aria-label={dismissLabel}
              className={cn(
                'rounded-full border bg-transparent px-3.5 py-1.5 text-xs font-bold transition hover:bg-black/5',
                DISMISS_CLASS[variant],
              )}
            >
              {dismissLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

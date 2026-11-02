export interface LoaderProps {
  /** Texto accesible; visible junto al spinner salvo `srOnly`. */
  label: string;
  size?: 'sm' | 'md';
  srOnly?: boolean;
  className?: string;
}

/** Spinner de marca (aro grafito con arco lima) con estado accesible. */
export function Loader({
  label,
  size = 'sm',
  srOnly = false,
  className = '',
}: LoaderProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`loader-ring inline-block shrink-0 rounded-full ${
          size === 'sm' ? 'size-3.5' : 'size-5'
        }`}
      />
      <span className={srOnly ? 'sr-only' : ''}>{label}</span>
    </span>
  );
}

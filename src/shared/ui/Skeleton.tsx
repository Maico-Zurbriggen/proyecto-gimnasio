export type SkeletonVariant = 'text' | 'title' | 'card' | 'avatar' | 'row';

const VARIANTS: Record<SkeletonVariant, string> = {
  text: 'h-3 rounded',
  title: 'h-6 rounded-lg',
  card: 'h-28 rounded-2xl',
  avatar: 'size-10 shrink-0 rounded-full',
  row: 'h-12 rounded-xl',
};

/** Bloque con shimmer sutil; decorativo, oculto a lectores de pantalla. */
export function Skeleton({
  variant = 'text',
  className = '',
}: {
  variant?: SkeletonVariant;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton block max-w-full ${VARIANTS[variant]} ${
        /(^|\s)w-/.test(className)
          ? ''
          : variant === 'title'
            ? 'w-2/3'
            : variant === 'avatar'
              ? ''
              : 'w-full'
      } ${className}`}
    />
  );
}

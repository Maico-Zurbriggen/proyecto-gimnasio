import { Loader } from './Loader';
import { Skeleton } from './Skeleton';

export interface LoadingStateProps {
  label: string;
  variant?: 'inline' | 'card' | 'list' | 'page';
  className?: string;
}

/** Estado de carga con esqueleto acorde a la vista y label accesible. */
export function LoadingState({
  label,
  variant = 'inline',
  className = '',
}: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <Loader label={label} className={`text-sm text-[#5f5d55] ${className}`} />
    );
  }
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`${
        variant === 'page'
          ? 'mx-auto w-full max-w-7xl space-y-4 px-4 pt-7 pb-6 sm:px-7 sm:pt-9 lg:px-9'
          : 'space-y-3'
      } ${className}`}
    >
      <span className="sr-only">{label}</span>
      {variant === 'card' ? (
        <>
          <Skeleton variant="title" />
          <Skeleton variant="text" />
          <Skeleton variant="text" className="w-4/5" />
        </>
      ) : variant === 'list' ? (
        <>
          <Skeleton variant="row" />
          <Skeleton variant="row" />
          <Skeleton variant="row" />
        </>
      ) : (
        <>
          <Skeleton variant="text" className="w-24" />
          <Skeleton variant="title" className="h-10 w-3/4 max-w-md" />
          <Skeleton variant="text" className="w-1/2 max-w-sm" />
          <div className="grid gap-4 pt-4 lg:grid-cols-2">
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </div>
        </>
      )}
    </div>
  );
}

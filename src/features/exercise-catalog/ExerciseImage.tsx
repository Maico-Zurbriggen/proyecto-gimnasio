import { useState, type ReactNode } from 'react';
import { catalogMediaUrl } from '../../api/catalog';

export function ExerciseImage({
  url,
  alt,
  fallback,
}: {
  url: string;
  alt: string;
  fallback?: ReactNode;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || failedUrl === url)
    return (
      fallback ?? (
        <p className="flex min-h-32 items-center justify-center rounded-xl bg-[#eeeede] px-4 text-center text-sm text-[#706e65]">
          Imagen del ejercicio no disponible.
        </p>
      )
    );
  return (
    <img
      src={catalogMediaUrl(url)}
      alt={alt}
      loading="lazy"
      onError={() => setFailedUrl(url)}
      className="aspect-square w-full rounded-xl bg-white object-contain"
    />
  );
}

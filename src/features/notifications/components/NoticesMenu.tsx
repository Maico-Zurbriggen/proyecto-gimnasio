import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  fetchOwnNotices,
  markNoticeRead,
  type Notice,
} from '../../../api/notices';
import type { AppRole } from '../../auth/roles';

export const noticesQueryKey = ['notices', 'me'] as const;

function noticeLink(notice: Notice, role: AppRole): string | null {
  if (notice.referenceType === 'ADAPTATION_PROPOSAL') {
    return role === 'entrenador'
      ? `/entrenador/rutinas/revisar/${notice.referenceId}`
      : role === 'alumno'
        ? '/alumno/rutina'
        : null;
  }
  return null;
}

export function NoticesMenu({ role }: { role: AppRole }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const notices = useQuery({
    queryKey: noticesQueryKey,
    queryFn: ({ signal }) => fetchOwnNotices(signal),
    refetchInterval: 30_000,
  });
  const read = useMutation({
    mutationFn: markNoticeRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: noticesQueryKey }),
  });
  const unread = notices.data?.unreadCount ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notificaciones${unread > 0 ? `, ${unread} sin leer` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex size-9 items-center justify-center rounded-full border border-black/8 bg-white/75 text-[#46443e] transition hover:-translate-y-0.5 hover:bg-white"
      >
        <Bell className="size-4" aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral-strong px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <section
          aria-label="Lista de notificaciones"
          className="absolute right-0 top-11 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-black/10 bg-white p-3 shadow-xl"
        >
          <p className="px-1 text-xs font-bold text-ink">Notificaciones</p>
          {notices.isPending ? <p className="p-3 text-xs">Cargando…</p> : null}
          {notices.error ? (
            <button
              className="btn-secondary btn-sm mt-3"
              onClick={() => void notices.refetch()}
            >
              Reintentar
            </button>
          ) : null}
          {notices.data?.items.length === 0 ? (
            <p className="p-3 text-xs text-[#77756d]">
              No tenés notificaciones activas.
            </p>
          ) : null}
          <ul className="mt-2 max-h-80 divide-y divide-black/8 overflow-y-auto">
            {notices.data?.items.map((notice) => {
              const to = noticeLink(notice, role);
              return (
                <li key={notice.id} className="py-3">
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      {to ? (
                        <Link
                          to={to}
                          onClick={() => setOpen(false)}
                          className="text-xs font-semibold text-ink hover:underline"
                        >
                          {notice.text}
                        </Link>
                      ) : (
                        <p className="text-xs font-semibold text-ink">
                          {notice.text}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-[#77756d]">
                        {new Date(notice.createdAt).toLocaleString('es-AR')}
                      </p>
                    </div>
                    {notice.readAt === null ? (
                      <button
                        type="button"
                        aria-label="Marcar como leída"
                        disabled={read.isPending}
                        onClick={() => read.mutate(notice.id)}
                        className="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
                      >
                        <Check className="size-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  fetchOwnNotices,
  markAllNoticesRead,
  markNoticeRead,
  type Notice,
  type NoticeList,
  type NoticeStatus,
} from '../../../api/notices';
import type { AppRole } from '../../auth/roles';

export const noticesQueryKey = (status: NoticeStatus) =>
  ['notices', 'me', status] as const;

const USER_ROLE_BY_APP_ROLE = {
  alumno: 'ALUMNO',
  entrenador: 'ENTRENADOR',
  admin: 'ADMINISTRADOR',
  superadmin: 'SUPERADMIN',
} as const;

function noticeLink(notice: Notice, activeRole: AppRole): string | null {
  const audienceRole = notice.audienceRole ?? USER_ROLE_BY_APP_ROLE[activeRole];
  if (notice.referenceType === 'ADAPTATION_PROPOSAL') {
    return audienceRole === 'ENTRENADOR'
      ? `/entrenador/rutinas/revisar/${notice.referenceId}`
      : audienceRole === 'ALUMNO'
        ? '/alumno/rutina'
        : null;
  }
  if (notice.referenceType === 'ROUTINE') {
    if (audienceRole === 'ALUMNO') return '/alumno/rutina';
    if (audienceRole === 'ENTRENADOR') return '/entrenador/rutinas';
  }
  if (notice.referenceType === 'ROUTINE_RENEWAL_CYCLE') {
    if (audienceRole === 'ALUMNO') return '/alumno/rutina';
    if (audienceRole === 'ENTRENADOR') return '/entrenador/rutinas';
  }
  return null;
}

export function NoticesMenu({ role }: { role: AppRole }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<NoticeStatus>('unread');
  const queryClient = useQueryClient();
  const notices = useQuery({
    queryKey: noticesQueryKey(status),
    queryFn: ({ signal }) => fetchOwnNotices(status, signal),
    refetchInterval: 30_000,
  });
  const read = useMutation({
    mutationFn: markNoticeRead,
    onMutate: (noticeId) => {
      queryClient.setQueryData<NoticeList>(
        noticesQueryKey(status),
        (current) =>
          current
            ? {
                ...current,
                unreadCount: Math.max(0, current.unreadCount - 1),
                items:
                  status === 'unread'
                    ? current.items.filter((notice) => notice.id !== noticeId)
                    : current.items.map((notice) =>
                        notice.id === noticeId
                          ? { ...notice, readAt: new Date().toISOString() }
                          : notice,
                      ),
              }
            : current,
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['notices', 'me'] }),
  });
  const readAll = useMutation({
    mutationFn: markAllNoticesRead,
    onMutate: () => {
      queryClient.setQueryData<NoticeList>(
        noticesQueryKey('unread'),
        (current) => (current ? { items: [], unreadCount: 0 } : current),
      );
      queryClient.setQueryData<NoticeList>(noticesQueryKey('all'), (current) =>
        current
          ? {
              unreadCount: 0,
              items: current.items.map((notice) => ({
                ...notice,
                readAt: notice.readAt ?? new Date().toISOString(),
              })),
            }
          : current,
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['notices', 'me'] }),
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
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-xs font-bold text-ink">Notificaciones</p>
            {unread > 0 ? (
              <button
                type="button"
                disabled={readAll.isPending}
                onClick={() => readAll.mutate()}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#586d26] hover:underline"
              >
                <CheckCheck className="size-3.5" aria-hidden="true" />
                Marcar todas como leídas
              </button>
            ) : null}
          </div>
          <div className="mt-3 grid grid-cols-2 rounded-xl bg-black/5 p-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setStatus('unread')}
              className={`rounded-lg px-2 py-1.5 ${status === 'unread' ? 'bg-white text-ink shadow-sm' : 'text-[#77756d]'}`}
            >
              Pendientes
            </button>
            <button
              type="button"
              onClick={() => setStatus('all')}
              className={`rounded-lg px-2 py-1.5 ${status === 'all' ? 'bg-white text-ink shadow-sm' : 'text-[#77756d]'}`}
            >
              Historial reciente
            </button>
          </div>
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
              {status === 'unread'
                ? 'No tenés notificaciones pendientes.'
                : 'No tenés notificaciones de los últimos 90 días.'}
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
                          onClick={() => {
                            if (notice.readAt === null) read.mutate(notice.id);
                            setOpen(false);
                          }}
                          className={`text-xs text-ink hover:underline ${notice.readAt === null ? 'font-bold' : 'font-medium'}`}
                        >
                          {notice.text}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (notice.readAt === null) read.mutate(notice.id);
                          }}
                          className={`text-left text-xs text-ink ${notice.readAt === null ? 'font-bold' : 'font-medium'}`}
                        >
                          {notice.text}
                        </button>
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
          {read.error || readAll.error ? (
            <p role="alert" className="field-error mt-2 px-1 text-xs">
              No pudimos actualizar las notificaciones. Volvé a intentarlo.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

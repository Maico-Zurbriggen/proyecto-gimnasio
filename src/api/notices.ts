import { z } from 'zod';

import { apiGet, apiPatch } from './client';

export const noticeSchema = z.object({
  id: z.string().uuid(),
  audienceRole: z
    .enum(['ALUMNO', 'ENTRENADOR', 'ADMINISTRADOR', 'SUPERADMIN'])
    .nullable(),
  type: z.string(),
  referenceType: z.string(),
  referenceId: z.string().uuid(),
  text: z.string(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
});

export const noticeListSchema = z.object({
  items: z.array(noticeSchema),
  unreadCount: z.number().int().nonnegative(),
});

export type Notice = z.infer<typeof noticeSchema>;
export type NoticeList = z.infer<typeof noticeListSchema>;
export type NoticeStatus = 'unread' | 'all';

export async function fetchOwnNotices(
  status: NoticeStatus,
  signal?: AbortSignal,
) {
  return noticeListSchema.parse(
    await apiGet(`/notices?status=${encodeURIComponent(status)}`, { signal }),
  );
}

export async function markAllNoticesRead() {
  return z
    .object({ updatedCount: z.number().int().nonnegative() })
    .parse(await apiPatch('/notices/read-all', undefined));
}

export async function markNoticeRead(noticeId: string) {
  return noticeSchema.parse(
    await apiPatch(`/notices/${encodeURIComponent(noticeId)}/read`, undefined),
  );
}

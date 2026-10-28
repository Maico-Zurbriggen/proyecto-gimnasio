import { z } from 'zod';

import { apiGet, apiPatch } from './client';

export const noticeSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  referenceType: z.string(),
  referenceId: z.string().uuid(),
  text: z.string(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
});

const noticeListSchema = z.object({
  items: z.array(noticeSchema),
  unreadCount: z.number().int().nonnegative(),
});

export type Notice = z.infer<typeof noticeSchema>;

export async function fetchOwnNotices(signal?: AbortSignal) {
  return noticeListSchema.parse(await apiGet('/notices', { signal }));
}

export async function markNoticeRead(noticeId: string) {
  return noticeSchema.parse(
    await apiPatch(`/notices/${encodeURIComponent(noticeId)}/read`, undefined),
  );
}

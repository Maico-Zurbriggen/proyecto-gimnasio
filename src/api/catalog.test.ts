import { afterEach, describe, expect, it, vi } from 'vitest';
import { listCatalog, setAvailability } from './catalog';
import { ApiError } from './client';
afterEach(() => vi.unstubAllGlobals());
describe('Generated catalogue client', () => {
  it('serializes filters and optimistic revisions and sends session credentials', async () => {
    const requests: Request[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        requests.push(request);
        return Response.json(
          request.method === 'GET'
            ? { items: [], total: 0, page: 2, pageSize: 24 }
            : { changed: 1 },
        );
      }),
    );
    await listCatalog({ page: 2, enabled: 'true', search: 'press con barra' });
    expect(new URL(requests[0]!.url).searchParams.get('search')).toBe(
      'press con barra',
    );
    expect(requests[0]!.credentials).toBe('include');
    await setAvailability([
      {
        exerciseId: '12345678-1234-4234-8234-123456789012',
        enabled: false,
        expectedRevision: 8,
      },
    ]);
    expect(await requests[1]!.json()).toEqual({
      changes: [
        {
          exerciseId: '12345678-1234-4234-8234-123456789012',
          enabled: false,
          expectedRevision: 8,
        },
      ],
    });
  });
  it('preserves actionable conflict codes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ error: 'availability_conflict' }, { status: 409 }),
      ),
    );
    await expect(
      setAvailability([
        { exerciseId: 'id', enabled: true, expectedRevision: null },
      ]),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

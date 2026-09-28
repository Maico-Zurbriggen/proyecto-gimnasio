import { useQuery } from '@tanstack/react-query';

import { fetchOwnMeasurementBlock } from '../../../api/students';

export const ownMeasurementBlockQueryKey = [
  'students',
  'me',
  'measurement-block',
] as const;

export function useOwnMeasurementBlock() {
  return useQuery({
    queryKey: ownMeasurementBlockQueryKey,
    queryFn: ({ signal }) => fetchOwnMeasurementBlock(signal),
  });
}

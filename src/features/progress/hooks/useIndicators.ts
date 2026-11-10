import { useQuery } from '@tanstack/react-query';

import {
  fetchAdherence,
  fetchMuscleActivity,
  fetchSessionCompliance,
  fetchSignals,
} from '../../../api/indicators';

export const adherenceQueryKey = (studentId: string) =>
  ['indicators', 'adherence', studentId] as const;

export const sessionComplianceQueryKey = (
  studentId: string,
  sessionId: string,
) => ['indicators', 'compliance', studentId, sessionId] as const;

export const muscleActivityQueryKey = (
  studentId: string,
  from: string,
  to: string,
) => ['indicators', 'muscle-activity', studentId, from, to] as const;

export const signalsQueryKey = (studentId: string) =>
  ['indicators', 'signals', studentId] as const;

export function useAdherence(studentId: string) {
  return useQuery({
    queryKey: adherenceQueryKey(studentId),
    queryFn: ({ signal }) => fetchAdherence(studentId, signal),
    enabled: Boolean(studentId),
  });
}

export function useSessionCompliance(studentId: string, sessionId: string) {
  return useQuery({
    queryKey: sessionComplianceQueryKey(studentId, sessionId),
    queryFn: ({ signal }) =>
      fetchSessionCompliance(studentId, sessionId, signal),
    enabled: Boolean(studentId && sessionId),
  });
}

export function useMuscleActivity(
  studentId: string,
  period: { from: string; to: string },
) {
  return useQuery({
    queryKey: muscleActivityQueryKey(studentId, period.from, period.to),
    queryFn: ({ signal }) => fetchMuscleActivity(studentId, period, signal),
    enabled: Boolean(studentId && period.from && period.to),
  });
}

export function useSignals(studentId: string) {
  return useQuery({
    queryKey: signalsQueryKey(studentId),
    queryFn: ({ signal }) => fetchSignals(studentId, signal),
    enabled: Boolean(studentId),
  });
}

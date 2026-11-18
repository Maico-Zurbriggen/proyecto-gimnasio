import {
  adaptationDemoListSchema,
  adaptationDemoResultSchema,
  adaptationDemoRestoreSchema,
  type AdaptationDemoScenario,
} from './generated/adaptation-demo';
import { apiGet, apiPost } from './client';

export async function listAdaptationDemoStudents(signal?: AbortSignal) {
  return adaptationDemoListSchema.parse(
    await apiGet('/demo/adaptations', { signal }),
  ).students;
}
export async function prepareAdaptationDemo(
  studentId: string,
  scenario: AdaptationDemoScenario,
) {
  return adaptationDemoResultSchema.parse(
    await apiPost(`/demo/adaptations/${encodeURIComponent(studentId)}`, {
      scenario,
    }),
  );
}
export async function restoreAdaptationDemo(studentId: string) {
  return adaptationDemoRestoreSchema.parse(
    await apiPost(
      `/demo/adaptations/${encodeURIComponent(studentId)}/restore`,
      {},
    ),
  );
}

import type { StepResult } from "../type/types";

// 검사 도중 홈으로 나갔다가 "이어하기" 로 돌아왔을 때, 백엔드 GET /inspection/:id 가
// 저장된 measuredValue/imageUrl 을 항상 즉시 반환한다고 보장할 수 없다.
// 진행 상태를 로컬에 별도로 캐싱해 두면 detail 응답이 비어 있어도 sessionResults 로 복원해
// 다음 미완료 dim 부터 이어 시작할 수 있다.
const STORAGE_PREFIX = "inspection-progress-";

function key(inspectionId: number): string {
  return `${STORAGE_PREFIX}${inspectionId}`;
}

export function readProgress(inspectionId: number): StepResult[] {
  if (!Number.isFinite(inspectionId) || inspectionId <= 0) return [];
  try {
    const raw = localStorage.getItem(key(inspectionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StepResult[];
  } catch {
    return [];
  }
}

export function writeProgress(
  inspectionId: number,
  results: StepResult[],
): void {
  if (!Number.isFinite(inspectionId) || inspectionId <= 0) return;
  try {
    if (results.length === 0) {
      localStorage.removeItem(key(inspectionId));
      return;
    }
    localStorage.setItem(key(inspectionId), JSON.stringify(results));
  } catch {
    // quota 초과 등 — 캐시는 보조용이므로 실패해도 무시.
  }
}

export function clearProgress(inspectionId: number): void {
  if (!Number.isFinite(inspectionId) || inspectionId <= 0) return;
  try {
    localStorage.removeItem(key(inspectionId));
  } catch {
    // 무시.
  }
}

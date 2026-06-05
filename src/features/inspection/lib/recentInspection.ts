// 사용자가 마지막으로 진입한 자주검사 id 추적.
// 탭바의 "품질검사시스템" (=/scan) 으로 돌아왔을 때 가장 최근 작업으로 복귀시키는 용도.
const KEY = "recent-inspection-id";

export function setRecentInspectionId(id: number): void {
  if (!Number.isFinite(id) || id <= 0) return;
  try {
    localStorage.setItem(KEY, String(id));
  } catch {
    // 무시 — 추적 실패해도 기능 자체가 죽진 않음.
  }
}

export function getRecentInspectionId(): number | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function clearRecentInspectionId(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 무시.
  }
}

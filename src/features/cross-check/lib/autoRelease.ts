import { useEffect, useState, useSyncExternalStore } from "react";
import { parseServerDate } from "../../../lib/datetime";

// 서버는 담당자가 마지막으로 저장한 뒤 15분 동안 저장이 없으면 담당을 비운다(측정값은 유지).
// 상세 응답의 autoReleaseAt 이 그 시각인데, 측정 흐름 중엔 상세를 다시 읽지 않으므로
// (useSaveCrossCheckResults 주석) 저장 성공 시각을 여기 따로 적어 두고 그걸로 연장한다.
export const AUTO_RELEASE_MS = 15 * 60 * 1000;
// 남은 시간이 이 이하일 때만 안내를 띄운다.
export const AUTO_RELEASE_WARN_MS = 5 * 60 * 1000;

const savedAt = new Map<number, number>();
const listeners = new Set<() => void>();

export function markCrossCheckSaved(crossCheckId: number) {
  savedAt.set(crossCheckId, Date.now());
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// 자동으로 넘어가기까지 남은 시간(ms). 알 수 없으면 null, 이미 넘어갔으면 0 이하.
export function useAutoReleaseRemaining(
  crossCheckId: number,
  autoReleaseAt: string | null | undefined,
): number | null {
  const lastSaved = useSyncExternalStore(subscribe, () =>
    savedAt.get(crossCheckId),
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const fromServer = autoReleaseAt ? parseServerDate(autoReleaseAt).getTime() : NaN;
  const fromSave = lastSaved != null ? lastSaved + AUTO_RELEASE_MS : NaN;
  const deadline = Math.max(
    Number.isNaN(fromServer) ? -Infinity : fromServer,
    Number.isNaN(fromSave) ? -Infinity : fromSave,
  );
  return Number.isFinite(deadline) ? deadline - now : null;
}

import { useCallback, useState } from "react";

const KEY = "cross-check:process-filter";

/**
 * 순회검사 목록의 공정 필터.
 *
 * 선택 상태는 서버에 저장하지 않고 이 기기에만 둔다 — 순회검사자마다 맡은 공정이
 * 다르고, 한 번 고르면 계속 그 공정만 보는 흐름이라 새로고침해도 유지돼야 한다.
 * 빈 배열은 "전체 공정"이고, 그 경우 요청에 process 파라미터를 아예 싣지 않는다.
 */
function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    // 저장소를 못 읽는 환경(사파리 프라이빗 등)에서도 화면은 떠야 한다.
    return [];
  }
}

function write(processes: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(processes));
  } catch {
    // 저장 실패는 무시 — 이번 세션 동안은 화면 상태로만 유지된다.
  }
}

export function useProcessFilter(): [string[], (next: string[]) => void] {
  const [processes, setProcesses] = useState<string[]>(read);

  const update = useCallback((next: string[]) => {
    setProcesses(next);
    write(next);
  }, []);

  return [processes, update];
}

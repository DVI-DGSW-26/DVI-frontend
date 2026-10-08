import { useEffect, useRef, useState } from "react";

/** 사람이 멈춰 둔 화면이 저절로 다시 도는 데까지 걸리는 시간. */
export const AUTO_RELEASE_MS = 2 * 60 * 1000;

/**
 * 멈춤 상태를 일정 시간 뒤 저절로 푼다. 남은 시간(ms)을 돌려준다 — 멈춰 있지 않으면 null.
 *
 * 벽 화면은 멈춰 둔 사람이 자리를 뜨면 아무도 풀지 않는다. 그대로 두면 다음 사람은
 * 고장으로 보거나, 지난 화면을 지금 상황으로 읽는다. 그래서 멈춤은 늘 시한부로 걸고,
 * 남은 시간을 화면에 보여 "곧 다시 돈다"는 걸 알린다.
 *
 * 멈춘 채로 다시 조작하면(restartKey 변경) 시간을 처음부터 다시 잰다 — 보고 있는
 * 사람이 있다는 뜻이다.
 */
export function useAutoRelease(
  active: boolean,
  release: () => void,
  restartKey: unknown = null,
  ms = AUTO_RELEASE_MS,
): number | null {
  const [remaining, setRemaining] = useState(ms);
  const releaseRef = useRef(release);
  useEffect(() => {
    releaseRef.current = release;
  });

  useEffect(() => {
    if (!active) return;
    const deadline = Date.now() + ms;
    const update = () => setRemaining(Math.max(0, deadline - Date.now()));
    // 첫 값도 콜백에서 채운다 — 직전 멈춤의 남은 시간이 한순간 보이지 않게 바로 돌린다.
    const first = setTimeout(update, 0);
    const tick = setInterval(update, 1000);
    const done = setTimeout(() => releaseRef.current(), ms);
    return () => {
      clearTimeout(first);
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [active, ms, restartKey]);

  return active ? remaining : null;
}

/** 남은 시간을 "1:42" 꼴로. */
export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

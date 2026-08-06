import { useCallback, useEffect, useState } from "react";

export interface PagedList<T> {
  page: number;
  pageCount: number;
  visible: T[];
  /** 자동 넘김이 멈춰 있는지. */
  paused: boolean;
  /** 자동 넘김 멈춤/재개. */
  togglePause: () => void;
  /** 수동으로 한 페이지 뒤로 (끝에서 순환). */
  prev: () => void;
  /** 수동으로 한 페이지 앞으로 (끝에서 순환). */
  next: () => void;
}

/**
 * 목록을 페이지로 잘라 일정 간격으로 자동으로 넘긴다.
 *
 * 벽걸이 모니터는 아무도 스크롤하지 않는다. 화면에 안 들어가는 항목을 "외 N건 더"로만
 * 알리면 그 N건은 영영 못 본다. 그래서 넘치는 만큼 페이지를 만들어 돌린다.
 * 한 페이지뿐이면 타이머를 걸지 않는다.
 *
 * 자동 넘김만으로는 "방금 지나간 줄을 다시 보고 싶다"를 할 수 없어 멈춤과 수동 이동을
 * 함께 둔다. 멈춤 상태는 이 훅 인스턴스 안에만 있다 — 목록마다 따로 멈추고, 저장하거나
 * 공유하지 않으므로 한 화면에서 멈춰도 다른 화면은 계속 돈다.
 *
 * 데이터가 줄어 현재 페이지가 범위를 벗어나면 렌더 시점에 첫 페이지로 접는다
 * (state 를 되돌리는 effect 를 두면 불필요한 연쇄 렌더가 생긴다). 다음 타이머가
 * 돌 때 (p + 1) % pageCount 로 색인 자체도 범위 안으로 들어온다.
 */
export function usePagedList<T>(
  items: T[],
  pageSize: number,
  intervalMs = 8000,
): PagedList<T> {
  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  // 수동으로 넘긴 직후 타이머를 다시 걸기 위한 값 — 방금 넘긴 페이지가 남은 시간
  // 몇백 ms 만에 지나가버리면 눌러도 못 읽는다.
  const [nudge, setNudge] = useState(0);

  useEffect(() => {
    if (paused || pageCount <= 1) return;
    const id = setInterval(
      () => setPage((p) => (p + 1) % pageCount),
      intervalMs,
    );
    return () => clearInterval(id);
    // pageCount 가 바뀌면 타이머를 다시 건다 — 페이지 수가 준 채로 도는 것 방지.
  }, [pageCount, intervalMs, paused, nudge]);

  const go = useCallback(
    (delta: number) => {
      setPage((p) => (p + delta + pageCount) % pageCount);
      setNudge((n) => n + 1);
    },
    [pageCount],
  );

  const prev = useCallback(() => go(-1), [go]);
  const next = useCallback(() => go(1), [go]);
  const togglePause = useCallback(() => setPaused((v) => !v), []);

  const safePage = page < pageCount ? page : 0;
  return {
    page: safePage,
    pageCount,
    visible: items.slice(safePage * size, safePage * size + size),
    paused,
    togglePause,
    prev,
    next,
  };
}

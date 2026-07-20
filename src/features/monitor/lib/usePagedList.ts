import { useEffect, useState } from "react";

/**
 * 목록을 페이지로 잘라 일정 간격으로 자동으로 넘긴다.
 *
 * 벽걸이 모니터는 아무도 스크롤하거나 누르지 않는다. 화면에 안 들어가는 항목을
 * "외 N건 더"로만 알리면 그 N건은 영영 못 본다. 그래서 넘치는 만큼 페이지를 만들어
 * 돌린다. 한 페이지뿐이면 타이머를 걸지 않는다.
 *
 * 데이터가 줄어 현재 페이지가 범위를 벗어나면 렌더 시점에 첫 페이지로 접는다
 * (state 를 되돌리는 effect 를 두면 불필요한 연쇄 렌더가 생긴다). 다음 타이머가
 * 돌 때 (p + 1) % pageCount 로 색인 자체도 범위 안으로 들어온다.
 */
export function usePagedList<T>(
  items: T[],
  pageSize: number,
  intervalMs = 8000,
) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (pageCount <= 1) return;
    const id = setInterval(
      () => setPage((p) => (p + 1) % pageCount),
      intervalMs,
    );
    return () => clearInterval(id);
    // pageCount 가 바뀌면 타이머를 다시 건다 — 페이지 수가 준 채로 도는 것 방지.
  }, [pageCount, intervalMs]);

  const safePage = page < pageCount ? page : 0;
  return {
    page: safePage,
    pageCount,
    visible: items.slice(safePage * pageSize, safePage * pageSize + pageSize),
  };
}

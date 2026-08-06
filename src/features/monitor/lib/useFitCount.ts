import { useLayoutEffect, useState, type RefObject } from "react";

interface FitOptions {
  /** 채우는 방향. 세로로 쌓는 줄은 "y", 가로로 늘어놓는 칩은 "x". */
  axis?: "y" | "x";
  /** 항목 사이 간격(px). */
  gap?: number;
  /** 가로로 늘어놓을 때 몇 줄까지 쓸지. */
  lines?: number;
  /** 아무리 좁아도 최소 이만큼은 그린다. */
  min?: number;
}

/**
 * 컨테이너에 항목이 몇 개 들어가는지 실제 크기에서 구한다.
 *
 * 벽 화면은 스크롤이 없어 "화면에 들어가는 만큼"이 곧 한 페이지다. 그 수를 상수로
 * 박아두면 모니터 해상도가 조금만 달라져도 잘리거나 빈 공간이 남는다.
 *
 * 항목 크기를 인자로 받아 계산만 한다 — 그려본 결과를 다시 재지 않으므로
 * 측정 → 렌더 → 재측정이 서로를 밀어내는 진동이 생기지 않는다. 대신 호출부가
 * 항목 크기를 실제로 그 값에 고정해야 한다.
 */
export function useFitCount(
  ref: RefObject<HTMLElement | null>,
  itemSize: number,
  { axis = "y", gap = 0, lines = 1, min = 1 }: FitOptions = {},
): number {
  const [count, setCount] = useState(min);

  // 그린 뒤에 재면 첫 프레임에 한 줄만 있다가 늘어나는 게 보인다 — 그리기 전에 잰다.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const avail = axis === "y" ? el.clientHeight : el.clientWidth;
      // n 개가 차지하는 크기 = n*itemSize + (n-1)*gap → n = (avail + gap) / (itemSize + gap)
      const per = Math.floor((avail + gap) / (itemSize + gap));
      setCount(Math.max(min, per * lines));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, itemSize, axis, gap, lines, min]);

  return count;
}

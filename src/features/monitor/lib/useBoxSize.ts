import { useLayoutEffect, useState, type RefObject } from "react";

export interface BoxSize {
  width: number;
  height: number;
}

const EMPTY: BoxSize = { width: 0, height: 0 };

/**
 * 요소의 실제 크기. 남은 공간에 맞춰 줄 높이·열 수를 정하는 계산에 쓴다.
 *
 * useFitCount 는 "항목 크기가 정해져 있을 때 몇 개 들어가나"를 구하지만, 여기서는
 * 반대로 "항목이 이만큼일 때 높이를 얼마로 줄여야 다 들어가나"를 구해야 해서 크기
 * 자체가 필요하다.
 */
export function useBoxSize(ref: RefObject<HTMLElement | null>): BoxSize {
  const [size, setSize] = useState<BoxSize>(EMPTY);

  // 그린 뒤에 재면 첫 프레임이 한 번 깜빡인다 — 그리기 전에 잰다.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () =>
      setSize((prev) =>
        prev.width === el.clientWidth && prev.height === el.clientHeight
          ? prev
          : { width: el.clientWidth, height: el.clientHeight },
      );

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

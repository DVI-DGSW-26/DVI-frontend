import type { BoxSize } from "./useBoxSize";

// 벽 화면은 "넘겨서 보는" 화면이 아니다 — 한 번에 다 보이는 게 가장 좋다.
// 그래서 줄 높이를 고정해 두고 넘치면 페이지로 넘기는 대신, 줄 수에 맞춰 높이를 줄이고
// 그래도 모자라면 두 단으로 나눈다. 페이지 넘김은 그 다음 수단이다.

/** 줄 높이 상한 — 줄이 적을 때 쓸데없이 커지지 않게 막는다. */
export const ROW_HEIGHT_MAX = 158;
/** 줄 높이 하한 — 이보다 낮추면 막대와 글자가 벽에서 안 읽힌다. */
export const ROW_HEIGHT_MIN = 104;
/** 이 높이 아래로는 줄 내부를 압축 배치로 바꾼다. */
export const ROW_COMPACT_BELOW = 132;
/** 두 단으로 나눌 수 있는 최소 너비 — 한 단이 좁아지면 시점 칸 글자가 깨진다. */
export const TWO_COLUMN_MIN_WIDTH = 1500;

export interface RowLayout {
  /** 줄을 몇 단으로 늘어놓을지 (1 또는 2). */
  columns: number;
  /** 줄 하나의 높이(px). */
  rowHeight: number;
  /** 한 페이지에 들어가는 줄 수 — 전체가 들어가면 페이저는 저절로 사라진다. */
  perPage: number;
  /** 줄 내부를 압축 배치로 그릴지. */
  compact: boolean;
}

/**
 * 줄 수와 남은 공간으로 "몇 단 × 몇 px" 를 정한다.
 *
 *   1) 한 단에 상한 높이로 다 들어가면 그대로 둔다.
 *   2) 안 들어가면 하한까지 높이를 줄인다.
 *   3) 그래도 모자라고 화면이 넓으면 두 단으로 나눈다.
 *   4) 두 단으로도 모자랄 때만 페이지로 넘긴다.
 */
export function fitRows(count: number, box: BoxSize): RowLayout {
  // 아직 못 잰 상태 — 상한으로 한 줄만 그려 두고 다음 측정에서 제자리를 찾는다.
  if (box.height <= 0 || count <= 0) {
    return {
      columns: 1,
      rowHeight: ROW_HEIGHT_MAX,
      perPage: 1,
      compact: false,
    };
  }

  const canSplit = box.width >= TWO_COLUMN_MIN_WIDTH;
  const fitsInOne = count * ROW_HEIGHT_MIN <= box.height;
  const columns = canSplit && !fitsInOne ? 2 : 1;

  const perColumn = Math.ceil(count / columns);
  const ideal = Math.floor(box.height / perColumn);
  const rowHeight = Math.min(
    ROW_HEIGHT_MAX,
    Math.max(ROW_HEIGHT_MIN, ideal),
  );

  const rowsPerColumn = Math.max(1, Math.floor(box.height / rowHeight));
  return {
    columns,
    rowHeight,
    perPage: rowsPerColumn * columns,
    compact: rowHeight < ROW_COMPACT_BELOW,
  };
}

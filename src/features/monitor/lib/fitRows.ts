import type { BoxSize } from "./useBoxSize";

// 벽 화면은 "넘겨서 보는" 화면이 아니다 — 한 번에 다 보이는 게 가장 좋다.
// 그래서 줄 높이를 고정해 두고 넘치면 페이지로 넘기는 대신, 줄 수에 맞춰 높이를 줄이고
// 그래도 모자라면 두 단으로 나눈다. 페이지 넘김은 그 다음 수단이다.

/** 줄 높이 상한 — 줄이 적을 때 쓸데없이 커지지 않게 막는다. */
export const ROW_HEIGHT_MAX = 158;
/**
 * 줄 높이 하한 — 이보다 낮추면 막대와 글자가 벽에서 안 읽힌다.
 *
 * 압축 배치일 때 줄 하나가 실제로 쓰는 높이(제목 28 + 여백 6 + 자주 막대 34 +
 * 여백 4 + 순회 막대 26 = 98)에 맞춰 잡았다. 줄은 세로 가운데 정렬에 넘침을
 * 자르므로 몇 px 모자라도 위아래 여백만 깎인다.
 */
export const ROW_HEIGHT_MIN = 96;
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

  // 한 단으로 둘지는 "최소 높이로 들어가나"가 아니라 "넉넉한 높이로 들어가나"로 정한다.
  // 최소 높이를 기준으로 삼으면 넓은 화면일수록 한 단에 욱여넣어, 가로는 남아도는데
  // 줄만 납작해진다 — 벽걸이에서 제일 피해야 할 그림이다.
  const canSplit = box.width >= TWO_COLUMN_MIN_WIDTH;
  const fitsInOne = count * ROW_COMPACT_BELOW <= box.height;
  const columns = canSplit && !fitsInOne ? 2 : 1;

  const perColumn = Math.ceil(count / columns);
  // 전부 한 화면에 담으려면 줄 하나가 이만큼이 된다.
  const ideal = Math.floor(box.height / perColumn);

  // 하한 위로 떨어지면 그 높이로 전부 보여준다 — 줄을 낮추는 쪽이 페이지로 넘기는
  // 쪽보다 언제나 낫다. 예전에는 하한을 밑돌면 높이를 하한으로 "올려" 버려서,
  // 칸이 몇 px 모자란 것만으로 줄 하나가 통째로 다음 페이지로 밀렸다.
  if (ideal >= ROW_HEIGHT_MIN) {
    const rowHeight = Math.min(ROW_HEIGHT_MAX, ideal);
    return {
      columns,
      rowHeight,
      perPage: perColumn * columns,
      compact: rowHeight < ROW_COMPACT_BELOW,
    };
  }

  // 하한까지 낮춰도 안 들어간다 — 여기서부터 페이지로 넘긴다. 넘길 때도 남는 높이는
  // 남겨 두지 않고 보이는 줄들이 나눠 갖는다.
  const rowsPerColumn = Math.max(1, Math.floor(box.height / ROW_HEIGHT_MIN));
  const rowHeight = Math.min(
    ROW_HEIGHT_MAX,
    Math.floor(box.height / rowsPerColumn),
  );
  return {
    columns,
    rowHeight,
    perPage: rowsPerColumn * columns,
    compact: rowHeight < ROW_COMPACT_BELOW,
  };
}

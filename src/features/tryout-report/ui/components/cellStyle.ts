// 엑셀식 표 칸의 공통 모양. 칸 높이를 모두 같게 두고, 고른 칸은 은은한 바탕 + 얇은 안쪽 테두리로만 표시한다
// (굵은 테두리는 칸 밖으로 튀어나와 보여 표가 흔들려 보인다).
export const CELL_HEIGHT_PX = 40;
export const CELL_FOCUS_BG = "var(--color-brand-soft)";
export const CELL_FOCUS_RING = "inset 0 0 0 1px var(--color-brand)";
export const CELL_FOCUS = "focus:outline-none focus:bg-brand-soft focus:shadow-[inset_0_0_0_1px_var(--color-brand)]";
// 버튼처럼 누르는 칸(OK/NG, 종합평가)은 마우스로 눌렀을 때 테두리가 뜨면 거슬린다 — 키보드로 옮겨 왔을 때만 보인다.
export const CELL_FOCUS_VISIBLE =
  "focus:outline-none focus-visible:bg-brand-soft focus-visible:shadow-[inset_0_0_0_1px_var(--color-brand)]";

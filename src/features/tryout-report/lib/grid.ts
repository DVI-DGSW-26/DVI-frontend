import type { TryoutItemResult } from "../api/types";
import type { ItemDraft } from "./formState";
import { parseStandardNotation, type StandardDraft } from "./standard";

// 항목 표를 엑셀처럼 다루기 위한 칸 규칙. 열 순서는 화면 왼쪽부터.
export type GridCol = "standard" | "lower" | "upper" | "measured" | "result" | "note";

export const GRID_COLS: readonly GridCol[] = ["standard", "lower", "upper", "measured", "result", "note"];

/** 행에서 입력할 수 있는 칸. 숫자 행의 OK/NG 는 화면이 판정하고, 에칭 사진 칸은 키보드 이동 대상이 아니다. */
export function editableCols(row: Pick<ItemDraft, "valueType">): GridCol[] {
  return row.valueType === "NUMBER"
    ? ["standard", "lower", "upper", "measured", "note"]
    : ["result", "note"];
}

/**
 * 엑셀에서 복사한 글(탭·줄바꿈 구분) → 칸 배열. 마지막 줄바꿈은 버린다.
 * 셀 안 줄바꿈 때문에 따옴표로 감싼 값은 따옴표를 벗긴다.
 */
export function parseClipboard(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines.map((line) =>
    line.split("\t").map((cell) => {
      const c = cell.trim();
      return c.length >= 2 && c.startsWith('"') && c.endsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c;
    }),
  );
}

/** OK/NG 칸에 친 글. 빈칸은 선택 해제(null), 알 수 없는 글은 undefined(무시). */
export function parseResultText(text: string): TryoutItemResult | null | undefined {
  const s = text.trim().toUpperCase();
  if (s === "") return null;
  if (["OK", "O", "○", "양호", "합격", "PASS"].includes(s)) return "OK";
  if (["NG", "X", "×", "불량", "불합격", "FAIL"].includes(s)) return "NG";
  return undefined;
}

/** 기준 칸에 들어온 글 — 현장 표기면 세 칸으로 풀고, 아니면 기준 칸만 바꾼다. */
export function standardFromText(current: StandardDraft, text: string): StandardDraft {
  return parseStandardNotation(text) ?? { ...current, standard: text };
}

/**
 * 붙여넣기 — (startRow, startCol) 칸부터 오른쪽·아래로 채운다. 엑셀과 같이 붙여넣은 칸 수만큼 열이 밀리고,
 * 그 행에 없는 칸(예: OK/NG 형 행의 실측값)은 건너뛴다. 표 끝을 넘는 줄은 버린다.
 */
export function pasteIntoRows(
  rows: ItemDraft[],
  startRow: number,
  startCol: GridCol,
  cells: string[][],
): Record<string, Partial<ItemDraft>> {
  const patches: Record<string, Partial<ItemDraft>> = {};
  const colStart = GRID_COLS.indexOf(startCol);
  cells.forEach((line, i) => {
    const row = rows[startRow + i];
    if (!row) return;
    const allowed = editableCols(row);
    const patch: Partial<ItemDraft> = {};
    let standard = row.standard;
    // 기준 칸에서 현장 표기를 풀었으면, 같은 줄의 빈 하한·상한 칸이 그 값을 지우지 않게 한다.
    let fromNotation = false;
    line.forEach((value, j) => {
      const col = GRID_COLS[colStart + j];
      if (!col || !allowed.includes(col)) return;
      switch (col) {
        case "standard": {
          const parsed = parseStandardNotation(value);
          fromNotation = parsed != null;
          standard = parsed ?? { ...standard, standard: value };
          break;
        }
        case "lower":
        case "upper":
          if (fromNotation && value === "") break;
          standard = { ...standard, [col]: value };
          break;
        case "measured":
          patch.measured = value;
          break;
        case "result": {
          const r = parseResultText(value);
          if (r !== undefined) patch.result = r;
          break;
        }
        case "note":
          patch.note = value;
          break;
      }
    });
    if (standard !== row.standard) patch.standard = standard;
    if (Object.keys(patch).length > 0) patches[row.key] = patch;
  });
  return patches;
}

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import type { TryoutItemResult } from "../../api/types";
import { judgeTryout } from "../../lib/judge";
import { readNumberRow, type ItemDraft, type ItemError } from "../../lib/formState";
import {
  editableCols,
  parseClipboard,
  pasteIntoRows,
  standardFromText,
  type GridCol,
} from "../../lib/grid";
import { parseStandardNotation } from "../../lib/standard";
import PhotoInput from "./PhotoInput";
import { CELL_FOCUS } from "./cellStyle";
import { ItemResultBadge } from "./ResultBadges";
import { useAuth } from "../../../auth/AuthContext";
import { hasRole } from "../../../auth/roles";
import { itemLabel, sheetItemLabel, stepLabel, stepSpans } from "./labels";

interface Props {
  rows: ItemDraft[];
  errors: Record<string, ItemError>;
  mode: "create" | "edit";
  onRowChange: (key: string, patch: Partial<ItemDraft>) => void;
  onUploadingChange: (key: string, uploading: boolean) => void;
}

// 엑셀처럼 쓰는 항목 표.
//   - 화살표·Enter 로 칸을 옮긴다(좌우 화살표는 커서가 글 끝에 있을 때만).
//   - 엑셀에서 복사한 여러 칸을 붙여넣으면 고른 칸부터 오른쪽·아래로 채운다.
//   - 기준 칸에 "38 이하", "2.5~3.5" 같은 표기를 쓰면 기준·하한·상한으로 풀어 준다.
// 칸마다 data-cell="행번호:열" 을 달아 이동과 붙여넣기 위치를 찾는다.

const cellId = (r: number, col: GridCol) => `${r}:${col}`;

function readCell(el: Element | null): { r: number; col: GridCol } | null {
  const id = el?.closest("[data-cell]")?.getAttribute("data-cell");
  if (!id) return null;
  const [r, col] = id.split(":");
  return { r: Number(r), col: col as GridCol };
}

function ResultCell({
  value,
  cell,
  onChange,
}: {
  value: TryoutItemResult | null;
  cell: string;
  onChange: (v: TryoutItemResult | null) => void;
}) {
  const { t } = useTranslation("tryoutReport");
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onChange(null);
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      onChange(value === "OK" ? "NG" : value === "NG" ? null : "OK");
      return;
    }
    // O → OK, N·X → NG. 한글 자판이어도 같은 자리를 누르면 되게 ㅐ·ㅜ·ㅌ 도 받는다.
    const key = e.key.toLowerCase();
    const r = ["o", "ㅐ"].includes(key) ? "OK" : ["n", "x", "ㅜ", "ㅌ"].includes(key) ? "NG" : null;
    if (r && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      onChange(r);
    }
  };
  return (
    <div
      data-cell={cell}
      tabIndex={0}
      role="group"
      aria-label={t("columns.result")}
      onKeyDown={onKeyDown}
      className={`flex h-10 items-center justify-center gap-1 ${CELL_FOCUS}`}
    >
      {(["OK", "NG"] as const).map((v) => {
        const active = value === v;
        const tone = v === "OK" ? "bg-[#15803D]" : "bg-[#B91C1C]";
        return (
          <button
            key={v}
            type="button"
            tabIndex={-1}
            aria-pressed={active}
            // 다시 누르면 선택을 지운다 — 아직 확인하지 않은 상태로 되돌릴 수 있어야 한다.
            onClick={() => onChange(active ? null : v)}
            className={`h-6 w-9 rounded text-[11px] font-semibold ${
              active ? `${tone} text-white` : "bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#212121]"
            }`}
          >
            {t(`result.${v}`)}
          </button>
        );
      })}
    </div>
  );
}

function NumberPreview({ row }: { row: ItemDraft }) {
  const { t } = useTranslation("tryoutReport");
  const { standard, measured } = readNumberRow(row);
  if ("error" in standard || measured === "invalid") return <ItemResultBadge value={null} />;
  const v = standard.value;
  const result = judgeTryout(v, measured);
  if (result == null && measured != null && v.standardValue != null && v.toleranceLower == null && v.toleranceUpper == null) {
    return (
      <span className="text-[11px] text-[#A8A8A8]" title={t("form.noToleranceHint")}>
        {t("form.noJudge")}
      </span>
    );
  }
  return <ItemResultBadge value={result} />;
}

export default function ItemFormTable({ rows, errors, mode, onRowChange, onUploadingChange }: Props) {
  const { t } = useTranslation("tryoutReport");
  const { user } = useAuth();
  const tableRef = useRef<HTMLTableElement>(null);
  // 양식처럼 SCRAP 전반부 앞에 "SCRAP 절단길이" 묶음 줄을 끼운다. 순서 칸 묶음(rowSpan)은 이 줄까지 센다.
  // 행 번호(data-cell)는 입력 행(rows) 기준이라 묶음 줄이 키보드 이동에 끼어들지 않는다.
  const display = rows.flatMap((row, i) => {
    const step = stepLabel(row, t);
    const item = { kind: "item" as const, row, i, step };
    return row.itemType === "SCRAP_CUT_FRONT" ? [{ kind: "group" as const, step }, item] : [item];
  });
  const spans = stepSpans(display.map((d) => d.step));
  const dimCount = rows.filter((r) => r.itemType === "DIM").length;
  // 제품 치수는 기준정보 관리(제품) 화면에서 바꾼다 — 그 화면을 쓸 수 있는 역할에게만 바로가기를 보인다.
  const canManageProducts = hasRole(user?.role, ["ADMIN", "QUALITY_ADMIN"]);

  const focusCell = (r: number, col: GridCol) => {
    const el = tableRef.current?.querySelector<HTMLElement>(`[data-cell="${cellId(r, col)}"]`);
    if (!el) return false;
    el.focus();
    if (el instanceof HTMLInputElement) el.select();
    return true;
  };

  // 위아래는 그 열이 있는 다음 행으로, 좌우는 같은 행에서 입력할 수 있는 다음 칸으로.
  const move = (r: number, col: GridCol, dr: number, dc: number) => {
    if (dr !== 0) {
      for (let i = r + dr; i >= 0 && i < rows.length; i += dr) {
        if (editableCols(rows[i]).includes(col)) return focusCell(i, col);
      }
      return false;
    }
    const cols = editableCols(rows[r]);
    const next = cols[cols.indexOf(col) + dc];
    return next ? focusCell(r, next) : false;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTableElement>) => {
    const at = readCell(e.target as Element);
    if (!at || e.nativeEvent.isComposing) return;
    const input = e.target instanceof HTMLInputElement ? e.target : null;
    const caretAt = (edge: "start" | "end") =>
      !input ||
      (input.selectionStart === input.selectionEnd &&
        input.selectionStart === (edge === "start" ? 0 : input.value.length));
    let handled = false;
    if (e.key === "ArrowDown" || (e.key === "Enter" && !e.shiftKey)) handled = move(at.r, at.col, 1, 0);
    else if (e.key === "ArrowUp" || (e.key === "Enter" && e.shiftKey)) handled = move(at.r, at.col, -1, 0);
    else if (e.key === "ArrowLeft" && caretAt("start")) handled = move(at.r, at.col, 0, -1);
    else if (e.key === "ArrowRight" && caretAt("end")) handled = move(at.r, at.col, 0, 1);
    if (handled || e.key === "Enter") e.preventDefault();
  };

  const onPaste = (e: ClipboardEvent<HTMLTableElement>) => {
    const at = readCell(e.target as Element);
    if (!at) return;
    const cells = parseClipboard(e.clipboardData.getData("text/plain"));
    const single = cells.length === 1 && cells[0].length === 1;
    // 한 칸짜리는 보통 붙여넣기에 맡긴다 — 기준 칸의 현장 표기와 OK/NG 칸만 직접 처리한다.
    if (single && at.col !== "result" && !(at.col === "standard" && parseStandardNotation(cells[0][0]))) return;
    e.preventDefault();
    for (const [key, patch] of Object.entries(pasteIntoRows(rows, at.r, at.col, cells))) onRowChange(key, patch);
  };

  const th = "border border-[#D1D5DB] bg-[#F3F4F6] px-2 py-1.5 text-center text-xs font-semibold text-[#4B5563]";
  const td = "border border-[#D1D5DB] p-0 align-middle";
  const ro = "px-2 text-xs text-[#212121]";
  const na = `${td} bg-[#F3F4F6]`;
  const inputCls = (invalid: boolean, align: "right" | "left" = "right") =>
    `h-10 w-full bg-transparent px-2 text-xs text-[#212121] placeholder:text-[#C4C4C4] ${CELL_FOCUS} ${
      align === "right" ? "text-right tabular-nums" : ""
    } ${invalid ? "bg-[#FEF2F2]" : ""}`;

  const errorRows = rows.filter((r) => errors[r.key]);

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table ref={tableRef} onKeyDown={onKeyDown} onPaste={onPaste} className="w-full min-w-[1040px] border-collapse">
          <colgroup>
            <col className="w-20" />
            <col className="w-40" />
            <col className="w-16" />
            <col className="w-20" />
            <col className="w-20" />
            <col className="w-20" />
            <col className="w-40" />
            <col className="w-24" />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th colSpan={7} className={th}>{t("sheet.specSection")}</th>
              <th colSpan={2} className={th}>{t("sheet.resultSection")}</th>
            </tr>
            <tr>
              <th rowSpan={2} className={th}>{t("columns.step")}</th>
              <th rowSpan={2} className={th}>{t("columns.item")}</th>
              <th rowSpan={2} className={th}>{t("columns.unit")}</th>
              <th colSpan={3} className={th}>{t("columns.standard")}</th>
              <th rowSpan={2} className={th}>{t("columns.measured")}</th>
              <th rowSpan={2} className={th}>{t("columns.result")}</th>
              <th rowSpan={2} className={th}>{t("columns.note")}</th>
            </tr>
            <tr>
              <th className={th}>{t("columns.standardValue")}</th>
              <th className={th}>{t("columns.lower")}</th>
              <th className={th}>{t("columns.upper")}</th>
            </tr>
          </thead>
          <tbody>
            {display.map((d, k) => {
              const stepCell = spans[k] > 0 && (
                <td rowSpan={spans[k]} className={`${td} bg-[#F9FAFB] text-center ${ro} font-medium`}>
                  {d.step}
                </td>
              );
              if (d.kind === "group") {
                return (
                  <tr key="scrap-group">
                    {stepCell}
                    <td colSpan={5} className={`${td} bg-[#F9FAFB] py-2 text-center ${ro}`}>
                      {t("sheet.scrapGroup")}
                    </td>
                    <td className={na} />
                    <td className={na} />
                    <td className={na} />
                  </tr>
                );
              }
              const { row, i } = d;
              const error = errors[row.key];
              const measuredInvalid = error === "measuredInvalid";
              const standardInvalid = error != null && !measuredInvalid;
              const label = itemLabel(row, t);
              const errorText = error ? t(`errors.item.${error}`) : undefined;
              const stdField = (field: "standard" | "lower" | "upper") => (
                <td className={td}>
                  <input
                    data-cell={cellId(i, field)}
                    inputMode={field === "standard" ? "text" : "decimal"}
                    value={row.standard[field]}
                    onChange={(e) => onRowChange(row.key, { standard: { ...row.standard, [field]: e.target.value } })}
                    // 기준 칸에 쓴 현장 표기는 칸을 떠날 때 세 칸으로 푼다.
                    onBlur={
                      field === "standard"
                        ? (e) => {
                            const next = standardFromText(row.standard, e.target.value);
                            if (next.lower !== row.standard.lower || next.upper !== row.standard.upper) {
                              onRowChange(row.key, { standard: next });
                            }
                          }
                        : undefined
                    }
                    aria-label={`${label} ${t(`columns.${field === "standard" ? "standardValue" : field}`)}`}
                    aria-invalid={standardInvalid}
                    title={standardInvalid ? errorText : undefined}
                    className={inputCls(standardInvalid)}
                  />
                </td>
              );
              return (
                <tr key={row.key}>
                  {stepCell}
                  <td className={`${td} bg-[#F9FAFB] text-center ${ro}`}>{sheetItemLabel(row, t)}</td>
                  <td className={`${td} bg-[#F9FAFB] text-center ${ro} text-[#6B7280]`}>{row.unit || ""}</td>
                  {row.valueType === "NUMBER" ? (
                    <>
                      {stdField("standard")}
                      {stdField("lower")}
                      {stdField("upper")}
                    </>
                  ) : (
                    <td colSpan={3} className={`${td} bg-[#F9FAFB] text-center ${ro} text-[#6B7280]`}>
                      {t("form.goodStandard")}
                    </td>
                  )}
                  {row.valueType === "NUMBER" && (
                    <td className={td}>
                      <input
                        data-cell={cellId(i, "measured")}
                        inputMode="decimal"
                        value={row.measured}
                        onChange={(e) => onRowChange(row.key, { measured: e.target.value })}
                        aria-label={`${label} ${t("columns.measured")}`}
                        aria-invalid={measuredInvalid}
                        title={measuredInvalid ? errorText : undefined}
                        className={inputCls(measuredInvalid)}
                      />
                    </td>
                  )}
                  {row.valueType === "PHOTO" && (
                    <td className={`${td} px-2 py-1`}>
                      <PhotoInput
                        value={row.imageUrl}
                        onChange={(imageUrl) => onRowChange(row.key, { imageUrl })}
                        alt={t("photo.alt", { item: label })}
                        onUploadingChange={(b) => onUploadingChange(row.key, b)}
                      />
                    </td>
                  )}
                  {row.valueType === "PASS_FAIL" && <td className={na} />}
                  <td className={`${td} text-center`}>
                    {row.valueType === "NUMBER" ? (
                      <NumberPreview row={row} />
                    ) : (
                      <ResultCell
                        cell={cellId(i, "result")}
                        value={row.result}
                        onChange={(result) => onRowChange(row.key, { result })}
                      />
                    )}
                  </td>
                  <td className={td}>
                    <input
                      data-cell={cellId(i, "note")}
                      value={row.note}
                      onChange={(e) => onRowChange(row.key, { note: e.target.value })}
                      aria-label={`${label} ${t("columns.note")}`}
                      className={inputCls(false, "left")}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={9} className="border border-[#D1D5DB] bg-[#FAFAFA] px-3 py-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B7280]">
                  <span className="font-semibold text-[#212121]">{t("sheet.dimFooter", { n: dimCount })}</span>
                  <span>{mode === "create" ? t("sheet.dimHowCreate") : t("sheet.dimHowEdit")}</span>
                  {mode === "create" && canManageProducts && (
                    // 쓰던 보고서가 날아가지 않게 새 탭으로 연다.
                    <a
                      href="/products"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-[#931B82] underline-offset-2 hover:underline"
                    >
                      {t("sheet.openProducts")}
                    </a>
                  )}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {errorRows.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-xs text-[#DC2626]">
          {errorRows.map((r) => (
            <li key={r.key}>
              {itemLabel(r, t)}: {t(`errors.item.${errors[r.key]}`)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

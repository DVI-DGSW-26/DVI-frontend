import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useInspectionDetail } from "../../inspection/api";
import {
  dimDisplayName,
  formatStandardWithTolerance,
} from "../../inspection/lib/format";
import { formatDateTime } from "../../../lib/datetime";
import { slotLabelText } from "../../../lib/slotLabel";
import PhotoCompareModal from "../../../components/shared/PhotoCompareModal";
import type { InspectionDetailResult } from "../../inspection/type/types";
import { dimState, type DimState } from "../lib/dimStatus";
import type { Decision, Incomplete } from "../type/types";

// 미완료 결재 한 건. 사유 한 줄만 보고 승인하던 화면이라, 무엇이 비었는지(항목 번호 줄)와
// 측정값·사진을 같은 카드에서 보고 승인·반려를 고르게 한다.
interface Props {
  item: Incomplete;
  checked: boolean;
  onToggle: () => void;
  onDecide: (decision: Decision) => void;
  disabled: boolean;
}

const CHIP_STYLE: Record<DimState, string> = {
  pass: "border-success-line bg-success-soft text-success-fg",
  fail: "border-danger-line bg-danger-soft text-danger-fg",
  empty: "border-dashed border-danger bg-surface text-danger-fg",
};

export default function IncompleteDecisionCard({
  item,
  checked,
  onToggle,
  onDecide,
  disabled,
}: Props) {
  const { t } = useTranslation("incomplete");
  const detailQuery = useInspectionDetail(item.inspectionId);
  const results = [...(detailQuery.data?.results ?? [])].sort(
    (a, b) => a.dimNo - b.dimNo,
  );
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<InspectionDetailResult | null>(null);

  const empties = results.filter((r) => dimState(r) === "empty");
  const measuredCount = results.length - empties.length;
  const emptyNames =
    empties
      .slice(0, 3)
      .map((r) => dimDisplayName(r))
      .join(", ") +
    (empties.length > 3 ? t("card.more", { n: empties.length - 3 }) : "");

  return (
    <li className="flex flex-col gap-3 rounded-xl bg-surface px-4 py-4 shadow-sm border border-edge">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          disabled={disabled}
          aria-label={t("card.select")}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-brand"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-base font-bold text-fg">
              {item.production?.name ?? "-"} · {item.equipment?.name ?? "-"}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-danger-fg">
              <span className="h-2 w-2 shrink-0 rounded-full bg-danger" />
              {item.incompleteReason ?? "-"}
            </span>
          </div>
          <div className="mt-0.5 text-sm text-fg-muted">
            {item.product?.name ?? "-"} ·{" "}
            {slotLabelText(item.typeLabel) || item.type} ·{" "}
            {t("list.requestedAt", {
              date: item.createdAt ? formatDateTime(item.createdAt) : "-",
            })}
          </div>
          {/* 순회검사자가 대신 적었으면 작업자 이름과 달라진다 — 누가 적었는지 보이게. */}
          {item.incompleteReasonByName && (
            <div className="text-xs text-fg-subtle">
              {t("list.reasonBy", { name: item.incompleteReasonByName })}
            </div>
          )}
        </div>
      </div>

      <div className="pl-8">
        {detailQuery.isLoading ? (
          <p className="text-xs text-fg-subtle">{t("card.loadingDims")}</p>
        ) : detailQuery.isError ? (
          <p className="text-xs text-danger-fg">{t("card.dimsFailed")}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {results.map((r) => (
                <span
                  key={r.resultId}
                  title={dimDisplayName(r)}
                  className={`flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-xs font-semibold tabular-nums ${CHIP_STYLE[dimState(r)]}`}
                >
                  {r.dimNo}
                </span>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-fg-muted">
              {empties.length === 0
                ? t("card.allMeasured", { n: results.length })
                : t("card.summary", {
                    measured: measuredCount,
                    empty: emptyNames,
                  })}
            </p>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="mt-1 text-xs font-semibold text-brand-fg hover:underline"
            >
              {open ? t("card.hideDetail") : t("card.showDetail")}
            </button>

            {open && (
              <div className="mt-2 overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[420px] text-xs">
                  <thead className="bg-canvas text-fg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">
                        {t("table.dim")}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {t("table.standard")}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {t("table.measured")}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {t("table.photo")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => {
                      const state = dimState(r);
                      const passFail = r.valueType === "PASS_FAIL";
                      return (
                        <tr key={r.resultId} className="border-t border-line">
                          <td className="px-3 py-2 text-fg">
                            {dimDisplayName(r)}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-fg-muted">
                            {passFail
                              ? "OK / NG"
                              : formatStandardWithTolerance(
                                  r.standardValue,
                                  r.toleranceUpper,
                                  r.toleranceLower,
                                )}
                          </td>
                          <td
                            className={`px-3 py-2 font-semibold tabular-nums ${
                              state === "empty"
                                ? "text-danger-fg"
                                : state === "fail"
                                  ? "text-danger-fg"
                                  : "text-fg"
                            }`}
                          >
                            {state === "empty"
                              ? t("table.empty")
                              : passFail
                                ? r.passFailResult
                                : r.measuredValue}
                          </td>
                          <td className="px-3 py-2">
                            {r.imageUrl ? (
                              <button
                                type="button"
                                onClick={() => setPhoto(r)}
                                className="font-medium text-brand-fg hover:underline"
                              >
                                {t("table.view")}
                              </button>
                            ) : (
                              <span className="text-fg-subtle">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* "다시 측정 요청" = 반려(작업자에게 돌려보내 다시 측정), "승인" = 미완료로 종결.
          누르기 전에 결과를 알 수 있게 버튼마다 일어나는 일을 한 줄씩 적는다. */}
      <div className="grid grid-cols-2 gap-2 pl-8">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onDecide("REJECT")}
            disabled={disabled}
            className="h-10 w-full rounded-lg border border-danger-line bg-surface text-sm font-semibold text-danger-fg transition-colors hover:bg-danger-soft disabled:opacity-40"
          >
            {t("card.reject")}
          </button>
          <span className="text-[11px] leading-snug text-fg-muted">
            {t("card.rejectEffect")}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onDecide("APPROVE")}
            disabled={disabled}
            className="h-10 w-full rounded-lg bg-brand text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover disabled:opacity-40"
          >
            {t("card.approve")}
          </button>
          <span className="text-[11px] leading-snug text-fg-muted">
            {t("card.approveEffect")}
          </span>
        </div>
      </div>

      <PhotoCompareModal
        open={photo !== null}
        dimNo={photo?.dimNo ?? null}
        productionImageUrl={photo?.imageUrl}
        onClose={() => setPhoto(null)}
      />
    </li>
  );
}

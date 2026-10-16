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
  pass: "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]",
  fail: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]",
  empty: "border-dashed border-[#EF4444] bg-white text-[#EF4444]",
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
    <li className="flex flex-col gap-3 rounded-xl bg-white px-4 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          disabled={disabled}
          aria-label={t("card.select")}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#931B82]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-base font-bold text-[#212121]">
              {item.production?.name ?? "-"} · {item.equipment?.name ?? "-"}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-[#EF4444]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#EF4444]" />
              {item.incompleteReason ?? "-"}
            </span>
          </div>
          <div className="mt-0.5 text-sm text-[#6B7280]">
            {item.product?.name ?? "-"} ·{" "}
            {slotLabelText(item.typeLabel) || item.type} ·{" "}
            {t("list.requestedAt", {
              date: item.createdAt ? formatDateTime(item.createdAt) : "-",
            })}
          </div>
          {/* 순회검사자가 대신 적었으면 작업자 이름과 달라진다 — 누가 적었는지 보이게. */}
          {item.incompleteReasonByName && (
            <div className="text-xs text-[#9CA3AF]">
              {t("list.reasonBy", { name: item.incompleteReasonByName })}
            </div>
          )}
        </div>
      </div>

      <div className="pl-8">
        {detailQuery.isLoading ? (
          <p className="text-xs text-[#9CA3AF]">{t("card.loadingDims")}</p>
        ) : detailQuery.isError ? (
          <p className="text-xs text-[#B91C1C]">{t("card.dimsFailed")}</p>
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
            <p className="mt-1.5 text-xs text-[#6B7280]">
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
              className="mt-1 text-xs font-semibold text-[#931B82] hover:underline"
            >
              {open ? t("card.hideDetail") : t("card.showDetail")}
            </button>

            {open && (
              <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[420px] text-xs">
                  <thead className="bg-[#F9FAFB] text-[#6B7280]">
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
                        <tr key={r.resultId} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-[#212121]">
                            {dimDisplayName(r)}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-[#6B7280]">
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
                                ? "text-[#EF4444]"
                                : state === "fail"
                                  ? "text-[#B91C1C]"
                                  : "text-[#212121]"
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
                                className="font-medium text-[#931B82] hover:underline"
                              >
                                {t("table.view")}
                              </button>
                            ) : (
                              <span className="text-[#9CA3AF]">-</span>
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

      {/* "검토 후 재제출" = 반려(작업자에게 돌려보내 다시 측정), "승인" = 미완료로 종결.
          누르기 전에 결과를 알 수 있게 버튼마다 일어나는 일을 한 줄씩 적는다. */}
      <div className="grid grid-cols-2 gap-2 pl-8">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onDecide("REJECT")}
            disabled={disabled}
            className="h-10 w-full rounded-lg border border-[#FECACA] bg-white text-sm font-semibold text-[#DC2626] transition-colors hover:bg-[#FEF2F2] disabled:opacity-40"
          >
            {t("card.reject")}
          </button>
          <span className="text-[11px] leading-snug text-[#6B7280]">
            {t("card.rejectEffect")}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onDecide("APPROVE")}
            disabled={disabled}
            className="h-10 w-full rounded-lg bg-[#931B82] text-sm font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:opacity-40"
          >
            {t("card.approve")}
          </button>
          <span className="text-[11px] leading-snug text-[#6B7280]">
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

import { toBackendImageUrl } from "../../../lib/imageUrl";
import type {
  AppearanceResult,
  ReportMeasurement,
  ReportResultItem,
  ReportStage,
} from "../api/types";
import {
  collectStageColumns,
  findMeasurement,
  STAGE_LABEL,
  type StageColumn,
} from "../lib/stageMeasurements";

const STAGE_BADGE: Record<ReportStage, string> = {
  INITIAL: "border-[#DBEAFE] bg-[#EFF6FF] text-[#1D4ED8]",
  MIDDLE: "border-[#FEF3C7] bg-[#FFFBEB] text-[#B45309]",
  FINAL: "border-[#FBCFE8] bg-[#FDF2F8] text-[#9D174D]",
};

function isWithinTolerance(
  item: ReportResultItem,
  value: number | null | undefined,
): boolean | null {
  if (value == null) return null;
  const min = item.standardValue - item.toleranceMinus;
  const max = item.standardValue + item.tolerancePlus;
  return value >= min && value <= max;
}

function valueColor(within: boolean | null): string {
  if (within === null) return "text-[#A8A8A8]";
  return within ? "text-[#15803D]" : "text-[#B91C1C]";
}

function formatValue(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return String(value);
}

function StageChip({ column }: { column: StageColumn }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
          STAGE_BADGE[column.stage] ?? "border-[#E5E7EB] bg-[#F5F5F5] text-[#6B7280]"
        }`}
      >
        {STAGE_LABEL[column.stage] ?? "?"}
      </span>
      <span className="text-xs font-medium text-[#212121]">{column.label}</span>
    </span>
  );
}

// 가공(MACHINING)처럼 수치가 아니라 OK/NG 로 판정하는 항목. 값이 null 이라
// 수치만 그리면 표가 통째로 "—" 가 된다. 공정으로 분기하지 않고 응답에 판정이
// 실려 있는지로 판단해, dim 마다 방식이 다른 경우도 그대로 따라간다.
function PassFailMark({ value }: { value: AppearanceResult | null }) {
  if (value === "OK") {
    return <span className="text-sm font-semibold text-[#15803D]">OK</span>;
  }
  if (value === "NG") {
    return <span className="text-sm font-semibold text-[#B91C1C]">NG</span>;
  }
  return <span className="text-sm text-[#A8A8A8]">—</span>;
}

function SideValue({
  item,
  measurement,
  side,
}: {
  item: ReportResultItem;
  measurement: ReportMeasurement;
  side: "production" | "quality";
}) {
  const passFail =
    side === "production"
      ? measurement.productionPassFailResult
      : measurement.qualityPassFailResult;
  const value =
    side === "production"
      ? measurement.productionValue
      : measurement.qualityValue;

  if (passFail != null && value == null) {
    return <PassFailMark value={passFail} />;
  }
  return (
    <span
      className={`text-sm font-semibold ${valueColor(
        isWithinTolerance(item, value),
      )}`}
    >
      {formatValue(value)}
    </span>
  );
}

// 한 dim × 한 차수 칸 — 자주/순회를 위아래로. 사진이 있으면 클릭해 비교.
function MeasureCell({
  item,
  measurement,
  onOpenPhotos,
}: {
  item: ReportResultItem;
  measurement: ReportMeasurement | undefined;
  onOpenPhotos: (m: ReportMeasurement) => void;
}) {
  if (!measurement) {
    return <span className="text-sm text-[#D4D4D4]">—</span>;
  }
  const thumb = measurement.qualityImageUrl ?? measurement.productionImageUrl;
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col gap-0.5">
        <SideValue item={item} measurement={measurement} side="production" />
        <SideValue item={item} measurement={measurement} side="quality" />
      </div>
      {thumb && (
        <button
          type="button"
          onClick={() => onOpenPhotos(measurement)}
          aria-label={`DIM ${item.dimNo} ${measurement.typeLabel} 측정 사진`}
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F5F5F5] transition-colors hover:bg-[#F3E8F7]"
        >
          <img
            src={toBackendImageUrl(thumb)}
            alt=""
            className="h-full w-full object-cover"
          />
        </button>
      )}
    </div>
  );
}

/**
 * 통합 보고서 측정값 표 — dim 1개 = 1행, 초·중·종 = 열.
 *
 * 각 칸은 자주검사값(위) / 순회검사값(아래) 두 줄이다. 야간 작업처럼 순회검사자가
 * 없어 자주검사값을 복사한 차수는 두 값이 같게 보인다.
 */
export default function ReportMeasurementsSection({
  results,
  variant,
  onOpenPhotos,
}: {
  results: ReportResultItem[];
  variant: "web" | "mobile";
  onOpenPhotos: (item: ReportResultItem, m: ReportMeasurement) => void;
}) {
  const columns = collectStageColumns(results);
  if (columns.length === 0) return null;

  if (variant === "mobile") {
    return (
      <ul className="flex flex-col gap-3">
        {results.map((item, idx) => (
          <li
            key={`${item.dimNo}-${idx}`}
            className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md bg-[#F3E8F7] px-2 py-0.5 text-xs font-semibold text-[#931B82]">
                DIM {item.dimNo}
              </span>
              <span className="text-xs text-[#A8A8A8]">
                기준 {item.standardValue} (+{item.tolerancePlus} / -
                {item.toleranceMinus})
              </span>
            </div>
            <ul className="flex flex-col divide-y divide-[#F0F0F0]">
              {columns.map((c) => (
                <li
                  key={c.key}
                  className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <StageChip column={c} />
                  <MeasureCell
                    item={item}
                    measurement={findMeasurement(item, c)}
                    onOpenPhotos={(m) => onOpenPhotos(item, m)}
                  />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-[#E5E7EB] text-left text-xs text-[#A8A8A8]">
            <th className="pb-2 pr-3 font-medium">DIM</th>
            <th className="pb-2 pr-3 font-medium">기준</th>
            {columns.map((c) => (
              <th key={c.key} className="pb-2 pr-3 font-medium">
                <StageChip column={c} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0F0F0]">
          {results.map((item, idx) => (
            <tr key={`${item.dimNo}-${idx}`} className="align-top">
              <td className="py-3 pr-3">
                <span className="rounded-md bg-[#F3E8F7] px-2 py-0.5 text-xs font-semibold text-[#931B82]">
                  {item.dimNo}
                </span>
              </td>
              <td className="py-3 pr-3 text-xs text-[#6B7280]">
                {item.standardValue}
                <br />+{item.tolerancePlus} / -{item.toleranceMinus}
              </td>
              {columns.map((c) => (
                <td key={c.key} className="py-3 pr-3">
                  <MeasureCell
                    item={item}
                    measurement={findMeasurement(item, c)}
                    onOpenPhotos={(m) => onOpenPhotos(item, m)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-[#A8A8A8]">
        각 칸은 위가 자주검사, 아래가 순회검사 측정값입니다.
      </p>
    </div>
  );
}

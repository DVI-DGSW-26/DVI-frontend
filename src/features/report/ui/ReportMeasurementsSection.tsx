import { useTranslation } from "react-i18next";
import { toBackendImageUrl } from "../../../lib/imageUrl";
import { formatTolerance } from "../../inspection/lib/format";
import { judgeMeasurement } from "../../inspection/lib/judgment";
import type {
  AppearanceResult,
  ReportMeasurement,
  ReportResultItem,
  ReportStage,
} from "../api/types";
import {
  collectStageColumns,
  findMeasurement,
  type StageColumn,
} from "../lib/stageMeasurements";
import { withSlotLabel } from "../../../lib/slotLabel";

const STAGE_BADGE: Record<ReportStage, string> = {
  INITIAL: "border-info-line bg-info-soft text-info-fg",
  MIDDLE: "border-warn-line bg-warn-soft text-warn-fg",
  FINAL: "border-brand-line bg-brand-soft text-danger-fg",
};

function isWithinTolerance(
  item: ReportResultItem,
  value: number | null | undefined,
): boolean | null {
  const judgment = judgeMeasurement(
    value,
    item.standardValue,
    item.toleranceUpper,
    item.toleranceLower,
  );
  return judgment == null ? null : judgment === "pass";
}

function valueColor(within: boolean | null): string {
  if (within === null) return "text-fg-subtle";
  return within ? "text-success-fg" : "text-danger-fg";
}

function formatValue(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return String(value);
}

function StageChip({ column }: { column: StageColumn }) {
  const { t } = useTranslation("report");
  const base = withSlotLabel(t(`stage.${column.stage}`, ""), column.typeLabel);
  const label =
    column.occurrence === 0
      ? base
      : t("measurements.repeatRun", { label: base, n: column.occurrence + 1 });
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
          STAGE_BADGE[column.stage] ?? "border-line bg-surface-2 text-fg-muted"
        }`}
      >
        {t(`stage.${column.stage}`, "?")}
      </span>
      <span className="text-xs font-medium text-fg">{label}</span>
    </span>
  );
}

// 가공(MACHINING)처럼 수치가 아니라 OK/NG 로 판정하는 항목. 값이 null 이라
// 수치만 그리면 표가 통째로 "—" 가 된다. 공정으로 분기하지 않고 응답에 판정이
// 실려 있는지로 판단해, dim 마다 방식이 다른 경우도 그대로 따라간다.
function PassFailMark({ value }: { value: AppearanceResult | null }) {
  if (value === "OK") {
    return <span className="text-sm font-semibold text-success-fg">OK</span>;
  }
  if (value === "NG") {
    return <span className="text-sm font-semibold text-danger-fg">NG</span>;
  }
  return <span className="text-sm text-fg-subtle">—</span>;
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
  const { t } = useTranslation("report");
  if (!measurement) {
    return <span className="text-sm text-fg-faint">—</span>;
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
          aria-label={t("measurements.photoAria", {
            dimNo: item.dimNo,
            typeLabel: measurement.typeLabel,
          })}
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2 transition-colors hover:bg-brand-soft"
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
  const { t } = useTranslation("report");
  const columns = collectStageColumns(results);
  if (columns.length === 0) return null;

  if (variant === "mobile") {
    return (
      <ul className="flex flex-col gap-3">
        {results.map((item, idx) => (
          <li
            key={`${item.dimNo}-${idx}`}
            className="flex flex-col gap-2 rounded-xl border border-line p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-fg">
                DIM {item.dimNo}
              </span>
              <span className="text-xs text-fg-subtle">
                {t("measurements.standardWithTolerance", {
                  value: item.standardValue,
                  tolerance: formatTolerance(
                    item.toleranceUpper,
                    item.toleranceLower,
                  ),
                })}
              </span>
            </div>
            <ul className="flex flex-col divide-y divide-line">
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
          <tr className="border-b border-line text-left text-xs text-fg-subtle">
            <th className="pb-2 pr-3 font-medium">DIM</th>
            <th className="pb-2 pr-3 font-medium">
              {t("measurements.standard")}
            </th>
            {columns.map((c) => (
              <th key={c.key} className="pb-2 pr-3 font-medium">
                <StageChip column={c} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {results.map((item, idx) => (
            <tr key={`${item.dimNo}-${idx}`} className="align-top">
              <td className="py-3 pr-3">
                <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-fg">
                  {item.dimNo}
                </span>
              </td>
              <td className="py-3 pr-3 text-xs text-fg-muted">
                {item.standardValue}
                <br />+{item.toleranceUpper} / -{item.toleranceLower}
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
      <p className="mt-3 text-xs text-fg-subtle">{t("measurements.legend")}</p>
    </div>
  );
}

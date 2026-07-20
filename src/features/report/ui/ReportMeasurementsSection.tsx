import { Icon } from "@iconify/react";
import { toBackendImageUrl } from "../../../lib/imageUrl";
import type {
  ReportMeasurement,
  ReportResultItem,
  ReportStage,
} from "../api/types";

const STAGE_ORDER: Record<ReportStage, number> = {
  INITIAL: 0,
  MIDDLE: 1,
  FINAL: 2,
};

const STAGE_LABEL: Record<ReportStage, string> = {
  INITIAL: "초",
  MIDDLE: "중",
  FINAL: "종",
};

const STAGE_BADGE: Record<ReportStage, string> = {
  INITIAL: "border-[#DBEAFE] bg-[#EFF6FF] text-[#1D4ED8]",
  MIDDLE: "border-[#FEF3C7] bg-[#FFFBEB] text-[#B45309]",
  FINAL: "border-[#FBCFE8] bg-[#FDF2F8] text-[#9D174D]",
};

// 보고서 전체에 등장하는 차수를 초→중→종 순으로 모은다. dim 마다 측정된 차수가
// 다를 수 있어(중간 차수 건너뜀 등) 합집합을 잡아야 열이 어긋나지 않는다.
function collectStages(results: ReportResultItem[]): ReportMeasurement[] {
  const byType = new Map<string, ReportMeasurement>();
  for (const r of results) {
    for (const m of r.measurements ?? []) {
      if (!byType.has(m.type)) byType.set(m.type, m);
    }
  }
  return [...byType.values()].sort(
    (a, b) => (STAGE_ORDER[a.stage] ?? 9) - (STAGE_ORDER[b.stage] ?? 9),
  );
}

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

function StageChip({ stage, label }: { stage: ReportStage; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STAGE_BADGE[stage]}`}
      >
        {STAGE_LABEL[stage]}
      </span>
      <span className="text-xs font-medium text-[#212121]">{label}</span>
    </span>
  );
}

// 한 dim × 한 차수 칸 — 자주/순회 측정값을 위아래로. 사진이 있으면 클릭해 비교.
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
  const hasPhoto =
    !!measurement.productionImageUrl || !!measurement.qualityImageUrl;
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col gap-0.5">
        <span
          className={`text-sm font-semibold ${valueColor(
            isWithinTolerance(item, measurement.productionValue),
          )}`}
        >
          {formatValue(measurement.productionValue)}
        </span>
        <span
          className={`text-sm font-semibold ${valueColor(
            isWithinTolerance(item, measurement.qualityValue),
          )}`}
        >
          {formatValue(measurement.qualityValue)}
        </span>
      </div>
      {hasPhoto && (
        <button
          type="button"
          onClick={() => onOpenPhotos(measurement)}
          aria-label={`DIM ${item.dimNo} ${measurement.typeLabel} 측정 사진`}
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F5F5F5] transition-colors hover:bg-[#F3E8F7]"
        >
          {measurement.qualityImageUrl || measurement.productionImageUrl ? (
            <img
              src={toBackendImageUrl(
                (measurement.qualityImageUrl ??
                  measurement.productionImageUrl) as string,
              )}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Icon icon="mdi:image-outline" width={16} height={16} />
          )}
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
  const stages = collectStages(results);
  if (stages.length === 0) return null;

  const findM = (item: ReportResultItem, type: string) =>
    item.measurements?.find((m) => m.type === type);

  if (variant === "mobile") {
    return (
      <ul className="flex flex-col gap-3">
        {results.map((item) => (
          <li
            key={item.dimNo}
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
              {stages.map((s) => (
                <li
                  key={s.type}
                  className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <StageChip stage={s.stage} label={s.typeLabel} />
                  <MeasureCell
                    item={item}
                    measurement={findM(item, s.type)}
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
            {stages.map((s) => (
              <th key={s.type} className="pb-2 pr-3 font-medium">
                <StageChip stage={s.stage} label={s.typeLabel} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0F0F0]">
          {results.map((item) => (
            <tr key={item.dimNo} className="align-top">
              <td className="py-3 pr-3">
                <span className="rounded-md bg-[#F3E8F7] px-2 py-0.5 text-xs font-semibold text-[#931B82]">
                  {item.dimNo}
                </span>
              </td>
              <td className="py-3 pr-3 text-xs text-[#6B7280]">
                {item.standardValue}
                <br />+{item.tolerancePlus} / -{item.toleranceMinus}
              </td>
              {stages.map((s) => (
                <td key={s.type} className="py-3 pr-3">
                  <MeasureCell
                    item={item}
                    measurement={findM(item, s.type)}
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

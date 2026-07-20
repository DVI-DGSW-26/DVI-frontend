import type {
  AppearanceResult,
  ReportStage,
  ReportStageInfo,
} from "../api/types";
// 초 → 중 → 종 고정 순서. 백엔드가 stages 를 어떤 순서로 주든 성적서 읽는 순서로 맞춘다.
import { STAGE_LABEL, STAGE_ORDER } from "../lib/stageMeasurements";

const STAGE_BADGE: Record<ReportStage, string> = {
  INITIAL: "border-[#DBEAFE] bg-[#EFF6FF] text-[#1D4ED8]",
  MIDDLE: "border-[#FEF3C7] bg-[#FFFBEB] text-[#B45309]",
  FINAL: "border-[#FBCFE8] bg-[#FDF2F8] text-[#9D174D]",
};

// 실제 검사 시각(inspectedAt) 우선. 없으면 예정 슬롯(inspectionTime)으로 폴백하되
// 슬롯값은 "실제로 언제 쟀는지"가 아니므로 괄호로 구분해 표시한다.
function formatInspected(stage: ReportStageInfo): string {
  if (stage.inspectedAt) {
    const d = new Date(stage.inspectedAt);
    if (!Number.isNaN(d.getTime())) {
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      return `${mm}-${dd} ${hh}:${mi}`;
    }
  }
  if (stage.inspectionTime) return `(${stage.inspectionTime.slice(0, 5)} 예정)`;
  return "—";
}

function AppearanceMark({ value }: { value: AppearanceResult | null }) {
  if (value === "OK") {
    return <span className="font-semibold text-[#15803D]">OK</span>;
  }
  if (value === "NG") {
    return <span className="font-semibold text-[#B91C1C]">NG</span>;
  }
  return <span className="text-[#A8A8A8]">—</span>;
}

function StageBadge({ stage, label }: { stage: ReportStage; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
          STAGE_BADGE[stage] ?? "border-[#E5E7EB] bg-[#F5F5F5] text-[#6B7280]"
        }`}
      >
        {STAGE_LABEL[stage] ?? "?"}
      </span>
      <span className="text-[#212121]">{label}</span>
    </span>
  );
}

/**
 * 통합 보고서의 차수별(초·중·종) 검사 정보.
 *
 * 승인이 종 차수 1회로 바뀌면서 보고서 1장에 초·중·종이 함께 담기는데, 검사자·검사
 * 시각·외관·경도는 차수마다 다르다. 기존 단수 필드는 종 기준 값만 보여주므로 이
 * 섹션에서 차수별로 펼친다. `stages` 가 없는 구 보고서에서는 아무것도 그리지 않는다.
 */
export default function ReportStagesSection({
  stages,
  variant,
}: {
  stages: ReportStageInfo[] | undefined;
  variant: "web" | "mobile";
}) {
  if (!stages || stages.length === 0) return null;

  const ordered = [...stages].sort(
    (a, b) => (STAGE_ORDER[a.stage] ?? 9) - (STAGE_ORDER[b.stage] ?? 9),
  );
  // 경도는 압출 종물에만 있어, 값이 하나도 없으면 열/행 자체를 숨긴다.
  const hasHardness = ordered.some((s) => s.qualityHardnessResult);

  if (variant === "mobile") {
    return (
      <ul className="flex flex-col gap-3">
        {ordered.map((s, idx) => (
          <li
            key={`${s.type}-${s.crossCheckId ?? idx}`}
            className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <StageBadge stage={s.stage} label={s.typeLabel} />
              <span className="text-xs text-[#6B7280]">
                {formatInspected(s)}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <Field label="작업자" value={s.productionName} />
              <Field label="검사자" value={s.qualityName} />
              <Field
                label="자주 외관"
                value={<AppearanceMark value={s.productionAppearanceResult} />}
              />
              <Field
                label="순회 외관"
                value={<AppearanceMark value={s.qualityAppearanceResult} />}
              />
              {s.qualityHardnessResult && (
                <Field label="경도" value={s.qualityHardnessResult} />
              )}
            </dl>
            {s.remarks && (
              <p className="rounded-lg bg-[#F9FAFB] px-2.5 py-2 text-xs text-[#6B7280]">
                {s.remarks}
              </p>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-[#E5E7EB] text-left text-xs text-[#A8A8A8]">
            <th className="pb-2 pr-3 font-medium">차수</th>
            <th className="pb-2 pr-3 font-medium">검사 시각</th>
            <th className="pb-2 pr-3 font-medium">작업자</th>
            <th className="pb-2 pr-3 font-medium">검사자</th>
            <th className="pb-2 pr-3 font-medium">자주 외관</th>
            <th className="pb-2 pr-3 font-medium">순회 외관</th>
            {hasHardness && <th className="pb-2 pr-3 font-medium">경도</th>}
            <th className="pb-2 font-medium">비고</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0F0F0]">
          {ordered.map((s, idx) => (
            <tr key={`${s.type}-${s.crossCheckId ?? idx}`} className="align-top">
              <td className="py-3 pr-3">
                <StageBadge stage={s.stage} label={s.typeLabel} />
              </td>
              <td className="py-3 pr-3 text-[#212121]">{formatInspected(s)}</td>
              <td className="py-3 pr-3 text-[#212121]">
                {s.productionName || "—"}
              </td>
              <td className="py-3 pr-3 text-[#212121]">
                {s.qualityName || "—"}
              </td>
              <td className="py-3 pr-3">
                <AppearanceMark value={s.productionAppearanceResult} />
              </td>
              <td className="py-3 pr-3">
                <AppearanceMark value={s.qualityAppearanceResult} />
              </td>
              {hasHardness && (
                <td className="py-3 pr-3 text-[#212121]">
                  {s.qualityHardnessResult || "—"}
                </td>
              )}
              <td className="py-3 text-[#6B7280]">{s.remarks || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="shrink-0 text-[#A8A8A8]">{label}</span>
      <span className="ml-auto min-w-0 truncate text-right text-[#212121]">
        {value || "—"}
      </span>
    </div>
  );
}

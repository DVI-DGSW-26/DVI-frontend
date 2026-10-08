import { useTranslation } from "react-i18next";
import type { StepChipState } from "../lib/stepChip";

const CHIP_STYLE: Record<StepChipState, string> = {
  done: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]",
  fail: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]",
  skipped: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
  empty: "border-[#E5E7EB] bg-white text-[#9CA3AF]",
};

/**
 * 측정 진행률 + 항목 번호 줄.
 *
 * 진행률은 "지금 보는 위치"가 아니라 "측정을 마친 항목 수"로 센다 — 위치로 세면
 * 아홉 개를 끝내고 3번으로 돌아가는 순간 20% 로 떨어져, 해 둔 측정이 사라진 것처럼 보인다.
 * 번호 줄은 어디가 끝났고 어디가 비었는지 한눈에 보여주고, 눌러서 바로 그 항목으로 간다
 * (이전/다음을 열두 번 왕복하지 않아도 되게).
 */
export default function StepProgress({
  states,
  currentIndex,
  onPick,
  disabled = false,
}: {
  states: StepChipState[];
  currentIndex: number;
  onPick: (index: number) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation("inspection");
  const total = states.length;
  const doneCount = states.filter((s) => s === "done" || s === "fail").length;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-[#212121]">
          {t("measure.progressDone", { done: doneCount, total })}
        </span>
        <span className="text-xs text-[#6B7280]">{percent}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F3E8FF]">
        <div
          className="h-full rounded-full bg-[#931B82] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ol
        aria-label={t("measure.stepListAria")}
        className="mt-2.5 flex flex-wrap gap-1.5"
      >
        {states.map((state, idx) => {
          const current = idx === currentIndex;
          return (
            <li key={idx}>
              <button
                type="button"
                onClick={() => onPick(idx)}
                disabled={disabled || current}
                aria-current={current ? "step" : undefined}
                aria-label={t("measure.stepChipAria", {
                  n: idx + 1,
                  state: t(`measure.stepState.${state}`),
                })}
                className={`flex size-8 items-center justify-center rounded-md border text-xs font-semibold tabular-nums transition-colors disabled:cursor-default ${
                  current
                    ? "border-[#931B82] bg-[#931B82] text-white"
                    : CHIP_STYLE[state]
                }`}
              >
                {idx + 1}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-1.5 text-[11px] text-[#9CA3AF]">
        {t("measure.stepListHint")}
      </p>
    </div>
  );
}

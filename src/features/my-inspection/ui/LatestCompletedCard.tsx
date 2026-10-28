import { useTranslation } from "react-i18next";
import type { MyInspection } from "../type/types";
import { slotLabelText } from "../../../lib/slotLabel";

interface Props {
  /** 가장 최근 완료된 직전 검사 — 클릭 시 이 검사의 다음 시점을 시작. */
  previous: MyInspection;
  /** 시작될 다음 시점 이름(표시용). type 코드가 아니다. */
  nextLabel: string;
  onStartNext: (previous: MyInspection) => void;
  isStartingNext: boolean;
}

// 홈/현황 상단에 올리는 "가장 최근 완료 → 다음 검사 바로 시작" 강조 카드.
// 기존 목록형 "다음 시점 시작" 버튼과 별개로, 마지막으로 끝낸 1건만 눈에 띄게 노출한다.
export default function LatestCompletedCard({
  previous,
  nextLabel,
  onStartNext,
  isStartingNext,
}: Props) {
  const { t } = useTranslation("myInspection");
  return (
    <div className="rounded-xl border border-brand/25 bg-surface p-4 shadow-sm ring-1 ring-brand/10">
      <div className="mt-2 wrap-break-word text-base font-semibold text-fg">
        {previous.product.name}
      </div>
      <div className="mt-0.5 truncate text-xs text-fg-muted">
        {previous.equipment.name} · {slotLabelText(previous.typeLabel) || previous.type}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-fg-muted">
        <span>
          {t("latestCard.typeCompleted", {
            type: slotLabelText(previous.typeLabel) || previous.type,
          })}
        </span>
        <span className="text-fg-faint">›</span>
        <span className="font-medium text-brand-fg">
          {t("latestCard.typeStart", { type: nextLabel })}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onStartNext(previous)}
        disabled={isStartingNext}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover disabled:bg-surface-3"
      >
        {isStartingNext ? t("latestCard.starting") : t("latestCard.startNextNow")}
      </button>
    </div>
  );
}

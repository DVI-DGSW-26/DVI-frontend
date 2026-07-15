import type { MyInspection } from "../type/types";

interface Props {
  /** 가장 최근 완료된 직전 검사 — 클릭 시 이 검사의 다음 시점을 시작. */
  previous: MyInspection;
  /** 시작될 다음 시점 type 코드. */
  nextType: string;
  onStartNext: (previous: MyInspection) => void;
  isStartingNext: boolean;
}

// 홈/현황 상단에 올리는 "가장 최근 완료 → 다음 검사 바로 시작" 강조 카드.
// 기존 목록형 "다음 시점 시작" 버튼과 별개로, 마지막으로 끝낸 1건만 눈에 띄게 노출한다.
export default function LatestCompletedCard({
  previous,
  nextType,
  onStartNext,
  isStartingNext,
}: Props) {
  return (
    <div className="rounded-xl border border-[#931B82]/25 bg-white p-4 shadow-sm ring-1 ring-[#931B82]/10">
      <div className="mt-2 wrap-break-word text-base font-semibold text-[#212121]">
        {previous.product.name}
      </div>
      <div className="mt-0.5 truncate text-xs text-[#6B7280]">
        {previous.equipment.name} · {previous.typeLabel || previous.type}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-[#6B7280]">
        <span>{previous.typeLabel || previous.type} 완료</span>
        <span className="text-[#D1D5DB]">›</span>
        <span className="font-medium text-[#931B82]">{nextType} 시작</span>
      </div>

      <button
        type="button"
        onClick={() => onStartNext(previous)}
        disabled={isStartingNext}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#931B82] text-sm font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
      >
        {isStartingNext ? "시작 중..." : "다음 검사 바로 시작"}
      </button>
    </div>
  );
}

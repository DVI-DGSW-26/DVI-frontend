import { Icon } from "@iconify/react";
import type { AssignedInspection } from "../api";
import { isTakeoverable } from "../lib/assigned";
import { elapsedFrom, TONE_COLOR } from "../lib/elapsed";
import { formatDate } from "../../../lib/datetime";

interface Props {
  item: AssignedInspection;
  onClick?: (item: AssignedInspection) => void;
  // 카드 단위로 POST /cross-check 진행 중일 때 비활성화 + 로딩 표시용.
  isStarting?: boolean;
}

const CrossCheckCard = ({ item, onClick, isStarting }: Props) => {
  const elapsed = elapsedFrom(item.completedAt);
  const color = TONE_COLOR[elapsed.tone];
  // 취소(release)로 담당자가 빠진 IN_PROGRESS — 다른 검사자가 이어받기 가능(클릭 O).
  const takeoverable = isTakeoverable(item);
  // 남이 진행 중인 IN_PROGRESS — 목록엔 보이되 시작 불가(클릭 X). 이어받기 건은 제외.
  const owned = item.status === "IN_PROGRESS" && !takeoverable;

  return (
    <button
      type="button"
      onClick={() => {
        if (!owned) onClick?.(item);
      }}
      disabled={isStarting || owned}
      className="flex w-full items-center gap-3 rounded-2xl bg-white px-5 py-4 text-left shadow-sm disabled:opacity-60"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="wrap-break-word text-base font-bold text-[#212121]">
            {item.productName}
          </span>
          {takeoverable && (
            <span className="shrink-0 rounded-md bg-[#F3E8F7] px-2 py-0.5 text-[10px] font-semibold text-[#931B82]">
              이어받기
            </span>
          )}
          {owned && (
            <span className="shrink-0 rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#B45309]">
              진행 중
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <Icon
            icon="solar:user-circle-linear"
            width={16}
            height={16}
            className="text-[#A8A8A8]"
          />
          <span className="truncate text-sm text-[#6B7280]">
            {item.productionName}
          </span>
        </div>
        {item.equipmentName && (
          <span className="mt-2 truncate text-xs text-[#A8A8A8]">
            공정: {item.equipmentName}
          </span>
        )}
        {item.createdAt && (
          <span className="mt-1 truncate text-xs text-[#A8A8A8]">
            시작일: {formatDate(item.createdAt)}
          </span>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        {owned ? (
          <span className="text-right text-xs font-medium text-[#B45309]">
            {item.ownerName ? `${item.ownerName} 진행 중` : "진행 중"}
          </span>
        ) : (
          <>
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold" style={{ color }}>
                {elapsed.label}
              </span>
              <Icon
                icon="solar:alt-arrow-right-linear"
                width={20}
                height={20}
                className="text-[#A8A8A8]"
              />
            </div>
          </>
        )}
      </div>
    </button>
  );
};

export default CrossCheckCard;

import { Icon } from "@iconify/react";
import type { InspectionSlot } from "../type/types";
import { formatSlotTime } from "../lib/format";

export type SlotStatus = "COMPLETED" | "DRAFT" | "NONE";

interface Props {
  slot: InspectionSlot;
  status: SlotStatus;
  selected: boolean;
  onSelect: (type: string) => void;
}

export default function SlotItem({ slot, status, selected, onSelect }: Props) {
  const isCompleted = status === "COMPLETED";
  const isDraft = status === "DRAFT";

  const handleClick = () => {
    if (isCompleted) return;
    onSelect(slot.type);
  };

  const borderClass = isCompleted
    ? "border-gray-200 bg-[#F9FAFB] opacity-60"
    : selected
      ? "border-[#931B82] ring-1 ring-[#931B82] bg-white"
      : "border-gray-200 bg-white hover:border-gray-300";

  const avatarClass = selected && !isCompleted
    ? "bg-[#931B82] text-white"
    : "bg-[#F3F4F6] text-[#6B7280]";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={selected}
      disabled={isCompleted}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${borderClass} ${
        isCompleted ? "cursor-not-allowed" : ""
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarClass}`}
      >
        {slot.label}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-[#212121]">{slot.label}</div>
        <div className="text-xs text-[#6B7280]">
          {formatSlotTime(slot.time)}
        </div>
      </div>

      {isCompleted && (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#22C55E]">
          <Icon icon="solar:check-circle-bold" width={16} height={16} />
          완료
        </span>
      )}

      {isDraft && (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#3B82F6]">
          <Icon icon="solar:clock-circle-bold" width={16} height={16} />
          작성 중
        </span>
      )}

      {!isCompleted && !isDraft && selected && (
        <Icon
          icon="solar:check-circle-bold"
          width={20}
          height={20}
          className="text-[#931B82]"
        />
      )}
    </button>
  );
}

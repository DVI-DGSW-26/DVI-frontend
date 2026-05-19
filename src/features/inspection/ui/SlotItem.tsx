import { Icon } from "@iconify/react";
import type { InspectionSlot } from "../type/types";
import { formatSlotTime } from "../lib/format";

export type SlotStatus =
  | "COMPLETED"
  | "DRAFT"
  | "INCOMPLETE"
  | "INCOMPLETE_APPROVED"
  | "LOCKED"
  | "NONE";

interface Props {
  slot: InspectionSlot;
  status: SlotStatus;
  onTap: (type: string) => void;
}

const STATUS_META: Record<
  SlotStatus,
  {
    badge: { icon: string; label: string; color: string } | null;
    actionLabel: string;
    disabled: boolean;
    dim: boolean;
  }
> = {
  NONE: {
    badge: null,
    actionLabel: "검사 시작",
    disabled: false,
    dim: false,
  },
  DRAFT: {
    badge: {
      icon: "solar:clock-circle-bold",
      label: "작성 중",
      color: "text-[#3B82F6]",
    },
    actionLabel: "이어하기",
    disabled: false,
    dim: false,
  },
  COMPLETED: {
    badge: {
      icon: "solar:check-circle-bold",
      label: "완료",
      color: "text-[#22C55E]",
    },
    actionLabel: "",
    disabled: true,
    dim: true,
  },
  INCOMPLETE: {
    badge: {
      icon: "solar:pause-circle-bold",
      label: "검토 대기",
      color: "text-[#F59E0B]",
    },
    actionLabel: "",
    disabled: true,
    dim: true,
  },
  INCOMPLETE_APPROVED: {
    badge: {
      icon: "solar:check-square-bold",
      label: "미완료 승인됨",
      color: "text-[#6B7280]",
    },
    actionLabel: "",
    disabled: true,
    dim: true,
  },
  LOCKED: {
    badge: {
      icon: "solar:lock-keyhole-bold",
      label: "이전 시점 완료 필요",
      color: "text-[#9CA3AF]",
    },
    actionLabel: "",
    disabled: true,
    dim: true,
  },
};

export default function SlotItem({ slot, status, onTap }: Props) {
  const meta = STATUS_META[status];

  const handleClick = () => {
    if (meta.disabled) return;
    onTap(slot.type);
  };

  const borderClass = meta.dim
    ? "border-gray-200 bg-[#F9FAFB] opacity-60"
    : status === "DRAFT"
      ? "border-[#3B82F6] bg-white"
      : "border-gray-200 bg-white hover:border-gray-300";

  const avatarClass =
    status === "DRAFT"
      ? "bg-[#3B82F6] text-white"
      : status === "NONE"
        ? "bg-[#931B82] text-white"
        : "bg-[#F3F4F6] text-[#6B7280]";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={meta.disabled}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${borderClass} ${
        meta.disabled ? "cursor-not-allowed" : ""
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

      {meta.badge && (
        <span
          className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${meta.badge.color}`}
        >
          <Icon icon={meta.badge.icon} width={16} height={16} />
          {meta.badge.label}
        </span>
      )}

      {!meta.disabled && meta.actionLabel && (
        <span className="ml-1 inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#931B82]">
          {meta.actionLabel}
          <Icon icon="solar:arrow-right-linear" width={14} height={14} />
        </span>
      )}
    </button>
  );
}

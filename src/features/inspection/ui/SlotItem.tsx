import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import type { InspectionSlot } from "../type/types";
import { formatSlotTime } from "../lib/format";
import ShiftBadge from "../../../components/shared/ShiftBadge";
import { slotLabelText } from "../../../lib/slotLabel";

export type SlotStatus =
  | "COMPLETED"
  | "DRAFT"
  | "INCOMPLETE"
  | "INCOMPLETE_APPROVED"
  | "SKIPPED"
  | "LOCKED"
  | "NONE";

interface Props {
  slot: InspectionSlot;
  status: SlotStatus;
  onTap: (type: string) => void;
  onSkip?: (type: string) => void;
}

const STATUS_META: Record<
  SlotStatus,
  {
    badge: { icon: string; labelKey: string; color: string } | null;
    actionLabelKey: string;
    disabled: boolean;
    dim: boolean;
  }
> = {
  NONE: {
    badge: null,
    actionLabelKey: "slot.action.start",
    disabled: false,
    dim: false,
  },
  DRAFT: {
    badge: {
      icon: "solar:clock-circle-bold",
      labelKey: "slot.status.draft",
      color: "text-info-fg",
    },
    actionLabelKey: "slot.action.resume",
    disabled: false,
    dim: false,
  },
  COMPLETED: {
    badge: {
      icon: "solar:check-circle-bold",
      labelKey: "slot.status.completed",
      color: "text-success-fg",
    },
    actionLabelKey: "",
    disabled: true,
    dim: true,
  },
  INCOMPLETE: {
    badge: {
      icon: "solar:pause-circle-bold",
      labelKey: "slot.status.reviewPending",
      color: "text-warn-fg",
    },
    actionLabelKey: "",
    disabled: true,
    dim: true,
  },
  INCOMPLETE_APPROVED: {
    badge: {
      icon: "solar:check-square-bold",
      labelKey: "slot.status.incompleteApproved",
      color: "text-fg-muted",
    },
    actionLabelKey: "",
    disabled: true,
    dim: true,
  },
  SKIPPED: {
    badge: {
      icon: "solar:skip-next-bold",
      labelKey: "slot.status.skipped",
      color: "text-fg-muted",
    },
    actionLabelKey: "",
    disabled: true,
    dim: true,
  },
  LOCKED: {
    badge: {
      icon: "solar:lock-keyhole-bold",
      labelKey: "slot.status.locked",
      color: "text-fg-subtle",
    },
    actionLabelKey: "",
    disabled: true,
    dim: true,
  },
};

// 건너뛰기 가능한 상태 — 시작 전(NONE) 또는 작성 중(DRAFT) 일 때.
// DRAFT 인 경우 ScanPage 가 기존 DRAFT 를 먼저 삭제하고 skip 호출.
const CAN_SKIP: SlotStatus[] = ["NONE", "DRAFT"];

export default function SlotItem({ slot, status, onTap, onSkip }: Props) {
  const { t } = useTranslation("inspection");
  const meta = STATUS_META[status];
  const canSkip = !!onSkip && CAN_SKIP.includes(status);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleClick = () => {
    if (meta.disabled) return;
    onTap(slot.type);
  };

  const handleSkipClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onSkip?.(slot.type);
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen((v) => !v);
  };

  const borderClass = meta.dim
    ? "border-line bg-canvas opacity-60"
    : status === "DRAFT"
      ? "border-info bg-surface"
      : "border-line bg-surface hover:border-line-strong";

  const avatarClass =
    status === "DRAFT"
      ? "bg-info text-white"
      : status === "NONE"
        ? "bg-brand text-on-brand"
        : "bg-surface-2 text-fg-muted";

  return (
    <div
      className={`relative flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${borderClass}`}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={meta.disabled}
        className={`flex flex-1 items-center gap-3 text-left ${
          meta.disabled ? "cursor-not-allowed" : ""
        }`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarClass}`}
        >
          {slotLabelText(slot.label)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-fg">
              {slotLabelText(slot.label)}
            </span>
            {/* 주/야는 서버가 준 shift 로만 판단한다 (slot.type 접두어 아님). */}
            <ShiftBadge shift={slot.shift} compact />
          </div>
          <div className="text-xs text-fg-muted">
            {formatSlotTime(slot.time) || t("slot.timeUnset")}
          </div>
        </div>

        {meta.badge && (
          <span
            className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${meta.badge.color}`}
          >
            <Icon icon={meta.badge.icon} width={16} height={16} />
            {t(meta.badge.labelKey)}
          </span>
        )}

        {!meta.disabled && meta.actionLabelKey && (
          <span className="ml-1 inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-fg">
            {t(meta.actionLabelKey)}
            <Icon icon="solar:arrow-right-linear" width={14} height={14} />
          </span>
        )}
      </button>

      {canSkip && (
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={handleMenuToggle}
            aria-label={t("slot.openMenu")}
            className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2"
          >
            <Icon icon="solar:menu-dots-bold" width={20} height={20} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-10 min-w-35 overflow-hidden rounded-lg border border-edge bg-surface shadow-lg">
              <button
                type="button"
                onClick={handleSkipClick}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-surface-2"
              >
                <Icon
                  icon="solar:skip-next-bold"
                  width={16}
                  height={16}
                  className="text-fg-muted"
                />
                {t("slot.skip")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

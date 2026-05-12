import { Icon } from "@iconify/react";
import type { UserDetail } from "../api/types";
import {
  DEPARTMENT_LABEL,
  ROLE_LABEL,
  STATUS_BADGE,
} from "../lib/userLabels";

export const TOTAL_INSPECTION_SLOTS = 10;

interface Props {
  user: UserDetail;
  /** 오늘 완료한 검사 슬롯 수. PRODUCTION/QUALITY 만 의미 있음 */
  completedSlots?: number;
  onClick?: (user: UserDetail) => void;
}

const UserCard = ({ user, completedSlots = 0, onClick }: Props) => {
  const roleLabel = ROLE_LABEL[user.role] ?? "—";
  const departmentLabel = DEPARTMENT_LABEL[user.role] ?? "—";
  const badge = STATUS_BADGE[user.status];
  const initial = user.name?.charAt(0) ?? "?";

  const showProgress = user.role === "PRODUCTION" || user.role === "QUALITY";
  const ratio = Math.min(
    1,
    Math.max(0, completedSlots / TOTAL_INSPECTION_SLOTS),
  );
  const progressPct = Math.round(ratio * 100);

  return (
    <button
      type="button"
      onClick={() => onClick?.(user)}
      className="flex cursor-default flex-col gap-3 rounded-2xl bg-white px-5 py-4 text-left shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-base font-semibold text-[#6B7280]">
          {initial}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base font-bold text-[#212121]">
            {user.name}
          </span>
          <span className="truncate text-sm text-[#6B7280]">{roleLabel}</span>
          <span className="truncate text-xs text-[#A8A8A8]">
            {departmentLabel}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {badge && (
            <span
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: badge.color }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: badge.color }}
              />
              {badge.label}
            </span>
          )}
          <Icon
            icon="solar:alt-arrow-right-linear"
            width={18}
            height={18}
            className="text-[#A8A8A8]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[#F3F4F6] pt-3">
        <span
          className="flex items-center gap-1 text-xs"
          style={{ color: user.online ? "#22C55E" : "#A8A8A8" }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: user.online ? "#22C55E" : "#A8A8A8" }}
          />
          {user.online ? "접속 중" : "오프라인"}
        </span>

        {showProgress ? (
          <div className="flex flex-1 items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F3F4F6]">
              <div
                className="h-full rounded-full bg-[#931B82] transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium text-[#6B7280]">
              {completedSlots}/{TOTAL_INSPECTION_SLOTS}
            </span>
          </div>
        ) : (
          <span className="text-xs text-[#A8A8A8]">—</span>
        )}
      </div>
    </button>
  );
};

export default UserCard;

import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import type { UserDetail } from "../api/types";
import {
  DEPARTMENT_LABEL_KEY,
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
  const { t } = useTranslation("userSearch");
  const roleLabel = t(`roles.${user.role}`, {
    ns: "common",
    defaultValue: "—",
  });
  const deptKey = DEPARTMENT_LABEL_KEY[user.role];
  const departmentLabel = deptKey ? t(deptKey) : "—";
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
      className="flex cursor-default flex-col gap-3 rounded-2xl bg-surface px-5 py-4 text-left shadow-sm border border-edge"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-2 text-base font-semibold text-fg-muted">
          {initial}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base font-bold text-fg">
            {user.name}
          </span>
          <span className="truncate text-sm text-fg-muted">{roleLabel}</span>
          <span className="truncate text-xs text-fg-subtle">
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
              {t(badge.labelKey)}
            </span>
          )}
          <Icon
            icon="solar:alt-arrow-right-linear"
            width={18}
            height={18}
            className="text-fg-subtle"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
        <span
          className="flex items-center gap-1 text-xs"
          style={{ color: user.online ? "var(--color-success-fg)" : "var(--color-fg-subtle)" }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: user.online ? "var(--color-success)" : "var(--color-fg-faint)" }}
          />
          {user.online ? t("card.online") : t("card.offline")}
        </span>

        {showProgress ? (
          <div className="flex flex-1 items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium text-fg-muted">
              {completedSlots}/{TOTAL_INSPECTION_SLOTS}
            </span>
          </div>
        ) : (
          <span className="text-xs text-fg-subtle">—</span>
        )}
      </div>
    </button>
  );
};

export default UserCard;

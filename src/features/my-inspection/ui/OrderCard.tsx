import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import type { MyInspection } from "../type/types";
import { getStatusBadge } from "../lib/inspectionStatus";
import { opensNextSlot } from "../lib/nextEligible";
import { formatWorkDay } from "../../../lib/datetime";
import ShiftBadge from "../../../components/shared/ShiftBadge";
import { slotLabelText } from "../../../lib/slotLabel";

// 한 카드는 한 검사를 표현. /inspection/assigned 제거 후로는 my inspection 한 종류만 표시.

interface Props {
  inspection: MyInspection;
  /** DRAFT·SKIPPED 검사 한정 — ⋮ 메뉴에 "삭제" 항목 노출. */
  onRequestDelete?: (inspection: MyInspection) => void;
  /** COMPLETED 검사 한정 — 다음 시점 시작 액션. 마지막 시점이면 부모가 nextLabel 을 안 넘김. 값은 표시용 시점 이름. */
  nextLabel?: string | null;
  onStartNext?: (inspection: MyInspection) => void;
  isStartingNext?: boolean;
  /** COMPLETED 검사 한정 — 같은 슬롯으로 새 검사("다시 검사") 시작. */
  onRestart?: (inspection: MyInspection) => void;
  isRestarting?: boolean;
}

export default function OrderCard({
  inspection,
  onRequestDelete,
  nextLabel,
  onStartNext,
  isStartingNext,
  onRestart,
  isRestarting,
}: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation("myInspection");
  const badge = getStatusBadge(inspection.status);
  const canDelete =
    !!onRequestDelete &&
    (inspection.status === "DRAFT" || inspection.status === "SKIPPED");
  const showNext =
    !!nextLabel && !!onStartNext && opensNextSlot(inspection.status);
  // 다시 재기 = 같은 검사 재오픈. 순회검사가 시작된 건은 서버가 막으므로(반려로만 되돌림) 숨긴다.
  const canRestart =
    !!onRestart && inspection.status === "COMPLETED" && !inspection.hasCrossCheck;

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

  const handleCardClick = () => {
    if (inspection.status === "DRAFT") {
      navigate(`/inspection/${inspection.inspectionId}/measure`, {
        state: { inspection },
      });
      return;
    }
    // 종결된 검사는 상세 페이지(읽기 전용 미리보기)로.
    navigate(`/inspection/${inspection.inspectionId}`, {
      state: { inspection },
    });
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen((v) => !v);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onRequestDelete?.(inspection);
  };

  const handleStartNextClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartNext?.(inspection);
  };

  const handleRestartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRestart?.(inspection);
  };

  return (
    <div className="relative flex w-full flex-col gap-3 rounded-xl border border-edge bg-surface p-4 shadow-sm transition-colors hover:bg-surface-2">
      <div className="flex w-full items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleCardClick}
          className="flex flex-1 items-center justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            <div className="wrap-break-word text-base font-semibold text-fg">
              {inspection.product.name}
            </div>
            <div className="mt-0.5 truncate text-xs text-fg-muted">
              {inspection.customer.name} · {inspection.equipment.name}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-muted">
              <span className="truncate">{slotLabelText(inspection.typeLabel)}</span>
              <ShiftBadge shift={inspection.shift} compact />
            </div>
            {inspection.createdAt && (
              <div className="mt-0.5 truncate text-xs text-fg-subtle">
                {t("orderCard.workDate", {
                  date: formatWorkDay(inspection.createdAt),
                })}
              </div>
            )}
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${badge.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
            {t(badge.label, { defaultValue: badge.label })}
          </span>
        </button>

        {canDelete && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={handleMenuToggle}
              aria-label={t("orderCard.openMenu")}
              className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2"
            >
              <Icon icon="solar:menu-dots-bold" width={20} height={20} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-10 min-w-35 overflow-hidden rounded-lg border border-edge bg-surface shadow-lg">
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger-fg hover:bg-danger-soft"
                >
                  <Icon icon="solar:trash-bin-trash-bold" width={16} height={16} />
                  {t("orderCard.delete")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {(showNext || canRestart) && (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          {showNext && (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-fg-muted">
                <Icon
                  icon="solar:arrow-right-linear"
                  width={14}
                  height={14}
                  className="text-brand-fg"
                />
                <span>{t("orderCard.next")}</span>
                <span className="font-medium text-fg">{nextLabel}</span>
              </div>
              <button
                type="button"
                onClick={handleStartNextClick}
                disabled={isStartingNext}
                className="mt-2 h-10 w-full rounded-md bg-brand text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover disabled:bg-surface-3"
              >
                {isStartingNext
                  ? t("orderCard.starting")
                  : t("orderCard.startNext")}
              </button>
            </div>
          )}
          {canRestart && (
            <button
              type="button"
              onClick={handleRestartClick}
              disabled={isRestarting}
              className="h-10 w-full rounded-md border border-brand bg-surface text-sm font-semibold text-brand-fg transition-colors hover:bg-brand-soft disabled:opacity-60"
            >
              {isRestarting ? t("orderCard.starting") : t("orderCard.restart")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

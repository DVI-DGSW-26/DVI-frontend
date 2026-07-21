import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import type { MyInspection } from "../type/types";
import { getStatusBadge } from "../lib/inspectionStatus";
import { formatWorkDay } from "../../../lib/datetime";

// 한 카드는 한 검사를 표현. /inspection/assigned 제거 후로는 my inspection 한 종류만 표시.

interface Props {
  inspection: MyInspection;
  /** DRAFT·SKIPPED 검사 한정 — ⋮ 메뉴에 "삭제" 항목 노출. */
  onRequestDelete?: (inspection: MyInspection) => void;
  /** COMPLETED 검사 한정 — 다음 시점 시작 액션. 마지막 시점이면 부모가 nextType 을 안 넘김. */
  nextType?: string | null;
  onStartNext?: (inspection: MyInspection) => void;
  isStartingNext?: boolean;
  /** COMPLETED 검사 한정 — 같은 슬롯으로 새 검사("다시 검사") 시작. */
  onRestart?: (inspection: MyInspection) => void;
  isRestarting?: boolean;
}

export default function OrderCard({
  inspection,
  onRequestDelete,
  nextType,
  onStartNext,
  isStartingNext,
  onRestart,
  isRestarting,
}: Props) {
  const navigate = useNavigate();
  const badge = getStatusBadge(inspection.status);
  const canDelete =
    !!onRequestDelete &&
    (inspection.status === "DRAFT" || inspection.status === "SKIPPED");
  const showNext =
    !!nextType && !!onStartNext && inspection.status === "COMPLETED";
  const canRestart = !!onRestart && inspection.status === "COMPLETED";

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
    <div className="relative flex w-full flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50">
      <div className="flex w-full items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleCardClick}
          className="flex flex-1 items-center justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            <div className="wrap-break-word text-base font-semibold text-[#212121]">
              {inspection.product.name}
            </div>
            <div className="mt-0.5 truncate text-xs text-[#6B7280]">
              {inspection.customer.name} · {inspection.equipment.name}
            </div>
            <div className="mt-0.5 truncate text-xs text-[#6B7280]">
              {inspection.typeLabel}
            </div>
            {inspection.createdAt && (
              <div className="mt-0.5 truncate text-xs text-[#A8A8A8]">
                작업일: {formatWorkDay(inspection.createdAt)}
              </div>
            )}
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${badge.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </button>

        {canDelete && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={handleMenuToggle}
              aria-label="메뉴 열기"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6]"
            >
              <Icon icon="solar:menu-dots-bold" width={20} height={20} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-10 min-w-35 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#DC2626] hover:bg-[#FEF2F2]"
                >
                  <Icon icon="solar:trash-bin-trash-bold" width={16} height={16} />
                  삭제
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {(showNext || canRestart) && (
        <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
          {showNext && (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                <Icon
                  icon="solar:arrow-right-linear"
                  width={14}
                  height={14}
                  className="text-[#931B82]"
                />
                <span>다음:</span>
                <span className="font-medium text-[#212121]">{nextType}</span>
              </div>
              <button
                type="button"
                onClick={handleStartNextClick}
                disabled={isStartingNext}
                className="mt-2 h-10 w-full rounded-md bg-[#931B82] text-sm font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
              >
                {isStartingNext ? "시작 중..." : "다음 시점 시작"}
              </button>
            </div>
          )}
          {canRestart && (
            <button
              type="button"
              onClick={handleRestartClick}
              disabled={isRestarting}
              className="h-10 w-full rounded-md border border-[#931B82] bg-white text-sm font-semibold text-[#931B82] transition-colors hover:bg-[#F3E8F7] disabled:opacity-60"
            >
              {isRestarting ? "시작 중..." : "다시 검사 시작"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

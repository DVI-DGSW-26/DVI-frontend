import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import { usePendingCrossChecks, useDeleteCrossCheckById } from "../api";
import type { CrossCheckSummary } from "../api";
import { useAuth } from "../../auth/AuthContext";
import { getStage, STAGE_LABEL, STAGE_BADGE } from "../lib/stage";
import { formatDate, formatDateTime } from "../../../lib/datetime";
import {
  DEFAULT_DATE_FILTER,
  isDateFilterActive,
  matchesDateFilter,
  type DateFilterValue,
} from "../lib/dateFilter";
import DateRangeFilter from "./DateRangeFilter";
import DeleteInspectionModal from "../../my-inspection/ui/DeleteInspectionModal";
import Toast from "../../inspection/ui/Toast";

function toDeleteErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { code?: string; message?: string } | undefined;
    switch (data?.code) {
      case "CROSS_CHECK_ALREADY_FINISHED":
        return "이미 승인(보고서 발행)된 순회검사는 삭제할 수 없습니다.";
      case "CROSS_CHECK_NOT_FOUND":
        return "이미 삭제되었거나 존재하지 않는 순회검사입니다.";
      default:
        return data?.message ?? "삭제 중 오류가 발생했습니다.";
    }
  }
  return "삭제 중 오류가 발생했습니다.";
}

const PROCESS_LABEL: Record<string, string> = {
  EXTRUSION: "압출",
  AL_CUTTING: "AL절단",
  ST_CUTTING: "ST절단",
  MACHINING: "가공",
  PRESS: "프레스",
};

// 결재 목록에 섞여 오는 상태별 배지/노출 순서.
// PENDING_APPROVAL(결재 대기)을 먼저, DRAFT(진행중)를 뒤에 둔다.
const STATUS_META: Record<
  string,
  { label: string; bg: string; fg: string; order: number }
> = {
  PENDING_APPROVAL: { label: "결재 대기", bg: "#FEF3C7", fg: "#B45309", order: 0 },
  DRAFT: { label: "진행중", bg: "#DBEAFE", fg: "#1D4ED8", order: 1 },
  REJECTED: { label: "반려", bg: "#FEE2E2", fg: "#B91C1C", order: 2 },
  APPROVED: { label: "승인", bg: "#DCFCE7", fg: "#15803D", order: 3 },
};

const STATUS_ORDER = Object.keys(STATUS_META).sort(
  (a, b) => STATUS_META[a].order - STATUS_META[b].order,
);

export default function CrossCheckApprovalPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // 알림에서 진입 시 강조할 순회검사 id (?highlight=123).
  const highlightId = Number(searchParams.get("highlight")) || null;
  const { user } = useAuth();
  const {
    data: crossChecks = [],
    isLoading,
    isError,
  } = usePendingCrossChecks();
  const [dateFilter, setDateFilter] =
    useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  // 목록에서 바로 삭제 — 확인 모달 대상.
  const [deleteTarget, setDeleteTarget] = useState<CrossCheckSummary | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);
  const deleteMut = useDeleteCrossCheckById();

  // 관리자(ADMIN/QUALITY_ADMIN)만 삭제. APPROVED(보고서 발행)는 백엔드가 거부하므로
  // 버튼도 숨긴다(결재 목록엔 원래 안 뜨지만 방어).
  const canDelete =
    user?.role === "QUALITY_ADMIN" || user?.role === "ADMIN";

  // 최근 결재 요청부터 위로 (updatedAt 우선, 없으면 createdAt)
  const sorted = useMemo(
    () =>
      [...crossChecks].sort((a, b) => {
        const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
        const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
        return tb - ta;
      }),
    [crossChecks],
  );

  // 검사 일시 기준 필터.
  const filtered = useMemo(
    () => sorted.filter((cc) => matchesDateFilter(cc.inspectionTime, dateFilter)),
    [sorted, dateFilter],
  );

  // 상태별 섹션으로 묶는다 — 결재 대기 → 진행중 → (반려/승인) 순.
  const groups = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        items: filtered.filter((cc) => cc.status === status),
      })).filter((g) => g.items.length > 0),
    [filtered],
  );

  // 상단 요약 카운트 (날짜 필터와 무관하게 전체 기준).
  const pendingCount = sorted.filter(
    (c) => c.status === "PENDING_APPROVAL",
  ).length;
  const draftCount = sorted.filter((c) => c.status === "DRAFT").length;

  // 강조 대상 카드로 스크롤.
  const highlightRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, filtered.length]);

  const handleOpen = (cc: CrossCheckSummary) => {
    navigate(`/cross-check-approval/${cc.crossCheckId}`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.crossCheckId);
      setToast("순회검사를 삭제했습니다.");
    } catch (err) {
      setToast(toDeleteErrorMessage(err));
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:p-6 md:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">순회검사 결재</h1>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-medium text-[#B45309]">
            결재 대기 {pendingCount}건
          </span>
          <span className="rounded-full bg-[#DBEAFE] px-3 py-1 text-xs font-medium text-[#1D4ED8]">
            진행중 {draftCount}건
          </span>
        </div>
      </div>

      {!isLoading && !isError && sorted.length > 0 && (
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
      )}

      {isLoading && (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          불러오는 중...
        </p>
      )}

      {isError && (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
          목록을 불러오지 못했습니다.
        </p>
      )}

      {!isLoading && !isError && sorted.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-16 text-center">
          <Icon
            icon="solar:check-circle-bold"
            width={40}
            height={40}
            className="text-[#22C55E]"
          />
          <span className="text-sm font-medium text-[#212121]">
            결재 대기·진행중인 순회검사가 없습니다
          </span>
          <span className="text-xs text-[#6B7280]">
            품질 담당자가 순회검사를 시작하거나 결재 요청하면 여기에 표시됩니다
          </span>
        </div>
      )}

      {!isLoading && !isError && sorted.length > 0 && filtered.length === 0 && (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          {isDateFilterActive(dateFilter)
            ? "선택한 기간에 해당하는 순회검사가 없습니다."
            : "결재 대기·진행중인 순회검사가 없습니다"}
        </p>
      )}

      {!isLoading && !isError && groups.length > 0 && (
        <div className="flex flex-col gap-5">
          {groups.map((group) => {
            const meta = STATUS_META[group.status];
            return (
              <section key={group.status} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-[#212121]">
                    {meta.label}
                  </h2>
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: meta.bg, color: meta.fg }}
                  >
                    {group.items.length}
                  </span>
                </div>
                <ul className="flex flex-col gap-3">
                  {group.items.map((cc) => {
                    const highlighted = cc.crossCheckId === highlightId;
                    return (
                      <li
                        key={cc.crossCheckId}
                        ref={highlighted ? highlightRef : undefined}
                      >
                        <ApprovalCard
                          cc={cc}
                          highlighted={highlighted}
                          canDelete={canDelete && cc.status !== "APPROVED"}
                          onClick={() => handleOpen(cc)}
                          onDelete={() => setDeleteTarget(cc)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <DeleteInspectionModal
        open={deleteTarget !== null}
        isSubmitting={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function ApprovalCard({
  cc,
  highlighted,
  canDelete,
  onClick,
  onDelete,
}: {
  cc: CrossCheckSummary;
  highlighted: boolean;
  canDelete: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const meta = STATUS_META[cc.status] ?? STATUS_META.DRAFT;
  const isDraft = cc.status === "DRAFT";
  const stage = getStage(cc.type, cc.product.process);
  return (
    <div
      className={`relative flex items-stretch rounded-2xl border bg-white shadow-sm transition-colors hover:border-[#931B82] ${
        highlighted
          ? "border-[#931B82] ring-2 ring-[#931B82] ring-offset-2"
          : "border-gray-200"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-stretch gap-4 rounded-l-2xl p-4 text-left transition-colors hover:bg-[#FDF7FB]"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="wrap-break-word text-base font-semibold text-[#212121]">
              {cc.product.name}
            </span>
            <span className="rounded-md bg-[#F3E8F7] px-2 py-0.5 text-xs font-medium text-[#931B82]">
              {cc.product.code}
            </span>
            <span
              className="rounded-md px-2 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: meta.bg, color: meta.fg }}
            >
              {meta.label}
            </span>
            {stage && (
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STAGE_BADGE[stage]}`}
              >
                {STAGE_LABEL[stage]}
              </span>
            )}
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <InfoLine
              label="공정"
              value={PROCESS_LABEL[cc.product.process] ?? cc.product.process}
            />
            <InfoLine label="설비" value={cc.equipment.name} />
            <InfoLine label="고객사" value={cc.customer.name} />
            <InfoLine label="작업자" value={cc.production.name} />
            <InfoLine label="검사 차수" value={`${cc.typeLabel} (${cc.type})`} />
            <InfoLine label="시작일" value={formatDate(cc.createdAt)} />
            <InfoLine
              className="col-span-2"
              label={isDraft ? "최근 저장" : "결재 요청"}
              value={formatDateTime(cc.updatedAt ?? cc.createdAt)}
            />
          </dl>
        </div>
      </button>

      <div className="flex shrink-0 flex-col items-center justify-center gap-3 border-l border-gray-100 px-3">
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="삭제"
            aria-label="순회검사 삭제"
            className="flex items-center justify-center rounded-md p-1.5 text-[#EF4444] transition-colors hover:bg-[#FEF2F2]"
          >
            <Icon icon="solar:trash-bin-trash-linear" width={18} height={18} />
          </button>
        )}
        <Icon
          icon="solar:alt-arrow-right-linear"
          width={20}
          height={20}
          className="text-[#931B82]"
        />
      </div>
    </div>
  );
}

function InfoLine({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 text-[#6B7280] ${className ?? ""}`}
    >
      <span className="shrink-0">{label}</span>
      <span className="ml-auto min-w-0 truncate text-right text-[#212121]">
        {value}
      </span>
    </div>
  );
}

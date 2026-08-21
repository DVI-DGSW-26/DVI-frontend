import { useMemo, useState, type ReactNode } from "react";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import {
  useAdminDeleteInspection,
  useAdminInspectionList,
  type AdminInspection,
  type DeleteInspectionErrorData,
} from "../api";
import type { MyInspectionStatus } from "../../my-inspection/type/types";
import DeleteInspectionModal from "../../my-inspection/ui/DeleteInspectionModal";
import Toast from "../../inspection/ui/Toast";
import { formatDate } from "../../../lib/datetime";
import ShiftBadge from "../../../components/shared/ShiftBadge";

type StatusTab = "ALL" | "DRAFT" | "COMPLETED" | "INCOMPLETE";

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "DRAFT", label: "작성중" },
  { key: "COMPLETED", label: "완료" },
  { key: "INCOMPLETE", label: "미완료" },
  { key: "ALL", label: "전체" },
];

const STATUS_BADGE: Record<
  MyInspectionStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "작성중",
    className: "border-[#FDE68A] bg-[#FEF3C7] text-[#B45309]",
  },
  COMPLETED: {
    label: "완료",
    className: "border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D]",
  },
  INCOMPLETE: {
    label: "미완료",
    className: "border-[#FECACA] bg-[#FEE2E2] text-[#B91C1C]",
  },
  INCOMPLETE_APPROVED: {
    label: "미완료(승인)",
    className: "border-gray-200 bg-[#F3F4F6] text-[#6B7280]",
  },
  SKIPPED: {
    label: "건너뜀",
    className: "border-gray-200 bg-[#F3F4F6] text-[#9CA3AF]",
  },
};

function matchesTab(status: MyInspectionStatus, tab: StatusTab): boolean {
  switch (tab) {
    case "DRAFT":
      return status === "DRAFT";
    case "COMPLETED":
      return status === "COMPLETED";
    case "INCOMPLETE":
      return status === "INCOMPLETE" || status === "INCOMPLETE_APPROVED";
    case "ALL":
    default:
      return true;
  }
}

function toDeleteErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as DeleteInspectionErrorData | undefined;
    switch (data?.code) {
      case "INSPECTION_NOT_DELETABLE":
        return "작성중(DRAFT) 상태만 삭제할 수 있습니다.";
      case "NOT_OWNER":
        return "삭제 권한이 없습니다.";
      default:
        return data?.message ?? "삭제 중 오류가 발생했습니다.";
    }
  }
  return "삭제 중 오류가 발생했습니다.";
}

export default function AdminInspectionListPage() {
  const [tab, setTab] = useState<StatusTab>("DRAFT");
  const [deleteTarget, setDeleteTarget] = useState<AdminInspection | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const listQuery = useAdminInspectionList();
  const deleteMutation = useAdminDeleteInspection();

  const inspections = useMemo(
    () => listQuery.data ?? [],
    [listQuery.data],
  );

  const counts = useMemo<Record<StatusTab, number>>(
    () => ({
      ALL: inspections.length,
      DRAFT: inspections.filter((i) => matchesTab(i.status, "DRAFT")).length,
      COMPLETED: inspections.filter((i) => matchesTab(i.status, "COMPLETED"))
        .length,
      INCOMPLETE: inspections.filter((i) => matchesTab(i.status, "INCOMPLETE"))
        .length,
    }),
    [inspections],
  );

  const filtered = useMemo(
    () => inspections.filter((i) => matchesTab(i.status, tab)),
    [inspections, tab],
  );

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.inspectionId);
      setToast("검사를 삭제했습니다.");
      setDeleteTarget(null);
    } catch (err) {
      setToast(toDeleteErrorMessage(err));
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:p-6 md:pb-6">
      <div>
        <h1 className="text-xl font-semibold">자주검사 관리</h1>
        <p className="mt-1 text-xs text-[#6B7280]">
          불필요하거나 잘못 시작된 자주검사를 삭제합니다. 작성중(DRAFT) 상태만
          삭제할 수 있습니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? "bg-[#931B82] text-white"
                : "border border-gray-200 bg-white text-[#6B7280] hover:bg-gray-50"
            }`}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      {listQuery.isLoading ? (
        <div className="flex min-h-40 items-center justify-center text-xs text-[#A8A8A8]">
          불러오는 중...
        </div>
      ) : listQuery.isError ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
          <span className="text-sm text-[#EF4444]">
            목록을 불러오지 못했습니다.
          </span>
          <button
            type="button"
            onClick={() => listQuery.refetch()}
            className="h-9 rounded-md border border-gray-200 px-3 text-xs font-medium text-[#6B7280] hover:bg-gray-50"
          >
            다시 시도
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center text-xs text-[#A8A8A8]">
          해당 상태의 검사가 없습니다.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((item) => {
            const badge = STATUS_BADGE[item.status];
            const deletable = item.status === "DRAFT";
            return (
              <li
                key={item.inspectionId}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-[#212121]">
                      {item.product.name}
                    </span>
                    <span className="rounded-md bg-[#F3E8F7] px-2 py-0.5 text-[11px] font-medium text-[#931B82]">
                      {item.product.code}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-[#6B7280] sm:grid-cols-3">
                    <Meta
                      label="차수"
                      value={`${item.typeLabel} (${item.type})`}
                      suffix={<ShiftBadge shift={item.shift} compact />}
                    />
                    <Meta label="작성자" value={item.production?.name ?? "-"} />
                    <Meta label="설비" value={item.equipment.name} />
                    <Meta label="시작일" value={formatDate(item.createdAt)} />
                  </dl>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(item)}
                  disabled={!deletable || deleteMutation.isPending}
                  title={
                    deletable
                      ? "삭제"
                      : "작성중(DRAFT) 상태만 삭제할 수 있습니다."
                  }
                  className="flex shrink-0 items-center gap-1 rounded-md border border-[#EF4444] px-3 py-1.5 text-xs font-medium text-[#EF4444] transition-colors hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-[#D1D5DB] disabled:hover:bg-transparent"
                >
                  <Icon icon="solar:trash-bin-trash-linear" width={14} height={14} />
                  삭제
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <DeleteInspectionModal
        open={deleteTarget !== null}
        isSubmitting={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function Meta({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  /** 값 뒤에 붙일 배지 등. 없으면 아무것도 그리지 않는다. */
  suffix?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="shrink-0 text-[#9CA3AF]">{label}</span>
      <span className="min-w-0 truncate text-[#374151]">{value}</span>
      {suffix}
    </div>
  );
}

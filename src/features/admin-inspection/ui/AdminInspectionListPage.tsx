import { useMemo, useState, type ReactNode } from "react";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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
import { useViewState } from "../../../lib/viewState";
import { slotLabelWithShift } from "../../../lib/slotLabel";

type StatusTab = "ALL" | "DRAFT" | "COMPLETED" | "INCOMPLETE";

// label 은 adminInspection 네임스페이스 i18n 키.
const STATUS_TABS: { key: StatusTab; labelKey: string }[] = [
  { key: "DRAFT", labelKey: "tabs.draft" },
  { key: "COMPLETED", labelKey: "tabs.completed" },
  { key: "INCOMPLETE", labelKey: "tabs.incomplete" },
  { key: "ALL", labelKey: "tabs.all" },
];

const STATUS_BADGE: Record<
  MyInspectionStatus,
  { labelKey: string; className: string }
> = {
  DRAFT: {
    labelKey: "status.draft",
    className: "border-[#FDE68A] bg-[#FEF3C7] text-[#B45309]",
  },
  COMPLETED: {
    labelKey: "status.completed",
    className: "border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D]",
  },
  INCOMPLETE: {
    labelKey: "status.incomplete",
    className: "border-[#FECACA] bg-[#FEE2E2] text-[#B91C1C]",
  },
  INCOMPLETE_APPROVED: {
    labelKey: "status.incompleteApproved",
    className: "border-gray-200 bg-[#F3F4F6] text-[#6B7280]",
  },
  SKIPPED: {
    labelKey: "status.skipped",
    className: "border-gray-200 bg-[#F3F4F6] text-[#9CA3AF]",
  },
  TERMINATED: {
    labelKey: "status.terminated",
    className: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]",
  },
};

// 서버에 새 상태가 생겨도 목록 전체가 죽지 않도록 — TERMINATED 추가 때 실제로 크래시났다.
const UNKNOWN_BADGE = {
  labelKey: "status.unknown",
  className: "border-gray-200 bg-[#F3F4F6] text-[#6B7280]",
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

function toDeleteErrorMessage(err: unknown, t: TFunction): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as DeleteInspectionErrorData | undefined;
    switch (data?.code) {
      case "INSPECTION_NOT_DELETABLE":
        return t("errors.notDeletable");
      case "NOT_OWNER":
        return t("errors.notOwner");
      default:
        return data?.message ?? t("errors.deleteFailed");
    }
  }
  return t("errors.deleteFailed");
}

export default function AdminInspectionListPage() {
  const { t } = useTranslation("adminInspection");
  // 보던 탭은 뒤로가기로 돌아왔을 때 그대로여야 한다.
  const [tab, setTab] = useViewState<StatusTab>("tab", "DRAFT");
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
      setToast(t("page.deleted"));
      setDeleteTarget(null);
    } catch (err) {
      setToast(toDeleteErrorMessage(err, t));
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:p-6 md:pb-6">
      <div>
        <h1 className="text-xl font-semibold">{t("page.title")}</h1>
        <p className="mt-1 text-xs text-[#6B7280]">{t("page.desc")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            type="button"
            onClick={() => setTab(tabItem.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === tabItem.key
                ? "bg-[#931B82] text-white"
                : "border border-gray-200 bg-white text-[#6B7280] hover:bg-gray-50"
            }`}
          >
            {t(tabItem.labelKey)} ({counts[tabItem.key]})
          </button>
        ))}
      </div>

      {listQuery.isLoading ? (
        <div className="flex min-h-40 items-center justify-center text-xs text-[#A8A8A8]">
          {t("common:status.loading")}
        </div>
      ) : listQuery.isError ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
          <span className="text-sm text-[#EF4444]">{t("page.loadError")}</span>
          <button
            type="button"
            onClick={() => listQuery.refetch()}
            className="h-9 rounded-md border border-gray-200 px-3 text-xs font-medium text-[#6B7280] hover:bg-gray-50"
          >
            {t("common:actions.retry")}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center text-xs text-[#A8A8A8]">
          {t("page.empty")}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((item) => {
            const badge = STATUS_BADGE[item.status] ?? UNKNOWN_BADGE;
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
                      {t(badge.labelKey)}
                    </span>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-[#6B7280] sm:grid-cols-3">
                    <Meta
                      label={t("meta.round")}
                      value={slotLabelWithShift(item.typeLabel, item.type)}
                      suffix={<ShiftBadge shift={item.shift} compact />}
                    />
                    <Meta label={t("meta.writer")} value={item.production?.name ?? "-"} />
                    <Meta label={t("meta.equipment")} value={item.equipment.name} />
                    <Meta label={t("meta.startDate")} value={formatDate(item.createdAt)} />
                  </dl>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(item)}
                  disabled={!deletable || deleteMutation.isPending}
                  title={
                    deletable
                      ? t("common:actions.delete")
                      : t("page.deleteDisabledTitle")
                  }
                  className="flex shrink-0 items-center gap-1 rounded-md border border-[#EF4444] px-3 py-1.5 text-xs font-medium text-[#EF4444] transition-colors hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-[#D1D5DB] disabled:hover:bg-transparent"
                >
                  <Icon icon="solar:trash-bin-trash-linear" width={14} height={14} />
                  {t("common:actions.delete")}
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

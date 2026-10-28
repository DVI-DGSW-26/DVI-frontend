import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import CreateInspectionOrderDrawer from "./CreateInspectionOrderDrawer";
import {
  useCopyInspectionOrders,
  useDeleteInspectionOrder,
  useInspectionOrderList,
} from "../api";
import type { InspectionOrder, InspectionOrderStatus } from "../api";
import { orderWorkers, workerNames } from "../lib/orderWorkers";
import { kstDateKey } from "../../../lib/datetime";
import { useViewState } from "../../../lib/viewState";
import ShiftBadge from "../../../components/shared/ShiftBadge";

// 상태 코드 → inspectionOrders 네임스페이스 i18n 키
const STATUS_LABEL_KEY: Record<string, string> = {
  PENDING: "status.pending",
  DRAFT: "status.pending",
  INCOMPLETE: "status.inProgress",
  INCOMPLETE_APPROVED: "status.completedApproved",
  COMPLETED: "status.completed",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-warn-soft text-warn-fg",
  DRAFT: "bg-warn-soft text-warn-fg",
  INCOMPLETE: "bg-info-soft text-info-fg",
  INCOMPLETE_APPROVED: "bg-success-soft text-success-fg",
  COMPLETED: "bg-success-soft text-success-fg",
};

type SummaryKey = "DRAFT" | "INCOMPLETE" | "DONE";

const SUMMARY_CARDS: {
  key: SummaryKey;
  labelKey: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}[] = [
  {
    key: "INCOMPLETE",
    labelKey: "list.summary.inProgress",
    icon: "mdi:progress-clock",
    iconBg: "bg-info-soft",
    iconColor: "text-info-fg",
  },
  {
    key: "DRAFT",
    labelKey: "list.summary.pending",
    icon: "material-symbols:schedule-outline",
    iconBg: "bg-warn-soft",
    iconColor: "text-warn-fg",
  },
  {
    key: "DONE",
    labelKey: "list.summary.done",
    icon: "mdi:check-circle-outline",
    iconBg: "bg-success-soft",
    iconColor: "text-success-fg",
  },
];

function summaryKeyOf(status: InspectionOrderStatus): SummaryKey | null {
  if (status === "PENDING" || status === "DRAFT") return "DRAFT";
  if (status === "INCOMPLETE") return "INCOMPLETE";
  if (status === "COMPLETED" || status === "INCOMPLETE_APPROVED") return "DONE";
  return null;
}

function statusBadge(status: InspectionOrderStatus, t: TFunction) {
  const labelKey = STATUS_LABEL_KEY[status];
  const label = labelKey ? t(labelKey) : status;
  const style = STATUS_STYLE[status] ?? "bg-surface-2 text-fg-muted";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

// 어제 지시 복사의 기준 날짜(KST 달력 날짜).
function copyDatesNow() {
  const now = new Date();
  return {
    today: kstDateKey(now),
    yesterday: kstDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
  };
}

export default function InspectionOrdersPage() {
  const { t } = useTranslation("inspectionOrders");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InspectionOrder | null>(null);
  // 지시를 눌러 다른 화면에 갔다 돌아와도 걸어 둔 조건 그대로.
  const [selectedDate, setSelectedDate] = useViewState("selectedDate", "");
  const [keyword, setKeyword] = useViewState("keyword", "");
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { data: orders = [], isLoading, isError } = useInspectionOrderList();
  const { mutate: remove, isPending: isDeleting } = useDeleteInspectionOrder();
  const { mutate: copyOrders, isPending: isCopying } = useCopyInspectionOrders();

  // 어제 지시를 오늘로 그대로 옮겨 등록하는 기능용 (KST 기준 달력 날짜).
  // 렌더 중 현재시각을 읽지 않도록 상태로 들고, 1분마다 다시 계산한다 — 화면을 띄워 둔
  // 채 날이 바뀌면 그제 지시를 어제 날짜로 복사하게 된다.
  const [{ today, yesterday }, setCopyDates] = useState(copyDatesNow);
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = copyDatesNow();
      setCopyDates((prev) => (prev.today === next.today ? prev : next));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);
  const yesterdayOrders = useMemo(
    () => orders.filter((o) => o.targetDate?.slice(0, 10) === yesterday),
    [orders, yesterday],
  );

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return orders.filter((o) => {
      if (selectedDate && o.targetDate?.slice(0, 10) !== selectedDate) return false;
      if (!kw) return true;
      // 제품명·제품코드·고객사·설비·자주검사자(공동 작업자 전원) 이름을 통합 검색.
      const haystack = [
        o.product?.name,
        o.product?.code,
        o.customer?.name,
        o.equipment?.name,
        ...orderWorkers(o).map((w) => w.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(kw);
    });
  }, [orders, selectedDate, keyword]);

  const counts = useMemo(() => {
    const c: Record<SummaryKey, number> = { DRAFT: 0, INCOMPLETE: 0, DONE: 0 };
    for (const o of filtered) {
      const key = summaryKeyOf(o.status);
      if (key) c[key] += 1;
    }
    return c;
  }, [filtered]);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (order: InspectionOrder) => {
    setEditing(order);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditing(null);
  };

  // 어제 지시를 오늘 날짜로 복제. 이미 등록된 동일 지시는 백엔드가 409 로
  // 막으므로 실패가 아니라 "건너뜀"으로 집계해 결과만 알려준다.
  const handleCopyYesterday = () => {
    if (isCopying || yesterdayOrders.length === 0) return;
    const confirmed = window.confirm(
      t("list.copyConfirm", { yesterday, n: yesterdayOrders.length, today }),
    );
    if (!confirmed) return;
    copyOrders(
      { orders: yesterdayOrders, targetDate: today },
      {
        onSuccess: (result) => {
          const parts = [t("list.copyResultCreated", { n: result.created })];
          if (result.duplicated > 0)
            parts.push(t("list.copyResultDuplicated", { n: result.duplicated }));
          if (result.failed > 0)
            parts.push(t("list.copyResultFailed", { n: result.failed }));
          alert(parts.join(" · "));
        },
        onError: () => alert(t("list.copyError")),
      },
    );
  };

  const handleDelete = (order: InspectionOrder) => {
    if (isDeleting) return;
    const label = order.product?.name ?? t("list.deleteFallbackName");
    if (!window.confirm(t("list.deleteConfirm", { name: label }))) return;
    remove(order.id, {
      onError: () => {
        alert(t("list.deleteError"));
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:p-6 md:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("list.title")}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyYesterday}
            disabled={isCopying || yesterdayOrders.length === 0}
            title={
              yesterdayOrders.length === 0
                ? t("list.copyTitleNone", { date: yesterday })
                : t("list.copyTitle", { date: yesterday, n: yesterdayOrders.length })
            }
            className="flex items-center gap-1.5 rounded-lg border border-brand px-3 py-2 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:border-line-strong disabled:text-fg-subtle disabled:hover:bg-transparent md:px-4"
          >
            <Icon
              icon={isCopying ? "mdi:loading" : "mdi:content-copy"}
              width={18}
              height={18}
              className={isCopying ? "animate-spin" : undefined}
            />
            <span className="hidden sm:inline">
              {isCopying ? t("list.copying") : t("list.copyYesterday")}
            </span>
            <span className="sm:hidden">{t("list.copyShort")}</span>
            {yesterdayOrders.length > 0 && !isCopying && (
              <span className="text-xs">({yesterdayOrders.length})</span>
            )}
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover md:px-4"
          >
            <Icon icon="mdi:plus" width={18} height={18} />
            <span className="hidden sm:inline">{t("list.create")}</span>
            <span className="sm:hidden">{t("list.createShort")}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {SUMMARY_CARDS.map((card) => (
          <div
            key={card.key}
            className="flex items-center gap-3 rounded-xl border border-edge bg-surface p-3 md:p-4"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg md:h-10 md:w-10 ${card.iconBg} ${card.iconColor}`}
            >
              <Icon icon={card.icon} width={20} height={20} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-fg-muted">{t(card.labelKey)}</div>
              <div className="text-lg font-semibold text-fg md:text-xl">
                {counts[card.key]}
                <span className="ml-0.5 text-xs font-normal text-fg-muted">
                  {t("list.countUnit")}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-45 flex-1">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("list.searchPlaceholder")}
            className="h-9 w-full rounded-full border border-line-strong bg-surface pl-9 pr-3 text-xs focus:border-brand focus:outline-none"
          />
          <Icon
            icon="solar:magnifer-linear"
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
          />
        </div>
        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 rounded-full border border-line-strong bg-surface pl-3 pr-8 text-xs focus:border-brand focus:outline-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
          />
          <Icon
            icon="solar:calendar-linear"
            width={16}
            height={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted"
          />
        </div>
        {selectedDate && (
          <button
            type="button"
            onClick={() => setSelectedDate("")}
            className="h-9 rounded-full border border-line-strong bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:border-brand hover:text-brand-fg"
          >
            {t("list.reset")}
          </button>
        )}
      </div>

      {isMobile ? (
        <MobileList
          orders={filtered}
          isLoading={isLoading}
          isError={isError}
          isDeleting={isDeleting}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      ) : (
        <DesktopTable
          orders={filtered}
          isLoading={isLoading}
          isError={isError}
          isDeleting={isDeleting}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <CreateInspectionOrderDrawer open={open} onClose={close} order={editing} />
    </div>
  );
}

interface ListProps {
  orders: InspectionOrder[];
  isLoading: boolean;
  isError: boolean;
  isDeleting: boolean;
  onEdit: (order: InspectionOrder) => void;
  onDelete: (order: InspectionOrder) => void;
}

function DesktopTable({ orders, isLoading, isError, isDeleting, onEdit, onDelete }: ListProps) {
  const { t } = useTranslation("inspectionOrders");
  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-brand-soft text-fg-muted">
          <tr>
            <th className="px-4 py-3 text-left font-medium">{t("list.table.date")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("list.table.product")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("list.table.equipment")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("list.table.customer")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("list.table.worker")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("list.table.status")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("list.table.manage")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-fg">
          {isLoading && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-fg-subtle">
                {t("list.loading")}
              </td>
            </tr>
          )}
          {isError && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-danger-fg">
                {t("list.loadError")}
              </td>
            </tr>
          )}
          {!isLoading && !isError && orders.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-fg-subtle">
                {t("list.empty")}
              </td>
            </tr>
          )}
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-surface-2">
              {/* 주·야 동시 등록이면 같은 제품·설비·날짜 행이 2개라 교대로 구분한다. */}
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5">
                  {order.targetDate}
                  <ShiftBadge shift={order.shift} compact />
                </span>
              </td>
              <td className="px-4 py-3">{order.product?.name ?? "-"}</td>
              <td className="px-4 py-3">{order.equipment?.name ?? "-"}</td>
              <td className="px-4 py-3">{order.customer?.name ?? "-"}</td>
              <td className="px-4 py-3">{workerNames(order)}</td>
              <td className="px-4 py-3">{statusBadge(order.status, t)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(order)}
                    aria-label={t("common:actions.edit")}
                    className="rounded p-1.5 text-fg-muted transition-colors hover:bg-brand-soft hover:text-brand-fg"
                  >
                    <Icon icon="mdi:pencil-outline" width={18} height={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(order)}
                    disabled={isDeleting}
                    aria-label={t("common:actions.delete")}
                    className="rounded p-1.5 text-fg-muted transition-colors hover:bg-danger-soft hover:text-danger-fg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon icon="mdi:trash-can-outline" width={18} height={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileList({ orders, isLoading, isError, isDeleting, onEdit, onDelete }: ListProps) {
  const { t } = useTranslation("inspectionOrders");
  if (isLoading) {
    return (
      <div className="rounded-xl border border-edge bg-surface px-4 py-10 text-center text-sm text-fg-subtle">
        {t("list.loading")}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-xl border border-edge bg-surface px-4 py-10 text-center text-sm text-danger-fg">
        {t("list.loadError")}
      </div>
    );
  }
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-edge bg-surface px-4 py-10 text-center text-sm text-fg-subtle">
        {t("list.empty")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {orders.map((order) => (
        <div
          key={order.id}
          className="rounded-xl border border-edge bg-surface p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-base font-semibold text-fg">
                  {order.product?.name ?? "-"}
                </span>
                <ShiftBadge shift={order.shift} compact />
              </div>
              <div className="mt-0.5 truncate text-xs text-fg-muted">
                {order.customer?.name ?? "-"} · {order.equipment?.name ?? "-"}
              </div>
            </div>
            {statusBadge(order.status, t)}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-y-1.5 text-xs">
            <InfoRow
              icon="mdi:calendar-outline"
              label={t("list.table.date")}
              value={order.targetDate}
            />
            <InfoRow
              icon="mdi:account-hard-hat"
              label={t("list.table.worker")}
              value={workerNames(order)}
            />
          </div>

          <div className="mt-3 flex items-center justify-end gap-1 border-t border-line pt-2">
            <button
              type="button"
              onClick={() => onEdit(order)}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-brand-soft hover:text-brand-fg"
            >
              <Icon icon="mdi:pencil-outline" width={16} height={16} />
              {t("common:actions.edit")}
            </button>
            <button
              type="button"
              onClick={() => onDelete(order)}
              disabled={isDeleting}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-danger-soft hover:text-danger-fg disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon icon="mdi:trash-can-outline" width={16} height={16} />
              {t("common:actions.delete")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-fg-muted">
      <Icon icon={icon} width={14} height={14} className="shrink-0" />
      <span className="shrink-0">{label}</span>
      <span className="ml-auto truncate text-fg">{value}</span>
    </div>
  );
}

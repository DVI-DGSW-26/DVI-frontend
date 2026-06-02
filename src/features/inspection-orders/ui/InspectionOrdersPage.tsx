import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import CreateInspectionOrderDrawer from "./CreateInspectionOrderDrawer";
import { useDeleteInspectionOrder, useInspectionOrderList } from "../api";
import type { InspectionOrder, InspectionOrderStatus } from "../api";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "대기",
  INCOMPLETE: "진행중",
  INCOMPLETE_APPROVED: "완료(승인)",
  COMPLETED: "완료",
};

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-[#FEF3C7] text-[#B45309]",
  INCOMPLETE: "bg-[#DBEAFE] text-[#1D4ED8]",
  INCOMPLETE_APPROVED: "bg-[#DCFCE7] text-[#15803D]",
  COMPLETED: "bg-[#DCFCE7] text-[#15803D]",
};

type SummaryKey = "DRAFT" | "INCOMPLETE" | "DONE";

const SUMMARY_CARDS: {
  key: SummaryKey;
  label: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}[] = [
  {
    key: "INCOMPLETE",
    label: "진행중",
    icon: "mdi:progress-clock",
    iconBg: "bg-[#DBEAFE]",
    iconColor: "text-[#1D4ED8]",
  },
  {
    key: "DRAFT",
    label: "대기",
    icon: "material-symbols:schedule-outline",
    iconBg: "bg-[#FEF3C7]",
    iconColor: "text-[#B45309]",
  },
  {
    key: "DONE",
    label: "완료",
    icon: "mdi:check-circle-outline",
    iconBg: "bg-[#DCFCE7]",
    iconColor: "text-[#15803D]",
  },
];

function summaryKeyOf(status: InspectionOrderStatus): SummaryKey | null {
  if (status === "DRAFT") return "DRAFT";
  if (status === "INCOMPLETE") return "INCOMPLETE";
  if (status === "COMPLETED" || status === "INCOMPLETE_APPROVED") return "DONE";
  return null;
}

function statusBadge(status: InspectionOrderStatus) {
  const label = STATUS_LABEL[status] ?? status;
  const style = STATUS_STYLE[status] ?? "bg-[#F3F4F6] text-[#6B7280]";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

export default function InspectionOrdersPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InspectionOrder | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { data: orders = [], isLoading, isError } = useInspectionOrderList();
  const { mutate: remove, isPending: isDeleting } = useDeleteInspectionOrder();

  const filtered = useMemo(() => {
    if (!selectedDate) return orders;
    return orders.filter((o) => o.targetDate?.slice(0, 10) === selectedDate);
  }, [orders, selectedDate]);

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

  const handleDelete = (order: InspectionOrder) => {
    if (isDeleting) return;
    const label = order.product?.name ?? "이 검사지시";
    if (!window.confirm(`'${label}' 검사지시를 삭제할까요?`)) return;
    remove(order.id, {
      onError: () => {
        alert("삭제 중 오류가 발생했습니다.");
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:p-6 md:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">검사지시관리</h1>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-[#931B82] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D] md:px-4"
        >
          <Icon icon="mdi:plus" width={18} height={18} />
          <span className="hidden sm:inline">검사지시 등록</span>
          <span className="sm:hidden">등록</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {SUMMARY_CARDS.map((card) => (
          <div
            key={card.key}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 md:p-4"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg md:h-10 md:w-10 ${card.iconBg} ${card.iconColor}`}
            >
              <Icon icon={card.icon} width={20} height={20} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-[#6B7280]">{card.label}</div>
              <div className="text-lg font-semibold text-[#212121] md:text-xl">
                {counts[card.key]}
                <span className="ml-0.5 text-xs font-normal text-[#6B7280]">건</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 rounded-full border border-gray-300 bg-white pl-3 pr-8 text-xs focus:border-[#931B82] focus:outline-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
          />
          <Icon
            icon="solar:calendar-linear"
            width={16}
            height={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
          />
        </div>
        {selectedDate && (
          <button
            type="button"
            onClick={() => setSelectedDate("")}
            className="h-9 rounded-full border border-gray-200 bg-white px-3 text-xs font-medium text-[#6B7280] transition-colors hover:border-[#931B82] hover:text-[#931B82]"
          >
            초기화
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
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-[#F3E8F7] text-[#6B7280]">
          <tr>
            <th className="px-4 py-3 text-left font-medium">지시일</th>
            <th className="px-4 py-3 text-left font-medium">제품</th>
            <th className="px-4 py-3 text-left font-medium">설비</th>
            <th className="px-4 py-3 text-left font-medium">고객사</th>
            <th className="px-4 py-3 text-left font-medium">자주검사</th>
            <th className="px-4 py-3 text-left font-medium">순회검사</th>
            <th className="px-4 py-3 text-left font-medium">상태</th>
            <th className="px-4 py-3 text-right font-medium">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-[#212121]">
          {isLoading && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-[#A8A8A8]">
                불러오는 중...
              </td>
            </tr>
          )}
          {isError && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-[#EF4444]">
                목록을 불러오지 못했습니다.
              </td>
            </tr>
          )}
          {!isLoading && !isError && orders.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-[#A8A8A8]">
                해당 조건의 검사지시가 없습니다.
              </td>
            </tr>
          )}
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap">{order.targetDate}</td>
              <td className="px-4 py-3">{order.product?.name ?? "-"}</td>
              <td className="px-4 py-3">{order.equipment?.name ?? "-"}</td>
              <td className="px-4 py-3">{order.customer?.name ?? "-"}</td>
              <td className="px-4 py-3">{order.production?.name ?? "-"}</td>
              <td className="px-4 py-3">{order.quality?.name ?? "-"}</td>
              <td className="px-4 py-3">{statusBadge(order.status)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(order)}
                    aria-label="수정"
                    className="rounded p-1.5 text-[#6B7280] transition-colors hover:bg-[#F3E8F7] hover:text-[#931B82]"
                  >
                    <Icon icon="mdi:pencil-outline" width={18} height={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(order)}
                    disabled={isDeleting}
                    aria-label="삭제"
                    className="rounded p-1.5 text-[#6B7280] transition-colors hover:bg-[#FEE2E2] hover:text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-40"
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
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
        불러오는 중...
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
        목록을 불러오지 못했습니다.
      </div>
    );
  }
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
        해당 조건의 검사지시가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {orders.map((order) => (
        <div
          key={order.id}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-[#212121]">
                {order.product?.name ?? "-"}
              </div>
              <div className="mt-0.5 truncate text-xs text-[#6B7280]">
                {order.customer?.name ?? "-"} · {order.equipment?.name ?? "-"}
              </div>
            </div>
            {statusBadge(order.status)}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-y-1.5 text-xs">
            <InfoRow icon="mdi:calendar-outline" label="지시일" value={order.targetDate} />
            <InfoRow icon="mdi:account-hard-hat" label="자주검사" value={order.production?.name ?? "-"} />
            <InfoRow icon="mdi:shield-check-outline" label="순회검사" value={order.quality?.name ?? "-"} />
          </div>

          <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={() => onEdit(order)}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:bg-[#F3E8F7] hover:text-[#931B82]"
            >
              <Icon icon="mdi:pencil-outline" width={16} height={16} />
              수정
            </button>
            <button
              type="button"
              onClick={() => onDelete(order)}
              disabled={isDeleting}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:bg-[#FEE2E2] hover:text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon icon="mdi:trash-can-outline" width={16} height={16} />
              삭제
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[#6B7280]">
      <Icon icon={icon} width={14} height={14} className="shrink-0" />
      <span className="shrink-0">{label}</span>
      <span className="ml-auto truncate text-[#212121]">{value}</span>
    </div>
  );
}

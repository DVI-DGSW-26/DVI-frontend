import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useMyInspectionOrders } from "../api";
import type { InspectionOrder, InspectionOrderStatus } from "../api";

// 자주검사자(생산 작업자)가 생산 관리자에게 배정받은 검사 지시 목록 (GET /inspection-order/my).
// 읽기 전용 — 실제 자주검사 수행은 기존 검사 흐름에서 진행한다.

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  DRAFT: "대기",
  INCOMPLETE: "진행중",
  INCOMPLETE_APPROVED: "완료(승인)",
  COMPLETED: "완료",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[#FEF3C7] text-[#B45309]",
  DRAFT: "bg-[#FEF3C7] text-[#B45309]",
  INCOMPLETE: "bg-[#DBEAFE] text-[#1D4ED8]",
  INCOMPLETE_APPROVED: "bg-[#DCFCE7] text-[#15803D]",
  COMPLETED: "bg-[#DCFCE7] text-[#15803D]",
};

function statusBadge(status: InspectionOrderStatus) {
  const label = STATUS_LABEL[status] ?? status;
  const style = STATUS_STYLE[status] ?? "bg-[#F3F4F6] text-[#6B7280]";
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}

export default function MyInspectionOrdersPage() {
  const [selectedDate, setSelectedDate] = useState("");
  const { data: orders = [], isLoading, isError } = useMyInspectionOrders();

  const filtered = useMemo(() => {
    if (!selectedDate) return orders;
    return orders.filter((o) => o.targetDate?.slice(0, 10) === selectedDate);
  }, [orders, selectedDate]);

  return (
    <div className="flex min-h-dvh flex-col gap-4 bg-[#F5F5F5] p-4 pb-24 md:p-6">
      <h1 className="text-xl font-semibold">내 검사지시</h1>

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

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          불러오는 중...
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
          목록을 불러오지 못했습니다.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
          배정된 검사지시가 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: InspectionOrder }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
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

      <div className="mt-3 flex items-center gap-1.5 text-xs text-[#6B7280]">
        <Icon icon="mdi:calendar-outline" width={14} height={14} className="shrink-0" />
        <span className="shrink-0">지시일</span>
        <span className="ml-auto text-[#212121]">{order.targetDate}</span>
      </div>
    </div>
  );
}

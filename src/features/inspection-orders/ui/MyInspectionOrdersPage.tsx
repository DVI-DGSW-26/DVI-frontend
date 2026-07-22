import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useMyInspectionOrders } from "../api";
import type { InspectionOrder, InspectionOrderStatus } from "../api";
import type { InspectionProcess } from "../../inspection/type/types";
import { kstDateKey } from "../../../lib/datetime";

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
  const navigate = useNavigate();
  // 진입 시 기본으로 오늘자 지시만 보여준다(KST 기준). 초기화하면 전체가 보인다.
  const [selectedDate, setSelectedDate] = useState(() => kstDateKey(new Date()));
  const { data: orders = [], isLoading, isError } = useMyInspectionOrders();

  const filtered = useMemo(() => {
    if (!selectedDate) return orders;
    return orders.filter((o) => o.targetDate?.slice(0, 10) === selectedDate);
  }, [orders, selectedDate]);

  // 지시를 탭하면 해당 제품·설비 컨텍스트로 시점(ScanPage) 선택 화면으로 이동한다.
  // 실제 검사 시작(POST /inspection)은 시점 선택 시 ScanPage 가 담당.
  const handleStart = (order: InspectionOrder) => {
    navigate("/scan", {
      state: {
        productId: order.product.id,
        equipmentId: order.equipment.id,
        process: order.product.process as InspectionProcess,
      },
    });
  };

  return (
    <div className="flex min-h-dvh flex-col gap-4 bg-[#F5F5F5] p-4 pb-24 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">내 검사지시</h1>
        <p className="mt-1 text-xs text-[#6B7280]">
          배정된 검사 지시를 선택하면 시점을 골라 검사를 시작합니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 min-w-38 rounded-full border border-gray-300 bg-white pl-3 pr-8 text-xs focus:border-[#931B82] focus:outline-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
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
            <OrderCard
              key={order.id}
              order={order}
              onStart={() => handleStart(order)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  onStart,
}: {
  order: InspectionOrder;
  onStart: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onStart}
      className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50"
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

      <div className="mt-3 flex items-center gap-1.5 text-xs text-[#6B7280]">
        <Icon icon="mdi:calendar-outline" width={14} height={14} className="shrink-0" />
        <span className="shrink-0">지시일</span>
        <span className="text-[#212121]">{order.targetDate}</span>
        <span className="ml-auto flex items-center gap-0.5 font-medium text-[#931B82]">
          검사 시작
          <Icon icon="solar:arrow-right-linear" width={14} height={14} />
        </span>
      </div>
    </button>
  );
}

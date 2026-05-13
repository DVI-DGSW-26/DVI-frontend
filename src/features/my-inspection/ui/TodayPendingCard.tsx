import type { InspectionOrder } from "../../inspection-orders/api";
import { getStatusBadge } from "../lib/inspectionStatus";

interface Props {
  orders: InspectionOrder[];
}

export default function TodayPendingCard({ orders }: Props) {
  const badge = getStatusBadge("PENDING");

  return (
    <>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-[#212121]">오늘 할 검사</h2>
        <span className={`text-xs font-medium ${badge.text}`}>
          {orders.length}건 대기 중
        </span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {orders.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#A8A8A8]">
            오늘 대기 중인 검사가 없습니다.
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-[#212121]">
                    {order.product.name}
                  </div>
                  <div className="truncate text-xs text-[#6B7280]">
                    {order.customer.name} · {order.equipment.name}
                  </div>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${badge.text}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                  {badge.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

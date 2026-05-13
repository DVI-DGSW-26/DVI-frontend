import { useMemo } from "react";
import type { InspectionOrder } from "../../inspection-orders/api";
import type { MyInspection } from "../type/types";
import { getStatusBadge, isDoneStep } from "../lib/inspectionStatus";

interface Props {
  order: InspectionOrder;
  inspections: MyInspection[];
}

export default function OrderCard({ order, inspections }: Props) {
  const badge = getStatusBadge(order.status);

  const orderInspections = useMemo(
    () =>
      inspections
        .filter((i) => i.orderId === order.id)
        .sort((a, b) => a.type.localeCompare(b.type)),
    [inspections, order.id],
  );

  const total = orderInspections.length;
  const done = orderInspections.filter(isDoneStep).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const showProgress = order.status === "IN_PROGRESS" && total > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-[#212121]">
            {order.product.name}
          </div>
          <div className="mt-0.5 truncate text-xs text-[#6B7280]">
            {order.product.code}
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${badge.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
          {badge.label}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs">
        <InfoRow
          label="설비"
          value={`${order.equipment.name} · ${order.equipment.process}`}
        />
        <InfoRow label="고객사" value={order.customer.name} />
        <InfoRow label="목표일" value={order.targetDate} />
      </div>

      {showProgress && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-[#6B7280]">진행 상황</span>
            <span className="text-[#212121]">
              {done} / {total}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
            <div
              className="h-full rounded-full bg-[#931B82] transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[#6B7280]">
      <span className="shrink-0">{label}</span>
      <span className="ml-auto min-w-0 truncate text-right text-[#212121]">
        {value}
      </span>
    </div>
  );
}

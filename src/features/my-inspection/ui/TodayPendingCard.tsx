import { useNavigate } from "react-router-dom";
import type { InspectionProcess } from "../../inspection/type/types";
import type { AssignedSlot } from "../type/types";
import { getStatusBadge } from "../lib/inspectionStatus";
import { formatSlotTime } from "../../inspection/lib/format";

interface Props {
  slots: AssignedSlot[];
}

export default function TodayPendingCard({ slots }: Props) {
  const navigate = useNavigate();
  const badge = getStatusBadge("PENDING");

  const handleSelect = (slot: AssignedSlot) => {
    navigate("/scan", {
      state: {
        orderId: slot.orderId,
        process: slot.process as InspectionProcess,
      },
    });
  };

  return (
    <>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-[#212121]">대기 검사</h2>
        <span className={`text-xs font-medium ${badge.text}`}>
          {slots.length}건 대기 중
        </span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {slots.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#A8A8A8]">
            대기 중인 검사가 없습니다.
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100">
            {slots.map((slot) => (
              <li
                key={`${slot.orderId}-${slot.type}`}
                className="first:pt-0 last:pb-0"
              >
                <button
                  type="button"
                  onClick={() => handleSelect(slot)}
                  className="flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[#212121]">
                      {slot.productName}
                    </div>
                    <div className="truncate text-xs text-[#6B7280]">
                      {slot.customerName} · {slot.equipmentName}
                    </div>
                    <div className="mt-0.5 text-xs text-[#6B7280]">
                      {slot.typeLabel} · {formatSlotTime(slot.inspectionTime)}
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${badge.text}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                    {badge.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

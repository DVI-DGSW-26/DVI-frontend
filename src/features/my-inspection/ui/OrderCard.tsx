import { useNavigate } from "react-router-dom";
import type { MyInspection } from "../type/types";
import { getStatusBadge } from "../lib/inspectionStatus";
import { formatSlotTime } from "../../inspection/lib/format";

// 한 카드는 한 검사를 표현. /inspection/assigned 제거 후로는 my inspection 한 종류만 표시.

interface Props {
  inspection: MyInspection;
}

export default function OrderCard({ inspection }: Props) {
  const navigate = useNavigate();
  const badge = getStatusBadge(inspection.status);

  const onClick = () => {
    if (inspection.status === "DRAFT") {
      navigate(`/inspection/${inspection.inspectionId}/measure`, {
        state: { inspection },
      });
      return;
    }
    // 종결된 검사는 상세 페이지(읽기 전용 미리보기)로.
    navigate(`/inspection/${inspection.inspectionId}`, {
      state: { inspection },
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50"
    >
      <div className="min-w-0">
        <div className="truncate text-base font-semibold text-[#212121]">
          {inspection.product.name}
        </div>
        <div className="mt-0.5 truncate text-xs text-[#6B7280]">
          {inspection.customer.name} · {inspection.equipment.name}
        </div>
        <div className="mt-0.5 truncate text-xs text-[#6B7280]">
          {inspection.typeLabel} · {formatSlotTime(inspection.inspectionTime)}
        </div>
      </div>
      <span
        className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${badge.text}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
        {badge.label}
      </span>
    </button>
  );
}

import { useNavigate } from "react-router-dom";
import type { InspectionProcess } from "../../inspection/type/types";
import type { AssignedSlot, MyInspection } from "../type/types";
import { getStatusBadge } from "../lib/inspectionStatus";
import { formatSlotTime } from "../../inspection/lib/format";

// 한 카드는 한 슬롯을 표현. 대기 슬롯(AssignedSlot)과 진행 중·완료 등 my inspection
// 두 형태 모두 받기 위한 discriminated union.
export type SlotEntry =
  | { kind: "assigned"; slot: AssignedSlot }
  | { kind: "my"; inspection: MyInspection };

interface Props {
  entry: SlotEntry;
}

export default function OrderCard({ entry }: Props) {
  const navigate = useNavigate();

  if (entry.kind === "assigned") {
    const s = entry.slot;
    const badge = getStatusBadge("PENDING");
    const onClick = () =>
      navigate("/scan", {
        state: {
          orderId: s.orderId,
          process: s.process as InspectionProcess,
        },
      });
    return (
      <Card onClick={onClick}>
        <Header
          title={s.productName}
          subtitle={`${s.customerName} · ${s.equipmentName}`}
          meta={`${s.typeLabel} · ${formatSlotTime(s.inspectionTime)}`}
          badge={badge}
        />
      </Card>
    );
  }

  const i = entry.inspection;
  const badge = getStatusBadge(i.status);
  const onClick = () => {
    if (i.status === "DRAFT") {
      navigate(`/inspection/${i.inspectionId}/measure`, {
        state: { inspection: i },
      });
      return;
    }
    // 종결된 검사는 상세 페이지(읽기 전용 미리보기)로.
    navigate(`/inspection/${i.inspectionId}`, {
      state: { inspection: i },
    });
  };
  return (
    <Card onClick={onClick}>
      <Header
        title={i.product.name}
        subtitle={`${i.customer.name} · ${i.equipment.name}`}
        meta={`${i.typeLabel} · ${formatSlotTime(i.inspectionTime)}`}
        badge={badge}
      />
    </Card>
  );
}

function Card({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50"
    >
      {children}
    </button>
  );
}

function Header({
  title,
  subtitle,
  meta,
  badge,
}: {
  title: string;
  subtitle: string;
  meta: string;
  badge: { label: string; text: string; dot: string };
}) {
  return (
    <>
      <div className="min-w-0">
        <div className="truncate text-base font-semibold text-[#212121]">
          {title}
        </div>
        <div className="mt-0.5 truncate text-xs text-[#6B7280]">{subtitle}</div>
        <div className="mt-0.5 truncate text-xs text-[#6B7280]">{meta}</div>
      </div>
      <span
        className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${badge.text}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
        {badge.label}
      </span>
    </>
  );
}

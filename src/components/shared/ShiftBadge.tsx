import { Icon } from "@iconify/react";
import type { Shift } from "../../features/inspection-schedule/api";

interface Props {
  /** 서버가 내려준 교대값. null/undefined 면 아무것도 그리지 않는다. */
  shift: Shift | null | undefined;
  /** 좁은 자리(목록 카드 등)용 작은 배지. */
  compact?: boolean;
}

const STYLE: Record<Shift, { label: string; icon: string; className: string }> = {
  DAY: {
    label: "주간",
    icon: "solar:sun-bold",
    className: "bg-[#FEF3C7] text-[#B45309]",
  },
  NIGHT: {
    label: "야간",
    icon: "solar:moon-bold",
    className: "bg-[#E0E7FF] text-[#3730A3]",
  },
};

/**
 * 주간/야간 배지.
 *
 * 주/야 판단은 **서버가 준 shift 값으로만** 한다. 슬롯 식별자(DAY_1, NIGHT_2 ...)의
 * 접두어는 순서를 매기는 내부 값이라 실제 교대와 어긋날 수 있다.
 */
export default function ShiftBadge({ shift, compact = false }: Props) {
  if (!shift) return null;
  const meta = STYLE[shift];
  const size = compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-semibold ${size} ${meta.className}`}
    >
      <Icon icon={meta.icon} width={compact ? 11 : 13} height={compact ? 11 : 13} />
      {meta.label}
    </span>
  );
}

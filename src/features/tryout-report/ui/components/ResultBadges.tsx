import { useTranslation } from "react-i18next";
import type { TryoutItemResult, TryoutOverallResult } from "../../api/types";

const OVERALL_STYLE: Record<TryoutOverallResult, string> = {
  OK: "bg-[#DCFCE7] text-[#15803D]",
  NG: "bg-[#FEE2E2] text-[#B91C1C]",
  SPECIAL_ACCEPT: "bg-[#FEF3C7] text-[#B45309]",
  REWORK: "bg-[#E0E7FF] text-[#4338CA]",
};

export function OverallBadge({ value }: { value: TryoutOverallResult | null }) {
  const { t } = useTranslation("tryoutReport");
  if (!value) return <span className="text-xs text-[#A8A8A8]">-</span>;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${OVERALL_STYLE[value]}`}>
      {t(`overall.${value}`)}
    </span>
  );
}

export function ItemResultBadge({ value }: { value: TryoutItemResult | null }) {
  const { t } = useTranslation("tryoutReport");
  if (!value) return <span className="text-xs text-[#A8A8A8]">{t("result.pending")}</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        value === "OK" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEE2E2] text-[#B91C1C]"
      }`}
    >
      {t(`result.${value}`)}
    </span>
  );
}

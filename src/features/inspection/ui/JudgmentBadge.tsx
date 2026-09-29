import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import type { Judgment } from "../lib/judgment";

interface Props {
  judgment: Judgment;
  /** 작은(인풋 옆 등) 표시. 기본은 보통 크기. */
  compact?: boolean;
}

export default function JudgmentBadge({ judgment, compact = false }: Props) {
  const { t } = useTranslation("inspection");
  if (judgment == null) return null;
  const pass = judgment === "pass";
  const size = compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${size} ${
        pass
          ? "bg-[#ECFDF5] text-[#15803D]"
          : "bg-[#FEF2F2] text-[#B91C1C]"
      }`}
    >
      <Icon
        icon={pass ? "solar:check-circle-bold" : "solar:close-circle-bold"}
        width={compact ? 12 : 14}
        height={compact ? 12 : 14}
      />
      {pass ? t("judgment.pass") : t("judgment.fail")}
    </span>
  );
}

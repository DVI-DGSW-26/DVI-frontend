import { useTranslation } from "react-i18next";
import type { TryoutItemResult, TryoutOverallResult } from "../../api/types";

const OVERALL_STYLE: Record<TryoutOverallResult, string> = {
  OK: "bg-success-soft text-success-fg",
  NG: "bg-danger-soft text-danger-fg",
  SPECIAL_ACCEPT: "bg-warn-soft text-warn-fg",
  REWORK: "bg-brand-soft text-brand-fg",
};

export function OverallBadge({ value }: { value: TryoutOverallResult | null }) {
  const { t } = useTranslation("tryoutReport");
  if (!value) return <span className="text-xs text-fg-subtle">-</span>;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${OVERALL_STYLE[value]}`}>
      {t(`overall.${value}`)}
    </span>
  );
}

export function ItemResultBadge({ value }: { value: TryoutItemResult | null }) {
  const { t } = useTranslation("tryoutReport");
  if (!value) return <span className="text-xs text-fg-subtle">{t("result.pending")}</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        value === "OK" ? "bg-success-soft text-success-fg" : "bg-danger-soft text-danger-fg"
      }`}
    >
      {t(`result.${value}`)}
    </span>
  );
}

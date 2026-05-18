import { Icon } from "@iconify/react";
import type { CrossCheckSummary } from "../api";
import { elapsedFrom, TONE_COLOR } from "../lib/elapsed";

interface Props {
  cross: CrossCheckSummary;
  onClick?: (cross: CrossCheckSummary) => void;
}

const CrossCheckCard = ({ cross, onClick }: Props) => {
  const elapsed = elapsedFrom(cross.createdAt);
  const color = TONE_COLOR[elapsed.tone];
  const productionName = cross.production?.name ?? "—";
  const equipmentName = cross.equipment?.name ?? "";

  return (
    <button
      type="button"
      onClick={() => onClick?.(cross)}
      className="flex w-full items-center gap-3 rounded-2xl bg-white px-5 py-4 text-left shadow-sm"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-bold text-[#212121]">
          {cross.product?.name ?? "—"}
        </span>
        <div className="mt-1 flex items-center gap-1.5">
          <Icon
            icon="solar:user-circle-linear"
            width={16}
            height={16}
            className="text-[#A8A8A8]"
          />
          <span className="truncate text-sm text-[#6B7280]">
            {productionName}
          </span>
        </div>
        {equipmentName && (
          <span className="mt-2 truncate text-xs text-[#A8A8A8]">
            공정: {equipmentName}
          </span>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div className="flex items-center gap-1">
          <span
            className="text-sm font-bold"
            style={{ color }}
          >
            {elapsed.label}
          </span>
          <Icon
            icon="solar:alt-arrow-right-linear"
            width={20}
            height={20}
            className="text-[#A8A8A8]"
          />
        </div>
      </div>
    </button>
  );
};

export default CrossCheckCard;

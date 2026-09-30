import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";

interface Props {
  pullY: number;
  refreshing: boolean;
  triggerReady: boolean;
}

export default function PullToRefreshIndicator({
  pullY,
  refreshing,
  triggerReady,
}: Props) {
  const { t } = useTranslation("myInspection");
  const indicatorHeight = refreshing ? 48 : pullY;
  return (
    <div
      style={{ height: indicatorHeight }}
      className="flex items-center justify-center overflow-hidden text-xs text-[#6B7280] transition-[height] duration-150"
    >
      {refreshing ? (
        <span className="flex items-center gap-1.5">
          <Icon
            icon="mdi:loading"
            className="animate-spin"
            width={16}
            height={16}
          />
          {t("pull.refreshing")}
        </span>
      ) : pullY > 0 ? (
        triggerReady ? (
          t("pull.release")
        ) : (
          t("pull.pull")
        )
      ) : null}
    </div>
  );
}

import { useCallback, useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useCanReportEquipment } from "../lib/permissions";
import EquipmentReportModal from "./EquipmentReportModal";

interface Props {
  compact?: boolean;
}

/**
 * 헤더의 "설비 문제 신고" 버튼. 생산·품질 작업자가 어느 화면에 있든 바로 누를 수 있다.
 * 신고 권한이 없는 역할에는 그리지 않는다.
 */
export default function EquipmentReportButton({ compact = false }: Props) {
  const { t } = useTranslation("equipmentReport");
  const canReport = useCanReportEquipment();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (!canReport) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#DC2626] font-semibold text-white shadow-sm hover:bg-[#B91C1C] active:scale-95 ${
          compact ? "h-8 px-2.5 text-xs" : "h-10 px-4 text-sm"
        }`}
      >
        <Icon
          icon="solar:danger-triangle-bold"
          width={compact ? 16 : 18}
          height={compact ? 16 : 18}
        />
        {t("headerButton")}
      </button>
      {open && <EquipmentReportModal onClose={close} />}
    </>
  );
}

import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import type { Decision } from "../type/types";

// 미완료 결재 확인창. 승인·반려 모두 되돌릴 수 없어 누르기 전에 결과를 한 번 보여준다.
interface Props {
  decision: Decision | null;
  count: number;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DecisionConfirmModal({
  decision,
  count,
  isPending,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation("incomplete");
  if (!decision) return null;
  const isReject = decision === "REJECT";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={() => {
        if (!isPending) onCancel();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl"
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isReject ? "bg-[#FEF2F2]" : "bg-[#F3E8FF]"
            }`}
          >
            <Icon
              icon={isReject ? "solar:undo-left-bold" : "solar:check-circle-bold"}
              width={22}
              height={22}
              className={isReject ? "text-[#B91C1C]" : "text-[#931B82]"}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-[#212121]">
              {isReject
                ? t("confirm.rejectTitle")
                : t("confirm.approveTitle", { n: count })}
            </h3>
            <p className="mt-1 text-xs text-[#6B7280]">
              {isReject ? t("confirm.rejectBody") : t("confirm.approveBody")}
            </p>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="h-11 flex-1 rounded-md border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-60"
          >
            {t("confirm.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`h-11 flex-1 rounded-md text-sm font-semibold text-white transition-colors disabled:bg-[#D1D5DB] ${
              isReject
                ? "bg-[#DC2626] hover:bg-[#B91C1C]"
                : "bg-[#931B82] hover:bg-[#6A0F5D]"
            }`}
          >
            {isPending
              ? t("confirm.processing")
              : isReject
                ? t("confirm.reject")
                : t("confirm.approve")}
          </button>
        </div>
      </div>
    </div>
  );
}

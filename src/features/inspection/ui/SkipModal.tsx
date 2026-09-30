import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";

interface Props {
  open: boolean;
  slotLabel: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

type Step = "confirm" | "reason";

export default function SkipModal({
  open,
  slotLabel,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation("inspection");
  const [step, setStep] = useState<Step>("confirm");
  const [reason, setReason] = useState("");

  // 모달을 새로 열 때마다 초기화 — 닫혀있다 다시 열린 경우 이전 입력 잔존 방지.
  useEffect(() => {
    if (open) {
      setStep("confirm");
      setReason("");
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    if (isSubmitting) return;
    onConfirm(reason.trim());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl"
      >
        {step === "confirm" ? (
          <>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7]">
                <Icon
                  icon="solar:danger-triangle-bold"
                  width={22}
                  height={22}
                  className="text-[#F59E0B]"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-[#212121]">
                  {t("modals.skip.title", { label: slotLabel })}
                </h3>
                <p className="mt-1 text-xs text-[#6B7280]">
                  {t("modals.skip.warning")}
                </p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="h-11 flex-1 rounded-md border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
              >
                {t("modals.skip.cancel")}
              </button>
              <button
                type="button"
                onClick={() => setStep("reason")}
                className="h-11 flex-1 rounded-md bg-[#931B82] text-sm font-semibold text-white hover:bg-[#6A0F5D]"
              >
                {t("modals.skip.skip")}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold text-[#212121]">
              {t("modals.skip.reasonTitle")}
            </h3>
            <p className="mt-1 text-xs text-[#6B7280]">
              {t("modals.skip.reasonHint")}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("modals.skip.reasonPlaceholder")}
              maxLength={200}
              rows={3}
              disabled={isSubmitting}
              className="mt-3 w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#212121] placeholder:text-[#9CA3AF] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setStep("confirm")}
                disabled={isSubmitting}
                className="h-11 flex-1 rounded-md border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-60"
              >
                {t("modals.skip.back")}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="h-11 flex-1 rounded-md bg-[#931B82] text-sm font-semibold text-white hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
              >
                {isSubmitting
                  ? t("modals.skip.submitting")
                  : t("modals.skip.confirm")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

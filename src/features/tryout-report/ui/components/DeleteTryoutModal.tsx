import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  isSubmitting?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteTryoutModal({ open, isSubmitting = false, error, onCancel, onConfirm }: Props) {
  const { t } = useTranslation("tryoutReport");
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={() => {
        if (!isSubmitting) onCancel();
      }}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEE2E2]">
            <Icon icon="solar:trash-bin-trash-bold" width={22} height={22} className="text-[#DC2626]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-[#212121]">{t("deleteModal.title")}</h3>
            <p className="mt-1 text-xs text-[#6B7280]">{t("deleteModal.description")}</p>
            {error && <p className="mt-2 text-xs text-[#DC2626]">{error}</p>}
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-md border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-60"
          >
            {t("deleteModal.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-md bg-[#DC2626] text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:bg-[#D1D5DB]"
          >
            {isSubmitting ? t("deleteModal.deleting") : t("deleteModal.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

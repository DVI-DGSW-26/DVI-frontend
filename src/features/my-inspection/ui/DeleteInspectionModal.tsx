import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";

interface Props {
  open: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteInspectionModal({
  open,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation("myInspection");
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
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-2xl bg-surface p-5 sm:rounded-2xl border border-edge"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft">
            <Icon
              icon="solar:trash-bin-trash-bold"
              width={22}
              height={22}
              className="text-danger-fg"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-fg">
              {t("deleteModal.title")}
            </h3>
            <p className="mt-1 text-xs text-fg-muted">
              {t("deleteModal.desc")}
            </p>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-md border border-line-strong bg-surface text-sm font-medium text-fg-muted hover:bg-surface-2 disabled:opacity-60"
          >
            {t("deleteModal.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-md bg-danger text-sm font-semibold text-white hover:bg-danger disabled:bg-surface-3"
          >
            {isSubmitting ? t("deleteModal.deleting") : t("deleteModal.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

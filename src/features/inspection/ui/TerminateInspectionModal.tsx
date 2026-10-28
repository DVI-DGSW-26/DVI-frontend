import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { REASON_MAX_LENGTH } from "../lib/incompleteReasons";

interface Props {
  open: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

// 품질 문제(금형 교체 등) 조기 마감 확인 모달. 사유는 선택 입력.
// 확정 시 그 차수까지 묶어 보고서가 즉시 발행되고 재검사(새 초품)가 시작된다.
export default function TerminateInspectionModal({
  open,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation("inspection");
  const [reason, setReason] = useState("");

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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn-soft">
            <Icon
              icon="solar:danger-triangle-bold"
              width={22}
              height={22}
              className="text-warn-fg"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-fg">
              {t("modals.terminate.title")}
            </h3>
            <p className="mt-1 text-xs text-fg-muted">
              <Trans
                t={t}
                i18nKey="modals.terminate.warning"
                components={{ b: <b /> }}
              />
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor="terminate-reason"
            className="text-xs font-medium text-fg-muted"
          >
            {t("modals.terminate.reasonLabel")}
          </label>
          <textarea
            id="terminate-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("modals.terminate.reasonPlaceholder")}
            rows={3}
            maxLength={REASON_MAX_LENGTH}
            disabled={isSubmitting}
            className="mt-1 w-full resize-none rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-surface-2"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-md border border-line-strong bg-surface text-sm font-medium text-fg-muted hover:bg-surface-2 disabled:opacity-60"
          >
            {t("modals.terminate.cancel")}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-md bg-warn text-sm font-semibold text-white hover:bg-warn disabled:bg-surface-3"
          >
            {isSubmitting
              ? t("modals.terminate.submitting")
              : t("modals.terminate.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

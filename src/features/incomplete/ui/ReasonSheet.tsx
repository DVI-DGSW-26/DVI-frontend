import { useState } from "react";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import {
  OTHER_REASON,
  REASON_LABEL_KEYS,
  REASON_MAX_LENGTH,
  REASON_OPTIONS,
  joinReason,
  splitReason,
} from "../../inspection/lib/incompleteReasons";
import { useWriteIncompleteReason } from "../model/useMissedInspections";
import type { MissedInspection } from "../type/types";

interface ReasonSheetProps {
  item: MissedInspection;
  // 카드에 보이는 "제품 · 설비 · 시점" 한 줄 — 어느 건의 사유인지 시트에서도 보이게.
  summary: string;
  onClose: () => void;
  onSaved: () => void;
}

/** 순회검사자가 미완료 사유를 대신 적는 시트. 작업자 화면과 같은 선택지 + 기타 직접 입력. */
export default function ReasonSheet({
  item,
  summary,
  onClose,
  onSaved,
}: ReasonSheetProps) {
  const { t } = useTranslation("incomplete");
  const { t: tInspection } = useTranslation("inspection");
  const initial = splitReason(item.reason);
  const [reasonKey, setReasonKey] = useState(initial.key);
  const [customReason, setCustomReason] = useState(initial.custom);
  const [error, setError] = useState<string | null>(null);
  const write = useWriteIncompleteReason();

  const reason = joinReason(reasonKey, customReason);

  const handleSave = () => {
    if (!reason || item.inspectionId == null) return;
    setError(null);
    write.mutate(
      { inspectionId: item.inspectionId, reason },
      {
        onSuccess: onSaved,
        onError: (err) => {
          // 그 사이 품질관리자가 처리했으면 400 NOT_INCOMPLETE_STATUS — 서버 문구를 쓴다.
          const message =
            err instanceof AxiosError
              ? (err.response?.data as { message?: string } | undefined)?.message
              : undefined;
          setError(message ?? t("page.genericError"));
        },
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center"
      onClick={() => !write.isPending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reason-sheet-title"
        className="w-full max-w-md rounded-t-2xl bg-surface p-5 md:rounded-2xl border border-edge"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="reason-sheet-title"
          className="text-base font-semibold text-fg"
        >
          {item.reason ? t("missed.sheet.editTitle") : t("missed.sheet.title")}
        </h2>
        <p className="mt-1 text-xs text-fg-muted">{summary}</p>

        <div
          role="radiogroup"
          aria-label={t("missed.sheet.title")}
          className="mt-4 grid grid-cols-2 gap-2"
        >
          {REASON_OPTIONS.map((opt) => {
            const selected = reasonKey === opt;
            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setReasonKey(opt)}
                disabled={write.isPending}
                className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                  selected
                    ? "border-brand bg-brand-soft text-brand-fg"
                    : "border-line-strong bg-surface text-fg"
                }`}
              >
                {tInspection(REASON_LABEL_KEYS[opt])}
              </button>
            );
          })}
        </div>

        {reasonKey === OTHER_REASON && (
          <textarea
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder={tInspection("result.customReasonPlaceholder")}
            disabled={write.isPending}
            rows={3}
            maxLength={REASON_MAX_LENGTH}
            className="mt-3 w-full resize-none rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-surface-2"
          />
        )}

        <p className="mt-3 text-xs text-fg-muted">
          {item.reason ? t("missed.sheet.editHint") : t("missed.sheet.hint")}
        </p>
        {error && <p className="mt-2 text-xs text-danger-fg">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={write.isPending}
            className="h-11 flex-1 rounded-md border border-line-strong bg-surface text-sm font-medium text-fg"
          >
            {t("missed.sheet.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!reason || write.isPending}
            className="h-11 flex-1 rounded-md bg-brand text-sm font-semibold text-on-brand hover:bg-brand-hover disabled:bg-surface-3"
          >
            {write.isPending ? t("missed.sheet.saving") : t("missed.sheet.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

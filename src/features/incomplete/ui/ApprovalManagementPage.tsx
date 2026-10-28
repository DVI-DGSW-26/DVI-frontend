import { useState } from "react";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import IncompleteDecisionCard from "./IncompleteDecisionCard";
import DecisionConfirmModal from "./DecisionConfirmModal";
import { useIncomplete } from "../model/useIncomplete";
import { useIncompleteDecision } from "../model/useIncompleteDecision";
import type { Decision } from "../type/types";

// 결재 뒤 화면에 남는 결과 한 줄. 체크만 풀리고 끝나면 처리가 됐는지 알 수 없었다.
type Notice = { tone: "done" | "error"; text: string };

function ApprovalManagementPage() {
  const { t } = useTranslation("incomplete");
  const { data: items = [], isLoading, isError } = useIncomplete();
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const { mutate, isPending } = useIncompleteDecision();
  // 확인창에 올라간 결정과 대상. null 이면 닫힘.
  const [pending, setPending] = useState<{
    decision: Decision;
    ids: number[];
  } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const toggle = (id: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedIds = Array.from(checked);

  const confirm = () => {
    if (!pending || isPending) return;
    const { decision, ids } = pending;
    mutate(
      { inspectionIds: ids, decision },
      {
        onSuccess: () => {
          setPending(null);
          setChecked((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.delete(id));
            return next;
          });
          setNotice({
            tone: "done",
            text:
              decision === "APPROVE"
                ? t("done.approved", { n: ids.length })
                : t("done.rejected"),
          });
        },
        onError: (err) => {
          // 일부는 이미 처리됐을 수 있다 — 체크를 남기면 다시 눌렀을 때 그 건들이 또 실패한다.
          // 목록은 새로 받으므로 남은 건을 다시 고르게 한다.
          setPending(null);
          setChecked(new Set());
          const code =
            err instanceof AxiosError
              ? (err.response?.data as { code?: string } | undefined)?.code
              : undefined;
          setNotice({
            tone: "error",
            text:
              code === "NOT_INCOMPLETE_STATUS"
                ? t("page.notIncompleteError")
                : code === "INCOMPLETE_REASON_REQUIRED"
                  ? t("page.reasonRequiredError")
                  : t("page.genericError"),
          });
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">{t("page.title")}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t("page.hint")}</p>
      </div>

      {notice && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${
            notice.tone === "done"
              ? "border-success-line bg-success-soft text-success-fg"
              : "border-danger-line bg-danger-soft text-danger-fg"
          }`}
        >
          <span className="flex items-center gap-2">
            <Icon
              icon={
                notice.tone === "done"
                  ? "solar:check-circle-bold"
                  : "solar:danger-triangle-bold"
              }
              width={18}
              height={18}
            />
            {notice.text}
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label={t("page.dismiss")}
            className="opacity-60 hover:opacity-100"
          >
            <Icon icon="mdi:close" width={18} height={18} />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="w-full p-4 text-fg-muted">{t("list.loading")}</div>
      ) : isError ? (
        <div className="w-full p-4 text-danger-fg">{t("list.loadError")}</div>
      ) : items.length === 0 ? (
        <div className="w-full rounded-xl bg-surface p-6 text-center text-sm text-fg-muted border border-edge">
          {t("page.empty")}
        </div>
      ) : (
        <ul className="flex w-full flex-col gap-3">
          {items.map((item) => (
            <IncompleteDecisionCard
              key={item.inspectionId}
              item={item}
              checked={checked.has(item.inspectionId)}
              onToggle={() => toggle(item.inspectionId)}
              onDecide={(decision) =>
                setPending({ decision, ids: [item.inspectionId] })
              }
              disabled={isPending}
            />
          ))}
        </ul>
      )}

      {selectedIds.length > 0 && (
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() =>
              setPending({ decision: "APPROVE", ids: selectedIds })
            }
            disabled={isPending}
            className="rounded-lg bg-brand px-5 py-2 font-medium text-on-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("page.approveSelected", { n: selectedIds.length })}
          </button>
        </div>
      )}

      <DecisionConfirmModal
        decision={pending?.decision ?? null}
        count={pending?.ids.length ?? 0}
        isPending={isPending}
        onCancel={() => setPending(null)}
        onConfirm={confirm}
      />
    </div>
  );
}

export default ApprovalManagementPage;

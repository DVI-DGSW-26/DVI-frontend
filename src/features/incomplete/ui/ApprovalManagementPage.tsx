import { useState } from "react";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import IncompleteList from "./incompleteList";
import { useIncompleteDecision } from "../model/useIncompleteDecision";

function ApprovalManagementPage() {
  const { t } = useTranslation("incomplete");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const { mutate, isPending } = useIncompleteDecision();

  const toggle = (id: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedIds = Array.from(checked);
  const hasSelection = selectedIds.length > 0;

  const submit = () => {
    if (!hasSelection || isPending) return;

    mutate(
      { inspectionIds: selectedIds, decision: "APPROVE" },
      {
        onSuccess: () => {
          setChecked(new Set());
        },
        onError: (err) => {
          // 일부는 이미 승인됐을 수 있다 — 체크를 남기면 다시 눌렀을 때 그 건들이 또 실패한다.
          // 목록은 새로 받으므로 남은 건을 다시 고르게 한다.
          setChecked(new Set());
          if (err instanceof AxiosError) {
            const code = (
              err.response?.data as { code?: string } | undefined
            )?.code;
            if (code === "NOT_INCOMPLETE_STATUS") {
              alert(t("page.notIncompleteError"));
              return;
            }
          }
          alert(t("page.genericError"));
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">{t("page.title")}</h1>

      <IncompleteList checked={checked} onToggle={toggle} />

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={submit}
          disabled={!hasSelection || isPending}
          className="px-5 py-2 rounded-lg bg-brand text-on-brand font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("page.approve")} {hasSelection && `(${selectedIds.length})`}
        </button>
      </div>
    </div>
  );
}

export default ApprovalManagementPage;

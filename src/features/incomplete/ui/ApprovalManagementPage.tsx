import { useState } from "react";
import { AxiosError } from "axios";
import IncompleteList from "./incompleteList";
import { useIncompleteDecision } from "../model/useIncompleteDecision";
import type { Decision } from "../type/types";

function ApprovalManagementPage() {
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

  const submit = (decision: Decision) => {
    if (!hasSelection || isPending) return;

    mutate(
      { inspectionIds: selectedIds, decision },
      {
        onSuccess: () => {
          setChecked(new Set());
        },
        onError: (err) => {
          if (err instanceof AxiosError) {
            const code = (
              err.response?.data as { code?: string } | undefined
            )?.code;
            if (code === "NOT_INCOMPLETE_STATUS") {
              alert("미완료 상태가 아닌 검사가 포함되어 있습니다.");
              return;
            }
          }
          alert("처리 중 오류가 발생했습니다.");
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">승인관리</h1>

      <IncompleteList checked={checked} onToggle={toggle} />

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => submit("APPROVE")}
          disabled={!hasSelection || isPending}
          className="px-5 py-2 rounded-lg bg-[#931B82] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          승인 {hasSelection && `(${selectedIds.length})`}
        </button>
        <button
          type="button"
          onClick={() => submit("REJECT")}
          disabled={!hasSelection || isPending}
          className="px-5 py-2 rounded-lg border border-[#EF4444] text-[#EF4444] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          반려
        </button>
      </div>
    </div>
  );
}

export default ApprovalManagementPage;

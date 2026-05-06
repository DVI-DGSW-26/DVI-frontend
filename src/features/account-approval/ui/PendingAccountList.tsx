import { AxiosError } from "axios";
import AccountAvatar from "./AccountAvatar";
import { usePendingAccounts } from "../model/useAccountApproval";
import { useAccountApprovalDecision } from "../model/useAccountApprovalDecision";
import type {
  AccountApprovalDecision,
  PendingAccount,
} from "../type/types";

function PendingAccountList() {
  const { data: items = [], isLoading, isError } = usePendingAccounts();
  const { mutate, isPending, variables } = useAccountApprovalDecision();

  const handleDecision = (
    account: PendingAccount,
    decision: AccountApprovalDecision,
  ) => {
    if (isPending) return;
    mutate(
      { userId: account.userId, decision },
      {
        onError: (err) => {
          if (err instanceof AxiosError) {
            const code = (
              err.response?.data as { code?: string } | undefined
            )?.code;
            if (code === "ALREADY_DECIDED") {
              alert("이미 처리된 계정입니다.");
              return;
            }
          }
          alert("처리 중 오류가 발생했습니다.");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <p className="py-10 text-center text-sm text-[#A8A8A8]">불러오는 중...</p>
    );
  }

  if (isError) {
    return (
      <p className="py-10 text-center text-sm text-[#EF4444]">
        목록을 불러오지 못했습니다.
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[#A8A8A8]">
        대기 중인 가입 요청이 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((account) => {
        const isProcessing =
          isPending && variables?.userId === account.userId;
        return (
          <li
            key={account.userId}
            className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm"
          >
            <AccountAvatar
              name={account.name}
              avatarUrl={account.avatarUrl}
            />
            <div className="flex flex-1 flex-col gap-1">
              <p className="text-base font-bold text-[#212121]">
                {account.name}
              </p>
              <p className="text-sm text-[#212121]">
                {account.department} · {account.process} · {account.role}
              </p>
              <p className="text-xs text-[#A8A8A8]">
                신청: {account.requestedAt}
              </p>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDecision(account, "REJECT")}
                  disabled={isProcessing}
                  className="flex-1 rounded-lg border border-[#E5E7EB] py-2 text-sm font-medium text-[#212121] disabled:opacity-40"
                >
                  반려
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision(account, "APPROVE")}
                  disabled={isProcessing}
                  className="flex-1 rounded-lg bg-[#931B82] py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  승인
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default PendingAccountList;

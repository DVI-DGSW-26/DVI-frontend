import { useMemo, useState } from "react";
import { AxiosError } from "axios";
import {
  useApprovalUsers,
  useApproveUser,
} from "../model/useApprovalUsers";
import {
  DEPARTMENT_LABEL,
  ROLE_LABEL,
  STATUS_BADGE,
} from "../../user-search/lib/userLabels";
import type { UserDetail } from "../../user-search/api/types";

type Tab = "PENDING" | "COMPLETED";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const AccountApprovalPageMobile = () => {
  const { data: users = [], isLoading, isError } = useApprovalUsers();
  const { mutate: approve, isPending, variables } = useApproveUser();

  const [tab, setTab] = useState<Tab>("PENDING");

  const pending = useMemo(
    () =>
      [...users]
        .filter((u) => u.status === "PENDING")
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [users],
  );
  const completed = useMemo(
    () =>
      [...users]
        .filter((u) => u.status !== "PENDING")
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [users],
  );

  const list = tab === "PENDING" ? pending : completed;

  const handleApprove = (user: UserDetail) => {
    if (isPending) return;
    approve(user.id, {
      onError: (err) => {
        if (err instanceof AxiosError) {
          const code = (err.response?.data as { code?: string } | undefined)
            ?.code;
          if (code === "ALREADY_DECIDED") {
            alert("이미 처리된 계정입니다.");
            return;
          }
        }
        alert("처리 중 오류가 발생했습니다.");
      },
    });
  };

  const handleReject = () => {
    alert("반려 기능은 준비 중입니다.");
  };

  return (
    <div className="flex min-h-full flex-col gap-4 bg-[#F5F5F5] pb-21">
      <nav className="flex bg-white">
        <button
          type="button"
          onClick={() => setTab("PENDING")}
          className={`flex-1 border-b-2 py-3 text-sm font-semibold transition-colors ${
            tab === "PENDING"
              ? "border-[#931B82] text-[#931B82]"
              : "border-transparent text-[#A8A8A8]"
          }`}
        >
          대기 {pending.length}
        </button>
        <button
          type="button"
          onClick={() => setTab("COMPLETED")}
          className={`flex-1 border-b-2 py-3 text-sm font-semibold transition-colors ${
            tab === "COMPLETED"
              ? "border-[#931B82] text-[#931B82]"
              : "border-transparent text-[#A8A8A8]"
          }`}
        >
          완료
        </button>
      </nav>

      <div className="flex flex-col gap-3 px-4">
        {isLoading && (
          <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
            불러오는 중...
          </p>
        )}

        {isError && (
          <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
            목록을 불러오지 못했습니다.
          </p>
        )}

        {!isLoading && !isError && list.length === 0 && (
          <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
            {tab === "PENDING"
              ? "대기 중인 가입 요청이 없습니다."
              : "완료된 가입 요청이 없습니다."}
          </p>
        )}

        {!isLoading && !isError && list.length > 0 && (
          <ul className="flex flex-col gap-3">
            {list.map((u) => {
              const dept = DEPARTMENT_LABEL[u.role] ?? "—";
              const role = ROLE_LABEL[u.role] ?? "—";
              const badge = STATUS_BADGE[u.status];
              const processing = isPending && variables === u.id;
              const initial = u.name?.charAt(0) ?? "?";
              return (
                <li
                  key={u.id}
                  className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-base font-semibold text-[#6B7280]">
                    {initial}
                  </div>

                  <div className="flex flex-1 flex-col gap-1">
                    <p className="text-base font-bold text-[#212121]">
                      {u.name}
                    </p>
                    <p className="text-sm text-[#6B7280]">
                      {dept} · {role}
                    </p>
                    <p className="text-xs text-[#A8A8A8]">
                      신청: {formatDate(u.createdAt)}
                    </p>

                    {tab === "PENDING" ? (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={handleReject}
                          disabled={processing}
                          className="flex-1 rounded-lg border border-[#E5E7EB] py-2 text-sm font-medium text-[#212121] disabled:opacity-40"
                        >
                          반려
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(u)}
                          disabled={processing}
                          className="flex-1 rounded-lg bg-[#931B82] py-2 text-sm font-medium text-white disabled:opacity-40"
                        >
                          {processing ? "처리 중..." : "승인"}
                        </button>
                      </div>
                    ) : (
                      badge && (
                        <span
                          className="mt-1 flex w-fit items-center gap-1 text-xs font-medium"
                          style={{ color: badge.color }}
                        >
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: badge.color }}
                          />
                          {badge.label}
                        </span>
                      )
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AccountApprovalPageMobile;

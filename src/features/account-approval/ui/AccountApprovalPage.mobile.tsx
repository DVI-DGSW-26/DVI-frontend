import { useMemo } from "react";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import {
  useApprovalUsers,
  useApproveUser,
} from "../model/useApprovalUsers";
import {
  DEPARTMENT_LABEL_KEY,
  STATUS_BADGE,
} from "../../user-search/lib/userLabels";
import type { UserDetail } from "../../user-search/api/types";
import { useViewState } from "../../../lib/viewState";

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
  const { t } = useTranslation("accountApproval");
  const { data: users = [], isLoading, isError } = useApprovalUsers();
  const { mutate: approve, isPending, variables } = useApproveUser();

  // 보던 탭은 뒤로가기로 돌아왔을 때 그대로여야 한다.
  const [tab, setTab] = useViewState<Tab>("tab", "PENDING");

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
            alert(t("page.alreadyDecided"));
            return;
          }
        }
        alert(t("page.approveError"));
      },
    });
  };

  return (
    <div className="flex min-h-full flex-col gap-4 bg-canvas pb-21">
      <nav className="flex bg-surface">
        <button
          type="button"
          onClick={() => setTab("PENDING")}
          className={`flex-1 border-b-2 py-3 text-sm font-semibold transition-colors ${
            tab === "PENDING"
              ? "border-brand text-brand-fg"
              : "border-transparent text-fg-subtle"
          }`}
        >
          {t("page.tabPending", { n: pending.length })}
        </button>
        <button
          type="button"
          onClick={() => setTab("COMPLETED")}
          className={`flex-1 border-b-2 py-3 text-sm font-semibold transition-colors ${
            tab === "COMPLETED"
              ? "border-brand text-brand-fg"
              : "border-transparent text-fg-subtle"
          }`}
        >
          {t("page.tabCompleted")}
        </button>
      </nav>

      <div className="flex flex-col gap-3 px-4">
        {isLoading && (
          <p className="rounded-2xl bg-surface px-4 py-10 text-center text-sm text-fg-subtle border border-edge">
            {t("status.loading", { ns: "common" })}
          </p>
        )}

        {isError && (
          <p className="rounded-2xl bg-surface px-4 py-10 text-center text-sm text-danger-fg border border-edge">
            {t("page.loadFailed")}
          </p>
        )}

        {!isLoading && !isError && list.length === 0 && (
          <p className="rounded-2xl bg-surface px-4 py-10 text-center text-sm text-fg-subtle border border-edge">
            {tab === "PENDING"
              ? t("page.emptyPending")
              : t("page.emptyCompleted")}
          </p>
        )}

        {!isLoading && !isError && list.length > 0 && (
          <ul className="flex flex-col gap-3">
            {list.map((u) => {
              const deptKey = DEPARTMENT_LABEL_KEY[u.role];
              const dept = deptKey ? t(deptKey, { ns: "userSearch" }) : "—";
              const role = t(`roles.${u.role}`, {
                ns: "common",
                defaultValue: "—",
              });
              const badge = STATUS_BADGE[u.status];
              const processing = isPending && variables === u.id;
              const initial = u.name?.charAt(0) ?? "?";
              return (
                <li
                  key={u.id}
                  className="flex gap-3 rounded-2xl bg-surface p-4 shadow-sm border border-edge"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-2 text-base font-semibold text-fg-muted">
                    {initial}
                  </div>

                  <div className="flex flex-1 flex-col gap-1">
                    <p className="text-base font-bold text-fg">
                      {u.name}
                    </p>
                    <p className="text-sm text-fg-muted">
                      {dept} · {role}
                    </p>
                    <p className="text-xs text-fg-subtle">
                      {t("page.requestedAt", {
                        date: formatDate(u.createdAt),
                      })}
                    </p>

                    {/* 반려 버튼은 두지 않는다 — 승인하지 않으면 대기 상태로 남는 것으로 충분. */}
                    {tab === "PENDING" ? (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(u)}
                          disabled={processing}
                          className="flex-1 rounded-lg bg-brand py-2 text-sm font-medium text-on-brand disabled:opacity-40"
                        >
                          {processing
                            ? t("page.approving")
                            : t("page.approve")}
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
                          {t(badge.labelKey, { ns: "userSearch" })}
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

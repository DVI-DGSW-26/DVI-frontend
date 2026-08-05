import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { AxiosError } from "axios";
import { useAuth } from "../AuthContext";
import { ROLE_HOME, ROLE_LABEL } from "../constants";
import type { StoredAccount } from "../api";

interface Props {
  /** 전환/계정 추가로 화면을 떠날 때 호출 — 헤더 팝오버 닫기 용도. */
  onDone?: () => void;
}

export default function AccountSwitcher({ onDone }: Props) {
  const { user, accounts, switchAccount, removeAccount } = useAuth();
  const navigate = useNavigate();
  const [busyLoginId, setBusyLoginId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeLoginId = user?.loginId ?? null;
  // 현재 계정을 항상 맨 위에.
  const ordered = [...accounts].sort((a, b) => {
    if (a.loginId === activeLoginId) return -1;
    if (b.loginId === activeLoginId) return 1;
    return a.name.localeCompare(b.name);
  });

  const handleSwitch = async (account: StoredAccount) => {
    if (account.loginId === activeLoginId || busyLoginId) return;
    setError(null);
    setBusyLoginId(account.loginId);
    try {
      const me = await switchAccount(account.loginId);
      onDone?.();
      navigate(ROLE_HOME[me.role] ?? "/", { replace: true });
    } catch (err) {
      const expired =
        err instanceof AxiosError &&
        (err.response?.status === 401 || err.response?.status === 403);
      setError(
        expired
          ? `${account.name} 계정의 로그인이 만료됐습니다. 다시 로그인해주세요.`
          : "계정 전환에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setBusyLoginId(null);
    }
  };

  const handleAdd = () => {
    onDone?.();
    navigate("/login", { state: { addAccount: true } });
  };

  return (
    <div className="flex flex-col">
      <ul className="divide-y divide-gray-100">
        {ordered.map((account) => {
          const isActive = account.loginId === activeLoginId;
          const isBusy = busyLoginId === account.loginId;
          return (
            <li key={account.loginId} className="flex items-center">
              <button
                type="button"
                onClick={() => handleSwitch(account)}
                disabled={isActive || busyLoginId !== null}
                aria-current={isActive ? "true" : undefined}
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors enabled:hover:bg-[#FAF5FB] disabled:cursor-default"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    isActive
                      ? "bg-[#F3E8F7] text-[#931B82]"
                      : "bg-[#F3F4F6] text-[#6B7280]"
                  }`}
                >
                  {account.name?.[0] ?? "?"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[#212121]">
                    {account.name}
                  </span>
                  <span className="block truncate text-xs text-[#6B7280]">
                    {ROLE_LABEL[account.role]} · {account.loginId}
                  </span>
                </span>
                {isBusy ? (
                  <Icon
                    icon="mdi:loading"
                    width={18}
                    height={18}
                    className="shrink-0 animate-spin text-[#931B82]"
                  />
                ) : isActive ? (
                  <Icon
                    icon="mdi:check"
                    width={20}
                    height={20}
                    className="shrink-0 text-[#931B82]"
                  />
                ) : null}
              </button>
              {!isActive && (
                <button
                  type="button"
                  onClick={() => removeAccount(account.loginId)}
                  disabled={busyLoginId !== null}
                  aria-label={`${account.name} 계정 제거`}
                  className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#6B7280]"
                >
                  <Icon icon="mdi:close" width={16} height={16} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="border-t border-gray-100 px-4 py-2 text-xs text-[#B45309]">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={busyLoginId !== null}
        className="flex items-center gap-3 border-t border-gray-100 px-4 py-3 text-left transition-colors hover:bg-[#FAF5FB]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-[#D1D5DB] text-[#6B7280]">
          <Icon icon="mdi:plus" width={18} height={18} />
        </span>
        <span className="text-sm font-medium text-[#931B82]">
          다른 계정 추가
        </span>
      </button>
    </div>
  );
}

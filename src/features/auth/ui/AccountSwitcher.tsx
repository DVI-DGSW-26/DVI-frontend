import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { AxiosError } from "axios";
import { useAuth } from "../AuthContext";
import { ROLE_HOME, ROLE_LABEL } from "../constants";
import { SWITCHABLE_ACCOUNTS } from "../switchableAccounts";
import type { SwitchableAccount } from "../switchableAccounts";

interface Props {
  /** 전환으로 화면을 떠날 때 호출 — 헤더 팝오버 닫기 용도. */
  onDone?: () => void;
}

export default function AccountSwitcher({ onDone }: Props) {
  const { user, accounts, switchAccount, login } = useAuth();
  const navigate = useNavigate();
  const [busyLoginId, setBusyLoginId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeLoginId = user?.loginId ?? null;

  const handleSwitch = async (target: SwitchableAccount) => {
    if (target.loginId === activeLoginId || busyLoginId) return;
    setError(null);
    setBusyLoginId(target.loginId);
    const credentials = {
      loginId: target.loginId,
      password: target.password,
    };
    const saved = accounts.some((a) => a.loginId === target.loginId);
    try {
      let me;
      if (saved) {
        try {
          // 저장된 토큰으로 즉시 전환 (네트워크 로그인 없음).
          me = await switchAccount(target.loginId);
        } catch {
          // 토큰이 만료됐으면 자격증명으로 조용히 다시 로그인한다.
          me = await login(credentials);
        }
      } else {
        me = await login(credentials);
      }
      onDone?.();
      navigate(ROLE_HOME[me.role] ?? "/", { replace: true });
    } catch (err) {
      const badCredentials =
        err instanceof AxiosError && err.response?.status === 401;
      setError(
        badCredentials
          ? `${target.label}(${target.loginId}) 계정 정보가 서버와 맞지 않습니다.`
          : "계정 전환에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setBusyLoginId(null);
    }
  };

  return (
    <div className="flex flex-col">
      <ul className="divide-y divide-gray-100">
        {SWITCHABLE_ACCOUNTS.map((target) => {
          const isActive = target.loginId === activeLoginId;
          const isBusy = busyLoginId === target.loginId;
          // 한 번이라도 로그인했다면 서버가 준 실제 이름을 쓴다.
          const name =
            accounts.find((a) => a.loginId === target.loginId)?.name ??
            target.label;
          return (
            <li key={target.loginId}>
              <button
                type="button"
                onClick={() => handleSwitch(target)}
                disabled={isActive || busyLoginId !== null}
                aria-current={isActive ? "true" : undefined}
                className="flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors enabled:hover:bg-[#FAF5FB] disabled:cursor-default"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    isActive
                      ? "bg-[#F3E8F7] text-[#931B82]"
                      : "bg-[#F3F4F6] text-[#6B7280]"
                  }`}
                >
                  {name?.[0] ?? "?"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[#212121]">
                    {name}
                  </span>
                  <span className="block truncate text-xs text-[#6B7280]">
                    {ROLE_LABEL[target.role]} · {target.loginId}
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
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="border-t border-gray-100 px-4 py-2 text-xs text-[#B45309]">
          {error}
        </p>
      )}
    </div>
  );
}

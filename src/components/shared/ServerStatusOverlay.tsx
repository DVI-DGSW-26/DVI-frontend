import { useEffect, useState } from "react";
import { recheckServerNow, useServerStatus } from "../../lib/serverStatus";

/**
 * 서버 장애를 사용자에게 알리는 전역 표시. App 최상단에 한 번만 올린다.
 *
 * 현장 요구 — "자주검사/순회검사 중에 진행이 안 될 때, 앱이 느린 건지 서버가
 * 죽은 건지 몰라서 계속 기다리게 된다." 그래서 두 단계로 나눠 알린다.
 *
 *   느림(slow)        : 상단 얇은 띠. "느린 것뿐이니 기다리면 된다" 를 알린다.
 *   끊김(down/offline): 화면을 덮는 팝업. 놓칠 수 없게 만든다.
 *
 * 팝업은 닫을 수 있고, 닫으면 상단 띠로 줄어든다(화면 내용은 계속 볼 수 있게).
 * 연결이 돌아오면 팝업·띠가 저절로 사라지고 복구 안내가 잠깐 뜬다.
 *
 * ⚠️ 아이콘을 @iconify/react 로 쓰지 않는다. Iconify 는 아이콘 데이터를 런타임에
 *    외부 API 에서 받아오므로, 하필 "네트워크가 끊긴 화면" 에서 빈칸이 될 수 있다.
 *    이 컴포넌트만은 인라인 SVG 로 그린다.
 */

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.75a1.75 1.75 0 0 1 1.52.88l8.2 14.2A1.75 1.75 0 0 1 20.2 20.5H3.8a1.75 1.75 0 0 1-1.52-2.67l8.2-14.2A1.75 1.75 0 0 1 12 2.75m0 4.75a.9.9 0 0 0-.9.98l.35 4.2a.55.55 0 0 0 1.1 0l.35-4.2a.9.9 0 0 0-.9-.98m0 7.25a1 1 0 1 0 0 2a1 1 0 0 0 0-2"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20m4.53 7.47a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06l1.97 1.97l4.47-4.47a.75.75 0 0 1 1.06 0"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      aria-hidden="true"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.3"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        d="M21 12a9 9 0 0 0-9-9"
      />
    </svg>
  );
}

/** 복구 안내를 띄워두는 시간. */
const RECOVERED_NOTICE_MS = 4000;

export default function ServerStatusOverlay() {
  const { status, probing, nextRetryAt } = useServerStatus();
  const [dismissed, setDismissed] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [previous, setPrevious] = useState(status);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const disconnected = status === "down" || status === "offline";

  // 상태가 바뀐 순간을 렌더 중에 잡아낸다(이펙트로 하면 한 프레임 늦게 반영된다).
  if (previous !== status) {
    const wasDisconnected = previous === "down" || previous === "offline";
    setPrevious(status);
    if (wasDisconnected && status === "online") {
      // 끊겼다 돌아온 경우에만 복구 안내. 느림 → 정상 은 조용히 지나간다.
      setDismissed(false);
      setRecovered(true);
    } else if (status !== "online") {
      setRecovered(false);
    }
  }

  // 복구 안내 자동 닫기.
  useEffect(() => {
    if (!recovered) return;
    const id = setTimeout(() => setRecovered(false), RECOVERED_NOTICE_MS);
    return () => clearTimeout(id);
  }, [recovered]);

  // 자동 재확인까지 남은 시간. 0.5초마다 다시 계산한다.
  useEffect(() => {
    if (!disconnected || nextRetryAt == null) return;
    const id = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((nextRetryAt - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(id);
  }, [disconnected, nextRetryAt]);

  if (recovered) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 rounded-full bg-[#059669] px-4 py-2 text-xs font-semibold text-white shadow-lg">
          <CheckIcon />
          서버와 다시 연결되었습니다
        </div>
      </div>
    );
  }

  if (status === "slow") {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 rounded-full bg-[#B45309] px-4 py-2 text-xs font-semibold text-white shadow-lg">
          <SpinnerIcon />
          서버 응답이 느립니다. 잠시만 기다려 주세요
        </div>
      </div>
    );
  }

  if (!disconnected) return null;

  const isOffline = status === "offline";
  const title = isOffline
    ? "인터넷 연결이 끊어졌습니다"
    : "서버와 연결이 끊어졌습니다";

  // 팝업을 닫은 상태 — 화면은 쓸 수 있게 두되 경고는 띠로 계속 남긴다.
  if (dismissed) {
    return (
      <div className="fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setDismissed(false)}
          className="flex items-center gap-2 rounded-full bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white shadow-lg"
        >
          <span className="shrink-0">
            <WarningIcon />
          </span>
          {title}
          <span className="opacity-80">· 자세히</span>
        </button>
      </div>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="server-status-title"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
    >
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl sm:pb-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]">
            <WarningIcon />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="server-status-title"
              className="text-base font-semibold text-[#212121]"
            >
              {title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">
              {isOffline
                ? "기기의 Wi-Fi 또는 데이터 연결을 확인해 주세요. 연결이 돌아오면 자동으로 이어집니다."
                : "앱이 느린 것이 아니라 서버가 응답하지 않는 상태입니다. 잠시 기다려도 계속되면 관리자에게 서버 상태를 확인해 달라고 알려주세요."}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-md bg-[#F9FAFB] px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-[#6B7280]">
            방금 하던 저장·전송은 서버에 반영되지 않았을 수 있습니다. 연결이
            복구된 뒤 해당 화면에서 다시 시도해 주세요.
          </p>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="h-11 flex-1 rounded-md border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
          >
            닫고 화면 보기
          </button>
          <button
            type="button"
            onClick={() => void recheckServerNow()}
            disabled={probing}
            className="h-11 flex-1 rounded-md bg-[#931B82] text-sm font-semibold text-white hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
          >
            {probing ? "확인 중..." : "다시 시도"}
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-[#9CA3AF]">
          {probing
            ? "서버 상태를 확인하고 있습니다"
            : nextRetryAt != null && secondsLeft != null
              ? `${secondsLeft}초 후 자동으로 다시 확인합니다`
              : "연결이 복구되면 이 창은 저절로 사라집니다"}
        </p>
      </div>
    </div>
  );
}

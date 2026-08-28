import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useSyncExternalStore } from "react";
import { http } from "./http";

/**
 * 서버 연결 상태 감지.
 *
 * 현장에서 "화면이 안 넘어가는데 앱이 느린 건지 서버가 죽은 건지" 를 구분 못 하는
 * 문제를 없애기 위한 모듈이다. 모든 axios 요청의 결과를 관찰해서 아래 상태를 만든다.
 *
 *   online  — 정상
 *   slow    — 요청이 8초 넘게 응답 없이 떠 있음. "느린 것" 을 사용자에게 먼저 알린다.
 *   down    — 서버가 응답하지 않거나 5xx. 팝업으로 알린다.
 *   offline — 기기 자체가 네트워크에서 떨어짐(비행기모드/와이파이 끊김).
 *
 * 화면 쪽 배선은 components/shared/ServerStatusOverlay.tsx 에 있다.
 */

export type ServerStatus = "online" | "slow" | "down" | "offline";

export interface ServerStatusSnapshot {
  status: ServerStatus;
  /** 지금 생존 확인 요청이 나가 있는 중인지 (버튼 로딩 표시용). */
  probing: boolean;
  /** 다음 자동 재확인 시각(epoch ms). 없으면 null. */
  nextRetryAt: number | null;
}

/** 이 시간 넘게 응답이 없으면 "느림" 으로 본다. */
const SLOW_MS = 8000;
/** 생존 확인 요청 자체의 제한 시간. 본 요청보다 짧게 잡아 빨리 판정한다. */
const PROBE_TIMEOUT_MS = 6000;
/** 자동 재확인 간격. 끊긴 시간이 길어질수록 뜸하게 — 마지막 값이 계속 반복된다. */
const RETRY_STEPS_MS = [3000, 5000, 10000, 15000];
/**
 * 생존 확인에 쓰는 엔드포인트. 백엔드에 헬스체크(/health)가 없어서 가장 가벼운
 * 인증 엔드포인트를 쓴다. 토큰 없이 부르므로 보통 401 이 돌아오는데, 응답이
 * 왔다는 것 자체가 "서버는 살아 있다" 는 증거라 그것으로 충분하다.
 * (5xx 만 장애로 판정한다 — 아래 probeOnce 참고)
 */
const PROBE_PATH = "/user/me";

let snapshot: ServerStatusSnapshot = {
  status: "online",
  probing: false,
  nextRetryAt: null,
};

const listeners = new Set<() => void>();

function emit(patch: Partial<ServerStatusSnapshot>) {
  const next = { ...snapshot, ...patch };
  if (
    next.status === snapshot.status &&
    next.probing === snapshot.probing &&
    next.nextRetryAt === snapshot.nextRetryAt
  ) {
    return;
  }
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

/** 서버 연결 상태 구독. 값이 바뀔 때만 리렌더된다. */
export function useServerStatus(): ServerStatusSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ── 느린 응답 감지 ──────────────────────────────────────────────
// 요청이 시작될 때 시각을 기록하고, 1초마다 "가장 오래 떠 있는 요청" 을 본다.
// config 객체를 키로 쓴다 — 401 재발급 재시도는 같은 config 를 재사용해서 시작
// 시각이 덮어써지는데, 재시도도 새로 나가는 요청이라 그게 맞다.

const pending = new Map<object, number>();
let slowTimer: ReturnType<typeof setTimeout> | null = null;

function startPending(config: InternalAxiosRequestConfig) {
  pending.set(config, Date.now());
  scheduleSlowCheck();
}

function finishPending(config?: object) {
  if (config) pending.delete(config);
}

function scheduleSlowCheck() {
  if (slowTimer) return;
  slowTimer = setTimeout(() => {
    slowTimer = null;

    if (pending.size === 0) {
      // 떠 있는 요청이 없다. 생존 확인 중이면 "느림" 표시를 그대로 둔다 — 곧
      // online/down 으로 확정된다. 여기서 성급히 지우면 타임아웃 직후부터 팝업이
      // 뜨기 전까지 아무 표시도 없는 구간이 생긴다.
      if (snapshot.status === "slow" && !probeInFlight) {
        emit({ status: "online" });
      }
      return;
    }

    // down/offline 을 slow 로 덮어쓰지 않는다 — 이미 더 강한 경고를 띄운 상태다.
    if (snapshot.status === "online") {
      let oldest = Infinity;
      pending.forEach((startedAt) => {
        if (startedAt < oldest) oldest = startedAt;
      });
      if (Date.now() - oldest >= SLOW_MS) emit({ status: "slow" });
    }
    scheduleSlowCheck();
  }, 1000);
}

// ── 생존 확인(probe) ────────────────────────────────────────────

let probeInFlight: Promise<boolean> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let failureStreak = 0;

function clearRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * axios 를 거치지 않고 맨 fetch 로 서버를 두드린다.
 * 인터셉터를 타면 이 확인 요청 자체가 또 실패를 보고해 무한 루프가 된다.
 */
async function probeOnce(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${http.defaults.baseURL ?? ""}${PROBE_PATH}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    // 401/403/404 도 "서버가 답했다" 는 뜻이라 정상으로 본다. 5xx 만 장애.
    return res.status < 500;
  } catch {
    // 네트워크 오류 · 타임아웃 · CORS 차단 — 어느 쪽이든 사용자 입장에선 "못 쓴다".
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** 생존 확인 1회. 동시에 여러 번 불러도 하나로 합쳐진다. */
function runProbe(): Promise<boolean> {
  if (probeInFlight) return probeInFlight;
  clearRetry();
  emit({ probing: true, nextRetryAt: null });

  probeInFlight = probeOnce().then((alive) => {
    probeInFlight = null;
    if (alive) {
      failureStreak = 0;
      emit({ status: "online", probing: false, nextRetryAt: null });
    } else {
      failureStreak += 1;
      emit({ status: isBrowserOffline() ? "offline" : "down", probing: false });
      scheduleRetry();
    }
    return alive;
  });

  return probeInFlight;
}

function scheduleRetry() {
  clearRetry();
  const step = Math.min(failureStreak - 1, RETRY_STEPS_MS.length - 1);
  const delay = RETRY_STEPS_MS[Math.max(0, step)];
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void runProbe();
  }, delay);
  emit({ nextRetryAt: Date.now() + delay });
}

/** "다시 시도" 버튼용 — 즉시 생존 확인. */
export function recheckServerNow(): Promise<boolean> {
  return runProbe();
}

/**
 * 이 오류가 "서버에 닿지 못했다" 인지 판별한다.
 *
 * 화면에서 오류 문구를 고를 때 쓴다. 서버가 죽어서 실패한 것을 "입력값을
 * 확인해주세요" 처럼 사용자 잘못으로 안내하면 안 되기 때문이다.
 * (전역 팝업은 생존 확인을 한 번 거치느라 몇 초 늦게 뜨므로, 즉시 보여줄 문구는
 *  이 함수로 각 화면에서 직접 고른다.)
 */
export function isConnectionError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  if (axios.isCancel(err) || err.code === "ERR_CANCELED") return false;
  const status = err.response?.status;
  return status == null || status >= 500;
}

// ── 요청 결과 보고 ──────────────────────────────────────────────

/** 서버가 응답했다 = 살아 있다. 경고 중이었으면 즉시 해제한다. */
function reportReachable() {
  failureStreak = 0;
  clearRetry();
  if (snapshot.status !== "online") {
    emit({ status: "online", probing: false, nextRetryAt: null });
  }
}

/**
 * 요청이 서버까지 닿지 못했거나 5xx 를 받았다.
 *
 * 곧바로 팝업을 띄우지 않고 생존 확인을 한 번 거친다. 순간적인 오류 1건으로
 * 화면 전체를 덮는 팝업이 깜빡이는 것을 막기 위해서다. 다만 502/503/504 는
 * 게이트웨이가 "뒤에 붙은 서버 없음" 을 명시한 것이라 확인 없이 바로 장애로 본다.
 */
function reportUnreachable(httpStatus?: number) {
  if (isBrowserOffline()) {
    failureStreak = Math.max(failureStreak, 1);
    clearRetry();
    emit({ status: "offline", probing: false, nextRetryAt: null });
    return;
  }

  // 이미 알리고 있는 중이면 재확인 스케줄이 살아 있는지만 확인하고 끝낸다.
  if (snapshot.status === "down" || snapshot.status === "offline") {
    if (!retryTimer && !probeInFlight) scheduleRetry();
    return;
  }

  if (httpStatus === 502 || httpStatus === 503 || httpStatus === 504) {
    failureStreak = Math.max(failureStreak, 1);
    emit({ status: "down", probing: false });
    scheduleRetry();
    return;
  }

  void runProbe();
}

/**
 * axios 인터셉터 + 브라우저 온라인 이벤트 배선.
 *
 * ⚠️ installAuthInterceptors() 다음에 불러야 한다. axios 응답 인터셉터는 등록
 * 순서대로 실행되므로, 401 재발급 재시도가 성공한 경우를 "실패" 로 세지 않으려면
 * 인증 인터셉터 뒤에 붙어야 한다.
 */
export function installServerStatusInterceptors() {
  http.interceptors.request.use((config) => {
    startPending(config);
    return config;
  });

  http.interceptors.response.use(
    (response) => {
      finishPending(response.config);
      reportReachable();
      return response;
    },
    (error: AxiosError) => {
      finishPending(error.config);

      // 화면 이동 등으로 우리가 취소한 요청은 서버 장애가 아니다.
      if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
        return Promise.reject(error);
      }

      const status = error.response?.status;
      if (status == null) {
        // 응답 자체가 없음 — 네트워크 오류 · 타임아웃 · CORS 차단.
        reportUnreachable();
      } else if (status >= 500) {
        reportUnreachable(status);
      } else {
        // 4xx 는 서버가 멀쩡히 판단해서 돌려준 응답이다.
        reportReachable();
      }

      return Promise.reject(error);
    },
  );

  if (typeof window !== "undefined") {
    window.addEventListener("offline", () => {
      failureStreak = Math.max(failureStreak, 1);
      clearRetry();
      emit({ status: "offline", probing: false, nextRetryAt: null });
    });
    window.addEventListener("online", () => {
      void runProbe();
    });
  }

  if (typeof document !== "undefined") {
    // 앱을 백그라운드에 뒀다 돌아왔을 때 — 자동 재확인 타이머는 백그라운드에서
    // 느려지므로, 돌아오는 즉시 한 번 확인해 팝업이 남아 있지 않게 한다.
    document.addEventListener("visibilitychange", () => {
      if (
        document.visibilityState === "visible" &&
        (snapshot.status === "down" || snapshot.status === "offline")
      ) {
        void runProbe();
      }
    });
  }
}

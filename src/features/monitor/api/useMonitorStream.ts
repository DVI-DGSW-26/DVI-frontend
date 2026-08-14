import { useEffect, useRef, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { API_BASE } from "../../../lib/http";
import { tokenStorage, refreshAccessToken } from "../../auth/api";
import { getMonitorSnapshot } from "./monitorApi";
import type { MonitorConnection, MonitorSnapshot } from "../type/types";

// 스트림이 연속 실패하면 폴링으로 내려앉는 임계값. 공장 벽 화면이라 "멈춘 화면"
// 보다는 5초 지연이라도 계속 갱신되는 쪽이 낫다.
const FAILURES_BEFORE_POLLING = 3;
const POLL_INTERVAL_MS = 5000;
// 재연결 백오프 — 서버가 30분마다 커넥션을 정리하므로 정상 종료도 여기를 지난다.
const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 15000;

/** onopen 에서 401 을 구분하기 위한 표식. */
class UnauthorizedError extends Error {}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });

/**
 * GET /monitor/stream 구독.
 *
 * - 브라우저 기본 EventSource 는 Authorization 헤더를 못 실어 사용 불가 →
 *   fetch 기반 SSE 로 접속한다.
 * - 접속 즉시 스냅샷 1회, 이후 변경 시마다 전체 스냅샷이 다시 내려온다.
 * - 액세스 토큰 만료(401)는 axios 인터셉터가 잡아주지 않는 경로이므로
 *   refreshAccessToken() 으로 직접 재발급하고 새 토큰으로 재연결한다.
 * - 재연결은 라이브러리 자동 재시도를 끄고 직접 돌린다. 매 시도마다 헤더를
 *   새로 만들어야 재발급된 토큰이 실제로 반영되기 때문.
 */
export function useMonitorStream() {
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [connection, setConnection] = useState<MonitorConnection>("connecting");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // 렌더와 무관한 최신값 참조 — 이펙트를 재실행시키지 않기 위해 ref 로 둔다.
  const applyRef = useRef((next: MonitorSnapshot) => {
    setSnapshot(next);
    setUpdatedAt(new Date());
  });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const apply = applyRef.current;

    // 스트림이 첫 스냅샷을 주기 전에도 화면이 비어 있지 않도록 REST 로 먼저 채운다.
    void getMonitorSnapshot(signal)
      .then(apply)
      .catch(() => {
        // 실패해도 스트림이 곧 채워주므로 무시.
      });

    let failures = 0;

    async function poll() {
      setConnection("polling");
      while (!signal.aborted) {
        try {
          apply(await getMonitorSnapshot(signal));
          setConnection("polling");
        } catch {
          if (signal.aborted) return;
          setConnection("down");
        }
        await sleep(POLL_INTERVAL_MS, signal);
      }
    }

    async function stream() {
      while (!signal.aborted) {
        try {
          await fetchEventSource(`${API_BASE}/monitor/stream`, {
            signal,
            headers: {
              Authorization: `Bearer ${tokenStorage.getAccess() ?? ""}`,
              Accept: "text/event-stream",
            },
            // 벽걸이 화면은 탭이 백그라운드로 내려가도 계속 받아야 한다.
            openWhenHidden: true,
            onopen: async (res) => {
              if (res.status === 401) throw new UnauthorizedError();
              if (
                !res.ok ||
                !res.headers.get("content-type")?.includes("text/event-stream")
              ) {
                throw new Error(`monitor stream failed: ${res.status}`);
              }
              failures = 0;
              setConnection("live");
            },
            onmessage: (ev) => {
              // 하트비트(:hb) 는 주석 프레임이라 여기까지 오지 않는다.
              if (ev.event !== "snapshot" || !ev.data) return;
              try {
                apply(JSON.parse(ev.data) as MonitorSnapshot);
              } catch {
                // 깨진 프레임 1건 때문에 연결을 끊지는 않는다.
              }
            },
            // 라이브러리 자동 재시도를 끄고(throw) 아래 루프에서 직접 재연결한다.
            onerror: (err) => {
              throw err;
            },
          });
          // 정상 종료 — 서버가 30분마다 커넥션을 정리한다. 바로 다시 붙는다.
        } catch (err) {
          if (signal.aborted) return;

          if (err instanceof UnauthorizedError) {
            try {
              await refreshAccessToken();
              // 재발급 성공 — 실패 횟수를 늘리지 않고 새 토큰으로 즉시 재연결.
              continue;
            } catch {
              // 재발급까지 실패하면 로그인 자체가 풀린 상태. 폴링도 401 이겠지만
              // 세션이 복구되면 스스로 살아나도록 계속 시도한다.
              failures += 1;
            }
          } else {
            failures += 1;
          }

          if (failures >= FAILURES_BEFORE_POLLING) {
            // 스트림이 막힌 환경(중계 버퍼링 등)으로 보고 폴링으로 내려앉는다.
            await poll();
            return;
          }
          setConnection("connecting");
        }

        if (signal.aborted) return;
        const backoff = Math.min(
          RECONNECT_MAX_MS,
          RECONNECT_MIN_MS * 2 ** failures,
        );
        await sleep(backoff, signal);
      }
    }

    void stream();
    return () => controller.abort();
  }, []);

  return { snapshot, connection, updatedAt };
}

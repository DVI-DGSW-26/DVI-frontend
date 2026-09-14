import { useEffect, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { tokenStorage, refreshAccessToken } from "../../auth/api";
import {
  getMonitorQuality,
  getMonitorSchedule,
  getMonitorSnapshot,
} from "./monitorApi";
import type {
  MonitorConnection,
  MonitorQualityBoard,
  MonitorScheduleBoard,
  MonitorSnapshot,
} from "../type/types";

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

/** 한 커넥션에 섞여 오는 보드들 — 이벤트 이름이 곧 화면 구분이다. */
export interface MonitorBoardTimes {
  snapshot: Date | null;
  quality: Date | null;
  schedule: Date | null;
}

export interface MonitorStream {
  /** 페이지1 현황판 (event: snapshot). */
  snapshot: MonitorSnapshot | null;
  /** 페이지3 품질·불량 보드 (event: quality). */
  quality: MonitorQualityBoard | null;
  /** 페이지4 진행·지연 보드 (event: schedule). */
  schedule: MonitorScheduleBoard | null;
  connection: MonitorConnection;
  /**
   * 보드별 마지막 갱신 시각. 이벤트는 내용이 바뀔 때만 나가므로 보드마다 다르다 —
   * "5분째 그대로"가 고장이 아니라 정상일 수 있다는 뜻이라, 화면에는 연결 상태와
   * 함께 보여줘야 오해가 없다.
   */
  updatedAt: MonitorBoardTimes;
  /** 셋 중 가장 최근 갱신 — 헤더 표시등용. */
  lastEventAt: Date | null;
}

const NO_TIMES: MonitorBoardTimes = {
  snapshot: null,
  quality: null,
  schedule: null,
};

/**
 * GET /monitor/stream 구독 — 커넥션 하나로 네 페이지를 모두 먹인다.
 *
 * - 브라우저 기본 EventSource 는 Authorization 헤더를 못 실어 사용 불가 →
 *   fetch 기반 SSE 로 접속한다.
 * - 페이지 구분은 이벤트 이름(snapshot/quality/schedule)이다. 페이지를 넘길 때
 *   새로 연결하지 않는다 — 보이지 않는 페이지의 데이터도 계속 최신으로 들고 있어야
 *   탭 배지(불량 N건·지연 N칸)가 맞고, 넘어간 순간 이미 그려져 있다.
 * - 접속 즉시 서버가 캐싱해 둔 최신값 3종이 한 번에 온다. 앱 기동 직후라 캐시가
 *   아직 없으면 최대 한 주기(5초) 비므로, REST 로 한 번 먼저 채운다.
 * - 이후엔 페이로드가 바뀔 때만 온다. 매 주기 재전송이 아니라 받을 때마다 통째로
 *   갈아끼워도 불필요한 리렌더가 생기지 않는다.
 * - 액세스 토큰 만료(401)는 axios 인터셉터가 잡아주지 않는 경로이므로
 *   refreshAccessToken() 으로 직접 재발급하고 새 토큰으로 재연결한다.
 * - 재연결은 라이브러리 자동 재시도를 끄고 직접 돌린다. 매 시도마다 헤더를
 *   새로 만들어야 재발급된 토큰이 실제로 반영되기 때문.
 */
export function useMonitorStream(): MonitorStream {
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [quality, setQuality] = useState<MonitorQualityBoard | null>(null);
  const [schedule, setSchedule] = useState<MonitorScheduleBoard | null>(null);
  const [connection, setConnection] = useState<MonitorConnection>("connecting");
  const [updatedAt, setUpdatedAt] = useState<MonitorBoardTimes>(NO_TIMES);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // useState 세터는 렌더가 바뀌어도 같은 참조라 이펙트 안에서 그대로 써도 된다.
    const stamp = (key: keyof MonitorBoardTimes) =>
      setUpdatedAt((prev) => ({ ...prev, [key]: new Date() }));

    const apply = {
      snapshot: (v: MonitorSnapshot) => {
        setSnapshot(v);
        stamp("snapshot");
      },
      quality: (v: MonitorQualityBoard) => {
        setQuality(v);
        stamp("quality");
      },
      schedule: (v: MonitorScheduleBoard) => {
        setSchedule(v);
        stamp("schedule");
      },
    };

    /** 세 보드를 한 번씩 REST 로 받아 채운다. 하나가 실패해도 나머지는 채운다. */
    const fetchAll = () =>
      Promise.allSettled([
        getMonitorSnapshot(signal).then(apply.snapshot),
        getMonitorQuality(signal).then(apply.quality),
        getMonitorSchedule(signal).then(apply.schedule),
      ]);

    // 스트림이 첫 값을 주기 전에도 화면이 비어 있지 않도록 REST 로 먼저 채운다.
    void fetchAll();

    let failures = 0;

    async function poll() {
      setConnection("polling");
      while (!signal.aborted) {
        const results = await fetchAll();
        if (signal.aborted) return;
        // 하나라도 받았으면 화면은 갱신되고 있다 — 전멸일 때만 끊김으로 본다.
        setConnection(
          results.some((r) => r.status === "fulfilled") ? "polling" : "down",
        );
        await sleep(POLL_INTERVAL_MS, signal);
      }
    }

    async function stream() {
      while (!signal.aborted) {
        try {
          await fetchEventSource("/api/monitor/stream", {
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
              if (!ev.data) return;
              try {
                // 모르는 이벤트 이름은 조용히 흘린다 — 서버가 페이지를 더 늘려도
                // 이 화면이 깨지지 않아야 한다.
                switch (ev.event) {
                  case "snapshot":
                    apply.snapshot(JSON.parse(ev.data) as MonitorSnapshot);
                    break;
                  case "quality":
                    apply.quality(JSON.parse(ev.data) as MonitorQualityBoard);
                    break;
                  case "schedule":
                    apply.schedule(JSON.parse(ev.data) as MonitorScheduleBoard);
                    break;
                }
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

  const lastEventAt = latest(updatedAt);
  return { snapshot, quality, schedule, connection, updatedAt, lastEventAt };
}

function latest(times: MonitorBoardTimes): Date | null {
  let best: Date | null = null;
  for (const t of [times.snapshot, times.quality, times.schedule]) {
    if (t && (!best || t > best)) best = t;
  }
  return best;
}

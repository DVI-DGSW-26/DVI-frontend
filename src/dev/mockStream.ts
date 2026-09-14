// GET /monitor/stream 흉내 — fetch 를 가로채 text/event-stream 을 돌려준다.
//
// 목업 화면에서도 연결 표시등이 "실시간"으로 뜨고, 값이 바뀔 때마다 서버가 밀어주는
// 흐름(이벤트 이름으로 페이지를 가르는 구조)을 그대로 확인할 수 있다.

type Send = (event: string, data: unknown) => void;

const senders = new Set<Send>();

/** 열려 있는 모든 스트림에 이벤트 한 건을 밀어 넣는다. */
export function broadcast(event: string, data: unknown): void {
  for (const send of senders) send(event, data);
}

export function installMockStream(initial: () => [string, unknown][]): void {
  const realFetch = window.fetch.bind(window);

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (!url.includes("/monitor/stream")) return realFetch(input, init);

    const encoder = new TextEncoder();
    let send: Send | undefined;

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        send = (event, data) => {
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
            );
          } catch {
            // 이미 닫힌 스트림 — 무시.
          }
        };
        senders.add(send);
        // 접속 즉시 캐시된 최신값 3종을 한 번에 내려주는 서버 동작을 그대로 흉내 낸다.
        for (const [event, data] of initial()) send(event, data);

        init?.signal?.addEventListener("abort", () => {
          if (send) senders.delete(send);
          try {
            controller.close();
          } catch {
            // 이미 닫힘.
          }
        });
      },
      cancel() {
        if (send) senders.delete(send);
      },
    });

    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  };
}

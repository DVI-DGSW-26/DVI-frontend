// 목업 데이터로 /monitor 를 띄우는 개발용 진입점.
//
//   npm run dev  →  http://localhost:5173/monitor-preview.html
//   페이지 고정: ?page=status | detail | quality | schedule
//
// 서버가 없어도 네 페이지가 모두 채워지고, 6초마다 값이 바뀌며 SSE 로 밀려 들어온다.
// 실제 앱 빌드에는 포함되지 않는다(빌드 진입점은 index.html 하나뿐).
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AxiosAdapter, AxiosResponse } from "axios";
import { http } from "../lib/http";
import MonitorPage from "../features/monitor/ui/MonitorPage";
import { kstStamp, quality, schedule, snapshot } from "./mockMonitorData";
import { detailFor, processes, slots, todayInspections } from "./mockRest";
import { broadcast, installMockStream } from "./mockStream";
import "../index.css";

/** 현장이 움직이는 흉내 — 6초마다 하나씩 올라간다. */
let tick = 0;

function advance(): void {
  // 진행중인 칸 하나를 완료로 넘기고, 다음 칸을 진행중으로 만든다.
  const order = schedule.orders[tick % schedule.orders.length];
  const running = order.slots.findIndex((s) => s.state === "IN_PROGRESS");
  if (running >= 0) {
    order.slots[running] = {
      ...order.slots[running],
      state: "DONE",
      overdue: false,
    };
    order.doneCount = Math.min(order.totalCount, order.doneCount + 1);
    const next = order.slots.findIndex((s) => s.state === "NOT_STARTED");
    if (next >= 0) {
      order.slots[next] = { ...order.slots[next], state: "IN_PROGRESS" };
    }
    schedule.summary = {
      ...schedule.summary,
      doneSlots: schedule.summary.doneSlots + 1,
      overdueSlots: schedule.orders.reduce(
        (n, o) => n + o.slots.filter((s) => s.overdue).length,
        0,
      ),
    };
  }

  // 세 틱마다 새 불량 한 건 — 목록 맨 위로 올라온다.
  if (tick % 3 === 0) {
    const src = quality.defects[tick % quality.defects.length];
    quality.defects.unshift({ ...src, detectedAt: kstStamp(0) });
    quality.summary = {
      ...quality.summary,
      defectItemCount: quality.summary.defectItemCount + 1,
    };
  }
}

installMockStream(() => [
  ["snapshot", snapshot],
  ["quality", quality],
  ["schedule", schedule],
]);

setInterval(() => {
  tick += 1;
  advance();
  // 서버는 내용이 바뀐 보드만 다시 밀어준다 — 여기서도 바뀐 둘만 보낸다.
  broadcast("schedule", schedule);
  broadcast("quality", quality);
}, 6000);

/* ── REST 폴백·페이지2 상세 ───────────────────────────────── */

function payload(url: string): unknown {
  if (url.includes("/monitor/snapshot")) return snapshot;
  if (url.includes("/monitor/quality")) return quality;
  if (url.includes("/monitor/schedule")) return schedule;
  if (url.includes("/inspection/slots")) return slots;
  if (url.includes("/inspection/all")) return todayInspections;
  if (url.includes("/process")) return processes;
  const detail = /\/inspection\/(\d+)$/.exec(url);
  // 폴링할 때마다 측정값이 하나씩 더 찍힌 상태로 내려준다.
  if (detail) return detailFor(Number(detail[1]), 3 + (tick % 5));
  return null;
}

const adapter: AxiosAdapter = async (config) => {
  const response: AxiosResponse = {
    data: { status: 200, message: "ok", data: payload(config.url ?? "") },
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  };
  return response;
};

http.defaults.adapter = adapter;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MonitorPage />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

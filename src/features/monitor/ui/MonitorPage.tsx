import { useEffect, useMemo, useState } from "react";
import { useMonitorStream } from "../api/useMonitorStream";
import type {
  MonitorConnection,
  MonitorCrossCheck,
  MonitorCrossCheckStatus,
  MonitorInspection,
  MonitorWorker,
} from "../type/types";

// 공장 벽걸이 모니터 전용 화면. 원거리 가독성이 최우선이라 다크 표면에 큰 글자,
// 조작 요소 없음(터치/클릭 안 함), 스크롤 없이 한 눈에 들어오는 3열 배치.
//
// 색은 dataviz 표준 팔레트의 다크 표면 기준 검증값만 쓴다.
//   표면 #0d0d0d(페이지) / #1a1a19(카드), 잉크 #ffffff·#c3c2b7·#898781
//   상태 good #0ca30c(5.19) · warning #fab219(9.49) · critical #d03b3b(3.62)
//   브랜드 #931B82 는 다크 표면 대비 2.26 이라 사용 불가 → 밝은 단계 #D95FC4(5.30).
// 상태색은 항상 라벨과 함께 쓴다(색만으로 의미를 전달하지 않는다).

const BRAND = "#D95FC4";

// 벽걸이 화면은 스크롤할 사람이 없다 → 각 목록은 화면에 들어가는 만큼만 보여주고
// 나머지는 개수로 알린다. 대신 "먼저 봐야 할 것"이 위로 오도록 정렬한다.
//
// 행 높이가 패널마다 달라(검사 3줄 ≈126px, 작업자 2줄 ≈92px) 한도도 다르게 준다.
// 1080p 기준 본문 높이 ≈666px. 넘치면 마지막 행이 잘려 보이므로 넉넉하게 잡는다.
const MAX_ROWS_INSPECTION = 5;
const MAX_ROWS_WORKER = 7;

// 조치가 급한 순서 — 반려(재측정 대기) > 승인대기 > 작성중.
const CROSS_CHECK_PRIORITY: Record<MonitorCrossCheckStatus, number> = {
  REJECTED: 0,
  PENDING_APPROVAL: 1,
  DRAFT: 2,
};

export default function MonitorPage() {
  const { snapshot, connection, updatedAt } = useMonitorStream();
  const now = useNow();

  // 접속자가 26명 중 1명일 때 그 1명이 화면 밖으로 밀리면 안 된다.
  const workers = useMemo(
    () =>
      [...(snapshot?.workers ?? [])].sort(
        (a, b) =>
          Number(b.online) - Number(a.online) ||
          b.inProgressCount - a.inProgressCount ||
          a.name.localeCompare(b.name),
      ),
    [snapshot?.workers],
  );

  const crossChecks = useMemo(
    () =>
      [...(snapshot?.crossChecks ?? [])].sort(
        (a, b) =>
          CROSS_CHECK_PRIORITY[a.status] - CROSS_CHECK_PRIORITY[b.status] ||
          Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      ),
    [snapshot?.crossChecks],
  );

  // 조치가 필요한 건수 — 반려된 순회검사는 재측정을 기다리는 상태라 벽에서 바로 보여야 한다.
  const rejectedCount =
    snapshot?.crossChecks.filter((c) => c.status === "REJECTED").length ?? 0;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0d0d0d] text-white">
      <header className="flex shrink-0 items-center justify-between px-8 pt-6 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          생산 현황
          <span className="ml-3 text-xl font-normal text-[#898781]">
            자주검사 · 순회검사
          </span>
        </h1>
        <div className="flex items-center gap-6">
          <ConnectionBadge connection={connection} updatedAt={updatedAt} />
          <div className="text-4xl font-semibold tabular-nums">
            {formatClock(now)}
          </div>
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-4 gap-4 px-8 pb-5">
        <StatTile
          label="진행중 자주검사"
          value={snapshot?.summary.inProgressInspectionCount}
          accent={BRAND}
        />
        <StatTile
          label="진행중 순회검사"
          value={snapshot?.summary.crossCheckCount}
          accent={BRAND}
        />
        <StatTile
          label="접속 작업자"
          value={snapshot?.summary.onlineWorkerCount}
          suffix={
            snapshot ? `/ ${snapshot.summary.totalWorkerCount}명` : undefined
          }
          accent="#0ca30c"
        />
        <StatTile
          label="반려 · 재측정 필요"
          value={snapshot ? rejectedCount : undefined}
          accent={rejectedCount > 0 ? "#d03b3b" : "#898781"}
        />
      </div>

      <main className="grid min-h-0 flex-1 grid-cols-[1.4fr_1fr_1fr] gap-4 px-8 pb-6">
        <Panel
          title="진행중 자주검사"
          list={snapshot?.inProgressInspections}
          empty="진행중인 자주검사가 없습니다"
          maxRows={MAX_ROWS_INSPECTION}
          render={(it) => (
            <InspectionRow key={it.inspectionId} item={it} now={now} />
          )}
        />

        <Panel
          title="진행중 순회검사"
          list={snapshot ? crossChecks : undefined}
          empty="진행중인 순회검사가 없습니다"
          maxRows={MAX_ROWS_INSPECTION}
          render={(it) => (
            <CrossCheckRow key={it.crossCheckId} item={it} now={now} />
          )}
        />

        <Panel
          title="작업자"
          list={snapshot ? workers : undefined}
          empty="작업자가 없습니다"
          maxRows={MAX_ROWS_WORKER}
          render={(w) => <WorkerRow key={w.userId} worker={w} />}
        />
      </main>
    </div>
  );
}

/* ── 요약 타일 ─────────────────────────────────────────────── */

function StatTile({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number | undefined;
  suffix?: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-[#1a1a19] px-6 py-5 ring-1 ring-white/10">
      <div className="text-lg text-[#c3c2b7]">{label}</div>
      <div className="mt-1 flex items-baseline gap-3">
        <span
          className="text-6xl leading-none font-semibold"
          style={{ color: accent }}
        >
          {value ?? "–"}
        </span>
        {suffix && <span className="text-2xl text-[#898781]">{suffix}</span>}
      </div>
    </div>
  );
}

/* ── 패널 ─────────────────────────────────────────────────── */

function Panel<T>({
  title,
  list,
  empty,
  maxRows,
  render,
}: {
  title: string;
  list: T[] | undefined;
  empty: string;
  maxRows: number;
  render: (item: T) => React.ReactNode;
}) {
  const total = list?.length;
  const hidden = total != null ? Math.max(0, total - maxRows) : 0;

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-[#1a1a19] ring-1 ring-white/10">
      <div className="flex shrink-0 items-baseline justify-between px-6 pt-5 pb-3">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <span className="text-xl tabular-nums text-[#898781]">
          {total ?? "–"}건
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-hidden px-4">
        {list?.slice(0, maxRows).map(render)}
        {list && list.length === 0 && (
          <div className="px-2 py-8 text-center text-xl text-[#898781]">
            {empty}
          </div>
        )}
      </div>
      {hidden > 0 && (
        <div className="shrink-0 px-6 py-3 text-center text-lg text-[#898781]">
          외 {hidden}건 더
        </div>
      )}
    </section>
  );
}

/* ── 행 ───────────────────────────────────────────────────── */

function InspectionRow({
  item,
  now,
}: {
  item: MonitorInspection;
  now: Date;
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="truncate text-2xl font-semibold">
          {item.productName}
        </div>
        <div
          className="shrink-0 text-xl font-semibold"
          style={{ color: BRAND }}
        >
          {item.slotLabel ?? item.type}
        </div>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3 text-lg text-[#c3c2b7]">
        <div className="truncate">
          {item.equipmentName}
          <span className="text-[#898781]"> · {item.customerName}</span>
        </div>
        <div className="shrink-0 tabular-nums text-[#898781]">
          {formatElapsed(item.updatedAt, now)}
        </div>
      </div>
      <div className="mt-0.5 truncate text-lg">{item.workerName}</div>
    </div>
  );
}

// 상태는 색 + 라벨을 항상 함께 — 색만으로 구분하지 않는다.
const CROSS_CHECK_STATUS: Record<
  MonitorCrossCheckStatus,
  { label: string; color: string }
> = {
  DRAFT: { label: "작성중", color: "#c3c2b7" },
  PENDING_APPROVAL: { label: "승인대기", color: "#fab219" },
  REJECTED: { label: "반려", color: "#d03b3b" },
};

function CrossCheckRow({ item, now }: { item: MonitorCrossCheck; now: Date }) {
  const status = CROSS_CHECK_STATUS[item.status];
  return (
    <div className="rounded-xl bg-white/[0.04] px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="truncate text-2xl font-semibold">
          {item.productName}
        </div>
        <div
          className="shrink-0 text-lg font-semibold"
          style={{ color: status.color }}
        >
          {status.label}
        </div>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3 text-lg text-[#c3c2b7]">
        <div className="truncate">{item.equipmentName}</div>
        <div className="shrink-0 tabular-nums text-[#898781]">
          {formatElapsed(item.updatedAt, now)}
        </div>
      </div>
      <div className="mt-0.5 truncate text-lg">{item.checkerName}</div>
    </div>
  );
}

function WorkerRow({ worker }: { worker: MonitorWorker }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3">
      <span
        aria-hidden
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: worker.online ? "#0ca30c" : "#4a4a47" }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-2xl font-semibold">
          {worker.name}
          {worker.workType && (
            <span className="ml-2 text-lg font-normal text-[#898781]">
              {worker.workType}
            </span>
          )}
        </div>
        {/* 접속 여부는 점 색만이 아니라 글자로도 표시. */}
        <div className="text-lg text-[#898781]">
          {worker.online ? "접속중" : "미접속"}
        </div>
      </div>
      {worker.inProgressCount > 0 && (
        <div className="shrink-0 text-xl font-semibold tabular-nums">
          {worker.inProgressCount}건
        </div>
      )}
    </div>
  );
}

/* ── 연결 표시등 ───────────────────────────────────────────── */

const CONNECTION_LABEL: Record<
  MonitorConnection,
  { text: string; color: string }
> = {
  connecting: { text: "연결중", color: "#fab219" },
  live: { text: "실시간", color: "#0ca30c" },
  polling: { text: "5초 갱신", color: "#fab219" },
  down: { text: "연결 끊김", color: "#d03b3b" },
};

function ConnectionBadge({
  connection,
  updatedAt,
}: {
  connection: MonitorConnection;
  updatedAt: Date | null;
}) {
  const { text, color } = CONNECTION_LABEL[connection];
  return (
    <div className="flex items-center gap-2 rounded-full bg-[#1a1a19] px-4 py-2 ring-1 ring-white/10">
      <span
        aria-hidden
        className="size-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-xl" style={{ color }}>
        {text}
      </span>
      {updatedAt && (
        <span className="text-xl tabular-nums text-[#898781]">
          {formatClock(updatedAt)}
        </span>
      )}
    </div>
  );
}

/* ── 시간 ─────────────────────────────────────────────────── */

/** 1초마다 갱신되는 현재 시각 — 시계와 경과시간 표시를 함께 움직인다. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatClock(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/** updatedAt(UTC ISO) 기준 경과 시간 — 벽에서는 절대시각보다 "얼마나 됐나"가 유용하다. */
function formatElapsed(iso: string, now: Date): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const sec = Math.max(0, Math.floor((now.getTime() - t) / 1000));
  if (sec < 60) return "방금";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

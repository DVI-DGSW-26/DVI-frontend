import { useEffect, useMemo, useState } from "react";
import { useMonitorStream } from "../api/useMonitorStream";
import { useAllSlots } from "../api/useAllSlots";
import { useTodayInspections } from "../api/useTodayInspections";
import { buildProgressRows } from "../lib/buildProgress";
import type { CellStatus, ProgressRow } from "../lib/buildProgress";
import type {
  MonitorConnection,
  MonitorCrossCheck,
  MonitorCrossCheckStatus,
} from "../type/types";

// 공장 벽걸이 모니터. 원거리 가독성이 최우선이라 큰 글자, 조작 요소 없음.
//
// 중심은 "시점별 진행도" — 작업자·설비 한 줄마다 시점(초·중·종 또는 08:00…) 칸을
// 늘어놓고 완료/진행중/건너뜀/미시작을 보여준다. 데이터는
// GET /inspection/all?date=오늘 (전 작업자) + GET /inspection/slots (칸 정의).
//
// 색은 흰 표면 기준으로 검증했다 — 브랜드 #931B82 는 대비 7.72 로 안전.
// 상태는 색만으로 구분하지 않는다. 칸마다 기호(✓ ▶ ⊘ ·)를 함께 찍고 범례를 둔다.

const BRAND = "#931B82";

// 1080p 기준 한 화면에 들어가는 양. 넘치면 잘리지 않게 개수로 알린다.
const MAX_ROWS = 6;
const MAX_CROSS_CHECKS = 5;

export default function MonitorPage() {
  const { snapshot, connection, updatedAt } = useMonitorStream();
  const now = useNow();
  // 자정을 넘겨도 날짜가 따라가도록 분 단위로만 재계산한다.
  const today = useMemo(
    () => kstToday(now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(now.getTime() / 60000)],
  );

  const slotsByProcess = useAllSlots();
  const { data: inspections } = useTodayInspections(today);

  const rows = useMemo(
    () => (inspections ? buildProgressRows(inspections, slotsByProcess) : []),
    [inspections, slotsByProcess],
  );

  // 마지막 시점까지 끝난 줄은 칸을 다 보여줄 이유가 없다. 그렇다고 목록에서 밀려
  // 사라지면 "오늘 저 설비 끝났나?"를 확인할 수 없으므로, 한 줄짜리로 압축해
  // 아래에 남긴다.
  const { ongoing, finished } = useMemo(() => {
    const ongoing: ProgressRow[] = [];
    const finished: ProgressRow[] = [];
    for (const r of rows) {
      (r.settled === r.cells.length ? finished : ongoing).push(r);
    }
    return { ongoing, finished };
  }, [rows]);

  // 마감 줄을 아래에 깔면 그만큼 위 공간이 줄어든다.
  const maxRows = finished.length > 0 ? MAX_ROWS - 1 : MAX_ROWS;

  // 접속 여부는 모니터 스냅샷(SSE)에서 온다 — 진행도와 출처가 다르다.
  const online = useMemo(
    () =>
      new Set(
        (snapshot?.workers ?? []).filter((w) => w.online).map((w) => w.name),
      ),
    [snapshot?.workers],
  );

  const totals = useMemo(() => {
    const cells = rows.flatMap((r) => r.cells);
    return {
      done: cells.filter((c) => c.status === "COMPLETED").length,
      active: cells.filter((c) => c.status === "DRAFT").length,
      skipped: cells.filter((c) => c.status === "SKIPPED").length,
      remaining: cells.filter((c) => c.status === "NONE").length,
    };
  }, [rows]);

  const crossChecks = useMemo(
    () =>
      [...(snapshot?.crossChecks ?? [])].sort(
        (a, b) =>
          CROSS_CHECK_PRIORITY[a.status] - CROSS_CHECK_PRIORITY[b.status] ||
          Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      ),
    [snapshot?.crossChecks],
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#f4f4f2] text-[#0b0b0b]">
      <header className="flex shrink-0 items-center justify-between px-8 pt-6 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          검사 진행 현황
          <span className="ml-3 text-xl font-normal text-[#52514e]">
            {today}
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
        <StatTile label="완료" value={totals.done} accent="#0a6b0a" />
        <StatTile label="진행중" value={totals.active} accent={BRAND} />
        <StatTile label="건너뜀" value={totals.skipped} accent="#6b6a66" />
        <StatTile label="남은 시점" value={totals.remaining} accent="#8a5a00" />
      </div>

      <main className="grid min-h-0 flex-1 grid-cols-[2.2fr_1fr] gap-4 px-8 pb-6">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-black/10">
          <div className="flex shrink-0 items-center justify-between px-6 pt-5 pb-3">
            <h2 className="text-2xl font-semibold">시점별 진행도</h2>
            <Legend />
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-hidden px-4">
            {ongoing.slice(0, maxRows).map((row) => (
              <ProgressRowView
                key={row.key}
                row={row}
                online={online.has(row.workerName)}
              />
            ))}
            {inspections && rows.length === 0 && (
              <div className="px-2 py-10 text-center text-xl text-[#898781]">
                오늘 등록된 검사가 없습니다
              </div>
            )}
            {ongoing.length > maxRows && (
              <div className="px-2 pt-1 text-center text-lg text-[#898781]">
                외 {ongoing.length - maxRows}줄 더
              </div>
            )}
          </div>

          {finished.length > 0 && (
            <FinishedStrip rows={finished} online={online} />
          )}
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-black/10">
          <div className="flex shrink-0 items-baseline justify-between px-6 pt-5 pb-3">
            <h2 className="text-2xl font-semibold">순회검사</h2>
            <span className="text-xl tabular-nums text-[#898781]">
              {snapshot?.crossChecks.length ?? "–"}건
            </span>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-hidden px-4">
            {crossChecks.slice(0, MAX_CROSS_CHECKS).map((it) => (
              <CrossCheckRow key={it.crossCheckId} item={it} now={now} />
            ))}
            {snapshot && crossChecks.length === 0 && (
              <div className="px-2 py-10 text-center text-xl text-[#898781]">
                진행중인 순회검사가 없습니다
              </div>
            )}
          </div>
          {crossChecks.length > MAX_CROSS_CHECKS && (
            <div className="shrink-0 px-6 py-3 text-center text-lg text-[#898781]">
              외 {crossChecks.length - MAX_CROSS_CHECKS}건 더
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/* ── 진행도 줄 ─────────────────────────────────────────────── */

function ProgressRowView({
  row,
  online,
}: {
  row: ProgressRow;
  online: boolean;
}) {
  return (
    <div className="rounded-xl bg-[#f9f9f7] px-4 py-3 ring-1 ring-black/5">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="flex shrink-0 items-center gap-2 text-2xl font-semibold">
            {/* 접속 여부는 점만이 아니라 title 로도 — 색만으로 전달하지 않는다. */}
            <span
              aria-hidden
              title={online ? "접속중" : "미접속"}
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: online ? "#0ca30c" : "#c3c2b7" }}
            />
            {row.workerName}
          </span>
          <span className="truncate text-xl text-[#52514e]">
            {row.productName}
            <span className="text-[#898781]"> · {row.equipmentName}</span>
          </span>
        </div>
        <span className="shrink-0 text-xl tabular-nums text-[#898781]">
          {row.settled}/{row.cells.length}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {row.cells.map((cell) => (
          <Cell key={cell.type} label={cell.label} status={cell.status} />
        ))}
      </div>
    </div>
  );
}

/**
 * 오늘치를 끝낸 줄 — 한 줄짜리 알약으로 압축해 패널 아래에 남긴다.
 *
 * 진행중인 줄과 같은 크기로 두면 자리를 다 먹고, 정렬상 아래로 밀려 잘리면
 * "저 설비 오늘 끝났나?"를 확인할 수 없어진다. 압축해서 계속 보이게 한다.
 */
function FinishedStrip({
  rows,
  online,
}: {
  rows: ProgressRow[];
  online: Set<string>;
}) {
  return (
    <div className="shrink-0 border-t border-black/10 px-6 py-3">
      <div className="mb-2 text-lg text-[#52514e]">
        오늘 마감 <span className="tabular-nums">{rows.length}</span>줄
      </div>
      <div className="flex flex-wrap gap-2">
        {rows.map((r) => (
          <span
            key={r.key}
            className="inline-flex items-center gap-2 rounded-lg bg-[#f9f9f7] px-3 py-1.5 text-lg ring-1 ring-black/10"
            title={`${r.productName} · ${r.equipmentName} — 완료 ${r.completed}, 건너뜀 ${r.skipped}`}
          >
            <span
              aria-hidden
              title={online.has(r.workerName) ? "접속중" : "미접속"}
              className="size-2 shrink-0 rounded-full"
              style={{
                backgroundColor: online.has(r.workerName)
                  ? "#0ca30c"
                  : "#c3c2b7",
              }}
            />
            <span className="font-semibold text-[#0b0b0b]">{r.workerName}</span>
            <span className="text-[#52514e]">{r.equipmentName}</span>
            {/* 전부 건너뛴 줄을 "완료"로 오인하지 않도록 완료·건너뜀을 따로 센다. */}
            {r.completed > 0 && (
              <span className="tabular-nums font-semibold text-[#0a6b0a]">
                ✓{r.completed}
              </span>
            )}
            {r.skipped > 0 && (
              <span className="tabular-nums font-semibold text-[#6b6a66]">
                ⊘{r.skipped}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// 색 + 기호 + 라벨 3중 표기 — 색약·원거리에서도 상태가 구분되도록.
const CELL_STYLE: Record<
  CellStatus,
  { bg: string; fg: string; ring: string; mark: string; name: string }
> = {
  COMPLETED: {
    bg: "#e3f3e3",
    fg: "#0a6b0a",
    ring: "#bcdfbc",
    mark: "✓",
    name: "완료",
  },
  DRAFT: { bg: BRAND, fg: "#ffffff", ring: BRAND, mark: "▶", name: "진행중" },
  SKIPPED: {
    bg: "#eeeeec",
    fg: "#6b6a66",
    ring: "#dcdbd5",
    mark: "⊘",
    name: "건너뜀",
  },
  INCOMPLETE: {
    bg: "#fdf0d9",
    fg: "#8a5a00",
    ring: "#f0dcb4",
    mark: "!",
    name: "미완료",
  },
  INCOMPLETE_APPROVED: {
    bg: "#fdf0d9",
    fg: "#8a5a00",
    ring: "#f0dcb4",
    mark: "✓",
    name: "미완료 승인",
  },
  NONE: {
    bg: "#ffffff",
    fg: "#898781",
    ring: "#e1e0d9",
    mark: "·",
    name: "미시작",
  },
};

function Cell({ label, status }: { label: string; status: CellStatus }) {
  const s = CELL_STYLE[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-lg font-semibold tabular-nums ring-1"
      style={
        {
          backgroundColor: s.bg,
          color: s.fg,
          "--tw-ring-color": s.ring,
        } as React.CSSProperties
      }
      title={`${label} ${s.name}`}
    >
      <span aria-hidden>{s.mark}</span>
      {label}
    </span>
  );
}

function Legend() {
  const items: CellStatus[] = ["COMPLETED", "DRAFT", "SKIPPED", "NONE"];
  return (
    <div className="flex items-center gap-3 text-base text-[#52514e]">
      {items.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-flex size-5 items-center justify-center rounded text-sm font-semibold ring-1"
            style={
              {
                backgroundColor: CELL_STYLE[k].bg,
                color: CELL_STYLE[k].fg,
                "--tw-ring-color": CELL_STYLE[k].ring,
              } as React.CSSProperties
            }
          >
            {CELL_STYLE[k].mark}
          </span>
          {CELL_STYLE[k].name}
        </span>
      ))}
    </div>
  );
}

/* ── 요약 타일 ─────────────────────────────────────────────── */

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | undefined;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-white px-6 py-5 ring-1 ring-black/10">
      <div className="text-lg text-[#52514e]">{label}</div>
      <div
        className="mt-1 text-6xl leading-none font-semibold"
        style={{ color: accent }}
      >
        {value ?? "–"}
      </div>
    </div>
  );
}

/* ── 순회검사 ─────────────────────────────────────────────── */

const CROSS_CHECK_PRIORITY: Record<MonitorCrossCheckStatus, number> = {
  REJECTED: 0,
  PENDING_APPROVAL: 1,
  DRAFT: 2,
};

const CROSS_CHECK_STATUS: Record<
  MonitorCrossCheckStatus,
  { label: string; color: string }
> = {
  DRAFT: { label: "작성중", color: "#52514e" },
  PENDING_APPROVAL: { label: "승인대기", color: "#8a5a00" },
  REJECTED: { label: "반려", color: "#d03b3b" },
};

function CrossCheckRow({ item, now }: { item: MonitorCrossCheck; now: Date }) {
  const status = CROSS_CHECK_STATUS[item.status];
  return (
    <div className="rounded-xl bg-[#f9f9f7] px-4 py-3 ring-1 ring-black/5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="truncate text-xl font-semibold">{item.productName}</div>
        <div
          className="shrink-0 text-lg font-semibold"
          style={{ color: status.color }}
        >
          {status.label}
        </div>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3 text-lg text-[#52514e]">
        <div className="truncate">{item.equipmentName}</div>
        <div className="shrink-0 tabular-nums text-[#898781]">
          {formatElapsed(item.updatedAt, now)}
        </div>
      </div>
      <div className="mt-0.5 truncate text-lg">{item.checkerName}</div>
    </div>
  );
}

/* ── 연결 표시등 ───────────────────────────────────────────── */

const CONNECTION_LABEL: Record<
  MonitorConnection,
  { text: string; color: string }
> = {
  connecting: { text: "연결중", color: "#8a5a00" },
  live: { text: "실시간", color: "#0a6b0a" },
  polling: { text: "5초 갱신", color: "#8a5a00" },
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
    <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 ring-1 ring-black/10">
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

/** KST 기준 오늘 (yyyy-MM-dd) — 서버 date 파라미터용. */
function kstToday(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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

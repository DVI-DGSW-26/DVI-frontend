import { useEffect, useMemo, useState } from "react";
import { useMonitorStream } from "../api/useMonitorStream";
import { useAllSlots } from "../api/useAllSlots";
import { useTodayInspections } from "../api/useTodayInspections";
import { buildProgressRows } from "../lib/buildProgress";
import type { CellStatus, ProgressRow } from "../lib/buildProgress";
import { usePagedList } from "../lib/usePagedList";
import { T } from "../lib/tokens";
import type {
  MonitorConnection,
  MonitorCrossCheck,
  MonitorCrossCheckStatus,
} from "../type/types";

// 공장 벽걸이 모니터. 멀리서 읽히는 것이 최우선이고 조작 요소는 없다.
//
// 한 줄 = 작업자 × 제품·설비. 시점(초·중·종 또는 08:00…02:00)을 꽉 찬 세그먼트 바로
// 늘어놓아 어디까지 갔는지 한눈에 보이게 한다.
//
// 아무도 스크롤할 수 없으므로 넘치는 항목은 자동으로 페이지를 넘겨 전부 보여준다.
//
// 색은 디자인 토큰(lib/tokens.ts)만 쓰고 흰 배경 기준 대비를 검증했다.
// 상태는 색만으로 구분하지 않는다 — 세그먼트마다 기호(✓ ▶ ⊘ ·)와 라벨을 함께 넣고
// 범례를 둔다.

const ROWS_PER_PAGE = 5;
const CROSS_CHECKS_PER_PAGE = 5;
const PAGE_INTERVAL_MS = 8000;

const CARD_SHADOW =
  "0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)";

export default function MonitorPage() {
  const { snapshot, connection, updatedAt } = useMonitorStream();
  const now = useNow();
  const today = useMemo(
    () => kstToday(now),
    // 자정을 넘겨도 날짜가 따라가되 초마다 재계산하지는 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(now.getTime() / 60000)],
  );

  const slotsByProcess = useAllSlots();
  const { data: inspections } = useTodayInspections(today);

  const rows = useMemo(
    () => (inspections ? buildProgressRows(inspections, slotsByProcess) : []),
    [inspections, slotsByProcess],
  );

  // 마지막 시점까지 끝난 줄은 한 줄짜리로 압축해 아래에 남긴다.
  const { ongoing, finished } = useMemo(() => {
    const ongoing: ProgressRow[] = [];
    const finished: ProgressRow[] = [];
    for (const r of rows) {
      (r.settled === r.cells.length ? finished : ongoing).push(r);
    }
    return { ongoing, finished };
  }, [rows]);

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

  const rowPage = usePagedList(ongoing, ROWS_PER_PAGE, PAGE_INTERVAL_MS);
  const ccPage = usePagedList(
    crossChecks,
    CROSS_CHECKS_PER_PAGE,
    PAGE_INTERVAL_MS,
  );

  return (
    // 카드 높이를 화면에 맞춰 늘이지 않는다 — 각 영역이 내용만큼만 차지한다.
    <div
      className="min-h-dvh"
      style={{ backgroundColor: T.neutral.sub, color: T.neutral.ink }}
    >
      <header
        className="flex items-center justify-between px-8 py-5"
        style={{
          backgroundColor: T.neutral.white,
          borderBottom: `1px solid ${T.neutral.border}`,
        }}
      >
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-bold tracking-tight">검사 진행 현황</h1>
          <span className="text-xl" style={{ color: T.inkSub }}>
            {today}
          </span>
        </div>
        <div className="flex items-center gap-5">
          <ConnectionBadge connection={connection} updatedAt={updatedAt} />
          <div className="text-3xl font-bold tabular-nums">
            {formatClock(now)}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-5 px-6 pt-5 pb-4">
        <StatCard label="완료" value={totals.done} color={T.success[700]} />
        <StatCard label="진행중" value={totals.active} color={T.primary[500]} />
        <StatCard label="건너뜀" value={totals.skipped} color={T.inkSub} />
        <StatCard
          label="남은 시점"
          value={totals.remaining}
          color={T.neutral.ink}
        />
      </div>

      {/* items-start — 두 카드가 서로의 높이에 끌려가지 않게 한다. */}
      <main className="grid grid-cols-[2.4fr_1fr] items-start gap-5 px-6 pb-6">
        <Card>
          <CardHead
            title="시점별 진행도"
            page={rowPage.page}
            pageCount={rowPage.pageCount}
          >
            <Legend />
          </CardHead>
          <div className="px-6">
            {rowPage.visible.map((row, i) => (
              <ProgressRowView
                key={row.key}
                row={row}
                online={online.has(row.workerName)}
                first={i === 0}
              />
            ))}
            {inspections && rows.length === 0 && (
              <Empty text="오늘 등록된 검사가 없습니다" />
            )}
          </div>
          {finished.length > 0 && (
            <FinishedStrip rows={finished} online={online} />
          )}
        </Card>

        <Card>
          <CardHead
            title="순회검사"
            page={ccPage.page}
            pageCount={ccPage.pageCount}
          >
            <span className="text-lg tabular-nums" style={{ color: T.inkSub }}>
              {snapshot?.crossChecks.length ?? "–"}건
            </span>
          </CardHead>
          <div className="px-6">
            {ccPage.visible.map((it, i) => (
              <CrossCheckRow
                key={it.crossCheckId}
                item={it}
                now={now}
                first={i === 0}
              />
            ))}
            {snapshot && crossChecks.length === 0 && (
              <Empty text="진행중인 순회검사가 없습니다" />
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}

/* ── 카드 ─────────────────────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="overflow-hidden rounded-xl"
      style={{
        backgroundColor: T.neutral.white,
        border: `1px solid ${T.neutral.border}`,
        boxShadow: CARD_SHADOW,
      }}
    >
      {children}
    </section>
  );
}

function CardHead({
  title,
  page,
  pageCount,
  children,
}: {
  title: string;
  page: number;
  pageCount: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 pt-5 pb-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-xl font-bold">{title}</h2>
        {/* 자동으로 넘어가는 중이라는 걸 알려야 "왜 화면이 바뀌지?"가 안 생긴다. */}
        {pageCount > 1 && (
          <span className="text-base tabular-nums" style={{ color: T.inkSub }}>
            {page + 1} / {pageCount}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="rounded-xl px-6 py-4"
      style={{
        backgroundColor: T.neutral.white,
        border: `1px solid ${T.neutral.border}`,
        boxShadow: CARD_SHADOW,
      }}
    >
      <div className="text-lg" style={{ color: T.inkSub }}>
        {label}
      </div>
      <div
        className="mt-1.5 text-5xl leading-none font-bold tabular-nums"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="py-12 text-xl" style={{ color: T.inkSub }}>
      {text}
    </div>
  );
}

/* ── 진행도 줄 ─────────────────────────────────────────────── */

function ProgressRowView({
  row,
  online,
  first,
}: {
  row: ProgressRow;
  online: boolean;
  first: boolean;
}) {
  return (
    <div
      className="py-4"
      style={first ? undefined : { borderTop: `1px solid ${T.neutral.border}` }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={row.workerName} online={online} />
          <span className="shrink-0 text-2xl font-bold">{row.workerName}</span>
          <span className="truncate text-xl" style={{ color: T.inkSub }}>
            {row.productName}
            <span style={{ color: T.neutral.muted }}>
              {" · "}
              {row.equipmentName}
            </span>
          </span>
        </div>
        <span className="shrink-0 text-xl tabular-nums">
          <span className="font-bold">{row.settled}</span>
          <span style={{ color: T.neutral.muted }}> / {row.cells.length}</span>
        </span>
      </div>

      <SegmentBar cells={row.cells} />
    </div>
  );
}

function Avatar({ name, online }: { name: string; online: boolean }) {
  return (
    <span className="relative shrink-0">
      <span
        className="flex size-9 items-center justify-center rounded-full text-lg font-bold"
        style={{ backgroundColor: T.primary[100], color: T.primary[700] }}
      >
        {name.slice(0, 1)}
      </span>
      {/* 접속 여부는 부가 정보 — 점 + title 로만 표시하고 판단을 여기에 걸지 않는다. */}
      <span
        aria-hidden
        title={online ? "접속중" : "미접속"}
        className="absolute right-0 bottom-0 size-3 rounded-full"
        style={{
          backgroundColor: online ? T.success[500] : T.neutral.border,
          outline: `2px solid ${T.neutral.white}`,
        }}
      />
    </span>
  );
}

/**
 * 시점을 꽉 찬 세그먼트로 늘어놓은 막대.
 * 세그먼트 사이 2px 흰 간격을 둬 경계가 색에만 의존하지 않게 한다.
 */
function SegmentBar({ cells }: { cells: ProgressRow["cells"] }) {
  return (
    <div className="mt-3 flex w-full gap-0.5">
      {cells.map((cell, i) => {
        const s = CELL_STYLE[cell.status];
        return (
          <div
            key={cell.type}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 text-lg font-bold tabular-nums"
            style={{
              backgroundColor: s.bg,
              color: s.fg,
              border: s.border ? `1px solid ${s.border}` : undefined,
              borderTopLeftRadius: i === 0 ? 8 : 0,
              borderBottomLeftRadius: i === 0 ? 8 : 0,
              borderTopRightRadius: i === cells.length - 1 ? 8 : 0,
              borderBottomRightRadius: i === cells.length - 1 ? 8 : 0,
            }}
            title={`${cell.label} ${s.name}`}
          >
            <span aria-hidden>{s.mark}</span>
            {cell.label}
          </div>
        );
      })}
    </div>
  );
}

// 색 + 기호 + 라벨 3중 표기 — 색약·원거리에서도 상태가 구분되도록.
// 채운 세그먼트는 흰 글자 대비를 통과하는 단계만 쓴다(success 500 은 2.28 로 탈락).
const CELL_STYLE: Record<
  CellStatus,
  { bg: string; fg: string; border?: string; mark: string; name: string }
> = {
  COMPLETED: {
    bg: T.success[700],
    fg: T.neutral.white,
    mark: "✓",
    name: "완료",
  },
  DRAFT: {
    bg: T.primary[500],
    fg: T.neutral.white,
    mark: "▶",
    name: "진행중",
  },
  SKIPPED: {
    bg: T.neutral.border,
    fg: "#5B5B5B",
    mark: "⊘",
    name: "건너뜀",
  },
  INCOMPLETE: {
    bg: T.warning[700],
    fg: T.neutral.white,
    mark: "!",
    name: "미완료",
  },
  INCOMPLETE_APPROVED: {
    bg: T.warning[100],
    fg: T.warning[700],
    border: "#F5E3B4",
    mark: "✓",
    name: "미완료 승인",
  },
  NONE: {
    bg: T.neutral.sub,
    fg: "#6B6B6B",
    border: T.neutral.border,
    mark: "·",
    name: "미시작",
  },
};

function Legend() {
  const items: CellStatus[] = ["COMPLETED", "DRAFT", "SKIPPED", "NONE"];
  return (
    <div
      className="flex items-center gap-4 text-base"
      style={{ color: T.inkSub }}
    >
      {items.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-3.5 rounded-sm"
            style={{
              backgroundColor: CELL_STYLE[k].bg,
              border: CELL_STYLE[k].border
                ? `1px solid ${CELL_STYLE[k].border}`
                : undefined,
            }}
          />
          {CELL_STYLE[k].name}
        </span>
      ))}
    </div>
  );
}

/**
 * 오늘치를 끝낸 줄 — 한 줄짜리로 압축해 카드 아래에 남긴다.
 * 전부 건너뛴 줄을 "완료"로 오인하지 않도록 완료·건너뜀을 따로 센다.
 */
function FinishedStrip({
  rows,
  online,
}: {
  rows: ProgressRow[];
  online: Set<string>;
}) {
  return (
    <div
      className="mt-1 px-6 py-4"
      style={{
        borderTop: `1px solid ${T.neutral.border}`,
        backgroundColor: T.neutral.sub,
      }}
    >
      <div className="mb-2.5 text-base" style={{ color: T.inkSub }}>
        오늘 마감 <span className="tabular-nums">{rows.length}</span>줄
      </div>
      <div className="flex flex-wrap gap-2">
        {rows.map((r) => (
          <span
            key={r.key}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-base"
            style={{
              backgroundColor: T.neutral.white,
              border: `1px solid ${T.neutral.border}`,
            }}
            title={`${r.productName} · ${r.equipmentName} — 완료 ${r.completed}, 건너뜀 ${r.skipped}`}
          >
            <span
              aria-hidden
              title={online.has(r.workerName) ? "접속중" : "미접속"}
              className="size-2 shrink-0 rounded-full"
              style={{
                backgroundColor: online.has(r.workerName)
                  ? T.success[500]
                  : T.neutral.border,
              }}
            />
            <span className="font-bold">{r.workerName}</span>
            <span style={{ color: T.inkSub }}>{r.equipmentName}</span>
            {r.completed > 0 && (
              <span
                className="font-bold tabular-nums"
                style={{ color: T.success[700] }}
              >
                ✓{r.completed}
              </span>
            )}
            {r.skipped > 0 && (
              <span
                className="font-bold tabular-nums"
                style={{ color: "#5B5B5B" }}
              >
                ⊘{r.skipped}
              </span>
            )}
          </span>
        ))}
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
  { label: string; bg: string; fg: string }
> = {
  DRAFT: { label: "작성중", bg: T.neutral.sub, fg: T.inkSub },
  PENDING_APPROVAL: {
    label: "승인대기",
    bg: T.warning[100],
    fg: T.warning[700],
  },
  REJECTED: { label: "반려", bg: T.error[100], fg: T.error[700] },
};

function CrossCheckRow({
  item,
  now,
  first,
}: {
  item: MonitorCrossCheck;
  now: Date;
  first: boolean;
}) {
  const s = CROSS_CHECK_STATUS[item.status];
  return (
    <div
      className="py-4"
      style={first ? undefined : { borderTop: `1px solid ${T.neutral.border}` }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="truncate text-xl font-bold">{item.productName}</div>
        <span
          className="shrink-0 rounded-md px-2.5 py-1 text-base font-bold"
          style={{ backgroundColor: s.bg, color: s.fg }}
        >
          {s.label}
        </span>
      </div>
      <div
        className="mt-1.5 flex items-baseline justify-between gap-3 text-lg"
        style={{ color: T.inkSub }}
      >
        <div className="truncate">
          {item.equipmentName}
          <span style={{ color: T.neutral.muted }}>
            {" · "}
            {item.checkerName}
          </span>
        </div>
        <div className="shrink-0 tabular-nums">
          {formatElapsed(item.updatedAt, now)}
        </div>
      </div>
    </div>
  );
}

/* ── 연결 표시등 ───────────────────────────────────────────── */

const CONNECTION_LABEL: Record<
  MonitorConnection,
  { text: string; color: string; bg: string }
> = {
  connecting: { text: "연결중", color: T.warning[700], bg: T.warning[100] },
  live: { text: "실시간", color: T.success[700], bg: T.success[100] },
  polling: { text: "5초 갱신", color: T.warning[700], bg: T.warning[100] },
  down: { text: "연결 끊김", color: T.error[700], bg: T.error[100] },
};

function ConnectionBadge({
  connection,
  updatedAt,
}: {
  connection: MonitorConnection;
  updatedAt: Date | null;
}) {
  const { text, color, bg } = CONNECTION_LABEL[connection];
  return (
    <div className="flex items-center gap-3">
      <span
        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-lg font-bold"
        style={{ backgroundColor: bg, color }}
      >
        <span
          aria-hidden
          className="size-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {text}
      </span>
      {updatedAt && (
        <span className="text-lg tabular-nums" style={{ color: T.inkSub }}>
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
